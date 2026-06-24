import { describe, expect, test } from "bun:test";
import {
  getSectorCycles,
  getSectorExposure,
  getSectorMeasureMaintenance,
  getSectorPgrMeasures,
} from "./nr1-sector-exposure";
import { NR1_CROSSWALK, DEMO_COPSOQ_EXPOSURE } from "./nr1-crosswalk-mock";
import { rankDriversByExposure } from "@/engine/nr1/crosswalk-engine";
import { buildPgrPlan } from "@/engine/nr1/pgr-engine";

const PACKS = ["enterprise", "school", "government", "condominium", "health"];

// Conjunto canônico de dimensões COPSOQ (não-desfecho).
const COPSOQ_DIMS = new Set(
  NR1_CROSSWALK.dimensions
    .filter((d) => d.instrument === "copsoq" && !d.isOutcome)
    .map((d) => d.id),
);

describe("nr1-sector-exposure — integridade por setor", () => {
  test("todo setor expõe apenas dimensões COPSOQ canônicas, em 0..100", () => {
    for (const p of PACKS) {
      for (const e of getSectorExposure(p)) {
        expect(COPSOQ_DIMS.has(e.dimensionId)).toBe(true);
        expect(e.load).toBeGreaterThanOrEqual(0);
        expect(e.load).toBeLessThanOrEqual(100);
      }
    }
  });

  test("enterprise é o perfil canônico (DEMO)", () => {
    expect(getSectorExposure("enterprise")).toBe(DEMO_COPSOQ_EXPOSURE);
  });

  test("pack desconhecido cai no fallback enterprise", () => {
    expect(getSectorExposure("inexistente")).toBe(DEMO_COPSOQ_EXPOSURE);
  });

  test("community segue oculta (k-anon) em todos os setores", () => {
    for (const p of PACKS) {
      const comm = getSectorExposure(p).find((e) => e.dimensionId === "community");
      expect(comm?.visible).toBe(false);
    }
  });
});

describe("nr1-sector-exposure — assinaturas distintas (um motor, cinco setores)", () => {
  const rankOrder = (p: string) =>
    rankDriversByExposure(NR1_CROSSWALK, getSectorExposure(p)).map((n) => n.driverId);
  const loadOf = (p: string, dim: string) =>
    getSectorExposure(p).find((e) => e.dimensionId === dim)!.load;

  test("saúde tem a maior exigência emocional de todos (assinatura do burnout)", () => {
    const emo = (p: string) => loadOf(p, "demands_emotional");
    const others = PACKS.filter((p) => p !== "health");
    for (const p of others) expect(emo("health")).toBeGreaterThan(emo(p));
  });

  test("governo tem a maior insegurança (futuro) de todos", () => {
    const ins = (p: string) => loadOf(p, "insecurity");
    const others = PACKS.filter((p) => p !== "government");
    for (const p of others) expect(ins("government")).toBeGreaterThan(ins(p));
  });

  test("a ORDEM do ranking difere entre setores (não é enterprise relabelado)", () => {
    // Saúde e governo produzem listas ranqueadas diferentes.
    expect(rankOrder("health")).not.toEqual(rankOrder("government"));
    // E nenhum setor é idêntico ao enterprise em todo o vetor de exposição.
    for (const p of ["school", "government", "condominium", "health"]) {
      const same = getSectorExposure(p).every(
        (e, i) => e.load === DEMO_COPSOQ_EXPOSURE[i]?.load,
      );
      expect(same).toBe(false);
    }
  });
});

describe("nr1-sector-exposure — ciclos de reavaliação", () => {
  test("enterprise reusa a curva canônica autorada", () => {
    expect(getSectorCycles("enterprise")[0]!.cycleId).toBe("2025-Q3");
  });

  test("setores geram 3 ciclos com exposição agregada caindo", () => {
    for (const p of ["school", "government", "condominium", "health"]) {
      const cycles = getSectorCycles(p);
      expect(cycles.length).toBe(3);
      const dimSum = (c: (typeof cycles)[number]) =>
        c.exposures.filter((e) => e.visible !== false).reduce((s, e) => s + e.load, 0);
      expect(dimSum(cycles[2]!)).toBeLessThan(dimSum(cycles[0]!));
    }
  });
});

describe("nr1-sector-exposure — vocabulário de responsável", () => {
  test("saúde traduz responsável (Direção Clínica), sem alterar a ação", () => {
    const generic = getSectorPgrMeasures("enterprise");
    const saude = getSectorPgrMeasures("health");
    expect(saude.length).toBe(generic.length);
    // Mesma ação, responsável traduzido.
    const i = generic.findIndex((m) => m.responsible === "Alta Direção");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(saude[i]!.action).toBe(generic[i]!.action);
    expect(saude[i]!.responsible).toBe("Direção Clínica");
  });

  test("enterprise mantém os responsáveis genéricos", () => {
    expect(getSectorPgrMeasures("enterprise")).toBe(
      getSectorPgrMeasures("enterprise"),
    );
    expect(getSectorPgrMeasures("enterprise").some((m) => m.responsible === "Alta Direção")).toBe(true);
  });

  test("o PGR de cada setor mantém ≥1 medida de fonte por risco (invariante §8 preservado)", () => {
    const sourceTiers = new Set(["eliminacao", "organizacao"]);
    for (const p of PACKS) {
      const plan = buildPgrPlan({
        registry: NR1_CROSSWALK,
        exposures: getSectorExposure(p),
        measures: getSectorPgrMeasures(p),
        generatedAt: "2026-06-23",
        currentWeek: 6,
        horizonWeeks: 13,
        topRisks: 5,
      });
      for (const r of plan.risks) {
        expect(sourceTiers.has(r.measures[0]!.tier)).toBe(true);
      }
    }
  });
});

describe("nr1-sector-exposure — manutenção", () => {
  test("enterprise carrega o mock canônico (carga em desuso); demais sem desuso", () => {
    expect(getSectorMeasureMaintenance("enterprise").carga).toBe(false);
    expect(Object.keys(getSectorMeasureMaintenance("health")).length).toBe(0);
  });
});
