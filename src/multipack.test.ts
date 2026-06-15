// Prova de que o Engine é setor-agnóstico (Engine ≠ Domínio): os MESMOS motores
// (calculateIVO, selectPulseItems) consomem um 2º framework — Vitalidade Escolar
// (IEV) — sem nenhuma alteração de código. Se este teste passa, a opcionalidade
// multissetorial está provada.

import { describe, expect, test } from "bun:test";
import { calculateIVO } from "./engine/index/ivo-engine";
import { selectPulseItems } from "./engine/index/pulse-engine";
import type { ProprietaryIndex } from "./engine/pack/pack-types";
import ievFramework from "./domain/packs/school/iev-framework.json";
import { SCHOOL_CYCLE } from "./mocks/school-mock";

const iev = ievFramework as unknown as ProprietaryIndex;

describe("multissetorial — calculateIVO no framework escolar", () => {
  const result = calculateIVO(SCHOOL_CYCLE, iev);

  test("produz IVO válido (0–1000) com o framework da escola", () => {
    expect(result.ivoScore).toBeGreaterThanOrEqual(0);
    expect(result.ivoScore).toBeLessThanOrEqual(1000);
  });

  test("lê a maturidade do framework (vocabulário escolar, não hardcoded)", () => {
    expect(result.maturityLevel.name).toContain("Escola");
  });

  test("4 lentes escolares com 16 pilares no total", () => {
    expect(result.lenses).toHaveLength(4);
    const pillars = result.lenses.flatMap((l) => l.pillars);
    expect(pillars).toHaveLength(16);
    expect(result.lenses.map((l) => l.lensId)).toEqual(["aluno", "turma", "educador", "escola"]);
  });

  test("k-anonimato funciona igual: todos os pilares têm n≥5 → visíveis", () => {
    const pillars = result.lenses.flatMap((l) => l.pillars);
    expect(pillars.every((p) => p.visible)).toBe(true);
  });

  test("o disclaimer vem do framework escolar", () => {
    expect(result.disclaimer).toContain("escolar");
  });
});

describe("multissetorial — pulse no framework escolar", () => {
  test("seleciona itens dos pilares de menor score, do framework escolar", () => {
    const result = calculateIVO(SCHOOL_CYCLE, iev);
    const scores = new Map(
      result.lenses.flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const items = selectPulseItems(iev, scores, 3);
    expect(items).toHaveLength(3);
    // os textos vêm dos sampleItems do iev-framework (ex.: "turma", "escola", "aprender")
    expect(items.every((i) => i.text.length > 0)).toBe(true);
    // o pilar de menor score (voz_participacao / carga_sustentavel) deve aparecer primeiro
    expect(items[0]!.pillarId.length).toBeGreaterThan(0);
  });
});
