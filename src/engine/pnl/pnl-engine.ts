// Vitality P&L engine — pure, transparent formulas. Every output carries
// the formula string so the UI can show exactly how it was computed.

export interface PnLInputs {
  employees: number;
  avgMonthlySalary: number; // R$
  turnoverRatePctYear: number; // %
  replacementCostMultiplier: number; // × salário mensal (recrutar+rampar)
  absenteeismDaysPerEmployeeYear: number;
  presenteeismLossPct: number; // % de produtividade perdida estimada
  workdaysPerYear: number;
}

export type Scenario = "conservador" | "médio" | "otimista";

// Scenario multipliers applied to the avoided-cost estimate
const SCENARIO_FACTOR: Record<Scenario, number> = {
  conservador: 0.5,
  "médio": 1.0,
  otimista: 1.5,
};

export interface PnLLine {
  id: string;
  label: string;
  value: number;
  formula: string;
}

export interface PnLResult {
  lines: PnLLine[];
  totalCurrentCost: number;
  avoidedCost: number;
  inactionCost12m: number;
  scenario: Scenario;
}

export const DEFAULT_INPUTS: PnLInputs = {
  employees: 480,
  avgMonthlySalary: 6_500,
  turnoverRatePctYear: 18,
  replacementCostMultiplier: 4,
  absenteeismDaysPerEmployeeYear: 6.5,
  presenteeismLossPct: 6,
  workdaysPerYear: 220,
};

/**
 * ivoDeltaPts: melhoria observada/esperada no IVO (pontos 0–1000).
 * Premissa correlacional explícita: cada 100 pts de IVO ≈ 6% de redução
 * nos custos de turnover+absenteísmo+presenteísmo (fonte: estimativa
 * interna baseada em literatura de engajamento; NÃO é promessa).
 */
export function calculatePnL(
  inputs: PnLInputs,
  ivoDeltaPts: number,
  scenario: Scenario,
): PnLResult {
  const dailySalary = inputs.avgMonthlySalary / 22;

  const leaversPerYear = inputs.employees * (inputs.turnoverRatePctYear / 100);
  const turnoverCost =
    leaversPerYear * inputs.avgMonthlySalary * inputs.replacementCostMultiplier;

  const absenteeismCost =
    inputs.employees * inputs.absenteeismDaysPerEmployeeYear * dailySalary;

  const annualPayroll = inputs.employees * inputs.avgMonthlySalary * 12;
  const presenteeismCost = annualPayroll * (inputs.presenteeismLossPct / 100);

  const totalCurrentCost = turnoverCost + absenteeismCost + presenteeismCost;

  const reductionPct = (ivoDeltaPts / 100) * 6 * SCENARIO_FACTOR[scenario];
  const avoidedCost = totalCurrentCost * (reductionPct / 100);

  // Inação: custo corrente + deterioração estimada de 8%/ano sem intervenção
  const inactionCost12m = totalCurrentCost * 1.08;

  return {
    scenario,
    totalCurrentCost,
    avoidedCost,
    inactionCost12m,
    lines: [
      {
        id: "turnover",
        label: "Custo de turnover/ano",
        value: turnoverCost,
        formula: `${inputs.employees} colab. × ${inputs.turnoverRatePctYear}% × (R$ ${inputs.avgMonthlySalary.toLocaleString("pt-BR")} × ${inputs.replacementCostMultiplier})`,
      },
      {
        id: "absenteeism",
        label: "Custo de absenteísmo/ano",
        value: absenteeismCost,
        formula: `${inputs.employees} colab. × ${inputs.absenteeismDaysPerEmployeeYear} dias × salário-dia (salário ÷ 22)`,
      },
      {
        id: "presenteeism",
        label: "Custo de presenteísmo/ano",
        value: presenteeismCost,
        formula: `folha anual × ${inputs.presenteeismLossPct}% de produtividade perdida (estimativa)`,
      },
      {
        id: "avoided",
        label: `Custo evitável (Δ IVO +${ivoDeltaPts} pts, cenário ${scenario})`,
        value: avoidedCost,
        formula: `custo total × (${ivoDeltaPts}/100 × 6% × ${SCENARIO_FACTOR[scenario]}) — premissa correlacional`,
      },
      {
        id: "inaction",
        label: "Custo da inação (12 meses)",
        value: inactionCost12m,
        formula: "custo total corrente × 1,08 (deterioração estimada de 8% a.a. sem ação)",
      },
    ],
  };
}
