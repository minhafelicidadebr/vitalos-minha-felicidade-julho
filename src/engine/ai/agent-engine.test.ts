import { describe, expect, test } from "bun:test";
import { proposeActions, type AgentObservations } from "./agent-engine";

const FULL: AgentObservations = {
  topPriority: {
    leverId: "seguranca_voz",
    label: "Segurança psicológica e voz",
    owner: "Guardiões da Voz Segura",
    lift: 22,
    isQuickWin: false,
  },
  decliningPillars: [
    { pillarId: "energia_vitalidade", name: "Energia & Vitalidade", score: 480, drop: 24 },
    { pillarId: "clareza_direcao", name: "Clareza & Direção", score: 540, drop: 9 },
  ],
  experiments: [
    { id: "ex1", name: "Reconhecimento", verdict: "superou", netEffect: 28, reportable: true },
    { id: "ex2", name: "Pausas", verdict: "sem_efeito", netEffect: -2, reportable: true },
    { id: "ex3", name: "Clareza", verdict: "confirmado", netEffect: 15, reportable: false },
  ],
  phaseId: "transformar",
  seasonName: "Primavera da Vitalidade",
};

// ─── Geração por regra ────────────────────────────────────────────────────────

describe("proposeActions — regras", () => {
  test("prioridade vira proposta de ativar experimento", () => {
    const ps = proposeActions({ topPriority: FULL.topPriority });
    expect(ps).toHaveLength(1);
    expect(ps[0]!.kind).toBe("ativar_prioridade");
    expect(ps[0]!.recommendation).toContain("Guardiões da Voz Segura");
  });

  test("pilar em queda vira proposta de agir", () => {
    const ps = proposeActions({ decliningPillars: FULL.decliningPillars });
    expect(ps).toHaveLength(2);
    expect(ps.every((p) => p.kind === "agir_pilar_em_queda")).toBe(true);
    expect(ps[0]!.trigger).toContain("caiu");
  });

  test("experimento confirmado/superou → escalar", () => {
    const ps = proposeActions({
      experiments: [{ id: "e", name: "X", verdict: "superou", netEffect: 28, reportable: true }],
    });
    expect(ps[0]!.kind).toBe("escalar_experimento");
    expect(ps[0]!.trigger).toContain("superou");
  });

  test("experimento sem efeito → revisar", () => {
    const ps = proposeActions({
      experiments: [{ id: "e", name: "X", verdict: "sem_efeito", netEffect: -2, reportable: true }],
    });
    expect(ps[0]!.kind).toBe("revisar_experimento");
  });

  test("fase Transformar → aproveitar a janela", () => {
    const ps = proposeActions({ phaseId: "transformar", seasonName: "Primavera" });
    expect(ps[0]!.kind).toBe("aproveitar_fase");
  });

  test("outras fases não geram a proposta de janela", () => {
    expect(proposeActions({ phaseId: "mensurar" })).toHaveLength(0);
  });
});

// ─── k-anonimato ─────────────────────────────────────────────────────────────

describe("proposeActions — k-anonimato", () => {
  test("experimento não divulgável (protegido) nunca vira proposta", () => {
    const ps = proposeActions({
      experiments: [
        { id: "e", name: "X", verdict: "confirmado", netEffect: 15, reportable: false },
      ],
    });
    expect(ps).toHaveLength(0);
  });
});

// ─── Invariantes ─────────────────────────────────────────────────────────────

describe("proposeActions — invariantes", () => {
  test("toda proposta exige aprovação humana e passa guardrails", () => {
    const ps = proposeActions(FULL);
    expect(ps.length).toBeGreaterThan(0);
    expect(ps.every((p) => p.requiresApproval === true)).toBe(true);
    expect(ps.every((p) => p.guardrailsOk === true)).toBe(true);
  });

  test("toda proposta aponta uma rota de destino", () => {
    expect(proposeActions(FULL).every((p) => p.targetRoute.startsWith("/"))).toBe(true);
  });
});

// ─── Ordenação por urgência ──────────────────────────────────────────────────

describe("proposeActions — urgência", () => {
  test("alta vem antes de media, que vem antes de baixa", () => {
    const ps = proposeActions(FULL);
    const order = { alta: 0, media: 1, baixa: 2 };
    for (let i = 1; i < ps.length; i++) {
      expect(order[ps[i - 1]!.urgency]).toBeLessThanOrEqual(order[ps[i]!.urgency]);
    }
  });

  test("queda ≥ 20 pts é alta; queda menor é media", () => {
    const ps = proposeActions({ decliningPillars: FULL.decliningPillars });
    expect(ps.find((p) => p.id.includes("energia"))!.urgency).toBe("alta");
    expect(ps.find((p) => p.id.includes("clareza"))!.urgency).toBe("media");
  });

  test("observações vazias → nenhuma proposta", () => {
    expect(proposeActions({})).toHaveLength(0);
  });
});
