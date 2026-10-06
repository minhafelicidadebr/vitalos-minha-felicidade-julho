// C8 no servidor com DUAS organizações fictícias. Store em memória; sessão,
// capability e governança injetadas. A prova de banco (CHECKs, gatilhos, RLS)
// vive em supabase/tests/08; a de integração real, em scripts/ivo-local-journey-proof.ts.
// Todos os dados são SINTÉTICOS e identificados; verificam o software, não a eficácia.
import { describe, expect, test } from "bun:test";
import type { MembershipResult } from "@/lib/auth/authorize.server";
import { ivoEfficacySchemas } from "@/lib/api/ivo-efficacy.functions";
import type { FibtActionLedgerStore } from "./fibt-action-loop.server";
import {
  EMPTY_FIELDS,
  loadEfficacyForSession,
  recordEfficacyObservation,
  recordEfficacyVerdict,
  registerEfficacyProtocol,
  saveEfficacyDraft,
  startEfficacyRevision,
  type EfficacyData,
  type EfficacyDeps,
  type EfficacyStore,
  type StoreWrite,
} from "./efficacy-protocol.server";
import { resolveEfficacyGovernanceGate, type GovernanceGate } from "./ivo-governance-gate.server";

const ITEM_ALFA = "item-alfa-1";
const ITEM_BETA = "item-beta-1";
const SESSIONS: Record<string, MembershipResult> = {
  "token-alfa-admin": { ok: true, membership: { userId: "user-alfa", orgId: "org-alfa", role: "RH_ADMIN" } },
  "token-alfa-revisor": { ok: true, membership: { userId: "user-alfa-revisor", orgId: "org-alfa", role: "RH_ADMIN" } },
  "token-beta-admin": { ok: true, membership: { userId: "user-beta", orgId: "org-beta", role: "RH_ADMIN" } },
};
const PENDING: GovernanceGate = { decisionId: "D9", state: "proposta", source: "registro_canonico" };
const TEST_APPROVED: GovernanceGate = { decisionId: "D9", state: "aprovado_para_piloto", source: "teste_sintetico" };

function memoryStore() {
  const data: EfficacyData = { protocols: [], observations: [], verdicts: [] };
  let seq = 0;
  const id = (p: string) => `${p}-${++seq}`;
  const now = () => "2026-10-05T12:00:00.000Z";
  const writes: string[] = [];
  const store: EfficacyStore = {
    async load(orgId) {
      return {
        protocols: data.protocols.filter((p) => p.orgId === orgId).map((p) => ({ ...p })),
        observations: data.observations.filter((o) => o.orgId === orgId),
        verdicts: data.verdicts.filter((v) => v.orgId === orgId),
      };
    },
    async insertProtocol(row) {
      writes.push("insertProtocol");
      // Espelha o CHECK do banco: valor de leitura publicada nunca é persistido.
      if (row.indicatorOrigin === "leitura_publicada" && row.baselineValue !== null) return { accepted: false, reason: "db_error", id: null };
      data.protocols.push({ ...row, id: id("prot"), createdAt: now(), updatedAt: now(), registeredAt: null });
      return { accepted: true, reason: null, id: data.protocols.at(-1)!.id };
    },
    async updateProtocol(orgId, pid, patch) {
      writes.push("updateProtocol");
      const row = data.protocols.find((p) => p.id === pid && p.orgId === orgId);
      if (!row) return { accepted: false, reason: "db_error", id: null } as StoreWrite;
      if (row.status === "registered") return { accepted: false, reason: "protocol_registered_is_immutable", id: null };
      if ("status" in patch) {
        row.status = "registered";
        row.registeredAt = now();
      } else {
        if (patch.indicatorOrigin === "leitura_publicada" && patch.baselineValue !== null && patch.baselineValue !== undefined) {
          return { accepted: false, reason: "db_error", id: null };
        }
        Object.assign(row, patch, { updatedAt: now() });
      }
      return { accepted: true, reason: null, id: pid };
    },
    async insertObservation(row) {
      writes.push("insertObservation");
      data.observations.push({ ...row, id: id("obs"), createdAt: now() });
      return { accepted: true, reason: null, id: data.observations.at(-1)!.id };
    },
    async insertVerdict(row) {
      writes.push("insertVerdict");
      data.verdicts.push({ ...row, id: id("ver"), createdAt: now() });
      return { accepted: true, reason: null, id: data.verdicts.at(-1)!.id };
    },
    async deriveSourceRef(orgId, itemId) {
      if (orgId !== "org-alfa" || itemId !== ITEM_ALFA) return null;
      return { cohortKey: "operacoes", cycleKey: "2026-T2", instrumentVersion: "1.0.0", calculationVersion: "fibt-manifest/1.0.0", publicationState: "published" };
    },
  };
  return { store, data, writes };
}

function deps(store: EfficacyStore, gate: GovernanceGate = PENDING, extra: Partial<EfficacyDeps> = {}): EfficacyDeps {
  const ledger = {
    async findItem(orgId: string, itemId: string) {
      const owner = itemId === ITEM_ALFA ? "org-alfa" : itemId === ITEM_BETA ? "org-beta" : null;
      return owner === orgId ? { id: itemId, orgId, planId: "plan", sourceLensId: "fibt", status: "concluida" as const, planStatus: "active" } : null;
    },
  } as unknown as FibtActionLedgerStore;
  return {
    boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
    identity: () => ({ requestedMode: "cloud", state: "cloud", realAuthentication: true, serverEnforced: true, reason: "cloud_ready" }),
    requireAdmin: async (token) => SESSIONS[token] ?? { ok: false, reason: "invalid_session" },
    capability: () => ({ enabled: true, source: "local_fixture" }),
    now: () => new Date("2026-11-20T15:00:00.000Z"),
    ledger,
    efficacy: store,
    governance: () => gate,
    ...extra,
  };
}

/** Protocolo de MEDIDA da organização, completo, com critérios fictícios explícitos. */
const MEDIDA: Partial<typeof EMPTY_FIELDS> = {
  objective: "Elevar a medida sintética da organização no trimestre",
  indicatorLabel: "Medida sintética",
  indicatorKind: "resultado",
  indicatorOrigin: "medida_da_organizacao",
  unit: "pontos",
  direction: "aumentar",
  baselineObservedOn: "2026-06-30",
  baselinePopulation: "População sintética",
  baselineSource: "Planilha sintética",
  baselineValue: 2.0,
  targetKind: "numerico",
  targetValue: 3.0,
  meaningfulDifference: 0.2, // critério FICTÍCIO explícito deste teste
  windowStart: "2026-10-01",
  windowEnd: "2026-12-31",
  source: "Planilha sintética",
  comparisonRule: { sameCohort: false, sameInstrumentVersion: false, sameCalculationVersion: false },
  responsibleRole: "Coordenação sintética",
  reviewerRole: "Revisão sintética",
  limitations: ["Dados sintéticos"],
};
const A = "token-alfa-admin";
const REV = "token-alfa-revisor";

async function registered(store: EfficacyStore, d: EfficacyDeps, fields = MEDIDA) {
  expect(await saveEfficacyDraft({ accessToken: A, itemId: ITEM_ALFA, fields }, d)).toMatchObject({ accepted: true });
  expect(await registerEfficacyProtocol({ accessToken: A, itemId: ITEM_ALFA }, d)).toMatchObject({ accepted: true });
}

describe("C8 · rascunho incompleto e registro", () => {
  test("rascunho incompleto é persistido e lista o que falta; não vale como protocolo", async () => {
    const { store, data } = memoryStore();
    const d = deps(store);
    const r = await saveEfficacyDraft({ accessToken: A, itemId: ITEM_ALFA, fields: { objective: "Objetivo parcial do protocolo sintético" } }, d);
    expect(r).toMatchObject({ ok: true, accepted: true });
    expect(data.protocols).toHaveLength(1);
    const view = await loadEfficacyForSession({ accessToken: A }, d);
    if (!view.ok) throw new Error("load falhou");
    const item = view.items[0]!;
    expect(item.draft?.status).toBe("draft");
    expect(item.registered).toBeNull();
    expect(item.state).toBe("sem_protocolo");
    expect(item.registrationIssues).toContain("baseline_obrigatorio");
    expect(item.registrationIssues).toContain("janela_invalida");
  });

  test("salvar de novo edita o MESMO rascunho; registrar incompleto recusa e mantém rascunho", async () => {
    const { store, data } = memoryStore();
    const d = deps(store);
    await saveEfficacyDraft({ accessToken: A, itemId: ITEM_ALFA, fields: { objective: "Objetivo parcial do protocolo sintético" } }, d);
    await saveEfficacyDraft({ accessToken: A, itemId: ITEM_ALFA, fields: { indicatorLabel: "Medida sintética" } }, d);
    expect(data.protocols).toHaveLength(1);
    expect(data.protocols[0]).toMatchObject({ objective: "Objetivo parcial do protocolo sintético", indicatorLabel: "Medida sintética" });
    const r = await registerEfficacyProtocol({ accessToken: A, itemId: ITEM_ALFA }, d);
    expect(r).toMatchObject({ ok: true, accepted: false, reason: "protocol_incomplete" });
    if (r.ok && !r.accepted) expect(r.errors.length).toBeGreaterThan(0);
    expect(data.protocols[0]!.status).toBe("draft");
  });

  test("protocolo completo registra; depois só por nova revisão; a vigente continua valendo", async () => {
    const { store, data } = memoryStore();
    const d = deps(store);
    await registered(store, d);
    expect(data.protocols[0]).toMatchObject({ status: "registered", revision: 1 });
    expect(await saveEfficacyDraft({ accessToken: A, itemId: ITEM_ALFA, fields: { objective: "Outro objetivo bem descrito" } }, d)).toMatchObject({ accepted: false, reason: "protocol_registered_use_revision" });
    expect(await startEfficacyRevision({ accessToken: A, itemId: ITEM_ALFA }, d)).toMatchObject({ accepted: true });
    expect(data.protocols[1]).toMatchObject({ status: "draft", revision: 2, supersedesId: data.protocols[0]!.id });
    expect(await startEfficacyRevision({ accessToken: A, itemId: ITEM_ALFA }, d)).toMatchObject({ accepted: false, reason: "draft_already_open" });
    const view = await loadEfficacyForSession({ accessToken: A }, d);
    if (!view.ok) throw new Error("load falhou");
    expect(view.items[0]).toMatchObject({ state: "aguardando_observacao", stateLabel: "Aguardando observação" });
    expect(view.items[0]!.draft?.revision).toBe(2);
    expect(view.items[0]!.registered?.revision).toBe(1);
  });

  test("origem 'leitura publicada' nunca persiste valor: o servidor descarta e deriva só a referência", async () => {
    const { store, data } = memoryStore();
    const d = deps(store);
    const fields = { ...MEDIDA, indicatorOrigin: "leitura_publicada" as const, baselineValue: 2.4, comparisonRule: { sameCohort: true, sameInstrumentVersion: true, sameCalculationVersion: true } };
    expect(await saveEfficacyDraft({ accessToken: A, itemId: ITEM_ALFA, fields, useSourceAsBaseline: true }, d)).toMatchObject({ accepted: true });
    expect(data.protocols[0]!.baselineValue).toBeNull();
    expect(data.protocols[0]!.baselineRef).toMatchObject({ cohortKey: "operacoes", publicationState: "published" });
    expect(JSON.stringify(data.protocols[0]!.baselineRef)).not.toContain("value");
    expect(await registerEfficacyProtocol({ accessToken: A, itemId: ITEM_ALFA }, d)).toMatchObject({ accepted: true });
  });

  test("referência de leitura indisponível recusa; observação e parecer conclusivo em leitura publicada ficam pendentes com motivo", async () => {
    const { store, data } = memoryStore();
    const d = deps(store, TEST_APPROVED);
    const pub = { ...MEDIDA, indicatorOrigin: "leitura_publicada" as const, comparisonRule: { sameCohort: true, sameInstrumentVersion: true, sameCalculationVersion: true } };
    expect(await saveEfficacyDraft({ accessToken: A, itemId: ITEM_BETA, fields: pub, useSourceAsBaseline: true }, d)).toMatchObject({ accepted: false, reason: "item_not_found" });
    await saveEfficacyDraft({ accessToken: A, itemId: ITEM_ALFA, fields: pub, useSourceAsBaseline: true }, d);
    await registerEfficacyProtocol({ accessToken: A, itemId: ITEM_ALFA }, d);
    const obs = await recordEfficacyObservation({ accessToken: A, itemId: ITEM_ALFA, observedOn: "2026-11-15", value: 3.1 }, d);
    expect(obs).toMatchObject({ accepted: false, reason: "published_reading_resolution_pending" });
    expect(data.observations).toHaveLength(0);
    const verdict = await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "meta_atingida", evidenceGrade: "pre_pos" }, d);
    expect(verdict).toMatchObject({ accepted: false, reason: "published_reading_resolution_pending" });
  });
});

describe("C8 · observação e parecer (critérios fictícios explícitos)", () => {
  test("observação valida janela, data e valor; o estado passa a 'em avaliação'", async () => {
    const { store } = memoryStore();
    const d = deps(store);
    await registered(store, d);
    expect(await recordEfficacyObservation({ accessToken: A, itemId: ITEM_ALFA, observedOn: "2027-02-01", value: 3.2 }, d)).toMatchObject({ accepted: false, reason: "invalid_date" });
    expect(await recordEfficacyObservation({ accessToken: A, itemId: ITEM_ALFA, observedOn: "2026-09-01", value: 3.2 }, d)).toMatchObject({ accepted: false, reason: "observation_outside_window" });
    expect(await recordEfficacyObservation({ accessToken: A, itemId: ITEM_ALFA, observedOn: "2026-11-15", value: Number.NaN }, d)).toMatchObject({ accepted: false, reason: "invalid_value" });
    expect(await recordEfficacyObservation({ accessToken: A, itemId: ITEM_ALFA, observedOn: "2026-11-15", value: 3.2 }, d)).toMatchObject({ accepted: true });
    const view = await loadEfficacyForSession({ accessToken: A }, d);
    if (!view.ok) throw new Error("load falhou");
    expect(view.items[0]).toMatchObject({ state: "em_avaliacao" });
    expect(view.items[0]!.assessment).toMatchObject({ observedChange: "melhorou", targetReached: true, comparable: true });
  });

  test("com D9 pendente só 'inconclusiva' é aceita; conclusivo é recusado com motivo", async () => {
    const { store, data } = memoryStore();
    const d = deps(store, PENDING);
    await registered(store, d);
    await recordEfficacyObservation({ accessToken: A, itemId: ITEM_ALFA, observedOn: "2026-11-15", value: 3.2 }, d);
    const blocked = await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "meta_atingida", evidenceGrade: "pre_pos" }, d);
    expect(blocked).toMatchObject({ accepted: false, reason: "governance_pending" });
    const noReason = await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "inconclusiva", evidenceGrade: "descritiva" }, d);
    expect(noReason).toMatchObject({ accepted: false, reason: "verdict_invalid" });
    const ok = await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "inconclusiva", evidenceGrade: "descritiva", reason: "Critérios de D9 ainda não aprovados para concluir" }, d);
    expect(ok).toMatchObject({ accepted: true });
    expect(data.verdicts[0]).toMatchObject({ verdict: "inconclusiva", governanceState: "proposta", governanceSource: "registro_canonico" });
    const view = await loadEfficacyForSession({ accessToken: A }, d);
    if (!view.ok) throw new Error("load falhou");
    expect(view.governance).toMatchObject({ conclusiveAllowed: false, state: "proposta" });
    expect(view.items[0]).toMatchObject({ state: "inconclusiva" });
  });

  test("desfecho FAVORÁVEL (D9 de teste): mudança e meta vêm do cálculo, com marca de teste", async () => {
    const { store, data } = memoryStore();
    const d = deps(store, TEST_APPROVED);
    await registered(store, d);
    await recordEfficacyObservation({ accessToken: A, itemId: ITEM_ALFA, observedOn: "2026-11-15", value: 3.2 }, d);
    const r = await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "meta_atingida", evidenceGrade: "pre_pos" }, d);
    expect(r).toMatchObject({ accepted: true });
    expect(data.verdicts[0]).toMatchObject({ verdict: "meta_atingida", observedChange: "melhorou", targetReached: true, attributionStatus: "nao_avaliada", governanceSource: "teste_sintetico" });
    const view = await loadEfficacyForSession({ accessToken: A }, d);
    if (!view.ok) throw new Error("load falhou");
    expect(view.items[0]).toMatchObject({ state: "meta_atingida" });
    expect(view.items[0]!.verdict?.governance.source).toBe("teste_sintetico");
  });

  test("desfecho DESFAVORÁVEL: meta não atingida mesmo com melhora acima da diferença mínima", async () => {
    const { store, data } = memoryStore();
    const d = deps(store, TEST_APPROVED);
    await registered(store, d);
    await recordEfficacyObservation({ accessToken: A, itemId: ITEM_ALFA, observedOn: "2026-11-15", value: 2.5 }, d);
    expect(await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "meta_atingida", evidenceGrade: "pre_pos" }, d)).toMatchObject({ accepted: false, reason: "verdict_invalid" });
    const r = await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "meta_nao_atingida", evidenceGrade: "pre_pos" }, d);
    expect(r).toMatchObject({ accepted: true });
    expect(data.verdicts[0]).toMatchObject({ verdict: "meta_nao_atingida", targetReached: false, observedChange: "melhorou" });
  });

  test("desfecho INCONCLUSIVO: conclusivo sem observação é recusado; inconclusivo com motivo é aceito", async () => {
    const { store } = memoryStore();
    const d = deps(store, TEST_APPROVED);
    await registered(store, d);
    expect(await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "meta_atingida", evidenceGrade: "pre_pos" }, d)).toMatchObject({ accepted: false, reason: "verdict_invalid" });
    const r = await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "inconclusiva", evidenceGrade: "descritiva", reason: "Sem observação dentro da janela até agora" }, d);
    expect(r).toMatchObject({ accepted: true });
  });

  test("quem criou o protocolo não emite o parecer; atribuição causal exige desenho", async () => {
    const { store } = memoryStore();
    const d = deps(store, TEST_APPROVED);
    await registered(store, d);
    await recordEfficacyObservation({ accessToken: A, itemId: ITEM_ALFA, observedOn: "2026-11-15", value: 3.2 }, d);
    expect(await recordEfficacyVerdict({ accessToken: A, itemId: ITEM_ALFA, verdict: "meta_atingida", evidenceGrade: "pre_pos" }, d)).toMatchObject({ accepted: false, reason: "reviewer_not_independent" });
    const causal = await recordEfficacyVerdict({ accessToken: REV, itemId: ITEM_ALFA, verdict: "meta_atingida", evidenceGrade: "pre_pos", attribution: { status: "sustentada_por_desenho" } }, d);
    expect(causal).toMatchObject({ accepted: false, reason: "verdict_invalid" });
  });

  test("o estado da avaliação não depende do estado da ação (ledger diz 'concluida')", async () => {
    const { store } = memoryStore();
    const d = deps(store);
    await registered(store, d);
    const view = await loadEfficacyForSession({ accessToken: A }, d);
    if (!view.ok) throw new Error("load falhou");
    // A ação do ledger está 'concluida' (ver deps.ledger) e, ainda assim, a avaliação aguarda observação.
    expect(view.items[0]!.state).toBe("aguardando_observacao");
    expect(view.items[0]!.verdict).toBeNull();
  });
});

describe("C8 · isolamento, autorização e contratos", () => {
  test("Beta não lê nem altera protocolos da Alfa", async () => {
    const { store, data } = memoryStore();
    const d = deps(store, TEST_APPROVED);
    await registered(store, d);
    const beta = await loadEfficacyForSession({ accessToken: "token-beta-admin" }, d);
    expect(beta).toMatchObject({ ok: true, items: [] });
    expect(await saveEfficacyDraft({ accessToken: "token-beta-admin", itemId: ITEM_ALFA, fields: { objective: "Invasão sintética do protocolo" } }, d)).toMatchObject({ accepted: false, reason: "item_not_found" });
    expect(await registerEfficacyProtocol({ accessToken: "token-beta-admin", itemId: ITEM_ALFA }, d)).toMatchObject({ accepted: false, reason: "item_not_found" });
    expect(await recordEfficacyObservation({ accessToken: "token-beta-admin", itemId: ITEM_ALFA, observedOn: "2026-11-15", value: 9 }, d)).toMatchObject({ accepted: false, reason: "item_not_found" });
    expect(data.observations).toHaveLength(0);
  });

  test("sessão ausente/inválida e capability desligada falham antes de tocar a store", async () => {
    const { store, writes } = memoryStore();
    const d = deps(store);
    expect(await loadEfficacyForSession({ accessToken: undefined }, d)).toMatchObject({ ok: false, category: "unauthenticated" });
    expect(await saveEfficacyDraft({ accessToken: "token-invalido-qualquer", itemId: ITEM_ALFA, fields: {} }, d)).toMatchObject({ ok: false });
    const off = deps(store, PENDING, { capability: () => ({ enabled: false, reason: "registry_disabled" }) });
    expect(await loadEfficacyForSession({ accessToken: A }, off)).toMatchObject({ ok: false, category: "unavailable" });
    expect(writes).toEqual([]);
  });

  test("schemas das server functions são estritos: orgId e baselineRef do cliente são recusados", () => {
    const base = { accessToken: "token-de-teste-123", itemId: "11111111-1111-4111-8111-111111111111", fields: {} };
    expect(ivoEfficacySchemas.saveDraft.safeParse(base).success).toBe(true);
    expect(ivoEfficacySchemas.saveDraft.safeParse({ ...base, orgId: "org-alfa" }).success).toBe(false);
    expect(ivoEfficacySchemas.saveDraft.safeParse({ ...base, fields: { baselineRef: { cohortKey: "x" } } }).success).toBe(false);
    expect(ivoEfficacySchemas.saveDraft.safeParse({ ...base, fields: { meaningfulDifference: -1 } }).success).toBe(false);
    expect(ivoEfficacySchemas.verdict.safeParse({ accessToken: "token-de-teste-123", itemId: base.itemId, verdict: "meta_atingida", evidenceGrade: "pre_pos", orgId: "x" }).success).toBe(false);
  });

  test("override de governança de TESTE só vale em runtime local descartável", () => {
    const local = {
      VITALOS_RUNTIME_ENV: "local", VITALOS_DB_TARGET: "local",
      SUPABASE_URL: "http://127.0.0.1:55421", VITE_SUPABASE_URL: "http://127.0.0.1:55421",
      VITALOS_IVO_TEST_GOVERNANCE: "D9_APROVADO_SINTETICO",
    };
    expect(resolveEfficacyGovernanceGate(local)).toMatchObject({ state: "aprovado_para_piloto", source: "teste_sintetico" });
    expect(resolveEfficacyGovernanceGate({ ...local, VITALOS_RUNTIME_ENV: "preview" })).toMatchObject({ state: "proposta", source: "registro_canonico" });
    expect(resolveEfficacyGovernanceGate({ ...local, SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co", VITE_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co" })).toMatchObject({ source: "registro_canonico" });
    expect(resolveEfficacyGovernanceGate({ ...local, VITE_FIBT_HML_ENABLED: "true" })).toMatchObject({ source: "registro_canonico" });
    expect(resolveEfficacyGovernanceGate({})).toMatchObject({ state: "proposta", source: "registro_canonico" });
  });
});
