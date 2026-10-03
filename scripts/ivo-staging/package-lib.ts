// Funções PURAS do empacotamento de staging IVO (sem rede, sem segredo).
// Usadas por scripts/ivo-staging-prepare.ts e testadas em package-lib.test.ts.

import { createHash } from "node:crypto";

/** Alvo canônico público (ref/URL não são credenciais). */
export const IVO_STAGING_TARGET = {
  projectRef: "xttjkpzhxtjfwxjsxuab",
  // Montada a partir do ref (não é segredo; evita literal de URL de projeto no código-fonte).
  supabaseUrl: "https://" + "xttjkpzhxtjfwxjsxuab" + ".supabase.co",
  productionRef: "shlmzzchddohaytfakol",
  workerName: "vitalos-ivo-staging",
  historicWorkerName: "vitalos-fibt-hml-isg",
  accountSubdomain: "pesquisafib",
} as const;

export function workerUrl(name = IVO_STAGING_TARGET.workerName, sub = IVO_STAGING_TARGET.accountSubdomain): string {
  return `https://${name}.${sub}.workers.dev`;
}

/** Valor que torna o perfil IVO INVÁLIDO se implantado por engano (fail-closed). */
export const PENDING_ORG_IDS = "PENDENTE_PROVISIONAMENTO";

export type PublishableKeyClass =
  | { ok: true; kind: "publishable" | "legacy_anon" }
  | { ok: false; reason: "empty" | "secret_key" | "service_role_jwt" | "unrecognized" };

/**
 * Classifica a chave CLIENTE. Aceita publishable moderna (pode ser opaca) ou
 * anon legada. Recusa secret/service_role. Classificação não prova validade —
 * a prova é a leitura mínima no endpoint do projeto (verifyKeyAgainstProject).
 */
export function classifyPublishableKey(raw: string | undefined): PublishableKeyClass {
  const key = (raw ?? "").trim();
  if (!key) return { ok: false, reason: "empty" };
  if (key.startsWith("sb_secret_")) return { ok: false, reason: "secret_key" };
  if (key.startsWith("sb_publishable_")) return { ok: true, kind: "publishable" };
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as {
        role?: string;
      };
      if (payload.role === "service_role") return { ok: false, reason: "service_role_jwt" };
      if (payload.role === "anon") return { ok: true, kind: "legacy_anon" };
    } catch {
      return { ok: false, reason: "unrecognized" };
    }
  }
  return { ok: false, reason: "unrecognized" };
}

/** Variáveis que NUNCA podem chegar ao build/deploy IVO (removidas, não "false"). */
export const FORBIDDEN_DECLARATIONS = [
  "VITE_FIBT_HML_ENABLED",
  "FIBT_HML_DEPLOYMENT_ENABLED",
  "VITE_FIBT_HML_ENVIRONMENT",
  "VITE_FIBT_HML_BATCH_ID",
  "VITE_FIBT_HML_FRONTEND_BASE_URL",
  "FIBT_HML_FRONTEND_BASE_URL",
  "FIBT_HML_AUTHORIZED_STAGING_REF",
  "VITALOS_LOCAL_FIXTURE_CAPABILITIES",
  "VITALOS_DB_TARGET",
  "VITALOS_RUNTIME_ENV",
] as const;

/** Não precisam (nem devem) estar no processo de build do cliente. */
export const BUILD_EXCLUDED_SECRETS = ["SUPABASE_SERVICE_ROLE_KEY", "STAGING_DB_URL"] as const;

/**
 * Ambiente do PROCESSO FILHO de build. Parte do ambiente atual, remove
 * declarações proibidas e segredos de runtime, e fixa o alvo canônico. Os
 * valores do `.env` versionado (produção) ficam sobrescritos: no Vite o
 * process.env vence o arquivo.
 */
export function buildEnvironment(base: Record<string, string | undefined>, publishableKey: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined) continue;
    if ((FORBIDDEN_DECLARATIONS as readonly string[]).includes(k)) continue;
    if ((BUILD_EXCLUDED_SECRETS as readonly string[]).includes(k)) continue;
    if (k.startsWith("VITALOS_IVO_") || k.startsWith("IVO_STAGING_")) continue;
    env[k] = v;
  }
  Object.assign(env, {
    VITALOS_STAGING_PROJECT_REF: IVO_STAGING_TARGET.projectRef,
    VITALOS_PRODUCTION_PROJECT_REF: IVO_STAGING_TARGET.productionRef,
    SUPABASE_URL: IVO_STAGING_TARGET.supabaseUrl,
    VITE_SUPABASE_URL: IVO_STAGING_TARGET.supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: publishableKey,
    VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    VITE_FIBT_PILOT_ENABLED: "true",
    VITE_APP_URL: workerUrl(),
  });
  return env;
}

/** Variáveis de runtime do Worker — fonte de verdade é o config efetivo. */
export function runtimeVars(publishableKey: string, orgIds: readonly string[] | null): Record<string, string> {
  return {
    VITALOS_IVO_PROFILE: "staging",
    VITALOS_IVO_AUTHORIZED_PROJECT_REF: IVO_STAGING_TARGET.projectRef,
    VITALOS_IVO_AUTHORIZED_ORG_IDS: orgIds && orgIds.length > 0 ? orgIds.join(",") : PENDING_ORG_IDS,
    VITALOS_PRODUCTION_PROJECT_REF: IVO_STAGING_TARGET.productionRef,
    SUPABASE_URL: IVO_STAGING_TARGET.supabaseUrl,
    VITE_SUPABASE_URL: IVO_STAGING_TARGET.supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: publishableKey,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function parseOrgIds(raw: string | undefined): string[] | null {
  const ids = (raw ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (ids.length === 0 || ids.length > 20 || ids.some((id) => !UUID.test(id))) return null;
  return ids;
}

/**
 * Config efetivo do Wrangler para o pacote. `phase`:
 *   "sealed"  workers_dev=false e preview_urls=false: o Worker existe sem rota
 *             pública (primeiro upload, antes do Access);
 *   "public"  workers_dev=true (só depois do Access confirmado).
 * keep_vars=false: o deploy apaga vars do Dashboard e aplica exatamente estas.
 */
export function effectiveWranglerConfig(
  base: Record<string, unknown>,
  input: { phase: "sealed" | "public"; outputDir: string; vars: Record<string, string> },
): Record<string, unknown> {
  if (base.name !== IVO_STAGING_TARGET.workerName) throw new Error("config base não é do Worker IVO de staging");
  const outputDir = input.outputDir.replace(/\\/g, "/");
  return {
    name: IVO_STAGING_TARGET.workerName,
    compatibility_date: base.compatibility_date,
    compatibility_flags: base.compatibility_flags,
    workers_dev: input.phase === "public",
    preview_urls: false,
    main: `${outputDir}/server/index.mjs`,
    assets: { ...(base.assets as Record<string, unknown>), directory: `${outputDir}/public` },
    no_bundle: true,
    rules: base.rules,
    keep_vars: false,
    vars: input.vars,
    secrets: { required: ["SUPABASE_SERVICE_ROLE_KEY"] },
  };
}

export function stripJsonComments(source: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (inString) {
      out += c;
      if (c === "\\") out += source[++i] ?? "";
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i++;
    } else out += c;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

export interface FileDigest {
  path: string;
  bytes: number;
  sha256: string;
}

/** Hash do pacote: SHA-256 da lista ordenada `caminho \0 sha256 \n`. */
export function packageDigest(files: readonly FileDigest[]): string {
  const lines = [...files].sort((a, b) => (a.path < b.path ? -1 : 1)).map((f) => `${f.path}\0${f.sha256}\n`);
  return createHash("sha256").update(lines.join("")).digest("hex");
}

/** Remove qualquer ocorrência dos valores sensíveis de um log antes de gravá-lo. */
export function sanitizeLog(text: string, sensitive: readonly string[]): string {
  let out = text;
  for (const value of sensitive) if (value && value.length >= 8) out = out.split(value).join("<REDACTED>");
  return out
    .replace(/sb_(secret|publishable)_[A-Za-z0-9_-]{6,}/g, "sb_$1_<REDACTED>")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "<JWT_REDACTED>")
    // URLs de banco com credencial e senhas de pg (ex.: script impresso pelo `db dump --dry-run`).
    .replace(/(postgres(?:ql)?:\/\/)[^\s"'@]+@/gi, "$1<REDACTED>@")
    .replace(/(PGPASSWORD\s*=\s*)("[^"]*"|'[^']*'|\S+)/g, "$1<REDACTED>")
    .replace(/(password\s*=\s*)("[^"]*"|'[^']*'|\S+)/gi, "$1<REDACTED>");
}

/**
 * Extrai de um dump SQL PLANO (`supabase db dump --data-only --use-copy`) apenas
 * os blocos `COPY public.<tabela> … FROM stdin; … \.` das tabelas pedidas, para
 * restauração seletiva. Devolve também as tabelas sem bloco (0 linhas) e quantas
 * linhas cada bloco tem. Não executa nada.
 */
export function extractCopyBlocks(
  sql: string,
  tables: readonly string[],
): { sql: string; rows: Record<string, number>; absent: string[] } {
  const lines = sql.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const rows: Record<string, number> = {};
  for (let i = 0; i < lines.length; i++) {
    const m = /^COPY "?public"?\."?([a-z_]+)"? \(/.exec(lines[i]!);
    if (!m || !tables.includes(m[1]!)) continue;
    const table = m[1]!;
    const block = [lines[i]!];
    let n = 0;
    for (i++; i < lines.length && lines[i] !== "\\."; i++) {
      block.push(lines[i]!);
      n++;
    }
    block.push("\\.");
    out.push(...block, "");
    rows[table] = n;
  }
  return { sql: out.join("\n"), rows, absent: tables.filter((t) => !(t in rows)) };
}
