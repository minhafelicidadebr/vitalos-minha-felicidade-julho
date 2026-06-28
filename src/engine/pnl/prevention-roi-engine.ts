// Prevention ROI engine — Retorno sobre Prevenção (Domínio B). Engine PURO.
//
// Traduz a redução de exposição psicossocial COMPROVADA (longitudinal + evidência de
// intervenção) no argumento financeiro que renova contrato: o custo de prevenção
// evitado. Distinto do Vitality P&L (Domínio A / IVO-florescimento) — aqui o mecanismo
// é o risco psicossocial (NR-1) que vira absenteísmo, rotatividade e adoecimento.
//
// COMPOSIÇÃO (Fable 5 §5.1):
//   intervention-evidence-engine → netEffect ATRIBUÍVEL por intervenção  [composto]
//   pnl-engine (PnLInputs, Scenario) → base de custo e semântica de cenário [reuso]
//   ESTE engine → parcela psicossocial × redução atribuível = custo evitado
//
// HONESTIDADE COMO FEATURE (Fable 5 §6, §8 — "mostre a conta"):
//   - Cada linha carrega a FÓRMULA (string) — nada é número nu.
//   - A redução que move o cálculo é a ATRIBUÍVEL (drift-adjusted, indicativo), não a
//     bruta — herda o teto de confiança da evidência de intervenção.
//   - Só uma FRAÇÃO do absenteísmo/turnover é psicossocial-atribuível: fração explícita
//     e conservadora (premissa declarada, não fato).
//   - Elasticidade exposição→custo é PREMISSA declarada, com cenário em banda (0,5/1/1,5).
//   - É ESTIMATIVA ORIENTATIVA, nunca promessa nem causalidade. Disclaimer verbatim.
//
// Engine puro: sem React, sem I/O, sem domain/. Determinístico.

import type { PnLInputs, Scenario } from "./pnl-engine";
import type { InterventionEvidence } from "../lab/intervention-evidence-engine";

// ─── Premissas declaradas (todas conservadoras, todas visíveis) ────────────────

/** Fração do custo de absenteísmo+turnover atribuível a fatores psicossociais. */
const DEFAULT_PSYCHOSOCIAL_FRACTION = 0.25;

/**
 * Elasticidade exposição→custo: cada 100 pts de redução de exposição psicossocial
 * atribuível ≈ esta fração de redução na PARCELA psicossocial do custo. Conservadora.
 */
const EXPOSURE_TO_COST_ELASTICITY = 0.2;

/** Teto do fator de prevenção: nem no cenário otimista se evita mais que isto. */
const MAX_PREVENTION_FACTOR = 0.5;

const SCENARIO_FACTOR: Record<Scenario, number> = {
  conservador: 0.5,
  médio: 1.0,
  otimista: 1.5,
};

// ─── Entrada / saída ───────────────────────────────────────────────────────────

export interface PreventionRoiInput {
  costBase: PnLInputs;
  /** Redução de exposição ATRIBUÍVEL (pts 0..100), drift-adjusted/indicativa. */
  attributableExposureReductionPts: number;
  scenario: Scenario;
  /** Fração psicossocial-atribuível (default 0,25). Premissa explícita. */
  psychosocialAttributableFraction?: number;
}

export interface PreventionRoiLine {
  id: string;
  label: string;
  value: number;
  formula: string;
}

export interface PreventionRoiResult {
  lines: PreventionRoiLine[];
  /** Parcela psicossocial-atribuível do custo anual (absenteísmo + turnover). */
  psychosocialBaselineCost: number;
  /** Fator de prevenção aplicado (0..MAX), já com cenário. */
  preventionFactor: number;
  /** Custo de prevenção evitado no ano (estimativa orientativa). */
  avoidedCostYear: number;
  scenario: Scenario;
  attributableExposureReductionPts: number;
  disclaimer: string;
}

const DISCLAIMER =
  "Estimativa orientativa de Retorno sobre Prevenção, NÃO promessa nem prova causal. " +
  "Construída sobre a redução de exposição ATRIBUÍVEL (indicativa, drift-adjusted), uma fração " +
  "psicossocial conservadora e uma elasticidade declarada. Premissas explícitas, ajustáveis.";

const round = (n: number) => Math.round(n);

/**
 * Calcula o Retorno sobre Prevenção a partir da base de custo e da redução de
 * exposição atribuível. Toda linha carrega a fórmula. Redução ≤ 0 → custo evitado 0
 * (honesto: sem melhora atribuível, sem retorno).
 */
export function calculatePreventionRoi(input: PreventionRoiInput): PreventionRoiResult {
  const { costBase: c, scenario } = input;
  const fraction = input.psychosocialAttributableFraction ?? DEFAULT_PSYCHOSOCIAL_FRACTION;
  const reductionPts = Math.max(0, input.attributableExposureReductionPts);

  const dailySalary = c.avgMonthlySalary / 22;

  // Base de custo (mesmos componentes do Vitality P&L, recortados ao mecanismo B).
  const absenteeismCost = round(
    c.employees * c.absenteeismDaysPerEmployeeYear * dailySalary,
  );
  const turnoverCost = round(
    c.employees * (c.turnoverRatePctYear / 100) * (c.avgMonthlySalary * c.replacementCostMultiplier),
  );
  const psychosocialBaselineCost = round((absenteeismCost + turnoverCost) * fraction);

  // Fator de prevenção = redução(pts)/100 × elasticidade × cenário, com teto.
  const rawFactor = (reductionPts / 100) * EXPOSURE_TO_COST_ELASTICITY * SCENARIO_FACTOR[scenario];
  const preventionFactor = Math.min(MAX_PREVENTION_FACTOR, Math.round(rawFactor * 1000) / 1000);

  const avoidedCostYear = round(psychosocialBaselineCost * preventionFactor);

  const lines: PreventionRoiLine[] = [
    {
      id: "absenteeism_base",
      label: "Custo anual de absenteísmo",
      value: absenteeismCost,
      formula: `${c.employees} colab. × ${c.absenteeismDaysPerEmployeeYear} dias × (R$ ${round(dailySalary).toLocaleString("pt-BR")} salário-dia)`,
    },
    {
      id: "turnover_base",
      label: "Custo anual de rotatividade",
      value: turnoverCost,
      formula: `${c.employees} colab. × ${c.turnoverRatePctYear}% × (R$ ${c.avgMonthlySalary.toLocaleString("pt-BR")} × ${c.replacementCostMultiplier})`,
    },
    {
      id: "psychosocial_baseline",
      label: "Parcela psicossocial-atribuível",
      value: psychosocialBaselineCost,
      formula: `(absenteísmo + rotatividade) × ${Math.round(fraction * 100)}% (fração psicossocial — premissa)`,
    },
    {
      id: "avoided_cost",
      label: "Custo de prevenção evitado (ano)",
      value: avoidedCostYear,
      formula: `parcela psicossocial × ${reductionPts} pts/100 × ${EXPOSURE_TO_COST_ELASTICITY} elasticidade × ${SCENARIO_FACTOR[scenario]} (${scenario}) — estimativa`,
    },
  ];

  return {
    lines,
    psychosocialBaselineCost,
    preventionFactor,
    avoidedCostYear,
    scenario,
    attributableExposureReductionPts: reductionPts,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Compõe a redução de exposição ATRIBUÍVEL a partir de um lote de evidências de
 * intervenção: soma os netEffects positivos, reportáveis e medidos. Só conta o que
 * sobreviveu ao diff-in-diff e ao k-anon — nunca a melhora bruta.
 */
export function attributableReductionFromEvidence(evidences: InterventionEvidence[]): number {
  return evidences.reduce((sum, e) => {
    if (!e.measured || !e.verdict?.reportable) return sum;
    const net = e.netEffect ?? 0;
    return net > 0 ? sum + net : sum;
  }, 0);
}
