import { describe, expect, test } from "bun:test";
import { recommendPaths, type RankablePath } from "./academia-engine";

const PATHS: RankablePath[] = [
  { id: "lp-a", pillarName: "Energia & Vitalidade", roles: ["COLABORADOR", "RH_ADMIN"] },
  { id: "lp-b", pillarName: "Propósito & Significado", roles: ["COLABORADOR"] },
  { id: "lp-c", pillarName: "Justiça & Coerência", roles: ["RH_ADMIN"] }, // outro papel
];

describe("academia — recomendação dirigida pelo dado", () => {
  test("trilha que endereça um pilar fraco vira prioritária e vem primeiro", () => {
    const r = recommendPaths(PATHS, {
      lowestPillarNames: ["Energia & Vitalidade"],
      roleId: "COLABORADOR",
    });
    expect(r[0]!.path.id).toBe("lp-a");
    expect(r[0]!.relevance).toBe("prioritaria");
    expect(r[0]!.matchedPillar).toBe("Energia & Vitalidade");
  });

  test("filtra pelas trilhas visíveis ao papel", () => {
    const r = recommendPaths(PATHS, { lowestPillarNames: [], roleId: "COLABORADOR" });
    expect(r.map((x) => x.path.id).sort()).toEqual(["lp-a", "lp-b"]); // lp-c é só RH
  });

  test("sem pilar fraco correspondente → recomendada (não fabrica prioridade)", () => {
    const r = recommendPaths(PATHS, {
      lowestPillarNames: ["Inexistente"],
      roleId: "COLABORADOR",
    });
    expect(r.every((x) => x.relevance === "recomendada")).toBe(true);
  });

  test("o casamento de pilar é case-insensitive", () => {
    const r = recommendPaths(PATHS, {
      lowestPillarNames: ["energia & vitalidade"],
      roleId: "RH_ADMIN",
    });
    expect(r.find((x) => x.path.id === "lp-a")?.relevance).toBe("prioritaria");
  });
});
