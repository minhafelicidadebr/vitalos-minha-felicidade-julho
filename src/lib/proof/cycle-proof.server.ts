// Fronteira server-only da PROVA DE CICLO. O capstone: compõe os engines do arco
// M.E.T.E. numa única leitura que o board vê — medir → agir → provar → custo evitado.
//
// COMPOSIÇÃO (Fable 5 §5.1 — compor, não acumular; tudo já construído):
//   capsule-history → buildLongitudinalReading      (MEDIR: antes/depois)
//   intervention-links + evaluateInterventionBatch  (AGIR→PROVAR: eficácia)
//   attributableReductionFromEvidence               (o que é atribuível)
//   calculatePreventionRoi                          (CUSTO: retorno sobre prevenção)
//   → CycleProof: o artefato único do CFO/board
//
// Server-only: nenhum capsule bruto vai ao cliente — só leituras, veredictos e números
// já seguros. Em produção (Fase 2): dados do Cloud com RLS por org. Determinístico.

import {
  buildLongitudinalReading,
  type LongitudinalReading,
  type TrajectoryDirection,
} from "@/engine/ai/capsule-longitudinal-engine";
import {
  evaluateInterventionBatch,
  type InterventionEvidence,
} from "@/engine/lab/intervention-evidence-engine";
import {
  calculatePreventionRoi,
  attributableReductionFromEvidence,
  type PreventionRoiResult,
} from "@/engine/pnl/prevention-roi-engine";
import { DEFAULT_INPUTS } from "@/engine/pnl/pnl-engine";
import type { MeasurementContextCapsule } from "@/engine/ai/measurement-capsule-engine";
import { getCapsuleHistory } from "@/mocks/capsule-history-mock";
import { getInterventionLinks } from "@/mocks/intervention-link-mock";

// ─── Resultado ─────────────────────────────────────────────────────────────────

export type CycleProofVerdict =
  | "sem_dados" // < 2 ciclos: não há prova longitudinal possível
  | "sem_evidencia" // medido, mas nenhuma intervenção com efeito atribuível
  | "parcial" // alguma intervenção com efeito; nem todas
  | "comprovado"; // maioria das intervenções medidas com efeito atribuível

export interface CycleProof {
  packId: string;
  instrumentShort: string;
  // MEDIR
  cycleCount: number;
  cycleLabels: string[];
  overallDirection: TrajectoryDirection | null;
  improvedDimensions: number;
  worsenedDimensions: number;
  // PROVAR
  interventions: InterventionEvidence[];
  interventionsWithEffect: number;
  attributableReductionPts: number;
  // CUSTO
  preventionRoi: PreventionRoiResult | null;
  // SÍNTESE
  verdict: CycleProofVerdict;
  headline: string;
  disclaimer: string;
}

const DISCLAIMER =
  "Prova de ciclo: síntese de associações orientativas (indicativas, drift-adjusted), " +
  "NÃO de causalidade. Custos são estimativas com fórmula visível, não promessas. Agregados " +
  "protegidos (k-anonimato).";

/**
 * Monta a Prova de Ciclo de um pack a partir do instrumento de risco (COPSOQ).
 * `instrumentShort` default "COPSOQ" (Domínio B — onde a prevenção tem custo medível).
 * Fonte: histórico de DEMONSTRAÇÃO (capsule-history-mock.ts), compartilhado por setor.
 */
export function buildCycleProof(packId: string, instrumentShort = "COPSOQ"): CycleProof {
  return buildCycleProofFromHistory(getCapsuleHistory(packId, instrumentShort), packId, instrumentShort);
}

/**
 * Mesma composição, mas o histórico é fornecido pelo CHAMADOR — nunca lido daqui.
 * É o que permite o Cofre de Ciclos (S6.75) alimentar a mesma prova com dados
 * REAIS de uma organização (cycle-history.server.ts), sem duplicar uma linha
 * de lógica de medir→provar→custo.
 */
export function buildCycleProofFromHistory(
  history: readonly MeasurementContextCapsule[],
  packId: string,
  instrumentShort = "COPSOQ",
): CycleProof {
  // Sem ≥2 ciclos não há prova longitudinal — honesto, sem inventar.
  if (history.length < 2) {
    return emptyProof(packId, instrumentShort);
  }

  const built = buildLongitudinalReading({ capsules: [...history] });
  if (!built.ok) return emptyProof(packId, instrumentShort);
  const reading: LongitudinalReading = built.reading;

  // PROVAR: eficácia das intervenções contra a trajetória medida.
  const links = getInterventionLinks(packId);
  const interventions = evaluateInterventionBatch(links, reading);
  const withEffect = interventions.filter(
    (e) => e.measured && (e.netEffect ?? 0) > 0 && e.verdict?.reportable,
  ).length;

  // CUSTO: redução atribuível → retorno sobre prevenção.
  const attributableReductionPts = attributableReductionFromEvidence(interventions);
  const preventionRoi =
    attributableReductionPts > 0
      ? calculatePreventionRoi({
          costBase: DEFAULT_INPUTS,
          attributableExposureReductionPts: attributableReductionPts,
          scenario: "médio",
        })
      : null;

  const measuredCount = interventions.filter((e) => e.measured).length;
  const verdict = synthesizeVerdict(measuredCount, withEffect);

  return {
    packId,
    instrumentShort,
    cycleCount: reading.cycleCount,
    cycleLabels: reading.cycleLabels,
    overallDirection: reading.overallDirection,
    improvedDimensions: reading.improvedCount,
    worsenedDimensions: reading.worsenedCount,
    interventions,
    interventionsWithEffect: withEffect,
    attributableReductionPts,
    preventionRoi,
    verdict,
    headline: buildHeadline(verdict, reading, withEffect, preventionRoi),
    disclaimer: DISCLAIMER,
  };
}

// ─── Internos ──────────────────────────────────────────────────────────────────

function emptyProof(packId: string, instrumentShort: string): CycleProof {
  return {
    packId,
    instrumentShort,
    cycleCount: 0,
    cycleLabels: [],
    overallDirection: null,
    improvedDimensions: 0,
    worsenedDimensions: 0,
    interventions: [],
    interventionsWithEffect: 0,
    attributableReductionPts: 0,
    preventionRoi: null,
    verdict: "sem_dados",
    headline: "Sem ciclos suficientes para uma prova longitudinal (são necessários ≥2).",
    disclaimer: DISCLAIMER,
  };
}

function synthesizeVerdict(measured: number, withEffect: number): CycleProofVerdict {
  if (withEffect === 0) return "sem_evidencia";
  if (measured > 0 && withEffect >= Math.ceil(measured / 2)) return "comprovado";
  return "parcial";
}

function buildHeadline(
  verdict: CycleProofVerdict,
  reading: LongitudinalReading,
  withEffect: number,
  roi: PreventionRoiResult | null,
): string {
  const span = `${reading.cycleCount} ciclos (${reading.cycleLabels.join(" → ")})`;
  const roiText = roi
    ? ` Custo de prevenção evitado estimado: R$ ${roi.avoidedCostYear.toLocaleString("pt-BR")}/ano (cenário médio).`
    : "";
  switch (verdict) {
    case "comprovado":
      return `Ciclo com evidência: ${withEffect} intervenção(ões) com efeito atribuível em ${span}.${roiText}`;
    case "parcial":
      return `Evidência parcial: ${withEffect} intervenção(ões) com efeito atribuível em ${span}.${roiText}`;
    case "sem_evidencia":
      return `Medição completa em ${span}, mas nenhuma intervenção mostrou efeito atribuível além do drift.`;
    case "sem_dados":
      return "Sem ciclos suficientes para uma prova longitudinal.";
  }
}
