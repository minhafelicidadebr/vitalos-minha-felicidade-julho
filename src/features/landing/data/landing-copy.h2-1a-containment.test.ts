// Gate da Fatia H2.1A (contenção emergencial de claims públicos, aprovação
// controlada do founder em 2026-07-23) — prova que os achados P0/P1 da
// Matriz H2.1 v0.2 saíram da superfície pública. Não é o Commercial Claims
// Registry (fora de escopo desta fatia): é uma blacklist temporária e
// explícita, igual em espírito ao landing-copy.copsoq-truth.test.ts, mas
// cobrindo os termos específicos desta contenção.
//
// A Calculadora de Impacto (CALCULATOR/impact-calc.ts/ImpactCalculatorSection)
// foi preservada no repositório por decisão do founder — não deletada, só
// sem ponto de montagem público. Por isso o scan de conteúdo abaixo EXCLUI
// deliberadamente o export CALCULATOR (ele continua existindo, só não é
// mais alcançável por nenhuma rota pública — provado pelo teste estático
// desta mesma suíte, que lê o source de index.tsx diretamente).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as LandingCopy from "./landing-copy";

/** Extrai recursivamente todas as strings de um valor (mesmo padrão do landing-copy.copsoq-truth.test.ts). */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      collectStrings((value as Record<string, unknown>)[key], out);
    }
  }
  return out;
}

/** Todo texto de landing-copy.ts EXCETO CALCULATOR (preservado, não público). */
function collectPublicStrings(): string {
  const out: string[] = [];
  for (const key of Object.keys(LandingCopy)) {
    if (key === "CALCULATOR") continue;
    collectStrings((LandingCopy as unknown as Record<string, unknown>)[key], out);
  }
  return out.join(" \n ");
}

const FORBIDDEN_SUBSTRINGS = [
  "Oxford",
  "chancela",
  "Bateria COPSOQ II",
  "diagnóstico científico",
  "garantido por construção",
  "pagar por si mesma",
  "R$ 1.610",
  "R$ 6.708",
  "R$ 322 mil",
  "por trabalhador exposto",
  "benchmark OMS",
  "4:1",
  "Calculadora de Impacto Financeiro",
  "cuidar gera retorno",
  "projete o ROI",
  "retorno mensurável",
  "cada R$ 1 retorna R$ 4",
  "cada r$ 1 investido em bem-estar retorna",
  "sem dor",
  "conformidade sem dor",
  "compliance sem dor",
];

describe("H2.1A — ausência de claims contidos na superfície pública de landing-copy.ts", () => {
  const publicText = collectPublicStrings();

  for (const term of FORBIDDEN_SUBSTRINGS) {
    test(`texto público não contém "${term}"`, () => {
      expect(publicText.toLowerCase()).not.toContain(term.toLowerCase());
    });
  }

  test("sanity: o detector reconhece um termo proibido plantado deliberadamente", () => {
    const planted = publicText + " Bateria COPSOQ II aplicada.";
    expect(planted.toLowerCase()).toContain("bateria copsoq ii");
  });
});

describe("H2.1A — Calculadora de Impacto não tem ponto de montagem público", () => {
  const INDEX_ROUTE = join(import.meta.dir, "..", "..", "..", "routes", "index.tsx");

  test("src/routes/index.tsx não importa nem renderiza ImpactCalculatorSection", () => {
    const content = readFileSync(INDEX_ROUTE, "utf-8");
    expect(content).not.toContain("ImpactCalculatorSection");
    expect(content).not.toContain("impact-calc");
  });

  test("src/routes/index.tsx renderiza o bloco não computacional (EconomicBaselineSection) no lugar", () => {
    const content = readFileSync(INDEX_ROUTE, "utf-8");
    expect(content).toContain("EconomicBaselineSection");
  });

  test("CALCULATOR e impact-calc.ts continuam existindo no repositório (preservados, não deletados)", () => {
    expect(LandingCopy.CALCULATOR).toBeDefined();
    expect(LandingCopy.CALCULATOR.cardTitle).toBe("Calculadora de Impacto Financeiro");
  });
});

describe("H2.1A — Instituto: números institucionais sem fonte documental ficam ocultos", () => {
  test("InstituteSection.tsx não renderiza INSTITUTE.stats (sem evidência documental no repo)", () => {
    const componentPath = join(
      import.meta.dir,
      "..",
      "components",
      "InstituteSection.tsx",
    );
    const content = readFileSync(componentPath, "utf-8");
    expect(content).not.toContain("inst.stats");
    expect(content).not.toContain("Recorde Mundial");
  });
});
