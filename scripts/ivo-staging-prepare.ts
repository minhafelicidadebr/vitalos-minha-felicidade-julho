#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// PREPARAÇÃO DO PACOTE DE STAGING IVO — entrada única (docs/vitalos/staging-rollout.md)
// ═══════════════════════════════════════════════════════════════════════════
//
//   build      valida alvo e chave pública → build:ivo:staging num PROCESSO FILHO
//              com ambiente próprio (o ambiente do chamador não é alterado) →
//              copia o artefato para um pacote imutável → scanner de artefato →
//              verificação de conteúdo → manifesto (SHA-256 de cada arquivo) →
//              configs efetivos do Wrangler → dry-run sobre O MESMO pacote →
//              confere que o pacote não mudou.
//   finalize   completa o manifesto de RUNTIME com os IDs de Alfa/Beta vindos do
//              provisionamento autorizado (sem rebuild) e refaz o dry-run.
//   snapshot   pg_dump do staging para o HOST (volume explícito), com SHA-256 e
//              TOC de cada arquivo. URL do banco só por variável de ambiente.
//
// Nunca imprime chave, token ou URL de banco. Logs gravados são sanitizados.
// Pacotes ficam em .ivo-staging.local/packages/ (ignorado pelo git) e nunca
// são sobrescritos: cada build gera um diretório novo.
//
// Chave pública: IVO_STAGING_PUBLISHABLE_KEY (do adaptador PowerShell, que a
// lê por prompt oculto) ou integração autenticada do Supabase CLI
// (`projects api-keys` do alvo; só a publishable/anon é retida).
//
// Saída: 0 ok · 2 validação/execução falhou · 3 chave pública ausente.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";
import {
  IVO_STAGING_TARGET,
  buildEnvironment,
  classifyPublishableKey,
  effectiveWranglerConfig,
  packageDigest,
  parseOrgIds,
  runtimeVars,
  sanitizeLog,
  stripJsonComments,
  workerUrl,
  type FileDigest,
} from "./ivo-staging/package-lib";

const ROOT = process.cwd();
const PACKAGES = join(ROOT, ".ivo-staging.local", "packages");
const WRANGLER = "wrangler@4.147.0";
const SUPABASE_CLI = "supabase@2.119.0";

class StepError extends Error {
  constructor(message: string, readonly code = 2) {
    super(message);
  }
}

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function run(
  cmd: string[],
  opts: { env?: Record<string, string>; cwd?: string; timeoutMs?: number } = {},
): Promise<{ code: number; out: string; err: string; timedOut: boolean }> {
  const proc = Bun.spawn(cmd, { cwd: opts.cwd ?? ROOT, env: opts.env ?? (process.env as Record<string, string>), stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  let timedOut = false;
  const timer = opts.timeoutMs ? setTimeout(() => { timedOut = true; proc.kill(); }, opts.timeoutMs) : null;
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (timer) clearTimeout(timer);
  return { code, out, err, timedOut };
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function digestTree(dir: string): FileDigest[] {
  return listFiles(dir).map((full) => ({
    path: relative(dir, full).replace(/\\/g, "/"),
    bytes: statSync(full).size,
    sha256: sha256File(full),
  }));
}

// ── Chave pública ───────────────────────────────────────────────────────────

async function keyFromSupabaseCli(): Promise<string | null> {
  const r = await run(["bunx", SUPABASE_CLI, "projects", "api-keys", "--project-ref", IVO_STAGING_TARGET.projectRef, "-o", "json"], {
    timeoutMs: 90_000,
  });
  if (r.code !== 0 || r.timedOut) return null;
  try {
    const keys = JSON.parse(r.out) as Array<{ name?: string; type?: string; api_key?: string }>;
    const pick = keys.find((k) => k.type === "publishable") ?? keys.find((k) => k.name === "anon");
    return pick?.api_key?.trim() || null;
  } catch {
    return null;
  }
}

async function resolvePublishableKey(log: (s: string) => void): Promise<{ key: string; source: string }> {
  const fromEnv = process.env.IVO_STAGING_PUBLISHABLE_KEY?.trim();
  if (fromEnv) return { key: fromEnv, source: "entrada local oculta (IVO_STAGING_PUBLISHABLE_KEY)" };
  if (!process.argv.includes("--no-cli-key")) {
    log("  …    tentando a integração autenticada do Supabase CLI (projects api-keys do alvo)");
    const fromCli = await keyFromSupabaseCli();
    if (fromCli) return { key: fromCli, source: "Supabase CLI autenticado (projects api-keys)" };
    log("  --   Supabase CLI sem acesso ao projeto de staging (ou sem sessão)");
  }
  throw new StepError(
    "chave pública de staging ausente. Inicie: powershell -ExecutionPolicy Bypass -File scripts\\ivo-staging\\prepare.ps1 (prompt oculto)",
    3,
  );
}

/** Leitura mínima no endpoint do projeto — a única prova de validade aceita. */
async function verifyKeyAgainstProject(key: string): Promise<number> {
  const res = await fetch(`${IVO_STAGING_TARGET.supabaseUrl}/auth/v1/settings`, { headers: { apikey: key } });
  await res.arrayBuffer();
  return res.status;
}

// ── Verificação de conteúdo do artefato ─────────────────────────────────────

interface ContentCheck {
  check: string;
  ok: boolean;
  detail: string;
}

function contentChecks(outputDir: string, key: string): ContentCheck[] {
  const read = (sub: string) =>
    listFiles(join(outputDir, sub))
      .filter((f) => /\.(m?js|html|css|json)$/.test(f))
      .map((f) => ({ f: relative(outputDir, f).replace(/\\/g, "/"), s: readFileSync(f, "utf8") }));
  const client = read("public");
  const server = read("server");
  const count = (files: { s: string }[], needle: string) => files.filter((x) => x.s.includes(needle)).length;
  const prodHost = `${IVO_STAGING_TARGET.productionRef}.supabase.co`;
  const stagingHost = `${IVO_STAGING_TARGET.projectRef}.supabase.co`;
  return [
    { check: "cliente aponta para a URL de staging", ok: count(client, stagingHost) > 0, detail: `${count(client, stagingHost)} arquivo(s)` },
    { check: "cliente contém a chave pública verificada", ok: count(client, key) > 0, detail: `${count(client, key)} arquivo(s) (valor não exibido)` },
    { check: "cliente sem URL de produção", ok: count(client, prodHost) === 0, detail: `${count(client, prodHost)} arquivo(s)` },
    { check: "cliente sem ref de produção", ok: count(client, IVO_STAGING_TARGET.productionRef) === 0, detail: `${count(client, IVO_STAGING_TARGET.productionRef)} arquivo(s)` },
    { check: "cliente sem secret key / service_role JWT", ok: client.every((x) => !/sb_secret_[A-Za-z0-9_-]{6,}/.test(x.s) && !/"role"\s*:\s*"service_role"/.test(x.s)), detail: "padrões sb_secret_ e role=service_role" },
    { check: "servidor sem URL de produção ativa", ok: count(server, `https://${prodHost}`) === 0, detail: `${count(server, `https://${prodHost}`)} arquivo(s)` },
    {
      check: "servidor: ref de produção só como bloqueio",
      ok: true,
      detail: `${count(server, IVO_STAGING_TARGET.productionRef)} arquivo(s) com o ref literal (informativo: o runtime recebe VITALOS_PRODUCTION_PROJECT_REF para RECUSAR esse alvo)`,
    },
    {
      // O código da fronteira HML (constantes do lote) existe no bundle por
      // natureza; o que importa é a DECLARAÇÃO não ter sido embutida.
      check: "nenhuma declaração HML embutida (VITE_FIBT_HML_ENABLED)",
      ok: [...client, ...server].every((x) => !/["']?VITE_FIBT_HML_ENABLED["']?\s*:\s*["']true["']/.test(x.s)),
      detail: "variável removida do ambiente do build e ausente do bundle",
    },
  ];
}

export function assertBuildEnvClean(env: Record<string, string>): void {
  for (const name of ["VITE_FIBT_HML_ENABLED", "FIBT_HML_DEPLOYMENT_ENABLED", "SUPABASE_SERVICE_ROLE_KEY", "STAGING_DB_URL"]) {
    if (name in env) throw new StepError(`ambiente do build contém ${name} — recusado`);
  }
}

// ── Configs efetivos ────────────────────────────────────────────────────────

const BOOTSTRAP_WORKER = `// Worker SELADO de bootstrap (vitalos-ivo-staging): nenhum código VitalOS,
// nenhuma variável, nenhum segredo. Existe só para criar o nome/URL e permitir
// ligar o Cloudflare Access ANTES de qualquer versão funcional.
export default {
  async fetch() {
    return new Response("Not available.", { status: 403, headers: { "cache-control": "no-store" } });
  },
};
`;

function baseConfig(): Record<string, unknown> {
  return JSON.parse(stripJsonComments(readFileSync(join(ROOT, "wrangler.ivo-staging.jsonc"), "utf8")));
}

function writeConfigs(pkg: string, key: string, orgIds: string[] | null) {
  const outputDir = join(pkg, "output");
  const vars = runtimeVars(key, orgIds);
  const app = effectiveWranglerConfig(baseConfig(), { phase: "public", outputDir, vars });
  mkdirSync(join(pkg, "bootstrap"), { recursive: true });
  writeFileSync(join(pkg, "bootstrap", "index.mjs"), BOOTSTRAP_WORKER);
  const bootstrap = {
    name: IVO_STAGING_TARGET.workerName,
    compatibility_date: (baseConfig() as { compatibility_date: string }).compatibility_date,
    main: join(pkg, "bootstrap", "index.mjs").replace(/\\/g, "/"),
    workers_dev: true,
    preview_urls: false,
    keep_vars: false,
    vars: {},
  };
  // Contenção: MESMO código verificado, perfil inválido ⇒ toda leitura/escrita
  // IVO recusada antes da sessão. Exige um deploy (nova versão), não é
  // mudança "sem redeploy".
  const disabled = effectiveWranglerConfig(baseConfig(), {
    phase: "public",
    outputDir,
    vars: { ...vars, VITALOS_IVO_PROFILE: "disabled" },
  });
  writeFileSync(join(pkg, "wrangler.app.json"), JSON.stringify(app, null, 2));
  writeFileSync(join(pkg, "wrangler.app-disabled.json"), JSON.stringify(disabled, null, 2));
  writeFileSync(join(pkg, "wrangler.bootstrap.json"), JSON.stringify(bootstrap, null, 2));
  return {
    vars,
    disabledSha256: sha256File(join(pkg, "wrangler.app-disabled.json")),
    appSha256: sha256File(join(pkg, "wrangler.app.json")),
    bootstrapSha256: sha256File(join(pkg, "wrangler.bootstrap.json")),
    bootstrapWorkerSha256: sha256File(join(pkg, "bootstrap", "index.mjs")),
  };
}

async function dryRun(pkg: string, config: string, label: string, key: string): Promise<{ ok: boolean; wrangler: string }> {
  const r = await run(["bunx", WRANGLER, "deploy", "--dry-run", "--config", join(pkg, config), "--outdir", join(pkg, "evidence", `dryrun-${label}`)], {
    timeoutMs: 300_000,
  });
  const text = sanitizeLog(`${r.out}\n${r.err}`, [key]);
  writeFileSync(join(pkg, "evidence", `dryrun-${label}.log`), text);
  const wrangler = /wrangler (\d+\.\d+\.\d+)/.exec(text)?.[1] ?? "desconhecida";
  return { ok: r.code === 0 && !r.timedOut && text.includes("--dry-run: exiting now."), wrangler };
}

function runtimeManifest(pkg: string, codeDigest: string, cfg: ReturnType<typeof writeConfigs>, orgIds: string[] | null, key: string) {
  const fingerprint = createHash("sha256").update(key).digest("hex");
  return {
    schema: "ivo-staging-runtime/1",
    codePackageDigest: codeDigest,
    worker: IVO_STAGING_TARGET.workerName,
    url: workerUrl(),
    configs: {
      bootstrap: { file: "wrangler.bootstrap.json", sha256: cfg.bootstrapSha256, workerSha256: cfg.bootstrapWorkerSha256 },
      app: { file: "wrangler.app.json", sha256: cfg.appSha256, keep_vars: false, workers_dev: true, preview_urls: false },
      containment: { file: "wrangler.app-disabled.json", sha256: cfg.disabledSha256, VITALOS_IVO_PROFILE: "disabled" },
    },
    vars: Object.fromEntries(
      Object.entries(cfg.vars).map(([k, v]) => [k, k === "SUPABASE_PUBLISHABLE_KEY" ? `<publishable sha256:${fingerprint.slice(0, 16)}>` : v]),
    ),
    authorizedOrgIds: orgIds ?? "PENDENTE — completar com `finalize` após o provisionamento autorizado",
    secretsRequired: ["SUPABASE_SERVICE_ROLE_KEY (via --secrets-file privado no deploy)"],
    mustBeAbsent: ["FIBT_HML_DEPLOYMENT_ENABLED", "VITE_FIBT_HML_ENABLED", "VITALOS_LOCAL_FIXTURE_CAPABILITIES"],
    readyForAppDeploy: orgIds !== null,
    writtenAt: new Date().toISOString(),
  };
}

// ── build ───────────────────────────────────────────────────────────────────

async function build(): Promise<void> {
  const log = (s: string) => console.log(s);
  log(`PACOTE DE STAGING IVO — alvo ${IVO_STAGING_TARGET.projectRef} · Worker ${IVO_STAGING_TARGET.workerName} · ${workerUrl()}`);

  const dirty = await run(["git", "status", "--porcelain"]);
  if (dirty.out.trim()) throw new StepError("worktree com alterações: o pacote precisa corresponder a um commit. Faça commit antes.");
  const commit = (await run(["git", "rev-parse", "HEAD"])).out.trim();
  const tree = (await run(["git", "rev-parse", "HEAD^{tree}"])).out.trim();
  log(`  ok   commit ${commit.slice(0, 12)} · árvore ${tree.slice(0, 12)} (worktree limpo)`);

  const { key, source } = await resolvePublishableKey(log);
  const klass = classifyPublishableKey(key);
  if (!klass.ok) throw new StepError(`chave recusada como chave cliente (${klass.reason})`);
  const status = await verifyKeyAgainstProject(key);
  if (status !== 200) throw new StepError(`chave não validada pelo projeto de staging (GET /auth/v1/settings → HTTP ${status})`);
  log(`  ok   chave pública (${klass.kind}) de ${source}; validada no projeto (GET /auth/v1/settings → 200)`);

  const env = buildEnvironment(process.env as Record<string, string | undefined>, key);
  assertBuildEnvClean(env);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  const pkg = join(PACKAGES, `${commit.slice(0, 12)}-${stamp}`);
  mkdirSync(join(pkg, "evidence"), { recursive: true });

  log("  …    bun run build:ivo:staging (processo filho, ambiente próprio)");
  const b = await run(["bun", "run", "build:ivo:staging"], { env, timeoutMs: 900_000 });
  writeFileSync(join(pkg, "evidence", "build.log"), sanitizeLog(`${b.out}\n${b.err}`, [key]));
  if (b.code !== 0 || b.timedOut) throw new StepError(`build falhou (exit ${b.code}${b.timedOut ? ", timeout" : ""}) — ver evidence/build.log`);
  const preflight = /\[preflight\] OK[^\n]*/.exec(b.out)?.[0] ?? "";
  if (!preflight.includes("banco=staging")) throw new StepError("preflight do build não confirmou banco=staging");
  log(`  ok   build concluído · ${preflight.trim()}`);

  // Pacote imutável: o artefato é copiado ANTES de qualquer verificação; um
  // build posterior em .output/ não afeta este diretório.
  cpSync(join(ROOT, ".output", "server"), join(pkg, "output", "server"), { recursive: true });
  cpSync(join(ROOT, ".output", "public"), join(pkg, "output", "public"), { recursive: true });
  const files = digestTree(join(pkg, "output"));
  const digest = packageDigest(files);
  log(`  ok   pacote ${relative(ROOT, pkg)} · ${files.length} arquivo(s) · digest ${digest.slice(0, 16)}…`);

  const scan = await run(["bun", "run", "scripts/build-secret-scan.ts", "--require-artifact", `--artifact-dir=${join(pkg, "output", "public")}`]);
  writeFileSync(join(pkg, "evidence", "secret-scan.log"), sanitizeLog(`${scan.out}\n${scan.err}`, [key]));
  if (scan.code !== 0) throw new StepError("scanner de artefato reprovou o pacote — ver evidence/secret-scan.log");
  log("  ok   scanner de artefato (pacote copiado)");

  const checks = contentChecks(join(pkg, "output"), key);
  writeFileSync(join(pkg, "evidence", "content-checks.json"), JSON.stringify(checks, null, 2));
  for (const c of checks) log(`  ${c.ok ? "ok  " : "FAIL"} ${c.check} — ${c.detail}`);
  if (checks.some((c) => !c.ok)) throw new StepError("verificação de conteúdo reprovou o pacote");

  const cfg = writeConfigs(pkg, key, null);
  const dryApp = await dryRun(pkg, "wrangler.app.json", "app", key);
  const dryBoot = await dryRun(pkg, "wrangler.bootstrap.json", "bootstrap", key);
  const dryOff = await dryRun(pkg, "wrangler.app-disabled.json", "containment", key);
  if (!dryApp.ok || !dryBoot.ok || !dryOff.ok) throw new StepError("dry-run do Wrangler falhou — ver evidence/dryrun-*.log");
  const after = packageDigest(digestTree(join(pkg, "output")));
  if (after !== digest) throw new StepError("o pacote mudou durante o dry-run (rebuild oculto?)");
  log(`  ok   dry-run (app + bootstrap) sobre o mesmo pacote · Wrangler ${dryApp.wrangler} · digest inalterado`);

  const pkgJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { devDependencies: Record<string, string> };
  const manifest = {
    schema: "ivo-staging-package/1",
    commit,
    tree,
    createdAt: new Date().toISOString(),
    target: { ...IVO_STAGING_TARGET, workerUrl: workerUrl() },
    tools: { bun: Bun.version, wrangler: dryApp.wrangler, vite: pkgJson.devDependencies.vite, supabaseCli: SUPABASE_CLI },
    buildEnvNames: Object.keys(env).filter((k) => /^(VITE_|VITALOS_|SUPABASE_)/.test(k)).sort(),
    publishableKey: { kind: klass.kind, source, sha256: createHash("sha256").update(key).digest("hex"), verification: "GET /auth/v1/settings → 200" },
    preflight: preflight.trim(),
    packageDigest: digest,
    fileCount: files.length,
    totalBytes: files.reduce((s, f) => s + f.bytes, 0),
    files: files.sort((a, b) => (a.path < b.path ? -1 : 1)),
  };
  writeFileSync(join(pkg, "package-manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(join(pkg, "runtime-manifest.json"), JSON.stringify(runtimeManifest(pkg, digest, cfg, null, key), null, 2));
  log(`\nPACOTE VERIFICADO: ${relative(ROOT, pkg)}`);
  log(`  package-manifest.json sha256 ${sha256File(join(pkg, "package-manifest.json"))}`);
  log("  runtime: IDs de Alfa/Beta PENDENTES (o placeholder torna o perfil inválido se implantado) → finalize após o provisionamento");
}

// ── finalize ────────────────────────────────────────────────────────────────

async function finalize(): Promise<void> {
  const pkg = resolve(arg("package") ?? "");
  const provision = arg("provision-manifest");
  if (!existsSync(join(pkg, "package-manifest.json"))) throw new StepError("--package=<diretório do pacote> inválido");
  if (!provision || !existsSync(provision)) throw new StepError("--provision-manifest=<saída do provisionamento autorizado> obrigatório");
  const manifest = JSON.parse(readFileSync(join(pkg, "package-manifest.json"), "utf8")) as { packageDigest: string; publishableKey: { sha256: string } };
  const prov = JSON.parse(readFileSync(provision, "utf8")) as { target?: string; projectRef?: string; orgs?: Record<string, { orgId?: string }> };
  if (prov.target !== "staging" || prov.projectRef !== IVO_STAGING_TARGET.projectRef) {
    throw new StepError("manifesto de provisionamento não é do projeto de staging (IDs locais não valem como remotos)");
  }
  const ids = parseOrgIds([prov.orgs?.alfa?.orgId, prov.orgs?.beta?.orgId].filter(Boolean).join(","));
  if (!ids || ids.length !== 2) throw new StepError("IDs de Alfa/Beta ausentes ou malformados no manifesto de provisionamento");

  const { key } = await resolvePublishableKey(console.log);
  if (createHash("sha256").update(key).digest("hex") !== manifest.publishableKey.sha256) {
    throw new StepError("a chave informada não é a mesma embutida no pacote");
  }
  if (packageDigest(digestTree(join(pkg, "output"))) !== manifest.packageDigest) throw new StepError("o código do pacote foi alterado");
  const cfg = writeConfigs(pkg, key, ids);
  const dry = await dryRun(pkg, "wrangler.app.json", "app-final", key);
  if (!dry.ok) throw new StepError("dry-run final falhou — ver evidence/dryrun-app-final.log");
  writeFileSync(join(pkg, "runtime-manifest.json"), JSON.stringify(runtimeManifest(pkg, manifest.packageDigest, cfg, ids, key), null, 2));
  console.log(`  ok   runtime finalizado (${ids.length} organizações) · wrangler.app.json sha256 ${cfg.appSha256}`);
}

// ── snapshot ────────────────────────────────────────────────────────────────

const SNAPSHOT_TABLES = [
  "organizations", "profiles", "org_invites", "member_invites", "waves", "wave_cohorts", "sector_links",
  "wave_responses", "cohort_capsules", "ops_events", "action_plans", "action_items", "evidence_records", "action_log",
];

/**
 * Variante sem URL de banco: `supabase db dump --linked --project-ref` (o CLI
 * autenticado gerencia a credencial e grava no HOST via -f). SQL plano.
 * `--dry-run` só imprime o script do pg_dump (nenhum dado lido).
 */
async function snapshotViaCli(outDir: string, dryRunOnly: boolean): Promise<void> {
  const base = ["bunx", SUPABASE_CLI, "db", "dump", "--linked", "--project-ref", IVO_STAGING_TARGET.projectRef, "--schema", "public"];
  const workdir = join(outDir, ".cli");
  mkdirSync(workdir, { recursive: true });
  const jobs = [
    { file: "schema-public.sql", args: [] as string[] },
    { file: "data-public.sql", args: ["--data-only", "--use-copy"] },
  ];
  for (const job of jobs) {
    const cmd = [...base, ...job.args, "--workdir", workdir, ...(dryRunOnly ? ["--dry-run"] : ["-f", join(outDir, job.file)])];
    const r = await run(cmd, { timeoutMs: 900_000 });
    writeFileSync(join(outDir, `${job.file}.log`), sanitizeLog(`${r.out}\n${r.err}`, []));
    if (r.code !== 0 || r.timedOut) throw new StepError(`supabase db dump falhou para ${job.file} (exit ${r.code}) — ver ${job.file}.log`);
    if (dryRunOnly && !/pg_dump/.test(r.out + r.err)) throw new StepError(`dry-run do dump não mostrou o script do pg_dump (${job.file})`);
  }
  if (dryRunOnly) {
    console.log(`  ok   dump via CLI validado em --dry-run (nenhum dado lido) · logs em ${outDir}`);
    return;
  }
  for (const job of jobs) {
    const path = join(outDir, job.file);
    if (!existsSync(path) || statSync(path).size === 0) throw new StepError(`arquivo de snapshot vazio ou ausente: ${job.file}`);
  }
  const data = readFileSync(join(outDir, "data-public.sql"), "utf8");
  const covered = SNAPSHOT_TABLES.filter((t) => new RegExp(`COPY "?public"?\\."?${t}"? `).test(data));
  const files = jobs.map((j) => j.file);
  writeFileSync(join(outDir, "SHA256SUMS"), files.map((f) => `${sha256File(join(outDir, f))}  ${f}`).join("\n") + "\n");
  writeFileSync(
    join(outDir, "coverage.json"),
    JSON.stringify({ takenAt: new Date().toISOString(), via: "supabase db dump --linked", schema: "public (DDL + ACL)", data: "todas as tabelas de public", rolloutTablesWithData: covered, notCovered: ["auth.*", "storage.*"] }, null, 2),
  );
  console.log(`  ok   snapshot via CLI em ${outDir} · ${covered.length}/${SNAPSHOT_TABLES.length} tabelas do rollout com dados · SHA256SUMS gravado`);
}

async function snapshot(): Promise<void> {
  const outDir = resolve(arg("out-dir") ?? "");
  if (!arg("out-dir")) throw new StepError("--out-dir=<diretório do host FORA do repositório> obrigatório");
  if (outDir.toLowerCase().startsWith(ROOT.toLowerCase())) throw new StepError("--out-dir não pode ficar dentro do repositório");
  if (!process.env.STAGING_DB_URL || process.argv.includes("--via-cli")) {
    mkdirSync(outDir, { recursive: true });
    await snapshotViaCli(outDir, process.argv.includes("--dry-run"));
    return;
  }
  mkdirSync(outDir, { recursive: true });
  const network = arg("docker-network");
  const tables = SNAPSHOT_TABLES.map((t) => `-t public.${t}`).join(" ");
  const script = [
    "set -e",
    'pg_dump "$STAGING_DB_URL" --schema-only --schema=public -Fc -f /backup/schema-public.dump',
    `pg_dump "$STAGING_DB_URL" --data-only -Fc ${tables} -f /backup/data-ivo.dump`,
    "pg_restore --list /backup/schema-public.dump > /backup/schema-public.toc",
    "pg_restore --list /backup/data-ivo.dump > /backup/data-ivo.toc",
    "pg_dump --version > /backup/pg_dump.version",
  ].join(" && ");
  const r = await run(
    ["docker", "run", "--rm", ...(network ? ["--network", network] : []), "-e", "STAGING_DB_URL", "-v", `${outDir}:/backup`, "postgres:17", "sh", "-c", script],
    { timeoutMs: 900_000 },
  );
  const sensitive = [process.env.STAGING_DB_URL ?? ""];
  writeFileSync(join(outDir, "snapshot.log"), sanitizeLog(`${r.out}\n${r.err}`, sensitive));
  if (r.code !== 0 || r.timedOut) throw new StepError(`pg_dump falhou (exit ${r.code}) — ver snapshot.log no diretório do snapshot`);
  const files = ["schema-public.dump", "data-ivo.dump", "schema-public.toc", "data-ivo.toc", "pg_dump.version"];
  for (const f of files) if (!existsSync(join(outDir, f)) || statSync(join(outDir, f)).size === 0) throw new StepError(`arquivo de snapshot vazio ou ausente: ${f}`);
  const dataToc = readFileSync(join(outDir, "data-ivo.toc"), "utf8");
  const covered = SNAPSHOT_TABLES.filter((t) => new RegExp(`TABLE DATA public ${t} `).test(dataToc));
  const sums = files.map((f) => `${sha256File(join(outDir, f))}  ${f}`).join("\n") + "\n";
  writeFileSync(join(outDir, "SHA256SUMS"), sums);
  writeFileSync(
    join(outDir, "coverage.json"),
    JSON.stringify({ takenAt: new Date().toISOString(), schema: "public (DDL + ACL, sem dados)", dataTablesCovered: covered, dataTablesAbsent: SNAPSHOT_TABLES.filter((t) => !covered.includes(t)), notCovered: ["auth.*", "storage.*", "outras tabelas de public sem relação com o rollout"] }, null, 2),
  );
  console.log(`  ok   snapshot em ${outDir} · ${covered.length}/${SNAPSHOT_TABLES.length} tabelas com dados · SHA256SUMS gravado`);
}

// ── secrets-file ────────────────────────────────────────────────────────────
// Grava o ÚNICO secret do Worker num arquivo privado FORA do repositório, a
// partir da integração autenticada do Supabase CLI. Nunca imprime o valor.
// Usado por `wrangler deploy --secrets-file` e pelo `provision`.

function outsideRepo(path: string, flag: string): string {
  const full = resolve(path);
  if (!path) throw new StepError(`--${flag}=<arquivo FORA do repositório> obrigatório`);
  if (full.toLowerCase().startsWith(ROOT.toLowerCase())) throw new StepError(`--${flag} não pode ficar dentro do repositório`);
  return full;
}

async function secretsFile(): Promise<void> {
  const out = outsideRepo(arg("out") ?? "", "out");
  // `--reveal` é o mecanismo suportado do CLI para a secret completa (sem ele vem mascarada).
  const r = await run(["bunx", SUPABASE_CLI, "projects", "api-keys", "--reveal", "--project-ref", IVO_STAGING_TARGET.projectRef, "-o", "json"], { timeoutMs: 90_000 });
  if (r.code !== 0 || r.timedOut) throw new StepError("Supabase CLI sem acesso às chaves do projeto de staging");
  const keys = JSON.parse(r.out) as Array<{ name?: string; type?: string; api_key?: string }>;
  const secret = keys.find((k) => k.type === "secret")?.api_key ?? keys.find((k) => k.name === "service_role")?.api_key;
  if (!secret) throw new StepError("chave de servidor não encontrada para o projeto de staging");
  if (/[^\x21-\x7e]/.test(secret) || secret.includes("···") || secret.includes("...")) throw new StepError("a chave de servidor veio mascarada — não gravada");
  writeFileSync(out, JSON.stringify({ SUPABASE_SERVICE_ROLE_KEY: secret }), { mode: 0o600 });
  console.log(`  ok   secrets file gravado fora do repositório (${out}); valor não exibido`);
}

// ── provision ───────────────────────────────────────────────────────────────
// Executa scripts/ivo-provision-fictitious-orgs.ts com o ambiente canônico de
// staging num processo filho (mesma construção do build + o secret do arquivo
// privado). Sem --apply, só valida o plano.

async function provision(): Promise<void> {
  const secretsPath = arg("secrets-file");
  const { key } = await resolvePublishableKey(console.log);
  const env = buildEnvironment(process.env as Record<string, string | undefined>, key);
  for (const name of ["IVO_STAGING_ALFA_ADMIN_EMAIL", "IVO_STAGING_ALFA_MEMBER_EMAIL", "IVO_STAGING_BETA_ADMIN_EMAIL"]) {
    const v = process.env[name];
    if (v) env[name] = v;
  }
  const sensitive = [key];
  if (secretsPath && existsSync(secretsPath)) {
    const secret = (JSON.parse(readFileSync(secretsPath, "utf8")) as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY;
    if (secret) {
      env.SUPABASE_SERVICE_ROLE_KEY = secret;
      sensitive.push(secret);
    }
  }
  const args = ["run", "scripts/ivo-provision-fictitious-orgs.ts", `--target-ref=${IVO_STAGING_TARGET.projectRef}`];
  for (const flag of ["out", "secrets-out"]) {
    const v = arg(flag);
    if (v) args.push(`--${flag}=${outsideRepo(v, flag)}`);
  }
  if (process.argv.includes("--apply")) args.push("--apply");
  const r = await run(["bun", ...args], { env, timeoutMs: 1_800_000 });
  console.log(sanitizeLog(`${r.out}\n${r.err}`.trim(), sensitive));
  if (r.code !== 0) throw new StepError(`provisionamento ${process.argv.includes("--apply") ? "falhou" : "recusou o plano"} (exit ${r.code})`);
}

// ── preflight ───────────────────────────────────────────────────────────────
// Roda as verificações de scripts/ivo-staging/preflight.sql (somente SELECT)
// pelo Supabase CLI autenticado (`db query --linked --project-ref`) e compara
// a impressão digital do ledger remoto com a do arquivo do repositório:
//   AUSENTE · VERSÃO_DO_REPO · DIVERGENTE — idempotência não justifica reaplicar.

const LEDGER_FINGERPRINT_SQL = `SELECT p.proname AS fn, md5(regexp_replace(p.prosrc, '\\s+', ' ', 'g')) AS body_md5
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname IN ('create_action_plan','set_action_item_accountability','activate_action_plan','record_action_event','record_evidence')
 ORDER BY 1;`;

/** md5 dos corpos das 5 RPCs do ledger 20260705100000, normalizados (whitespace). */
export const LEDGER_REPO_BODY_MD5: Record<string, string> = {
  activate_action_plan: "2989bd436df1c21c7f119613de154657",
  create_action_plan: "07e18a35ccd964f895498b2066bc3c00",
  record_action_event: "9f37f2553ba5528291bd16c7f9447412",
  record_evidence: "c19fac493371a8ebb4962901656505a8",
  set_action_item_accountability: "f7c528fc36f316e449d90bb99c8a9ead",
};

async function remoteQuery(sql: string): Promise<Array<Record<string, unknown>>> {
  const dir = join(process.env.TEMP ?? process.env.TMPDIR ?? "/tmp", `ivo-preflight-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "q.sql");
  writeFileSync(file, sql);
  const r = await run(
    ["bunx", SUPABASE_CLI, "db", "query", "--linked", "--project-ref", IVO_STAGING_TARGET.projectRef, "--workdir", dir, "-f", file, "--output-format", "json"],
    { timeoutMs: 180_000 },
  );
  if (r.code !== 0 || r.timedOut) throw new StepError(`consulta somente leitura ao staging falhou (exit ${r.code}${r.timedOut ? ", timeout" : ""})`);
  return JSON.parse(r.out) as Array<Record<string, unknown>>;
}

async function preflight(): Promise<void> {
  const sql = readFileSync(join(ROOT, "scripts", "ivo-staging", "preflight.sql"), "utf8").replace(/\r\n/g, "\n");
  const start = sql.indexOf("WITH\n");
  const end = sql.indexOf("check_name;", start) + "check_name;".length;
  if (start < 0 || end <= start) throw new StepError("preflight.sql com formato inesperado");
  const rows = await remoteQuery(sql.slice(start, end));
  const by = (s: string) => rows.filter((r) => r.state === s);
  for (const r of [...by("FAIL"), ...by("MISSING")]) console.log(`  ${String(r.state).padEnd(7)} ${r.check_name} — ${r.detail}`);
  console.log(`  checks: PASS=${by("PASS").length} MISSING=${by("MISSING").length} FAIL=${by("FAIL").length}`);

  const fp = await remoteQuery(LEDGER_FINGERPRINT_SQL);
  const states = Object.entries(LEDGER_REPO_BODY_MD5).map(([fn, md5]) => {
    const remote = fp.find((r) => r.fn === fn)?.body_md5;
    const r6 = fn === "create_action_plan" && rows.some((x) => x.check_name === "R6 create_action_plan validates provenance" && x.state === "PASS");
    return { fn, state: remote === undefined ? "AUSENTE" : remote === md5 ? "VERSÃO_DO_REPO" : r6 ? "VERSÃO_R6" : "DIVERGENTE" };
  });
  for (const s of states) console.log(`  ledger ${s.fn}: ${s.state}`);
  const ledger = states.every((s) => s.state === "AUSENTE")
    ? "AUSENTE → aplicar 20260705100000 e depois 20261002120000"
    : states.some((s) => s.state === "DIVERGENTE")
      ? "DIVERGENTE → PARAR (não aplicar nada por cima)"
      : states.some((s) => s.state === "AUSENTE")
        ? "PARCIAL → PARAR"
        : "PRESENTE → NÃO reaplicar 20260705100000";
  console.log(`  decisão do ledger: ${ledger}`);
  if (by("FAIL").length > 0 || ledger.includes("PARAR")) throw new StepError("preflight bloqueia o rollout");
}

// ── snapshot-extract ────────────────────────────────────────────────────────
// Prepara a restauração SELETIVA do ledger a partir de um snapshot `--via-cli`
// (SQL plano). NÃO restaura nada: grava ledger-restore.sql (só blocos COPY das
// tabelas pedidas, padrão: as 4 do ledger) ao lado do snapshot, com SHA-256.
// Aplicar em staging exige decisão específica; o ensaio é num banco descartável.

const LEDGER_TABLES = ["action_plans", "action_items", "evidence_records", "action_log"];

async function snapshotExtract(): Promise<void> {
  const dir = resolve(arg("snapshot") ?? "");
  if (!arg("snapshot") || !existsSync(join(dir, "data-public.sql"))) throw new StepError("--snapshot=<diretório de um snapshot --via-cli> inválido");
  const tables = (arg("tables") ?? LEDGER_TABLES.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
  const { extractCopyBlocks } = await import("./ivo-staging/package-lib");
  const r = extractCopyBlocks(readFileSync(join(dir, "data-public.sql"), "utf8"), tables);
  const out = join(dir, "ledger-restore.sql");
  writeFileSync(out, r.sql);
  console.log(`  ok   ${out} · linhas por tabela ${JSON.stringify(r.rows)}${r.absent.length ? ` · sem bloco (0 linhas): ${r.absent.join(",")}` : ""} · sha256 ${sha256File(out)}`);
}

// ── edge-check ──────────────────────────────────────────────────────────────
// Prova, SEM credencial, que o Access cobre o hostname novo antes da versão
// funcional: página, server function, asset e rota IVO precisam redirecionar
// para *.cloudflareaccess.com. O 403 do bootstrap selado NÃO conta como Access.

const EDGE_PATHS = ["/", "/ivo-integral", "/ivo-integral/q2", "/_serverFn/" + "0".repeat(64), "/assets/probe.js", "/favicon.ico", "/entrar"];

async function edgeCheck(): Promise<void> {
  // --worker-url só para controle positivo (ex.: Worker histórico já protegido).
  const base = (arg("worker-url") ?? workerUrl()).replace(/\/$/, "");
  if (!/^https:\/\/[a-z0-9-]+\.pesquisafib\.workers\.dev$/.test(base)) throw new StepError("--worker-url fora da conta workers.dev conhecida");
  let ok = true;
  for (const path of EDGE_PATHS) {
    const res = await fetch(base + path, { redirect: "manual" });
    await res.arrayBuffer();
    const location = res.headers.get("location") ?? "";
    let host = "";
    try {
      host = location ? new URL(location, base).hostname : "";
    } catch {
      host = "";
    }
    const access = (res.status === 302 || res.status === 303) && host.endsWith(".cloudflareaccess.com");
    ok &&= access;
    console.log(`  ${access ? "ok  " : "FAIL"} ${path} → ${res.status}${host ? ` (${host.endsWith(".cloudflareaccess.com") ? "<team>.cloudflareaccess.com" : host})` : ""}`);
  }
  if (!ok) throw new StepError("Cloudflare Access não cobre todos os caminhos do Worker — NÃO implantar a versão funcional");
  console.log("  ok   todos os caminhos exigem Access");
}

// ── main ────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const command = process.argv[2] ?? "build";
  try {
    if (command === "build") await build();
    else if (command === "finalize") await finalize();
    else if (command === "snapshot") await snapshot();
    else if (command === "secrets-file") await secretsFile();
    else if (command === "provision") await provision();
    else if (command === "preflight") await preflight();
    else if (command === "edge-check") await edgeCheck();
    else if (command === "snapshot-extract") await snapshotExtract();
    else throw new StepError(`comando desconhecido: ${command}. Use build | finalize | snapshot | secrets-file | provision.`);
  } catch (error) {
    const code = error instanceof StepError ? error.code : 2;
    console.error(`\n❌ ${sanitizeLog((error as Error).message, [process.env.IVO_STAGING_PUBLISHABLE_KEY ?? "", process.env.STAGING_DB_URL ?? ""])}`);
    process.exit(code);
  }
}
