// Consistência do dilema da Arena Socrática × registro de evidência congelado
// (padrão voz-segura-consistency): a fonte única é verificada por teste, não
// por fé. Cobre também as invariantes de conteúdo específicas do ADR
// (docs/learning/PLANO_ARENA_SOCRATICA_LD010_2026-07-21.md): assimetria
// honesta do Lado B, ausência de linguagem de vencedor/ranking, e "ambos os
// lados com mérito real" validado estruturalmente pelo próprio engine.

import { describe, expect, test } from "bun:test";
import { resolveStudy, trustGate, type EvidenceRegistry } from "@/engine/evidence/passport-engine";
import registryJson from "@/domain/evidence/evidence-registry.json";
import { validateDilemma } from "@/engine/learning/socratic-arena-engine";
import { AUTONOMIA_OU_DIRECAO_DILEMMA, SOCRATIC_ARENA_DILEMMAS } from "./socratic-arena-mock";

const REGISTRY = registryJson as unknown as EvidenceRegistry;

const DILEMMA = AUTONOMIA_OU_DIRECAO_DILEMMA;

function sourceStudyIds(): string[] {
  return DILEMMA.cards.map((c) => c.sourceStudyId).filter((id): id is string => Boolean(id));
}

describe("Arena Socrática × registro de evidência", () => {
  test("o dilema passa na validação estrutural do próprio engine (0 erros)", () => {
    expect(validateDilemma(DILEMMA)).toEqual([]);
  });

  test("todo sourceStudyId citado existe no registro congelado e passa no trust gate", () => {
    const failures: string[] = [];
    for (const id of new Set(sourceStudyIds())) {
      const study = resolveStudy(REGISTRY, id);
      if (!study) {
        failures.push(`${id}: não existe no registro`);
        continue;
      }
      const gate = trustGate(study);
      if (!gate.trusted) failures.push(`${id}: ${gate.reasons.join("; ")}`);
    }
    expect(failures).toEqual([]);
  });

  test("só as fontes autorizadas pelo ADR são usadas (ACH-001, ACH-002, MGT-005, OPD-001, OPD-002)", () => {
    expect([...new Set(sourceStudyIds())].sort()).toEqual([
      "ACH-001",
      "ACH-002",
      "MGT-005",
      "OPD-001",
      "OPD-002",
    ]);
  });

  test("todo estudo citado pertence a Achievement, Management ou Operational Design (nenhum reaproveita Voz Segura)", () => {
    const allowedDrivers = new Set(["Achievement", "Management", "Operational Design"]);
    for (const id of new Set(sourceStudyIds())) {
      const study = resolveStudy(REGISTRY, id)!;
      expect(allowedDrivers.has(study.origin_driver)).toBe(true);
    }
    // Reforço explícito: nenhuma carta usa as fontes de Voz Segura.
    expect(sourceStudyIds()).not.toContain("TRU-006");
    expect(sourceStudyIds()).not.toContain("LDR-007");
  });

  test("honestidade da assimetria: NENHUMA carta do Lado B cita sourceStudyId", () => {
    const sideBWithSource = DILEMMA.cards.filter((c) => c.side === "B" && c.sourceStudyId);
    expect(sideBWithSource).toEqual([]);
  });

  test("toda carta de evidência empírica/síntese teórica cita o safe_claim como base (nunca mais forte)", () => {
    for (const card of DILEMMA.cards) {
      if (card.basis === "valor_operacional") continue;
      const study = resolveStudy(REGISTRY, card.sourceStudyId!)!;
      // Sinaliza overclaim óbvio: a carta não pode afirmar causalidade/garantia
      // que o safe_claim do estudo não afirma.
      expect(card.text).not.toMatch(/garante|prova que|sempre (vai|vão|funciona)|causa diretamente/i);
      expect(study.safe_claim.length).toBeGreaterThan(0);
    }
  });

  test("cartas de síntese/modelo teórico (OPD-001/OPD-002) nunca AFIRMAM ser intervenção testada", () => {
    const theoretical = DILEMMA.cards.filter((c) => c.basis === "sintese_teorica");
    expect(theoretical.length).toBeGreaterThan(0);
    for (const card of theoretical) {
      expect(card.text).toMatch(/teóric|conceitual|lente|modelo/i);
      // Mira o overclaim afirmativo — não a negação honesta ("não é... uma
      // intervenção já testada", que é exatamente o texto real e correto).
      expect(card.text).not.toMatch(/provado (experimentalmente|empiricamente)|ensaio control(ado)?|estudo controlado mostrou/i);
    }
  });

  test("ambos os lados têm cartas (mérito real) e nenhum lado é maior que o dobro do outro", () => {
    const sideA = DILEMMA.cards.filter((c) => c.side === "A").length;
    const sideB = DILEMMA.cards.filter((c) => c.side === "B").length;
    expect(sideA).toBeGreaterThan(0);
    expect(sideB).toBeGreaterThan(0);
    expect(Math.max(sideA, sideB)).toBeLessThanOrEqual(Math.min(sideA, sideB) * 2);
  });

  test("nenhuma carta ou a síntese de fechamento AFIRMA vencedor/lado correto", () => {
    const allText = [
      DILEMMA.framing,
      ...DILEMMA.cards.map((c) => c.text),
      DILEMMA.closingSynthesis,
    ].join(" ");
    // Mira a DECLARAÇÃO afirmativa de vencedor — não a negação honesta
    // ("não escolher um vencedor", "não existe resposta certa", "não é...
    // qual lado venceu"), que é exatamente o texto real e correto.
    expect(allText).not.toMatch(
      /\b(lado a|lado b|autonomia participativa|direção centralizada) (venceu|ganhou|é o (lado )?(certo|correto))\b/i,
    );
    expect(allText).not.toMatch(/a resposta certa é o lado/i);
  });

  test("síntese de fechamento é trade-off honesto — cita explicitamente que depende do contexto", () => {
    expect(DILEMMA.closingSynthesis).toMatch(/context/i);
    expect(DILEMMA.closingSynthesis.length).toBeGreaterThan(80);
  });

  test("enquadramento (framing) contém as regras de civilidade exigidas pelo registro (LD-010)", () => {
    expect(DILEMMA.framing).toMatch(/ideias, não/i);
    expect(DILEMMA.framing).toMatch(/privad/i);
  });

  test("biblioteca de dilemas expõe o dilema aprovado", () => {
    expect(SOCRATIC_ARENA_DILEMMAS).toHaveLength(1);
    expect(SOCRATIC_ARENA_DILEMMAS[0].id).toBe("arena-autonomia-ou-direcao");
  });
});
