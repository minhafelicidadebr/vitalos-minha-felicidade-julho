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
    { check: "nenhuma declaração HML ativa embutida", ok: [...client, ...server].every((x) => !x.s.includes("FIBT-ISG-HML-01")), detail: "lote HML ausente do bundle" },
  ];
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
  writeFileSync(join(pkg, "wrangler.app.json"), JSON.stringify(app, null, 2));
  writeFileSync(join(pkg, "wrangler.bootstrap.json"), JSON.stringify(bootstrap, null, 2));
  return {
    vars,
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
  if (!dryApp.ok || !dryBoot.ok) throw new StepError("dry-run do Wrangler falhou — ver evidence/dryrun-*.log");
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

async function snapshot(): Promise<void> {
  const outDir = resolve(arg("out-dir") ?? "");
  if (!arg("out-dir")) throw new StepError("--out-dir=<diretório do host FORA do repositório> obrigatório");
  if (outDir.toLowerCase().startsWith(ROOT.toLowerCase())) throw new StepError("--out-dir não pode ficar dentro do repositório");
  if (!process.env.STAGING_DB_URL) throw new StepError("STAGING_DB_URL ausente no ambiente (nunca passe a URL como argumento)");
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

// ── main ────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const command = process.argv[2] ?? "build";
  try {
    if (command === "build") await build();
    else if (command === "finalize") await finalize();
    else if (command === "snapshot") await snapshot();
    else throw new StepError(`comando desconhecido: ${command}. Use build | finalize | snapshot.`);
  } catch (error) {
    const code = error instanceof StepError ? error.code : 2;
    console.error(`\n❌ ${sanitizeLog((error as Error).message, [process.env.IVO_STAGING_PUBLISHABLE_KEY ?? "", process.env.STAGING_DB_URL ?? ""])}`);
    process.exit(code);
  }
}
