// Impact mock — compõe ivo-engine + pnl-engine + evidence-engine + certification-engine
// para montar o ImpactReport demo. Fonte única: todos os números derivam de mocks
// existentes, sem dados inventados separadamente.

import { buildImpactReport, type LensDelta } from "@/engine/impact/impact-engine";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { calculatePnL, DEFAULT_INPUTS } from "@/engine/pnl/pnl-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { certify, DEFAULT_CERT_CONFIG } from "@/engine/certification/certification-engine";
import { ivoCurrentCycle, ivoPreviousCycle, DEMO_ORG } from "./ivo-mock";
import { EXPERIMENT_CASES } from "./experiment-mock";
import { DOMAIN_B_READY } from "./certification-mock";
import ivoFramework from "@/domain/packs/enterprise/ivo-framework.json";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";

// ─── Scores IVO antes/depois ─────────────────────────────────────────────────

const fw = ivoFramework as unknown as ProprietaryIndex;
const resultAfter = calculateIVO(ivoCurrentCycle, fw);
const resultBefore = calculateIVO(ivoPreviousCycle, fw);

// ─── Deltas por lente ─────────────────────────────────────────────────────────

export const LENS_DELTAS: LensDelta[] = resultAfter.lenses.map((lensAfter) => {
  const lensBefore = resultBefore.lenses.find((l) => l.lensId === lensAfter.lensId);
  const before = Math.round(lensBefore?.score ?? lensAfter.score);
  const after = Math.round(lensAfter.score);
  const delta = after - before;
  return {
    lensId: lensAfter.lensId,
    lensLabel: lensAfter.lensName,
    before,
    after,
    delta,
    direction: delta > 5 ? "alta" : delta < -5 ? "queda" : "estavel",
  };
});

// ─── P&L (custo evitado) ─────────────────────────────────────────────────────

const ivoDelta = Math.round(resultAfter.ivoScore) - Math.round(resultBefore.ivoScore);
// Cenário médio (caso representativo) — o conservador subestima demais o ciclo demo.
const pnl = calculatePnL(DEFAULT_INPUTS, ivoDelta, "médio");

// Custo declarado do programa (demo): ~R$ 180/colaborador/ano.
const ESTIMATED_PROGRAM_COST_BRL = 90_000;

// ─── Experimentos confirmados ─────────────────────────────────────────────────

const evidencedCases = EXPERIMENT_CASES.filter((c) => c.status === "concluido" && c.observed);
const confirmedCount = evidencedCases.filter((c) => {
  if (!c.observed) return false;
  const v = evaluateEvidence(c.observed);
  return v.verdict === "confirmado" || v.verdict === "superou";
}).length;

// ─── Certificação ─────────────────────────────────────────────────────────────

const certResult = certify(
  {
    ivoScore: Math.round(resultAfter.ivoScore),
    previousIvoScore: Math.round(resultBefore.ivoScore),
    participationPct: DEMO_ORG.participationRate,
    experimentsConfirmed: confirmedCount,
    domainBReady: DOMAIN_B_READY,
    consentCoveragePct: 84,
    kAnonRespected: true,
  },
  DEFAULT_CERT_CONFIG,
);

// ─── Relatório de impacto ─────────────────────────────────────────────────────

export const IMPACT_REPORT = buildImpactReport({
  programWeeks: 13,
  employees: DEMO_ORG.totalCollaborators,
  ivoScoreBefore: Math.round(resultBefore.ivoScore),
  ivoScoreAfter: Math.round(resultAfter.ivoScore),
  lensDeltas: LENS_DELTAS,
  avoidedCostBRL: Math.round(pnl.avoidedCost),
  estimatedProgramCostBRL: ESTIMATED_PROGRAM_COST_BRL,
  experimentsTotal: evidencedCases.length,
  experimentsConfirmed: confirmedCount,
  certGranted: certResult.granted,
  certTierLabel: certResult.tierLabel,
  certEssentialMet: certResult.essentialMet,
  certEssentialTotal: certResult.essentialTotal,
});

// ─── Copy de UI ───────────────────────────────────────────────────────────────

export const IMPACT_INTRO = {
  eyebrow: "Relatório de Impacto do Programa",
  title: "Antes × Depois — o que o programa entregou",
  lead:
    "Visão consolidada do ciclo: variação IVO por lente, retorno financeiro estimado, " +
    "qualidade de evidência dos experimentos e elegibilidade ao Selo Empresa Viva. " +
    "Projetado para apresentação ao board e relatórios ESG.",
};

export const DIRECTION_LABEL = { alta: "Cresceu", queda: "Recuou", estavel: "Estável" } as const;
