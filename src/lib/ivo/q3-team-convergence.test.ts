import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ConvergenceInputError, correlate, testConvergent, testDiscriminant, type ConvergenceCriteria, type TeamAggregate } from "./q3-team-convergence";

// Dados SINTÉTICOS; critérios de teste, não os do plano (ainda "a definir").
const crit: ConvergenceCriteria = { minTeams: 4, threshold: 0.5, method: "spearman" };
const team = (id: string, permaMean: number, ivoMean: number, n = 6): TeamAggregate => ({ teamId: id, permaMean, permaN: n, ivoMean, ivoN: n });
const rising = [team("a", 1, 10), team("b", 2, 20), team("c", 3, 30), team("d", 4, 40)];

describe("convergência Q3 × IVO por equipe (não ligada)", () => {
  test("correlação conhecida: Pearson e Spearman com empates", () => {
    expect(correlate([1, 2, 3], [2, 4, 6], "pearson")).toBeCloseTo(1, 12);
    expect(correlate([1, 2, 3], [3, 2, 1], "spearman")).toBeCloseTo(-1, 12);
    expect(correlate([1, 2, 2, 3], [1, 2, 3, 4], "spearman")).toBeCloseTo(0.9486832980505138, 12);
    expect(correlate([1, 1, 1], [1, 2, 3], "pearson")).toBeNull();
  });

  test("sustenta com r ≥ limiar; não sustenta abaixo", () => {
    expect(testConvergent(rising, crit)).toEqual({ verdict: "supports", teams: 4, r: 1 });
    const flat = [team("a", 1, 40), team("b", 2, 10), team("c", 3, 30), team("d", 4, 20)];
    expect(testConvergent(flat, crit).verdict).toBe("does_not_support");
  });

  test("equipe com menos de 5 respondentes em qualquer instrumento fica de fora", () => {
    const small = [...rising.slice(0, 3), { ...rising[3]!, ivoN: 4 }];
    expect(testConvergent(small, crit)).toEqual({ verdict: "insufficient", teams: 3, reason: "few_teams" });
  });

  test("sem variação: insuficiente, não decide", () => {
    expect(testConvergent(rising.map((t) => ({ ...t, ivoMean: 5 })), crit)).toEqual({ verdict: "insufficient", teams: 4, reason: "no_variance" });
  });

  test("discriminante: |r| menor que o convergente sustenta; só decide se o convergente decidiu", () => {
    const conv = testConvergent(rising, crit);
    const weak = [team("a", 1, 30), team("b", 2, 10), team("c", 3, 40), team("d", 4, 20)];
    expect(testDiscriminant(conv, weak, crit).verdict).toBe("supports");
    expect(testDiscriminant(conv, rising, crit).verdict).toBe("does_not_support");
    expect(testDiscriminant({ verdict: "insufficient", teams: 2, reason: "few_teams" }, weak, crit).verdict).toBe("insufficient");
  });

  test("critérios e entradas inválidos são recusados", () => {
    expect(() => testConvergent(rising, { ...crit, minTeams: 2 })).toThrow(ConvergenceInputError);
    expect(() => testConvergent(rising, { ...crit, threshold: 1 })).toThrow(ConvergenceInputError);
    expect(() => testConvergent([...rising, rising[0]!], crit)).toThrow(/duplicada/);
    expect(() => testConvergent([team("x", Number.NaN, 1), ...rising], crit)).toThrow(/não finito/);
  });

  test("o resultado não carrega dados de equipe", () => {
    expect(Object.keys(testConvergent(rising, crit)).sort()).toEqual(["r", "teams", "verdict"]);
  });

  test("nenhum código de produção importa o módulo antes da F5", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.startsWith("q3-team-convergence") && readFileSync(path, "utf8").includes("q3-team-convergence")) hits.push(path);
      }
    };
    walk(join(import.meta.dir, "..", ".."));
    // Único importador permitido: o modelo de visão da demonstração sintética (mock-first).
    expect(hits.map((h) => h.split(/[\\/]/).pop())).toEqual(["q3-demo-view.ts"]);
  });
});
