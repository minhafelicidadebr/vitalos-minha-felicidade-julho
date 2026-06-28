import { describe, expect, test } from "bun:test";
import {
  evaluateInterventionEvidence,
  evaluateInterventionBatch,
  type InterventionLink,
} from "./intervention-evidence-engine";
import {
  buildLongitudinalReading,
  type LongitudinalReading,
} from "../ai/capsule-longitudinal-engine";
import {
  buildMeasurementCapsule,
  type CapsuleDimensionInput,
} from "../ai/measurement-capsule-engine";

function dim(id: string, label: string, load: number, risk: CapsuleDimensionInput["riskLevel"], isOutcome = false): CapsuleDimensionInput {
  return { dimensionId: id, label, loadScore: load, n: 403, visible: true, riskLevel: risk, isOutcome };
}

function capsule(closedOn: string, waveId: string, dims: CapsuleDimensionInput[]) {
  return buildMeasurementCapsule({
    capsuleId: `c-${waveId}`, packId: "enterprise", waveId, cohortId: `co-${waveId}`, closedOn,
    instrument: "COPSOQ", instrumentShort: "COPSOQ", domain: "B", participantCount: 403, kAnonymityMin: 5,
    dimensions: dims,
  });
}

// demands_quant melhora MUITO (80→58, −22); work_pace piora (64→70, +6);
// influence quase estável (50→48, −2). Drift médio de melhora ~ (22−6+2)/3 ≈ 6.
function reading(): LongitudinalReading {
  const c1 = capsule("2025-01-22", "w1", [
    dim("demands_quant", "Demandas quantitativas", 80, "critico"),
    dim("work_pace", "Ritmo de trabalho", 64, "alto"),
    dim("influence", "Influência", 50, "moderado"),
    dim("burnout", "Burnout", 70, "alto", true),
  ]);
  const c2 = capsule("2026-01-22", "w2", [
    dim("demands_quant", "Demandas quantitativas", 58, "moderado"),
    dim("work_pace", "Ritmo de trabalho", 70, "alto"),
    dim("influence", "Influência", 48, "moderado"),
    dim("burnout", "Burnout", 52, "moderado", true),
  ]);
  const r = buildLongitudinalReading({ capsules: [c1, c2] });
  if (!r.ok) throw new Error("fixture inválida");
  return r.reading;
}

const R = reading();

// ─── Efeito específico (diff-in-diff intra-survey) ────────────────────────────

describe("evaluateInterventionEvidence — efeito além do drift", () => {
  test("intervenção em demands_quant: melhora forte além do drift → efeito positivo", () => {
    const link: InterventionLink = {
      interventionId: "exp-carga",
      label: "Redesenho de carga (Operações)",
      targetDimensionId: "demands_quant",
      participantCount: 403,
    };
    const ev = evaluateInterventionEvidence(link, R);
    expect(ev.measured).toBe(true);
    expect(ev.firstLoad).toBe(80);
    expect(ev.lastLoad).toBe(58);
    expect(ev.targetImprovement).toBe(22);
    // netEffect = melhora alvo (22) − drift médio (~6) > 0
    expect(ev.netEffect!).toBeGreaterThan(0);
    expect(ev.verdict!.verdict).not.toBe("sem_efeito");
  });

  test("intervenção em work_pace (que piorou): efeito não-positivo", () => {
    const link: InterventionLink = {
      interventionId: "exp-ritmo",
      label: "Pausas programadas",
      targetDimensionId: "work_pace",
      participantCount: 403,
    };
    const ev = evaluateInterventionEvidence(link, R);
    expect(ev.targetImprovement).toBeLessThan(0); // piorou
    expect(ev.netEffect!).toBeLessThanOrEqual(0);
  });

  test("secularDrift é o mesmo para qualquer intervenção sobre a mesma leitura", () => {
    const a = evaluateInterventionEvidence({ interventionId: "a", label: "A", targetDimensionId: "demands_quant", participantCount: 403 }, R);
    const b = evaluateInterventionEvidence({ interventionId: "b", label: "B", targetDimensionId: "influence", participantCount: 403 }, R);
    expect(a.secularDrift).toBe(b.secularDrift);
  });
});

// ─── Teto de confiança (honestidade) ──────────────────────────────────────────

describe("evaluateInterventionEvidence — teto de confiança", () => {
  test("n alto (403) NÃO vira 'robusto' — proxy de drift não é controle (teto: indicativo)", () => {
    const ev = evaluateInterventionEvidence(
      { interventionId: "x", label: "X", targetDimensionId: "demands_quant", participantCount: 403 },
      R,
    );
    expect(ev.verdict!.confidenceTier).not.toBe("robusto");
    expect(ev.verdict!.confidenceTier).toBe("indicativo");
  });

  test("o disclaimer declara ausência de controle e repassa o da leitura", () => {
    const ev = evaluateInterventionEvidence(
      { interventionId: "x", label: "X", targetDimensionId: "demands_quant", participantCount: 403 },
      R,
    );
    expect(ev.disclaimer).toContain("sem grupo de controle");
    expect(ev.disclaimer).toContain("causalidade");
  });
});

// ─── Separação de desfechos e não-medido ──────────────────────────────────────

describe("evaluateInterventionEvidence — honestidade de medição", () => {
  test("intervenção que mira um DESFECHO (burnout) não vira eficácia de driver", () => {
    const ev = evaluateInterventionEvidence(
      { interventionId: "x", label: "Apoio emocional", targetDimensionId: "burnout", participantCount: 403 },
      R,
    );
    expect(ev.measured).toBe(false);
    expect(ev.verdict).toBeNull();
    expect(ev.note).toContain("DESFECHO");
  });

  test("dimensão ausente na leitura → não medido, sem inventar efeito", () => {
    const ev = evaluateInterventionEvidence(
      { interventionId: "x", label: "Y", targetDimensionId: "predictability", participantCount: 403 },
      R,
    );
    expect(ev.measured).toBe(false);
    expect(ev.verdict).toBeNull();
    expect(ev.netEffect).toBeNull();
  });

  test("amostra abaixo do k-anon → resultado protegido", () => {
    const ev = evaluateInterventionEvidence(
      { interventionId: "x", label: "Z", targetDimensionId: "demands_quant", participantCount: 3 },
      R,
    );
    expect(ev.verdict!.verdict).toBe("protegido");
    expect(ev.note).toContain("protegido");
  });
});

// ─── Lote ──────────────────────────────────────────────────────────────────────

describe("evaluateInterventionBatch", () => {
  test("avalia várias intervenções contra a mesma leitura", () => {
    const links: InterventionLink[] = [
      { interventionId: "a", label: "Carga", targetDimensionId: "demands_quant", participantCount: 403 },
      { interventionId: "b", label: "Ritmo", targetDimensionId: "work_pace", participantCount: 403 },
    ];
    const out = evaluateInterventionBatch(links, R);
    expect(out).toHaveLength(2);
    expect(out[0]!.interventionId).toBe("a");
    expect(out[1]!.interventionId).toBe("b");
  });
});
