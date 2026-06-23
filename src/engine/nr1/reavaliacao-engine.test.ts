import { describe, expect, test } from "bun:test";
import { buildReavaliacao, type CycleExposure } from "./reavaliacao-engine";
import { buildPgrPlan } from "./pgr-engine";
import { NR1_CROSSWALK, DEMO_COPSOQ_EXPOSURE } from "@/mocks/nr1-crosswalk-mock";
import { NR1_CYCLES } from "@/mocks/nr1-reavaliacao-mock";
import { PGR_MEASURES } from "@/mocks/pgr-nr1-mock";

const base = { registry: NR1_CROSSWALK, cycles: NR1_CYCLES };

describe("reavaliacao-engine — curva longitudinal", () => {
  const result = buildReavaliacao(base);

  test("agrega exposição média por ciclo, do mais antigo ao mais recente", () => {
    expect(result.cycles.length).toBe(3);
    expect(result.cycles[0]!.cycleId).toBe("2025-Q3");
    expect(result.cycles[2]!.cycleId).toBe("2026-Q1");
  });

  test("exposição média cai ao longo do programa (melhora agregada)", () => {
    expect(result.meanLast).toBeLessThan(result.meanFirst);
    expect(result.meanDelta).toBeLessThan(0);
    expect(result.overallTrend).toBe("melhorando");
  });

  test("cada driver exposto tem um ponto por ciclo", () => {
    expect(result.drivers.length).toBeGreaterThan(0);
    for (const d of result.drivers) {
      expect(d.points.length).toBe(3);
    }
  });

  test("ordena por maior redução de exposição (maiores ganhos primeiro)", () => {
    for (let i = 1; i < result.drivers.length; i++) {
      expect(result.drivers[i - 1]!.reduction).toBeGreaterThanOrEqual(result.drivers[i]!.reduction);
    }
  });

  test("carga é o driver de maior redução no perfil demo", () => {
    expect(result.drivers[0]!.driverId).toBe("carga");
    expect(result.drivers[0]!.improved).toBe(true);
    expect(result.drivers[0]!.lastRisk).not.toBe(result.drivers[0]!.firstRisk);
  });

  test("redução = −delta e trend coerente com o sinal", () => {
    for (const d of result.drivers) {
      expect(d.reduction).toBe(-d.delta);
      if (d.delta <= -5) expect(d.trend).toBe("melhorando");
      if (d.delta >= 5) expect(d.trend).toBe("piorando");
    }
  });

  test("improvedCount conta os drivers que baixaram de nível de risco", () => {
    const manual = result.drivers.filter((d) => d.improved).length;
    expect(result.improvedCount).toBe(manual);
    expect(result.improvedCount).toBeGreaterThan(0);
  });

  test("disclaimer deixa claro que é correlação, não causalidade", () => {
    expect(result.disclaimer).toMatch(/não.*causalidade/i);
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    expect(JSON.stringify(buildReavaliacao(base))).toBe(JSON.stringify(buildReavaliacao(base)));
  });
});

describe("reavaliacao-engine — eficácia honesta (composição com o PGR)", () => {
  test("associa medidas de fonte implementadas a drivers que melhoraram", () => {
    // PGR no fim do ciclo (semana 13) → medidas de fonte implementadas.
    const pgrPlan = buildPgrPlan({
      registry: NR1_CROSSWALK,
      exposures: DEMO_COPSOQ_EXPOSURE,
      measures: PGR_MEASURES,
      generatedAt: "2026-03-31",
      currentWeek: 13,
      horizonWeeks: 13,
      topRisks: 5,
    });
    const result = buildReavaliacao({ ...base, pgrPlan });

    expect(result.efficacy).not.toBeNull();
    expect(result.efficacy!.withSourceMeasure).toBeGreaterThan(0);
    expect(result.efficacy!.ofWhichImproved).toBeGreaterThan(0);
    expect(result.efficacy!.ofWhichImproved).toBeLessThanOrEqual(result.efficacy!.withSourceMeasure);
  });

  test("sem PGR, eficácia é null (não inventa atribuição)", () => {
    expect(buildReavaliacao(base).efficacy).toBeNull();
  });
});

describe("reavaliacao-engine — bordas", () => {
  test("série vazia retorna resultado neutro sem quebrar", () => {
    const empty = buildReavaliacao({ registry: NR1_CROSSWALK, cycles: [] });
    expect(empty.drivers.length).toBe(0);
    expect(empty.overallTrend).toBe("estavel");
    expect(empty.efficacy).toBeNull();
  });

  test("ciclo único: deltas zerados, tendência estável", () => {
    const one: CycleExposure[] = [NR1_CYCLES[0]!];
    const r = buildReavaliacao({ registry: NR1_CROSSWALK, cycles: one });
    expect(r.meanDelta).toBe(0);
    expect(r.overallTrend).toBe("estavel");
    for (const d of r.drivers) expect(d.delta).toBe(0);
  });

  test("dimensão oculta (k-anon) não entra na média do ciclo", () => {
    const r = buildReavaliacao(base);
    // 11 dimensões COPSOQ visíveis (community oculta) → contagem por ciclo = 11.
    expect(r.cycles[0]!.visibleDims).toBe(11);
  });
});
