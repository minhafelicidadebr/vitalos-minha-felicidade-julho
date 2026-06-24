// Teste de integração: NR-1 setorial reativo.
// Prova que trocar o packId produz dados DISTINTOS nos engines NR-1 —
// comprovando que o switch de setor realmente muda os resultados.
// Assinaturas distintas por setor são a prova de que não há relabel.

import { describe, expect, test } from "bun:test";
import {
  getSectorExposure,
  getSectorCycles,
  getSectorPgrMeasures,
  getSectorMeasureMaintenance,
} from "./nr1-sector-exposure";
import { rankDriversByExposure } from "@/engine/nr1/crosswalk-engine";
import { buildReavaliacao } from "@/engine/nr1/reavaliacao-engine";
import { buildPgrPlan } from "@/engine/nr1/pgr-engine";
import { NR1_CROSSWALK } from "./nr1-crosswalk-mock";

const PACKS = ["enterprise", "school", "government", "condominium", "health"] as const;

describe("nr1-sector-exposure — switching setorial prova motores distintos", () => {
  test("cada setor tem exposição distinta (não relabel)", () => {
    const exposures = PACKS.map((p) => getSectorExposure(p));
    // Compara pares: nenhum par deve ser idêntico
    for (let i = 0; i < exposures.length; i++) {
      for (let j = i + 1; j < exposures.length; j++) {
        const a = exposures[i]!.map((e) => e.load);
        const b = exposures[j]!.map((e) => e.load);
        expect(a).not.toEqual(b);
      }
    }
  });

  test("assinatura de burnout saúde: demands_emotional é o mais alto", () => {
    const health = getSectorExposure("health");
    const maxDim = health.reduce((a, b) => (a.load > b.load ? a : b));
    expect(maxDim.dimensionId).toBe("demands_emotional");
  });

  test("assinatura governo: insecurity é o mais alto", () => {
    const gov = getSectorExposure("government");
    const maxDim = gov.reduce((a, b) => (a.load > b.load ? a : b));
    expect(maxDim.dimensionId).toBe("insecurity");
  });

  test("escola: demands_emotional domina (docente)", () => {
    const school = getSectorExposure("school");
    const maxDim = school.reduce((a, b) => (a.load > b.load ? a : b));
    expect(maxDim.dimensionId).toBe("demands_emotional");
  });

  test("ciclos longitudinais são gerados por setor (3 ciclos cada)", () => {
    for (const pack of PACKS) {
      const cycles = getSectorCycles(pack);
      expect(cycles.length).toBeGreaterThanOrEqual(3);
      // Cada ciclo deve ter o mesmo número de dimensões
      const dimCount = cycles[0]!.exposures.length;
      for (const c of cycles) {
        expect(c.exposures.length).toBe(dimCount);
      }
    }
  });

  test("ciclos saúde mostram melhora em demands_emotional (ação aconteceu)", () => {
    const cycles = getSectorCycles("health");
    const first = cycles[0]!.exposures.find((e) => e.dimensionId === "demands_emotional")!;
    const last = cycles[cycles.length - 1]!.exposures.find(
      (e) => e.dimensionId === "demands_emotional",
    )!;
    expect(last.load).toBeLessThan(first.load);
  });

  test("PGR measures traduzem responsável por setor", () => {
    const enterprise = getSectorPgrMeasures("enterprise");
    const school = getSectorPgrMeasures("school");
    const health = getSectorPgrMeasures("health");
    // Em enterprise não há tradução (fallback direto)
    // Em school "Alta Direção" → "Direção Escolar"
    const schoolHas = school.some((m) => m.responsible === "Direção Escolar");
    expect(schoolHas).toBe(true);
    // Em health "Alta Direção" → "Direção Clínica"
    const healthHas = health.some((m) => m.responsible === "Direção Clínica");
    expect(healthHas).toBe(true);
    // Enterprise mantém o original
    const entHas = enterprise.some((m) => m.responsible === "Alta Direção");
    expect(entHas).toBe(true);
  });

  test("rankDriversByExposure prioriza diferente por setor", () => {
    const enterpriseRank = rankDriversByExposure(NR1_CROSSWALK, getSectorExposure("enterprise"));
    const healthRank = rankDriversByExposure(NR1_CROSSWALK, getSectorExposure("health"));
    // Os scores de necessidade devem diferir entre setores (assinaturas distintas)
    const entScores = enterpriseRank.map((d) => d.score);
    const healthScores = healthRank.map((d) => d.score);
    expect(entScores).not.toEqual(healthScores);
  });

  test("buildReavaliacao computa tendência honesta por setor", () => {
    for (const pack of ["school", "health", "government"] as const) {
      const exposure = getSectorExposure(pack);
      const cycles = getSectorCycles(pack);
      const measures = getSectorPgrMeasures(pack);
      const maintenance = getSectorMeasureMaintenance(pack);

      const pgrPlan = buildPgrPlan({
        registry: NR1_CROSSWALK,
        exposures: exposure,
        measures,
        generatedAt: NR1_CROSSWALK.updatedAt,
        currentWeek: 13,
        horizonWeeks: 13,
        topRisks: 5,
      });

      const reav = buildReavaliacao({
        registry: NR1_CROSSWALK,
        cycles,
        pgrPlan,
        maintenanceByDriver: maintenance,
      });

      // Deve ter drivers e tendência geral
      expect(reav.drivers.length).toBeGreaterThan(0);
      expect(["melhorando", "estavel", "piorando"]).toContain(reav.overallTrend);
      // A média deve estar em faixa válida (0..100)
      expect(reav.meanFirst).toBeGreaterThanOrEqual(0);
      expect(reav.meanFirst).toBeLessThanOrEqual(100);
    }
  });

  test("community fica invisível (k-anon) em todos os setores", () => {
    for (const pack of PACKS) {
      const exposure = getSectorExposure(pack);
      const community = exposure.find((e) => e.dimensionId === "community");
      expect(community?.visible).toBe(false);
    }
  });

  test("fallback para enterprise quando packId desconhecido", () => {
    const unknown = getSectorExposure("xyz_not_a_pack");
    const enterprise = getSectorExposure("enterprise");
    expect(unknown).toEqual(enterprise);
  });
});
