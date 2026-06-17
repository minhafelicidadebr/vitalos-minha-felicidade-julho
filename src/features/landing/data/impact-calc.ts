// Calculadora de Impacto Financeiro — lógica PURA (mock-first, fora de src/engine).
// Fórmulas explícitas com benchmarks de mercado; valores ESTIMADOS — não constituem
// auditoria. Vive na feature da landing (não toca engines/mocks do app).

export interface ImpactParams {
  employees: number;
  avgSalary: number; // R$/mês
  turnoverPct: number; // %
  absenteeismPct: number; // %
  presenteeismPct: number; // %
  dismissalCost: number; // R$ por desligamento
  productivityLossPct: number; // %
}

export const DEFAULT_PARAMS: ImpactParams = {
  employees: 500,
  avgSalary: 5000,
  turnoverPct: 15,
  absenteeismPct: 4,
  presenteeismPct: 8,
  dismissalCost: 15000,
  productivityLossPct: 5,
};

// Premissas de ROI (conservadoras, ancoradas em literatura citada na UI).
export const INVEST_PCT = 0.02; // investimento sugerido ≈ 2% da massa salarial
export const RECOVERY_PCT = 0.35; // recuperação estimada ≈ 35% dos custos
export const OMS_BENCHMARK = "4:1";

export interface CostLine {
  id: string;
  label: string;
  value: number;
  formula: string;
}

export interface CostResult {
  annualPayroll: number;
  lines: CostLine[];
  total: number;
  perMonth: number;
  perEmployee: number;
}

export function computeCost(p: ImpactParams): CostResult {
  const annualPayroll = p.employees * p.avgSalary * 12;
  const turnover = p.employees * (p.turnoverPct / 100) * p.dismissalCost;
  const absenteeism = annualPayroll * (p.absenteeismPct / 100);
  const presenteeism = annualPayroll * (p.presenteeismPct / 100);
  const productivity = annualPayroll * (p.productivityLossPct / 100);

  const lines: CostLine[] = [
    {
      id: "turnover",
      label: "Custo de Turnover",
      value: turnover,
      formula: "colaboradores × taxa_turnover × custo_desligamento",
    },
    {
      id: "absenteeism",
      label: "Custo de Absenteísmo",
      value: absenteeism,
      formula: "massa_salarial_anual × taxa_absenteísmo",
    },
    {
      id: "presenteeism",
      label: "Custo de Presenteísmo",
      value: presenteeism,
      formula: "massa_salarial_anual × fator_presenteísmo",
    },
    {
      id: "productivity",
      label: "Perda de Produtividade",
      value: productivity,
      formula: "massa_salarial_anual × %_perda",
    },
  ];

  const total = lines.reduce((s, l) => s + l.value, 0);
  return {
    annualPayroll,
    lines,
    total,
    perMonth: total / 12,
    perEmployee: p.employees > 0 ? total / p.employees : 0,
  };
}

export interface RoiResult {
  investment: number;
  recovery: number;
  netGain: number;
  roiRatio: number; // recuperação / investimento
}

export function computeRoi(cost: CostResult, p: ImpactParams): RoiResult {
  const investment = p.employees * p.avgSalary * 12 * INVEST_PCT;
  const recovery = cost.total * RECOVERY_PCT;
  return {
    investment,
    recovery,
    netGain: recovery - investment,
    roiRatio: investment > 0 ? recovery / investment : 0,
  };
}

// ─── Config dos sliders (min/max/step/sufixo) ─────────────────────────────────
export interface SliderConfig {
  key: keyof ImpactParams;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  format?: "int" | "brl";
}

export const SLIDERS: SliderConfig[] = [
  { key: "employees", label: "Colaboradores", min: 10, max: 5000, step: 10, format: "int" },
  {
    key: "avgSalary",
    label: "Salário médio (R$/mês)",
    min: 1500,
    max: 30000,
    step: 100,
    format: "brl",
  },
  { key: "turnoverPct", label: "Turnover anual", min: 0, max: 60, step: 1, suffix: "%" },
  { key: "absenteeismPct", label: "Taxa de absenteísmo", min: 0, max: 25, step: 1, suffix: "%" },
  { key: "presenteeismPct", label: "Fator de presenteísmo", min: 0, max: 30, step: 1, suffix: "%" },
  {
    key: "dismissalCost",
    label: "Custo por desligamento (R$)",
    min: 0,
    max: 80000,
    step: 1000,
    format: "brl",
  },
  {
    key: "productivityLossPct",
    label: "Perda de produtividade",
    min: 0,
    max: 25,
    step: 1,
    suffix: "%",
  },
];

// ─── Formatação ───────────────────────────────────────────────────────────────
const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("pt-BR");

export const formatBRL = (n: number) => BRL.format(Math.round(n));
export const formatInt = (n: number) => NUM.format(Math.round(n));
