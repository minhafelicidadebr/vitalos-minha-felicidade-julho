import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import unit from "./q3-vitality-unit-001.json";

describe("Q3 · unidade de Vitalidade 001 (candidata à revisão D10)", () => {
  test("estado editorial explícito: proposta, sem aprovação, sem evidência nem claim", () => {
    expect(unit.status).toBe("PROPOSTO");
    expect(unit.editorialState).toBe("candidato_a_revisao");
    expect(unit.curation.approval).toBeNull();
    expect(unit.evidenceCodes).toEqual([]);
    expect(unit.safeClaimIds).toEqual([]);
    expect(existsSync(join(import.meta.dir, "..", "..", "..", unit.curation.reviewRef))).toBe(true);
  });

  test("separa participação, execução e mudança percebida; prática com revisão", () => {
    expect(Object.keys(unit.activity.records).sort()).toEqual(["execution", "participation", "perceivedChange"]);
    expect(unit.activity.steps.length).toBeGreaterThanOrEqual(3);
    expect(unit.reviewCriteria.length).toBeGreaterThan(0);
  });

  test("checagens bem formadas e sem linguagem de efeito comprovado", () => {
    for (const c of unit.checks) expect(c.options.some((o) => o.id === c.correctOptionId)).toBe(true);
    expect(JSON.stringify(unit)).not.toMatch(/comprovad[oa] que|aumenta em \d|\d+ ?%/i);
  });

  test("nenhum código de produção usa a unidade enquanto proposta", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && readFileSync(path, "utf8").includes("q3-vitality-unit")) hits.push(path);
      }
    };
    walk(join(import.meta.dir, "..", ".."));
    expect(hits).toEqual([]);
  });
});
