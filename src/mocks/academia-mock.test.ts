import { describe, expect, test } from "bun:test";
import enterprisePack from "@/domain/packs/enterprise/enterprise.pack.json";
import schoolIndex from "@/domain/packs/school/iev-framework.json";
import { getRoleLearningTargets } from "@/engine/academia/academia-engine";
import { calculateIVO } from "@/engine/index/ivo-engine";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";
import { getSectorData } from "./sector-data";
import { getLearningPaths } from "./academia-mock";

describe("academia-mock — catálogo por pack", () => {
  test("empresa e escola possuem catálogos próprios sem vazamento de vocabulário", () => {
    const enterprise = getLearningPaths("enterprise");
    const school = getLearningPaths("school");

    expect(enterprise.length).toBeGreaterThanOrEqual(5);
    expect(school.length).toBeGreaterThanOrEqual(6);
    expect(enterprise.every((path) => path.packIds.includes("enterprise"))).toBe(true);
    expect(school.every((path) => path.packIds.includes("school"))).toBe(true);
  });

  test("Estudante, Educador e Família têm ao menos uma trilha honesta", () => {
    const paths = getLearningPaths("school");

    for (const role of ["ESTUDANTE", "EDUCADOR", "FAMILIA"]) {
      expect(paths.some((path) => path.roles.includes(role))).toBe(true);
    }
  });

  test("toda trilha declara alvos de pilar e módulos demonstráveis", () => {
    for (const packId of ["enterprise", "school"]) {
      for (const path of getLearningPaths(packId)) {
        expect(path.targetPillarIds.length).toBeGreaterThan(0);
        expect(path.modules.length).toBeGreaterThan(0);
        expect(path.learnPoints).toBeGreaterThan(0);
      }
    }
  });

  test("instrumento de forças só orienta afinidade no catálogo empresarial", () => {
    expect(
      getLearningPaths("enterprise").some((path) => (path.targetStrengthIds?.length ?? 0) > 0),
    ).toBe(true);
    expect(
      getLearningPaths("school").every((path) => (path.targetStrengthIds?.length ?? 0) === 0),
    ).toBe(true);
  });

  test("curadoria do Estudante não expõe fragilidades docentes como prioridade", () => {
    const paths = getLearningPaths("school");
    const targets = getRoleLearningTargets(paths, "ESTUDANTE");
    const eligible = new Set(targets.pillarIds);
    const priorities = calculateIVO(
      getSectorData("school").currentCycle,
      schoolIndex as unknown as ProprietaryIndex,
    )
      .lenses.flatMap((lens) => lens.pillars)
      .filter((pillar) => pillar.visible && eligible.has(pillar.pillarId))
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map((pillar) => pillar.pillarId);

    expect(priorities).toContain("voz_participacao");
    expect(priorities).not.toContain("carga_sustentavel");
    expect(priorities).not.toContain("suporte_pedagogico");
  });

  test("sinal de violência não entra na economia de pontos da Academia", () => {
    const allTargets = getLearningPaths("school").flatMap((path) => path.targetPillarIds);
    expect(allTargets).not.toContain("ambiente_seguro");
  });

  test("Academia empresarial não mistura papéis exclusivos do Domínio B", () => {
    const academyNav = enterprisePack.navigation.find((item) => item.id === "academy");
    expect(Array.isArray(academyNav?.roles)).toBe(true);
    expect(academyNav?.roles).not.toContain("SST_PROFISSIONAL");
    expect(academyNav?.roles).not.toContain("CIPA_MEMBRO");
    expect(
      getLearningPaths("enterprise").every((path) => !path.roles.includes("CIPA_MEMBRO")),
    ).toBe(true);
  });
});
