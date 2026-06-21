// Prova de que o Engine é setor-agnóstico (Engine ≠ Domínio): os MESMOS motores
// (calculateIVO, selectPulseItems) consomem frameworks distintos — Escolar (IEV),
// Governamental (IGV) e Comunitário (IVC) — sem nenhuma alteração de código.
// Se estes testes passam, a opcionalidade multissetorial com 4 segmentos está provada.

import { describe, expect, test } from "bun:test";
import { calculateIVO } from "./engine/index/ivo-engine";
import { selectPulseItems } from "./engine/index/pulse-engine";
import type { ProprietaryIndex } from "./engine/pack/pack-types";
import ievFramework from "./domain/packs/school/iev-framework.json";
import igvFramework from "./domain/packs/government/igv-framework.json";
import ivcFramework from "./domain/packs/condominium/ivc-framework.json";
import { SCHOOL_CYCLE } from "./mocks/school-mock";
import { GOVERNMENT_CYCLE } from "./mocks/government-mock";
import { CONDO_CYCLE } from "./mocks/condominium-mock";

const iev = ievFramework as unknown as ProprietaryIndex;
const igv = igvFramework as unknown as ProprietaryIndex;
const ivc = ivcFramework as unknown as ProprietaryIndex;

// ─── Escola (IEV) ─────────────────────────────────────────────────────────────

describe("multissetorial — calculateIVO no framework escolar (IEV)", () => {
  const result = calculateIVO(SCHOOL_CYCLE, iev);

  test("produz índice válido (0–1000) com o framework da escola", () => {
    expect(result.ivoScore).toBeGreaterThanOrEqual(0);
    expect(result.ivoScore).toBeLessThanOrEqual(1000);
  });

  test("lê a maturidade do framework (vocabulário escolar, não hardcoded)", () => {
    expect(result.maturityLevel.name).toContain("Escola");
  });

  test("4 lentes escolares com 16 pilares no total", () => {
    expect(result.lenses).toHaveLength(4);
    expect(result.lenses.flatMap((l) => l.pillars)).toHaveLength(16);
    expect(result.lenses.map((l) => l.lensId)).toEqual(["aluno", "turma", "educador", "escola"]);
  });

  test("k-anonimato: todos os pilares têm n≥5 → visíveis", () => {
    expect(result.lenses.flatMap((l) => l.pillars).every((p) => p.visible)).toBe(true);
  });

  test("o disclaimer vem do framework escolar", () => {
    expect(result.disclaimer).toContain("escolar");
  });
});

describe("multissetorial — pulse no framework escolar (IEV)", () => {
  test("seleciona itens dos pilares de menor score do framework escolar", () => {
    const result = calculateIVO(SCHOOL_CYCLE, iev);
    const scores = new Map(
      result.lenses.flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const items = selectPulseItems(iev, scores, 3);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.text.length > 0)).toBe(true);
    expect(items[0]!.pillarId.length).toBeGreaterThan(0);
  });
});

// ─── Governo (IGV) ────────────────────────────────────────────────────────────

describe("multissetorial — calculateIVO no framework governamental (IGV)", () => {
  const result = calculateIVO(GOVERNMENT_CYCLE, igv);

  test("produz índice válido (0–1000) com o framework governamental", () => {
    expect(result.ivoScore).toBeGreaterThanOrEqual(0);
    expect(result.ivoScore).toBeLessThanOrEqual(1000);
  });

  test("lê a maturidade do framework (vocabulário governamental, não hardcoded)", () => {
    expect(result.maturityLevel.name).toContain("Órgão");
  });

  test("4 lentes governamentais com 16 pilares no total", () => {
    expect(result.lenses).toHaveLength(4);
    expect(result.lenses.flatMap((l) => l.pillars)).toHaveLength(16);
    expect(result.lenses.map((l) => l.lensId)).toEqual([
      "servidor",
      "secao",
      "gestao_publica",
      "instituicao",
    ]);
  });

  test("k-anonimato: todos os pilares têm n≥5 → visíveis", () => {
    expect(result.lenses.flatMap((l) => l.pillars).every((p) => p.visible)).toBe(true);
  });

  test("o disclaimer vem do framework governamental", () => {
    expect(result.disclaimer).toContain("serviço público");
  });

  test("score IGV reflete perfil realista do serviço público (entre 300 e 650)", () => {
    expect(result.ivoScore).toBeGreaterThan(300);
    expect(result.ivoScore).toBeLessThan(650);
  });
});

describe("multissetorial — pulse no framework governamental (IGV)", () => {
  test("seleciona itens dos pilares de menor score do framework governamental", () => {
    const result = calculateIVO(GOVERNMENT_CYCLE, igv);
    const scores = new Map(
      result.lenses.flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const items = selectPulseItems(igv, scores, 3);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.text.length > 0)).toBe(true);
  });
});

// ─── Condomínio (IVC) ─────────────────────────────────────────────────────────

describe("multissetorial — calculateIVO no framework condominial (IVC)", () => {
  const result = calculateIVO(CONDO_CYCLE, ivc);

  test("produz índice válido (0–1000) com o framework condominial", () => {
    expect(result.ivoScore).toBeGreaterThanOrEqual(0);
    expect(result.ivoScore).toBeLessThanOrEqual(1000);
  });

  test("lê a maturidade do framework (vocabulário condominial, não hardcoded)", () => {
    expect(result.maturityLevel.name).toContain("Condomínio");
  });

  test("4 lentes condominiais com 16 pilares no total", () => {
    expect(result.lenses).toHaveLength(4);
    expect(result.lenses.flatMap((l) => l.pillars)).toHaveLength(16);
    expect(result.lenses.map((l) => l.lensId)).toEqual([
      "morador",
      "comunidade",
      "lideranca_cond",
      "condominio",
    ]);
  });

  test("k-anonimato: todos os pilares têm n≥5 → visíveis", () => {
    expect(result.lenses.flatMap((l) => l.pillars).every((p) => p.visible)).toBe(true);
  });

  test("o disclaimer vem do framework condominial", () => {
    expect(result.disclaimer).toContain("condominial");
  });

  test("score IVC reflete perfil realista de condomínio (entre 400 e 700)", () => {
    expect(result.ivoScore).toBeGreaterThan(400);
    expect(result.ivoScore).toBeLessThan(700);
  });
});

describe("multissetorial — pulse no framework condominial (IVC)", () => {
  test("seleciona itens dos pilares de menor score do framework condominial", () => {
    const result = calculateIVO(CONDO_CYCLE, ivc);
    const scores = new Map(
      result.lenses.flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const items = selectPulseItems(ivc, scores, 3);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.text.length > 0)).toBe(true);
  });
});
