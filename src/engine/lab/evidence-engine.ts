// Evidence engine — puro. Transforma o Culture Lab de "exibição" em CIÊNCIA:
// (1) desenha a hipótese de um experimento a partir de uma alavanca do Playbook
//     (compõe expectedLeverLift do forecast-engine), e
// (2) avalia o resultado por diferença-em-diferenças, com estatística HONESTA
//     (efeito líquido, faixa de confiança qualitativa, k-anonimato) — sem fingir
//     significância que os dados não sustentam.
// É o "comprovar" do ciclo medir→entender→agir→comprovar. Nunca importa domain/.

import {
  expectedLeverLift,
  SCENARIO_FACTOR,
  type ForecastLever,
  type ForecastPillar,
} from "../forecast/forecast-engine";

export const K_ANON_MIN = 5;

export type Verdict =
  | "protegido" // n < k-anon, resultado não divulgável
  | "sem_efeito" // efeito líquido ≤ 0
  | "parcial" // positivo, mas abaixo da hipótese
  | "confirmado" // dentro da faixa da hipótese
  | "superou" // acima da hipótese
  | "efeito_positivo"; // positivo, sem hipótese declarada

export type ConfidenceTier = "oculto" | "exploratório" | "indicativo" | "robusto";
export type EffectMagnitude = "pequeno" | "moderado" | "amplo";

// ─── Avaliação de evidência ───────────────────────────────────────────────────

export interface EvidenceInput {
  before: number; // score do pilar no piloto, antes (0–1000)
  after: number; // score do pilar no piloto, depois
  comparisonDelta: number; // variação do grupo de comparação na mesma janela
  n: number; // respondentes do piloto
  expectedBand?: { low: number; high: number }; // hipótese (pts no pilar)
  kAnonymityMin?: number;
}

export interface EvidenceVerdict {
  grossDelta: number; // after − before (piloto)
  netEffect: number; // diferença-em-diferenças (controla tendência secular)
  verdict: Verdict;
  confidenceTier: ConfidenceTier;
  effectMagnitude: EffectMagnitude | null;
  withinHypothesis: boolean | null;
  reportable: boolean; // n ≥ k-anon
  n: number;
  note: string; // leitura honesta, gerada (nunca escrita à mão)
}

function tierFor(n: number, reportable: boolean): ConfidenceTier {
  if (!reportable) return "oculto";
  if (n < 10) return "exploratório";
  if (n < 30) return "indicativo";
  return "robusto";
}

function magnitudeFor(netEffect: number): EffectMagnitude | null {
  if (netEffect <= 0) return null;
  if (netEffect < 10) return "pequeno";
  if (netEffect <= 25) return "moderado";
  return "amplo";
}

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function evaluateEvidence(input: EvidenceInput): EvidenceVerdict {
  const kAnon = input.kAnonymityMin ?? K_ANON_MIN;
  const grossDelta = Math.round(input.after - input.before);
  const netEffect = Math.round(grossDelta - input.comparisonDelta);
  const reportable = input.n >= kAnon;
  const confidenceTier = tierFor(input.n, reportable);

  if (!reportable) {
    return {
      grossDelta,
      netEffect,
      verdict: "protegido",
      confidenceTier,
      effectMagnitude: null,
      withinHypothesis: null,
      reportable,
      n: input.n,
      note: `Amostra n=${input.n} abaixo do mínimo de ${kAnon} — resultado protegido por k-anonimato.`,
    };
  }

  const band = input.expectedBand;
  let verdict: Verdict;
  let withinHypothesis: boolean | null = null;

  if (netEffect <= 0) {
    verdict = "sem_efeito";
  } else if (band) {
    if (netEffect > band.high) {
      verdict = "superou";
      withinHypothesis = false;
    } else if (netEffect >= band.low) {
      verdict = "confirmado";
      withinHypothesis = true;
    } else {
      verdict = "parcial";
      withinHypothesis = false;
    }
  } else {
    verdict = "efeito_positivo";
  }

  let note =
    `Efeito líquido ${sign(netEffect)} pts ` +
    `(bruto ${sign(grossDelta)}, comparação ${sign(input.comparisonDelta)}). ` +
    `n=${input.n} — ${confidenceTier}.`;
  if (band) note += ` Hipótese: +${band.low} a +${band.high} pts.`;
  note +=
    " Estimativa por diferença-em-diferenças — não é ensaio controlado; possíveis confundidores.";

  return {
    grossDelta,
    netEffect,
    verdict,
    confidenceTier,
    effectMagnitude: magnitudeFor(netEffect),
    withinHypothesis,
    reportable,
    n: input.n,
    note,
  };
}

// ─── Desenho de hipótese (compõe o forecast) ──────────────────────────────────

export interface ExperimentDesign {
  leadPillarId: string;
  leadPillarName: string;
  expectedLiftBand: { low: number; high: number }; // pts no pilar (conservador→otimista)
  recommendedDurationWeeks: number;
  minN: number;
}

/**
 * Desenha a hipótese de um experimento a partir de uma alavanca e do estado
 * atual dos pilares. A faixa espelha o envelope de cenários conservador→otimista
 * (0,5× a 1,5× do ganho-base médio), com retornos decrescentes do forecast.
 * Espera o fator de cenário MÉDIO (default).
 */
export function designExperimentFromLever(
  pillars: ForecastPillar[],
  lever: ForecastLever,
  scenarioFactor: number = SCENARIO_FACTOR.medio,
): ExperimentDesign | null {
  const lift = expectedLeverLift(pillars, lever, scenarioFactor);
  const lead = lift.perPillar[0];
  if (!lead) return null; // nenhum pilar-alvo visível

  const raw = lead.rawLift;
  return {
    leadPillarId: lead.pillarId,
    leadPillarName: lead.name,
    expectedLiftBand: { low: Math.round(raw * 0.5), high: Math.round(raw * 1.5) },
    recommendedDurationWeeks: lever.effort === "alto" ? 6 : 4,
    minN: K_ANON_MIN,
  };
}
