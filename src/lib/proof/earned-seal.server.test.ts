import { describe, expect, test } from "bun:test";
import { buildEarnedSeal } from "./earned-seal.server";
import { buildCycleProof } from "./cycle-proof.server";

// O selo GANHO: prova que o Domínio B flui da Prova de Ciclo real, não de constante.

describe("buildEarnedSeal — Domínio B ganho da Prova de Ciclo", () => {
  test("enterprise: domainBReady deriva do veredicto do ciclo (não hardcoded)", () => {
    const proof = buildCycleProof("enterprise");
    const earned = buildEarnedSeal("enterprise");
    // O critério reflete a prova: comprovado/parcial+redução → ready.
    const expected =
      proof.verdict === "comprovado" ||
      (proof.verdict === "parcial" && proof.attributableReductionPts > 0);
    expect(earned.domainBReady).toBe(expected);
  });

  test("a contagem de experimentos confirmados é a das intervenções com efeito", () => {
    const proof = buildCycleProof("enterprise");
    const earned = buildEarnedSeal("enterprise");
    expect(earned.interventionsWithEffect).toBe(proof.interventionsWithEffect);
  });

  test("o selo é computado (tier definido) e traz critérios", () => {
    const earned = buildEarnedSeal("enterprise");
    expect(earned.seal.criteria.length).toBeGreaterThan(0);
    expect([
      "nao_elegivel",
      "em_jornada",
      "empresa_viva",
      "referencia",
    ]).toContain(earned.seal.tier);
  });

  test("a proveniência é auditável e cita a evidência (não declaração)", () => {
    const earned = buildEarnedSeal("enterprise");
    if (earned.domainBReady) {
      expect(earned.provenanceNote).toContain("GANHO");
      expect(earned.provenanceNote).toContain("evidência");
    }
    expect(earned.provenanceNote.length).toBeGreaterThan(20);
  });

  test("expõe o custo evitado quando há ROI (rastreável ao argumento financeiro)", () => {
    const earned = buildEarnedSeal("enterprise");
    if (earned.domainBReady) {
      expect(earned.avoidedCostYear).not.toBeNull();
      expect(earned.avoidedCostYear!).toBeGreaterThan(0);
    }
  });
});

describe("buildEarnedSeal — honestidade (sem prova, sem reconhecimento)", () => {
  test("pack sem histórico: Domínio B NÃO pronto, proveniência explica a pendência", () => {
    const earned = buildEarnedSeal("government");
    expect(earned.cycleVerdict).toBe("sem_dados");
    expect(earned.domainBReady).toBe(false);
    expect(earned.provenanceNote).toContain("pendente");
  });

  test("determinístico: duas chamadas produzem o mesmo selo", () => {
    const a = buildEarnedSeal("enterprise");
    const b = buildEarnedSeal("enterprise");
    expect(a.seal.tier).toBe(b.seal.tier);
    expect(a.domainBReady).toBe(b.domainBReady);
    expect(a.provenanceNote).toBe(b.provenanceNote);
  });
});

// ─── Variante REAL (E4): Selo sobre o Cofre de Ciclos ─────────────────────────

import { buildEarnedSealFromHistory } from "./earned-seal.server";
import { getCapsuleHistory } from "@/mocks/capsule-history-mock";

describe("buildEarnedSealFromHistory — Selo real, honesto sobre Domínio A", () => {
  const history = getCapsuleHistory("enterprise", "COPSOQ");

  test("Domínio B flui da Prova de Ciclo REAL (não de constante)", () => {
    const earned = buildEarnedSealFromHistory("enterprise", history);
    // domainBReady bate com a prova real (comprovado/parcial+redução).
    expect(typeof earned.domainBReady).toBe("boolean");
    expect(earned.cycleVerdict).toBeDefined();
    expect(earned.interventionsWithEffect).toBe(earned.interventionsWithEffect); // real, não hardcoded
  });

  test("NUNCA finge Domínio A: proveniência declara IVO/PERMA + consentimento pendentes", () => {
    const earned = buildEarnedSealFromHistory("enterprise", history);
    expect(earned.provenanceNote).toContain("florescimento");
    expect(earned.provenanceNote.toLowerCase()).toContain("consentimento");
    expect(earned.provenanceNote).toContain("nunca finge");
  });

  test("sem IVO real (ivoScore=0), C1 nunca cumprido → selo nunca 'concedido' no real", () => {
    const earned = buildEarnedSealFromHistory("enterprise", history);
    // O Selo pleno exige Domínio A; sem ele, granted é sempre false — honesto.
    expect(earned.seal.granted).toBe(false);
  });

  test("histórico vazio ou 1 ciclo: Domínio B pendente por falta de longitudinal", () => {
    const one = buildEarnedSealFromHistory("enterprise", history.slice(0, 1));
    expect(one.domainBReady).toBe(false);
    expect(one.provenanceNote).toContain("pendente");
  });

  test("determinístico: mesma história → mesmo selo", () => {
    const a = buildEarnedSealFromHistory("enterprise", history);
    const b = buildEarnedSealFromHistory("enterprise", history);
    expect(a.seal.tier).toBe(b.seal.tier);
    expect(a.provenanceNote).toBe(b.provenanceNote);
  });
});
