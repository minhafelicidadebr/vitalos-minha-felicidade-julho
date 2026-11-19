import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FactorScoringError, scoreFactors, type FactorScoringRules } from "./q3-factor-scorer";

// Regras SINTÉTICAS de teste; as reais vêm só da ficha aprovada.
const rules: FactorScoringRules = {
  scale: { min: 0, max: 10 },
  aggregation: "mean",
  maxMissingPerFactor: 1,
  items: [
    { factorId: "f1", reverse: false },
    { factorId: "f1", reverse: true },
    { factorId: "f1", reverse: false },
    { factorId: "f2", reverse: false },
  ],
};

describe("cálculo por fator parametrizado pela ficha (não ligado)", () => {
  test("inversão, média por respondente e média do grupo", () => {
    // r1: f1 = (4 + (10-6) + 7)/3 = 5; r2: f1 = (8 + 10 + 9)/3 = 9 → média 7, n 2
    expect(scoreFactors([[4, 6, 7, 3], [8, 0, 9, 5]], rules)).toEqual({ f1: { mean: 7, n: 2 }, f2: { mean: 4, n: 2 } });
  });

  test("ausências até o limite da ficha agregam os presentes; acima, o respondente sai do fator", () => {
    expect(scoreFactors([[4, null, 8, 1]], rules)).toEqual({ f1: { mean: 6, n: 1 }, f2: { mean: 1, n: 1 } });
    expect(scoreFactors([[4, null, null, 1]], rules)).toEqual({ f2: { mean: 1, n: 1 } });
    expect(scoreFactors([[null, null, null, null]], rules)).toBeNull();
  });

  test("agregação por soma quando a ficha manda", () => {
    expect(scoreFactors([[1, 10, 2, 3]], { ...rules, aggregation: "sum" })).toEqual({ f1: { mean: 3, n: 1 }, f2: { mean: 3, n: 1 } });
  });

  test("resposta fora da escala, não inteira ou linha incompleta: recusa", () => {
    expect(() => scoreFactors([[11, 0, 0, 0]], rules)).toThrow(FactorScoringError);
    expect(() => scoreFactors([[1.5, 0, 0, 0]], rules)).toThrow(FactorScoringError);
    expect(() => scoreFactors([[1, 0, 0]], rules)).toThrow(/3 de 4/);
    expect(() => scoreFactors([[1, 0, 0, 0]], { ...rules, scale: { min: 5, max: 5 } })).toThrow(/escala/);
  });

  test("nenhum código de produção importa o motor antes da F3 aprovada", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.startsWith("q3-factor-scorer") && readFileSync(path, "utf8").includes("q3-factor-scorer")) hits.push(path);
      }
    };
    walk(join(import.meta.dir, "..", ".."));
    expect(hits).toEqual([]);
  });
});
