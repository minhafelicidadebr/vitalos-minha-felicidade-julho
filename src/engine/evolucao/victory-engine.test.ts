import { describe, expect, test } from "bun:test";
import {
  buildAtaDeVitoria,
  evaluateVictoryCondition,
  explainVictoryDenial,
  MEANINGFUL_REDUCTION,
  type VictoryConditionInput,
} from "./victory-engine";
import type { DriverEvolution } from "../nr1/reavaliacao-engine";

function driver(over: Partial<DriverEvolution> = {}): DriverEvolution {
  return {
    driverId: "carga",
    label: "Carga & Recuperação",
    macroLayer: "Condições",
    dimensionId: "demands_quant",
    dimensionLabel: "Exig. quantitativas",
    points: [],
    firstLoad: 70,
    lastLoad: 50,
    delta: -20,
    reduction: 20,
    firstRisk: "alto",
    lastRisk: "moderado",
    trend: "melhorando",
    improved: true,
    ...over,
  };
}

function input(over: Partial<VictoryConditionInput> = {}): VictoryConditionInput {
  return {
    driver: driver(),
    maintained: true,
    participantCount: 40,
    kAnonymityMin: 5,
    ...over,
  };
}

const META = {
  orgName: "TechCorp",
  cycleLabel: "2026-t1 → 2026-t2",
  documentId: "ata-carga-2026-t2",
  generatedAt: "2026-07-06T00:00:00.000Z",
};

describe("evaluateVictoryCondition", () => {
  test("elegível quando todas as condições são atendidas", () => {
    expect(evaluateVictoryCondition(input())).toEqual({ eligible: true, reason: null });
  });

  test("recusa quando amostra abaixo do k-anonimato", () => {
    const r = evaluateVictoryCondition(input({ participantCount: 3 }));
    expect(r).toEqual({ eligible: false, reason: "not_reportable" });
  });

  test("recusa quando a exposição não caiu", () => {
    const r = evaluateVictoryCondition(input({ driver: driver({ reduction: 0 }) }));
    expect(r.reason).toBe("no_reduction");
  });

  test("recusa quando a exposição piorou", () => {
    const r = evaluateVictoryCondition(input({ driver: driver({ reduction: -5 }) }));
    expect(r.reason).toBe("no_reduction");
  });

  test("recusa quando a queda está dentro da margem de ruído", () => {
    const r = evaluateVictoryCondition(input({ driver: driver({ reduction: MEANINGFUL_REDUCTION - 1 }) }));
    expect(r.reason).toBe("below_meaningful_threshold");
  });

  test("aceita exatamente no limiar de variação relevante", () => {
    const r = evaluateVictoryCondition(input({ driver: driver({ reduction: MEANINGFUL_REDUCTION }) }));
    expect(r.eligible).toBe(true);
  });

  test("recusa quando a medida caiu em desuso", () => {
    const r = evaluateVictoryCondition(input({ maintained: false }));
    expect(r.reason).toBe("not_maintained");
  });

  test("recusa quando não há atestação de manutenção (undefined não é presumido mantido)", () => {
    const r = evaluateVictoryCondition(input({ maintained: undefined }));
    expect(r.reason).toBe("not_maintained");
  });
});

describe("explainVictoryDenial", () => {
  test("cada motivo tem uma explicação não vazia", () => {
    for (const reason of ["no_reduction", "below_meaningful_threshold", "not_maintained", "not_reportable"] as const) {
      expect(explainVictoryDenial(reason).length).toBeGreaterThan(0);
    }
  });
});

describe("buildAtaDeVitoria", () => {
  test("retorna null quando a condição não é atendida — nunca inventa vitória", () => {
    expect(buildAtaDeVitoria(input({ maintained: false }), META)).toBeNull();
  });

  test("monta a Ata quando elegível, com o driver identificado pelo próprio rótulo", () => {
    const ata = buildAtaDeVitoria(input(), META);
    expect(ata).not.toBeNull();
    expect(ata!.driverId).toBe("carga");
    const ident = ata!.sections.find((s) => s.id === "identificacao")!;
    expect(ident.body.some((l) => l.includes("Carga & Recuperação"))).toBe(true);
  });

  test("seção de delta cita o antes/depois e o tamanho de efeito", () => {
    const ata = buildAtaDeVitoria(input(), META)!;
    const delta = ata.sections.find((s) => s.id === "delta")!;
    expect(delta.body.some((l) => l.includes("70") && l.includes("50"))).toBe(true);
    expect(delta.body.some((l) => l.includes("moderado"))).toBe(true); // reduction=20 → moderado (<=20)
  });

  test("classifica magnitude pequeno/moderado/amplo corretamente", () => {
    const small = buildAtaDeVitoria(input({ driver: driver({ reduction: 6 }) }), META)!;
    expect(small.sections.find((s) => s.id === "delta")!.body.join(" ")).toContain("pequeno");

    const moderate = buildAtaDeVitoria(input({ driver: driver({ reduction: 15 }) }), META)!;
    expect(moderate.sections.find((s) => s.id === "delta")!.body.join(" ")).toContain("moderado");

    const large = buildAtaDeVitoria(input({ driver: driver({ reduction: 25 }) }), META)!;
    expect(large.sections.find((s) => s.id === "delta")!.body.join(" ")).toContain("amplo");
  });

  test("nunca menciona antagonista fictício — só o rótulo real do driver", () => {
    const ata = buildAtaDeVitoria(input(), META)!;
    const allText = ata.sections.flatMap((s) => s.body).join(" ");
    expect(allText).not.toMatch(/antagonista|monstro|vilão/i);
  });

  test("aviso legal sempre presente e menciona k-anonimato", () => {
    const ata = buildAtaDeVitoria(input(), META)!;
    expect(ata.legalNotice).toContain("k-anonimato");
  });
});
