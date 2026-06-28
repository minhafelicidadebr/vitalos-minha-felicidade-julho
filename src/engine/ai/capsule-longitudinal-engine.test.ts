import { describe, expect, test } from "bun:test";
import {
  buildLongitudinalReading,
  validateLongitudinalInput,
  groundLongitudinalReading,
  type LongitudinalReading,
} from "./capsule-longitudinal-engine";
import {
  buildMeasurementCapsule,
  type CapsuleInput,
  type CapsuleDimensionInput,
} from "./measurement-capsule-engine";

// ─── Fixtures: capsules COPSOQ de 3 ciclos ────────────────────────────────────

function copsoqCapsule(
  closedOn: string,
  waveId: string,
  dims: CapsuleDimensionInput[],
  overrides: Partial<CapsuleInput> = {},
) {
  return buildMeasurementCapsule({
    capsuleId: `cap-${waveId}`,
    packId: "enterprise",
    waveId,
    cohortId: `cohort-${waveId}`,
    closedOn,
    instrument: "COPSOQ II · NR-1",
    instrumentShort: "COPSOQ",
    domain: "B",
    participantCount: 403,
    kAnonymityMin: 5,
    dimensions: dims,
    ...overrides,
  });
}

function dim(
  dimensionId: string,
  label: string,
  loadScore: number,
  riskLevel: CapsuleDimensionInput["riskLevel"],
  opts: Partial<CapsuleDimensionInput> = {},
): CapsuleDimensionInput {
  return { dimensionId, label, loadScore, n: 403, visible: true, riskLevel, isOutcome: false, ...opts };
}

// Ciclo 1 (jan): exigências altas. Ciclo 2 (abr): melhora. Ciclo 3 (jul): mais melhora.
const C1 = copsoqCapsule("2025-01-22", "onda-2025-t1", [
  dim("demands_quant", "Demandas quantitativas", 80, "critico"),
  dim("work_pace", "Ritmo de trabalho", 64, "alto"),
  dim("influence", "Influência", 50, "moderado"),
  dim("burnout", "Burnout", 70, "alto", { isOutcome: true }),
]);
const C2 = copsoqCapsule("2025-07-22", "onda-2025-t3", [
  dim("demands_quant", "Demandas quantitativas", 72, "alto"),
  dim("work_pace", "Ritmo de trabalho", 68, "alto"),
  dim("influence", "Influência", 48, "moderado"),
  dim("burnout", "Burnout", 60, "moderado", { isOutcome: true }),
]);
const C3 = copsoqCapsule("2026-01-22", "onda-2026-t1", [
  dim("demands_quant", "Demandas quantitativas", 58, "moderado"),
  dim("work_pace", "Ritmo de trabalho", 70, "alto"),
  dim("influence", "Influência", 49, "moderado"),
  dim("burnout", "Burnout", 52, "moderado", { isOutcome: true }),
]);

function reading(): LongitudinalReading {
  const result = buildLongitudinalReading({ capsules: [C1, C2, C3] });
  if (!result.ok) throw new Error("esperado ok");
  return result.reading;
}

// ─── validateLongitudinalInput ────────────────────────────────────────────────

describe("validateLongitudinalInput", () => {
  test("aceita ≥2 capsules coerentes", () => {
    expect(validateLongitudinalInput([C1, C2]).valid).toBe(true);
  });

  test("rejeita < 2 ciclos", () => {
    expect(validateLongitudinalInput([C1]).violations).toContain("too_few_cycles");
  });

  test("rejeita pack misturado", () => {
    const other = copsoqCapsule("2025-07-22", "onda-x", [dim("demands_quant", "DQ", 70, "alto")], {
      packId: "health",
    });
    expect(validateLongitudinalInput([C1, other]).violations).toContain("mixed_pack");
  });

  test("rejeita instrumento misturado", () => {
    const other = copsoqCapsule("2025-07-22", "onda-x", [dim("d", "D", 70, "alto")], {
      instrumentShort: "FIB-T",
    });
    expect(validateLongitudinalInput([C1, other]).violations).toContain("mixed_instrument");
  });

  test("rejeita domínio misturado", () => {
    const domainA = buildMeasurementCapsule({
      capsuleId: "cap-a",
      packId: "enterprise",
      waveId: "onda-perma",
      cohortId: "c",
      closedOn: "2025-07-22",
      instrument: "COPSOQ II · NR-1",
      instrumentShort: "COPSOQ",
      domain: "A",
      participantCount: 403,
      kAnonymityMin: 5,
      dimensions: [{ dimensionId: "x", label: "X", loadScore: 30, n: 403, visible: true }],
    });
    expect(validateLongitudinalInput([C1, domainA]).violations).toContain("mixed_domain");
  });
});

describe("buildLongitudinalReading — rejeição", () => {
  test("retorna ok:false com violações para entrada incoerente", () => {
    const result = buildLongitudinalReading({ capsules: [C1] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.violations).toContain("too_few_cycles");
  });
});

// ─── Trajetória e direção ─────────────────────────────────────────────────────

describe("buildLongitudinalReading — trajetória", () => {
  test("ordena os ciclos cronologicamente por closedOn", () => {
    // Passa fora de ordem; deve reordenar.
    const result = buildLongitudinalReading({ capsules: [C3, C1, C2] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reading.cycleLabels).toEqual(["2025-01", "2025-07", "2026-01"]);
  });

  test("demands_quant melhora (80 → 58, carga caiu = melhora)", () => {
    const r = reading();
    const dq = r.exposures.find((e) => e.dimensionId === "demands_quant")!;
    expect(dq.firstLoad).toBe(80);
    expect(dq.lastLoad).toBe(58);
    expect(dq.delta).toBe(-22);
    expect(dq.improvement).toBe(22);
    expect(dq.direction).toBe("melhorando");
  });

  test("work_pace piora (64 → 70)", () => {
    const r = reading();
    const wp = r.exposures.find((e) => e.dimensionId === "work_pace")!;
    expect(wp.direction).toBe("piorando");
    expect(wp.improvement).toBe(-6);
  });

  test("influence estável (50 → 49, < 5 pts)", () => {
    const r = reading();
    const inf = r.exposures.find((e) => e.dimensionId === "influence")!;
    expect(inf.direction).toBe("estavel");
  });

  test("exposures ordenadas por maior melhora primeiro", () => {
    const r = reading();
    expect(r.exposures[0]!.dimensionId).toBe("demands_quant"); // +22, a maior melhora
    expect(r.exposures.at(-1)!.dimensionId).toBe("work_pace"); // piorou
  });
});

// ─── Risco (Domínio B) ────────────────────────────────────────────────────────

describe("buildLongitudinalReading — risco NR-1", () => {
  test("riskShift registra queda de nível (critico → moderado em demands_quant)", () => {
    const r = reading();
    const dq = r.exposures.find((e) => e.dimensionId === "demands_quant")!;
    expect(dq.riskShift).not.toBeNull();
    expect(dq.riskShift!.from).toBe("critico");
    expect(dq.riskShift!.to).toBe("moderado");
    expect(dq.riskShift!.improved).toBe(true);
  });

  test("domínio A não tem riskShift (null)", () => {
    const a1 = buildMeasurementCapsule({
      capsuleId: "a1", packId: "enterprise", waveId: "w1", cohortId: "c", closedOn: "2025-01-22",
      instrument: "PERMA", instrumentShort: "PERMA+V / IVO", domain: "A", participantCount: 311, kAnonymityMin: 5,
      dimensions: [{ dimensionId: "perma_p", label: "Positivas", loadScore: 30, n: 311, visible: true }],
    });
    const a2 = buildMeasurementCapsule({
      capsuleId: "a2", packId: "enterprise", waveId: "w2", cohortId: "c", closedOn: "2025-07-22",
      instrument: "PERMA", instrumentShort: "PERMA+V / IVO", domain: "A", participantCount: 311, kAnonymityMin: 5,
      dimensions: [{ dimensionId: "perma_p", label: "Positivas", loadScore: 22, n: 311, visible: true }],
    });
    const result = buildLongitudinalReading({ capsules: [a1, a2] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reading.exposures[0]!.riskShift).toBeNull();
  });
});

// ─── Separação sagrada: desfechos à parte ─────────────────────────────────────

describe("buildLongitudinalReading — desfechos separados dos drivers", () => {
  test("burnout aparece em outcomes, NUNCA em exposures", () => {
    const r = reading();
    expect(r.exposures.some((e) => e.dimensionId === "burnout")).toBe(false);
    expect(r.outcomes.some((o) => o.dimensionId === "burnout")).toBe(true);
  });

  test("a trajetória do desfecho é medida (burnout 70 → 52)", () => {
    const r = reading();
    const bo = r.outcomes.find((o) => o.dimensionId === "burnout")!;
    expect(bo.firstLoad).toBe(70);
    expect(bo.lastLoad).toBe(52);
    expect(bo.direction).toBe("melhorando");
  });
});

// ─── Honestidade de k-anon ────────────────────────────────────────────────────

describe("buildLongitudinalReading — k-anon honesto", () => {
  test("dimensão suprimida em um extremo NÃO é comparável (fica fora, contada à parte)", () => {
    const k1 = copsoqCapsule("2025-01-22", "w1", [
      dim("demands_quant", "DQ", 80, "critico"),
      dim("community", "Comunidade", 40, "moderado", { n: 3, visible: false }), // suprimida
    ]);
    const k2 = copsoqCapsule("2025-07-22", "w2", [
      dim("demands_quant", "DQ", 70, "alto"),
      dim("community", "Comunidade", 38, "moderado"), // visível aqui, mas não no extremo inicial
    ]);
    const result = buildLongitudinalReading({ capsules: [k1, k2] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reading.exposures.some((e) => e.dimensionId === "community")).toBe(false);
    expect(result.reading.suppressedDimensions).toBeGreaterThanOrEqual(1);
  });

  test("dimensão visível nos dois extremos É comparável", () => {
    const r = reading();
    expect(r.exposures.some((e) => e.dimensionId === "demands_quant")).toBe(true);
  });
});

// ─── Agregado e disclaimer ────────────────────────────────────────────────────

describe("buildLongitudinalReading — agregado", () => {
  test("meanDelta negativo quando a média de exposição cai", () => {
    const r = reading();
    // exposures: demands_quant 80→58, work_pace 64→70, influence 50→49
    // meanFirst = (80+64+50)/3 = 64.7 ; meanLast = (58+70+49)/3 = 59 → meanDelta < 0
    expect(r.meanDelta).toBeLessThan(0);
    expect(r.overallDirection).toBe("melhorando");
  });

  test("conta improvedCount e worsenedCount corretamente", () => {
    const r = reading();
    expect(r.improvedCount).toBe(1); // demands_quant
    expect(r.worsenedCount).toBe(1); // work_pace
  });

  test("disclaimer nega causalidade explicitamente", () => {
    const r = reading();
    expect(r.disclaimer).toContain("causalidade");
    expect(r.disclaimer.toLowerCase()).toContain("k-anon");
  });
});

// ─── groundLongitudinalReading ────────────────────────────────────────────────

describe("groundLongitudinalReading", () => {
  test("headline menciona o instrumento, o span e os contadores", () => {
    const g = groundLongitudinalReading(reading());
    expect(g.headline).toContain("COPSOQ");
    expect(g.headline).toContain("melhoraram");
  });

  test("claims trazem a maior melhora e a maior piora, com evidência", () => {
    const g = groundLongitudinalReading(reading());
    const ids = g.claims.map((c) => c.dimensionId);
    expect(ids).toContain("demands_quant"); // maior melhora
    expect(ids).toContain("work_pace"); // maior piora
    for (const c of g.claims) expect(c.evidence.length).toBeGreaterThan(0);
  });

  test("repassa o disclaimer de não-causalidade", () => {
    const g = groundLongitudinalReading(reading());
    expect(g.disclaimer).toContain("causalidade");
  });
});
