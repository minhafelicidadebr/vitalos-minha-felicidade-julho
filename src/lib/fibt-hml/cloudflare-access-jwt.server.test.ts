import { describe, expect, test, beforeAll, afterEach } from "bun:test";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet, type JWK } from "jose";

import {
  verifyCloudflareAccessRequest,
  parseCloudflareAccessConfig,
  accessDeniedResponse,
  resetAccessJwksCacheForTesting,
  ACCESS_JWT_HEADER,
  type CloudflareAccessEnvLike,
  type AccessJwksResolver,
} from "./cloudflare-access-jwt.server";

// Valores 100% sintéticos. Nenhum team domain, AUD ou e-mail real aparece
// neste arquivo — `.invalid` nunca resolve (RFC 2606) e nenhum teste toca a
// rede: o resolvedor JWKS é SEMPRE injetado.
const TEAM_DOMAIN = "https://synthetic-team.cloudflareaccess.com";
const ISSUER = TEAM_DOMAIN;
const AUD = "synthetic-audience-0000000000000000";
const ALLOWED_EMAIL = "tester@synthetic.invalid";

const ENV: CloudflareAccessEnvLike = {
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
  CLOUDFLARE_ACCESS_AUD: AUD,
  CLOUDFLARE_ACCESS_ALLOWED_EMAILS: ALLOWED_EMAIL,
};

let rsaPrivate: CryptoKey;
let rsaPublicJwk: JWK;
let otherRsaPrivate: CryptoKey;
let jwks: AccessJwksResolver;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  rsaPrivate = pair.privateKey;
  rsaPublicJwk = { ...(await exportJWK(pair.publicKey)), alg: "RS256", kid: "synthetic-kid-1" };

  // Segundo par: assina com chave que NÃO está no JWKS (assinatura inválida).
  const other = await generateKeyPair("RS256", { extractable: true });
  otherRsaPrivate = other.privateKey;

  jwks = createLocalJWKSet({ keys: [rsaPublicJwk] }) as AccessJwksResolver;
});

afterEach(() => resetAccessJwksCacheForTesting());

interface TokenOverrides {
  issuer?: string;
  audience?: string;
  subject?: string;
  email?: string | undefined;
  expiresIn?: string;
  notBefore?: string;
  key?: CryptoKey;
  alg?: string;
  kid?: string;
}

async function makeToken(o: TokenOverrides = {}): Promise<string> {
  const payload: Record<string, unknown> = {};
  if (o.email !== undefined) payload.email = o.email;
  else if (!("email" in o)) payload.email = ALLOWED_EMAIL;

  let jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: o.alg ?? "RS256", kid: o.kid ?? "synthetic-kid-1" })
    .setIssuer(o.issuer ?? ISSUER)
    .setAudience(o.audience ?? AUD)
    .setSubject(o.subject ?? "synthetic-subject-1")
    .setIssuedAt()
    .setExpirationTime(o.expiresIn ?? "1h");

  if (o.notBefore) jwt = jwt.setNotBefore(o.notBefore);
  return jwt.sign(o.key ?? rsaPrivate);
}

function requestWith(token?: string, extraHeaders: Record<string, string> = {}): Request {
  const headers = new Headers(extraHeaders);
  if (token !== undefined) headers.set(ACCESS_JWT_HEADER, token);
  return new Request("https://synthetic-worker.invalid/convite/tok-1", { headers });
}

const verify = (req: Request, env: CloudflareAccessEnvLike = ENV) =>
  verifyCloudflareAccessRequest(req, env, { jwksResolver: jwks });

describe("configuração — fail-closed", () => {
  test("variáveis ausentes → ACCESS_CONFIG_MISSING", async () => {
    for (const env of [
      {},
      { CLOUDFLARE_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN },
      { CLOUDFLARE_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN, CLOUDFLARE_ACCESS_AUD: AUD },
      { CLOUDFLARE_ACCESS_AUD: AUD, CLOUDFLARE_ACCESS_ALLOWED_EMAILS: ALLOWED_EMAIL },
      { ...ENV, CLOUDFLARE_ACCESS_AUD: "   " },
    ]) {
      const r = await verify(requestWith(await makeToken()), env as CloudflareAccessEnvLike);
      expect(r).toEqual({ valid: false, code: "ACCESS_CONFIG_MISSING" });
    }
  });

  test("team domain inválido → ACCESS_TEAM_DOMAIN_INVALID", () => {
    const bad = [
      "http://synthetic-team.cloudflareaccess.com", // não-HTTPS
      "https://synthetic-team.cloudflareaccess.com/path", // com path
      "https://synthetic-team.cloudflareaccess.com?x=1", // com query
      "https://synthetic-team.cloudflareaccess.com#f", // com fragment
      "https://user:pw@synthetic-team.cloudflareaccess.com", // credenciais
      "https://synthetic-team.example.invalid", // sufixo errado
      "https://cloudflareaccess.com", // sufixo sem subdomínio
      "https://evilcloudflareaccess.com", // sufixo colado, sem o ponto
      "não-é-url",
    ];
    for (const raw of bad) {
      expect(parseCloudflareAccessConfig({ ...ENV, CLOUDFLARE_ACCESS_TEAM_DOMAIN: raw })).toEqual({
        ok: false,
        code: "ACCESS_TEAM_DOMAIN_INVALID",
      });
    }
  });

  test("FIBT-HML-3F — SSRF/spoofing: nenhuma dessas formas produz fetch para origem arbitrária", () => {
    const hostile = [
      "https://cloudflareaccess.com.attacker.invalid", // sufixo como prefixo de outro domínio
      "https://synthetic-team.cloudflareaccess.com@attacker.invalid", // userinfo sequestrando o host
      "https://attacker.invalid#.cloudflareaccess.com", // sufixo no fragment
      "https://attacker.invalid/.cloudflareaccess.com", // sufixo no path
      "https://synthetic-team.cloudflareaccess.com.", // FQDN com ponto final
      "https://evil.cloudflareaccеss.com", // homógrafo cirílico DENTRO de "access"
      "https://xn--cloudflareaccess-abc.invalid", // punycode parecido
      "https://synthetic-team.cloudflareaccess.com:8443", // porta arbitrária
      "file:///etc/passwd",
      "http://169.254.169.254", // metadata endpoint
    ];
    for (const raw of hostile) {
      expect(parseCloudflareAccessConfig({ ...ENV, CLOUDFLARE_ACCESS_TEAM_DOMAIN: raw })).toEqual({
        ok: false,
        code: "ACCESS_TEAM_DOMAIN_INVALID",
      });
    }
  });

  test("FIBT-HML-3F — porta padrão explícita (:443) continua aceita; o JWKS sai da origem validada", () => {
    const r = parseCloudflareAccessConfig({
      ...ENV,
      CLOUDFLARE_ACCESS_TEAM_DOMAIN: "https://synthetic-team.cloudflareaccess.com:443",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.config.jwksUrl).toBe("https://synthetic-team.cloudflareaccess.com/cdn-cgi/access/certs");
  });

  test("team domain válido deriva issuer exato e JWKS oficial", () => {
    const r = parseCloudflareAccessConfig(ENV);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.config.issuer).toBe(ISSUER);
    expect(r.config.jwksUrl).toBe(`${ISSUER}/cdn-cgi/access/certs`);
  });

  test("AUD com espaço interno → ACCESS_AUDIENCE_INVALID", () => {
    expect(parseCloudflareAccessConfig({ ...ENV, CLOUDFLARE_ACCESS_AUD: "a b" })).toEqual({
      ok: false,
      code: "ACCESS_AUDIENCE_INVALID",
    });
  });

  test("allowlist inválida (wildcard, domínio amplo, vazia) → ACCESS_ALLOWED_IDENTITIES_INVALID", () => {
    for (const raw of ["*@synthetic.invalid", "@synthetic.invalid", "synthetic.invalid", ",", "a@b", "a@@b.c"]) {
      expect(parseCloudflareAccessConfig({ ...ENV, CLOUDFLARE_ACCESS_ALLOWED_EMAILS: raw })).toEqual({
        ok: false,
        code: "ACCESS_ALLOWED_IDENTITIES_INVALID",
      });
    }
  });

  test("allowlist com múltiplos e-mails, trim e caixa é normalizada", () => {
    const r = parseCloudflareAccessConfig({
      ...ENV,
      CLOUDFLARE_ACCESS_ALLOWED_EMAILS: ` A@Synthetic.Invalid , b@synthetic.invalid `,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.config.allowedEmails).toEqual(["a@synthetic.invalid", "b@synthetic.invalid"]);
  });

  test("FIBT-HML-3F — vírgula final e entradas vazias intercaladas não invalidam a lista", () => {
    const r = parseCloudflareAccessConfig({
      ...ENV,
      CLOUDFLARE_ACCESS_ALLOWED_EMAILS: "a@synthetic.invalid, ,b@synthetic.invalid,",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.config.allowedEmails).toEqual(["a@synthetic.invalid", "b@synthetic.invalid"]);
  });

  test("FIBT-HML-3F — e-mails duplicados (inclusive com caixa diferente) são aceitos e não quebram a checagem", async () => {
    const env = {
      ...ENV,
      CLOUDFLARE_ACCESS_ALLOWED_EMAILS: `${ALLOWED_EMAIL}, ${ALLOWED_EMAIL.toUpperCase()}`,
    };
    const parsed = parseCloudflareAccessConfig(env);
    expect(parsed.ok).toBe(true);
    const r = await verifyCloudflareAccessRequest(requestWith(await makeToken()), env, {
      jwksResolver: jwks,
    });
    expect(r).toEqual({
      valid: true,
      identity: { email: ALLOWED_EMAIL, subject: "synthetic-subject-1" },
    });
  });
});

describe("presença do token", () => {
  test("sem header → ACCESS_JWT_MISSING", async () => {
    expect(await verify(requestWith())).toEqual({ valid: false, code: "ACCESS_JWT_MISSING" });
  });

  test("header vazio → ACCESS_JWT_MISSING", async () => {
    expect(await verify(requestWith("   "))).toEqual({ valid: false, code: "ACCESS_JWT_MISSING" });
  });

  test("cookie CF_Authorization NÃO é aceito como fallback", async () => {
    const token = await makeToken();
    const req = requestWith(undefined, { Cookie: `CF_Authorization=${token}` });
    expect(await verify(req)).toEqual({ valid: false, code: "ACCESS_JWT_MISSING" });
  });

  test("token em query string NÃO é aceito", async () => {
    const token = await makeToken();
    const req = new Request(`https://synthetic-worker.invalid/convite/tok-1?jwt=${token}`);
    expect(await verify(req)).toEqual({ valid: false, code: "ACCESS_JWT_MISSING" });
  });
});

describe("validação criptográfica", () => {
  test("JWT RS256 válido → identidade normalizada", async () => {
    const r = await verify(requestWith(await makeToken()));
    expect(r).toEqual({
      valid: true,
      identity: { email: ALLOWED_EMAIL, subject: "synthetic-subject-1" },
    });
  });

  test("e-mail autorizado com caixa diferente → aceito e normalizado", async () => {
    const r = await verify(requestWith(await makeToken({ email: "TESTER@Synthetic.INVALID" })));
    expect(r).toEqual({
      valid: true,
      identity: { email: ALLOWED_EMAIL, subject: "synthetic-subject-1" },
    });
  });

  test("token malformado → ACCESS_JWT_INVALID", async () => {
    for (const bad of ["não-é-jwt", "a.b", "a.b.c", ""]) {
      const r = await verify(requestWith(bad || "x"));
      expect(r).toEqual({ valid: false, code: "ACCESS_JWT_INVALID" });
    }
  });

  test("JWT sem assinatura (alg none) → ACCESS_JWT_INVALID", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ iss: ISSUER, aud: AUD, sub: "s", email: ALLOWED_EMAIL, exp: 9999999999 }),
    ).toString("base64url");
    const r = await verify(requestWith(`${header}.${payload}.`));
    expect(r).toEqual({ valid: false, code: "ACCESS_JWT_INVALID" });
  });

  test("HS256 (simétrico) → ACCESS_JWT_INVALID, nunca aceito", async () => {
    const secret = new TextEncoder().encode("synthetic-shared-secret-not-a-real-key");
    const token = await new SignJWT({ email: ALLOWED_EMAIL })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(ISSUER)
      .setAudience(AUD)
      .setSubject("synthetic-subject-1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_JWT_INVALID" });
  });

  test("assinatura de chave desconhecida → ACCESS_JWT_INVALID", async () => {
    const token = await makeToken({ key: otherRsaPrivate });
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_JWT_INVALID" });
  });

  test("kid inexistente no JWKS → ACCESS_JWT_INVALID", async () => {
    const token = await makeToken({ kid: "kid-que-não-existe" });
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_JWT_INVALID" });
  });

  test("issuer diferente → ACCESS_ISSUER_INVALID", async () => {
    const token = await makeToken({ issuer: "https://outro-team.cloudflareaccess.com" });
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_ISSUER_INVALID" });
  });

  test("audience diferente (token de outra aplicação Access) → ACCESS_AUDIENCE_MISMATCH", async () => {
    const token = await makeToken({ audience: "outra-aplicacao-access-0000000000" });
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_AUDIENCE_MISMATCH" });
  });

  test("token expirado → ACCESS_JWT_INVALID", async () => {
    const token = await makeToken({ expiresIn: "-1h" });
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_JWT_INVALID" });
  });

  test("token ainda não válido (nbf futuro) → ACCESS_JWT_INVALID", async () => {
    const token = await makeToken({ notBefore: "2h" });
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_JWT_INVALID" });
  });

  test("JWT de metadados do redirect anônimo (auth_status NONE, sem assinatura da conta) → recusado", async () => {
    // Forma real observada no redirect público: payload type=meta, auth_status
    // NONE, assinado por outra chave. Nunca pode autenticar ninguém.
    const token = await new SignJWT({ type: "meta", auth_status: "NONE", hostname: "x.invalid" })
      .setProtectedHeader({ alg: "RS256", kid: "synthetic-kid-1" })
      .setIssuer(ISSUER)
      .setAudience(AUD)
      .setSubject("meta")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(otherRsaPrivate);
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_JWT_INVALID" });
  });
});

describe("FIBT-HML-3F — falha do JWKS é fail-closed", () => {
  test("resolvedor que lança (rede fora, timeout, 5xx) → recusa, nunca libera", async () => {
    const boom = (async () => {
      throw new Error("ECONNREFUSED 10.0.0.1:443 host-interno-sensivel");
    }) as unknown as AccessJwksResolver;
    const r = await verifyCloudflareAccessRequest(requestWith(await makeToken()), ENV, {
      jwksResolver: boom,
    });
    expect(r).toEqual({ valid: false, code: "ACCESS_JWT_INVALID" });
  });

  test("o erro de rede/JWKS nunca aparece no resultado devolvido", async () => {
    const boom = (async () => {
      throw new Error("ECONNREFUSED 10.0.0.1:443 host-interno-sensivel");
    }) as unknown as AccessJwksResolver;
    const r = await verifyCloudflareAccessRequest(requestWith(await makeToken()), ENV, {
      jwksResolver: boom,
    });
    const s = JSON.stringify(r);
    expect(s).not.toContain("ECONNREFUSED");
    expect(s).not.toContain("host-interno-sensivel");
    expect(s).not.toContain("10.0.0.1");
  });

  test("JWKS vazio (nenhuma chave publicada) → recusa", async () => {
    const empty = createLocalJWKSet({ keys: [] }) as AccessJwksResolver;
    const r = await verifyCloudflareAccessRequest(requestWith(await makeToken()), ENV, {
      jwksResolver: empty,
    });
    expect(r.valid).toBe(false);
  });
});

describe("FIBT-HML-3F — audience em array", () => {
  test("token com aud em array contendo o AUD esperado é aceito (comportamento da biblioteca, confirmado)", async () => {
    const token = await new SignJWT({ email: ALLOWED_EMAIL })
      .setProtectedHeader({ alg: "RS256", kid: "synthetic-kid-1" })
      .setIssuer(ISSUER)
      .setAudience([AUD, "outra-aplicacao-access-0000000000"])
      .setSubject("synthetic-subject-1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(rsaPrivate);
    expect(await verify(requestWith(token))).toEqual({
      valid: true,
      identity: { email: ALLOWED_EMAIL, subject: "synthetic-subject-1" },
    });
  });

  test("token com aud em array SEM o AUD esperado → ACCESS_AUDIENCE_MISMATCH", async () => {
    const token = await new SignJWT({ email: ALLOWED_EMAIL })
      .setProtectedHeader({ alg: "RS256", kid: "synthetic-kid-1" })
      .setIssuer(ISSUER)
      .setAudience(["app-a-0000000000000000", "app-b-0000000000000000"])
      .setSubject("synthetic-subject-1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(rsaPrivate);
    expect(await verify(requestWith(token))).toEqual({
      valid: false,
      code: "ACCESS_AUDIENCE_MISMATCH",
    });
  });
});

describe("identidade", () => {
  test("sem email no payload → ACCESS_IDENTITY_MISSING", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "synthetic-kid-1" })
      .setIssuer(ISSUER)
      .setAudience(AUD)
      .setSubject("synthetic-subject-1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(rsaPrivate);
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_IDENTITY_MISSING" });
  });

  test("subject vazio → ACCESS_IDENTITY_MISSING", async () => {
    const token = await makeToken({ subject: "   " });
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_IDENTITY_MISSING" });
  });

  test("email fora da allowlist → ACCESS_IDENTITY_NOT_ALLOWED", async () => {
    const token = await makeToken({ email: "intruso@synthetic.invalid" });
    expect(await verify(requestWith(token))).toEqual({ valid: false, code: "ACCESS_IDENTITY_NOT_ALLOWED" });
  });
});

describe("sanitização das falhas", () => {
  test("nenhum código de falha carrega token, e-mail, issuer, AUD ou texto do jose", async () => {
    const token = await makeToken({ email: "intruso@synthetic.invalid" });
    const r = await verify(requestWith(token));
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain("intruso");
    expect(serialized).not.toContain(AUD);
    expect(serialized).not.toContain(ISSUER);
    expect(serialized.toLowerCase()).not.toContain("jose");
    expect(serialized.toLowerCase()).not.toContain("claim");
    expect(serialized.toLowerCase()).not.toContain("signature");
  });

  test("resposta 403 é genérica e sem CORS", async () => {
    const res = accessDeniedResponse();
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("ACCESS_DENIED");
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });
});
