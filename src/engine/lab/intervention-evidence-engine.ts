// Intervention Evidence Engine — engine PURO. Fecha o Evidence Loop: liga uma
// INTERVENÇÃO (Culture Lab) à PROVA longitudinal real da dimensão que ela mirou.
//
// "O experiment que rodamos na sobrecarga funcionou?" — aqui se responde, com o dado
// medido (capsules selados), não com achismo.
//
// COMPOSIÇÃO (Fable 5 §5.1 — compor, não acumular):
//   capsule-longitudinal-engine → trajetória medida por dimensão        [injetado]
//   evidence-engine.evaluateEvidence → veredicto/ tier/ magnitude        [composto]
//   ESTE engine → liga a intervenção à dimensão e roda a avaliação honesta
//
// HONESTIDADE (Fable 5 §6, §8) — a manobra do diff-in-diff intra-survey:
//   Sem grupo de controle externo, usamos o DRIFT MÉDIO das demais dimensões como
//   proxy de tendência secular. netEffect = (melhora da dimensão alvo) − (melhora
//   média geral). Se a dimensão mirada melhorou MAIS que o drift geral, há indício
//   de efeito específico da intervenção — não prova causal.
//   Por isso a confiança é TETADA em "indicativo": um proxy de drift não é um
//   controle randomizado. Jamais "robusto" daqui. O disclaimer de não-causalidade
//   da leitura longitudinal é repassado verbatim.
//
// Escala: exposição 0..100, ALTO = pior. Convertemos para o referencial "maior=melhor"
// do evidence-engine (before = 100−cargaInicial) para que melhora vire delta positivo.
//
// Engine puro: sem React, sem I/O, sem domain/. Determinístico.

import { evaluateEvidence, type EvidenceVerdict, type ConfidenceTier } from "./evidence-engine";
import type { LongitudinalReading } from "../ai/capsule-longitudinal-engine";

// ─── Entrada ───────────────────────────────────────────────────────────────────

export interface InterventionLink {
  interventionId: string;
  label: string;
  /** Dimensão COPSOQ que a intervenção mirou (deve casar com a leitura longitudinal). */
  targetDimensionId: string;
  /** Tamanho da coorte medida (para o tier de confiança / k-anon). */
  participantCount: number;
  /** Hipótese de redução de exposição esperada (pts), opcional. */
  expectedReductionBand?: { low: number; high: number };
  kAnonymityMin?: number;
}

// ─── Saída ─────────────────────────────────────────────────────────────────────

export interface InterventionEvidence {
  interventionId: string;
  label: string;
  targetDimensionId: string;
  targetLabel: string | null;
  /** A dimensão alvo era comparável na leitura (visível em ≥2 ciclos)? */
  measured: boolean;
  firstLoad: number | null;
  lastLoad: number | null;
  /** Redução de exposição da dimensão alvo (positivo = melhorou). */
  targetImprovement: number | null;
  /** Melhora média de todas as dimensões (proxy de tendência secular). */
  secularDrift: number | null;
  /** Efeito específico: melhora do alvo além do drift geral. */
  netEffect: number | null;
  verdict: EvidenceVerdict | null;
  /** Leitura honesta gerada. */
  note: string;
  disclaimer: string;
}

const NO_CONTROL_DISCLAIMER =
  "Diff-in-diff intra-survey: o efeito é a melhora da dimensão alvo ALÉM do drift médio " +
  "das demais — indício, não prova causal (sem grupo de controle randomizado).";

/**
 * Avalia a evidência de uma intervenção a partir da leitura longitudinal real.
 * Se a dimensão alvo não é comparável (suprimida/k-anon ou ausente), retorna um
 * resultado honesto "não medido", sem inventar efeito.
 */
export function evaluateInterventionEvidence(
  link: InterventionLink,
  reading: LongitudinalReading,
): InterventionEvidence {
  const base = {
    interventionId: link.interventionId,
    label: link.label,
    targetDimensionId: link.targetDimensionId,
    disclaimer: `${NO_CONTROL_DISCLAIMER} ${reading.disclaimer}`,
  };

  // Procura a dimensão alvo entre exposições E desfechos (a intervenção pode mirar
  // um driver; desfecho fica fora do diff-in-diff de eficácia por desenho).
  const target = reading.exposures.find((e) => e.dimensionId === link.targetDimensionId);

  if (!target) {
    const isOutcome = reading.outcomes.some((o) => o.dimensionId === link.targetDimensionId);
    return {
      ...base,
      targetLabel: reading.outcomes.find((o) => o.dimensionId === link.targetDimensionId)?.label ?? null,
      measured: false,
      firstLoad: null,
      lastLoad: null,
      targetImprovement: null,
      secularDrift: null,
      netEffect: null,
      verdict: null,
      note: isOutcome
        ? `"${link.label}" mira um DESFECHO — desfechos são medidos, nunca alvo de eficácia de driver (separação Domínio B).`
        : `Dimensão "${link.targetDimensionId}" não comparável nesta janela (suprimida por k-anonimato ou ausente). Sem leitura de eficácia.`,
    };
  }

  const targetImprovement = target.improvement; // = firstLoad − lastLoad (redução)
  const secularDrift = Math.round((reading.meanFirst - reading.meanLast) * 10) / 10;

  // Mapeia para o referencial "maior=melhor" do evidence-engine.
  // before = 100 − cargaInicial; after = 100 − cargaFinal → after−before = melhora.
  // comparisonDelta (grupo de comparação) = melhora média geral = secularDrift.
  const verdict = evaluateEvidence({
    before: 100 - target.firstLoad,
    after: 100 - target.lastLoad,
    comparisonDelta: secularDrift,
    n: link.participantCount,
    expectedBand: link.expectedReductionBand,
    kAnonymityMin: link.kAnonymityMin,
  });

  // TETO de confiança: proxy de drift não é controle randomizado → nunca "robusto".
  const cappedVerdict: EvidenceVerdict = {
    ...verdict,
    confidenceTier: capTier(verdict.confidenceTier),
  };

  return {
    ...base,
    targetLabel: target.label,
    measured: true,
    firstLoad: target.firstLoad,
    lastLoad: target.lastLoad,
    targetImprovement,
    secularDrift,
    netEffect: cappedVerdict.netEffect,
    verdict: cappedVerdict,
    note: buildNote(link.label, target.label, cappedVerdict, secularDrift),
  };
}

/** Avalia um lote de intervenções contra a mesma leitura longitudinal. */
export function evaluateInterventionBatch(
  links: InterventionLink[],
  reading: LongitudinalReading,
): InterventionEvidence[] {
  return links.map((l) => evaluateInterventionEvidence(l, reading));
}

// ─── Internos ──────────────────────────────────────────────────────────────────

/** Tetar a confiança: sem controle randomizado, "robusto" cai para "indicativo". */
function capTier(tier: ConfidenceTier): ConfidenceTier {
  return tier === "robusto" ? "indicativo" : tier;
}

function buildNote(
  interventionLabel: string,
  dimLabel: string,
  verdict: EvidenceVerdict,
  drift: number,
): string {
  if (!verdict.reportable) {
    return `"${interventionLabel}": amostra abaixo do k-anonimato — resultado protegido.`;
  }
  const driftText =
    drift > 0
      ? `(drift geral de melhora: ${drift} pts)`
      : drift < 0
        ? `(contexto piorou em média: ${drift} pts)`
        : "(sem drift geral)";
  if (verdict.netEffect <= 0) {
    return `"${interventionLabel}" mirou ${dimLabel}, mas o efeito além do drift foi nulo ${driftText}.`;
  }
  return `"${interventionLabel}" → ${dimLabel}: efeito de ${verdict.netEffect} pts além do drift ${driftText}. Indício ${verdict.confidenceTier}.`;
}
