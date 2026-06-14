import { describe, expect, it } from "bun:test";
import { bandFor, deriveEsgReadiness, type EsgMapping, type PillarScore } from "./esg-engine";

const mapping: EsgMapping = {
  frameworks: [
    {
      id: "fw1",
      name: "Framework Um",
      kind: "esrs",
      color: "#000",
      datapoints: [
        { code: "DP1", label: "dois pilares visíveis", pillars: ["a", "b"] },
        { code: "DP2", label: "um visível, um oculto", pillars: ["b", "hidden"] },
        { code: "DP3", label: "só oculto", pillars: ["hidden"] },
      ],
    },
  ],
};

const pillars: PillarScore[] = [
  { pillarId: "a", name: "A", score: 600, visible: true },
  { pillarId: "b", name: "B", score: 800, visible: true },
  { pillarId: "hidden", name: "Oculto", score: 900, visible: false },
];

describe("bandFor", () => {
  it("classifica nas fronteiras corretas", () => {
    expect(bandFor(0).band).toBe("em_formacao");
    expect(bandFor(349).band).toBe("em_formacao");
    expect(bandFor(350).band).toBe("em_progresso");
    expect(bandFor(649).band).toBe("em_progresso");
    expect(bandFor(650).band).toBe("consolidando");
    expect(bandFor(799).band).toBe("consolidando");
    expect(bandFor(800).band).toBe("maduro");
    expect(bandFor(1000).band).toBe("maduro");
  });
});

describe("deriveEsgReadiness", () => {
  const result = deriveEsgReadiness(pillars, mapping);
  const fw = result.frameworks[0]!;
  const [dp1, dp2, dp3] = fw.datapoints;

  it("calcula o score do datapoint como média dos pilares VISÍVEIS", () => {
    expect(dp1!.score).toBe(700); // (600 + 800) / 2
  });

  it("exclui pilares ocultos por k-anonimato e os reporta", () => {
    expect(dp2!.score).toBe(800); // só o pilar 'b' visível
    expect(dp2!.hiddenPillarIds).toEqual(["hidden"]);
    expect(dp2!.coveredPillars).toHaveLength(1);
  });

  it("marca datapoint sem pilar visível como não mensurável (score null)", () => {
    expect(dp3!.score).toBeNull();
    expect(dp3!.band).toBeNull();
    expect(dp3!.hiddenPillarIds).toEqual(["hidden"]);
  });

  it("agrega o framework como média dos datapoints mensuráveis", () => {
    expect(fw.score).toBe(750); // (700 + 800) / 2, dp3 ignorado
  });

  it("conta cobertura de datapoints corretamente", () => {
    expect(result.totalDatapoints).toBe(3);
    expect(result.measurableDatapoints).toBe(2);
    expect(fw.coverageRatio).toBeCloseTo(2 / 3);
  });

  it("nunca expõe score individual — só agregados derivados", () => {
    // o pilar oculto (900) jamais aparece como score visível
    const allScores = fw.datapoints.flatMap((d) => d.coveredPillars.map((p) => p.score));
    expect(allScores).not.toContain(900);
  });

  it("produz banda geral coerente", () => {
    expect(result.overallScore).toBe(750);
    expect(result.overallBand).toBe("consolidando");
  });
});

describe("deriveEsgReadiness — entradas vazias", () => {
  it("não quebra sem pilares", () => {
    const empty = deriveEsgReadiness([], mapping);
    expect(empty.overallScore).toBeNull();
    expect(empty.measurableDatapoints).toBe(0);
  });
});
