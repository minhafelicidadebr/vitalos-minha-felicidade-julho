// Validação criptográfica do JWT do Cloudflare Access (FIBT-HML-3E).
//
// POR QUE ISSO EXISTE: o Cloudflare Access na borda não é suficiente sozinho.
// A borda protege o hostname público, mas o Worker continua alcançável por
// qualquer caminho que contorne essa borda (erro de configuração da política,
// service token esquecido, ou um request chegando ao Worker por outra rota da
// própria conta). O contrato do Access é que ele INJETA o header
// Cf-Access-Jwt-Assertion, assinado, e o destino VERIFICA essa assinatura.
// Sem essa verificação no Worker, "protegido" é uma afirmação sobre a
// configuração do painel, não sobre o código.
//
// Aceita EXCLUSIVAMENTE o header Cf-Access-Jwt-Assertion. O cookie
// CF_Authorization não é aceito nem como fallback: ele é enviado pelo
// navegador em requisições cross-site sob condições que o header nunca
// satisfaz, e aceitá-lo reintroduziria uma superfície tipo CSRF que o header
// dedicado justamente elimina. O JWT de metadados que aparece no redirect
// anônimo (`?meta=…`) também NÃO é aceito — ele é público, não autentica
// ninguém, e traz `auth_status: "NONE"`.
//
// Server-only: importa `jose` e lê configuração de runtime. Nunca deve ser
// importado por código de cliente (sufixo .server.ts).

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export interface CloudflareAccessEnvLike {
  CLOUDFLARE_ACCESS_TEAM_DOMAIN?: string;
  CLOUDFLARE_ACCESS_AUD?: string;
  CLOUDFLARE_ACCESS_ALLOWED_EMAILS?: string;
}

export type CloudflareAccessFailureCode =
  | "ACCESS_CONFIG_MISSING"
  | "ACCESS_TEAM_DOMAIN_INVALID"
  | "ACCESS_AUDIENCE_INVALID"
  | "ACCESS_ALLOWED_IDENTITIES_INVALID"
  | "ACCESS_JWT_MISSING"
  | "ACCESS_JWT_INVALID"
  | "ACCESS_ISSUER_INVALID"
  | "ACCESS_AUDIENCE_MISMATCH"
  | "ACCESS_IDENTITY_MISSING"
  | "ACCESS_IDENTITY_NOT_ALLOWED";

export interface CloudflareAccessIdentity {
  email: string;
  subject: string;
}

export type CloudflareAccessResult =
  | { valid: true; identity: CloudflareAccessIdentity }
  | { valid: false; code: CloudflareAccessFailureCode };

/** Resolvedor de chave no formato que `jwtVerify` aceita — injetável em teste. */
export type AccessJwksResolver = Parameters<typeof jwtVerify>[1];

export interface CloudflareAccessDependencies {
  /** Substitui o JWKS remoto real. Testes SEMPRE injetam — nenhum teste toca a rede. */
  jwksResolver?: AccessJwksResolver;
}

export const ACCESS_JWT_HEADER = "Cf-Access-Jwt-Assertion";

const CLOUDFLARE_ACCESS_HOST_SUFFIX = ".cloudflareaccess.com";

export interface CloudflareAccessConfig {
  /** Origem HTTPS normalizada, sem barra final — usada como issuer EXATO. */
  issuer: string;
  jwksUrl: string;
  audience: string;
  allowedEmails: readonly string[];
}

export type CloudflareAccessConfigResult =
  | { ok: true; config: CloudflareAccessConfig }
  | { ok: false; code: CloudflareAccessFailureCode };

/**
 * Valida o team domain: HTTPS, só origem (sem path/query/fragment/credenciais),
 * hostname terminando exatamente em `.cloudflareaccess.com`.
 *
 * O sufixo é conferido com um ponto à frente de propósito: aceitar apenas
 * "cloudflareaccess.com" (sem subdomínio) ou algo como
 * "evilcloudflareaccess.com" seria um issuer que não pertence à conta.
 */
function parseTeamDomain(raw: string): { issuer: string; jwksUrl: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  if (url.search !== "" || url.hash !== "") return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;

  const host = url.hostname.toLowerCase();
  if (!host.endsWith(CLOUDFLARE_ACCESS_HOST_SUFFIX)) return null;
  if (host.length <= CLOUDFLARE_ACCESS_HOST_SUFFIX.length) return null;

  const issuer = `https://${host}`;
  return { issuer, jwksUrl: `${issuer}/cdn-cgi/access/certs` };
}

/**
 * Um e-mail explícito e completo. Recusa deliberadamente qualquer forma que
 * signifique "um domínio inteiro" (`*@x.com`, `@x.com`, `x.com`): a allowlist
 * da homologação nomeia pessoas, nunca organizações.
 */
function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length === 0) return null;
  if (email.includes("*") || email.includes(" ")) return null;

  const at = email.indexOf("@");
  if (at <= 0) return null; // ausente, ou começando em "@" (domínio amplo)
  if (email.indexOf("@", at + 1) !== -1) return null; // mais de um "@"

  const domain = email.slice(at + 1);
  if (domain.length === 0 || !domain.includes(".")) return null;
  if (domain.startsWith(".") || domain.endsWith(".")) return null;

  return email;
}

/** Fail-closed: qualquer variável ausente/inválida recusa, nunca degrada em silêncio. */
export function parseCloudflareAccessConfig(env: CloudflareAccessEnvLike): CloudflareAccessConfigResult {
  const rawDomain = env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.trim();
  const rawAud = env.CLOUDFLARE_ACCESS_AUD?.trim();
  const rawEmails = env.CLOUDFLARE_ACCESS_ALLOWED_EMAILS?.trim();

  if (!rawDomain || !rawAud || !rawEmails) {
    return { ok: false, code: "ACCESS_CONFIG_MISSING" };
  }

  const domain = parseTeamDomain(rawDomain);
  if (domain === null) return { ok: false, code: "ACCESS_TEAM_DOMAIN_INVALID" };

  if (rawAud.length === 0 || /\s/.test(rawAud)) {
    return { ok: false, code: "ACCESS_AUDIENCE_INVALID" };
  }

  const parts = rawEmails.split(",");
  const allowedEmails: string[] = [];
  for (const part of parts) {
    if (part.trim().length === 0) continue;
    const email = normalizeEmail(part);
    if (email === null) return { ok: false, code: "ACCESS_ALLOWED_IDENTITIES_INVALID" };
    allowedEmails.push(email);
  }
  if (allowedEmails.length === 0) {
    return { ok: false, code: "ACCESS_ALLOWED_IDENTITIES_INVALID" };
  }

  return {
    ok: true,
    config: { issuer: domain.issuer, jwksUrl: domain.jwksUrl, audience: rawAud, allowedEmails },
  };
}

/**
 * Cache de resolvedores JWKS, chaveado pelo team domain JÁ VALIDADO.
 *
 * O que se guarda é o RESOLVEDOR do `jose`, não uma chave individual: ele
 * mantém o próprio cache interno com cooldown e refetch quando um `kid`
 * desconhecido aparece. Congelar uma chave específica quebraria a rotação de
 * chaves da Cloudflare; recriar o resolvedor a cada request faria um fetch de
 * JWKS por requisição. Nada de JWT, e-mail ou payload entra neste mapa.
 */
const jwksResolverCache = new Map<string, AccessJwksResolver>();

function resolverFor(jwksUrl: string, cacheKey: string): AccessJwksResolver {
  const cached = jwksResolverCache.get(cacheKey);
  if (cached) return cached;
  const resolver = createRemoteJWKSet(new URL(jwksUrl)) as AccessJwksResolver;
  jwksResolverCache.set(cacheKey, resolver);
  return resolver;
}

/** Só para teste — evita que o cache vaze entre casos. */
export function resetAccessJwksCacheForTesting(): void {
  jwksResolverCache.clear();
}

/**
 * Traduz a falha do `jose` para um código próprio e sanitizado.
 *
 * Nunca repassa `error.message` nem `error.cause`: as mensagens do `jose`
 * carregam o payload do token (`JWTClaimValidationFailed` guarda `payload` em
 * `cause`), e devolver isso ao cliente vazaria e-mail e claims internos.
 * Os identificadores abaixo são propriedades públicas e estáveis da própria
 * biblioteca (`code`/`claim`), não texto livre.
 */
function classifyJoseError(error: unknown): CloudflareAccessFailureCode {
  if (error !== null && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    const claim = "claim" in error ? (error as { claim?: unknown }).claim : undefined;

    if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
      if (claim === "iss") return "ACCESS_ISSUER_INVALID";
      if (claim === "aud") return "ACCESS_AUDIENCE_MISMATCH";
    }
  }
  // Expirado, nbf futuro, assinatura inválida, alg não permitido, kid
  // desconhecido, malformado — tudo colapsa no mesmo código genérico: a
  // distinção só interessaria a quem está tentando adivinhar um token.
  return "ACCESS_JWT_INVALID";
}

/**
 * Verifica criptograficamente o JWT do Cloudflare Access de uma requisição.
 *
 * Nunca decodifica-e-confia: o payload só é lido DEPOIS de `jwtVerify`
 * confirmar assinatura, issuer, audience e validade temporal.
 */
export async function verifyCloudflareAccessRequest(
  request: Request,
  env: CloudflareAccessEnvLike,
  dependencies?: CloudflareAccessDependencies,
): Promise<CloudflareAccessResult> {
  const parsed = parseCloudflareAccessConfig(env);
  if (!parsed.ok) return { valid: false, code: parsed.code };
  const { issuer, jwksUrl, audience, allowedEmails } = parsed.config;

  const token = request.headers.get(ACCESS_JWT_HEADER)?.trim();
  if (!token) return { valid: false, code: "ACCESS_JWT_MISSING" };

  const resolver = dependencies?.jwksResolver ?? resolverFor(jwksUrl, issuer);

  let payload: JWTPayload;
  try {
    const verified = await jwtVerify(token, resolver, {
      algorithms: ["RS256"], // exclusivo: bloqueia alg:none, HS256 e afins
      issuer,
      audience,
    });
    payload = verified.payload;
  } catch (error) {
    return { valid: false, code: classifyJoseError(error) };
  }

  const subject = typeof payload.sub === "string" ? payload.sub.trim() : "";
  const rawEmail = typeof payload.email === "string" ? payload.email : "";
  const email = rawEmail.trim().toLowerCase();

  if (subject.length === 0 || email.length === 0) {
    return { valid: false, code: "ACCESS_IDENTITY_MISSING" };
  }

  if (!allowedEmails.includes(email)) {
    return { valid: false, code: "ACCESS_IDENTITY_NOT_ALLOWED" };
  }

  return { valid: true, identity: { email, subject } };
}

/** Resposta genérica — nunca revela token, payload, e-mail, issuer, AUD, JWKS ou erro interno. */
export function accessDeniedResponse(): Response {
  return new Response("ACCESS_DENIED", {
    status: 403,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
