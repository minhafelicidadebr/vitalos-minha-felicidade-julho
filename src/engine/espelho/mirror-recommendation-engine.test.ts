import { describe, expect, test } from "bun:test";
import type { MissionDef } from "../gamification/gamification-engine";
import type { RankablePath } from "../academia/academia-engine";
import type { PersonalAssessmentResult } from "./personal-assessment-engine";
import { buildMirrorCompass, lowestFactors } from "./mirror-recommendation-engine";

function personal(scores: Array<[string, number | null, string[]]>): PersonalAssessmentResult {
  return {
    factors: scores.map(([id, score, pillarIds]) => ({
      id,
      name: id,
      score,
      bandId: null,
      bandLabel: null,
      answered: score === null ? 0 : 3,
      total: 3,
      pillarIds,
    })),
    global: 3,
    globalBandId: null,
    globalBandLabel: null,
    completeness: 100,
    takenAt: "2026-07-04",
  };
}

const PATHS: RankablePath[] = [
  { id: "trilha-energia", roles: ["COLABORADOR"], targetPillarIds: ["energia"], targetStrengthIds: [] },
  { id: "trilha-proposito", roles: ["COLABORADOR"], targetPillarIds: ["proposito"], targetStrengthIds: [] },
  { id: "trilha-curiosidade", roles: ["COLABORADOR"], targetPillarIds: [], targetStrengthIds: ["curiosidade"] },
  { id: "trilha-lider", roles: ["LIDER_EQUIPE"], targetPillarIds: ["energia"], targetStrengthIds: [] },
  { id: "trilha-geral", roles: ["COLABORADOR"], targetPillarIds: ["outro"], targetStrengthIds: [] },
];

const MISSIONS: MissionDef[] = [
  { id: "m-energia", type: "micro", scope: "individual", pillarId: "energia", title: "Pausa real", evidence: "none" },
  { id: "m-coletivo", type: "micro", scope: "individual", pillarId: "coletivo_x", title: "Kudo", evidence: "none" },
];

const LABELS = { energia: "Energia & Vitalidade", proposito: "Propósito", coletivo_x: "Coletivo X" };

const BASE = {
  affinityStrengths: [],
  collectivePriority: [],
  paths: PATHS,
  missions: MISSIONS,
  roleId: "COLABORADOR",
  pillarLabels: LABELS,
};

describe("lowestFactors — a necessidade pessoal vem dos fatores mais baixos COM dados", () => {
  test("ordena pelo menor score e respeita o count", () => {
    const p = personal([["f1", 4.5, ["a"]], ["f2", 2.1, ["b"]], ["f3", 3.0, ["c"]]]);
    expect(lowestFactors(p, 2).map((f) => f.id)).toEqual(["f2", "f3"]);
  });

  test("fator sem dados (null) NUNCA vira necessidade — sem dado não há diagnóstico", () => {
    const p = personal([["f1", null, ["a"]], ["f2", 4, ["b"]]]);
    expect(lowestFactors(p, 2).map((f) => f.id)).toEqual(["f2"]);
  });

  test("sem autoavaliação → lista vazia", () => {
    expect(lowestFactors(null, 2)).toEqual([]);
  });
});

describe("buildMirrorCompass — composição pessoal × coletivo × afinidade", () => {
  test("pilares pessoais derivam dos fatores baixos, com rótulo do pack e sem duplicata", () => {
    const p = personal([["f1", 2, ["energia", "proposito"]], ["f2", 2.5, ["energia"]], ["f3", 5, ["outro"]]]);
    const compass = buildMirrorCompass({ ...BASE, personal: p });
    expect(compass.personalPriorityPillars).toEqual([
      { id: "energia", label: "Energia & Vitalidade" },
      { id: "proposito", label: "Propósito" },
    ]);
  });

  test("trilha que endereça a necessidade PESSOAL sai como prioritária, limitada a maxPaths", () => {
    const p = personal([["f1", 1.5, ["energia"]], ["f2", 4.8, ["outro"]]]);
    const compass = buildMirrorCompass({ ...BASE, personal: p, maxPaths: 2 });
    expect(compass.recommendations).toHaveLength(2);
    expect(compass.recommendations[0]!.path.id).toBe("trilha-energia");
    expect(compass.recommendations[0]!.relevance).toBe("prioritaria");
  });

  test("prioridade coletiva soma SEM sobrescrever a pessoal (pessoal vem primeiro)", () => {
    const p = personal([["f1", 2, ["energia"]], ["f2", 5, ["x"]]]);
    const compass = buildMirrorCompass({
      ...BASE,
      personal: p,
      collectivePriority: [
        { id: "energia", label: "duplicada — não deve dobrar" },
        { id: "proposito", label: "Propósito (coletivo)" },
      ],
    });
    const ids = compass.recommendations.map((r) => r.path.id);
    expect(ids).toContain("trilha-energia");
    expect(ids).toContain("trilha-proposito");
  });

  test("afinidade VIA-T ranqueia quando não há match de pilar (régua 100×20 herdada)", () => {
    const compass = buildMirrorCompass({
      ...BASE,
      personal: personal([["f1", 4, ["sem_trilha"]]]),
      affinityStrengths: [{ id: "curiosidade", label: "Curiosidade" }],
    });
    expect(compass.recommendations[0]!.path.id).toBe("trilha-curiosidade");
    expect(compass.recommendations[0]!.relevance).toBe("afinidade");
  });

  test("papel é respeitado — trilha de líder nunca aparece para colaborador", () => {
    const p = personal([["f1", 1, ["energia"]]]);
    const compass = buildMirrorCompass({ ...BASE, personal: p });
    expect(compass.recommendations.some((r) => r.path.id === "trilha-lider")).toBe(false);
  });

  test("micro-missão do pilar pessoal primeiro; fallback para o coletivo; null sem match", () => {
    const pessoal = buildMirrorCompass({ ...BASE, personal: personal([["f1", 1, ["energia"]]]) });
    expect(pessoal.microMission?.id).toBe("m-energia");

    const coletivo = buildMirrorCompass({
      ...BASE,
      personal: personal([["f1", 1, ["sem_missao"]]]),
      collectivePriority: [{ id: "coletivo_x", label: "X" }],
    });
    expect(coletivo.microMission?.id).toBe("m-coletivo");

    const nenhum = buildMirrorCompass({ ...BASE, personal: personal([["f1", 1, ["nada"]]]) });
    expect(nenhum.microMission).toBeNull();
  });

  test("sem autoavaliação: a Bússola vira coletiva-apenas, sem quebrar", () => {
    const compass = buildMirrorCompass({
      ...BASE,
      personal: null,
      collectivePriority: [{ id: "proposito", label: "Propósito" }],
    });
    expect(compass.personalPriorityPillars).toEqual([]);
    expect(compass.recommendations[0]!.path.id).toBe("trilha-proposito");
  });

  test("determinístico", () => {
    const p = personal([["f1", 2, ["energia"]]]);
    expect(buildMirrorCompass({ ...BASE, personal: p })).toEqual(
      buildMirrorCompass({ ...BASE, personal: p }),
    );
  });
});
