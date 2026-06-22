import { describe, expect, test } from "bun:test";
import { buildSectorPortfolio, type SectorPortfolioInput } from "./cross-sector-engine";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";
import ivsFramework from "@/domain/packs/health/ivs-framework.json";
import igvFramework from "@/domain/packs/government/igv-framework.json";
import {
  HEALTH_CYCLE,
  HEALTH_CYCLE_PREVIOUS,
  HEALTH_TREND_CYCLES,
  HEALTH_ORG,
} from "@/mocks/health-mock";
import {
  GOVERNMENT_CYCLE,
  GOVERNMENT_CYCLE_PREVIOUS,
  GOVERNMENT_TREND_CYCLES,
  GOVERNMENT_ORG,
} from "@/mocks/government-mock";

const inputs: SectorPortfolioInput[] = [
  {
    packId: "health",
    sectorLabel: "Saúde",
    indexLabel: "IVS",
    orgName: HEALTH_ORG.name,
    participationRate: HEALTH_ORG.participationRate,
    current: HEALTH_CYCLE,
    previous: HEALTH_CYCLE_PREVIOUS,
    trend: HEALTH_TREND_CYCLES,
    framework: ivsFramework as unknown as ProprietaryIndex,
  },
  {
    packId: "government",
    sectorLabel: "Governo",
    indexLabel: "IGV",
    orgName: GOVERNMENT_ORG.name,
    participationRate: GOVERNMENT_ORG.participationRate,
    current: GOVERNMENT_CYCLE,
    previous: GOVERNMENT_CYCLE_PREVIOUS,
    trend: GOVERNMENT_TREND_CYCLES,
    framework: igvFramework as unknown as ProprietaryIndex,
  },
];

describe("cross-sector portfolio — opcionalidade multissetorial", () => {
  const portfolio = buildSectorPortfolio(inputs);

  test("computa um entry por setor com índice válido", () => {
    expect(portfolio.count).toBe(2);
    for (const s of portfolio.sectors) {
      expect(s.score).toBeGreaterThan(0);
      expect(s.score).toBeLessThanOrEqual(1000);
      expect(s.maturityName.length).toBeGreaterThan(0);
    }
  });

  test("ordena por score desc e identifica melhor e quem precisa de atenção", () => {
    const scores = portfolio.sectors.map((s) => s.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(portfolio.best!.score).toBeGreaterThanOrEqual(portfolio.needsAttention!.score);
  });

  test("cada setor traz lente de foco (menor) e de força (maior) coerentes", () => {
    for (const s of portfolio.sectors) {
      expect(s.focusLens).not.toBeNull();
      expect(s.topLens).not.toBeNull();
      expect(s.topLens!.score).toBeGreaterThanOrEqual(s.focusLens!.score);
    }
  });

  test("estatísticas agregadas: média, dispersão e participação", () => {
    const scores = portfolio.sectors.map((s) => s.score);
    const expectedAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    expect(portfolio.averageScore).toBe(expectedAvg);
    expect(portfolio.spread).toBe(Math.max(...scores) - Math.min(...scores));
    expect(portfolio.averageParticipation).toBeGreaterThan(0);
  });

  test("portfólio vazio não quebra", () => {
    const empty = buildSectorPortfolio([]);
    expect(empty.count).toBe(0);
    expect(empty.best).toBeNull();
    expect(empty.averageScore).toBe(0);
  });
});
