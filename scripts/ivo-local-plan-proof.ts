#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// PROVA DE INTEGRAÇÃO LOCAL · PI-13 — incluir ação em plano existente e encerrar plano
// ═══════════════════════════════════════════════════════════════════════════
//
// Roda o código de SERVIDOR real (sessão, ledger, composição do plano, C8) contra o
// Supabase LOCAL da demonstração, com sessões REAIS de duas organizações fictícias.
// Parte do estado deixado por `demo:ivo:proof` (plano ativo da Alfa com três ações e a
// história C8 já registrada) e prova, no banco:
//   · inclusão com origem publicada correta; repetição sem duplicar; duas ações parecidas;
//   · recusas: plano alheio, papel insuficiente, origem protegida, sem accountability;
//   · o BANCO recusa mesmo para service_role (organização, origem, §13, pendências);
//   · encerramento recusado com pendências, aceito com tudo em estado de saída, repetição
//     segura (nenhum evento novo), plano encerrado imutável;
//   · concorrência inclusão × encerramento, nas duas ordens, com DUAS sessões SQL reais e
//     travas observadas (plano de teste descartável), e uma corrida pelo servidor no plano real;
//   · persistência: a fase `read` roda em PROCESSO NOVO e relê tudo do banco;
//   · o histórico C8 (protocolos, observações, pareceres) fica byte a byte igual e a
//     avaliação segue possível depois do encerramento.
//
// Pré-requisito: bun run demo:ivo:proof (estado da jornada + C8). Nunca toca host remoto:
// o ambiente é lido de .ivo-demo.local/demo.env e verificado como loopback antes de tudo.
//
// Uso: bun run demo:ivo:proof:plan   (orquestra write → read em processos separados)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isLocalUrl } from "../src/lib/env/environment-contract";

const ROOT = process.cwd();
const WORKDIR = join(ROOT, ".ivo-demo.local");
const ENV_FILE = join(WORKDIR, "demo.env");
const USERS_FILE = join(WORKDIR, "demo-users.json");
const MANIFEST_FILE = join(WORKDIR, "demo-manifest.json");
const JOURNEY_STATE = join(WORKDIR, "proof-state.json");
const C8_STATE = join(WORKDIR, "proof-c8-state.json");
const PLAN_STATE = join(WORKDIR, "proof-plan-state.json");
const DB_CONTAINER = "supabase_db_vitalos-ivo-local";

for (const f of [ENV_FILE, USERS_FILE, MANIFEST_FILE, JOURNEY_STATE, C8_STATE]) {
  if (!existsSync(f)) {
    console.error(`❌ ${f} ausente. Rode: bun run demo:ivo:setup && bun run demo:ivo:proof`);
    process.exit(1);
  }
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

const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8")) as {
  orgs: Record<"alfa" | "beta", { orgId: string; waveId: string; cohorts: Record<string, { cohortId: string }> }>;
};
const ORG_ALFA = manifest.orgs.alfa.orgId;
const ORG_BETA = manifest.orgs.beta.orgId;
const WAVE_ALFA = manifest.orgs.alfa.waveId;
const WAVE_BETA = manifest.orgs.beta.waveId;
const COHORT = {
  operacoes: manifest.orgs.alfa.cohorts.operacoes!.cohortId,
  atendimento: manifest.orgs.alfa.cohorts.atendimento!.cohortId,
  logistica: manifest.orgs.alfa.cohorts.logistica!.cohortId,
  producao: manifest.orgs.beta.cohorts.producao!.cohortId,
};
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
    headers: { apikey: ANON, ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", ...(init.headers ?? {}) },
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
const rowsOf = (r: { body: unknown }): unknown[] => (Array.isArray(r.body) ? r.body : []);
const denied = (status: number) => status === 401 || status === 403 || status === 404;

function sessionOf(sql: string) {
  const startedAt = Date.now();
  const proc = Bun.spawn(
    ["docker", "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-X", "-tA", "-f", "-"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(sql);
  void proc.stdin.end();
  const done = (async () => {
    const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    const code = await proc.exited;
    return { code, out: out.trim(), err: err.trim(), elapsedMs: Date.now() - startedAt };
  })();
  return { done };
}
async function psql(sql: string): Promise<string> {
  const r = await sessionOf(sql).done;
  if (r.code !== 0) throw new Error(r.err);
  return r.out;
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Colunas mínimas de uma ação FIB-T com origem publicada de Operações (Alfa). */
function itemInsertSql(opts: { id: string; planId: string; title: string; ownerId: string; requestId?: string }): string {
  const audit = opts.requestId ? `, add_request_id, added_by, added_by_role` : "";
  const auditValues = opts.requestId ? `, '${opts.requestId}', '${opts.ownerId}', 'RH_ADMIN'` : "";
  return `INSERT INTO public.action_items
    (id, plan_id, org_id, lever_id, title, effort, start_week, end_week, milestone_week, weeks_budget,
     owner_user_id, owner_role_label, due_on, metric_label, metric_baseline, metric_target, metric_unit,
     source_lens_id, source_wave_id, source_cohort_id, source_factor_id${audit})
    VALUES ('${opts.id}', '${opts.planId}', '${ORG_ALFA}', 'fibt:operacoes:bem_estar', '${opts.title}', 'baixo', 1, 13, 7, 13,
     '${opts.ownerId}', 'Gestão de pessoas', '2026-12-15', 'Entregas', 0, 1, 'entregas',
     'fibt', '${WAVE_ALFA}', '${COHORT.operacoes}', 'bem_estar'${auditValues});`;
}

const C8_CHECKSUM_SQL = `SELECT md5(
  COALESCE((SELECT string_agg(row_to_json(p)::TEXT, '|' ORDER BY p.id) FROM public.efficacy_protocols p WHERE p.org_id = '${ORG_ALFA}'), '') ||
  COALESCE((SELECT string_agg(row_to_json(o)::TEXT, '|' ORDER BY o.id) FROM public.efficacy_observations o WHERE o.org_id = '${ORG_ALFA}'), '') ||
  COALESCE((SELECT string_agg(row_to_json(v)::TEXT, '|' ORDER BY v.id) FROM public.efficacy_verdicts v WHERE v.org_id = '${ORG_ALFA}'), ''));`;
const C8_HISTORY_SQL = `SELECT md5(
  COALESCE((SELECT string_agg(row_to_json(o)::TEXT, '|' ORDER BY o.id) FROM public.efficacy_observations o WHERE o.org_id = '${ORG_ALFA}'), '') ||
  COALESCE((SELECT string_agg(row_to_json(v)::TEXT, '|' ORDER BY v.id) FROM public.efficacy_verdicts v WHERE v.org_id = '${ORG_ALFA}'), ''));`;

// ── Fase WRITE ───────────────────────────────────────────────────────────────

async function writePhase(): Promise<void> {
  const comp = await import("../src/lib/ivo/fibt-plan-composition.server");
  const loop = await import("../src/lib/ivo/fibt-action-loop.server");
  const eff = await import("../src/lib/ivo/efficacy-protocol.server");
  const { loadIvoQ2ReadingForSession } = await import("../src/lib/ivo/ivo-q2-reading.server");
  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  const journey = JSON.parse(readFileSync(JOURNEY_STATE, "utf8")) as { planId: string; byFactor: Record<string, string> };
  const c8 = JSON.parse(readFileSync(C8_STATE, "utf8")) as { A: string; B: string; C: string };
  const PLAN = journey.planId;
  const alfa = await signIn("alfa_admin");
  const beta = await signIn("beta_admin");
  const membro = await signIn("alfa_membro");
  const alfaUser = String((await admin.auth.getUser(alfa)).data.user.id);

  console.log("\n── 0 · Ponto de partida (estado deixado por demo:ivo:proof) ──");
  const start = await loop.loadFibtActionLoop({ accessToken: alfa });
  const plan0 = start.ok ? start.plans.find((p) => p.id === PLAN) : undefined;
  const statusOf = (id: string) => plan0?.actions.find((a) => a.id === id)?.status;
  check(
    "PI13.0 plano ativo da Alfa com 3 ações (A em execução · B concluída · C planejada) e composição disponível",
    plan0?.status === "active" && plan0.actions.length === 3 && plan0.composition === "available" && statusOf(c8.A) === "em_execucao" && statusOf(c8.B) === "concluida" && statusOf(c8.C) === "planejada",
  );
  const c8Before = await psql(C8_CHECKSUM_SQL);
  const effBefore = await eff.loadEfficacyForSession({ accessToken: alfa });
  const statesBefore = effBefore.ok ? Object.fromEntries(effBefore.items.map((i) => [i.itemId, i.state])) : {};
  check("PI13.0b história C8 presente (protocolos, observações, pareceres) e estados lidos", effBefore.ok && Object.keys(statesBefore).length >= 3 && c8Before.length === 32);

  const countItems = async (planId = PLAN) => Number(await psql(`SELECT COUNT(*) FROM public.action_items WHERE plan_id = '${planId}';`));
  const baseAdd = {
    accessToken: alfa,
    planId: PLAN,
    waveId: WAVE_ALFA,
    cohortId: COHORT.operacoes,
    factorId: "bem_estar",
    effort: "baixo" as const,
    accountability: { ownerRoleLabel: "Gestão de pessoas", dueOn: "2026-12-15", executionMetric: { label: "Oficinas realizadas", baseline: 0, target: 2, unit: "oficinas" } },
  };
  const R1 = crypto.randomUUID();
  const R2 = crypto.randomUUID();
  const R3 = crypto.randomUUID();

  console.log("\n── 1 · Incluir ação em plano existente ──");
  const addD = await comp.addFibtActionToPlan({ ...baseAdd, requestId: R1, title: "Oficina de pausas ativas", description: "Duas oficinas curtas por mês." });
  const idD = addD.ok && addD.accepted ? addD.id : null;
  check("PI13.1 ação incluída no plano ativo (origem Operações × Bem-Estar, accountability completa)", addD.ok && addD.accepted === true && !!idD);
  const afterD = await loop.loadFibtActionLoop({ accessToken: alfa });
  const viewD = afterD.ok ? afterD.plans.find((p) => p.id === PLAN)?.actions.find((a) => a.id === idD) : undefined;
  const dbD = await psql(`SELECT rank || '|' || status || '|' || source_instrument_version || '|' || (source_published_at = (SELECT published_at FROM public.cohort_capsules WHERE cohort_id = '${COHORT.operacoes}' AND item_means IS NOT NULL))::TEXT || '|' || (added_by = '${alfaUser}')::TEXT || '|' || added_by_role || '|' || (add_request_id = '${R1}')::TEXT FROM public.action_items WHERE id = '${idD}';`);
  check("PI13.2 banco: rank 4, planejada, versão e publicação DERIVADAS, autor e papel da sessão, chave de idempotência", dbD === "4|planejada|1.0.0|true|true|RH_ADMIN|true", dbD);
  check(
    "PI13.3 a leitura mostra a ação com origem por referência, 'incluída depois' (papel) e eficácia não avaliada",
    !!viewD && viewD.source.factorId === "bem_estar" && viewD.source.cohortLabel === "Operações" && viewD.addedLater?.byRole === "RH_ADMIN" && viewD.efficacy.status === "not_evaluated" && viewD.owner?.roleLabel === "Gestão de pessoas",
  );

  const repeat = await comp.addFibtActionToPlan({ ...baseAdd, requestId: R1, title: "Oficina de pausas ativas", description: "Duas oficinas curtas por mês." });
  check("PI13.4 repetir o MESMO pedido devolve a ação existente, sem duplicar", repeat.ok && repeat.accepted === true && repeat.replayed === true && repeat.id === idD && (await countItems()) === 4);
  const conflict = await comp.addFibtActionToPlan({ ...baseAdd, requestId: R1, title: "Outro título totalmente diferente", description: "x" });
  check("PI13.5 a mesma chave com outro conteúdo é conflito, nada gravado", conflict.ok && !conflict.accepted && conflict.reason === "request_conflict" && (await countItems()) === 4);
  const addE = await comp.addFibtActionToPlan({ ...baseAdd, requestId: R2, title: "Oficina de pausas ativas", description: "Duas oficinas curtas por mês." });
  const idE = addE.ok && addE.accepted ? addE.id : null;
  check("PI13.6 mesmo conteúdo com pedido DISTINTO vira segunda ação (ações parecidas coexistem)", addE.ok && addE.accepted === true && !addE.replayed && !!idE && idE !== idD && (await countItems()) === 5);
  const [par1, par2] = await Promise.all([
    comp.addFibtActionToPlan({ ...baseAdd, requestId: R3, title: "Mural de reconhecimento", description: "Painel mensal." }),
    comp.addFibtActionToPlan({ ...baseAdd, requestId: R3, title: "Mural de reconhecimento", description: "Painel mensal." }),
  ]);
  const idF = par1.ok && par1.accepted ? par1.id : null;
  check(
    "PI13.7 dois envios SIMULTÂNEOS do mesmo pedido resultam em UMA ação no banco",
    par1.ok && par1.accepted && par2.ok && par2.accepted && par1.id === par2.id && (await psql(`SELECT COUNT(*) FROM public.action_items WHERE plan_id = '${PLAN}' AND add_request_id = '${R3}';`)) === "1" && (await countItems()) === 6,
  );

  console.log("\n── 2 · Recusas (nada é gravado) ──");
  const { accountability: _drop, ...noAcc } = baseAdd;
  const refusals = await Promise.all([
    comp.addFibtActionToPlan({ ...noAcc, requestId: crypto.randomUUID(), title: "Sem responsável", description: "" }),
    comp.addFibtActionToPlan({ ...baseAdd, requestId: crypto.randomUUID(), cohortId: COHORT.atendimento, title: "Setor com publicação pendente", description: "" }),
    comp.addFibtActionToPlan({ ...baseAdd, requestId: crypto.randomUUID(), cohortId: COHORT.logistica, title: "Setor suprimido", description: "" }),
    comp.addFibtActionToPlan({ ...baseAdd, requestId: crypto.randomUUID(), title: "Prazo inválido", description: "", accountability: { ...baseAdd.accountability, dueOn: "2026-02-31" } }),
  ]);
  check(
    "PI13.8 plano ativo sem accountability, setor com publicação pendente, setor suprimido e prazo inválido são recusados",
    refusals[0]!.ok && !refusals[0]!.accepted && refusals[0]!.reason === "accountability_required" &&
    refusals[1]!.ok && !refusals[1]!.accepted && refusals[1]!.reason === "source_not_published" &&
    refusals[2]!.ok && !refusals[2]!.accepted && refusals[2]!.reason === "source_not_published" &&
    refusals[3]!.ok && !refusals[3]!.accepted && refusals[3]!.reason === "invalid_date",
  );
  const foreign = await comp.addFibtActionToPlan({ ...baseAdd, accessToken: beta, requestId: crypto.randomUUID(), title: "Invasora", description: "" });
  const foreignWave = await comp.addFibtActionToPlan({ ...baseAdd, accessToken: beta, waveId: WAVE_BETA, cohortId: COHORT.producao, requestId: crypto.randomUUID(), title: "Invasora", description: "" });
  check("PI13.9 Beta não inclui ação no plano da Alfa (plano não encontrado, sem confirmar existência), nem com onda/coorte próprias", foreign.ok && !foreign.accepted && foreign.reason === "plan_not_found" && foreignWave.ok && !foreignWave.accepted && foreignWave.reason === "plan_not_found");
  const memberAdd = await comp.addFibtActionToPlan({ ...baseAdd, accessToken: membro, requestId: crypto.randomUUID(), title: "Membro", description: "" });
  const noSession = await comp.addFibtActionToPlan({ ...baseAdd, accessToken: undefined, requestId: crypto.randomUUID(), title: "Sem sessão", description: "" });
  check("PI13.10 papel sem permissão administrativa e sessão ausente são recusados", !memberAdd.ok && memberAdd.category === "forbidden" && !noSession.ok && noSession.category === "unauthenticated");
  check("PI13.11 nenhuma recusa gravou ação", (await countItems()) === 6);

  console.log("\n── 3 · O banco é a autoridade (mesmo para service_role) ──");
  const dbRow = (over: Record<string, unknown>) => ({
    plan_id: PLAN, org_id: ORG_ALFA, lever_id: "fibt:operacoes:bem_estar", title: "Direta", effort: "baixo", start_week: 1, end_week: 13, milestone_week: 7, weeks_budget: 13,
    owner_user_id: alfaUser, owner_role_label: "Gestão", due_on: "2026-12-15", metric_label: "m", metric_baseline: 0, metric_target: 1, metric_unit: "u",
    source_lens_id: "fibt", source_wave_id: WAVE_ALFA, source_cohort_id: COHORT.operacoes, source_factor_id: "bem_estar", ...over,
  });
  const direct = await Promise.all([
    admin.from("action_items").insert(dbRow({ org_id: ORG_BETA })).select("id"),
    admin.from("action_items").insert(dbRow({ source_wave_id: WAVE_BETA, source_cohort_id: COHORT.producao })).select("id"),
    admin.from("action_items").insert(dbRow({ source_cohort_id: COHORT.atendimento })).select("id"),
    admin.from("action_items").insert(dbRow({ owner_user_id: null, due_on: null, metric_label: null })).select("id"),
  ]);
  const msg = (r: { error?: { message?: string } | null }) => r.error?.message ?? "";
  check("PI13.12 service_role: ação da Alfa em plano com organização trocada é recusada pelo banco", msg(direct[0]!).includes("ivo_plan_not_found"), msg(direct[0]!));
  check("PI13.13 service_role: origem de outra organização é recusada pelo banco", msg(direct[1]!).includes("ivo_plan_origin_denied"), msg(direct[1]!));
  check("PI13.14 service_role: origem sem leitura publicada é recusada pelo banco", msg(direct[2]!).includes("ivo_plan_source_not_published"), msg(direct[2]!));
  check("PI13.15 service_role: plano ativo sem accountability é recusado pelo banco", msg(direct[3]!).includes("ivo_plan_active_needs_accountability"), msg(direct[3]!));
  check("PI13.16 nenhuma tentativa direta gravou ação", (await countItems()) === 6);

  console.log("\n── 4 · Encerrar com pendências ──");
  const closePending = await comp.closeFibtActionPlan({ accessToken: alfa, planId: PLAN });
  check(
    "PI13.17 encerramento recusado com ações em andamento, explicando quantas e em qual estado",
    closePending.ok && !closePending.accepted && closePending.reason === "pending_actions" && /5 ação\(ões\) em andamento \(4 planejada\(s\) · 1 em execução\)/.test(closePending.message),
    closePending.ok && !closePending.accepted ? closePending.message : "",
  );
  const directClose = await admin.from("action_plans").update({ status: "closed", closed_by: alfaUser, closed_by_role: "RH_ADMIN" }).eq("id", PLAN).eq("status", "active").select("id");
  check("PI13.18 service_role: o banco também recusa o encerramento com pendências", msg(directClose).includes("ivo_plan_close_pending"), msg(directClose));
  check("PI13.19 recusas deixaram o plano ativo e sem auditoria de encerramento", (await psql(`SELECT status || '|' || (closed_at IS NULL)::TEXT || '|' || (closed_by IS NULL)::TEXT FROM public.action_plans WHERE id = '${PLAN}';`)) === "active|true|true");

  console.log("\n── 5 · Concorrência inclusão × encerramento (duas sessões SQL reais, plano de teste descartável) ──");
  const SCRATCH = "ac000000-0000-4000-8000-0000000000c1";
  const S1 = "ac000000-0000-4000-8000-0000000000d1";
  const S2 = "ac000000-0000-4000-8000-0000000000d2";
  const S3 = "ac000000-0000-4000-8000-0000000000d3";
  const cleanupScratch = () => psql(`DELETE FROM public.action_plans WHERE id = '${SCRATCH}';`);
  try {
    await cleanupScratch();
    await psql(`
      INSERT INTO public.action_plans (id, org_id, cycle_key, season_name, created_by) VALUES ('${SCRATCH}', '${ORG_ALFA}', '2099-T1', 'Plano de teste de concorrência', '${alfaUser}');
      ${itemInsertSql({ id: S1, planId: SCRATCH, title: "Ação de teste", ownerId: alfaUser })}
      UPDATE public.action_plans SET status = 'active', activated_at = NOW() WHERE id = '${SCRATCH}';
      UPDATE public.action_items SET status = 'concluida' WHERE id = '${S1}';`);
    const closeSql = `UPDATE public.action_plans SET status = 'closed', closed_by = '${alfaUser}', closed_by_role = 'RH_ADMIN' WHERE id = '${SCRATCH}' AND status = 'active';`;

    // Ordem 1: a INCLUSÃO vence. X insere e segura a transação; Y tenta encerrar e fica esperando a trava.
    const x1 = sessionOf(`BEGIN; SET LOCAL ROLE service_role; ${itemInsertSql({ id: S2, planId: SCRATCH, title: "Inclusão concorrente", ownerId: alfaUser, requestId: crypto.randomUUID() })} SELECT pg_sleep(3); COMMIT;`);
    await sleep(1000);
    const y1 = await sessionOf(`SET ROLE service_role; ${closeSql}`).done;
    const x1r = await x1.done;
    check("PI13.20 ordem 1 (inclusão vence): o encerramento ESPEROU a trava do plano e depois viu a ação pendente", y1.code !== 0 && y1.err.includes("ivo_plan_close_pending") && y1.elapsedMs >= 1500, `y=${y1.elapsedMs}ms ${y1.err.slice(0, 120)}`);
    check("PI13.21 ordem 1: a ação incluída foi gravada (planejada) e o plano segue ativo", x1r.code === 0 && (await psql(`SELECT (SELECT status FROM public.action_plans WHERE id = '${SCRATCH}') || '|' || (SELECT status FROM public.action_items WHERE id = '${S2}');`)) === "active|planejada");

    // Ordem 2: o ENCERRAMENTO vence. X encerra e segura; Y tenta incluir e fica esperando.
    await psql(`UPDATE public.action_items SET status = 'interrompida' WHERE id = '${S2}';`);
    const x2 = sessionOf(`BEGIN; SET LOCAL ROLE service_role; ${closeSql} SELECT pg_sleep(3); COMMIT;`);
    await sleep(1000);
    const y2 = await sessionOf(`SET ROLE service_role; ${itemInsertSql({ id: S3, planId: SCRATCH, title: "Inclusão tardia", ownerId: alfaUser, requestId: crypto.randomUUID() })}`).done;
    const x2r = await x2.done;
    check("PI13.22 ordem 2 (encerramento vence): a inclusão ESPEROU a trava e depois viu o plano encerrado", y2.code !== 0 && y2.err.includes("ivo_plan_closed") && y2.elapsedMs >= 1500, `y=${y2.elapsedMs}ms ${y2.err.slice(0, 120)}`);
    check("PI13.23 ordem 2: o plano ficou encerrado com autor e papel, e a ação tardia NÃO existe", x2r.code === 0 && (await psql(`SELECT (SELECT status || '|' || (closed_at IS NOT NULL)::TEXT || '|' || (closed_by = '${alfaUser}')::TEXT || '|' || closed_by_role FROM public.action_plans WHERE id = '${SCRATCH}') || '|' || (SELECT COUNT(*) FROM public.action_items WHERE id = '${S3}');`)) === "closed|true|true|RH_ADMIN|0");
  } finally {
    await cleanupScratch();
  }
  check("PI13.24 plano de teste removido (nada do ensaio de concorrência fica no estado da demonstração)", (await psql(`SELECT COUNT(*) FROM public.action_plans WHERE cycle_key = '2099-T1';`)) === "0");

  console.log("\n── 6 · Encerrar o plano real ──");
  const moves: Array<[string, Array<"em_execucao" | "concluida" | "em_vigilancia" | "interrompida">]> = [
    [c8.A, ["concluida"]],
    [c8.C, ["interrompida"]],
    [idD!, ["em_execucao", "concluida", "em_vigilancia"]],
    [idE!, ["interrompida"]],
    [idF!, ["interrompida"]],
  ];
  let moved = true;
  for (const [itemId, steps] of moves) {
    for (const toStatus of steps) {
      const r = await loop.recordFibtActionStatus({ accessToken: alfa, itemId, toStatus });
      if (!r.ok || !r.accepted) moved = false;
    }
  }
  check("PI13.25 ações levadas a estados de saída pelo fluxo normal (concluída, em vigilância, interrompida)", moved);

  const logBefore = Number(await psql(`SELECT COUNT(*) FROM public.action_log WHERE org_id = '${ORG_ALFA}';`));
  const evidenceBefore = Number(await psql(`SELECT COUNT(*) FROM public.evidence_records WHERE org_id = '${ORG_ALFA}';`));
  // Corrida real pelo servidor: nova inclusão × encerramento no mesmo instante.
  const R4 = crypto.randomUUID();
  const [raceAdd, raceClose] = await Promise.all([
    comp.addFibtActionToPlan({ ...baseAdd, requestId: R4, title: "Inclusão na corrida", description: "" }),
    comp.closeFibtActionPlan({ accessToken: alfa, planId: PLAN }),
  ]);
  const addOk = raceAdd.ok && raceAdd.accepted;
  const closeOk = raceClose.ok && raceClose.accepted;
  check(
    "PI13.26 corrida pelo servidor: inclusão e encerramento NUNCA vencem os dois (ou a ação entra e o encerramento vê a pendência, ou o plano encerra e a ação é recusada)",
    !(addOk && closeOk) && (addOk ? raceClose.ok === true && !raceClose.accepted && raceClose.reason === "pending_actions" : closeOk && raceAdd.ok === true && !raceAdd.accepted && raceAdd.reason === "plan_closed"),
    JSON.stringify({ add: raceAdd.ok && !raceAdd.accepted ? raceAdd.reason : addOk, close: raceClose.ok && !raceClose.accepted ? raceClose.reason : closeOk }),
  );
  console.log(`       (desfecho observado nesta execução: ${addOk ? "a inclusão venceu e o encerramento viu a pendência" : "o encerramento venceu e a inclusão foi recusada"})`);
  let closedBy = closeOk;
  // Eventos de ledger imediatamente ANTES do ato que de fato encerrou o plano.
  let logBeforeClose = logBefore;
  if (!closedBy) {
    // A inclusão venceu: leva a ação nova a um estado de saída e encerra.
    const late = await loop.loadFibtActionLoop({ accessToken: alfa });
    const pending = late.ok ? late.plans.find((p) => p.id === PLAN)!.actions.filter((a) => a.status === "planejada") : [];
    for (const a of pending) await loop.recordFibtActionStatus({ accessToken: alfa, itemId: a.id, toStatus: "interrompida" });
    logBeforeClose = Number(await psql(`SELECT COUNT(*) FROM public.action_log WHERE org_id = '${ORG_ALFA}';`));
    const again = await comp.closeFibtActionPlan({ accessToken: alfa, planId: PLAN });
    closedBy = again.ok && again.accepted === true;
  }
  check("PI13.27 plano real encerrado pela sessão da Alfa", closedBy);
  const closedRow = await psql(`SELECT status || '|' || (closed_at IS NOT NULL)::TEXT || '|' || (closed_by = '${alfaUser}')::TEXT || '|' || closed_by_role FROM public.action_plans WHERE id = '${PLAN}';`);
  check("PI13.28 banco: closed, instante definido pelo banco, autor e papel vindos da sessão", closedRow === "closed|true|true|RH_ADMIN", closedRow);
  const nonTerminal = await psql(`SELECT COUNT(*) FROM public.action_items WHERE plan_id = '${PLAN}' AND status NOT IN ('concluida','em_vigilancia','interrompida');`);
  check("PI13.29 invariante: plano encerrado não tem ação pendente", nonTerminal === "0");
  const closedAt = await psql(`SELECT closed_at FROM public.action_plans WHERE id = '${PLAN}';`);
  const logAfterClose = Number(await psql(`SELECT COUNT(*) FROM public.action_log WHERE org_id = '${ORG_ALFA}';`));
  const repeatClose = await comp.closeFibtActionPlan({ accessToken: alfa, planId: PLAN });
  const repeatClose2 = await Promise.all([comp.closeFibtActionPlan({ accessToken: alfa, planId: PLAN }), comp.closeFibtActionPlan({ accessToken: alfa, planId: PLAN })]);
  check(
    "PI13.30 repetir o encerramento (inclusive em paralelo) devolve o desfecho sem gravar nada de novo",
    repeatClose.ok && repeatClose.accepted === true && repeatClose.replayed === true && repeatClose2.every((r) => r.ok && r.accepted && r.replayed) &&
    (await psql(`SELECT closed_at FROM public.action_plans WHERE id = '${PLAN}';`)) === closedAt && Number(await psql(`SELECT COUNT(*) FROM public.action_log WHERE org_id = '${ORG_ALFA}';`)) === logAfterClose,
  );
  check(
    "PI13.31 o ato de encerrar não cria evento de ledger nem evidência (contagens iguais imediatamente antes e depois)",
    logAfterClose === logBeforeClose && Number(await psql(`SELECT COUNT(*) FROM public.evidence_records WHERE org_id = '${ORG_ALFA}';`)) === evidenceBefore,
    `log ${logBeforeClose}→${logAfterClose}`,
  );

  console.log("\n── 7 · Plano encerrado é imutável (servidor e banco) ──");
  const afterClose = await Promise.all([
    comp.addFibtActionToPlan({ ...baseAdd, requestId: crypto.randomUUID(), title: "Tarde demais", description: "" }),
    loop.recordFibtActionStatus({ accessToken: alfa, itemId: c8.A, toStatus: "em_execucao" }),
    loop.recordFibtActionEvidence({ accessToken: alfa, itemId: c8.A, scope: "execucao", content: "depois do encerramento", occurredOn: "2026-06-12" }),
  ]);
  check(
    "PI13.32 servidor: nova ação, mudança de estado e nova evidência são recusadas em plano encerrado",
    afterClose[0].ok && !afterClose[0].accepted && afterClose[0].reason === "plan_closed" &&
    afterClose[1].ok && !afterClose[1].accepted && afterClose[1].reason === "plan_not_active" &&
    afterClose[2].ok && !afterClose[2].accepted && afterClose[2].reason === "plan_not_active",
  );
  const closedDirect = await Promise.all([
    admin.from("action_items").insert(dbRow({ title: "Direta tardia" })).select("id"),
    admin.from("action_items").update({ status: "em_execucao" }).eq("id", c8.A).select("id"),
    admin.from("action_plans").update({ status: "active" }).eq("id", PLAN).select("id"),
    admin.from("action_plans").update({ closed_by_role: "ADULTERADO" }).eq("id", PLAN).select("id"),
    admin.from("evidence_records").insert({ org_id: ORG_ALFA, item_id: c8.A, lever_id: "x", evidence_kind: "texto", content_ref: "tarde", occurred_on: "2026-06-12", recorded_by: alfaUser }).select("id"),
    admin.from("action_log").insert({ item_id: c8.A, org_id: ORG_ALFA, event_kind: "note", actor_user_id: alfaUser, actor_role_label: "RH_ADMIN", note: "tarde" }).select("id"),
  ]);
  check("PI13.33 service_role: inserir ação, mudar estado, reabrir, adulterar auditoria, inserir evidência e evento — o banco recusa tudo", closedDirect.every((r) => !!r.error) && msg(closedDirect[0]!).includes("ivo_plan_closed") && msg(closedDirect[2]!).includes("ivo_plan_closed_is_immutable"), closedDirect.map(msg).join(" | "));
  const restPatch = await rest(`/action_plans?id=eq.${PLAN}`, alfa, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
  const restItemInsert = await rest("/action_items", alfa, { method: "POST", body: JSON.stringify(dbRow({ title: "Direta autenticada" })) });
  check("PI13.34 authenticated (até a organização dona) não escreve no plano nem nas ações por PostgREST", denied(restPatch.status) && denied(restItemInsert.status), `${restPatch.status}/${restItemInsert.status}`);
  const betaPlanRead = await rest(`/action_plans?org_id=eq.${ORG_ALFA}&select=id,status,closed_by_role`, beta);
  const alfaPlanRead = await rest(`/action_plans?id=eq.${PLAN}&select=status,closed_by_role,closed_at`, alfa);
  const alfaRow = rowsOf(alfaPlanRead)[0] as { status?: string; closed_by_role?: string; closed_at?: string } | undefined;
  check("PI13.35 RLS: Beta lê 0 planos da Alfa; a Alfa lê o próprio plano encerrado com a auditoria", rowsOf(betaPlanRead).length === 0 && alfaRow?.status === "closed" && alfaRow.closed_by_role === "RH_ADMIN" && !!alfaRow.closed_at);

  console.log("\n── 8 · Privacidade e história C8 ──");
  const q2 = await loadIvoQ2ReadingForSession({ accessToken: alfa });
  const means = q2.ok && q2.state === "ready" ? q2.view.sectors.flatMap((s) => s.factors ?? []).map((f) => String(f.mean)).filter((m) => m.includes(".")) : [];
  const newRows = await psql(`SELECT COALESCE(json_agg(row_to_json(i)), '[]')::TEXT FROM public.action_items i WHERE plan_id = '${PLAN}' AND add_request_id IS NOT NULL;`);
  const planRow = await psql(`SELECT row_to_json(p)::TEXT FROM public.action_plans p WHERE id = '${PLAN}';`);
  const responseIds = (await psql(`SELECT string_agg(id::TEXT, ',') FROM public.wave_responses WHERE wave_id = '${WAVE_ALFA}';`)).split(",");
  check(
    "PI13.36 ações incluídas e plano encerrado não carregam médias publicadas, respostas nem ids de resposta",
    means.length > 0 && means.every((m) => !new RegExp(`(?<![\\d.])${m.replace(".", "\\.")}(?!\\d)`).test(newRows + planRow)) && !/answers|item_means/.test(newRows + planRow) && responseIds.every((id) => !(newRows + planRow).includes(id)),
  );
  const c8After = await psql(C8_CHECKSUM_SQL);
  const effAfter = await eff.loadEfficacyForSession({ accessToken: alfa });
  const statesAfter = effAfter.ok ? Object.fromEntries(effAfter.items.map((i) => [i.itemId, i.state])) : {};
  check("PI13.37 C8 intacto: protocolos, observações e pareceres byte a byte iguais depois de incluir ações e encerrar", c8After === c8Before, `${c8Before} → ${c8After}`);
  check("PI13.38 estados de avaliação inalterados (A meta atingida · B meta não atingida · C inconclusiva) — encerrar não é eficácia", JSON.stringify(statesAfter) === JSON.stringify(statesBefore) && statesAfter[c8.A] === "meta_atingida" && statesAfter[c8.B] === "meta_nao_atingida" && statesAfter[c8.C] === "inconclusiva", JSON.stringify(statesAfter));

  const history = await psql(C8_HISTORY_SQL);
  const finalView = await loop.loadFibtActionLoop({ accessToken: alfa });
  const finalPlan = finalView.ok ? finalView.plans.find((p) => p.id === PLAN) : undefined;
  writeFileSync(
    PLAN_STATE,
    JSON.stringify({
      planId: PLAN,
      closedAt,
      itemIds: finalPlan?.actions.map((a) => a.id) ?? [],
      addedIds: finalPlan?.actions.filter((a) => a.addedLater).map((a) => a.id) ?? [],
      idD,
      requestD: R1,
      c8Checksum: c8After,
      c8History: history,
      statesBefore,
      protocolsCount: Number(await psql(`SELECT COUNT(*) FROM public.efficacy_protocols WHERE org_id = '${ORG_ALFA}';`)),
      logAfterClose,
      A: c8.A,
    }),
  );
}

// ── Fase READ (processo novo) ───────────────────────────────────────────────

async function readPhase(): Promise<void> {
  const comp = await import("../src/lib/ivo/fibt-plan-composition.server");
  const loop = await import("../src/lib/ivo/fibt-action-loop.server");
  const eff = await import("../src/lib/ivo/efficacy-protocol.server");
  const { buildActionTimeline } = await import("../src/lib/ivo/action-follow-up");
  const state = JSON.parse(readFileSync(PLAN_STATE, "utf8")) as {
    planId: string; closedAt: string; itemIds: string[]; addedIds: string[]; idD: string; requestD: string; c8Checksum: string; c8History: string;
    statesBefore: Record<string, string>; protocolsCount: number; logAfterClose: number; A: string;
  };
  const alfa = await signIn("alfa_admin");
  const beta = await signIn("beta_admin");

  console.log("\n── 9 · Persistência após recarregar (processo novo) ──");
  const reloaded = await loop.loadFibtActionLoop({ accessToken: alfa });
  const plan = reloaded.ok ? reloaded.plans.find((p) => p.id === state.planId) : undefined;
  check("PP.1 o plano reaparece ENCERRADO, com papel de quem encerrou, e a composição disponível", plan?.status === "closed" && plan.closedByRole === "RH_ADMIN" && plan.composition === "available" && !!plan.closedAt && new Date(plan.closedAt).getTime() === new Date(state.closedAt).getTime());
  check("PP.2 todas as ações reaparecem, todas em estado de saída, e as incluídas depois trazem quando/por quem", !!plan && plan.actions.length === state.itemIds.length && plan.actions.every((a) => ["concluida", "em_vigilancia", "interrompida"].includes(a.status)) && state.addedIds.length >= 3 && plan.actions.filter((a) => a.addedLater).length === state.addedIds.length && plan.actions.filter((a) => a.addedLater).every((a) => a.addedLater!.byRole === "RH_ADMIN"));
  const actionA = plan?.actions.find((a) => a.id === state.A);
  check("PP.3 histórico da ação criada com o plano continua legível (evidência de execução e de aprendizagem)", !!actionA && actionA.evidence.execution.length >= 1 && actionA.evidence.learning.length >= 1);
  const actionD = plan?.actions.find((a) => a.id === state.idD);
  const timeline = plan && actionD ? buildActionTimeline(actionD, plan, null) : [];
  check("PP.4 linha do tempo da ação incluída mostra a inclusão e o encerramento, sem sugerir eficácia", timeline.some((t) => t.kind === "action_added") && timeline.some((t) => t.kind === "plan_closed" && /Não indica eficácia/.test(t.detail ?? "")) && timeline.every((t) => !/melhor/i.test(t.label)));
  const betaView = await loop.loadFibtActionLoop({ accessToken: beta });
  check("PP.5 Beta continua sem ver nada da Alfa", betaView.ok && betaView.plans.length === 0);

  console.log("\n── 10 · Idempotência e imutabilidade depois de recarregar ──");
  const replayAdd = await comp.addFibtActionToPlan({
    accessToken: alfa, planId: state.planId, requestId: state.requestD, waveId: manifest.orgs.alfa.waveId, cohortId: COHORT.operacoes, factorId: "bem_estar",
    title: "Oficina de pausas ativas", description: "Duas oficinas curtas por mês.", effort: "baixo",
  });
  check("PP.6 repetir, em processo novo, o pedido de inclusão já aplicado devolve a mesma ação (a chave persistiu no banco)", replayAdd.ok && replayAdd.accepted === true && replayAdd.replayed === true && replayAdd.id === state.idD);
  const lateAdd = await comp.addFibtActionToPlan({
    accessToken: alfa, planId: state.planId, requestId: crypto.randomUUID(), waveId: manifest.orgs.alfa.waveId, cohortId: COHORT.operacoes, factorId: "bem_estar",
    title: "Nova ação em plano encerrado", description: "", effort: "baixo",
    accountability: { ownerRoleLabel: "Gestão", dueOn: "2026-12-15", executionMetric: { label: "x", baseline: 0, target: 1, unit: "" } },
  });
  const repeatClose = await comp.closeFibtActionPlan({ accessToken: alfa, planId: state.planId });
  const betaClose = await comp.closeFibtActionPlan({ accessToken: beta, planId: state.planId });
  check("PP.7 plano encerrado recusa ação nova; repetir o encerramento só devolve o desfecho; Beta não encerra plano alheio", lateAdd.ok && !lateAdd.accepted && lateAdd.reason === "plan_closed" && repeatClose.ok && repeatClose.accepted === true && repeatClose.replayed === true && betaClose.ok && !betaClose.accepted && betaClose.reason === "plan_not_found");
  const logNow = Number(await psql(`SELECT COUNT(*) FROM public.action_log WHERE org_id = '${ORG_ALFA}';`));
  check("PP.8 nada novo no ledger depois das repetições", logNow === state.logAfterClose && (await psql(`SELECT closed_at FROM public.action_plans WHERE id = '${state.planId}';`)) === state.closedAt);

  console.log("\n── 11 · A avaliação (C8) é independente do encerramento ──");
  check("PP.9 protocolos, observações e pareceres continuam byte a byte iguais em processo novo", (await psql(C8_CHECKSUM_SQL)) === state.c8Checksum);
  const effNow = await eff.loadEfficacyForSession({ accessToken: alfa });
  const statesNow = effNow.ok ? Object.fromEntries(effNow.items.map((i) => [i.itemId, i.state])) : {};
  check("PP.10 estados de avaliação inalterados", JSON.stringify(statesNow) === JSON.stringify(state.statesBefore));
  const revision = await eff.startEfficacyRevision({ accessToken: alfa, itemId: state.A });
  check("PP.11 depois do encerramento a avaliação segue possível: uma nova revisão do protocolo abre em rascunho", revision.ok && revision.accepted === true);
  check(
    "PP.12 a nova revisão não altera observações nem pareceres existentes (só acrescenta um rascunho)",
    (await psql(C8_HISTORY_SQL)) === state.c8History && Number(await psql(`SELECT COUNT(*) FROM public.efficacy_protocols WHERE org_id = '${ORG_ALFA}';`)) === state.protocolsCount + 1,
  );
}

const phase = process.argv[2];
try {
  if (phase === "write") await writePhase();
  else if (phase === "read") await readPhase();
  else {
    console.log("PROVA DE INTEGRAÇÃO LOCAL — PI-13 (incluir ação em plano existente e encerrar plano; Supabase local, sessões reais)");
    for (const p of ["write", "read"]) {
      const proc = Bun.spawn([process.execPath, join(ROOT, "scripts", "ivo-local-plan-proof.ts"), p], { stdout: "inherit", stderr: "inherit" });
      if ((await proc.exited) !== 0) {
        console.error(`\n❌ fase ${p} falhou`);
        process.exit(1);
      }
    }
    console.log("\n✅ PROVA LOCAL PI-13 OK — escrita e releitura em processos separados");
    process.exit(0);
  }
} catch (error) {
  check(`exceção na fase ${phase}`, false, (error as Error).stack ?? (error as Error).message);
}

const failed = results.filter((r) => !r.ok);
console.log(`\nfase=${phase} · verificações=${results.length} · falhas=${failed.length}`);
process.exit(failed.length > 0 ? 1 : 0);
