// Consistência do Intervention Pattern Registry × contrato do motor de
// Co-design (LD-009, Fatia B). A fonte única é verificada por teste, não por
// fé: se o JSON perder um padrão, mudar os campos obrigatórios ou a regra
// clínica do projeto_lideranca, o gate quebra aqui — nunca silenciosamente na
// tela. Também prova a integração loader → motor (validateDraft consome os
// dados reais do registry).

import { describe, expect, test } from "bun:test";
import {
  INTERVENTION_PATTERNS,
  getAdverseEffectsWatchlist,
  getInterventionPatternById,
  getInterventionPatterns,
  getPlan90dPhases,
  getRequiredFieldKeys,
} from "./intervention-patterns";
import {
  buildTraceableExport,
  setDeadline,
  setField,
  setIndicator,
  setMeasureTarget,
  setOwnerRole,
  setScope,
  startDraft,
  toggleAdverseEffect,
  validateDraft,
  type CodesignDraft,
} from "@/engine/learning/codesign-studio-engine";

describe("intervention-patterns registry — integridade estrutural", () => {
  test("identidade e versão presentes", () => {
    expect(INTERVENTION_PATTERNS.registry).toBe("Intervention Patterns VitalOS");
    expect(INTERVENTION_PATTERNS.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("os 4 padrões canônicos existem com ids únicos", () => {
    const ids = getInterventionPatterns().map((p) => p.pattern_id);
    expect(ids).toEqual([
      "projeto_equipe",
      "projeto_lideranca",
      "projeto_organizacional",
      "experimento_cultural",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("todo padrão tem nome, escopo e supervisão não-vazios", () => {
    for (const p of getInterventionPatterns()) {
      expect(p.name.trim().length).toBeGreaterThan(0);
      expect(p.scope.trim().length).toBeGreaterThan(0);
      expect(p.supervision.trim().length).toBeGreaterThan(0);
    }
  });

  test("projeto_lideranca mantém a regra anti-clínica (nunca vira profissional clínico)", () => {
    const lideranca = getInterventionPatternById("projeto_lideranca");
    expect(lideranca).not.toBeNull();
    expect(lideranca!.rule).toMatch(/nunca transforma o líder em profissional clínico/i);
  });

  test("os 6 campos obrigatórios são exatamente os do contrato", () => {
    expect([...getRequiredFieldKeys()].sort()).toEqual(
      [
        "adverse_effects_monitored",
        "eligible_context",
        "hypothesis",
        "outcome_metrics",
        "process_metrics",
        "stop_rule",
      ].sort(),
    );
  });

  test("a watchlist de efeitos adversos não é vazia e inclui a captura sistêmica→indivíduo", () => {
    const watchlist = getAdverseEffectsWatchlist();
    expect(watchlist.length).toBeGreaterThanOrEqual(1);
    expect(watchlist).toContain("transferência de responsabilidade sistêmica para o indivíduo");
  });

  test("o plano 90d default tem 4 fases, cada uma com dias e foco", () => {
    const phases = getPlan90dPhases();
    expect(phases.length).toBe(4);
    for (const ph of phases) {
      expect(ph.days.trim().length).toBeGreaterThan(0);
      expect(ph.focus.trim().length).toBeGreaterThan(0);
    }
  });

  test("padrão inexistente devolve null (nunca lança)", () => {
    expect(getInterventionPatternById("nao-existe")).toBeNull();
  });
});

describe("integração loader → motor de Co-design", () => {
  function draftFor(patternId: string): CodesignDraft {
    let d = startDraft(patternId);
    d = setScope(d, "equipe");
    d = setMeasureTarget(d, "processo");
    for (const key of getRequiredFieldKeys()) d = setField(d, key, `valor de ${key}`);
    d = setIndicator(d, { label: "Métrica", baseline: "10", target: "6", unit: "un" });
    d = setOwnerRole(d, "LIDER_EQUIPE");
    d = setDeadline(d, "2026-09-30");
    d = toggleAdverseEffect(d, getAdverseEffectsWatchlist()[0]);
    return d;
  }

  test("um rascunho preenchido com os campos REAIS do registry valida limpo", () => {
    const v = validateDraft(draftFor("projeto_equipe"), getRequiredFieldKeys(), getAdverseEffectsWatchlist());
    expect(v.valid).toBe(true);
  });

  test("o guardrail organizacional dispara mesmo com os dados reais do registry", () => {
    let d = draftFor("projeto_organizacional");
    d = setScope(d, "organizacional");
    d = setMeasureTarget(d, "individuo");
    const v = validateDraft(d, getRequiredFieldKeys(), getAdverseEffectsWatchlist());
    expect(v.valid).toBe(false);
    expect(v.guardrailErrors.length).toBeGreaterThan(0);
  });

  test("export rastreável sai de um rascunho válido montado sobre o registry real", () => {
    const exp = buildTraceableExport(
      draftFor("experimento_cultural"),
      getRequiredFieldKeys(),
      getAdverseEffectsWatchlist(),
      "RH_ADMIN",
      "2026-07-21T12:00:00.000Z",
    );
    expect(exp).not.toBeNull();
    expect(exp!.patternId).toBe("experimento_cultural");
    expect(Object.keys(exp!.fields).sort()).toEqual([...getRequiredFieldKeys()].sort());
  });
});
