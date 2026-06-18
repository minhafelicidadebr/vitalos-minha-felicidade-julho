import { describe, expect, test } from "bun:test";
import {
  getRoleLearningTargets,
  recommendPaths,
  type LearningSignal,
  type RankablePath,
} from "./academia-engine";

const PATHS: RankablePath[] = [
  {
    id: "energia",
    roles: ["COLABORADOR", "RH_ADMIN"],
    targetPillarIds: ["energia_vitalidade"],
    targetStrengthIds: ["autorregulacao", "esperanca"],
  },
  {
    id: "aprendizagem",
    roles: ["COLABORADOR"],
    targetPillarIds: ["crescimento_maestria"],
    targetStrengthIds: ["curiosidade", "amor_aprendizado"],
  },
  {
    id: "justica",
    roles: ["RH_ADMIN"],
    targetPillarIds: ["justica_coerencia"],
  },
];

const PILLARS: LearningSignal[] = [{ id: "energia_vitalidade", label: "Energia & Vitalidade" }];
const STRENGTHS: LearningSignal[] = [
  { id: "curiosidade", label: "Curiosidade" },
  { id: "amor_aprendizado", label: "Amor ao aprendizado" },
];

describe("academia — curadoria explicável por necessidade e afinidade", () => {
  test("necessidade coletiva torna a trilha prioritária e vence afinidade pessoal", () => {
    const result = recommendPaths(PATHS, {
      priorityPillars: PILLARS,
      affinityStrengths: STRENGTHS,
      roleId: "COLABORADOR",
    });

    expect(result.map((item) => item.path.id)).toEqual(["energia", "aprendizagem"]);
    expect(result[0]!.relevance).toBe("prioritaria");
    expect(result[0]!.matchedPillars[0]?.label).toBe("Energia & Vitalidade");
    expect(result[1]!.relevance).toBe("afinidade");
    expect(result[1]!.matchedStrengths).toHaveLength(2);
  });

  test("trilha pode combinar prioridade coletiva e afinidade sem perder a precedência", () => {
    const result = recommendPaths(PATHS, {
      priorityPillars: PILLARS,
      affinityStrengths: [{ id: "esperanca", label: "Esperança" }],
      roleId: "COLABORADOR",
    });

    expect(result[0]!.path.id).toBe("energia");
    expect(result[0]!.relevance).toBe("prioritaria");
    expect(result[0]!.matchedPillars).toHaveLength(1);
    expect(result[0]!.matchedStrengths).toHaveLength(1);
  });

  test("filtra rigorosamente pelo papel", () => {
    const result = recommendPaths(PATHS, {
      priorityPillars: [],
      roleId: "COLABORADOR",
    });

    expect(result.map((item) => item.path.id)).toEqual(["energia", "aprendizagem"]);
  });

  test("expõe somente alvos de aprendizagem autorizados ao papel", () => {
    expect(getRoleLearningTargets(PATHS, "COLABORADOR")).toEqual({
      pillarIds: ["energia_vitalidade", "crescimento_maestria"],
      strengthIds: ["autorregulacao", "esperanca", "curiosidade", "amor_aprendizado"],
    });
    expect(getRoleLearningTargets(PATHS, "RH_ADMIN")).toEqual({
      pillarIds: ["energia_vitalidade", "justica_coerencia"],
      strengthIds: ["autorregulacao", "esperanca"],
    });
  });

  test("sem sinal correspondente mantém recomendação honesta e ordem do catálogo", () => {
    const result = recommendPaths(PATHS, {
      priorityPillars: [{ id: "inexistente", label: "Inexistente" }],
      affinityStrengths: [{ id: "outra", label: "Outra" }],
      roleId: "COLABORADOR",
    });

    expect(result.map((item) => item.path.id)).toEqual(["energia", "aprendizagem"]);
    expect(result.every((item) => item.relevance === "recomendada")).toBe(true);
    expect(result.every((item) => item.relevanceWeight === 0)).toBe(true);
  });

  test("casamento de ids tolera caixa e espaços sem depender de labels", () => {
    const result = recommendPaths(PATHS, {
      priorityPillars: [{ id: " ENERGIA_VITALIDADE ", label: "Energia" }],
      roleId: "RH_ADMIN",
    });

    expect(result[0]!.path.id).toBe("energia");
    expect(result[0]!.relevance).toBe("prioritaria");
  });
});
