#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// PROVA DE INTEGRAÇÃO LOCAL DA JORNADA IVO (R5/R6)
// ═══════════════════════════════════════════════════════════════════════════
//
// Roda o código de SERVIDOR real (authorizeIvoSession, leitor FIB-T, ledger)
// contra o Supabase LOCAL da demonstração, com sessões REAIS emitidas pelo
// GoTrue local para usuários fictícios de duas organizações. Também ataca o
// PostgREST diretamente com o JWT de cada papel para provar RLS e ACL.
//
// Duas fases em PROCESSOS SEPARADOS: `write` cria e registra; `read` (novo
// processo, sem nenhum estado em memória) relê tudo do banco — é a prova de
// persistência "após recarregar".
//
// Pré-requisito: bun run demo:ivo:setup. Nunca toca host remoto: o ambiente
// é lido de .ivo-demo.local/demo.env e verificado como loopback antes de tudo.
//
// Uso: bun run demo:ivo:proof

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isLocalUrl } from "../src/lib/env/environment-contract";

const ROOT = process.cwd();
const WORKDIR = join(ROOT, ".ivo-demo.local");
const ENV_FILE = join(WORKDIR, "demo.env");
const USERS_FILE = join(WORKDIR, "demo-users.json");
const STATE_FILE = join(WORKDIR, "proof-state.json");
const DB_CONTAINER = "supabase_db_vitalos-ivo-local";

const ORG_ALFA = "d1000000-0000-4000-8000-000000000001";
const ORG_BETA = "d2000000-0000-4000-8000-000000000001";
const WAVE_ALFA = "d1000000-0000-4000-8000-0000000000a0";
const WAVE_BETA = "d2000000-0000-4000-8000-0000000000b0";
const COHORT = {
  operacoes: "d1000000-0000-4000-8000-0000000000c1",
  atendimento: "d1000000-0000-4000-8000-0000000000c2",
  logistica: "d1000000-0000-4000-8000-0000000000c3",
  producao: "d2000000-0000-4000-8000-0000000000c1",
};

// ── Ambiente local verificado ANTES de importar qualquer módulo de servidor ──
if (!existsSync(ENV_FILE)) {
  console.error("❌ Ambiente local ausente. Rode: bun run demo:ivo:setup");
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(ENV_FILE, "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
if (!isLocalUrl(env.SUPABASE_URL ?? "") || !isLocalUrl(env.VITE_SUPABASE_URL ?? "")) {
  console.error("❌ O ambiente da demonstração não aponta para loopback. Abortado.");
  process.exit(1);
}
for (const [k, v] of Object.entries(env)) process.env[k] = v;
delete process.env.VITE_FIBT_HML_ENABLED;
delete process.env.FIBT_HML_DEPLOYMENT_ENABLED;

const API = env.SUPABASE_URL!;
const ANON = env.SUPABASE_PUBLISHABLE_KEY!;
const users = JSON.parse(readFileSync(USERS_FILE, "utf8")) as Array<{ key: string; email: string; password: string }>;

const results: Array<{ id: string; ok: boolean; detail?: string }> = [];
function check(id: string, ok: boolean, detail?: string): void {
  results.push({ id, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${id}${!ok && detail ? ` — ${detail}` : ""}`);
}

async function signIn(key: string): Promise<string> {
  const user = users.find((u) => u.key === key)!;
  const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  if (!res.ok) throw new Error(`login ${key} HTTP ${res.status}`);
  return String(((await res.json()) as { access_token: string }).access_token);
}

async function rest(path: string, token: string | null, init: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${API}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* corpo não-JSON */
  }
  return { status: res.status, body };
}

async function psql(sql: string): Promise<string> {
  const proc = Bun.spawn(
    ["docker", "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-X", "-tA", "-f", "-"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(sql);
  await proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  if ((await proc.exited) !== 0) throw new Error(err.trim());
  return out.trim();
}

// ── Fase WRITE ───────────────────────────────────────────────────────────────

async function writePhase(): Promise<void> {
  const { loadIvoQ2ReadingForSession } = await import("../src/lib/ivo/ivo-q2-reading.server");
  const loop = await import("../src/lib/ivo/fibt-action-loop.server");
  const { buildIvoMatrix } = await import("../src/engine/ivo/ivo-matrix");
  const { ivoDimensionsForPack, ivoLensCatalog } = await import("../src/domain/ivo/lens-catalog");
  const { getDimensionMappings } = await import("../src/domain/ivo/dimension-mappings");
  const { resolveServerCapability } = await import("../src/lib/capabilities/local-fixture-capabilities.server");
  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");

  // Execução repetível: limpa SÓ o ledger das orgs fictícias deste stack local.
  await psql(`
    DELETE FROM public.action_log WHERE org_id IN ('${ORG_ALFA}','${ORG_BETA}');
    DELETE FROM public.evidence_records WHERE org_id IN ('${ORG_ALFA}','${ORG_BETA}');
    DELETE FROM public.action_items WHERE org_id IN ('${ORG_ALFA}','${ORG_BETA}');
    DELETE FROM public.action_plans WHERE org_id IN ('${ORG_ALFA}','${ORG_BETA}');`);

  const alfa = await signIn("alfa_admin");
  const beta = await signIn("beta_admin");
  const membro = await signIn("alfa_membro");
  const startedAt = new Date().toISOString();

  console.log("\n── 1 · Leitura Q2 autorizada (R5) ──");
  const pendingBefore = await psql(`SELECT COUNT(*) FROM public.cohort_capsules WHERE cohort_id = '${COHORT.atendimento}' AND item_means IS NOT NULL;`);

  const a = await loadIvoQ2ReadingForSession({ accessToken: alfa });
  const ready = a.ok && a.state === "ready" ? a.view : null;
  check("R5.1 admin Alfa lê a leitura Q2 da própria organização", !!ready && ready.organizationName === "Organização Fictícia Alfa");
  const byKey = Object.fromEntries((ready?.sectors ?? []).map((s) => [s.key, s]));
  check("R5.2 Operações publicada com fatores (0–4) e contagem publicada", byKey.operacoes?.group === "available" && byKey.operacoes.factors?.length === 3 && byKey.operacoes.countLabel === "9");
  check("R5.3 Atendimento (n≥5, sem lote publicado) = publicação pendente, sem número", byKey.atendimento?.group === "pending_publication" && byKey.atendimento.factors === null && byKey.atendimento.countLabel === "protegida");
  check("R5.4 Logística e Financeiro (<5) = suprimidos com rótulo <5", byKey.logistica?.group === "suppressed" && byKey.financeiro?.group === "suppressed" && byKey.logistica.countLabel === "<5" && byKey.financeiro.countLabel === "<5");
  check("R5.5 Comercial (0 respostas, onda em coleta) = em coleta, nunca zero", byKey.comercial?.group === "collecting" && byKey.comercial.factors === null);
  check("R5.6 versões metodológica e de cálculo presentes", ready?.methodology.waveInstrumentVersion === "1.0.0" && ready?.methodology.calculationVersion === "fibt-manifest/1.0.0" && ready?.methodology.kMin === 5);
  const serialized = JSON.stringify(a);
  check("R5.7 resposta não carrega respostas individuais, links nem dados da Beta", !/answers|tokenHash|Produção|Qualidade/.test(serialized));
  const pendingAfter = await psql(`SELECT COUNT(*) FROM public.cohort_capsules WHERE cohort_id = '${COHORT.atendimento}' AND item_means IS NOT NULL;`);
  check("R5.8 a leitura IVO não avança a publicação protegida", pendingBefore === "0" && pendingAfter === "0");

  const b = await loadIvoQ2ReadingForSession({ accessToken: beta });
  const bview = b.ok && b.state === "ready" ? b.view : null;
  check("R5.9 Beta inteira protegida (supressão complementar), sem número", bview?.overall === "protected" && (bview?.sectors ?? []).every((s) => s.factors === null && !/^\d+$/.test(s.countLabel)));
  const cross = await loadIvoQ2ReadingForSession({ accessToken: beta, waveId: WAVE_ALFA });
  check("R5.10 admin Beta não lê a onda da Alfa por id escolhido", !cross.ok && cross.category === "validation" && !JSON.stringify(cross).includes("Operações"));
  const noSession = await loadIvoQ2ReadingForSession({});
  const badSession = await loadIvoQ2ReadingForSession({ accessToken: "token-forjado-invalido-123" });
  check("R5.11 sessão ausente/inválida falha sem expor dados", !noSession.ok && noSession.category === "unauthenticated" && !badSession.ok && badSession.category === "unauthenticated");
  const memberRead = await loadIvoQ2ReadingForSession({ accessToken: membro });
  check("R5.12 membro sem papel administrativo é recusado", !memberRead.ok && memberRead.category === "forbidden");

  if (ready) {
    const matrix = buildIvoMatrix({
      organizationId: ready.reading.organizationId,
      dimensions: ivoDimensionsForPack("enterprise"),
      lenses: ivoLensCatalog(),
      readings: [ready.reading],
      mappings: getDimensionMappings(),
    });
    const fibtCells = matrix.rows.map((r) => r.cells.find((c) => c.lens === "fibt")!);
    check("R5.13 matriz funciona com mapeamentos pendentes (resultado disponível, dimensão pendente)", fibtCells.every((c) => c.resultState === "available" && c.mapping === "none" && c.evidence.length === 0));
  }

  console.log("\n── 2 · Ciclo de ação sobre o ledger (R6) ──");
  check("R6.0 capability ACTION_PLAN ligada só como fixture local", JSON.stringify(resolveServerCapability("ACTION_PLAN")) === JSON.stringify({ enabled: true, source: "local_fixture" }));

  const priority = { cohortId: COHORT.operacoes, factorId: "bem_estar", title: "Rodas de conversa sobre carga de trabalho", description: "Quatro encontros quinzenais.", effort: "medio" as const };
  const suppressedSrc = await loop.createFibtPriorityActions({ accessToken: alfa, waveId: WAVE_ALFA, priorities: [{ ...priority, cohortId: COHORT.logistica }] });
  const pendingSrc = await loop.createFibtPriorityActions({ accessToken: alfa, waveId: WAVE_ALFA, priorities: [{ ...priority, cohortId: COHORT.atendimento }] });
  check("R6.1 setor suprimido e setor com publicação pendente não embasam ação", suppressedSrc.ok && !suppressedSrc.accepted && suppressedSrc.reason === "source_not_published" && pendingSrc.ok && !pendingSrc.accepted && pendingSrc.reason === "source_not_published");
  const betaForeignWave = await loop.createFibtPriorityActions({ accessToken: beta, waveId: WAVE_ALFA, priorities: [priority] });
  const betaForeignCohort = await loop.createFibtPriorityActions({ accessToken: beta, waveId: WAVE_BETA, priorities: [priority] });
  check("R6.2 Beta não cria ação com onda ou coorte da Alfa", !betaForeignWave.ok && betaForeignWave.category === "validation" && betaForeignCohort.ok && !betaForeignCohort.accepted);

  // Bypass simulado de bug no servidor: a RPC real, como service_role, com a
  // organização da Beta citando a onda/coorte da Alfa. O banco recusa.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  const forged = await admin.rpc("create_action_plan", {
    p_org_id: ORG_BETA,
    p_cycle_key: "2026-T2",
    p_season_name: "ataque",
    p_source_capsule_id: null,
    p_created_by: users.find((u) => u.key === "beta_admin") ? (await admin.auth.getUser(beta)).data.user.id : null,
    p_items: [{ rank: 1, lever_id: "x", title: "x", effort: "baixo", start_week: 1, end_week: 1, milestone_week: 1, weeks_budget: 1, source_lens_id: "fibt", source_wave_id: WAVE_ALFA, source_cohort_id: COHORT.operacoes, source_factor_id: "bem_estar" }],
  });
  const forgedRow = Array.isArray(forged.data) ? forged.data[0] : forged.data;
  check("R6.3 banco recusa proveniência entre organizações mesmo via service_role", forgedRow?.accepted === false && forgedRow?.reason === "provenance_cross_tenant_denied");

  const created = await loop.createFibtPriorityActions({ accessToken: alfa, waveId: WAVE_ALFA, priorities: [priority] });
  check("R6.4 admin Alfa cria a ação a partir de Operações publicada", created.ok && created.accepted === true);
  const first = await loop.loadFibtActionLoop({ accessToken: alfa });
  const action = first.ok ? first.plans[0]?.actions[0] : undefined;
  check("R6.5 ação guarda origem FIB-T (versão e publicação derivadas do banco) e ciclo canônico", !!action && first.ok && first.plans[0]!.cycleKeyCanonical === "2026-T2" && action.source.instrumentVersion === "1.0.0" && action.source.cohortLabel === "Operações" && !!action.source.publishedAt && action.dimension.status === "mapping_pending");
  if (!action || !first.ok) throw new Error("sem ação criada");

  const acc = await loop.setFibtActionAccountability({ accessToken: alfa, itemId: action.id, ownerRoleLabel: "Coordenação de Operações", dueOn: "2026-09-30", executionMetric: { label: "Encontros realizados", baseline: 0, target: 4, unit: "encontros" } });
  const act = await loop.activateFibtActionPlan({ accessToken: alfa, planId: action.planId });
  const st = await loop.recordFibtActionStatus({ accessToken: alfa, itemId: action.id, toStatus: "em_execucao" });
  const ev = await loop.recordFibtActionEvidence({ accessToken: alfa, itemId: action.id, scope: "execucao", kind: "texto", content: "Ata do 1º encontro (sem nomes)", occurredOn: "2026-06-12" });
  const lr = await loop.recordFibtActionEvidence({ accessToken: alfa, itemId: action.id, scope: "aprendizagem", content: "Horário após o turno teve mais adesão", occurredOn: "2026-06-26" });
  check("R6.6 responsável, prazo, ativação, estado, evidência e aprendizagem gravados", [acc, act, st, ev, lr].every((r) => r.ok && r.accepted));
  const badTransition = await loop.recordFibtActionStatus({ accessToken: alfa, itemId: action.id, toStatus: "em_vigilancia" });
  check("R6.7 transição inválida recusada a partir do estado real", badTransition.ok && !badTransition.accepted && badTransition.reason === "invalid_transition");

  console.log("\n── 3 · Isolamento entre organizações ──");
  const betaLoop = await loop.loadFibtActionLoop({ accessToken: beta });
  check("R6.8 Beta não lê ações nem evidências da Alfa (servidor)", betaLoop.ok && betaLoop.plans.length === 0);
  const betaWrites = await Promise.all([
    loop.setFibtActionAccountability({ accessToken: beta, itemId: action.id, ownerRoleLabel: "Invasor", dueOn: "2026-09-30", executionMetric: { label: "x", baseline: 0, target: 1, unit: "" } }),
    loop.recordFibtActionStatus({ accessToken: beta, itemId: action.id, toStatus: "concluida" }),
    loop.recordFibtActionEvidence({ accessToken: beta, itemId: action.id, scope: "execucao", content: "forjada", occurredOn: "2026-06-01" }),
    loop.activateFibtActionPlan({ accessToken: beta, planId: action.planId }),
  ]);
  check("R6.9 Beta não altera ação, plano ou evidência da Alfa (servidor)", betaWrites.every((r) => r.ok && !r.accepted && (r.reason === "item_not_found" || r.reason === "plan_not_found")));

  const restBetaItems = await rest(`/action_items?org_id=eq.${ORG_ALFA}&select=id`, beta);
  const restBetaEvidence = await rest(`/evidence_records?org_id=eq.${ORG_ALFA}&select=id`, beta);
  const restAlfaItems = await rest(`/action_items?org_id=eq.${ORG_ALFA}&select=id,source_lens_id`, alfa);
  check("R6.10 RLS via PostgREST: JWT da Beta lê 0 linhas da Alfa; JWT da Alfa lê as suas", Array.isArray(restBetaItems.body) && (restBetaItems.body as unknown[]).length === 0 && Array.isArray(restBetaEvidence.body) && (restBetaEvidence.body as unknown[]).length === 0 && Array.isArray(restAlfaItems.body) && (restAlfaItems.body as unknown[]).length === 1);
  const restInsert = await rest("/evidence_records", beta, { method: "POST", body: JSON.stringify({ org_id: ORG_ALFA, item_id: action.id, lever_id: "x", evidence_kind: "texto", content_ref: "forjada", occurred_on: "2026-06-01", recorded_by: "00000000-0000-4000-8000-000000000000" }) });
  const restUpdate = await rest(`/action_items?id=eq.${action.id}`, alfa, { method: "PATCH", body: JSON.stringify({ title: "alterado direto" }) });
  const restRpc = await rest("/rpc/record_evidence", alfa, { method: "POST", body: JSON.stringify({ p_item_id: action.id, p_evidence_kind: "texto", p_content_ref: "direto", p_source_kind: "direct", p_consent_ref: null, p_occurred_on: "2026-06-01", p_recorded_by: null, p_actor_role_label: "x" }) });
  check("R6.11 escrita direta e RPC do ledger negadas a authenticated (até para a org dona)", [restInsert.status, restUpdate.status, restRpc.status].every((s) => s === 401 || s === 403 || s === 404));
  const restAnon = await rest(`/action_items?select=id`, null);
  check("R6.12 anon não lê o ledger", restAnon.status === 401 || (Array.isArray(restAnon.body) && (restAnon.body as unknown[]).length === 0));
  const capsuleRead = await rest(`/cohort_capsules?select=item_means`, alfa);
  check("R6.13 nenhum papel de cliente lê cohort_capsules diretamente", capsuleRead.status === 401 || capsuleRead.status === 403 || capsuleRead.status === 404);

  console.log("\n── 4 · Privacidade ──");
  const ledgerJson = await psql(`SELECT COALESCE(json_agg(t), '[]')::TEXT FROM (
      SELECT row_to_json(i)::TEXT AS r FROM public.action_items i WHERE org_id = '${ORG_ALFA}'
      UNION ALL SELECT row_to_json(e)::TEXT FROM public.evidence_records e WHERE org_id = '${ORG_ALFA}'
      UNION ALL SELECT row_to_json(l)::TEXT FROM public.action_log l WHERE org_id = '${ORG_ALFA}') t;`);
  const responseIds = (await psql(`SELECT string_agg(id::TEXT, ',') FROM public.wave_responses WHERE wave_id = '${WAVE_ALFA}';`)).split(",");
  const means = (ready?.sectors ?? []).flatMap((s) => s.factors ?? []).map((f) => String(f.mean)).filter((m) => m.includes("."));
  check("R6.14 ledger não contém ids de resposta individual", responseIds.every((id) => !ledgerJson.includes(id)));
  check("R6.15 ledger não copia médias publicadas nem respostas", means.every((m) => !ledgerJson.includes(m)) && !ledgerJson.includes("answers") && !ledgerJson.includes("item_means"));
  const opsJson = await psql(`SELECT COALESCE(json_agg(o), '[]')::TEXT FROM public.ops_events o WHERE created_at >= '${startedAt}';`).catch(() => "[]");
  check("R6.16 eventos operacionais do período não carregam token nem resposta", !opsJson.includes(alfa) && !opsJson.includes(beta) && !opsJson.includes("answers"));

  writeFileSync(STATE_FILE, JSON.stringify({ itemId: action.id, planId: action.planId }));
}

// ── Fase READ (processo novo) ───────────────────────────────────────────────

async function readPhase(): Promise<void> {
  const loop = await import("../src/lib/ivo/fibt-action-loop.server");
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as { itemId: string; planId: string };
  const alfa = await signIn("alfa_admin");
  const beta = await signIn("beta_admin");

  console.log("\n── 5 · Persistência após recarregar (processo novo) ──");
  const reloaded = await loop.loadFibtActionLoop({ accessToken: alfa });
  const action = reloaded.ok ? reloaded.plans.flatMap((p) => p.actions).find((a) => a.id === state.itemId) : undefined;
  check("P.1 ação reaparece com estado, responsável e prazo", !!action && action.status === "em_execucao" && action.owner?.roleLabel === "Coordenação de Operações" && action.dueOn === "2026-09-30");
  check("P.2 evidência de execução e aprendizagem reaparecem separadas", !!action && action.evidence.execution.length === 1 && action.evidence.learning.length === 1);
  check("P.3 eficácia continua não avaliada; dimensão continua pendente", !!action && action.efficacy.status === "not_evaluated" && action.dimension.status === "mapping_pending");
  const plan = reloaded.ok ? reloaded.plans.find((p) => p.id === state.planId) : undefined;
  check("P.4 plano ativo no ciclo canônico 2026-T2", plan?.status === "active" && plan.cycleKeyCanonical === "2026-T2");
  const betaView = await loop.loadFibtActionLoop({ accessToken: beta });
  check("P.5 Beta continua sem ver nada da Alfa", betaView.ok && betaView.plans.length === 0);
}

const phase = process.argv[2];
try {
  if (phase === "write") await writePhase();
  else if (phase === "read") await readPhase();
  else {
    // Orquestra as duas fases em processos separados.
    console.log("PROVA DE INTEGRAÇÃO LOCAL — jornada IVO R5/R6 (Supabase local, sessões reais)");
    for (const p of ["write", "read"]) {
      const proc = Bun.spawn([process.execPath, join(ROOT, "scripts", "ivo-local-journey-proof.ts"), p], {
        stdout: "inherit",
        stderr: "inherit",
      });
      if ((await proc.exited) !== 0) {
        console.error(`\n❌ fase ${p} falhou`);
        process.exit(1);
      }
    }
    console.log("\n✅ PROVA LOCAL OK — duas fases, processos separados");
    process.exit(0);
  }
} catch (error) {
  check(`exceção na fase ${phase}`, false, (error as Error).message);
}

const failed = results.filter((r) => !r.ok);
console.log(`\nfase=${phase} · verificações=${results.length} · falhas=${failed.length}`);
process.exit(failed.length > 0 ? 1 : 0);
