// MO2 · jornada Q2 completa na pilha descartável vitalos-q1q2-integ (loopback, dados sintéticos).
// Pré-requisitos: pilha no ar (README), cadeia aplicada e `bun --no-env-file scripts/integ-local/app.ts` em 8094.
// Entrada normal: HTTP às server functions do app (mesmo caminho das telas) + login por senha sintética.
// Alfa: plano Piloto (como o Instituto), Q1+Q2, SST cadastrado. Beta: plano Piloto, Q1+Q2, sem SST,
// setor com 4 respostas (abaixo do limiar de publicação). Imprime só PASS/FAIL por linha.
// Uso: bun --no-env-file scripts/integ-local/mo2-journey.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

const here = import.meta.dir;
const repo = join(here, "..", "..");
const g = Bun.spawnSync(["sh", join(here, "guard.sh")]);
if (g.exitCode !== 0) throw new Error(g.stdout.toString());
const keys = Object.fromEntries(
  readFileSync(join(here, ".env.integ"), "utf8").trim().split(/\r?\n/).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const API = "http://127.0.0.1:57921";
Object.assign(process.env, {
  SUPABASE_URL: API, VITE_SUPABASE_URL: API, SUPABASE_PUBLISHABLE_KEY: keys.ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY: keys.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: keys.SERVICE_ROLE_KEY, VITALOS_RUNTIME_ENV: "local", VITALOS_DB_TARGET: "local",
  PLATFORM_ADMIN_EMAILS: "platform@integ.test", VITE_FIBT_PILOT_ENABLED: "true", VITALOS_LOCAL_FIXTURE_CAPABILITIES: "ACTION_PLAN",
});
process.chdir(repo);
const { createClient } = await import(Bun.resolveSync("@supabase/supabase-js", repo));
const { toJSONAsync, fromCrossJSON } = await import(Bun.resolveSync("seroval", repo));
const origin = "http://localhost:8094";
const PASSWORD = "Synthetic-local-only-2026!";
let failures = 0;
const step = (id: string, papel: string, acao: string, ok: boolean, obs = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${id} · ${papel} · ${acao}${obs ? " · " + obs : ""}`);
  if (!ok) failures++;
};

// Chamada de server function sem lançar: devolve { httpOk, value }.
const mods = new Map<string, string>();
async function call(file: string, name: string, data: unknown): Promise<{ httpOk: boolean; value: any }> {
  if (!mods.has(file)) {
    const r = await fetch(`${origin}/src/lib/api/${file}.functions.ts`);
    if (!r.ok) throw new Error("app indisponível em 8094");
    mods.set(file, await r.text());
  }
  const id = new RegExp(`export const ${name} = [^\\n]+createClientRpc\\("([^"]+)"`).exec(mods.get(file)!)?.[1];
  if (!id) throw new Error("server fn ausente: " + name);
  const r = await fetch(`${origin}/_serverFn/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "x-tsr-serverFn": "true", origin },
    body: JSON.stringify(await toJSONAsync({ data })),
  });
  let value: any = null;
  try {
    const json = await r.json();
    value = r.headers.has("x-tss-serialized") ? fromCrossJSON(json, {}) : json;
    value = value?.result ?? value;
  } catch { /* corpo vazio */ }
  return { httpOk: r.ok && !(value instanceof Error), value };
}
const okv = (r: { httpOk: boolean; value: any }) =>
  r.httpOk && r.value && r.value.ok !== false && r.value.accepted !== false && !r.value.error;
const brief = (v: any) => (v == null ? "null" : typeof v === "object" ? JSON.stringify(Object.fromEntries(Object.entries(v).filter(([k]) => ["ok", "accepted", "reason", "status", "state", "error", "message", "replayed"].includes(k)))).slice(0, 160) : String(v).slice(0, 120));

const admin = createClient(API, keys.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function login(email: string) {
  const c = createClient(API, keys.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error("login sintético falhou: " + email.split("@")[0]);
  return { accessToken: data.session.access_token, userId: data.user!.id };
}
const roleCount = async (orgId: string, role: string) =>
  (await admin.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("role", role)).count ?? 0;

// ── P · Preparação ────────────────────────────────────────────────────────────
const people = ["platform", "rh.alfa", "rh2.alfa", "colab.alfa", "lider.alfa", "sst.alfa", "rh.beta", "colab.beta"];
for (const p of people) {
  const { error } = await admin.auth.admin.createUser({ email: `${p}@integ.test`, password: PASSWORD, email_confirm: true });
  if (error && !/already|registered/i.test(error.message)) step("P1", "plataforma", `identidade ${p}`, false, error.message);
}
step("P1", "plataforma", "identidades sintéticas", true, `${people.length}`);
const platform = await login("platform@integ.test");
const { issueFirstAdmin, acceptFirstAdmin } = await import(join(repo, "src/lib/identity/first-admin.server.ts"));
const orgs: Record<"alfa" | "beta", string> = { alfa: "", beta: "" };
for (const t of ["alfa", "beta"] as const) {
  const slug = `mo2-${t}`;
  const found = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
  orgs[t] = found.data?.id ?? (await admin.from("organizations").insert({ name: `Empresa Fictícia ${t === "alfa" ? "Alfa" : "Beta"}`, slug, pack_id: "enterprise", plan: "pilot" }).select("id").single()).data!.id;
  const rh = await login(`rh.${t}@integ.test`);
  if ((await roleCount(orgs[t], "RH_ADMIN")) === 0) {
    const inv = { accessToken: platform.accessToken, organizationId: orgs[t], email: `rh.${t}@integ.test`, requestId: randomUUID(), token: randomBytes(32).toString("hex") };
    const ok = (await issueFirstAdmin(inv)).ok && (await acceptFirstAdmin({ accessToken: rh.accessToken, token: inv.token }, true)).ok;
    step("P2", "plataforma", `ativação ${t} (plano Piloto) e primeiro RH`, ok);
  } else step("P2", "plataforma", `ativação ${t} e primeiro RH`, true, "existente");
  for (const module of ["Q1", "Q2"] as const) {
    const inv = await call("module-access", "listPlatformModulesFn", { accessToken: platform.accessToken });
    const m = inv.value?.organizations?.find((o: any) => o.id === orgs[t])?.modules.find((x: any) => x.module === module);
    if (m?.enabled) continue;
    const r = await call("module-access", "changeModuleFn", { accessToken: platform.accessToken, organizationId: orgs[t], module, enabled: true, expectedRevision: m?.revision ?? 0, requestId: randomUUID() });
    step("P3", "plataforma", `${t} ${module} habilitado`, okv(r), brief(r.value));
  }
}

// ── I · Convites e assentos no plano Piloto ──────────────────────────────────
const rhA = await login("rh.alfa@integ.test");
for (const [who, role] of [["colab", "COLABORADOR"], ["lider", "LIDER_EQUIPE"], ["sst", "SST_PROFISSIONAL"]] as const) {
  if ((await roleCount(orgs.alfa, role)) > 0) { step("I1", "RH Alfa", `convite ${role}`, true, "existente"); continue; }
  const p = await login(`${who}.alfa@integ.test`);
  const inv = await call("member-invite", "createMemberInviteLink", { accessToken: rhA.accessToken, email: `${who}.alfa@integ.test`, role });
  const acc = await call("member-invite", "submitMemberInviteAcceptance", { accessToken: p.accessToken, token: inv.value?.token });
  step("I1", "RH Alfa → " + role, "convite e aceite no Piloto (não consome assento administrativo)", okv(inv) && acc.value?.ok && acc.value?.orgId === orgs.alfa && acc.value?.role === role, brief(inv.value));
  if (role === "COLABORADOR") {
    const again = await call("member-invite", "submitMemberInviteAcceptance", { accessToken: p.accessToken, token: inv.value?.token });
    step("I3", "colaborador Alfa", "aceitar o mesmo convite de novo é recusado", !again.value?.ok, brief(again.value));
  }
}
const adminSeat = await call("member-invite", "createMemberInviteLink", { accessToken: rhA.accessToken, email: "rh2.alfa@integ.test", role: "RH_ADMIN" });
step("I2", "RH Alfa → RH_ADMIN", "segundo administrador recusado no Piloto", !okv(adminSeat) && /upgrade/i.test(JSON.stringify(adminSeat.value ?? "")), brief(adminSeat.value));
const rhB = await login("rh.beta@integ.test");
if ((await roleCount(orgs.beta, "COLABORADOR")) === 0) {
  const p = await login("colab.beta@integ.test");
  const inv = await call("member-invite", "createMemberInviteLink", { accessToken: rhB.accessToken, email: "colab.beta@integ.test", role: "COLABORADOR" });
  const acc = await call("member-invite", "submitMemberInviteAcceptance", { accessToken: p.accessToken, token: inv.value?.token });
  step("I1", "RH Beta → COLABORADOR", "convite e aceite (empresa sem SST)", okv(inv) && acc.value?.ok, brief(acc.value));
}

// D7 · o plano Piloto só permite COPSOQ: a onda FIB-T é recusada. Prova a recusa e, para seguir
// a jornada sintética, passa as duas empresas para Growth (decisão comercial do Instituto pendente).
for (const t of ["alfa", "beta"] as const) {
  const { data: o } = await admin.from("organizations").select("plan").eq("id", orgs[t]).single();
  if (o?.plan !== "pilot") continue;
  const rh = await login(`rh.${t}@integ.test`);
  const blocked = await call("wave-admin", "adminCreateWave", { accessToken: rh.accessToken, instrument: "FIB_T", inviteCount: 5, linkModel: "SECTOR", label: "MO2-piloto" });
  step("D7", `RH ${t}`, "onda FIB-T recusada no plano Piloto", !okv(blocked), brief(blocked.value));
  await admin.from("organizations").update({ plan: "growth" }).eq("id", orgs[t]);
  step("D7", "plataforma", `${t} passa a Growth para seguir o ensaio (decisão comercial pendente)`, true);
}

// I4 · duas emissões simultâneas com um assento livre (Growth = 5): exatamente uma passa.
{
  for (const n of [1, 2, 3]) {
    const pre = await call("member-invite", "createMemberInviteLink", { accessToken: rhA.accessToken, email: `adm${n}.alfa@integ.test`, role: "RH_ADMIN" });
    if (!okv(pre)) step("I4", "RH Alfa", `pré-condição: convite administrativo ${n}`, false, brief(pre.value));
  }
  const both = await Promise.all(
    ["adm4", "adm5"].map((e) => call("member-invite", "createMemberInviteLink", { accessToken: rhA.accessToken, email: `${e}.alfa@integ.test`, role: "RH_ADMIN" })),
  );
  const accepted = both.filter(okv).length;
  const refused = both.filter((x) => /Limite de administradores/.test(JSON.stringify(x.value ?? ""))).length;
  step("I4", "RH Alfa (2 pedidos simultâneos)", "com 1 assento livre, exatamente um convite administrativo é criado", accepted === 1 && refused === 1, `aceitos ${accepted}, recusados ${refused}`);
  const colabStill = await call("member-invite", "createMemberInviteLink", { accessToken: rhA.accessToken, email: "colab2.alfa@integ.test", role: "COLABORADOR" });
  step("I4", "RH Alfa", "assentos administrativos cheios não bloqueiam convite de colaborador", okv(colabStill), brief(colabStill.value));
}

// Onda FIB-T + setor + respostas anônimas por link. Alfa: 5 (publica). Beta: 4 (abaixo do limiar).
const { loadFibtManagerControlCenterAsAdmin } = await import(join(repo, "src/lib/fibt/fibt-manager-control-center.server.ts"));
const { advanceCohortPublication } = await import(join(repo, "src/lib/fibt/fibt-cohort-publication.server.ts"));
const { getFibtManifest } = await import(join(repo, "src/domain/instruments/fibt/fibt-instrument.ts"));
const answers = getFibtManifest().items.map((i: { id: string }) => ({ itemId: i.id, value: 3 }));
const waves: Record<string, string> = {};
for (const [t, n] of [["alfa", 5], ["beta", 4]] as const) {
  const rh = await login(`rh.${t}@integ.test`);
  let waveId = (await admin.from("waves").select("id").eq("org_id", orgs[t]).eq("label", "MO2").maybeSingle()).data?.id as string | undefined;
  if (!waveId) {
    const w = await call("wave-admin", "adminCreateWave", { accessToken: rh.accessToken, instrument: "FIB_T", inviteCount: 5, linkModel: "SECTOR", label: "MO2" });
    step("P4", `RH ${t}`, "onda FIB-T (Growth, após D7)", okv(w), brief(w.value));
    waveId = w.value?.waveId;
  }
  waves[t] = waveId!;
  if (!(await admin.from("wave_cohorts").select("id").eq("wave_id", waveId).ilike("key", "equipe").maybeSingle()).data) {
    const s = await call("sector-operations", "adminCreateWaveSector", { accessToken: rh.accessToken, waveId, key: "equipe", label: `Equipe ${t}` });
    step("P4", `RH ${t}`, "setor criado", !!s.value?.created, brief(s.value));
    const link = await call("sector-operations", "adminIssueWaveSectorLink", { accessToken: rh.accessToken, waveId, cohortKey: "equipe", expiresInDays: 7 });
    let accepted = 0;
    for (let i = 0; i < n; i++) if ((await call("sector-link", "submitSectorLinkResponse", { token: link.value?.token, answers, consentVersion: "2026.1" })).value?.accepted) accepted++;
    step("P4", "colaboradores (link anônimo)", `${n} respostas`, accepted === n, `${accepted}/${n}`);
  }
  await loadFibtManagerControlCenterAsAdmin(orgs[t], waveId!, { environment: "application", hmlAttested: false, publisherAccessToken: rh.accessToken }, { advancePublication: advanceCohortPublication });
}

// ── J · Jornada Q2 na Alfa ───────────────────────────────────────────────────
const reading = await call("ivo-q2-reading", "loadIvoQ2Reading", { accessToken: rhA.accessToken, waveId: waves.alfa });
const sectors: any[] = reading.value?.view?.sectors ?? [];
const available = sectors.filter((s) => s.group === "available");
step("J1", "RH Alfa", "leitura agregada publicada (n ≥ 5)", reading.value?.state === "ready" && available.length > 0, `${available.length} setor(es) disponível(is)`);
const { publishedActionSource } = await import(join(repo, "src/lib/ivo/published-action-source.ts"));
const first = available[0];
const eduEarly = await call("ivo-governance", "loadEducationFn", { accessToken: rhA.accessToken });
const approved = (c: any) => c.status === "APROVADO" && c.activity?.status === "APROVADO";
const withActivity = (first?.factors ?? []).find((f: any) => (eduEarly.value?.byFactor?.[f.id] ?? []).some(approved));
const chosenFactor = withActivity?.id ?? first?.factors?.[0]?.id;
const source = publishedActionSource(reading.value?.view, { cohortId: first?.cohortId, factorId: chosenFactor });
step("J1", "RH Alfa", "fator publicado com prática aprovada (D10)", !!withActivity, withActivity ? withActivity.id : "nenhum fator publicado tem atividade");
step("J1", "RH Alfa", "fonte de ação publicada (setor × fator)", !!source?.cohortId && !!source?.factorId, source ? `fator ${source.factorId}` : "sem fonte");

let loop = await call("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: rhA.accessToken });
let plan = (loop.value?.plans ?? [])[0];
if (!plan) {
  const created = await call("ivo-action-loop", "createFibtPriorityActionsFn", {
    accessToken: rhA.accessToken, waveId: waves.alfa,
    priorities: [{ cohortId: source.cohortId, factorId: source.factorId, title: "Ritual semanal de prioridades da equipe", description: "Ação sintética da MO2.", effort: "baixo" }],
  });
  step("J2", "RH Alfa", "plano criado a partir da prática/leitura aprovada", okv(created) && created.value?.accepted, brief(created.value));
  loop = await call("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: rhA.accessToken });
  plan = loop.value.plans[0];
}
const action = plan.actions[0];
const leaders: any[] = loop.value?.assignableLeaders ?? [];
const lider = await login("lider.alfa@integ.test");
const sst = await login("sst.alfa@integ.test");
const colab = await login("colab.alfa@integ.test");
const leaderIds = leaders.map((l) => l.userId ?? l.id);
step("J3", "RH Alfa", "responsáveis elegíveis: liderança sim, SST e colaborador não", leaderIds.includes(lider.userId) && !leaderIds.includes(sst.userId) && !leaderIds.includes(colab.userId), `${leaders.length} elegível(is)`);
if (!action.owner) {
  const due = new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
  const acc = await call("ivo-action-loop", "setFibtActionAccountabilityFn", { accessToken: rhA.accessToken, itemId: action.id, ownerRoleLabel: "Liderança da equipe", ownerUserId: lider.userId, dueOn: due, executionMetric: { label: "Rituais realizados", baseline: 0, target: 4, unit: "rituais" } });
  step("J3", "RH Alfa", "designação da liderança com prazo", okv(acc), brief(acc.value));
}
if (plan.status !== "active" && plan.status !== "closed") {
  const act = await call("ivo-action-loop", "activateFibtActionPlanFn", { accessToken: rhA.accessToken, planId: plan.id });
  step("J4", "RH Alfa", "plano ativado", okv(act), brief(act.value));
}
const today = new Date().toISOString().slice(0, 10);
const st = await call("ivo-action-loop", "recordFibtActionStatusFn", { accessToken: lider.accessToken, itemId: action.id, toStatus: "em_execucao", note: "Início sintético." });
step("J5", "Liderança Alfa", "execução iniciada pela própria tarefa", okv(st), brief(st.value));
const ev = await call("ivo-action-loop", "recordFibtActionEvidenceFn", { accessToken: lider.accessToken, itemId: action.id, scope: "execucao", kind: "texto", content: "Primeiro ritual realizado com a equipe (sintético).", occurredOn: today });
step("J5", "Liderança Alfa", "evidência de execução registrada", okv(ev), brief(ev.value));

const edu = await call("ivo-governance", "loadEducationFn", { accessToken: rhA.accessToken });
const content = (edu.value?.byFactor?.[action.source.factorId] ?? []).find((c: any) => c.status === "APROVADO" && c.activity?.status === "APROVADO");
if (content) {
  const base = {
    accessToken: rhA.accessToken, planId: plan.id, waveId: waves.alfa, cohortId: action.source.cohortId, factorId: action.source.factorId,
    effort: "baixo",
    accountability: { ownerRoleLabel: "Liderança da equipe", ownerUserId: lider.userId, dueOn: new Date(Date.now() + 28 * 864e5).toISOString().slice(0, 10), executionMetric: { label: "Aplicações registradas", baseline: 0, target: 1, unit: "aplicação" } },
    contentId: content.contentId, contentVersion: content.version, activityVersion: content.activity.version,
  };
  // (a) aplicação planejada da prática aprovada (D10) no plano ativo
  const appBody = { ...base, requestId: randomUUID(), title: "Aplicação da prática aprovada", description: "Aplicação sintética da prática aprovada." };
  const la = await call("ivo-learning-application", "createLearningApplicationFn", appBody);
  step("J6", "RH Alfa", "aplicação da prática aprovada registrada no plano", okv(la), brief(la.value));
  const again = await call("ivo-learning-application", "createLearningApplicationFn", appBody);
  const afterApp = await call("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: rhA.accessToken });
  const appItems = (afterApp.value?.plans?.find((p: any) => p.id === plan.id)?.actions ?? []).filter((a: any) => a.id !== action.id);
  step("X5", "RH Alfa", "repetir o mesmo pedido não duplica a aplicação", okv(again) && appItems.length === 1, `${appItems.length} aplicação(ões)`);
  // (b) revisão: ajuste rastreável ligado à aplicação original (PI-13)
  const original = appItems[0];
  if (original) {
    const rv = await call("ivo-learning-application", "createLearningApplicationFn", { ...base, requestId: randomUUID(), title: "Ajuste após revisão", description: original.description, reviewOfItemId: original.id });
    step("J6", "RH Alfa", "revisão registra ajuste ligado à aplicação", okv(rv), brief(rv.value));
  }
} else step("J6", "RH Alfa", "conteúdo aprovado para o fator da ação", false, `fator ${action.source.factorId} sem atividade aprovada`);

const fb = await call("ivo-action-loop", "loadMemberPlanFeedbackFn", { accessToken: colab.accessToken });
const fbText = JSON.stringify(fb.value ?? {});
step("J7", "Colaborador Alfa", "devolutiva coletiva do plano", okv(fb) && fbText.includes("Ritual semanal"), brief(fb.value));
step("J7", "Colaborador Alfa", "devolutiva sem responsável nominal nem conteúdo de evidência", !fbText.includes(lider.userId) && !fbText.includes("Primeiro ritual realizado"));

// X8 · liderança não registra em ação atribuída a outra pessoa da mesma organização.
{
  const addRes = await call("ivo-action-loop", "addFibtActionToPlanFn", {
    accessToken: rhA.accessToken, planId: plan.id, requestId: randomUUID(), waveId: waves.alfa,
    cohortId: action.source.cohortId, factorId: action.source.factorId, title: "Ação conduzida pelo RH", description: "Sintético.", effort: "baixo",
    accountability: { ownerRoleLabel: "RH", ownerUserId: rhA.userId, dueOn: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), executionMetric: { label: "Encontros", baseline: 0, target: 2, unit: "encontros" } },
  });
  step("X8", "RH Alfa", "ação do RH adicionada ao plano ativo", okv(addRes), brief(addRes.value));
  const loopNow = await call("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: rhA.accessToken });
  const rhItem = loopNow.value?.plans?.find((p: any) => p.id === plan.id)?.actions?.find((a: any) => a.title === "Ação conduzida pelo RH");
  const leaderTry = await call("ivo-action-loop", "recordFibtActionStatusFn", { accessToken: lider.accessToken, itemId: rhItem?.id, toStatus: "em_execucao" });
  step("X8", "Liderança Alfa", "não altera ação atribuída a outra pessoa", !!rhItem && !okv(leaderTry), brief(leaderTry.value));
  const leaderView = await call("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: lider.accessToken });
  const seesRh = JSON.stringify(leaderView.value ?? {}).includes("Ação conduzida pelo RH");
  step("X8", "Liderança Alfa", "não vê a ação atribuída a outra pessoa", !seesRh);
}

// ── X · Separação, acesso indevido, limiar e persistência ────────────────────
const sstLoop = await call("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: sst.accessToken });
step("X1", "SST Alfa", "sem acesso ao ledger Q2", !okv(sstLoop) || (sstLoop.value?.plans ?? []).length === 0, brief(sstLoop.value));
const colabWrite = await call("ivo-action-loop", "recordFibtActionStatusFn", { accessToken: colab.accessToken, itemId: action.id, toStatus: "concluida" });
step("X1", "Colaborador Alfa", "não altera estado da ação", !okv(colabWrite), brief(colabWrite.value));
const betaLoop = await call("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: rhB.accessToken });
step("X2", "RH Beta", "não vê o plano da Alfa", !JSON.stringify(betaLoop.value ?? {}).includes(plan.id), brief(betaLoop.value));
const betaWrite = await call("ivo-action-loop", "recordFibtActionStatusFn", { accessToken: rhB.accessToken, itemId: action.id, toStatus: "interrompida" });
step("X2", "RH Beta", "não altera ação da Alfa pela API", !okv(betaWrite), brief(betaWrite.value));
const betaRead = await call("ivo-q2-reading", "loadIvoQ2Reading", { accessToken: rhB.accessToken, waveId: waves.beta });
const betaAvail = (betaRead.value?.view?.sectors ?? []).filter((s: any) => s.group === "available").length;
step("X3", "RH Beta", "setor com 4 respostas não é publicado", betaAvail === 0, `estado ${betaRead.value?.state ?? "?"}`);
const crossRead = await call("ivo-q2-reading", "loadIvoQ2Reading", { accessToken: rhB.accessToken, waveId: waves.alfa });
step("X2", "RH Beta", "não lê a onda da Alfa", !(crossRead.value?.view?.sectors ?? []).some((s: any) => s.group === "available"), `estado ${crossRead.value?.state ?? "?"}`);

const rhA2 = await login("rh.alfa@integ.test");
const after = await call("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: rhA2.accessToken });
const pa = after.value?.plans?.find((p: any) => p.id === plan.id);
const aa = pa?.actions?.find((a: any) => a.id === action.id);
step("X4", "RH Alfa (novo login)", "plano, estado e evidência persistem", pa?.status === "active" && aa?.status === "em_execucao" && (aa?.evidence?.execution?.length ?? 0) > 0, `plano ${pa?.status} · ação ${aa?.status} · evidências ${aa?.evidence?.execution?.length ?? 0}`);
step("J8", "RH Alfa", "evidência candidata ao Q5: execução registrada, eficácia não avaliada", aa?.efficacy?.status === "not_evaluated" && (aa?.evidence?.execution?.length ?? 0) > 0, `eficácia ${aa?.efficacy?.status}`);

const { loadRealExpeditionState } = await import(join(repo, "src/lib/nr1/expedition-real.server.ts"));
const exp = await loadRealExpeditionState(orgs.alfa, "enterprise");
step("X6", "servidor (Alfa)", "Expedição sem ciclo registrado lê 0 ciclos, sem erro", exp?.cycleCount === 0 && exp?.suppressed === false, `ciclos ${exp?.cycleCount}`);

{
  const psql = (sql: string) =>
    Bun.spawnSync(["docker", "exec", "-i", "vitalos-q1q2-integ-db", "psql", "-U", "postgres", "-d", "postgres", "-X", "-q", "-v", "ON_ERROR_STOP=1"], { stdin: new TextEncoder().encode(sql) }).exitCode === 0;
  const renamed = psql("ALTER TABLE public.org_cycle_registry RENAME TO org_cycle_registry_x9;");
  let threw = false;
  try { await loadRealExpeditionState(orgs.alfa, "enterprise"); } catch { threw = true; }
  const { loadOrgCycleHistory } = await import(join(repo, "src/lib/evolucao/cycle-history.server.ts"));
  let legacy: unknown = "erro";
  try { legacy = await loadOrgCycleHistory(orgs.alfa, "COPSOQ"); } catch { /* mantém "erro" */ }
  const restored = psql("ALTER TABLE public.org_cycle_registry_x9 RENAME TO org_cycle_registry;");
  step("X9", "servidor (falha induzida)", "erro de leitura vira falha (indisponível), não 'nenhum ciclo'", renamed && restored && threw, `lançou ${threw}`);
  step("X9", "servidor (falha induzida)", "sem failClosed o chamador antigo ainda veria lista vazia (por isso os 5 chamadores usam failClosed)", Array.isArray(legacy) && (legacy as unknown[]).length === 0);
}

const count = async (table: string, org: string) => (await admin.from(table).select("id", { count: "exact", head: true }).eq("org_id", org)).count ?? 0;
const ledger = {
  alfa: { planos: await count("action_plans", orgs.alfa), acoes: await count("action_items", orgs.alfa), evidencias: await count("evidence_records", orgs.alfa), log: await count("action_log", orgs.alfa) },
  beta: { planos: await count("action_plans", orgs.beta), acoes: await count("action_items", orgs.beta), evidencias: await count("evidence_records", orgs.beta), log: await count("action_log", orgs.beta) },
};
console.log("\nLeitura independente (service_role, contagens):", JSON.stringify(ledger));
step("X7", "leitura independente", "Beta sem nenhum registro de plano da Alfa", ledger.beta.planos === 0 && ledger.beta.acoes === 0 && ledger.alfa.evidencias > 0, "");
console.log(failures === 0 ? "\nMO2: todas as verificações passaram." : `\nMO2: ${failures} verificação(ões) falharam.`);
process.exit(failures === 0 ? 0 : 1);
