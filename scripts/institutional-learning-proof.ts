// Prova exclusivamente local. Tokens e respostas permanecem em memória.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { institutionalEnv, institutionalSql, institutionalWorkdir } from "./institutional-local";
import { requireInstitutionalLocalTarget } from "../src/lib/env/institutional-local-target";

// Usa o transporte instalado do próprio framework, inclusive a serialização.
import { toJSONAsync, fromCrossJSON } from "seroval";

const env = await institutionalEnv();
requireInstitutionalLocalTarget(
  env.SUPABASE_URL,
  env.INSTITUTIONAL_DB_URL,
  "supabase_db_vitalos-institutional-first-admin",
);
const origin = "http://localhost:8091";
const results: { name: string; pass: boolean }[] = [];
function check(name: string, pass: unknown) {
  results.push({ name, pass: !!pass });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) throw new Error("Prova interrompida: " + name);
}
const modules = new Map<string, string>();
async function http(file: string, name: string, data: unknown): Promise<any> {
  if (!modules.has(file)) {
    const response = await fetch(`${origin}/src/lib/api/${file}.functions.ts`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error("Módulo HTTP local indisponível.");
    modules.set(file, await response.text());
  }
  const id = new RegExp(`export const ${name} = [^\\n]+createClientRpc\\("([^"]+)"`).exec(
    modules.get(file)!,
  )?.[1];
  if (!id) throw new Error("Server function não localizada: " + name);
  const payload = JSON.stringify(await toJSONAsync({ data }));
  const response = await fetch(`${origin}/_serverFn/${id}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-tsr-serverFn": "true",
      origin,
    },
    body: payload,
    signal: AbortSignal.timeout(30000),
  });
  const json = await response.json();
  const value: any = response.headers.has("x-tss-serialized") ? fromCrossJSON(json, {}) : json;
  if (!response.ok || value instanceof Error || value?.error)
    throw new Error("Chamada HTTP local recusada: " + name);
  return value?.result ?? value;
}
async function login(email: string) {
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: "Synthetic-local-only-2026!",
  });
  if (error || !data.session) throw new Error("Login sintético falhou.");
  return { client, accessToken: data.session.access_token, userId: data.user!.id };
}

const alfa = await login("alfa@institutional.test");
const beta = await login("beta@institutional.test");
const platform = await login("platform@institutional.test");
const profile = await alfa.client.from("profiles").select("org_id").eq("id", alfa.userId).single();
const betaProfile = await beta.client
  .from("profiles")
  .select("org_id")
  .eq("id", beta.userId)
  .single();
if (!profile.data || !betaProfile.data)
  throw new Error("Vínculos sintéticos prévios ausentes; não foram recriados.");
const inventory = await http("module-access", "listPlatformModulesFn", {
  accessToken: platform.accessToken,
});
if (!inventory.ok) throw new Error("Autoridade local indisponível.");
const orgA = inventory.organizations.find((o: any) => o.id === profile.data.org_id);
const orgB = inventory.organizations.find((o: any) => o.id === betaProfile.data.org_id);
check(
  "Alfa e Beta sintéticas identificadas sem duplicar organização",
  orgA?.slug === "institutional-alfa" && orgB?.slug === "institutional-beta",
);
check(
  "prova parte de Q2 habilitado com Q1 desabilitado",
  orgA.modules.find((m: any) => m.module === "Q2")?.enabled &&
    !orgA.modules.find((m: any) => m.module === "Q1")?.enabled,
);
if (process.argv.includes("--readback")) {
  const recorded = JSON.parse(
    readFileSync(join(institutionalWorkdir, "learning-proof.json"), "utf8"),
  );
  const outcome = await http("ivo-action-loop", "loadFibtActionLoopFn", {
    accessToken: alfa.accessToken,
  });
  const action =
    outcome.ok &&
    outcome.plans.flatMap((p: any) => p.actions).find((a: any) => a.id === recorded.itemId);
  check(
    "processo independente confirma aplicação e dois escopos persistidos",
    action &&
      action.description.includes("[conteudo:TESTE-bem_estar-001@0.0.1-teste]") &&
      action.evidence.execution.length === 1 &&
      action.evidence.learning.length === 1 &&
      action.efficacy.status === "not_evaluated",
  );
  const foreign = await beta.client.from("action_items").select("id").eq("id", recorded.itemId);
  check(
    "processo independente confirma isolamento de Beta",
    !foreign.error && foreign.data.length === 0,
  );
  for (const session of [alfa, beta, platform])
    await session.client.auth.signOut({ scope: "local" });
  writeFileSync(
    join(institutionalWorkdir, "learning-readback.json"),
    JSON.stringify(
      { recordedAt: new Date().toISOString(), separateProcess: true, results },
      null,
      2,
    ),
  );
  process.exit(0);
}
async function setModule(orgId: string, enabled: boolean) {
  const inv = await http("module-access", "listPlatformModulesFn", {
    accessToken: platform.accessToken,
  });
  const revision = inv.organizations
    .find((o: any) => o.id === orgId)
    .modules.find((m: any) => m.module === "Q2").revision;
  const result = await http("module-access", "changeModuleFn", {
    accessToken: platform.accessToken,
    organizationId: orgId,
    module: "Q2",
    enabled,
    expectedRevision: revision,
    requestId: crypto.randomUUID(),
  });
  if (!result.ok) throw new Error("Alteração sintética de módulo recusada.");
}
const reading = await http("ivo-q2-reading", "loadIvoQ2Reading", { accessToken: alfa.accessToken });
check(
  "leitura Q2 publicada reutilizada; nenhuma coleta repetida",
  reading.ok && reading.state === "ready",
);
const sector = reading.view.sectors.find(
  (s: any) => s.group === "available" && s.factors?.some((f: any) => f.id === "bem_estar"),
);
if (!sector) throw new Error("Fonte publicada bem_estar ausente. Não foi fabricada.");
const education = await http("ivo-governance", "loadEducationFn", {
  accessToken: alfa.accessToken,
});
const content =
  education.ok &&
  education.byFactor.bem_estar?.find((c: any) => c.contentId === "TESTE-bem_estar-001");
check(
  "conteúdo/atividade TESTE visíveis apenas na fixture permitida",
  content?.status === "TESTE" &&
    content.activity?.checks.length === 2 &&
    education.catalog.approvedCount === 0,
);
let loop = await http("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: alfa.accessToken });
if (!loop.ok)
  throw new Error("Ledger local não habilitado. Use dev --learning, sem mudar o registro global.");
let plan = loop.plans.find(
  (p: any) => p.cycleKeyCanonical === reading.view.cycleKey && p.status !== "closed",
);
if (!plan) {
  const created = await http("ivo-action-loop", "createFibtPriorityActionsFn", {
    accessToken: alfa.accessToken,
    waveId: reading.view.wave.id,
    priorities: [
      {
        cohortId: sector.cohortId,
        factorId: "bem_estar",
        title: "Organizar condições para prática de equipe — TESTE",
        description: "Preparação sintética, sem afirmação de efeito.",
        effort: "baixo",
      },
    ],
  });
  check("plano inicial criado pelo contrato existente", created.ok && created.accepted);
  loop = await http("ivo-action-loop", "loadFibtActionLoopFn", { accessToken: alfa.accessToken });
  plan = loop.plans.find((p: any) => p.id === created.id);
}
if (!plan) throw new Error("Plano não resolvido.");
const dueOn = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
if (plan.status === "draft") {
  for (const action of plan.actions) {
    const account = await http("ivo-action-loop", "setFibtActionAccountabilityFn", {
      accessToken: alfa.accessToken,
      itemId: action.id,
      ownerRoleLabel: "Facilitação sintética",
      dueOn,
      executionMetric: { label: "Encontros combinados", baseline: 0, target: 1, unit: "encontro" },
    });
    check("responsável/prazo/indicador da preparação registrados", account.ok && account.accepted);
  }
  const activated = await http("ivo-action-loop", "activateFibtActionPlanFn", {
    accessToken: alfa.accessToken,
    planId: plan.id,
  });
  check("plano ativado sem parecer de eficácia", activated.ok && activated.accepted);
}
const application = {
  accessToken: alfa.accessToken,
  planId: plan.id,
  requestId: crypto.randomUUID(),
  waveId: reading.view.wave.id,
  cohortId: sector.cohortId,
  factorId: "bem_estar",
  title: "Aplicação educativa sintética — combinar tempo e apoio",
  description: "Combinar um encontro e registrar barreiras organizacionais, sem nomes de pessoas.",
  effort: "baixo",
  accountability: {
    ownerRoleLabel: "Facilitação sintética",
    dueOn,
    executionMetric: { label: "Encontro realizado", baseline: 0, target: 1, unit: "encontro" },
  },
  contentId: content.contentId,
  contentVersion: content.version,
  activityVersion: content.activity.version,
};
const before = await alfa.client.from("action_items").select("id").eq("plan_id", plan.id);
const concurrent = await Promise.all([
  http("ivo-learning-application", "createLearningApplicationFn", application),
  http("ivo-learning-application", "createLearningApplicationFn", application),
]);
check(
  "aplicação educativa concorrente tem um único efeito",
  concurrent.every((r) => r.ok && r.accepted) && concurrent[0].id === concurrent[1].id,
);
const after = await alfa.client.from("action_items").select("id").eq("plan_id", plan.id);
check(
  "nenhuma ação parcial ou duplicada",
  !before.error && !after.error && after.data.length === before.data.length + 1,
);
const itemId = concurrent[0].id;
for (const patch of [
  { contentVersion: "antiga" },
  { activityVersion: "antiga" },
  { factorId: "satisfacao_empresa" },
]) {
  const result = await http("ivo-learning-application", "createLearningApplicationFn", {
    ...application,
    requestId: crypto.randomUUID(),
    ...patch,
  });
  check("versão/fator adulterado recusado", result.ok && !result.accepted);
}
let rejectedAnswers = false;
try {
  await http("ivo-learning-application", "createLearningApplicationFn", {
    ...application,
    answers: { recuperar: "acordo" },
  });
} catch {
  rejectedAnswers = true;
}
check("contrato HTTP não aceita respostas pedagógicas para persistência", rejectedAnswers);
const today = new Date().toISOString().slice(0, 10);
for (const scope of ["execucao", "aprendizagem"]) {
  const result = await http("ivo-action-loop", "recordFibtActionEvidenceFn", {
    accessToken: alfa.accessToken,
    itemId,
    scope,
    kind: "texto",
    content:
      scope === "execucao"
        ? "Encontro sintético realizado conforme combinação."
        : "O tempo precisou ser combinado com a gestão; sem conclusão de eficácia.",
    occurredOn: today,
    ...(scope === "aprendizagem"
      ? { contentId: content.contentId, contentVersion: content.version }
      : {}),
  });
  check(`${scope} registrada separadamente pelo ledger existente`, result.ok && result.accepted);
}
const stale = await http("ivo-action-loop", "recordFibtActionEvidenceFn", {
  accessToken: alfa.accessToken,
  itemId,
  scope: "aprendizagem",
  content: "Versão antiga não deve ser registrada.",
  occurredOn: today,
  contentId: content.contentId,
  contentVersion: "antiga",
});
check("registro de aprendizagem também recusa conteúdo desatualizado", stale.ok && !stale.accepted);
const betaInitial = orgB.modules.find((m: any) => m.module === "Q2").enabled;
try {
  await setModule(orgB.id, true);
  const cross = await http("ivo-learning-application", "createLearningApplicationFn", {
    ...application,
    accessToken: beta.accessToken,
    requestId: crypto.randomUUID(),
  });
  check("Beta habilitada não aplica conteúdo ao plano da Alfa", cross.ok && !cross.accepted);
  await setModule(orgA.id, false);
  const disabled = await http("ivo-learning-application", "createLearningApplicationFn", {
    ...application,
    requestId: crypto.randomUUID(),
  });
  check(
    "sessão aberta perde autorização após desabilitação",
    !disabled.ok && disabled.category === "module_disabled",
  );
} finally {
  await setModule(orgB.id, betaInitial);
  await setModule(orgA.id, true);
}
// Novo login, cliente independente do que escreveu. Sem service_role na prova de leitura.
const fresh = await login("alfa@institutional.test");
const reread = await http("ivo-action-loop", "loadFibtActionLoopFn", {
  accessToken: fresh.accessToken,
});
const persisted =
  reread.ok && reread.plans.flatMap((p: any) => p.actions).find((a: any) => a.id === itemId);
check(
  "nova sessão retoma origem, aplicação e evidências sem respostas privadas",
  persisted &&
    persisted.description.startsWith(`[conteudo:${content.contentId}@${content.version}]`) &&
    persisted.evidence.execution.length === 1 &&
    persisted.evidence.learning.length === 1 &&
    persisted.efficacy.status === "not_evaluated" &&
    !JSON.stringify(persisted).includes('"answers"'),
);
const foreignRows = await beta.client.from("action_items").select("id").eq("id", itemId);
check("RLS impede releitura direta por Beta", !foreignRows.error && foreignRows.data.length === 0);
for (const session of [alfa, beta, platform, fresh])
  await session.client.auth.signOut({ scope: "local" });
writeFileSync(
  join(institutionalWorkdir, "learning-proof.json"),
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      itemId,
      results,
      maturity: "HTTP/DB local; conteúdo TESTE; sem validação com clientes",
    },
    null,
    2,
  ),
);
