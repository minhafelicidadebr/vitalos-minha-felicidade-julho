#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// PROVA DE INTEGRAÇÃO LOCAL — C8 persistente, R7 (aprendizagem) e R8 (governança)
// ═══════════════════════════════════════════════════════════════════════════
//
// Complementa scripts/ivo-local-journey-proof.ts (que cria as três ações de
// Operações e deixa o plano ativo). Roda o código de SERVIDOR real contra o
// Supabase LOCAL descartável, com sessões reais do GoTrue local, e ataca o
// PostgREST com o JWT de cada papel para provar RLS e ACL das tabelas efficacy_*.
//
// Critérios dos três desfechos são FICTÍCIOS e explícitos (ver CRITERIOS): não
// têm valor científico e o parecer conclusivo só é aceito porque a governança D9
// de TESTE SINTÉTICO está ligada — o banco grava `teste_sintetico` em cada parecer.
//
// Duas fases em PROCESSOS SEPARADOS (write/read): a segunda relê tudo do banco.
// Nunca toca host remoto: o ambiente é lido de .ivo-demo.local/demo.env e
// verificado como loopback antes de qualquer importação de servidor.
//
// Uso: bun run demo:ivo:proof   (orquestra journey + C8)

import { createHash } from "node:crypto";
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
const DB_CONTAINER = "supabase_db_vitalos-ivo-local";
const REGISTRY_FILE = join(ROOT, "src", "domain", "ivo", "methodology-governance.json");

for (const f of [ENV_FILE, USERS_FILE, MANIFEST_FILE, JOURNEY_STATE]) {
  if (!existsSync(f)) {
    console.error(`❌ ${f} ausente. Rode: bun run demo:ivo:setup e depois bun run demo:ivo:proof`);
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
delete process.env.VITALOS_IVO_TEST_GOVERNANCE;
delete process.env.VITALOS_IVO_METHOD_AUTHORITY_USER_IDS;

const API = env.SUPABASE_URL!;
const ANON = env.SUPABASE_PUBLISHABLE_KEY!;
const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8")) as { orgs: Record<"alfa" | "beta", { orgId: string }> };
const ORG_ALFA = manifest.orgs.alfa.orgId;
const ORG_BETA = manifest.orgs.beta.orgId;
const users = JSON.parse(readFileSync(USERS_FILE, "utf8")) as Array<{ key: string; org?: string; role?: string; email: string; password: string }>;
const D9_TEST = "D9_APROVADO_SINTETICO";

/** Critérios FICTÍCIOS e explícitos dos três desfechos (sem valor científico). */
const CRITERIOS = {
  favoravel: { baseline: 40, meta: 60, diferencaMinima: 5, observado: 62, nota: "meta 60 (aumentar); 40→62 supera a diferença mínima de 5" },
  desfavoravel: { baseline: 50, meta: 60, diferencaMinima: 5, observado: 48, nota: "meta 60 (aumentar); 50→48 piora" },
  inconclusivo: { nota: "leitura publicada de outro ciclo: a resolução protegida do valor não existe; nenhum número é inventado" },
} as const;

const results: Array<{ id: string; ok: boolean; detail?: string }> = [];
function check(id: string, ok: boolean, detail?: string): void {
  results.push({ id, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${id}${!ok && detail ? ` — ${detail}` : ""}`);
}

async function signIn(key: string): Promise<string> {
  const user = users.find((u) => u.key === key);
  if (!user) throw new Error(`usuário de teste ausente: ${key}`);
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

async function psql(sql: string): Promise<string> {
  const proc = Bun.spawn(["docker", "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-X", "-tA", "-f", "-"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(sql);
  await proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  if ((await proc.exited) !== 0) throw new Error(err.trim());
  return out.trim();
}

const rowsOf = (r: { body: unknown }): unknown[] => (Array.isArray(r.body) ? r.body : []);
const denied = (status: number) => status === 401 || status === 403 || status === 404;

/** Identidade FICTÍCIA da revisora independente (RH_ADMIN da Alfa, criada só neste stack local). */
async function ensureReviewer(): Promise<string> {
  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const email = "revisora.alfa@alfa.ficticia.test";
  const password = "demo-local-alfa_revisora-2026";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let id: string | undefined = listed.data?.users?.find((u: { email?: string }) => u.email === email)?.id;
  if (!id) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { fictitious: true } });
    if (created.error || !created.data?.user) throw new Error(`não foi possível criar a revisora fictícia: ${created.error?.message}`);
    id = created.data.user.id as string;
  }
  await psql(`INSERT INTO public.profiles (id, org_id, role, display_name) VALUES ('${id}', '${ORG_ALFA}', 'RH_ADMIN', 'Revisora Alfa (fictícia)') ON CONFLICT (id) DO NOTHING;`);
  if (!users.some((u) => u.key === "alfa_revisora")) {
    users.push({ key: "alfa_revisora", org: "Organização Fictícia Alfa", role: "RH_ADMIN", email, password });
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }
  return id;
}

function dayFrom(today: string, offset: number): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

// ── Fase WRITE ───────────────────────────────────────────────────────────────
async function writePhase(): Promise<void> {
  const eff = await import("../src/lib/ivo/efficacy-protocol.server");
  const loop = await import("../src/lib/ivo/fibt-action-loop.server");
  const gov = await import("../src/lib/ivo/ivo-governance.server");
  const edu = await import("../src/lib/ivo/ivo-education.server");
  const { todayInSaoPaulo } = await import("../src/lib/ivo/local-date");
  const { buildActionTimeline, summarizePlan } = await import("../src/lib/ivo/action-follow-up");
  const { parseContentRef } = await import("../src/lib/ivo/content-ref");
  const { getGovernanceEntry, getGovernanceEntries } = await import("../src/domain/ivo/methodology-governance");

  const state = JSON.parse(readFileSync(JOURNEY_STATE, "utf8")) as { byFactor?: Record<string, string> };
  const A = state.byFactor?.bem_estar;
  const B = state.byFactor?.satisfacao_empresa;
  const C = state.byFactor?.padrao_de_vida;
  if (!A || !B || !C) throw new Error("estado da jornada sem as três ações — rode a fase write da jornada antes");

  const reviewerId = await ensureReviewer();
  const alfa = await signIn("alfa_admin");
  const revisora = await signIn("alfa_revisora");
  const beta = await signIn("beta_admin");
  const membro = await signIn("alfa_membro");
  const today = todayInSaoPaulo();
  const registryHashBefore = createHash("sha256").update(readFileSync(REGISTRY_FILE)).digest("hex");

  const complete = (o: Record<string, unknown> = {}) => ({
    objective: "Elevar o índice fictício de carga percebida no turno (critério de demonstração)",
    indicatorLabel: "Índice fictício de carga percebida (0–100)",
    indicatorKind: "resultado",
    indicatorOrigin: "medida_da_organizacao",
    unit: "pontos",
    direction: "aumentar",
    baselineObservedOn: dayFrom(today, -45),
    baselinePopulation: "Operações, turno da manhã (fictício)",
    baselineSource: "Pesquisa interna fictícia de demonstração",
    baselineValue: 40,
    targetKind: "numerico",
    targetValue: 60,
    meaningfulDifference: 5,
    windowStart: dayFrom(today, -30),
    windowEnd: dayFrom(today, 60),
    source: "Pesquisa interna fictícia de demonstração (segunda rodada)",
    comparisonRule: { sameCohort: true, sameInstrumentVersion: true, sameCalculationVersion: true },
    responsibleRole: "Coordenação de Operações",
    reviewerRole: "Revisão independente de RH",
    limitations: ["Critérios fictícios de demonstração; sem valor científico."],
    ...o,
  });

  // Execução repetível: limpa SÓ o C8 dos itens fictícios deste stack local (o ledger é
  // recriado pela fase write da jornada; o DELETE em action_items já cascateia).
  await psql(`DELETE FROM public.efficacy_verdicts WHERE org_id IN ('${ORG_ALFA}','${ORG_BETA}');
              DELETE FROM public.efficacy_observations WHERE org_id IN ('${ORG_ALFA}','${ORG_BETA}');
              DELETE FROM public.efficacy_protocols WHERE org_id IN ('${ORG_ALFA}','${ORG_BETA}');`).catch(() => undefined);

  console.log("\n── 7 · Protocolo C8 persistente (rascunho → registrado → observação → parecer) ──");
  const noProtocolYet = await eff.loadEfficacyForSession({ accessToken: alfa });
  check("C8.0 sem protocolo, a eficácia é 'não avaliada'", noProtocolYet.ok && noProtocolYet.items.every((i) => i.registered === null && i.draft === null));

  const draftOnly = await eff.saveEfficacyDraft({ accessToken: alfa, itemId: A, fields: { objective: "Rascunho inicial ainda incompleto" } });
  check("C8.1 protocolo incompleto é aceito como RASCUNHO", draftOnly.ok && draftOnly.accepted === true);
  const draftView = await eff.loadEfficacyForSession({ accessToken: alfa });
  const draftA = draftView.ok ? draftView.items.find((i) => i.itemId === A) : undefined;
  check("C8.2 rascunho persistido lista o que falta e NÃO vale como protocolo", !!draftA && draftA.draft?.status === "draft" && draftA.registered === null && draftA.registrationIssues.length > 0);
  const regIncomplete = await eff.registerEfficacyProtocol({ accessToken: alfa, itemId: A });
  check("C8.3 registrar incompleto é recusado com os motivos; segue rascunho", regIncomplete.ok && !regIncomplete.accepted && regIncomplete.reason === "protocol_incomplete" && regIncomplete.errors.length > 0);
  check("C8.4 banco guarda o rascunho (status draft)", (await psql(`SELECT status FROM public.efficacy_protocols WHERE item_id = '${A}';`)) === "draft");

  const fav = CRITERIOS.favoravel;
  const unf = CRITERIOS.desfavoravel;
  const savedA = await eff.saveEfficacyDraft({ accessToken: alfa, itemId: A, fields: complete({ baselineValue: fav.baseline, targetValue: fav.meta, meaningfulDifference: fav.diferencaMinima }) as never });
  const regA = await eff.registerEfficacyProtocol({ accessToken: alfa, itemId: A });
  check("C8.5 rascunho completado é registrado (favorável · critérios fictícios)", savedA.ok && savedA.accepted === true && regA.ok && regA.accepted === true);
  const editAfter = await eff.saveEfficacyDraft({ accessToken: alfa, itemId: A, fields: { objective: "Alteração indevida depois de registrar" } });
  check("C8.6 protocolo registrado não é editado — exige nova revisão", editAfter.ok && !editAfter.accepted && editAfter.reason === "protocol_registered_use_revision");
  check("C8.7 banco: registrado e imutável mesmo via service_role", await (async () => {
    const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const upd = await admin.from("efficacy_protocols").update({ objective: "forçado" }).eq("item_id", A).eq("status", "registered");
    const del = await admin.from("efficacy_protocols").delete().eq("item_id", A);
    return !!upd.error && !!del.error;
  })());

  // Protocolos de B (desfavorável) e C (leitura publicada → inconclusivo).
  const savedB = await eff.saveEfficacyDraft({ accessToken: alfa, itemId: B, fields: complete({ baselineValue: unf.baseline, targetValue: unf.meta, meaningfulDifference: unf.diferencaMinima, indicatorLabel: "Índice fictício de clareza de metas (0–100)" }) as never });
  const regB = await eff.registerEfficacyProtocol({ accessToken: alfa, itemId: B });
  check("C8.8 segundo protocolo (desfavorável) registrado", savedB.ok && savedB.accepted === true && regB.ok && regB.accepted === true);
  const savedC = await eff.saveEfficacyDraft({
    accessToken: alfa,
    itemId: C,
    useSourceAsBaseline: true,
    fields: complete({
      indicatorLabel: "Fator Padrão de Vida — leitura publicada (referência)",
      indicatorOrigin: "leitura_publicada",
      unit: "escala 0–4",
      baselineValue: null,
      baselineSource: "Leitura publicada FIB-T que originou a ação",
      targetValue: 2,
      meaningfulDifference: null,
      source: "Próxima leitura publicada FIB-T do mesmo recorte",
    }) as never,
  });
  const regC = await eff.registerEfficacyProtocol({ accessToken: alfa, itemId: C });
  check("C8.9 protocolo sobre leitura publicada guarda só REFERÊNCIA e registra", savedC.ok && savedC.accepted === true && regC.ok && regC.accepted === true, JSON.stringify([savedC, regC]));
  const refRow = await psql(`SELECT (baseline_value IS NULL)::TEXT || '|' || COALESCE(baseline_ref::TEXT,'') FROM public.efficacy_protocols WHERE item_id = '${C}' AND status = 'registered';`);
  check("C8.10 nenhum valor protegido foi copiado para o banco (baseline_value nulo, só referência)", refRow.startsWith("true|") && !/"(value|mean|means|item_means)"/.test(refRow), refRow);

  console.log("\n── 8 · Observação, independência do revisor e governança D9 ──");
  const outside = await eff.recordEfficacyObservation({ accessToken: alfa, itemId: A, observedOn: dayFrom(today, -40), value: 50 });
  const future = await eff.recordEfficacyObservation({ accessToken: alfa, itemId: A, observedOn: dayFrom(today, 1), value: 50 });
  check("C8.11 observação fora da janela ou no futuro é recusada", outside.ok && !outside.accepted && outside.reason === "observation_outside_window" && future.ok && !future.accepted && future.reason === "invalid_date");
  const obsA = await eff.recordEfficacyObservation({ accessToken: alfa, itemId: A, observedOn: today, value: fav.observado, note: "Segunda rodada fictícia" });
  const obsB = await eff.recordEfficacyObservation({ accessToken: alfa, itemId: B, observedOn: today, value: unf.observado, note: "Segunda rodada fictícia" });
  check("C8.12 observações registradas (medidas da organização)", obsA.ok && obsA.accepted === true && obsB.ok && obsB.accepted === true);
  const obsC = await eff.recordEfficacyObservation({ accessToken: alfa, itemId: C, observedOn: today, value: 3 });
  check("C8.13 observação sobre leitura publicada de outro ciclo é recusada (sem resolução protegida)", obsC.ok && !obsC.accepted && obsC.reason === "published_reading_resolution_pending");

  const sameUser = await eff.recordEfficacyVerdict({ accessToken: alfa, itemId: A, verdict: "meta_atingida", evidenceGrade: "descritiva" });
  check("C8.14 quem criou o protocolo não emite o parecer", sameUser.ok && !sameUser.accepted && sameUser.reason === "reviewer_not_independent");
  const pendingGov = await eff.recordEfficacyVerdict({ accessToken: revisora, itemId: A, verdict: "meta_atingida", evidenceGrade: "descritiva" });
  check("C8.15 D9 em proposta: parecer conclusivo recusado (governance_pending), nada gravado", pendingGov.ok && !pendingGov.accepted && pendingGov.reason === "governance_pending" && (await psql(`SELECT COUNT(*) FROM public.efficacy_verdicts WHERE org_id = '${ORG_ALFA}';`)) === "0");

  // A partir daqui: governança D9 de TESTE SINTÉTICO (ligada só neste processo, runtime local descartável).
  process.env.VITALOS_IVO_TEST_GOVERNANCE = D9_TEST;
  check("C8.16 a leitura do gate reconhece o override de teste SOMENTE em runtime local descartável", (await import("../src/lib/ivo/ivo-governance-gate.server")).resolveEfficacyGovernanceGate().source === "teste_sintetico");

  // Estado da ação ≠ avaliação: concluir B não cria parecer nem altera a eficácia.
  const beforeDone = await eff.loadEfficacyForSession({ accessToken: alfa });
  const stateBeforeDone = beforeDone.ok ? beforeDone.items.find((i) => i.itemId === B)?.state : null;
  await loop.recordFibtActionStatus({ accessToken: alfa, itemId: B, toStatus: "em_execucao" });
  const done = await loop.recordFibtActionStatus({ accessToken: alfa, itemId: B, toStatus: "concluida" });
  const afterDone = await eff.loadEfficacyForSession({ accessToken: alfa });
  const itemBAfter = afterDone.ok ? afterDone.items.find((i) => i.itemId === B) : undefined;
  check("C8.17 concluir a ação NÃO altera a avaliação nem cria parecer", done.ok && done.accepted === true && itemBAfter?.state === stateBeforeDone && itemBAfter?.verdict === null);

  const verdictA = await eff.recordEfficacyVerdict({ accessToken: revisora, itemId: A, verdict: "meta_atingida", evidenceGrade: "pre_pos", reason: `Critérios fictícios: ${fav.nota}.` });
  check("C8.18 FAVORÁVEL: revisora independente emite 'meta atingida' (D9 de teste)", verdictA.ok && verdictA.accepted === true, JSON.stringify(verdictA));
  const verdictB = await eff.recordEfficacyVerdict({ accessToken: revisora, itemId: B, verdict: "meta_nao_atingida", evidenceGrade: "pre_pos", reason: `Critérios fictícios: ${unf.nota}.` });
  check("C8.19 DESFAVORÁVEL: 'meta não atingida' mesmo com a ação concluída", verdictB.ok && verdictB.accepted === true, JSON.stringify(verdictB));
  const conclusiveC = await eff.recordEfficacyVerdict({ accessToken: revisora, itemId: C, verdict: "meta_atingida", evidenceGrade: "descritiva" });
  check("C8.20 leitura publicada não gera parecer conclusivo (resolução pendente) — sem número inventado", conclusiveC.ok && !conclusiveC.accepted && conclusiveC.reason === "published_reading_resolution_pending");
  const verdictC = await eff.recordEfficacyVerdict({ accessToken: revisora, itemId: C, verdict: "inconclusiva", evidenceGrade: "descritiva", reason: `Critérios fictícios: ${CRITERIOS.inconclusivo.nota}.` });
  check("C8.21 INCONCLUSIVO: aceito com motivo explícito", verdictC.ok && verdictC.accepted === true, JSON.stringify(verdictC));
  const dbVerdicts = await psql(`SELECT string_agg(verdict || ':' || governance_source || ':' || governance_state, ',' ORDER BY verdict) FROM public.efficacy_verdicts WHERE org_id = '${ORG_ALFA}';`);
  check("C8.22 banco: cada parecer traz a governança usada (teste_sintetico) e o estado D9", /inconclusiva:teste_sintetico:aprovado_para_piloto/.test(dbVerdicts) && /meta_atingida:teste_sintetico:aprovado_para_piloto/.test(dbVerdicts) && /meta_nao_atingida:teste_sintetico:aprovado_para_piloto/.test(dbVerdicts), dbVerdicts);
  const after = await eff.loadEfficacyForSession({ accessToken: alfa });
  const byItem = after.ok ? Object.fromEntries(after.items.map((i) => [i.itemId, i])) : {};
  check("C8.23 estados: A meta atingida · B meta não atingida · C inconclusiva", byItem[A]?.state === "meta_atingida" && byItem[B]?.state === "meta_nao_atingida" && byItem[C]?.state === "inconclusiva");
  check("C8.24 atribuição causal continua 'não avaliada' nos três pareceres", [A, B, C].every((id) => byItem[id]?.verdict?.attribution.status === "nao_avaliada"));
  check("C8.25 item sobre leitura publicada não expõe número (sem cálculo, sem valor)", byItem[C]?.assessment === null && byItem[C]?.observations.length === 0 && byItem[C]?.registered?.baselineValue === null);
  // Pareceres são append-only: um novo parecer vira novo registro; o mais recente vale e o anterior permanece.
  const again = await eff.recordEfficacyVerdict({ accessToken: revisora, itemId: C, verdict: "inconclusiva", evidenceGrade: "descritiva", reason: "Segunda análise fictícia: continua sem resolução protegida do valor." });
  const afterAgain = await eff.loadEfficacyForSession({ accessToken: alfa });
  const latestC = afterAgain.ok ? afterAgain.items.find((i) => i.itemId === C)?.verdict : null;
  check("C8.26 pareceres são append-only: o novo prevalece, o anterior continua no banco", again.ok && again.accepted === true && (await psql(`SELECT COUNT(*) FROM public.efficacy_verdicts v JOIN public.efficacy_protocols p ON p.id = v.protocol_id WHERE p.item_id = '${C}';`)) === "2" && !!latestC?.reason.startsWith("Segunda análise") && byItem[A]?.state === "meta_atingida");

  console.log("\n── 9 · Aprendizagem ligada à ação (R7) ──");
  const catalog = await edu.loadEducationForSession({ accessToken: alfa });
  check("R7.1 catálogo: curadoria pendente (D10), 0 aprovados, conteúdo de TESTE identificado", catalog.ok && catalog.catalog.approvedCount === 0 && catalog.catalog.curationDecision === "D10" && catalog.catalog.testVisible === true && catalog.byFactor.bem_estar?.[0]?.status === "TESTE");
  const linked = await loop.recordFibtActionEvidence({ accessToken: alfa, itemId: A, scope: "aprendizagem", content: "Pauta curta ajudou o turno", occurredOn: today, contentId: "TESTE-bem_estar-001" });
  const wrongFactor = await loop.recordFibtActionEvidence({ accessToken: alfa, itemId: A, scope: "aprendizagem", content: "Conteúdo de outro fator", occurredOn: today, contentId: "TESTE-satisfacao_empresa-001" });
  const execWithContent = await loop.recordFibtActionEvidence({ accessToken: alfa, itemId: A, scope: "execucao", content: "Execução com vínculo indevido", occurredOn: today, contentId: "TESTE-bem_estar-001" });
  check("R7.2 aprendizagem vincula conteúdo do MESMO fator; outro fator e execução são recusados", linked.ok && linked.accepted === true && wrongFactor.ok && !wrongFactor.accepted && wrongFactor.reason === "content_not_available" && execWithContent.ok && !execWithContent.accepted && execWithContent.reason === "content_link_only_for_learning");
  const stored = await psql(`SELECT content_ref FROM public.evidence_records WHERE item_id = '${A}' AND evidence_kind = 'aprendizagem' ORDER BY created_at DESC LIMIT 1;`);
  check("R7.3 vínculo guardado no ledger existente (sem armazenamento novo)", stored.startsWith("[conteudo:TESTE-bem_estar-001@0.0.1-teste] "), stored);
  const loopNow = await loop.loadFibtActionLoop({ accessToken: alfa });
  const plan = loopNow.ok ? loopNow.plans[0] : undefined;
  const actionA = plan?.actions.find((a) => a.id === A);
  check("R7.4 execução e aprendizagem permanecem separadas na visão da ação", !!actionA && actionA.evidence.execution.length === 1 && actionA.evidence.learning.length === 2);
  check("R7.5 vincular conteúdo não altera dimensão nem eficácia", !!actionA && actionA.dimension.status === "mapping_pending" && byItem[A]?.state === "meta_atingida");

  console.log("\n── 10 · Linha do tempo e resumo de acompanhamento (R7) ──");
  if (plan && actionA && after.ok) {
    const timeline = buildActionTimeline(actionA, plan, byItem[A] ?? null, parseContentRef);
    const kinds = new Set(timeline.map((e) => e.kind));
    const sorted = timeline.every((e, i) => i === 0 || Date.parse(timeline[i - 1]!.at) <= Date.parse(e.at));
    check("R7.6 linha do tempo: origem, ativação, estado, execução, aprendizagem e avaliação", ["priority_origin", "plan_activated", "status_change"].every((k) => kinds.has(k as never)) && timeline.length >= 7, [...kinds].join(","));
    check("R7.7 linha do tempo em ordem cronológica e com o conteúdo de TESTE identificado", sorted && timeline.some((e) => e.content?.contentId === "TESTE-bem_estar-001" && e.test === true));
    const summary = summarizePlan(plan, after.items.filter((i) => plan.actions.some((a) => a.id === i.itemId)));
    check("R7.8 resumo: 3 ações, 3 protocolos registrados, avaliações 1/1/1, nenhuma pendente", summary.actions === 3 && summary.protocols.registered === 3 && summary.evaluations.meta_atingida === 1 && summary.evaluations.meta_nao_atingida === 1 && summary.evaluations.inconclusiva === 1 && summary.evaluationsPending === 0, JSON.stringify(summary));
    check("R7.9 encerramento operacional NÃO é inferido enquanto houver ação em andamento", summary.operationallyFinished === false && summary.byStatus.concluida === 1);
  } else {
    check("R7.6 plano e ação carregados", false);
  }

  console.log("\n── 11 · Governança aplicada (R8) ──");
  const g = await gov.loadGovernanceForSession({ accessToken: alfa });
  check("R8.1 registro: 16 entradas, todas em proposta; ninguém aprovado", g.ok && g.entries.length === 16 && g.counts.proposta === 16 && g.counts.aprovado_para_piloto === 0 && g.counts.validado_para_uso_definido === 0);
  check("R8.2 RH_ADMIN sem autoridade configurada: aprovação indisponível com motivo", g.ok && g.authority.canApprove === false && g.authority.configured === false && !!g.authority.reason);
  const prepNo = await gov.prepareGovernanceDecisionForSession({ accessToken: alfa, entryId: "D9", toState: "em_revisao", owner: "Responsável fictício", reviewer: "Revisor fictício" });
  check("R8.3 preparar decisão sem autoridade é recusado (authority_unavailable)", prepNo.ok && !prepNo.accepted && prepNo.reason === "authority_unavailable");
  process.env.VITALOS_IVO_METHOD_AUTHORITY_USER_IDS = reviewerId;
  const prepAdminStill = await gov.prepareGovernanceDecisionForSession({ accessToken: alfa, entryId: "D9", toState: "em_revisao", owner: "Responsável fictício", reviewer: "Revisor fictício" });
  const prepOk = await gov.prepareGovernanceDecisionForSession({ accessToken: revisora, entryId: "D9", toState: "em_revisao", owner: "Responsável fictício", reviewer: "Revisor fictício" });
  check("R8.4 com autoridade configurada, RH_ADMIN comum continua sem poder; a autoridade prepara", prepAdminStill.ok && !prepAdminStill.accepted && prepOk.ok && prepOk.accepted === true && prepOk.entry.state === "em_revisao" && prepOk.audit.test === true);
  const prepPilot = await gov.prepareGovernanceDecisionForSession({ accessToken: revisora, entryId: "D9", toState: "aprovado_para_piloto", owner: "Responsável fictício", reviewer: "Revisor fictício" });
  check("R8.5 aprovar sem transição válida, evidência e critérios é recusado", prepPilot.ok && !prepPilot.accepted && prepPilot.reason === "decision_invalid");
  delete process.env.VITALOS_IVO_METHOD_AUTHORITY_USER_IDS;
  const registryHashAfter = createHash("sha256").update(readFileSync(REGISTRY_FILE)).digest("hex");
  check("R8.6 preparar NÃO grava: o registro canônico permanece idêntico e D9 continua em proposta", registryHashBefore === registryHashAfter && getGovernanceEntry("D9")?.state === "proposta" && getGovernanceEntries().every((e) => e.state === "proposta"));

  console.log("\n── 12 · Isolamento Alfa × Beta e permissões ──");
  const betaView = await eff.loadEfficacyForSession({ accessToken: beta });
  check("ISO.1 Beta carrega C8 vazio (nada da Alfa)", betaView.ok && betaView.items.length === 0);
  const betaWrites = await Promise.all([
    eff.saveEfficacyDraft({ accessToken: beta, itemId: A, fields: { objective: "invasão" } }),
    eff.registerEfficacyProtocol({ accessToken: beta, itemId: A }),
    eff.recordEfficacyObservation({ accessToken: beta, itemId: A, observedOn: today, value: 1 }),
    eff.recordEfficacyVerdict({ accessToken: beta, itemId: B, verdict: "inconclusiva", evidenceGrade: "descritiva", reason: "invasão de teste" }),
    eff.startEfficacyRevision({ accessToken: beta, itemId: A }),
  ]);
  check("ISO.2 Beta não escreve C8 em item da Alfa (item_not_found)", betaWrites.every((r) => r.ok && !r.accepted && r.reason === "item_not_found"));
  const memberView = await eff.loadEfficacyForSession({ accessToken: membro });
  const noSession = await eff.loadEfficacyForSession({});
  check("ISO.3 membro sem papel administrativo e sessão ausente são recusados", !memberView.ok && memberView.category === "forbidden" && !noSession.ok && noSession.category === "unauthenticated");
  const tables = ["efficacy_protocols", "efficacy_observations", "efficacy_verdicts"];
  const betaRest = await Promise.all(tables.map((t) => rest(`/${t}?org_id=eq.${ORG_ALFA}&select=id`, beta)));
  const alfaRest = await Promise.all(tables.map((t) => rest(`/${t}?select=id`, alfa)));
  check("ISO.4 RLS via PostgREST: JWT da Beta lê 0 linhas da Alfa; JWT da Alfa lê as suas", betaRest.every((r) => rowsOf(r).length === 0) && rowsOf(alfaRest[0]!).length === 3 && rowsOf(alfaRest[1]!).length === 2 && rowsOf(alfaRest[2]!).length === 4, JSON.stringify(alfaRest.map((r) => rowsOf(r).length)));
  const direct = await Promise.all([
    rest("/efficacy_protocols", alfa, { method: "POST", body: JSON.stringify({ org_id: ORG_ALFA, item_id: A, revision: 9, status: "draft", created_by: reviewerId }) }),
    rest(`/efficacy_protocols?item_id=eq.${A}`, alfa, { method: "PATCH", body: JSON.stringify({ objective: "direto" }) }),
    rest(`/efficacy_protocols?item_id=eq.${A}`, alfa, { method: "DELETE" }),
    rest("/efficacy_verdicts", alfa, { method: "POST", body: JSON.stringify({ org_id: ORG_ALFA, verdict: "meta_atingida" }) }),
    rest("/efficacy_observations", alfa, { method: "POST", body: JSON.stringify({ org_id: ORG_ALFA, value: 1 }) }),
  ]);
  check("ISO.5 escrita direta pelo cliente (POST/PATCH/DELETE) é negada, até para a org dona", direct.every((r) => denied(r.status)), JSON.stringify(direct.map((r) => r.status)));
  const anonRest = await rest("/efficacy_protocols?select=id", null);
  check("ISO.6 anon não lê o C8", denied(anonRest.status) || rowsOf(anonRest).length === 0);
  const allJson = await psql(`SELECT COALESCE(json_agg(t), '[]')::TEXT FROM (SELECT to_jsonb(p) AS r FROM public.efficacy_protocols p UNION ALL SELECT to_jsonb(o) FROM public.efficacy_observations o UNION ALL SELECT to_jsonb(v) FROM public.efficacy_verdicts v) t;`);
  check("ISO.7 tabelas C8 não carregam tokens de sessão nem respostas individuais", !allJson.includes(alfa) && !allJson.includes(revisora) && !allJson.includes("answers") && !allJson.includes("item_means"));

  writeFileSync(C8_STATE, JSON.stringify({ A, B, C, reviewerId }));
}

// ── Fase READ (processo novo) ───────────────────────────────────────────────
async function readPhase(): Promise<void> {
  const eff = await import("../src/lib/ivo/efficacy-protocol.server");
  const loop = await import("../src/lib/ivo/fibt-action-loop.server");
  const edu = await import("../src/lib/ivo/ivo-education.server");
  const { buildActionTimeline, summarizePlan } = await import("../src/lib/ivo/action-follow-up");
  const { parseContentRef } = await import("../src/lib/ivo/content-ref");
  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const { A, B, C } = JSON.parse(readFileSync(C8_STATE, "utf8")) as { A: string; B: string; C: string };
  const alfa = await signIn("alfa_admin");
  const beta = await signIn("beta_admin");

  console.log("\n── 13 · Persistência após recarregar (processo novo, sem override de teste) ──");
  const view = await eff.loadEfficacyForSession({ accessToken: alfa });
  const items = view.ok ? Object.fromEntries(view.items.map((i) => [i.itemId, i])) : {};
  check("C8.P1 protocolos e pareceres reaparecem com os mesmos estados", items[A]?.state === "meta_atingida" && items[B]?.state === "meta_nao_atingida" && items[C]?.state === "inconclusiva");
  check("C8.P2 observações persistidas; sobre leitura publicada não há valor", items[A]?.observations[0]?.value === CRITERIOS.favoravel.observado && items[B]?.observations[0]?.value === CRITERIOS.desfavoravel.observado && items[C]?.observations.length === 0);
  check("C8.P3 pareceres continuam identificados como TESTE SINTÉTICO (fonte gravada no banco)", [A, B, C].every((id) => items[id]?.verdict?.governance.source === "teste_sintetico"));
  check("C8.P4 sem override, o gate volta a D9 'proposta' e nenhum parecer novo conclusivo seria aceito", view.ok && view.governance.conclusiveAllowed === false && view.governance.source === "registro_canonico" && view.governance.state === "proposta");
  check("C8.P5 nenhum rascunho aberto; revisão vigente = 1 nos três", [A, B, C].every((id) => items[id]?.draft === null && items[id]?.registered?.revision === 1));
  const loopNow = await loop.loadFibtActionLoop({ accessToken: alfa });
  const plan = loopNow.ok ? loopNow.plans[0] : undefined;
  const actionA = plan?.actions.find((a) => a.id === A);
  const actionB = plan?.actions.find((a) => a.id === B);
  check("C8.P6 estado operacional da ação é independente da avaliação (A em execução · B concluída)", actionA?.status === "em_execucao" && actionB?.status === "concluida");
  check("R7.P1 aprendizagem vinculada reaparece com o conteúdo de TESTE; execução separada", !!actionA && actionA.evidence.execution.length === 1 && actionA.evidence.learning.some((e) => parseContentRef(e.content)?.contentId === "TESTE-bem_estar-001"));
  if (plan && actionA && view.ok) {
    const timeline = buildActionTimeline(actionA, plan, items[A] ?? null, parseContentRef);
    const summary = summarizePlan(plan, view.items.filter((i) => plan.actions.some((a) => a.id === i.itemId)));
    check("R7.P2 linha do tempo e resumo reconstruídos do banco", timeline.length >= 7 && summary.actions === 3 && summary.protocols.registered === 3 && summary.evaluationsPending === 0);
  }
  const catalog = await edu.loadEducationForSession({ accessToken: alfa });
  check("R7.P3 catálogo segue com curadoria pendente (0 aprovados)", catalog.ok && catalog.catalog.approvedCount === 0);

  // Integridade pelo caminho do servidor (service_role): registrado é imutável, sem DELETE.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  const upd = await admin.from("efficacy_protocols").update({ objective: "forçado" }).eq("id", items[A]?.registered?.id ?? "");
  const del = await admin.from("efficacy_verdicts").delete().eq("protocol_id", items[A]?.registered?.id ?? "");
  const updV = await admin.from("efficacy_verdicts").update({ reason: "forçado" }).eq("protocol_id", items[A]?.registered?.id ?? "");
  check("C8.P7 registrado/parecer: UPDATE e DELETE recusados pelo banco mesmo com service_role", !!upd.error && !!del.error && !!updV.error);

  const betaView = await eff.loadEfficacyForSession({ accessToken: beta });
  check("ISO.P1 Beta continua sem ver nada do C8 da Alfa", betaView.ok && betaView.items.length === 0);
}

const phase = process.argv[2];
try {
  if (phase === "write") await writePhase();
  else if (phase === "read") await readPhase();
  else {
    console.error("Use: bun run scripts/ivo-local-c8-proof.ts write|read (ou bun run demo:ivo:proof)");
    process.exit(2);
  }
} catch (error) {
  check(`exceção na fase ${phase}`, false, (error as Error).message);
}

const failed = results.filter((r) => !r.ok);
console.log(`\nfase=c8:${phase} · verificações=${results.length} · falhas=${failed.length}`);
process.exit(failed.length > 0 ? 1 : 0);
