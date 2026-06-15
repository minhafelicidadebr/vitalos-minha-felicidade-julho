import { describe, expect, test } from "bun:test";
import {
  evaluateEvidence,
  designExperimentFromLever,
  K_ANON_MIN,
  type EvidenceInput,
} from "./evidence-engine";
import type { ForecastLever, ForecastPillar } from "../forecast/forecast-engine";

function ev(over: Partial<EvidenceInput> = {}): EvidenceInput {
  return { before: 500, after: 530, comparisonDelta: 6, n: 20, ...over };
}

// ─── Diferença-em-diferenças ─────────────────────────────────────────────────

describe("evaluateEvidence — efeito", () => {
  test("grossDelta = after − before", () => {
    expect(evaluateEvidence(ev({ before: 500, after: 534 })).grossDelta).toBe(34);
  });

  test("netEffect = bruto − comparação (diff-in-diff)", () => {
    const r = evaluateEvidence(ev({ before: 500, after: 534, comparisonDelta: 6 }));
    expect(r.netEffect).toBe(28); // 34 − 6
  });
});

// ─── k-anonimato ─────────────────────────────────────────────────────────────

describe("evaluateEvidence — k-anonimato", () => {
  test("n < mínimo → protegido e não divulgável", () => {
    const r = evaluateEvidence(ev({ n: 4 }));
    expect(r.verdict).toBe("protegido");
    expect(r.reportable).toBe(false);
    expect(r.confidenceTier).toBe("oculto");
    expect(r.withinHypothesis).toBeNull();
    expect(r.note).toContain("k-anonimato");
  });

  test("n === mínimo → divulgável", () => {
    expect(evaluateEvidence(ev({ n: K_ANON_MIN })).reportable).toBe(true);
  });
});

// ─── Veredito vs hipótese ────────────────────────────────────────────────────

describe("evaluateEvidence — veredito", () => {
  const band = { low: 12, high: 25 };

  test("dentro da faixa → confirmado", () => {
    const r = evaluateEvidence(
      ev({ before: 500, after: 524, comparisonDelta: 6, expectedBand: band }),
    );
    // gross 24, net 18 ∈ [12,25]
    expect(r.verdict).toBe("confirmado");
    expect(r.withinHypothesis).toBe(true);
  });

  test("acima da faixa → superou", () => {
    const r = evaluateEvidence(
      ev({ before: 500, after: 540, comparisonDelta: 4, expectedBand: band }),
    );
    // gross 40, net 36 > 25
    expect(r.verdict).toBe("superou");
    expect(r.withinHypothesis).toBe(false);
  });

  test("positivo abaixo da faixa → parcial", () => {
    const r = evaluateEvidence(
      ev({ before: 500, after: 512, comparisonDelta: 4, expectedBand: band }),
    );
    // gross 12, net 8 < 12
    expect(r.verdict).toBe("parcial");
  });

  test("efeito ≤ 0 → sem_efeito", () => {
    const r = evaluateEvidence(
      ev({ before: 500, after: 505, comparisonDelta: 8, expectedBand: band }),
    );
    // net = -3
    expect(r.verdict).toBe("sem_efeito");
    expect(r.effectMagnitude).toBeNull();
  });

  test("sem hipótese e net>0 → efeito_positivo", () => {
    const r = evaluateEvidence(ev({ before: 500, after: 520, comparisonDelta: 5 }));
    expect(r.verdict).toBe("efeito_positivo");
    expect(r.withinHypothesis).toBeNull();
  });
});

// ─── Tiers de confiança e magnitude ──────────────────────────────────────────

describe("evaluateEvidence — confiança e magnitude", () => {
  test("tiers por n", () => {
    expect(evaluateEvidence(ev({ n: 7 })).confidenceTier).toBe("exploratório");
    expect(evaluateEvidence(ev({ n: 20 })).confidenceTier).toBe("indicativo");
    expect(evaluateEvidence(ev({ n: 40 })).confidenceTier).toBe("robusto");
  });

  test("magnitude por efeito líquido", () => {
    expect(
      evaluateEvidence(ev({ before: 500, after: 508, comparisonDelta: 1 })).effectMagnitude,
    ).toBe("pequeno"); // 7
    expect(
      evaluateEvidence(ev({ before: 500, after: 520, comparisonDelta: 2 })).effectMagnitude,
    ).toBe("moderado"); // 18
    expect(
      evaluateEvidence(ev({ before: 500, after: 540, comparisonDelta: 2 })).effectMagnitude,
    ).toBe("amplo"); // 38
  });

  test("nota honesta cita efeito, n e a ressalva de confundidores", () => {
    const r = evaluateEvidence(ev({ n: 23, expectedBand: { low: 12, high: 25 } }));
    expect(r.note).toContain("n=23");
    expect(r.note).toContain("confundidores");
    expect(r.note).toContain("Hipótese");
  });
});

// ─── Desenho de hipótese (compõe forecast) ───────────────────────────────────

function pillars(over: Partial<Record<string, number>> = {}): ForecastPillar[] {
  return [
    {
      pillarId: "energia",
      name: "Energia",
      weight: 0.5,
      score: over.energia ?? 500,
      visible: true,
    },
    { pillarId: "carga", name: "Carga", weight: 0.5, score: over.carga ?? 600, visible: true },
  ];
}

const LEVER: ForecastLever = {
  id: "lx",
  label: "Lx",
  description: "",
  targetPillarIds: ["energia", "carga"],
  pointsPerSeason: 60,
  effort: "alto",
  evidenceLevel: "rct",
};

describe("designExperimentFromLever", () => {
  test("desenha faixa a partir do pilar dominante", () => {
    const d = designExperimentFromLever(pillars({ energia: 300 }), LEVER)!;
    // energia (300) tem maior headroom → pilar líder
    expect(d.leadPillarId).toBe("energia");
    expect(d.expectedLiftBand.low).toBeGreaterThan(0);
    expect(d.expectedLiftBand.high).toBeGreaterThan(d.expectedLiftBand.low);
  });

  test("duração recomendada reflete o esforço (alto → 6 semanas)", () => {
    expect(designExperimentFromLever(pillars(), LEVER)!.recommendedDurationWeeks).toBe(6);
  });

  test("sem pilar-alvo visível → null", () => {
    const hidden = pillars().map((p) => ({ ...p, visible: false }));
    expect(designExperimentFromLever(hidden, LEVER)).toBeNull();
  });

  test("minN respeita o k-anonimato", () => {
    expect(designExperimentFromLever(pillars(), LEVER)!.minN).toBe(K_ANON_MIN);
  });
});
