// IVO PI-13 — incluir ação em plano existente e encerrar plano (camada de servidor).
//
// A store é falsa e imita as regras que o BANCO impõe por gatilho (plano
// encerrado recusa, §13 em plano ativo, índice único da chave de idempotência,
// encerramento só com tudo em estado de saída). Aqui se prova o que é do
// servidor: sessão/papel/organização, revalidação da origem publicada, mesmo
// ciclo, idempotência, mensagens e mapeamento dos erros do banco. As garantias do
// próprio banco (gatilhos, concorrência real) são provadas em
// supabase/tests/09_ivo_plan_composition_closure.sql e em
// scripts/ivo-local-plan-proof.ts (Supabase local, processos separados).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import type { MembershipResult } from "@/lib/auth/authorize.server";
import type { FibtManagerStore, FibtManagerWaveRow } from "@/lib/fibt/fibt-manager-control-center.server";
import { ivoActionLoopSchemas } from "@/lib/api/ivo-action-loop.functions";
import type { IvoQ2Deps } from "./ivo-q2-reading.server";
import { buildFibtActionPlanViews, isUndefinedColumnError, type FibtLedgerSnapshot } from "./fibt-action-loop.server";
import {
  addFibtActionToPlan,
  closeFibtActionPlan,
  mapPlanCompositionDbError,
  PLAN_TRIGGER_DIAGNOSTICS,
  planCompositionDbRejection,
  type AddActionToPlanRequest,
  type PlanCompositionDeps,
  type PlanCompositionPlan,
  type PlanCompositionStore,
} from "./fibt-plan-composition.server";
import { OPERATIONAL_EXIT, PLAN_STATUS_LABEL, assessPlanClosure, describePending } from "./plan-closure";
import { createLearningApplication } from "./learning-application.server";
import { learningApplicationSchema } from "@/lib/api/ivo-learning-application.functions";
import { approvedQ2Fixture, LOCAL_Q2_EDUCATION_ENV } from "@/test/fixtures/q2-learning";
import { loadEducationForSession } from "./ivo-education.server";
import { activityDescriptionPrefix, learningReviewSource } from "./learning-application";
import { encodeContentRef } from "./content-ref";
import type { FibtActionLedgerStore } from "./fibt-action-loop.server";

const manifest = getFibtManifest();
const VERSION = manifest.instrument_version;
const NOW = new Date("2026-06-30T15:00:00.000Z");
/** Valor distintivo: se aparecer em payload de ação, houve cópia de valor publicado. */
const DISTINCT_MEAN = 2.71875;
const means = Object.fromEntries(manifest.items.map((item) => [item.id, DISTINCT_MEAN]));

const ID = {
  waveAlfa: "11111111-1111-4111-8111-111111111111",
  waveBeta: "22222222-2222-4222-8222-222222222222",
  a1: "11111111-1111-4111-8111-1111111111a1",
  a2: "11111111-1111-4111-8111-1111111111a2",
  a4: "11111111-1111-4111-8111-1111111111a4",
  b1: "22222222-2222-4222-8222-2222222222b1",
  planAlfa: "33333333-3333-4333-8333-333333333331",
  planBeta: "33333333-3333-4333-8333-333333333332",
  req1: "44444444-4444-4444-8444-444444444441",
  req2: "44444444-4444-4444-8444-444444444442",
};

function wave(id: string, orgId: string, name: string): FibtManagerWaveRow {
  return {
    id, orgId, organizationName: name, label: `Onda FIB-T ${name}`, instrument: "FIB_T", instrumentVersion: VERSION,
    status: "collecting", sealOutcome: null, createdAt: "2026-04-10T12:00:00.000Z", closesAt: null,
  };
}
const WAVES: Record<string, FibtManagerWaveRow> = {
  [ID.waveAlfa]: wave(ID.waveAlfa, "org-alfa", "Organização Fictícia Alfa"),
  [ID.waveBeta]: wave(ID.waveBeta, "org-beta", "Organização Fictícia Beta"),
};
const COHORTS = {
  [ID.waveAlfa]: [
    { id: ID.a1, key: "alfa-a1", label: "Operações", count: 9, published: true },
    { id: ID.a2, key: "alfa-a2", label: "Logística", count: 3, published: false },
    // Dois setores ocultos (A2 e A3): sem supressão complementar sobre o publicado (mesmo desenho do teste da jornada).
    { id: "11111111-1111-4111-8111-1111111111a3", key: "alfa-a3", label: "Financeiro", count: 2, published: false },
    { id: ID.a4, key: "alfa-a4", label: "Atendimento", count: 6, published: false },
  ],
  [ID.waveBeta]: [{ id: ID.b1, key: "beta-b1", label: "Produção", count: 8, published: true }],
} as const;

function fibtStore(): FibtManagerStore {
  return {
    findWave: async (orgId, waveId) => (WAVES[waveId]?.orgId === orgId ? WAVES[waveId]! : null),
    findCanonicalHmlWave: async () => null,
    listCohorts: async (orgId, waveId) =>
      WAVES[waveId]?.orgId === orgId
        ? (COHORTS[waveId as keyof typeof COHORTS] ?? []).map((c) => ({ id: c.id, orgId, waveId, key: c.key, label: c.label }))
        : [],
    listLinks: async () => [],
    listSegmentParticipation: async (waveId) =>
      (COHORTS[waveId as keyof typeof COHORTS] ?? []).map((c) => ({ cohortId: c.id, count: c.count, instrumentVersions: [VERSION] })),
    listPublishedSnapshots: async (waveId) =>
      (COHORTS[waveId as keyof typeof COHORTS] ?? [])
        .filter((c) => c.published)
        .map((c) => ({ cohortId: c.id, publishedResponseCount: c.count, itemMeans: means, publishedAt: "2026-06-20T12:00:00.000Z" })),
    listEvents: async () => [],
  };
}

const SESSIONS: Record<string, MembershipResult> = {
  "token-alfa-admin": { ok: true, membership: { userId: "user-alfa", orgId: "org-alfa", role: "RH_ADMIN" } },
  "token-beta-admin": { ok: true, membership: { userId: "user-beta", orgId: "org-beta", role: "RH_ADMIN" } },
  "token-alfa-membro": { ok: false, reason: "not_admin" },
  "token-sem-perfil": { ok: false, reason: "no_profile" },
};

function q2Deps(): IvoQ2Deps {
  return {
    boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
    identity: () => ({ requestedMode: "cloud", state: "cloud", realAuthentication: true, serverEnforced: true, reason: "cloud_ready" }),
    moduleAccess: async () => ({ ok: true }),
    requireAdmin: async (accessToken) => SESSIONS[accessToken] ?? { ok: false, reason: "invalid_session" },
    store: fibtStore(),
    now: () => NOW,
    pilotEnabled: () => true,
    locateLatestWave: async (orgId) => {
      const found = Object.values(WAVES).find((w) => w.orgId === orgId);
      return found ? { id: found.id } : null;
    },
  };
}

// ─── Store falsa que imita os gatilhos do banco ─────────────────────────────

interface FakeItem {
  id: string;
  planId: string;
  orgId: string;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  status: PlanActionStatus;
  sourceCohortId: string | null;
  sourceFactorId: string | null;
  requestId: string | null;
  addedByRole: string | null;
  rank: number;
  hasAccountability: boolean;
  /** Bloco §13 como a linha o guarda (ausente ou nulo quando a ação entrou sem accountability). */
  ownerRoleLabel?: string | null;
  dueOn?: string | null;
  metricLabel?: string | null;
  metricBaseline?: number | null;
  metricTarget?: number | null;
  metricUnit?: string | null;
}

interface FakeOptions {
  plan?: Partial<PlanCompositionPlan> & { cycleKey?: string };
  items?: Array<{ status: PlanActionStatus; title?: string }>;
  composition?: boolean;
  /** Executado DENTRO de addAction/closePlan, antes da regra do banco — simula a outra sessão. */
  beforeDbAdd?: (s: HookState) => void;
  beforeDbClose?: (s: HookState) => void;
}

interface HookState {
  plan: { status: "draft" | "active" | "closed" };
  items: FakeItem[];
}

function memoryStore(options: FakeOptions = {}) {
  const plan = {
    id: ID.planAlfa,
    orgId: "org-alfa",
    status: "active" as "draft" | "active" | "closed",
    cycleKey: "2026-T2",
    closedAt: null as string | null,
    closedByRole: null as string | null,
    ...options.plan,
  };
  const items: FakeItem[] = (options.items ?? [{ status: "concluida" }]).map((seed, index) => ({
    id: `item-${index + 1}`, planId: plan.id, orgId: plan.orgId, title: seed.title ?? `Ação ${index + 1}`, description: "", effort: "medio",
    status: seed.status, sourceCohortId: ID.a1, sourceFactorId: "bem_estar", requestId: null, addedByRole: null, rank: index + 1, hasAccountability: true,
  }));
  /** Protocolos C8 (outra tabela): o encerramento não pode tocá-los. */
  const c8Rows = [{ id: "prot-1", itemId: "item-1", objective: "Objetivo sintético" }];
  const calls: string[] = [];
  const written: Array<Parameters<PlanCompositionStore["addAction"]>[0]> = [];
  const closeCalls: Array<Parameters<PlanCompositionStore["closePlan"]>[0]> = [];
  let seq = 0;

  const state = { plan, items, c8Rows, calls, written, closeCalls };
  const store: PlanCompositionStore = {
    loadPlan: async (orgId, planId) => {
      calls.push("loadPlan");
      if (plan.id !== planId || plan.orgId !== orgId) return null;
      return {
        id: plan.id, orgId: plan.orgId, status: plan.status, cycleKey: plan.cycleKey, closedAt: plan.closedAt, closedByRole: plan.closedByRole,
        composition: options.composition ?? true,
        actions: items.map((i) => ({ id: i.id, title: i.title, status: i.status })),
      };
    },
    findAddedAction: async (orgId, planId, requestId) => {
      calls.push("findAddedAction");
      const found = items.find((i) => i.orgId === orgId && i.planId === planId && i.requestId === requestId);
      return found
        ? {
          id: found.id, title: found.title, description: found.description, effort: found.effort, sourceCohortId: found.sourceCohortId, sourceFactorId: found.sourceFactorId,
          ownerRoleLabel: found.ownerRoleLabel ?? null, dueOn: found.dueOn ?? null, metricLabel: found.metricLabel ?? null,
          metricBaseline: found.metricBaseline ?? null, metricTarget: found.metricTarget ?? null, metricUnit: found.metricUnit ?? null,
        }
        : null;
    },
    addAction: async (input) => {
      calls.push("addAction");
      written.push(structuredClone(input));
      options.beforeDbAdd?.(state);
      // — regras do gatilho ivo_ledger.guard_item_insert —
      if (plan.id !== input.planId || plan.orgId !== input.orgId) return { accepted: false, reason: "plan_not_found" };
      if (plan.status === "closed") return { accepted: false, reason: "plan_closed" };
      if (plan.status === "active" && !input.accountability) return { accepted: false, reason: "accountability_required" };
      if (items.some((i) => i.planId === input.planId && i.requestId === input.requestId)) return { accepted: false, reason: "duplicate_request" };
      const item: FakeItem = {
        id: `added-${++seq}`, planId: plan.id, orgId: plan.orgId, title: input.title, description: input.description, effort: input.effort,
        status: "planejada", sourceCohortId: input.source.cohortId, sourceFactorId: input.source.factorId, requestId: input.requestId,
        addedByRole: input.role, rank: Math.max(0, ...items.map((i) => i.rank)) + 1, hasAccountability: input.accountability !== null,
        ownerRoleLabel: input.accountability?.ownerRoleLabel ?? null, dueOn: input.accountability?.dueOn ?? null, metricLabel: input.accountability?.metric.label ?? null,
        metricBaseline: input.accountability?.metric.baseline ?? null, metricTarget: input.accountability?.metric.target ?? null, metricUnit: input.accountability?.metric.unit ?? null,
      };
      items.push(item);
      return { accepted: true, itemId: item.id };
    },
    closePlan: async (input) => {
      calls.push("closePlan");
      closeCalls.push(structuredClone(input));
      options.beforeDbClose?.(state);
      // — regras do gatilho ivo_ledger.guard_plan_update —
      if (plan.id !== input.planId || plan.orgId !== input.orgId || plan.status !== "active") return { accepted: false, reason: "no_row" };
      if (items.length === 0) return { accepted: false, reason: "plan_empty" };
      if (items.some((i) => !OPERATIONAL_EXIT.includes(i.status))) return { accepted: false, reason: "pending_actions" };
      plan.status = "closed";
      plan.closedAt = NOW.toISOString();
      plan.closedByRole = input.role;
      return { accepted: true };
    },
  };
  return Object.assign(state, { store });
}

function depsOf(s: ReturnType<typeof memoryStore>, extra: Partial<PlanCompositionDeps> = {}): PlanCompositionDeps {
  return { ...q2Deps(), capability: () => ({ enabled: true, source: "local_fixture" }), composition: s.store, ...extra };
}

const ADD: AddActionToPlanRequest = {
  accessToken: "token-alfa-admin",
  planId: ID.planAlfa,
  requestId: ID.req1,
  waveId: ID.waveAlfa,
  cohortId: ID.a1,
  factorId: "bem_estar",
  title: "Oficina de pausas ativas",
  description: "Duas oficinas curtas por mês.",
  effort: "baixo",
  accountability: { ownerRoleLabel: "Coordenação de Operações", dueOn: "2026-09-30", executionMetric: { label: "Oficinas realizadas", baseline: 0, target: 2, unit: "oficinas" } },
};

// ═══════════════════════════════════════════════════════════════════════════
// A · incluir ação em plano existente
// ═══════════════════════════════════════════════════════════════════════════

describe("PI-13 · incluir ação em plano existente", () => {
  function reviewFixture() {
    const f = approvedQ2Fixture();
    const s = memoryStore();
    const parentId = "10000000-0000-4000-8000-000000000001";
    const original = {
      id: parentId, orgId: "org-alfa", planId: ID.planAlfa, sourceLensId: "fibt",
      sourceWaveId: ID.waveAlfa, sourceCohortId: ID.a1, sourceFactorId: "bem_estar",
      description: encodeContentRef(f.unit, activityDescriptionPrefix(f.activity) + "Prática original."),
      status: "concluida" as const, planStatus: "active",
    };
    const ledger = { findItem: async (orgId: string, itemId: string) =>
      orgId === original.orgId && itemId === parentId ? original : null } as FibtActionLedgerStore;
    const deps = {
      ...depsOf(s, { ledger }), educationEnv: LOCAL_Q2_EDUCATION_ENV,
      contentCatalog: () => f.contents, activityCatalog: f.activities,
    };
    const request = {
      ...ADD, reviewOfItemId: parentId, contentId: f.unit.id, contentVersion: f.unit.version,
      activityVersion: f.activity.version, title: "Ajustar passagem de turno",
      description: "Definir quem recebe o pedido e verificar a cobertura da troca de turno.",
    };
    return { deps, s, original, request };
  }

  test("ajuste vinculado usa a origem confirmada e a mesma identidade PI-13 durante concorrência e retry", async () => {
    const { deps, s, original, request } = reviewFixture();
    const [first, second] = await Promise.all([
      createLearningApplication(request, deps), createLearningApplication(request, deps),
    ]);
    expect(first).toMatchObject({ accepted: true, id: "added-1" });
    expect(second).toMatchObject({ accepted: true, id: "added-1" });
    expect(s.items).toHaveLength(2);
    const stored = s.items[1]!.description;
    expect(learningReviewSource(stored)).toBe(original.id);
    expect(stored).toContain(request.description);
    expect(stored).not.toContain(String(DISTINCT_MEAN));
    expect(await createLearningApplication(request, deps)).toMatchObject({ accepted: true, replayed: true, id: "added-1" });
    expect(await createLearningApplication({ ...request, description: "Outra decisão." }, deps)).toMatchObject({ accepted: false, reason: "request_conflict" });
    expect(s.items).toHaveLength(2);
  });

  test("ajuste recusa empresa, publicação e referência incompatíveis antes de incluir ação", async () => {
    const { deps, s, original, request } = reviewFixture();
    for (const change of [
      { accessToken: "token-beta-admin" }, { cohortId: ID.a2 }, { waveId: ID.waveBeta },
      { planId: ID.planBeta }, { reviewOfItemId: ID.req1 },
    ]) {
      expect(await createLearningApplication({ ...request, ...change }, deps)).toMatchObject({ accepted: false, reason: "review_source_mismatch" });
    }
    expect(await createLearningApplication({ ...request, description: "" }, deps)).toMatchObject({ accepted: false, reason: "review_unavailable" });
    expect(await createLearningApplication({ ...request, description: `[revisao:${original.id}] referência forjada` }, deps)).toMatchObject({ accepted: false, reason: "reserved_review_reference" });
    original.planStatus = "draft";
    expect(await createLearningApplication(request, deps)).toMatchObject({ accepted: false, reason: "plan_not_active" });
    original.planStatus = "active";
    original.sourceCohortId = ID.a2;
    expect(await createLearningApplication({ ...request, cohortId: ID.a2 }, deps)).toMatchObject({ accepted: false, reason: "source_not_published" });
    expect(s.written).toHaveLength(0);
    expect(learningApplicationSchema.safeParse({ ...request, quizAnswers: { escolha: "privada" } }).success).toBe(false);
  });
  test("Q2 aprovado SINTÉTICO: leitura e aplicação usam o mesmo par revisado; retry não duplica", async () => {
    const f = approvedQ2Fixture();
    const s = memoryStore();
    const deps = { ...depsOf(s, { testContent: false }), educationEnv: LOCAL_Q2_EDUCATION_ENV, contentCatalog: () => f.contents, activityCatalog: f.activities };
    const read = await loadEducationForSession({ accessToken: ADD.accessToken }, deps);
    expect(read).toMatchObject({ ok: true, catalog: { approvedCount: 1, testVisible: false } });
    if (!read.ok) throw new Error("leitura falhou");
    expect(read.byFactor.bem_estar?.[0]?.activity?.id).toBe(f.activity.id);
    const input = { ...ADD, contentId: f.unit.id, contentVersion: f.unit.version, activityVersion: f.activity.version };
    expect(await createLearningApplication(input, deps)).toMatchObject({ accepted: true });
    expect(await createLearningApplication(input, deps)).toMatchObject({ accepted: true, replayed: true });
    expect(s.written).toHaveLength(1);
    expect(s.written[0]!.orgId).toBe("org-alfa");
    expect(s.written[0]!.description).toContain(`[conteudo:${f.unit.id}@${f.unit.version}] Atividade ${f.activity.version}.`);
    expect(JSON.stringify(s.written)).not.toMatch(/answers|correctOptionId|recallPrompt|quizScore/);
  });

  test("Q2: atividade sem aprovação própria não aparece nem permite escrita direta", async () => {
    const f = approvedQ2Fixture();
    const s = memoryStore();
    const pending = { ...f.activity, status: "PROPOSTO" as const, curation: { ...f.activity.curation!, approval: null } };
    const deps = { ...depsOf(s, { testContent: true }), educationEnv: LOCAL_Q2_EDUCATION_ENV, contentCatalog: () => f.contents, activityCatalog: [pending] };
    const read = await loadEducationForSession({ accessToken: ADD.accessToken }, deps);
    expect(read.ok && read.byFactor.bem_estar?.find((c) => c.contentId === f.unit.id)?.activity).toBeUndefined();
    expect(await createLearningApplication({ ...ADD, contentId: f.unit.id, contentVersion: f.unit.version, activityVersion: pending.version }, deps)).toMatchObject({ accepted: false, reason: "content_version_changed" });
    expect(s.written).toHaveLength(0);
  });

  test("Q2: aprovação local não libera outro runtime; versões obsoletas e Beta recusadas", async () => {
    const f = approvedQ2Fixture();
    const input = { ...ADD, contentId: f.unit.id, contentVersion: f.unit.version, activityVersion: f.activity.version };
    const real = memoryStore();
    expect(await createLearningApplication(input, { ...depsOf(real, { testContent: true }), educationEnv: {} })).toMatchObject({ accepted: false, reason: "content_not_available" });
    expect(real.written).toHaveLength(0);
    for (const change of [{ contentVersion: "0.0.1" }, { activityVersion: "0.0.1" }, { accessToken: "token-beta-admin" }]) {
      const s = memoryStore();
      const deps = { ...depsOf(s), educationEnv: LOCAL_Q2_EDUCATION_ENV, contentCatalog: () => f.contents, activityCatalog: f.activities };
      expect(await createLearningApplication({ ...input, ...change }, deps)).toMatchObject({ accepted: false });
      expect(s.written).toHaveLength(0);
    }
  });

  test("Q2 canônico aprovado: leitura e aplicação locais sem substituição do catálogo", async () => {
    const s = memoryStore();
    const deps = { ...depsOf(s, { testContent: false }), educationEnv: LOCAL_Q2_EDUCATION_ENV };
    const read = await loadEducationForSession({ accessToken: ADD.accessToken }, deps);
    if (!read.ok) throw new Error("leitura falhou");
    const content = read.byFactor.bem_estar![0]!;
    expect(content.status).toBe("APROVADO");
    expect(content.usageNotice).toContain("ensaio local");
    expect(content.body.join(" ")).not.toContain("PROPOSTA PARA REVISÃO");
    expect(content.activity?.checks).toHaveLength(3);
    const input = { ...ADD, contentId: content.contentId, contentVersion: content.version, activityVersion: content.activity!.version };
    expect(await createLearningApplication(input, deps)).toMatchObject({ accepted: true });
    expect(await createLearningApplication(input, deps)).toMatchObject({ accepted: true, replayed: true });
    expect(s.written).toHaveLength(1);
    expect(s.written[0]!.description).toContain(`Referência da atividade: ${content.activity!.id}`);
    expect(JSON.stringify(s.written)).not.toMatch(/answers|quizScore|correctOptionId/);
  });

  const learning = () => ({ ...ADD, contentId: "TESTE-bem_estar-001", contentVersion: "0.0.1-teste", activityVersion: "0.0.1-teste" });
  test("aprendizagem: aplicação versionada reutiliza retry do PI-13 sem respostas pedagógicas", async () => {
    const s = memoryStore();
    const deps = depsOf(s, { testContent: true });
    expect(await createLearningApplication(learning(), deps)).toMatchObject({ ok: true, accepted: true });
    expect(await createLearningApplication(learning(), deps)).toMatchObject({ ok: true, accepted: true, replayed: true });
    expect(s.written).toHaveLength(1);
    expect(s.written[0]!.description).toContain("[conteudo:TESTE-bem_estar-001@0.0.1-teste] Atividade 0.0.1-teste.");
    expect(JSON.stringify(s.written)).not.toMatch(/correctCount|answers|quizScore/);
  });
  test("aprendizagem: versão/fator/teste não autorizado recusam antes da escrita", async () => {
    for (const change of [{ contentVersion: "antiga" }, { activityVersion: "antiga" }, { factorId: "satisfacao_empresa" }]) {
      const s = memoryStore();
      expect(await createLearningApplication({ ...learning(), ...change }, depsOf(s, { testContent: true }))).toMatchObject({ ok: true, accepted: false });
      expect(s.written).toHaveLength(0);
    }
    const s = memoryStore();
    expect(await createLearningApplication(learning(), depsOf(s, { testContent: false }))).toMatchObject({ accepted: false, reason: "content_not_available" });
  });
  test("aprendizagem: Beta, sem papel e módulo desabilitado não criam aplicação", async () => {
    for (const accessToken of ["token-beta-admin", "token-alfa-membro", "invalido"]) {
      const s = memoryStore();
      const result = await createLearningApplication({ ...learning(), accessToken }, depsOf(s, { testContent: true }));
      expect(result.ok && result.accepted).toBe(false);
      expect(s.written).toHaveLength(0);
    }
    const s = memoryStore();
    expect(await createLearningApplication(learning(), depsOf(s, { testContent: true, moduleAccess: async () => ({ ok: false, reason: "disabled", error: "Desabilitado" }) }))).toMatchObject({ ok: false, category: "module_disabled" });
    expect(s.written).toHaveLength(0);
  });
  test("aprendizagem: cliente não forja referência nem envia respostas/empresa", async () => {
    const s = memoryStore();
    expect(await addFibtActionToPlan({ ...ADD, description: "[conteudo:FALSO@1] falso" }, depsOf(s))).toMatchObject({ accepted: false, reason: "reserved_content_reference" });
    expect(s.written).toHaveLength(0);
    expect(learningApplicationSchema.safeParse({ ...learning(), answers: { a: "b" } }).success).toBe(false);
    expect(learningApplicationSchema.safeParse({ ...learning(), organizationId: "alheia" }).success).toBe(false);
  });
  test("ação válida entra no plano ativo com origem por referência e papel vindo da sessão", async () => {
    const s = memoryStore();
    const r = await addFibtActionToPlan(ADD, depsOf(s));
    expect(r).toMatchObject({ ok: true, accepted: true });
    expect(s.written).toHaveLength(1);
    const w = s.written[0]!;
    expect(w).toMatchObject({
      orgId: "org-alfa",
      planId: ID.planAlfa,
      requestId: ID.req1,
      userId: "user-alfa",
      role: "RH_ADMIN",
      leverId: "fibt:alfa-a1:bem_estar",
      source: { waveId: ID.waveAlfa, cohortId: ID.a1, factorId: "bem_estar" },
    });
    // Nenhum valor da leitura publicada nem rótulo de contagem vai para a ação.
    const payload = JSON.stringify(w);
    expect(payload).not.toContain(String(DISTINCT_MEAN));
    for (const key of ["mean", "countLabel", "rawScore", "escore", "itemMeans", "answers"]) expect(payload).not.toContain(key);
    expect(s.items.at(-1)).toMatchObject({ status: "planejada", rank: 2, addedByRole: "RH_ADMIN" });
  });

  test("plano ativo exige responsável, prazo e indicador na inclusão; rascunho aceita sem eles", async () => {
    const active = memoryStore();
    const { accountability: _omit, ...withoutAccountability } = ADD;
    expect(await addFibtActionToPlan(withoutAccountability, depsOf(active))).toMatchObject({ ok: true, accepted: false, reason: "accountability_required" });
    expect(active.written).toEqual([]);

    const draft = memoryStore({ plan: { status: "draft" } });
    expect(await addFibtActionToPlan(withoutAccountability, depsOf(draft))).toMatchObject({ ok: true, accepted: true });
    expect(draft.written[0]!.accountability).toBeNull();
    expect(draft.items.at(-1)!.hasAccountability).toBe(false);

    // Prazo malformado, ou que não existe no calendário (31/02), é recusado antes de qualquer escrita.
    for (const dueOn of ["2026-13-45", "2026-02-31", "15/12/2026"]) {
      const bad = memoryStore();
      expect(
        await addFibtActionToPlan({ ...ADD, accountability: { ...ADD.accountability!, dueOn } }, depsOf(bad)),
      ).toMatchObject({ accepted: false, reason: "invalid_date" });
      expect(bad.written).toEqual([]);
    }
  });

  test("origem sem leitura publicada (protegida, abaixo do limiar, lote pendente) é recusada", async () => {
    for (const cohortId of [ID.a2, ID.a4, "99999999-9999-4999-8999-999999999999"]) {
      const s = memoryStore();
      expect(await addFibtActionToPlan({ ...ADD, cohortId }, depsOf(s))).toMatchObject({ accepted: false, reason: "source_not_published" });
      expect(s.written).toEqual([]);
    }
    // Fator fora do manifesto da leitura publicada também.
    const s = memoryStore();
    expect(await addFibtActionToPlan({ ...ADD, factorId: "fator_inexistente" }, depsOf(s))).toMatchObject({ accepted: false, reason: "source_not_published" });
  });

  test("a origem precisa ser do MESMO ciclo do plano (outro ciclo é PI-14 e não é resolvido aqui)", async () => {
    const s = memoryStore({ plan: { cycleKey: "2026-T1" } });
    expect(await addFibtActionToPlan(ADD, depsOf(s))).toMatchObject({ accepted: false, reason: "origin_cycle_mismatch" });
    expect(s.written).toEqual([]);
    // Formato legado do registro (2026-t2) é reconhecido como o mesmo ciclo.
    const legacy = memoryStore({ plan: { cycleKey: "2026-t2" } });
    expect(await addFibtActionToPlan(ADD, depsOf(legacy))).toMatchObject({ accepted: true });
    // Slug de temporada (não interpretável) nunca é "o mesmo ciclo" de uma onda.
    const slug = memoryStore({ plan: { cycleKey: "temporada-primavera" } });
    expect(await addFibtActionToPlan(ADD, depsOf(slug))).toMatchObject({ accepted: false, reason: "origin_cycle_mismatch" });
  });

  test("plano encerrado não recebe ação", async () => {
    const s = memoryStore({ plan: { status: "closed", closedAt: NOW.toISOString(), closedByRole: "RH_ADMIN" } });
    expect(await addFibtActionToPlan(ADD, depsOf(s))).toMatchObject({ ok: true, accepted: false, reason: "plan_closed" });
    expect(s.written).toEqual([]);
    expect(s.items).toHaveLength(1);
  });

  test("organização vem da sessão: Beta não inclui no plano da Alfa nem cita a onda da Alfa", async () => {
    const s = memoryStore();
    // Plano da Alfa, id escolhido pelo cliente da Beta: "não encontrado", sem confirmar existência.
    expect(await addFibtActionToPlan({ ...ADD, accessToken: "token-beta-admin" }, depsOf(s))).toMatchObject({ accepted: false, reason: "plan_not_found" });
    expect(s.written).toEqual([]);
    // Plano da Beta com a onda da Alfa: a leitura é revalidada com a organização da sessão.
    const beta = memoryStore({ plan: { id: ID.planBeta, orgId: "org-beta" } });
    const crossWave = await addFibtActionToPlan({ ...ADD, accessToken: "token-beta-admin", planId: ID.planBeta }, depsOf(beta));
    expect(crossWave).toMatchObject({ ok: false, category: "validation" });
    expect(beta.written).toEqual([]);
    // Coorte de outra organização na onda da própria.
    expect(await addFibtActionToPlan({ ...ADD, accessToken: "token-beta-admin", planId: ID.planBeta, waveId: ID.waveBeta }, depsOf(beta))).toMatchObject({
      accepted: false,
      reason: "source_not_published",
    });
  });

  test("papel insuficiente, sessão ausente e capability desligada não chegam à store", async () => {
    for (const [accessToken, category] of [
      ["token-alfa-membro", "forbidden"],
      ["token-sem-perfil", "forbidden"],
      [undefined, "unauthenticated"],
      ["token-invalido-qualquer", "unauthenticated"],
    ] as const) {
      const s = memoryStore();
      expect(await addFibtActionToPlan({ ...ADD, accessToken }, depsOf(s))).toMatchObject({ ok: false, category });
      expect(s.calls).toEqual([]);
    }
    const off = memoryStore();
    expect(await addFibtActionToPlan(ADD, depsOf(off, { capability: () => ({ enabled: false, reason: "registry_disabled" }) }))).toMatchObject({
      ok: false,
      category: "unavailable",
    });
    expect(off.calls).toEqual([]);
  });

  test("repetir o MESMO pedido não duplica; pedidos distintos e parecidos criam duas ações", async () => {
    const s = memoryStore();
    const first = await addFibtActionToPlan(ADD, depsOf(s));
    const again = await addFibtActionToPlan(ADD, depsOf(s));
    expect(first).toMatchObject({ accepted: true });
    expect(again).toMatchObject({ accepted: true, replayed: true });
    expect(again.ok && again.accepted ? again.id : "x").toBe(first.ok && first.accepted ? first.id : "y");
    expect(s.written).toHaveLength(1);
    expect(s.items).toHaveLength(2);

    // Mesmo conteúdo, pedido distinto: é uma segunda ação (duas ações parecidas são legítimas).
    const second = await addFibtActionToPlan({ ...ADD, requestId: ID.req2 }, depsOf(s));
    expect(second).toMatchObject({ accepted: true });
    expect(second.ok && second.accepted && second.replayed).toBeFalsy();
    expect(s.items).toHaveLength(3);
  });

  test("a repetição devolve a ação já criada mesmo depois de o plano ser encerrado", async () => {
    const s = memoryStore();
    const first = await addFibtActionToPlan(ADD, depsOf(s));
    s.items.find((i) => i.requestId === ID.req1)!.status = "concluida";
    expect(await closeFibtActionPlan({ accessToken: "token-alfa-admin", planId: ID.planAlfa }, depsOf(s))).toMatchObject({ accepted: true });
    const replay = await addFibtActionToPlan(ADD, depsOf(s));
    expect(replay).toMatchObject({ accepted: true, replayed: true, id: first.ok && first.accepted ? first.id : null });
    expect(s.items).toHaveLength(2);
  });

  test("dois envios simultâneos do mesmo pedido resultam em UMA ação", async () => {
    const s = memoryStore();
    const [a, b] = await Promise.all([addFibtActionToPlan(ADD, depsOf(s)), addFibtActionToPlan(ADD, depsOf(s))]);
    expect(a).toMatchObject({ accepted: true });
    expect(b).toMatchObject({ accepted: true });
    expect(s.items.filter((i) => i.requestId === ID.req1)).toHaveLength(1);
    expect([a, b].filter((r) => r.ok && r.accepted && r.replayed)).toHaveLength(1);
  });

  test("a mesma chave com outro conteúdo é conflito, não repetição", async () => {
    const s = memoryStore();
    await addFibtActionToPlan(ADD, depsOf(s));
    expect(await addFibtActionToPlan({ ...ADD, title: "Outra ação inteiramente diferente" }, depsOf(s))).toMatchObject({
      accepted: false,
      reason: "request_conflict",
    });
    expect(s.items).toHaveLength(2);
  });

  // A identidade do replay é o pedido INTEIRO: conteúdo, origem e o bloco §13 (responsável, prazo,
  // indicador). Um campo alterado SOZINHO já é outro pedido: nada é gravado e a ação não muda.
  const ACC = ADD.accountability!;
  const metricWith = (patch: Partial<typeof ACC.executionMetric>) => ({ ...ACC, executionMetric: { ...ACC.executionMetric, ...patch } });
  const CHANGED_ALONE: Array<[string, Partial<AddActionToPlanRequest>]> = [
    ["título", { title: "Outra ação inteiramente diferente" }],
    ["descrição", { description: "Três oficinas curtas por mês." }],
    ["esforço", { effort: "alto" }],
    ["coorte", { cohortId: ID.a2 }],
    ["fator", { factorId: "padrao_de_vida" }],
    ["responsável", { accountability: { ...ACC, ownerRoleLabel: "Gestão de pessoas" } }],
    ["prazo", { accountability: { ...ACC, dueOn: "2026-10-31" } }],
    ["rótulo do indicador", { accountability: metricWith({ label: "Pausas realizadas" }) }],
    ["linha de base", { accountability: metricWith({ baseline: 1 }) }],
    ["meta", { accountability: metricWith({ target: 3 }) }],
    ["unidade", { accountability: metricWith({ unit: "encontros" }) }],
    ["accountability (removida do pedido)", { accountability: undefined }],
  ];

  test.each(CHANGED_ALONE)("a mesma chave com %s alterado SOZINHO é conflito: nada é gravado e a ação existente não muda", async (_campo, patch) => {
    const s = memoryStore();
    expect(await addFibtActionToPlan(ADD, depsOf(s))).toMatchObject({ accepted: true });
    const before = JSON.stringify({ items: s.items, written: s.written });
    expect(await addFibtActionToPlan({ ...ADD, ...patch }, depsOf(s))).toMatchObject({ ok: true, accepted: false, reason: "request_conflict" });
    expect(JSON.stringify({ items: s.items, written: s.written })).toBe(before);
  });

  test("repetição idêntica continua repetição: numeric do banco como texto, zero, unidade vazia e espaços nas pontas não geram falso conflito", async () => {
    const accountability = { ...ACC, executionMetric: { label: "Oficinas realizadas", baseline: 0, target: 12.5, unit: "" } };
    const s = memoryStore();
    const first = await addFibtActionToPlan({ ...ADD, accountability }, depsOf(s));
    // O banco pode devolver `numeric` como texto ("0.00", "12.50"): a comparação é pelo valor.
    const findAdded = s.store.findAddedAction;
    s.store.findAddedAction = async (...args) => {
      const row = await findAdded(...args);
      const asText = (n: number | string | null) => (n === null ? null : Number(n).toFixed(2));
      return row && { ...row, metricBaseline: asText(row.metricBaseline), metricTarget: asText(row.metricTarget) };
    };
    const again = await addFibtActionToPlan({ ...ADD, title: `  ${ADD.title}  `, accountability }, depsOf(s));
    expect(again).toMatchObject({ ok: true, accepted: true, replayed: true, id: first.ok && first.accepted ? first.id : null });
    expect(s.written).toHaveLength(1);
    expect(s.items).toHaveLength(2);
    // Escrever o número como texto não esconde diferença de valor.
    const otherTarget = { ...accountability, executionMetric: { ...accountability.executionMetric, target: 12.6 } };
    expect(await addFibtActionToPlan({ ...ADD, accountability: otherTarget }, depsOf(s))).toMatchObject({ accepted: false, reason: "request_conflict" });
    expect(s.written).toHaveLength(1);
  });

  // `due_on` é DATE no banco e o PostgREST o serializa como AAAA-MM-DD: as duas formas com hora abaixo são
  // DEFENSIVAS, simuladas pela store falsa; o formato real NUNCA foi observado contra um banco. A prova local
  // PP.6 (`demo:ivo:proof:plan`), quando reexecutada, deve registrar o formato efetivamente observado.
  // A tolerância vale só para o lado da LINHA gravada: a comparação é pela data civil, não pela grafia.
  test.each([
    ["timestamp com fuso", "2026-11-30T00:00:00+00:00"],
    ["data e hora sem fuso", "2026-11-30 00:00:00"],
  ])("prazo (due_on) devolvido pelo banco como %s é a mesma data do pedido: repetição, não conflito", async (_formato, serializado) => {
    const accountability = { ...ACC, dueOn: "2026-11-30" };
    const s = memoryStore();
    const first = await addFibtActionToPlan({ ...ADD, accountability }, depsOf(s));
    expect(first).toMatchObject({ accepted: true });
    const findAdded = s.store.findAddedAction;
    s.store.findAddedAction = async (...args) => {
      const row = await findAdded(...args);
      return row && { ...row, dueOn: row.dueOn === null ? null : serializado };
    };
    const again = await addFibtActionToPlan({ ...ADD, accountability }, depsOf(s));
    expect(again).toMatchObject({ ok: true, accepted: true, replayed: true, id: first.ok && first.accepted ? first.id : null });
    expect(s.written).toHaveLength(1);
    expect(s.items).toHaveLength(2);
    // Outra data continua sendo outro pedido, qualquer que seja a grafia devolvida pelo banco.
    const otherDay = await addFibtActionToPlan({ ...ADD, accountability: { ...accountability, dueOn: "2026-12-01" } }, depsOf(s));
    expect(otherDay).toMatchObject({ ok: true, accepted: false, reason: "request_conflict" });
    expect(s.written).toHaveLength(1);
    expect(s.items).toHaveLength(2);
  });

  // O lado do PEDIDO é texto contratual (aparado, sem truncar): um prazo mal grafado que apenas COMEÇA com a
  // data gravada não pode virar repetição, nem quando o banco devolve a data com hora (forma simulada, acima).
  test.each([
    ["2026-11-30", "2026-11-30qualquer-coisa"],
    ["2026-11-30", "2026-11-30T12:00:00Z"],
    ["2026-11-30T00:00:00+00:00", "2026-11-30qualquer-coisa"],
    ["2026-11-30T00:00:00+00:00", "2026-11-30T12:00:00Z"],
  ])("prazo gravado como %s e pedido com prazo mal grafado %s: a mesma chave é recusada, nunca repetição", async (gravado, malGrafado) => {
    const accountability = { ...ACC, dueOn: "2026-11-30" };
    const s = memoryStore();
    const first = await addFibtActionToPlan({ ...ADD, accountability }, depsOf(s));
    expect(first).toMatchObject({ accepted: true });
    const findAdded = s.store.findAddedAction;
    s.store.findAddedAction = async (...args) => {
      const row = await findAdded(...args);
      return row && { ...row, dueOn: row.dueOn === null ? null : gravado };
    };
    const bad = await addFibtActionToPlan({ ...ADD, accountability: { ...accountability, dueOn: malGrafado } }, depsOf(s));
    // Rejeição (request_conflict ou invalid_date), jamais a ação original devolvida como se fosse este pedido.
    expect(bad).toMatchObject({ ok: true, accepted: false });
    expect(["request_conflict", "invalid_date"]).toContain(bad.ok && !bad.accepted ? bad.reason : "(aceito)");
    expect(bad.ok && bad.accepted && bad.replayed).toBeFalsy();
    expect(s.written).toHaveLength(1);
    expect(s.items).toHaveLength(2);
  });

  test("rascunho sem accountability: nulos da linha ≡ pedido sem o bloco (repetição); com o bloco é outro pedido (conflito)", async () => {
    const draft = memoryStore({ plan: { status: "draft" } });
    const { accountability: _omit, ...withoutAccountability } = ADD;
    expect(await addFibtActionToPlan(withoutAccountability, depsOf(draft))).toMatchObject({ accepted: true });
    expect(await addFibtActionToPlan(withoutAccountability, depsOf(draft))).toMatchObject({ accepted: true, replayed: true });
    expect(await addFibtActionToPlan(ADD, depsOf(draft))).toMatchObject({ accepted: false, reason: "request_conflict" });
    expect(draft.written).toHaveLength(1);
    expect(draft.items).toHaveLength(2);
  });

  test("corrida com o encerramento: o plano encerrou depois da leitura e o banco recusa; nada é gravado", async () => {
    const s = memoryStore({
      beforeDbAdd: (st) => {
        st.plan.status = "closed"; // a outra sessão venceu a trava do plano
      },
    });
    const r = await addFibtActionToPlan(ADD, depsOf(s));
    expect(r).toMatchObject({ ok: true, accepted: false, reason: "plan_closed" });
    expect(s.items).toHaveLength(1);
  });

  test("banco sem a migration: nenhuma das duas operações escreve", async () => {
    const s = memoryStore({ composition: false });
    expect(await addFibtActionToPlan(ADD, depsOf(s))).toMatchObject({ accepted: false, reason: "composition_unavailable" });
    expect(await closeFibtActionPlan({ accessToken: "token-alfa-admin", planId: ID.planAlfa }, depsOf(s))).toMatchObject({
      accepted: false,
      reason: "composition_unavailable",
    });
    expect(s.written).toEqual([]);
    expect(s.closeCalls).toEqual([]);
  });

  test("falha técnica da store vira recusa genérica e segura", async () => {
    const s = memoryStore();
    s.store.loadPlan = async () => {
      throw new Error("boom");
    };
    expect(await addFibtActionToPlan(ADD, depsOf(s))).toMatchObject({ accepted: false, reason: "db_error" });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B · encerrar plano operacionalmente
// ═══════════════════════════════════════════════════════════════════════════

const CLOSE = { accessToken: "token-alfa-admin", planId: ID.planAlfa };

describe("PI-13 · encerrar plano operacionalmente", () => {
  test("com tudo em estado de saída (concluída, em vigilância, interrompida) o plano encerra com autor e papel da sessão", async () => {
    const s = memoryStore({ items: [{ status: "concluida" }, { status: "em_vigilancia" }, { status: "interrompida" }] });
    const r = await closeFibtActionPlan(CLOSE, depsOf(s));
    expect(r).toMatchObject({ ok: true, accepted: true, id: ID.planAlfa });
    expect(s.closeCalls).toEqual([{ orgId: "org-alfa", planId: ID.planAlfa, userId: "user-alfa", role: "RH_ADMIN" }]);
    expect(s.plan).toMatchObject({ status: "closed", closedByRole: "RH_ADMIN" });
  });

  test("pendências impedem o encerramento e são explicadas, sem gravar", async () => {
    const s = memoryStore({ items: [{ status: "concluida" }, { status: "planejada" }, { status: "em_execucao" }, { status: "planejada" }] });
    const r = await closeFibtActionPlan(CLOSE, depsOf(s));
    expect(r).toMatchObject({ ok: true, accepted: false, reason: "pending_actions" });
    expect(r.ok && !r.accepted ? r.message : "").toMatch(/3 ação\(ões\) em andamento \(2 planejada\(s\) · 1 em execução\)/);
    expect(s.closeCalls).toEqual([]);
    expect(s.plan.status).toBe("active");
  });

  test("plano vazio, em rascunho ou de outra organização não encerra", async () => {
    const empty = memoryStore({ items: [] });
    expect(await closeFibtActionPlan(CLOSE, depsOf(empty))).toMatchObject({ accepted: false, reason: "plan_empty" });
    const draft = memoryStore({ plan: { status: "draft" } });
    expect(await closeFibtActionPlan(CLOSE, depsOf(draft))).toMatchObject({ accepted: false, reason: "close_requires_active" });
    const foreign = memoryStore();
    expect(await closeFibtActionPlan({ ...CLOSE, accessToken: "token-beta-admin" }, depsOf(foreign))).toMatchObject({ accepted: false, reason: "plan_not_found" });
    for (const s of [empty, draft, foreign]) expect(s.closeCalls).toEqual([]);
  });

  test("papel insuficiente e sessão ausente não encerram", async () => {
    for (const [accessToken, category] of [["token-alfa-membro", "forbidden"], [undefined, "unauthenticated"]] as const) {
      const s = memoryStore();
      expect(await closeFibtActionPlan({ ...CLOSE, accessToken }, depsOf(s))).toMatchObject({ ok: false, category });
      expect(s.calls).toEqual([]);
    }
  });

  test("repetir o encerramento devolve o desfecho sem gravar de novo", async () => {
    const s = memoryStore();
    const first = await closeFibtActionPlan(CLOSE, depsOf(s));
    const again = await closeFibtActionPlan(CLOSE, depsOf(s));
    expect(first).toMatchObject({ accepted: true });
    expect(first.ok && first.accepted && first.replayed).toBeFalsy();
    expect(again).toMatchObject({ accepted: true, replayed: true });
    expect(s.closeCalls).toHaveLength(1);
    expect(s.plan.closedAt).toBe(NOW.toISOString());
  });

  test("dois encerramentos simultâneos resultam em UM encerramento gravado", async () => {
    const s = memoryStore();
    const [a, b] = await Promise.all([closeFibtActionPlan(CLOSE, depsOf(s)), closeFibtActionPlan(CLOSE, depsOf(s))]);
    expect(a).toMatchObject({ accepted: true });
    expect(b).toMatchObject({ accepted: true });
    expect([a, b].filter((r) => r.ok && r.accepted && r.replayed)).toHaveLength(1);
    expect(s.plan.status).toBe("closed");
  });

  test("corrida com a inclusão: uma ação pendente entrou depois da leitura e o banco recusa o encerramento", async () => {
    const s = memoryStore({
      beforeDbClose: (st) => {
        st.items.push({ ...st.items[0]!, id: "late", status: "planejada" });
      },
    });
    const r = await closeFibtActionPlan(CLOSE, depsOf(s));
    expect(r).toMatchObject({ ok: true, accepted: false, reason: "pending_actions" });
    expect(s.plan.status).toBe("active");
    expect(s.plan.closedAt).toBeNull();
  });

  test("encerrar não toca protocolos C8 nem nenhuma ação e não depende de parecer", async () => {
    const s = memoryStore({ items: [{ status: "concluida" }, { status: "em_vigilancia" }] });
    const before = JSON.stringify({ c8: s.c8Rows, items: s.items });
    expect(await closeFibtActionPlan(CLOSE, depsOf(s))).toMatchObject({ accepted: true });
    expect(JSON.stringify({ c8: s.c8Rows, items: s.items })).toBe(before);
    expect(s.calls.filter((c) => c !== "loadPlan")).toEqual(["closePlan"]);
  });

  test("depois de encerrado não entra ação nova e a leitura continua mostrando o histórico", async () => {
    const s = memoryStore();
    await closeFibtActionPlan(CLOSE, depsOf(s));
    expect(await addFibtActionToPlan(ADD, depsOf(s))).toMatchObject({ accepted: false, reason: "plan_closed" });
    expect(s.items).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C · visão, regra pura, schemas, contrato com o SQL
// ═══════════════════════════════════════════════════════════════════════════

describe("PI-13 · visão, regra pura e contratos", () => {
  const snapshot: FibtLedgerSnapshot = {
    plans: [{ id: "p", orgId: "org-alfa", cycleKey: "2026-T2", seasonName: "x", status: "closed", createdAt: "2026-06-01T10:00:00Z", activatedAt: "2026-06-02T10:00:00Z", closedAt: "2026-06-29T10:00:00Z", closedByRole: "RH_ADMIN" }],
    items: [
      { id: "i1", planId: "p", orgId: "org-alfa", rank: 1, title: "Criada com o plano", description: "", effort: "medio", status: "concluida", ownerUserId: "u", ownerRoleLabel: "x", dueOn: "2026-06-20", metricLabel: "m", metricBaseline: 0, metricTarget: 1, metricUnit: "u", sourceLensId: "fibt", sourceWaveId: "w", sourceCohortId: "c", sourceFactorId: "bem_estar", sourceInstrumentVersion: "1.0.0", sourcePublishedAt: "2026-06-20T12:00:00Z" },
      { id: "i2", planId: "p", orgId: "org-alfa", rank: 2, title: "Incluída depois", description: "", effort: "baixo", status: "em_vigilancia", ownerUserId: "u", ownerRoleLabel: "x", dueOn: "2026-06-25", metricLabel: "m", metricBaseline: 0, metricTarget: 1, metricUnit: "u", sourceLensId: "fibt", sourceWaveId: "w", sourceCohortId: "c", sourceFactorId: "bem_estar", sourceInstrumentVersion: "1.0.0", sourcePublishedAt: "2026-06-20T12:00:00Z", createdAt: "2026-06-15T10:00:00Z", addedByRole: "RH_ADMIN" },
    ],
    evidence: [{ id: "e1", itemId: "i1", orgId: "org-alfa", kind: "texto", scope: "execucao", contentRef: "Ata", occurredOn: "2026-06-10", createdAt: "2026-06-11T10:00:00Z" }],
    events: [],
    cohortLabels: {},
  };

  test("a visão de plano encerrado preserva histórico e eficácia continua não avaliada", () => {
    const [plan] = buildFibtActionPlanViews(snapshot, "org-alfa", "u");
    expect(plan).toMatchObject({ status: "closed", closedAt: "2026-06-29T10:00:00Z", closedByRole: "RH_ADMIN", composition: "available" });
    expect(plan!.actions.map((a) => a.addedLater)).toEqual([null, { at: "2026-06-15T10:00:00Z", byRole: "RH_ADMIN" }]);
    expect(plan!.actions[0]!.evidence.execution).toHaveLength(1);
    for (const a of plan!.actions) expect(a.efficacy.status).toBe("not_evaluated");
  });

  test("snapshot de banco sem a migration marca a composição como indisponível", () => {
    const [plan] = buildFibtActionPlanViews({ ...snapshot, composition: false }, "org-alfa", "u");
    expect(plan!.composition).toBe("unavailable");
  });

  test("regra pura de encerramento: bloqueios, contagens e descrição das pendências", () => {
    const act = (id: string, status: PlanActionStatus) => ({ id, title: `Ação ${id}`, status });
    expect(assessPlanClosure({ status: "active", actions: [] })).toMatchObject({ canClose: false, block: "plan_empty" });
    expect(assessPlanClosure({ status: "draft", actions: [act("a", "concluida")] })).toMatchObject({ canClose: false, block: "plan_not_active" });
    expect(assessPlanClosure({ status: "closed", actions: [act("a", "concluida")] })).toMatchObject({ canClose: false, block: "plan_closed" });
    const pending = assessPlanClosure({ status: "active", actions: [act("a", "concluida"), act("b", "planejada"), act("c", "em_execucao"), act("d", "planejada")] });
    expect(pending).toMatchObject({ canClose: false, block: "pending_actions", total: 4 });
    expect(pending.pending.map((p) => p.id)).toEqual(["b", "c", "d"]);
    expect(describePending(pending.pending)).toBe("2 planejada(s) · 1 em execução");
    const ok = assessPlanClosure({ status: "active", actions: [act("a", "concluida"), act("b", "em_vigilancia"), act("c", "interrompida")] });
    expect(ok).toMatchObject({ canClose: true, block: null, finished: { concluida: 1, em_vigilancia: 1, interrompida: 1 } });
  });

  test("describePending deriva os estados pendentes do complemento de OPERATIONAL_EXIT, sem lista paralela", () => {
    // Todo estado fora de OPERATIONAL_EXIT é descrito, na ordem do ciclo, com a mensagem de sempre.
    const states = Object.keys(PLAN_STATUS_LABEL) as PlanActionStatus[];
    const pendingStates = states.filter((status) => !OPERATIONAL_EXIT.includes(status));
    expect(describePending(pendingStates.map((status) => ({ id: status, title: status, status })))).toBe("1 planejada(s) · 1 em execução");
    // Se a regra de saída mudar (aqui, "interrompida" volta a ser pendente), a descrição acompanha.
    const exit = OPERATIONAL_EXIT as PlanActionStatus[];
    const at = exit.indexOf("interrompida");
    exit.splice(at, 1);
    try {
      expect(describePending([{ id: "i", title: "i", status: "interrompida" }])).toBe("1 interrompida");
    } finally {
      exit.splice(at, 0, "interrompida");
    }
    expect([...OPERATIONAL_EXIT]).toEqual(["concluida", "em_vigilancia", "interrompida"]);
  });

  test("os estados de saída do TypeScript são os mesmos do gatilho SQL", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261016120000_ivo_plan_composition_and_closure.sql"), "utf8");
    const listed = /status NOT IN \(([^)]*)\)/.exec(sql)?.[1]?.split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(listed).toEqual([...OPERATIONAL_EXIT]);
  });

  test("o banco é a autoridade: o gatilho cobre as regras que o servidor antecipa", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261016120000_ivo_plan_composition_and_closure.sql"), "utf8");
    for (const token of [
      "ivo_plan_closed", "ivo_plan_not_found", "ivo_plan_active_needs_accountability", "ivo_plan_origin_denied",
      "ivo_plan_source_not_published", "ivo_plan_close_pending", "ivo_plan_close_empty", "ivo_plan_close_requires_active",
      "FOR NO KEY UPDATE", "FOR SHARE", "action_items_add_request_uidx",
    ]) expect(sql).toContain(token);
    // Sem função nova em public e sem DELETE/EXECUTE concedido.
    expect(sql).not.toMatch(/CREATE (OR REPLACE )?FUNCTION public\./);
    expect(sql).not.toMatch(/GRANT[^;]*(DELETE|EXECUTE)/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
  });

  test("mapeia erros do banco em motivos estáveis", () => {
    expect(mapPlanCompositionDbError({ message: "ivo_plan_closed" })).toBe("plan_closed");
    expect(mapPlanCompositionDbError({ message: "ivo_plan_closed_is_immutable" })).toBe("plan_closed");
    expect(mapPlanCompositionDbError({ message: "ivo_plan_close_pending" })).toBe("pending_actions");
    expect(mapPlanCompositionDbError({ message: "ivo_plan_close_empty" })).toBe("plan_empty");
    expect(mapPlanCompositionDbError({ message: "ivo_plan_active_needs_accountability" })).toBe("accountability_required");
    expect(mapPlanCompositionDbError({ message: "ivo_plan_origin_denied" })).toBe("provenance_cross_tenant_denied");
    expect(mapPlanCompositionDbError({ code: "23505", message: "duplicate key" })).toBe("duplicate_request");
    expect(mapPlanCompositionDbError({ code: "42703", message: 'column "closed_at" does not exist' })).toBe("composition_unavailable");
    expect(mapPlanCompositionDbError({ code: "PGRST204", message: "x" })).toBe("composition_unavailable");
    expect(mapPlanCompositionDbError({ message: "qualquer coisa" })).toBe("db_error");
    expect(mapPlanCompositionDbError(null)).toBe("db_error");
    expect(isUndefinedColumnError({ code: "42703" })).toBe(true);
    expect(isUndefinedColumnError({ message: 'column action_plans.closed_at does not exist' })).toBe(true);
    expect(isUndefinedColumnError({ code: "23505" })).toBe(false);
    expect(isUndefinedColumnError(null)).toBe(false);
  });

  /** Executa `run` com console.warn capturado (restaurado sempre); serve a código síncrono e assíncrono. */
  async function withCapturedWarnings<T>(run: () => T | Promise<T>): Promise<{ result: T; warnings: unknown[][] }> {
    const original = console.warn;
    const warnings: unknown[][] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };
    try {
      return { result: await run(), warnings };
    } finally {
      console.warn = original;
    }
  }

  test("deriva: todo token ivo_plan_* que a migration levanta tem motivo público próprio OU diagnóstico interno explícito", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261016120000_ivo_plan_composition_and_closure.sql"), "utf8");
    const raised = [...new Set([...sql.matchAll(/'(ivo_plan_[a-z_]+)'/g)].map((m) => m[1]!))].sort();
    // O extrator precisa enxergar tokens dos dois grupos; sem isto, um regex quebrado aprovaria tudo.
    expect(raised).toContain("ivo_plan_closed");
    expect(raised).toContain("ivo_plan_close_needs_actor");
    const treated = (token: string) => mapPlanCompositionDbError({ message: token }) !== "db_error" || token in PLAN_TRIGGER_DIAGNOSTICS;
    expect(raised.filter((token) => !treated(token))).toEqual([]);
    // Um token novo, sem tratamento, seria apontado.
    expect(treated("ivo_plan_token_novo")).toBe(false);
    // A lista explícita não guarda token que a migration deixou de levantar nem token que já tem motivo próprio.
    for (const token of Object.keys(PLAN_TRIGGER_DIAGNOSTICS)) {
      expect(raised).toContain(token);
      expect(mapPlanCompositionDbError({ message: token })).toBe("db_error");
    }
  });

  test("os tokens sem motivo próprio seguem como db_error para o usuário, mas cada um deixa um diagnóstico interno distinto e sem PII", async () => {
    const tokens = Object.keys(PLAN_TRIGGER_DIAGNOSTICS) as Array<keyof typeof PLAN_TRIGGER_DIAGNOSTICS>;
    const { result, warnings } = await withCapturedWarnings(() =>
      tokens.map((token) => planCompositionDbRejection({ code: "42501", message: `${token} DETAIL: org-secreta-123` })),
    );
    // Motivo público: o `db_error` de sempre (não é um erro que o usuário possa corrigir).
    expect(result).toEqual(tokens.map(() => ({ accepted: false, reason: "db_error" })));
    // Diagnóstico interno: um por token, todos distintos; só o código estático, nada da mensagem do banco.
    const diagnostics = warnings.map(([, context]) => (context as { diagnostic: string }).diagnostic);
    expect(diagnostics).toEqual(tokens.map((token) => PLAN_TRIGGER_DIAGNOSTICS[token]));
    expect(new Set(diagnostics).size).toBe(tokens.length);
    expect(JSON.stringify(warnings)).not.toContain("org-secreta-123");
    // Quem já tem motivo próprio, o erro genérico e a ausência de erro não geram diagnóstico.
    const quiet = await withCapturedWarnings(() => [
      planCompositionDbRejection({ message: "ivo_plan_closed" }),
      planCompositionDbRejection({ code: "23505", message: "duplicate key" }),
      planCompositionDbRejection({ message: "qualquer coisa" }),
      planCompositionDbRejection(null),
    ]);
    expect(quiet.result.map((r) => r.reason)).toEqual(["plan_closed", "duplicate_request", "db_error", "db_error"]);
    expect(quiet.warnings).toEqual([]);
  });

  test("pelo serviço, a recusa do banco por esses tokens continua sendo o db_error genérico: mesmo motivo, mesma mensagem", async () => {
    const GENERIC = "O registro não pôde ser gravado agora. Nada foi alterado.";
    const { result } = await withCapturedWarnings(async () => {
      const add = memoryStore();
      add.store.addAction = async () => planCompositionDbRejection({ code: "23514", message: "ivo_plan_insert_must_be_draft" });
      const close = memoryStore();
      close.store.closePlan = async () => planCompositionDbRejection({ code: "55000", message: "ivo_plan_status_transition_invalid" });
      return [await addFibtActionToPlan(ADD, depsOf(add)), await closeFibtActionPlan(CLOSE, depsOf(close))];
    });
    for (const outcome of result) expect(outcome).toEqual({ ok: true, accepted: false, reason: "db_error", message: GENERIC });
  });

  test("schemas estritos: organização do cliente é recusada e o encerramento exige aceite explícito", () => {
    const base = { accessToken: "token-alfa-admin", planId: ID.planAlfa, requestId: ID.req1, waveId: ID.waveAlfa, cohortId: ID.a1, factorId: "bem_estar", title: "Oficina de pausas", effort: "baixo" as const };
    expect(ivoActionLoopSchemas.addAction.safeParse(base).success).toBe(true);
    expect(ivoActionLoopSchemas.addAction.safeParse({ ...base, orgId: "org-beta" }).success).toBe(false);
    expect(ivoActionLoopSchemas.addAction.safeParse({ ...base, requestId: "nao-e-uuid" }).success).toBe(false);
    expect(ivoActionLoopSchemas.addAction.safeParse({ ...base, title: "ab" }).success).toBe(false);
    expect(ivoActionLoopSchemas.addAction.safeParse({ ...base, status: "concluida" }).success).toBe(false);
    expect(ivoActionLoopSchemas.addAction.safeParse({ ...base, accountability: { ownerRoleLabel: "Gestão", dueOn: "2026-09-30", executionMetric: { label: "Oficinas", baseline: 0, target: 2, unit: "of" }, ownerUserId: "u" } }).success).toBe(false);
    expect(ivoActionLoopSchemas.closePlan.safeParse({ accessToken: "token-alfa-admin", planId: ID.planAlfa }).success).toBe(false);
    expect(ivoActionLoopSchemas.closePlan.safeParse({ accessToken: "token-alfa-admin", planId: ID.planAlfa, confirm: false }).success).toBe(false);
    expect(ivoActionLoopSchemas.closePlan.safeParse({ accessToken: "token-alfa-admin", planId: ID.planAlfa, confirm: true }).success).toBe(true);
    expect(ivoActionLoopSchemas.closePlan.safeParse({ accessToken: "token-alfa-admin", planId: ID.planAlfa, confirm: true, orgId: "org-beta" }).success).toBe(false);
  });
});
