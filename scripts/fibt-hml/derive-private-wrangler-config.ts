#!/usr/bin/env bun
// Deriva a configuração Wrangler privada do deployment HML a partir da
// configuração canônica versionada (wrangler.hml.jsonc) + um arquivo privado
// de runtime vars que vive FORA do repositório.
//
// Por que este script existe (FIBT-HML-4D): a config privada era montada à
// mão a cada rodada. Uma montagem manual perdeu o bloco `rules` que o nitro
// gera, e o Worker subiu sem os módulos ES classificados — falhando em
// runtime com `No such module`. Derivar programaticamente da fonte canônica
// torna esse tipo de omissão impossível: o que não estiver em
// wrangler.hml.jsonc não entra, e o que estiver entra sempre.
//
// NUNCA lê, imprime ou copia secrets. O único secret do deployment
// (SUPABASE_SERVICE_ROLE_KEY) vai por --secrets-file do Wrangler, nunca por
// `vars`, e nunca passa por aqui.
//
// Uso:
//   bun run scripts/fibt-hml/derive-private-wrangler-config.ts \
//     --runtime-vars <caminho-privado>/runtime.hml.private.json \
//     --artifact <caminho-do-artefato-com-server-e-public> \
//     --out <caminho-privado>/wrangler.hml.private.jsonc

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

/** Campos que a config privada DEVE herdar da canônica, sem exceção. */
export const INHERITED_DEPLOYMENT_FIELDS = [
  "name",
  "compatibility_date",
  "compatibility_flags",
  "workers_dev",
  "preview_urls",
  "no_bundle",
  "rules",
] as const;

/**
 * Runtime vars que o Worker HML precisa ter em `vars` no momento do upload —
 * contrato completo, não só o que "parece" precisar.
 *
 * FIBT-HML-5D: `VITE_FIBT_HML_ENABLED` foi omitida daqui numa rodada anterior
 * porque a documentação (antes desta correção) descrevia essa variável como
 * "só liga o banner no cliente". Isso está incompleto: `hml-backend-boundary
 * .server.ts` TAMBÉM a lê em runtime — o prefixo VITE_ não implica "só
 * build-time" quando o código faz `process.env.VITE_X` (em vez de
 * `import.meta.env.VITE_X`), porque só a segunda forma é substituída
 * estaticamente pelo Vite. `VITE_SUPABASE_URL` tem exatamente o mesmo
 * problema, pelo mesmo motivo, no mesmo arquivo — encontrada só ao escrever
 * o teste de regressão desta correção (ver teste "8" no arquivo de teste),
 * não fazia parte do diagnóstico original desta rodada. Sem ela, a versão
 * teria travado no PRÓXIMO gate (`HML_BROWSER_PROJECT_REF_MISSING`) assim
 * que `VITE_FIBT_HML_ENABLED` fosse corrigida — mesma classe de defeito,
 * só que descoberta mais cedo por escrever o teste certo em vez de corrigir
 * só o sintoma já visto. Versões já enviadas ao Cloudflare são imutáveis:
 * uma var omitida aqui só é descoberta em runtime — daí esta lista existir
 * como contrato fechado, não como convenção implícita.
 */
export const REQUIRED_RUNTIME_VARS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_URL",
  "FIBT_HML_AUTHORIZED_STAGING_REF",
  "VITALOS_PRODUCTION_PROJECT_REF",
  "FIBT_HML_FRONTEND_BASE_URL",
  "VITALOS_RUNTIME_ENV",
  "VITALOS_DB_TARGET",
  "VITALOS_STAGING_PROJECT_REF",
  "FIBT_HML_DEPLOYMENT_ENABLED",
  "VITE_FIBT_HML_ENABLED",
  "VITE_FIBT_HML_ENVIRONMENT",
  "VITE_FIBT_HML_BATCH_ID",
  "VITE_FIBT_HML_FRONTEND_BASE_URL",
  "CLOUDFLARE_ACCESS_TEAM_DOMAIN",
  "CLOUDFLARE_ACCESS_AUD",
  "CLOUDFLARE_ACCESS_ALLOWED_EMAILS",
] as const;

/**
 * Runtime vars que os boundaries server-side leem mas que são genuinamente
 * opcionais no próprio código (fallback explícito, nunca reprovação por
 * ausência) — declaradas aqui para que o teste de varredura de
 * `process.env` (que existe para achar a PRÓXIMA var esquecida) não as
 * confunda com uma omissão real.
 */
export const OPTIONAL_RUNTIME_VARS = ["FORBIDDEN_PROJECT_REFS"] as const;

/** Remove comentários de um JSONC para permitir JSON.parse. */
export function stripJsonComments(source: string): string {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    const next = source[i + 1];
    if (inLine) {
      if (c === "\n") {
        inLine = false;
        out += c;
      }
      continue;
    }
    if (inBlock) {
      if (c === "*" && next === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += c;
      if (c === "\\") {
        out += source[++i] ?? "";
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === "/" && next === "/") {
      inLine = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlock = true;
      i++;
      continue;
    }
    out += c;
  }
  // trailing commas
  return out.replace(/,(\s*[}\]])/g, "$1");
}

export interface DerivedConfigInput {
  canonical: Record<string, unknown>;
  runtimeVars: Record<string, string>;
  artifactDir: string;
}

/**
 * Puro: monta a config privada. Herda todos os campos de implantação da
 * canônica (nunca reconstrói à mão), reaponta main/assets para o artefato
 * informado e injeta as runtime vars não secretas.
 */
export function deriveDeploymentConfig(input: DerivedConfigInput): Record<string, unknown> {
  const { canonical, runtimeVars, artifactDir } = input;

  const missing = INHERITED_DEPLOYMENT_FIELDS.filter((f) => !(f in canonical));
  if (missing.length > 0) {
    throw new Error(
      `wrangler.hml.jsonc não declara campo(s) obrigatório(s): ${missing.join(", ")}. ` +
        "A config privada não pode ser derivada de uma canônica incompleta.",
    );
  }

  const missingRuntimeVars = REQUIRED_RUNTIME_VARS.filter(
    (k) => typeof runtimeVars[k] !== "string" || runtimeVars[k].trim() === "",
  );
  if (missingRuntimeVars.length > 0) {
    throw new Error(
      `runtime vars incompleto(s) — ausente(s) ou vazio(s): ${missingRuntimeVars.join(", ")}. ` +
        "Uma versão Cloudflare já enviada é imutável: uma var faltando aqui só aparece " +
        "como falha em runtime (ex.: HML_NOT_ENABLED), nunca no momento do upload.",
    );
  }
  if (runtimeVars.VITE_FIBT_HML_ENABLED !== "true") {
    throw new Error(
      'VITE_FIBT_HML_ENABLED deve ser exatamente "true" para um pacote HML habilitado — ' +
        "o backend (hml-backend-boundary.server.ts) lê esta MESMA variável em runtime, " +
        "não só o cliente.",
    );
  }

  const assets = canonical.assets as Record<string, unknown>;
  const derived: Record<string, unknown> = {};
  for (const field of INHERITED_DEPLOYMENT_FIELDS) derived[field] = canonical[field];

  derived.main = `${artifactDir}/server/index.mjs`;
  derived.assets = { ...assets, directory: `${artifactDir}/public` };
  derived.vars = runtimeVars;

  return derived;
}

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (p) return p.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (import.meta.main) {
  const runtimeVarsPath = arg("runtime-vars");
  const artifactDir = arg("artifact");
  const outPath = arg("out");

  if (!runtimeVarsPath || !artifactDir || !outPath) {
    console.error("Uso: --runtime-vars <arquivo> --artifact <dir> --out <arquivo>");
    process.exit(1);
  }
  for (const [label, p] of [
    ["runtime-vars", runtimeVarsPath],
    ["artifact", artifactDir],
  ] as const) {
    if (!existsSync(p)) {
      console.error(`[derive] ${label} não encontrado.`);
      process.exit(1);
    }
  }

  const canonicalPath = join(process.cwd(), "wrangler.hml.jsonc");
  const canonical = JSON.parse(stripJsonComments(readFileSync(canonicalPath, "utf8")));
  const runtimeVars = JSON.parse(readFileSync(runtimeVarsPath, "utf8"));

  const derived = deriveDeploymentConfig({
    canonical,
    runtimeVars,
    artifactDir: resolve(artifactDir).split("\\").join("/"),
  });

  writeFileSync(outPath, `${JSON.stringify(derived, null, 2)}\n`);

  // Saída deliberadamente pobre: nomes e contagens, nunca valores.
  console.log(
    `[derive] OK — campos herdados=${INHERITED_DEPLOYMENT_FIELDS.length} ` +
      `rules=${(derived.rules as unknown[]).length} vars=${Object.keys(runtimeVars).length}`,
  );
}
