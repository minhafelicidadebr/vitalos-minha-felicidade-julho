// Jornada IVO R5/R6 no servidor, com DUAS organizações fictícias.
//
// O leitor FIB-T REAL (loadFibtManagerControlCenterAsAdmin + buildProtectedCohortReading)
// roda sobre uma store falsa de duas organizações; sessão, identidade e fronteira
// HML são injetadas. Nada de rede, nada de banco. A prova de banco (RLS, FK,
// RPC) vive em supabase/tests/07; a de integração real, em
// scripts/ivo-local-journey-proof.ts.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { FIBT_K_MIN } from "@/engine/fibt/fibt-engine";
import { buildIvoMatrix } from "@/engine/ivo/ivo-matrix";
import { ivoDimensionsForPack, ivoLensCatalog } from "@/domain/ivo/lens-catalog";
import { getDimensionMappings } from "@/domain/ivo/dimension-mappings";
import type { MembershipResult } from "@/lib/auth/authorize.server";
import type { FibtManagerStore, FibtManagerWaveRow } from "@/lib/fibt/fibt-manager-control-center.server";
import { ivoQ2ReadingSchema } from "@/lib/api/ivo-q2-reading.functions";
import { ivoActionLoopSchemas } from "@/lib/api/ivo-action-loop.functions";
import { loadIvoQ2ReadingForSession, type IvoQ2Deps } from "./ivo-q2-reading.server";
import {
  activateFibtActionPlan,
  buildFibtActionPlanViews,
  createFibtPriorityActions,
  loadFibtActionLoop,
  recordFibtActionEvidence,
  recordFibtActionStatus,
  setFibtActionAccountability,
  type FibtActionLedgerStore,
  type FibtActionLoopDeps,
  type FibtCreatePlanInput,
  type FibtLedgerSnapshot,
} from "./fibt-action-loop.server";

const manifest = getFibtManifest();
const VERSION = manifest.instrument_version;
const NOW = new Date("2026-06-30T15:00:00.000Z");
/** Valor distintivo: se aparecer em payload de ação/evidência, houve cópia. */
const DISTINCT_MEAN = 2.71875;
const means = Object.fromEntries(manifest.items.map((item) => [item.id, DISTINCT_MEAN]));

// UUIDs fictícios (o schema exige uuid nos ids vindos do cliente).
const ID = {
  waveAlfa: "11111111-1111-4111-8111-111111111111",
  waveBeta: "22222222-2222-4222-8222-222222222222",
  a1: "11111111-1111-4111-8111-1111111111a1",
  a2: "11111111-1111-4111-8111-1111111111a2",
  a3: "11111111-1111-4111-8111-1111111111a3",
  a4: "11111111-1111-4111-8111-1111111111a4",
  b1: "22222222-2222-4222-8222-2222222222b1",
  b2: "22222222-2222-4222-8222-2222222222b2",
};

function wave(id: string, orgId: string, name: string): FibtManagerWaveRow {
  return {
    id,
    orgId,
    organizationName: name,
    label: `Onda FIB-T ${name}`,
    instrument: "FIB_T",
    instrumentVersion: VERSION,
    status: "collecting",
    sealOutcome: null,
    createdAt: "2026-04-10T12:00:00.000Z",
    closesAt: null,
  };
}

const WAVES: Record<string, FibtManagerWaveRow> = {
  [ID.waveAlfa]: wave(ID.waveAlfa, "org-alfa", "Organização Fictícia Alfa"),
  [ID.waveBeta]: wave(ID.waveBeta, "org-beta", "Organização Fictícia Beta"),
};

// Alfa: A1 publicado (9), A2=3 e A3=2 abaixo do limiar (dois ocultos → sem
// supressão complementar), A4=6 aguardando lote (sem publicação).
// Beta: B1=8 publicado e B2=3 — um único oculto → supressão complementar.
const COHORTS = {
  [ID.waveAlfa]: [
    { id: ID.a1, key: "alfa-a1", label: "Operações", count: 9, published: true },
    { id: ID.a2, key: "alfa-a2", label: "Logística", count: 3, published: false },
    { id: ID.a3, key: "alfa-a3", label: "Financeiro", count: 2, published: false },
    { id: ID.a4, key: "alfa-a4", label: "Atendimento", count: 6, published: false },
  ],
  [ID.waveBeta]: [
    { id: ID.b1, key: "beta-b1", label: "Produção", count: 8, published: true },
    { id: ID.b2, key: "beta-b2", label: "Qualidade", count: 3, published: false },
  ],
} as const;

interface StoreSpy {
  participationReads: string[];
}

function fakeFibtStore(spy: StoreSpy): FibtManagerStore {
  return {
    findWave: async (orgId, waveId) => (WAVES[waveId]?.orgId === orgId ? WAVES[waveId]! : null),
    findCanonicalHmlWave: async () => null,
    listCohorts: async (orgId, waveId) =>
      WAVES[waveId]?.orgId === orgId
        ? (COHORTS[waveId as keyof typeof COHORTS] ?? []).map((c) => ({ id: c.id, orgId, waveId, key: c.key, label: c.label }))
        : [],
    listLinks: async () => [],
    listSegmentParticipation: async (waveId) => {
      spy.participationReads.push(waveId);
      return (COHORTS[waveId as keyof typeof COHORTS] ?? []).map((c) => ({
        cohortId: c.id,
        count: c.count,
        instrumentVersions: [VERSION],
      }));
    },
    listPublishedSnapshots: async (waveId) =>
      (COHORTS[waveId as keyof typeof COHORTS] ?? [])
        .filter((c) => c.published)
        .map((c) => ({
          cohortId: c.id,
          publishedResponseCount: c.count,
          itemMeans: means,
          publishedAt: "2026-06-20T12:00:00.000Z",
        })),
    listEvents: async () => [],
  };
}

const SESSIONS: Record<string, MembershipResult> = {
  "token-alfa-admin": { ok: true, membership: { userId: "user-alfa", orgId: "org-alfa", role: "RH_ADMIN" } },
  "token-beta-admin": { ok: true, membership: { userId: "user-beta", orgId: "org-beta", role: "RH_ADMIN" } },
  "token-alfa-membro": { ok: false, reason: "not_admin" },
  "token-sem-perfil": { ok: false, reason: "no_profile" },
};

function q2Deps(spy: StoreSpy = { participationReads: [] }, extra: Partial<IvoQ2Deps> = {}): IvoQ2Deps & { sessionsSeen: string[] } {
  const sessionsSeen: string[] = [];
  return {
    sessionsSeen,
    boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
    identity: () => ({
      requestedMode: "cloud",
      state: "cloud",
      realAuthentication: true,
      serverEnforced: true,
      reason: "cloud_ready",
    }),
    requireAdmin: async (accessToken) => {
      sessionsSeen.push(accessToken);
      return SESSIONS[accessToken] ?? { ok: false, reason: "invalid_session" };
    },
    store: fakeFibtStore(spy),
    now: () => NOW,
    pilotEnabled: () => true,
    locateLatestWave: async (orgId) => {
      const found = Object.values(WAVES).find((w) => w.orgId === orgId);
      return found ? { id: found.id } : null;
    },
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// R5 — leitura Q2 autenticada
// ═══════════════════════════════════════════════════════════════════════════

describe("R5 · leitura Q2 autenticada no servidor", () => {
  test("sessão ausente ou inválida falha sem ler nada", async () => {
    for (const accessToken of [undefined, "token-invalido-qualquer"]) {
      const spy = { participationReads: [] as string[] };
      const r = await loadIvoQ2ReadingForSession({ accessToken }, q2Deps(spy));
      expect(r).toMatchObject({ ok: false, category: "unauthenticated" });
      expect(spy.participationReads).toEqual([]);
      expect(JSON.stringify(r)).not.toContain("Operações");
    }
  });

  test("papel sem permissão e conta sem organização são recusados sem leitura", async () => {
    for (const accessToken of ["token-alfa-membro", "token-sem-perfil"]) {
      const spy = { participationReads: [] as string[] };
      const r = await loadIvoQ2ReadingForSession({ accessToken }, q2Deps(spy));
      expect(r).toMatchObject({ ok: false, category: "forbidden" });
      expect(spy.participationReads).toEqual([]);
    }
  });

  test("fronteira HML declarada e backend não-cloud recusam antes de olhar a sessão", async () => {
    const hml = q2Deps(undefined, {
      boundary: () => ({ hmlDeclared: true, attested: true, batchId: "b", serverProjectRefMasked: "m" }),
    });
    expect(await loadIvoQ2ReadingForSession({ accessToken: "token-alfa-admin" }, hml)).toMatchObject({
      ok: false,
      category: "hml_boundary",
    });
    expect(hml.sessionsSeen).toEqual([]);

    const demo = q2Deps(undefined, {
      identity: () => ({ requestedMode: "demo", state: "demo", realAuthentication: false, serverEnforced: false, reason: "demo_isolated" }),
    });
    expect(await loadIvoQ2ReadingForSession({ accessToken: "token-alfa-admin" }, demo)).toMatchObject({
      ok: false,
      category: "unavailable",
    });
    expect(demo.sessionsSeen).toEqual([]);
  });

  test("admin da Alfa lê só a própria onda, com estados distintos e versões", async () => {
    const r = await loadIvoQ2ReadingForSession({ accessToken: "token-alfa-admin" }, q2Deps());
    expect(r.ok && r.state === "ready").toBe(true);
    if (!r.ok || r.state !== "ready") return;
    const { view } = r;
    expect(view.organizationName).toBe("Organização Fictícia Alfa");
    expect(view.cycleKey).toBe("2026-T2");
    expect(view.methodology).toMatchObject({
      instrumentId: "fib_t",
      waveInstrumentVersion: "1.0.0",
      manifestVersion: "1.0.0",
      calculationVersion: "fibt-manifest/1.0.0",
      kMin: 5,
    });
    const byKey = Object.fromEntries(view.sectors.map((s) => [s.key, s]));
    expect(byKey["alfa-a1"]).toMatchObject({ group: "available", nativeState: "available", countLabel: "9" });
    expect(byKey["alfa-a1"]!.factors).toHaveLength(3);
    for (const key of ["alfa-a2", "alfa-a3"]) {
      expect(byKey[key]).toMatchObject({ group: "suppressed", nativeState: "insufficient_participants", countLabel: "<5", factors: null, rawScore: null });
    }
    expect(byKey["alfa-a4"]).toMatchObject({ group: "pending_publication", nativeState: "awaiting_batched_release", countLabel: "protegida", factors: null });
    expect(view.overall).toBe("available");
    // Projeção mínima: nada de links, telemetria, resposta ou contagem exata protegida.
    const serialized = JSON.stringify(view);
    for (const forbidden of ["answers", "links", "telemetry", "tokenHash", "Produção", "Qualidade"]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(serialized).not.toMatch(/"countLabel":"[1-4]"/);
  });

  test("admin da Beta não lê a onda da Alfa, nem por id escolhido", async () => {
    const spy = { participationReads: [] as string[] };
    const r = await loadIvoQ2ReadingForSession({ accessToken: "token-beta-admin", waveId: ID.waveAlfa }, q2Deps(spy));
    expect(r).toMatchObject({ ok: false, category: "validation" });
    expect(spy.participationReads).not.toContain(ID.waveAlfa);
    expect(JSON.stringify(r)).not.toContain("Operações");
  });

  test("supressão complementar continua valendo: Beta inteira protegida, sem número", async () => {
    const r = await loadIvoQ2ReadingForSession({ accessToken: "token-beta-admin" }, q2Deps());
    if (!r.ok || r.state !== "ready") throw new Error("esperava leitura");
    expect(r.view.overall).toBe("protected");
    expect(r.view.sectors.map((s) => s.nativeState)).toEqual(["complementary_suppression", "insufficient_participants"]);
    expect(r.view.sectors.every((s) => s.factors === null && !/^\d+$/.test(s.countLabel))).toBe(true);
  });

  test("organização sem onda FIB-T: estado próprio, não zero", async () => {
    const r = await loadIvoQ2ReadingForSession(
      { accessToken: "token-alfa-admin" },
      q2Deps(undefined, { locateLatestWave: async () => null }),
    );
    expect(r).toEqual({ ok: true, state: "no_wave" });
  });

  test("k_min é o mesmo contrato em todas as camadas alteradas", async () => {
    const r = await loadIvoQ2ReadingForSession({ accessToken: "token-alfa-admin" }, q2Deps());
    if (!r.ok || r.state !== "ready") throw new Error("esperava leitura");
    expect(FIBT_K_MIN).toBe(5);
    expect(r.view.methodology.kMin).toBe(FIBT_K_MIN);
    expect(r.view.reading.kMin).toBe(FIBT_K_MIN);
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260909222000_cohort_batched_release_temporal_privacy.sql"),
      "utf8",
    );
    expect(sql).toContain(`v_k                CONSTANT INTEGER := ${FIBT_K_MIN};`);
  });

  test("a matriz funciona com mapeamentos IVO pendentes", async () => {
    const r = await loadIvoQ2ReadingForSession({ accessToken: "token-alfa-admin" }, q2Deps());
    if (!r.ok || r.state !== "ready") throw new Error("esperava leitura");
    expect(getDimensionMappings()).toEqual([]);
    const matrix = buildIvoMatrix({
      organizationId: r.view.reading.organizationId,
      dimensions: ivoDimensionsForPack("enterprise"),
      lenses: ivoLensCatalog(),
      readings: [r.view.reading],
      mappings: getDimensionMappings(),
    });
    for (const row of matrix.rows) {
      const fibt = row.cells.find((c) => c.lens === "fibt")!;
      expect(fibt).toMatchObject({ resultState: "available", mapping: "none", evidence: [] });
      expect(fibt.cohortSummary).toEqual({ published: 1, protected: 3, collecting: 0, total: 4 });
    }
    expect(matrix.warnings).toEqual([]);
  });

  test("orgId vindo do cliente é recusado pelo schema", () => {
    expect(ivoQ2ReadingSchema.safeParse({ accessToken: "token-alfa-admin", orgId: "org-beta" }).success).toBe(false);
    expect(ivoActionLoopSchemas.load.safeParse({ accessToken: "token-alfa-admin", orgId: "org-beta" }).success).toBe(false);
    expect(
      ivoActionLoopSchemas.evidence.safeParse({
        accessToken: "token-alfa-admin",
        itemId: ID.a1,
        scope: "execucao",
        content: "ata",
        occurredOn: "2026-06-01",
        orgId: "org-beta",
      }).success,
    ).toBe(false);
  });

  test("a leitura IVO nunca avança a publicação protegida nem usa service_role sem sessão", () => {
    const source = readFileSync(join(import.meta.dir, "ivo-q2-reading.server.ts"), "utf8");
    expect(source).not.toContain("advanceCohortPublication");
    expect(source).not.toMatch(/publisherAccessToken\s*:/);
    expect(source).not.toContain("@/lib/fibt-hml/hml-contract");
    expect(/\bISG\b/.test(source)).toBe(false);
    // O único uso de service_role (localizar a onda) é chamado depois de authorizeIvoSession.
    const sessionEntry = source.indexOf("export async function loadIvoQ2ReadingForSession");
    const body = source.slice(sessionEntry);
    expect(body.indexOf("authorizeIvoSession")).toBeLessThan(body.indexOf("loadIvoQ2ForOrg"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// R6 — prioridade → ação → evidência → aprendizagem
// ═══════════════════════════════════════════════════════════════════════════

/** Ledger em memória que imita as RPCs do ledger (transições, §13, rascunho). */
function memoryLedger() {
  const state: FibtLedgerSnapshot = { plans: [], items: [], evidence: [], events: [], cohortLabels: {} };
  const createCalls: FibtCreatePlanInput[] = [];
  let seq = 0;
  const id = (prefix: string) => `${prefix}-${++seq}`;

  const store: FibtActionLedgerStore = {
    loadFibtLedger: async (orgId) => ({
      plans: state.plans.filter((p) => p.orgId === orgId),
      items: state.items.filter((i) => i.orgId === orgId),
      evidence: state.evidence.filter((e) => e.orgId === orgId),
      events: state.events.filter((e) => e.orgId === orgId),
      cohortLabels: { [ID.a1]: "Operações" },
    }),
    listPlanCycles: async (orgId) =>
      state.plans.filter((p) => p.orgId === orgId).map((p) => ({ id: p.id, cycleKey: p.cycleKey, status: p.status })),
    findItem: async (orgId, itemId) => {
      const item = state.items.find((i) => i.id === itemId && i.orgId === orgId);
      const plan = item && state.plans.find((p) => p.id === item.planId);
      return item && plan
        ? { id: item.id, orgId: item.orgId, planId: item.planId, sourceLensId: item.sourceLensId, sourceFactorId: item.sourceFactorId, status: item.status, planStatus: plan.status }
        : null;
    },
    findPlan: async (orgId, planId) => {
      const plan = state.plans.find((p) => p.id === planId && p.orgId === orgId);
      return plan ? { id: plan.id, orgId: plan.orgId, status: plan.status } : null;
    },
    createPlan: async (input) => {
      createCalls.push(structuredClone(input));
      const planId = id("plan");
      state.plans.push({ id: planId, orgId: input.orgId, cycleKey: input.cycleKey, seasonName: input.seasonName, status: "draft", createdAt: NOW.toISOString(), activatedAt: null });
      for (const raw of input.items) {
        state.items.push({
          id: id("item"),
          planId,
          orgId: input.orgId,
          rank: Number(raw.rank),
          title: String(raw.title),
          description: String(raw.description),
          effort: raw.effort as "medio",
          status: "planejada",
          ownerUserId: null,
          ownerRoleLabel: null,
          dueOn: null,
          metricLabel: null,
          metricBaseline: null,
          metricTarget: null,
          metricUnit: null,
          sourceLensId: String(raw.source_lens_id),
          sourceWaveId: String(raw.source_wave_id),
          sourceCohortId: String(raw.source_cohort_id),
          sourceFactorId: String(raw.source_factor_id),
          // Derivados "no banco" — como a RPC real faz.
          sourceInstrumentVersion: VERSION,
          sourcePublishedAt: "2026-06-20T12:00:00.000Z",
        });
      }
      return { accepted: true, reason: null, planId };
    },
    setAccountability: async (input) => {
      const item = state.items.find((i) => i.id === input.itemId)!;
      Object.assign(item, {
        ownerUserId: input.owner?.userId ?? null,
        ownerRoleLabel: input.owner?.roleLabel ?? null,
        dueOn: input.dueOn,
        metricLabel: input.metric?.label ?? null,
        metricBaseline: input.metric?.baseline ?? null,
        metricTarget: input.metric?.target ?? null,
        metricUnit: input.metric?.unit ?? null,
      });
      return { accepted: true, reason: null };
    },
    activatePlan: async (planId) => {
      const incomplete = state.items.filter((i) => i.planId === planId && (!i.ownerUserId || !i.dueOn || !i.metricLabel)).length;
      if (incomplete > 0) return { accepted: false, reason: "incomplete_section_13", incompleteCount: incomplete };
      state.plans.find((p) => p.id === planId)!.status = "active";
      return { accepted: true };
    },
    recordEvent: async (input) => {
      const item = state.items.find((i) => i.id === input.itemId)!;
      item.status = input.toStatus!;
      state.events.push({ id: id("ev"), itemId: item.id, orgId: item.orgId, kind: input.kind, toStatus: input.toStatus ?? null, note: input.note ?? null, occurredAt: NOW.toISOString() });
      return { accepted: true, reason: null };
    },
    recordEvidence: async (input) => {
      const item = state.items.find((i) => i.id === input.itemId)!;
      const evidenceId = id("evidence");
      state.evidence.push({
        id: evidenceId,
        itemId: item.id,
        orgId: item.orgId,
        kind: input.evidenceKind,
        scope: input.evidenceKind === "aprendizagem" ? "aprendizagem" : "execucao",
        contentRef: input.contentRef,
        occurredOn: input.occurredOn,
        createdAt: NOW.toISOString(),
      });
      return { accepted: true, reason: null, evidenceId };
    },
  };
  return { store, state, createCalls };
}

function loopDeps(ledger: FibtActionLedgerStore, extra: Partial<FibtActionLoopDeps> = {}): FibtActionLoopDeps {
  return { ...q2Deps(), capability: () => ({ enabled: true, source: "local_fixture" }), ledger, ...extra };
}

const PRIORITY = {
  cohortId: ID.a1,
  factorId: "bem_estar",
  title: "Rodas de conversa sobre carga de trabalho",
  description: "Quatro encontros quinzenais com a equipe.",
  effort: "medio" as const,
};

describe("R6 · ciclo de ação FIB-T sobre o ledger", () => {
  test("capability desligada (registro global) bloqueia antes de qualquer leitura", async () => {
    const { store, createCalls } = memoryLedger();
    const deps = loopDeps(store, { capability: () => ({ enabled: false, reason: "registry_disabled" }) });
    expect(await loadFibtActionLoop({ accessToken: "token-alfa-admin" }, deps)).toMatchObject({ ok: false, category: "unavailable" });
    expect(await createFibtPriorityActions({ accessToken: "token-alfa-admin", waveId: ID.waveAlfa, priorities: [PRIORITY] }, deps)).toMatchObject({ ok: false, category: "unavailable" });
    expect(createCalls).toEqual([]);
  });

  test("prioridade de setor publicado vira ação com origem por referência, sem copiar valores", async () => {
    const { store, createCalls } = memoryLedger();
    const r = await createFibtPriorityActions(
      { accessToken: "token-alfa-admin", waveId: ID.waveAlfa, priorities: [PRIORITY] },
      loopDeps(store),
    );
    expect(r).toMatchObject({ ok: true, accepted: true });
    expect(createCalls).toHaveLength(1);
    const call = createCalls[0]!;
    expect(call).toMatchObject({ orgId: "org-alfa", createdBy: "user-alfa", cycleKey: "2026-T2" });
    expect(call.items[0]).toMatchObject({
      source_lens_id: "fibt",
      source_wave_id: ID.waveAlfa,
      source_cohort_id: ID.a1,
      source_factor_id: "bem_estar",
      expected_ivo_lift: 0,
    });
    // Nenhum valor da leitura publicada nem rótulo de contagem vai para a ação.
    const payload = JSON.stringify(call);
    expect(payload).not.toContain(String(DISTINCT_MEAN));
    for (const key of ["mean", "countLabel", "rawScore", "escore", "itemMeans", "answers"]) {
      expect(payload).not.toContain(key);
    }
  });

  test("setor suprimido ou com publicação pendente não embasa ação", async () => {
    for (const cohortId of [ID.a2, ID.a3, ID.a4]) {
      const { store, createCalls } = memoryLedger();
      const r = await createFibtPriorityActions(
        { accessToken: "token-alfa-admin", waveId: ID.waveAlfa, priorities: [{ ...PRIORITY, cohortId }] },
        loopDeps(store),
      );
      expect(r).toMatchObject({ ok: true, accepted: false, reason: "source_not_published" });
      expect(createCalls).toEqual([]);
    }
  });

  test("proveniência não cruza organizações: Beta não cita onda nem coorte da Alfa", async () => {
    const { store, createCalls } = memoryLedger();
    const foreignWave = await createFibtPriorityActions(
      { accessToken: "token-beta-admin", waveId: ID.waveAlfa, priorities: [PRIORITY] },
      loopDeps(store),
    );
    expect(foreignWave).toMatchObject({ ok: false, category: "validation" });
    const foreignCohort = await createFibtPriorityActions(
      { accessToken: "token-beta-admin", waveId: ID.waveBeta, priorities: [PRIORITY] },
      loopDeps(store),
    );
    expect(foreignCohort).toMatchObject({ ok: true, accepted: false, reason: "source_not_published" });
    expect(createCalls).toEqual([]);
  });

  test("prioridade duplicada e ciclo equivalente já planejado são recusados", async () => {
    const { store, state, createCalls } = memoryLedger();
    expect(
      await createFibtPriorityActions(
        { accessToken: "token-alfa-admin", waveId: ID.waveAlfa, priorities: [PRIORITY, PRIORITY] },
        loopDeps(store),
      ),
    ).toMatchObject({ accepted: false, reason: "duplicate_priority" });

    state.plans.push({ id: "plan-legado", orgId: "org-alfa", cycleKey: "2026-t2", seasonName: "registro", status: "draft", createdAt: NOW.toISOString(), activatedAt: null });
    expect(
      await createFibtPriorityActions(
        { accessToken: "token-alfa-admin", waveId: ID.waveAlfa, priorities: [PRIORITY] },
        loopDeps(store),
      ),
    ).toMatchObject({ accepted: false, reason: "cycle_already_planned" });
    expect(createCalls).toEqual([]);
  });

  test("jornada completa: responsável, prazo, ativação, estado, evidência e aprendizagem reaparecem na releitura", async () => {
    const { store } = memoryLedger();
    const deps = loopDeps(store);
    await createFibtPriorityActions({ accessToken: "token-alfa-admin", waveId: ID.waveAlfa, priorities: [PRIORITY] }, deps);
    const first = await loadFibtActionLoop({ accessToken: "token-alfa-admin" }, deps);
    if (!first.ok) throw new Error(first.error);
    const action = first.plans[0]!.actions[0]!;
    expect(first.plans[0]!.missingAccountability).toBe(1);

    // Evidência antes de ativar é recusada (plano precisa estar ativo).
    expect(
      await recordFibtActionEvidence({ accessToken: "token-alfa-admin", itemId: action.id, scope: "execucao", content: "Ata", occurredOn: "2026-06-10" }, deps),
    ).toMatchObject({ accepted: false, reason: "plan_not_active" });

    expect(
      await setFibtActionAccountability(
        {
          accessToken: "token-alfa-admin",
          itemId: action.id,
          ownerRoleLabel: "Coordenação de Operações",
          dueOn: "2026-09-30",
          executionMetric: { label: "Encontros realizados", baseline: 0, target: 4, unit: "encontros" },
        },
        deps,
      ),
    ).toMatchObject({ accepted: true });
    expect(await activateFibtActionPlan({ accessToken: "token-alfa-admin", planId: action.planId }, deps)).toMatchObject({ accepted: true });

    // Transição inválida a partir do estado REAL (planejada → concluida).
    expect(
      await recordFibtActionStatus({ accessToken: "token-alfa-admin", itemId: action.id, toStatus: "concluida" }, deps),
    ).toMatchObject({ accepted: false, reason: "invalid_transition" });
    expect(
      await recordFibtActionStatus({ accessToken: "token-alfa-admin", itemId: action.id, toStatus: "em_execucao" }, deps),
    ).toMatchObject({ accepted: true });
    expect(
      await recordFibtActionEvidence({ accessToken: "token-alfa-admin", itemId: action.id, scope: "execucao", kind: "texto", content: "Ata do 1º encontro", occurredOn: "2026-06-12" }, deps),
    ).toMatchObject({ accepted: true });
    expect(
      await recordFibtActionEvidence({ accessToken: "token-alfa-admin", itemId: action.id, scope: "aprendizagem", content: "Horário após o turno teve mais adesão", occurredOn: "2026-06-26" }, deps),
    ).toMatchObject({ accepted: true });
    // Data futura (relógio controlado) é recusada.
    expect(
      await recordFibtActionEvidence({ accessToken: "token-alfa-admin", itemId: action.id, scope: "execucao", content: "Futuro", occurredOn: "2026-07-15" }, deps),
    ).toMatchObject({ accepted: false, reason: "invalid_date" });

    // "Recarregar": nova chamada, mesma store.
    const reloaded = await loadFibtActionLoop({ accessToken: "token-alfa-admin" }, deps);
    if (!reloaded.ok) throw new Error(reloaded.error);
    const again = reloaded.plans[0]!.actions[0]!;
    expect(reloaded.plans[0]).toMatchObject({ status: "active", cycleKeyCanonical: "2026-T2", missingAccountability: 0 });
    expect(again).toMatchObject({
      status: "em_execucao",
      owner: { roleLabel: "Coordenação de Operações", isCurrentUser: true },
      dueOn: "2026-09-30",
      source: { lens: "fibt", cohortLabel: "Operações", factorName: "Bem-Estar", instrumentVersion: "1.0.0" },
      dimension: { status: "mapping_pending", dimensionIds: [] },
      efficacy: { status: "not_evaluated" },
    });
    expect(again.evidence.execution.map((e) => e.content)).toEqual(["Ata do 1º encontro"]);
    expect(again.evidence.learning.map((e) => e.content)).toEqual(["Horário após o turno teve mais adesão"]);
    expect(JSON.stringify(reloaded)).not.toContain("user-alfa");
  });

  test("prazo canônico 2026-10-11 (dia ≤ 12) não inverte; execução e aprendizagem gravam só o próprio escopo, sem duplicar", async () => {
    const { store } = memoryLedger();
    const deps = loopDeps(store);
    await createFibtPriorityActions({ accessToken: "token-alfa-admin", waveId: ID.waveAlfa, priorities: [PRIORITY] }, deps);
    const first = await loadFibtActionLoop({ accessToken: "token-alfa-admin" }, deps);
    if (!first.ok) throw new Error(first.error);
    const action = first.plans[0]!.actions[0]!;
    await setFibtActionAccountability(
      { accessToken: "token-alfa-admin", itemId: action.id, ownerRoleLabel: "Coordenação de Operações", dueOn: "2026-10-11", executionMetric: { label: "Encontros", baseline: 0, target: 1, unit: "encontro" } },
      deps,
    );
    await activateFibtActionPlan({ accessToken: "token-alfa-admin", planId: action.planId }, deps);
    // Um envio de cada tipo, cada um com o outro campo "vazio" (não enviado).
    const exec = await recordFibtActionEvidence({ accessToken: "token-alfa-admin", itemId: action.id, scope: "execucao", kind: "texto", content: "Encontro realizado", occurredOn: "2026-06-10" }, deps);
    expect(exec).toMatchObject({ accepted: true });
    const learn = await recordFibtActionEvidence({ accessToken: "token-alfa-admin", itemId: action.id, scope: "aprendizagem", content: "Pauta curta funcionou", occurredOn: "2026-06-10" }, deps);
    expect(learn).toMatchObject({ accepted: true });
    const reloaded = await loadFibtActionLoop({ accessToken: "token-alfa-admin" }, deps);
    if (!reloaded.ok) throw new Error(reloaded.error);
    const again = reloaded.plans[0]!.actions[0]!;
    expect(again.dueOn).toBe("2026-10-11");
    expect(again.evidence.execution.map((e) => e.content)).toEqual(["Encontro realizado"]);
    expect(again.evidence.learning.map((e) => e.content)).toEqual(["Pauta curta funcionou"]);
    expect(again.evidence.execution.map((e) => e.occurredOn)).toEqual(["2026-06-10"]);
  });
  test("Beta não lê nem altera ações e evidências da Alfa", async () => {
    const { store, state } = memoryLedger();
    const deps = loopDeps(store);
    await createFibtPriorityActions({ accessToken: "token-alfa-admin", waveId: ID.waveAlfa, priorities: [PRIORITY] }, deps);
    const alfaItem = state.items[0]!;
    const alfaPlan = state.plans[0]!;

    const betaView = await loadFibtActionLoop({ accessToken: "token-beta-admin" }, deps);
    expect(betaView).toEqual({ ok: true, plans: [] });

    const before = JSON.stringify(state);
    expect(await setFibtActionAccountability({ accessToken: "token-beta-admin", itemId: alfaItem.id, ownerRoleLabel: "Invasor", dueOn: "2026-09-30", executionMetric: { label: "x", baseline: 0, target: 1, unit: "" } }, deps)).toMatchObject({ accepted: false, reason: "item_not_found" });
    expect(await activateFibtActionPlan({ accessToken: "token-beta-admin", planId: alfaPlan.id }, deps)).toMatchObject({ accepted: false, reason: "plan_not_found" });
    expect(await recordFibtActionStatus({ accessToken: "token-beta-admin", itemId: alfaItem.id, toStatus: "em_execucao" }, deps)).toMatchObject({ accepted: false, reason: "item_not_found" });
    expect(await recordFibtActionEvidence({ accessToken: "token-beta-admin", itemId: alfaItem.id, scope: "execucao", content: "forjada", occurredOn: "2026-06-01" }, deps)).toMatchObject({ accepted: false, reason: "item_not_found" });
    expect(JSON.stringify(state)).toBe(before);
  });

  test("sessão ausente, inválida ou sem papel não lê nem escreve no ledger", async () => {
    const { store, createCalls } = memoryLedger();
    for (const accessToken of [undefined, "token-invalido-qualquer", "token-alfa-membro"]) {
      const load = await loadFibtActionLoop({ accessToken }, loopDeps(store));
      expect(load.ok).toBe(false);
      const create = await createFibtPriorityActions({ accessToken, waveId: ID.waveAlfa, priorities: [PRIORITY] }, loopDeps(store));
      expect(create.ok).toBe(false);
    }
    expect(createCalls).toEqual([]);
  });

  test("visão do ledger descarta linhas de outra organização mesmo se a store errar", () => {
    const views = buildFibtActionPlanViews(
      {
        plans: [
          { id: "p-alfa", orgId: "org-alfa", cycleKey: "2026-T2", seasonName: "s", status: "active", createdAt: "", activatedAt: null },
          { id: "p-beta", orgId: "org-beta", cycleKey: "2026-T2", seasonName: "s", status: "active", createdAt: "", activatedAt: null },
        ],
        items: [
          {
            id: "i-beta", planId: "p-beta", orgId: "org-beta", rank: 1, title: "beta", description: "", effort: "baixo",
            status: "planejada", ownerUserId: null, ownerRoleLabel: null, dueOn: null, metricLabel: null,
            metricBaseline: null, metricTarget: null, metricUnit: null, sourceLensId: "fibt", sourceWaveId: ID.waveBeta,
            sourceCohortId: ID.b1, sourceFactorId: "bem_estar", sourceInstrumentVersion: "1.0.0", sourcePublishedAt: "x",
          },
        ],
        evidence: [],
        events: [],
        cohortLabels: {},
      },
      "org-alfa",
      "user-alfa",
    );
    expect(views).toEqual([]);
  });

  test("nova jornada não apresenta calculateIVO nem expected_ivo_lift como resultado", () => {
    const files = [
      "src/lib/ivo/ivo-q2-reading.server.ts",
      "src/lib/ivo/fibt-action-loop.server.ts",
      "src/routes/ivo-integral.index.tsx",
      "src/routes/ivo-integral.q2.tsx",
      "src/routes/ivo-integral.acoes.tsx",
      "src/components/ivo/IvoLensMatrix.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source.includes("calculateIVO")).toBe(false);
      expect(source.includes("ivo-engine")).toBe(false);
      expect(/expectedIvoLift|Lift IVO/.test(source)).toBe(false);
    }
  });
});
