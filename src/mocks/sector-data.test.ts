// Honestidade do switch de setor: garante que os agregados de cada setor batem com
// o framework daquele setor. Sem isto, ativar um pack poderia render um índice com
// pillarIds órfãos → calculateIVO produziria zeros silenciosos (mentira sutil).
// Este teste é a trava que torna o pack-switcher confiável de verdade.

import { describe, expect, test } from "bun:test";
import { getSectorData } from "./sector-data";
import { calculateIVO } from "@/engine/index/ivo-engine";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";
import ivoFramework from "@/domain/packs/enterprise/ivo-framework.json";
import ievFramework from "@/domain/packs/school/iev-framework.json";

const FRAMEWORKS: Record<string, ProprietaryIndex> = {
  enterprise: ivoFramework as unknown as ProprietaryIndex,
  school: ievFramework as unknown as ProprietaryIndex,
};

function frameworkPillarIds(fw: ProprietaryIndex): Set<string> {
  const lenses = fw.lenses as Array<{ pillars: Array<{ id: string }> }>;
  return new Set(lenses.flatMap((l) => l.pillars.map((p) => p.id)));
}

for (const [packId, fw] of Object.entries(FRAMEWORKS)) {
  describe(`sector-data — "${packId}" coerente com o framework`, () => {
    const data = getSectorData(packId);
    const valid = frameworkPillarIds(fw);

    test("todo pillarId do ciclo atual existe no framework", () => {
      for (const a of data.currentCycle.aggregates) {
        expect(valid.has(a.pillarId)).toBe(true);
      }
    });

    test("ciclo atual e anterior cobrem o MESMO conjunto de pilares", () => {
      const cur = new Set(data.currentCycle.aggregates.map((a) => a.pillarId));
      const prev = new Set(data.previousCycle.aggregates.map((a) => a.pillarId));
      expect([...cur].sort()).toEqual([...prev].sort());
    });

    test("o ciclo cobre todos os pilares do framework (nada órfão de cada lado)", () => {
      const cur = new Set(data.currentCycle.aggregates.map((a) => a.pillarId));
      for (const id of valid) expect(cur.has(id)).toBe(true);
    });

    test("participação é uma taxa válida (0–100)", () => {
      expect(data.org.participationRate).toBeGreaterThanOrEqual(0);
      expect(data.org.participationRate).toBeLessThanOrEqual(100);
    });

    test("calculateIVO produz um índice não-trivial (>0) — prova de coerência", () => {
      const result = calculateIVO(data.currentCycle, fw);
      expect(result.ivoScore).toBeGreaterThan(0);
      expect(result.ivoScore).toBeLessThanOrEqual((fw.scale as { max: number }).max);
    });
  });
}

describe("sector-data — fallback", () => {
  test("setor desconhecido cai para enterprise", () => {
    expect(getSectorData("inexistente")).toBe(getSectorData("enterprise"));
  });
});
