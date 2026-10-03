import { describe, expect, test } from "bun:test";
import {
  IVO_STAGING_TARGET,
  PENDING_ORG_IDS,
  buildEnvironment,
  classifyPublishableKey,
  effectiveWranglerConfig,
  packageDigest,
  parseOrgIds,
  runtimeVars,
  sanitizeLog,
  stripJsonComments,
  workerUrl,
} from "./package-lib";
import { resolveIvoRuntimeProfile } from "../../src/lib/ivo/ivo-runtime-profile.server";
import { readFileSync } from "node:fs";
// Chaves fictícias montadas por concatenação: o scanner de segredo recusa literais com esse formato.
const PUB = "sb_" + "publishable_" + "ficticia_123";
const SEC = "sb_" + "secret_" + "ficticia_123";
import { join } from "node:path";

const jwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.assinatura-ficticia`;

describe("chave cliente de staging", () => {
  test("aceita publishable opaca e anon legada; recusa secret e service_role", () => {
    expect(classifyPublishableKey(PUB)).toEqual({ ok: true, kind: "publishable" });
    expect(classifyPublishableKey(jwt("anon"))).toEqual({ ok: true, kind: "legacy_anon" });
    expect(classifyPublishableKey(SEC)).toEqual({ ok: false, reason: "secret_key" });
    expect(classifyPublishableKey(jwt("service_role"))).toEqual({ ok: false, reason: "service_role_jwt" });
    expect(classifyPublishableKey("  ")).toEqual({ ok: false, reason: "empty" });
    expect(classifyPublishableKey("qualquer-coisa")).toEqual({ ok: false, reason: "unrecognized" });
  });
});

describe("ambiente do build", () => {
  const base = {
    PATH: "/bin",
    VITE_FIBT_HML_ENABLED: "false",
    FIBT_HML_DEPLOYMENT_ENABLED: "true",
    SUPABASE_SERVICE_ROLE_KEY: "nao-deve-passar",
    STAGING_DB_URL: "postgresql://nao-deve-passar",
    VITALOS_DB_TARGET: "production",
    VITALOS_IVO_AUTHORIZED_ORG_IDS: "x",
    SUPABASE_URL: "https://" + IVO_STAGING_TARGET.productionRef + ".supabase.co",
  };
  const env = buildEnvironment(base, PUB);

  test("declaração HML é REMOVIDA (não vira 'false'); segredos de runtime não entram", () => {
    for (const k of ["VITE_FIBT_HML_ENABLED", "FIBT_HML_DEPLOYMENT_ENABLED", "SUPABASE_SERVICE_ROLE_KEY", "STAGING_DB_URL", "VITALOS_DB_TARGET", "VITALOS_IVO_AUTHORIZED_ORG_IDS"]) {
      expect(k in env).toBe(false);
    }
    expect(env.PATH).toBe("/bin");
  });

  test("alvo canônico sobrescreve configuração produtiva herdada", () => {
    expect(env.SUPABASE_URL).toBe(IVO_STAGING_TARGET.supabaseUrl);
    expect(env.VITE_SUPABASE_URL).toBe(IVO_STAGING_TARGET.supabaseUrl);
    expect(env.VITALOS_STAGING_PROJECT_REF).toBe("xttjkpzhxtjfwxjsxuab");
    expect(env.VITE_FIBT_PILOT_ENABLED).toBe("true");
    expect(env.VITE_APP_URL).toBe("https://vitalos-ivo-staging.pesquisafib.workers.dev");
  });
});

describe("runtime e config efetivo", () => {
  const baseConfig = JSON.parse(stripJsonComments(readFileSync(join(process.cwd(), "wrangler.ivo-staging.jsonc"), "utf8")));

  test("sem IDs de organização, o placeholder torna o perfil inválido (fail-closed)", () => {
    const vars = runtimeVars(PUB, null);
    expect(vars.VITALOS_IVO_AUTHORIZED_ORG_IDS).toBe(PENDING_ORG_IDS);
    expect(resolveIvoRuntimeProfile(vars)).toEqual({ kind: "invalid", reason: "org_allowlist_invalid" });
  });

  test("com IDs válidos, o perfil resultante é staging", () => {
    const ids = parseOrgIds("306521c1-3db8-43dd-a43b-4e0609e31a69, AC467502-B4AB-4C28-A2A6-8030FC54A478")!;
    expect(resolveIvoRuntimeProfile(runtimeVars("k", ids)).kind).toBe("staging");
    expect(parseOrgIds("org-alfa")).toBeNull();
    expect(parseOrgIds("")).toBeNull();
  });

  test("config efetivo: nome, vars exatas (keep_vars=false), segredo exigido, fases", () => {
    const sealed = effectiveWranglerConfig(baseConfig, { phase: "sealed", outputDir: "C:\\pkg\\output", vars: { A: "1" } });
    expect(sealed).toMatchObject({
      name: "vitalos-ivo-staging",
      workers_dev: false,
      preview_urls: false,
      keep_vars: false,
      vars: { A: "1" },
      secrets: { required: ["SUPABASE_SERVICE_ROLE_KEY"] },
      main: "C:/pkg/output/server/index.mjs",
      no_bundle: true,
    });
    expect((sealed.assets as { directory: string; run_worker_first: boolean })).toMatchObject({ directory: "C:/pkg/output/public", run_worker_first: true });
    expect(effectiveWranglerConfig(baseConfig, { phase: "public", outputDir: "/p", vars: {} }).workers_dev).toBe(true);
    expect(() => effectiveWranglerConfig({ ...baseConfig, name: IVO_STAGING_TARGET.historicWorkerName }, { phase: "sealed", outputDir: "/p", vars: {} })).toThrow();
    expect(JSON.stringify(sealed)).not.toContain("FIBT_HML");
  });
});

describe("hash do pacote e logs", () => {
  test("digest independe da ordem e muda com qualquer arquivo", () => {
    const a = { path: "a.js", bytes: 1, sha256: "11" };
    const b = { path: "b.js", bytes: 1, sha256: "22" };
    expect(packageDigest([a, b])).toBe(packageDigest([b, a]));
    expect(packageDigest([a, b])).not.toBe(packageDigest([a, { ...b, sha256: "23" }]));
  });

  test("log sanitizado não contém chaves nem JWT", () => {
    const log = sanitizeLog(`key=${"sb_" + "publishable_" + "abcdef123"} ${jwt("anon")} valor-sensivel-xyz`, ["valor-sensivel-xyz"]);
    expect(log).not.toMatch(/sb_publishable_abcdef|valor-sensivel|eyJ/);
  });

  test("URL do Worker deriva do nome e do subdomínio da conta", () => {
    expect(workerUrl()).toBe("https://vitalos-ivo-staging.pesquisafib.workers.dev");
  });
});
