import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ENTERPRISE_GUIDE as G } from "./enterprise-guide";
import { availabilityEntry } from "@/lib/guide/guide-entry";

const PERSPECTIVES = ["colaborador", "lideranca", "rh", "sst", "direcao", "plataforma"] as const;
const text = JSON.stringify(G);

describe("Guia · conteúdo (V2.1)", () => {
  test("AC-01: cada lente Q1–Q5 cobre os seis perfis, sem célula vazia", () => {
    expect(G.lenses.map((l) => l.lens)).toEqual(["Q1", "Q2", "Q3", "Q4", "Q5"]);
    for (const lens of G.lenses)
      for (const p of PERSPECTIVES) {
        const cell = lens.matrix[p];
        expect(cell, `${lens.lens}/${p}`).toBeDefined();
        for (const k of ["who", "receives", "condition"] as const) expect(cell[k].trim().length, `${lens.lens}/${p}/${k}`).toBeGreaterThan(0);
        if (cell.mode === "dependencia") expect(cell.condition).toMatch(/decid|confirmar|exige|depende|módulo|contrato/i);
      }
  });

  test("AC-01: toda capacidade citada existe no registro", () => {
    for (const lens of G.lenses) for (const p of PERSPECTIVES) {
      const c = lens.matrix[p].capability;
      if (c) expect(availabilityEntry(c), c).toBeDefined();
    }
    for (const i of G.opening.consult.items) if (i.capability) expect(availabilityEntry(i.capability)).toBeDefined();
  });

  test("AC-02: sem 'Compliance', sem datas de empresa, sem 'comprovado' para execução", () => {
    expect(text).not.toMatch(/compliance/i);
    expect(text).not.toMatch(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*[–-](jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i);
    expect(text).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
    expect(text).not.toMatch(/execução comprovada|eficácia comprovada|efeito comprovado/i);
  });

  test("AC-09: abertura com os três blocos, coleta em preparação e a redação de cobrança aprovada", () => {
    expect([G.opening.receives.title, G.opening.mobilizes.title, G.opening.consult.title]).toEqual(["Você recebe", "Sua empresa mobiliza", "Você poderá consultar"]);
    const coleta = G.opening.consult.items.find((i) => i.label.includes("Coleta oficial"))!;
    expect(coleta.fixed).toBe("Em preparação");
    expect(G.opening.billing).toBe("A contratação remunera os serviços previstos no plano. O questionário COPSOQ II-Br não tem cobrança separada.");
    expect(G.opening.disclaimer).toContain("não garante conformidade com a NR-1");
  });

  test("AC-10: limites por lente; SST sem tarefa no Q2; Q4 sem leitura coletiva", () => {
    for (const lens of G.lenses) expect(lens.guardrails.length).toBeGreaterThanOrEqual(2);
    const q2 = G.lenses.find((l) => l.lens === "Q2")!;
    expect(q2.matrix.sst.mode).toBe("acompanha");
    expect(q2.matrix.sst.condition).toMatch(/sem autoridade/i);
    const q4 = G.lenses.find((l) => l.lens === "Q4")!;
    expect(q4.guardrails.join(" ")).toMatch(/contrato próprio/);
    for (const p of ["rh", "lideranca", "direcao"] as const) expect(q4.matrix[p].receives).toMatch(/nenhum|nada/i);
  });

  test("Q5: extrato com os quatro tipos, rotulado como sintético; checagens com feedback para cada opção", () => {
    expect(G.q5Extract.rows.map((r) => r.kind)).toEqual(["Execução registrada", "Decisão documentada", "Mudança observada", "Efeito avaliado"]);
    expect(G.q5Extract.note).toMatch(/sintético/);
    for (const c of G.checks) {
      expect(c.options.some((o) => o.id === c.correctOptionId)).toBe(true);
      for (const o of c.options) expect(o.feedback.length).toBeGreaterThan(10);
    }
  });

  test("conteúdo só no servidor: nenhum módulo de cliente importa enterprise-guide", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !/\.server\.ts$/.test(name) && path !== join(import.meta.dir, "enterprise-guide.ts")) {
          if (/["']@\/domain\/guide\/enterprise-guide["']|from ["']\.\/enterprise-guide["']/.test(readFileSync(path, "utf8"))) hits.push(path);
        }
      }
    };
    walk(join(import.meta.dir, "..", ".."));
    expect(hits).toEqual([]);
  });
});
