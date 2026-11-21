import { describe, expect, test } from "bun:test";
import {
  assessMethodAuthority,
  canTransitionGovernance,
  prepareGovernanceDecision,
  type DecisionRequest,
  type GovernanceEntry,
} from "./governance-decision";

// Identidades e decisões FICTÍCIAS, identificadas como tais. Verificam o software, não o método.
const ENTRY: GovernanceEntry = {
  id: "D-TESTE",
  kind: "decision",
  title: "Decisão sintética de teste",
  version: "0.1.0",
  state: "proposta",
  proposal: "Proposta sintética",
  rationale: "Justificativa sintética",
  alternatives: [],
  recommendation: "Recomendação sintética",
  sources: [{ ref: "teste", kind: "repo" }],
  limitations: [],
  owner: null,
  reviewer: null,
  approval: null,
  approvalCriteria: ["Critério A", "Critério B"],
  effects: [{ feature: "Recurso X", effect: "Sem efeito até aprovar" }],
  dependsOn: [],
};
const AUTH = { configuredUserIds: ["user-autoridade-sintetica"] };
const ACTOR = { userId: "user-autoridade-sintetica" };
const base = (over: Partial<DecisionRequest> = {}): DecisionRequest => ({
  toState: "em_revisao",
  actor: ACTOR,
  authority: AUTH,
  owner: "Papel responsável sintético",
  reviewer: "Papel revisor sintético",
  evidence: [],
  criteriaMet: [],
  decidedAt: "2026-10-05",
  test: true,
  ...over,
});

describe("autoridade metodológica", () => {
  test("sem autoridade configurada a aprovação fica indisponível, com motivo", () => {
    const a = assessMethodAuthority(ACTOR, { configuredUserIds: [] });
    expect(a.allowed).toBe(false);
    expect(a.reason).toContain("Nenhuma autoridade metodológica");
  });
  test("RH_ADMIN de organização NÃO recebe autoridade", () => {
    const a = assessMethodAuthority({ userId: "user-rh-admin-org", orgRole: "RH_ADMIN" }, AUTH);
    expect(a.allowed).toBe(false);
    expect(a.reason).toContain("administrador da organização não aprova método global");
    expect(assessMethodAuthority(ACTOR, AUTH).allowed).toBe(true);
    expect(assessMethodAuthority(null, AUTH).allowed).toBe(false);
  });
});

describe("decisão: proposta → piloto → validação", () => {
  test("ator sem autoridade não prepara nenhuma decisão", () => {
    const r = prepareGovernanceDecision(ENTRY, base({ actor: { userId: "user-rh-admin-org", orgRole: "RH_ADMIN" } }));
    expect(r.ok).toBe(false);
  });

  test("transições canônicas", () => {
    expect(canTransitionGovernance("proposta", "aprovado_para_piloto")).toBe(false); // precisa passar por revisão
    expect(canTransitionGovernance("em_revisao", "aprovado_para_piloto")).toBe(true);
    expect(canTransitionGovernance("aprovado_para_piloto", "validado_para_uso_definido")).toBe(true);
    expect(canTransitionGovernance("retirada", "proposta")).toBe(false);
    expect(canTransitionGovernance("rejeitada", "proposta")).toBe(true);
  });

  test("revisão exige responsável e revisor distintos", () => {
    expect(prepareGovernanceDecision(ENTRY, base({ reviewer: null }))).toMatchObject({ ok: false });
    const same = prepareGovernanceDecision(ENTRY, base({ reviewer: "PAPEL RESPONSÁVEL SINTÉTICO" }));
    expect(same.ok).toBe(false);
    if (!same.ok) expect(same.errors).toContain("revisor_igual_ao_responsavel");
    const ok = prepareGovernanceDecision(ENTRY, base());
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.entry).toMatchObject({ state: "em_revisao", version: "0.2.0", approval: null });
  });

  test("aprovação para piloto exige evidência e TODOS os critérios; registra decisor e marca de teste", () => {
    const review = prepareGovernanceDecision(ENTRY, base());
    if (!review.ok) throw new Error("preparo da revisão falhou");
    const incomplete = prepareGovernanceDecision(review.entry, base({ toState: "aprovado_para_piloto", evidence: ["ata-sintetica"], criteriaMet: ["Critério A"] }));
    expect(incomplete.ok).toBe(false);
    if (!incomplete.ok) expect(incomplete.errors).toContain("criterios_pendentes:1");
    const noEvidence = prepareGovernanceDecision(review.entry, base({ toState: "aprovado_para_piloto", criteriaMet: ["Critério A", "Critério B"] }));
    expect(noEvidence.ok).toBe(false);
    const approved = prepareGovernanceDecision(review.entry, base({ toState: "aprovado_para_piloto", evidence: ["ata-sintetica"], criteriaMet: ["Critério A", "Critério B"] }));
    expect(approved.ok).toBe(true);
    if (approved.ok) {
      expect(approved.entry.state).toBe("aprovado_para_piloto");
      expect(approved.entry.approval).toMatchObject({ decidedBy: "user-autoridade-sintetica", test: true, intendedUse: null });
      expect(approved.audit).toMatchObject({ from: "em_revisao", to: "aprovado_para_piloto", test: true });
    }
  });

  test("piloto ≠ validação: validar exige piloto prévio e uso definido", () => {
    const piloted: GovernanceEntry = { ...ENTRY, state: "aprovado_para_piloto", owner: "A", reviewer: "B", approval: { decidedBy: "x", decidedAt: "2026-10-01", evidence: ["e"], intendedUse: null, test: true } };
    const noUse = prepareGovernanceDecision(piloted, base({ toState: "validado_para_uso_definido", evidence: ["estudo-sintetico"], criteriaMet: ["Critério A", "Critério B"] }));
    expect(noUse.ok).toBe(false);
    if (!noUse.ok) expect(noUse.errors).toContain("uso_definido_ausente");
    const direct = prepareGovernanceDecision(ENTRY, base({ toState: "validado_para_uso_definido", evidence: ["e"], criteriaMet: ["Critério A", "Critério B"], intendedUse: "uso" }));
    expect(direct.ok).toBe(false);
    const validated = prepareGovernanceDecision(piloted, base({ toState: "validado_para_uso_definido", evidence: ["estudo-sintetico"], criteriaMet: ["Critério A", "Critério B"], intendedUse: "Gestão agregada identificada" }));
    expect(validated.ok).toBe(true);
    if (validated.ok) expect(validated.entry.approval?.intendedUse).toBe("Gestão agregada identificada");
  });

  test("entrada original não é mutada", () => {
    const before = JSON.stringify(ENTRY);
    prepareGovernanceDecision(ENTRY, base());
    expect(JSON.stringify(ENTRY)).toBe(before);
  });
});
