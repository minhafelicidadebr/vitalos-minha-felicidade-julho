import { describe, expect, test } from "bun:test";
import { buildCycleProof } from "./cycle-proof.server";
import { buildBoardBrief } from "./board-brief.server";

// Prova da tese do unicórnio: o arco de evidência (Prova de Ciclo → Board Brief) é
// SETOR-AGNÓSTICO. Os mesmos engines produzem provas DISTINTAS para enterprise e
// health, lendo o dado setorial — sem hardcoding de um setor. Se alguém acoplar o
// arco ao enterprise, isto falha.

describe("arco de evidência — setor-agnóstico (enterprise vs health)", () => {
  const ent = buildCycleProof("enterprise");
  const hea = buildCycleProof("health");

  test("ambos os setores produzem prova longitudinal real (2 ciclos)", () => {
    expect(ent.cycleCount).toBe(2);
    expect(hea.cycleCount).toBe(2);
    expect(ent.verdict).not.toBe("sem_dados");
    expect(hea.verdict).not.toBe("sem_dados");
  });

  test("as provas são DISTINTAS — leem o dado de cada setor, não um fixo", () => {
    // Rótulos de ciclo diferentes (jan vs fev) e reduções atribuíveis diferentes.
    expect(ent.cycleLabels).not.toEqual(hea.cycleLabels);
    expect(ent.attributableReductionPts).not.toBe(hea.attributableReductionPts);
  });

  test("health: o apoio emocional (dimensão que caiu forte) tem efeito atribuível", () => {
    const emo = hea.interventions.find((e) => e.targetDimensionId === "demands_emotional");
    expect(emo).toBeDefined();
    expect(emo!.measured).toBe(true);
    expect((emo!.netEffect ?? 0) > 0).toBe(true);
  });

  test("health: a escala (ritmo que persistiu) NÃO tem efeito — honesto por setor", () => {
    const ritmo = hea.interventions.find((e) => e.targetDimensionId === "work_pace");
    expect(ritmo).toBeDefined();
    expect((ritmo!.netEffect ?? 0) <= 0).toBe(true);
  });

  test("o ROI de prevenção difere entre setores (coortes e reduções distintas)", () => {
    expect(ent.preventionRoi).not.toBeNull();
    expect(hea.preventionRoi).not.toBeNull();
    expect(ent.preventionRoi!.avoidedCostYear).not.toBe(hea.preventionRoi!.avoidedCostYear);
  });

  test("o Board Brief de cada setor reflete sua própria evidência", () => {
    const entBrief = buildBoardBrief("enterprise");
    const heaBrief = buildBoardBrief("health");
    // Ambos com céticos satisfeitos pela evidência, mas headlines distintas.
    expect(entBrief.skeptics.find((s) => s.id === "auditor")!.satisfied).toBe(true);
    expect(heaBrief.skeptics.find((s) => s.id === "auditor")!.satisfied).toBe(true);
    expect(entBrief.skeptics.find((s) => s.id === "cfo")!.metric).not.toBe(
      heaBrief.skeptics.find((s) => s.id === "cfo")!.metric,
    );
  });

  test("setor sem histórico (government) segue honesto: sem_dados", () => {
    const gov = buildCycleProof("government");
    expect(gov.verdict).toBe("sem_dados");
    expect(gov.preventionRoi).toBeNull();
  });
});
