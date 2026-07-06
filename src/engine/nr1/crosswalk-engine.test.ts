import { describe, expect, it } from "bun:test";
import {
  cellAt,
  dimensionsForDriver,
  driverProfile,
  driversForDimension,
  exposuresFromLoadScores,
  outcomeViolations,
  priorityCells,
  rankDriversByExposure,
  strengthAt,
  summarizeCrosswalk,
} from "./crosswalk-engine";
import { DEMO_COPSOQ_EXPOSURE, NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";

const R = NR1_CROSSWALK;

describe("crosswalk-engine · cobertura e integridade", () => {
  it("resume 12 drivers, 23 dimensões (14 COPSOQ + 9 FIB-T) e 1 célula crítica", () => {
    const s = summarizeCrosswalk(R);
    expect(s.drivers).toBe(12);
    expect(s.dimensions).toBe(23);
    expect(s.byInstrument.copsoq).toBe(14);
    expect(s.byInstrument.fibt).toBe(9);
    expect(s.critical).toBe(1);
    expect(s.cells).toBe(69);
  });

  it("toda célula referencia driver e dimensão reais (zero referência pendente)", () => {
    const driverIds = new Set(R.drivers.map((d) => d.id));
    const dimIds = new Set(R.dimensions.map((d) => d.id));
    const dangling = R.cells.filter((c) => !driverIds.has(c.driverId) || !dimIds.has(c.dimensionId));
    expect(dangling).toEqual([]);
  });

  it("toda força está em (0,1] — sem célula vazia ou fora de faixa", () => {
    expect(R.cells.every((c) => c.strength > 0 && c.strength <= 1)).toBe(true);
  });

  it("todo driver reconcilia ao menos um pilar IVO", () => {
    expect(R.drivers.every((d) => d.pillarIds.length > 0)).toBe(true);
  });
});

describe("crosswalk-engine · separação sagrada Domínio A/B (guard)", () => {
  it("NENHUMA célula de driver aponta para um desfecho (isOutcome)", () => {
    expect(outcomeViolations(R)).toEqual([]);
  });

  it("burnout e comportamentos ofensivos existem como dimensões, mas só como desfecho", () => {
    const outcomes = R.dimensions.filter((d) => d.isOutcome).map((d) => d.id);
    expect(outcomes).toContain("burnout");
    expect(outcomes).toContain("offensive_behaviors");
  });
});

describe("crosswalk-engine · consultas", () => {
  it("strengthAt lê a força e retorna 0 para par inexistente", () => {
    expect(strengthAt(R, "carga", "demands_quant")).toBe(1);
    expect(strengthAt(R, "carga", "meaning")).toBe(0);
  });

  it("cellAt traz o detalhe canônico (prioridade + evidência)", () => {
    const c = cellAt(R, "inclusao", "community");
    expect(c?.priority).toBe("P0");
    expect(c?.critical).toBe(true);
    expect(c?.evidence).toContain("OIT");
  });

  it("dimensionsForDriver ordena por força e filtra por instrumento", () => {
    const top = dimensionsForDriver(R, "carga")[0];
    expect(top?.dimension.id).toBe("demands_quant");
    const fibt = dimensionsForDriver(R, "carga", "fibt");
    expect(fibt.every((x) => x.dimension.instrument === "fibt")).toBe(true);
    expect(fibt[0]?.dimension.id).toBe("uso_tempo");
  });

  it("driversForDimension ranqueia os drivers de uma dimensão", () => {
    expect(driversForDimension(R, "leadership_quality")[0]?.driver.id).toBe("lideranca");
    expect(driversForDimension(R, "meaning")[0]?.driver.id).toBe("proposito");
  });

  it("priorityCells: 12 canônicas, ordenadas P0→P2", () => {
    const all = priorityCells(R);
    expect(all.length).toBe(12);
    expect(all[0]?.priority).toBe("P0");
    expect(all.at(-1)?.priority).toBe("P2");
    expect(priorityCells(R, "P0").length).toBe(7);
    expect(priorityCells(R, "P1").length).toBe(4);
  });
});

describe("crosswalk-engine · Medir → Transformar (rankDriversByExposure)", () => {
  it("a exposição medida prioriza Carga & Recuperação (P0 + carga elevada)", () => {
    const ranked = rankDriversByExposure(R, DEMO_COPSOQ_EXPOSURE);
    expect(ranked[0]?.driverId).toBe("carga");
    expect(ranked[0]?.priority).toBe(true);
    expect(ranked[0]?.topDimension?.id).toBe("demands_quant");
  });

  it("respeita k-anon: dimensão não-visível (community n<5) não pontua", () => {
    const withHidden = rankDriversByExposure(R, DEMO_COPSOQ_EXPOSURE).find((d) => d.driverId === "apoio");
    const exposedCommunity = DEMO_COPSOQ_EXPOSURE.map((e) =>
      e.dimensionId === "community" ? { ...e, visible: true, load: 90 } : e,
    );
    const withVisible = rankDriversByExposure(R, exposedCommunity).find((d) => d.driverId === "apoio");
    expect(withVisible!.score).toBeGreaterThan(withHidden!.score);
  });

  it("é determinística e ignora desfechos", () => {
    const a = rankDriversByExposure(R, DEMO_COPSOQ_EXPOSURE);
    const withOutcome = [...DEMO_COPSOQ_EXPOSURE, { dimensionId: "burnout", load: 99, visible: true }];
    const b = rankDriversByExposure(R, withOutcome);
    expect(b).toEqual(a);
  });

  it("sem exposição visível, nenhuma prioridade é presumida", () => {
    const hidden = DEMO_COPSOQ_EXPOSURE.map((e) => ({ ...e, visible: false }));
    const ranked = rankDriversByExposure(R, hidden);
    expect(ranked.every((d) => d.score === 0 && !d.priority)).toBe(true);
  });
});

describe("crosswalk-engine · driverProfile (Mundo do Driver)", () => {
  it("monta o perfil: intersecções ordenadas por instrumento + sinais P0→P2", () => {
    const p = driverProfile(R, "carga")!;
    expect(p.driver.label).toBe("Carga & Recuperação");
    expect(p.copsoq[0]?.dimension.id).toBe("demands_quant");
    expect(p.copsoq.every((x) => x.dimension.instrument === "copsoq")).toBe(true);
    expect(p.fibt[0]?.dimension.id).toBe("uso_tempo");
    expect(p.signals.length).toBeGreaterThan(0);
    expect(p.signals[0]?.priority).toBe("P0");
  });

  it("driver inexistente → null (sem fabricar perfil)", () => {
    expect(driverProfile(R, "inexistente")).toBeNull();
  });

  it("sem exposição, exposureNeed é null; com exposição, reflete a necessidade", () => {
    expect(driverProfile(R, "carga")!.exposureNeed).toBeNull();
    const need = driverProfile(R, "carga", DEMO_COPSOQ_EXPOSURE)!.exposureNeed;
    expect(need?.priority).toBe(true);
    expect(need?.topDimension?.id).toBe("demands_quant");
  });

  it("o sinal crítico de Inclusão & Proteção aparece no perfil", () => {
    const p = driverProfile(R, "inclusao")!;
    expect(p.signals.some((c) => c.critical && c.dimensionId === "community")).toBe(true);
  });
});

describe("crosswalk-engine · exposuresFromLoadScores (ponte capsule → DimensionExposure)", () => {
  it("mapeia loadScore→load preservando dimensionId e visible", () => {
    const out = exposuresFromLoadScores([
      { dimensionId: "demands_quant", loadScore: 72, visible: true },
      { dimensionId: "work_pace", loadScore: 40, visible: false },
    ]);
    expect(out).toEqual([
      { dimensionId: "demands_quant", load: 72, visible: true },
      { dimensionId: "work_pace", load: 40, visible: false },
    ]);
  });

  it("lista vazia → lista vazia (nunca fabrica exposição)", () => {
    expect(exposuresFromLoadScores([])).toEqual([]);
  });
});
