// Impact engine — puro, setor-agnóstico. Agrega deltas de IVO, retorno financeiro,
// qualidade de evidência e maturidade do programa num único relatório coerente.
// Nunca importa de domain/. Todas as fórmulas expostas via `formula` string.

export type EvidenceLevel = "inicial" | "indicativo" | "robusto" | "referencia";
export type DeltaDirection = "alta" | "queda" | "estavel";

export interface LensDelta {
  lensId: string;
  lensLabel: string;
  before: number;
  after: number;
  delta: number;
  direction: DeltaDirection;
}

export interface ImpactInput {
  programWeeks: number;
  employees: number;

  // IVO
  ivoScoreBefore: number; // 0–1000
  ivoScoreAfter: number;
  lensDeltas: LensDelta[];

  // P&L
  avoidedCostBRL: number; // custo evitado estimado (pnl-engine)
  estimatedProgramCostBRL: number; // investimento declarado

  // Evidência
  experimentsTotal: number;
  experimentsConfirmed: number; // veredito confirmado + superou (evidence-engine)

  // Certificação
  certGranted: boolean;
  certTierLabel: string;
  certEssentialMet: number;
  certEssentialTotal: number;
}

export interface RoiResult {
  ratio: number; // avoidedCost / programCost
  label: string; // "3.2× o investimento"
  formula: string;
}

export interface MaturityResult {
  score: number; // 0–100
  band: "iniciando" | "avancando" | "consolidando" | "referencia";
  bandLabel: string;
  formula: string;
}

export interface ImpactSection {
  id: string;
  title: string;
  value: string;
  sub: string;
  direction?: DeltaDirection;
  note?: string;
}

export interface ImpactReport {
  ivoOverall: { before: number; after: number; delta: number; direction: DeltaDirection };
  lensDeltas: LensDelta[];
  roi: RoiResult;
  maturity: MaturityResult;
  evidenceLevel: EvidenceLevel;
  sections: ImpactSection[];
  proofSentence: string;
  disclaimer: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function direction(delta: number): DeltaDirection {
  if (delta > 5) return "alta";
  if (delta < -5) return "queda";
  return "estavel";
}

const BAND_THRESHOLDS: { min: number; band: MaturityResult["band"]; label: string }[] = [
  { min: 75, band: "referencia", label: "Referência de mercado" },
  { min: 50, band: "consolidando", label: "Consolidando transformação" },
  { min: 25, band: "avancando", label: "Avançando com evidências" },
  { min: 0, band: "iniciando", label: "Iniciando jornada" },
];

function evidenceLevel(confirmed: number, total: number, ivoScore: number): EvidenceLevel {
  if (confirmed >= 2 && total >= 3 && ivoScore >= 650) return "referencia";
  if (confirmed >= 1 && total >= 2 && ivoScore >= 550) return "robusto";
  if (confirmed >= 1 || (total >= 1 && ivoScore >= 450)) return "indicativo";
  return "inicial";
}

const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  inicial: "Nível inicial — dados em coleta",
  indicativo: "Indicativo — primeiras evidências",
  robusto: "Robusto — experimentos confirmados",
  referencia: "Referência — prova replicável",
};

function proofSentence(input: ImpactInput, level: EvidenceLevel): string {
  const delta = input.ivoScoreAfter - input.ivoScoreBefore;
  const dir = delta >= 0 ? `cresceu ${delta} pontos` : `recuou ${Math.abs(delta)} pontos`;
  const base = `Em ${input.programWeeks} semanas, o IVO ${dir} (${input.ivoScoreBefore} → ${input.ivoScoreAfter}).`;
  const evidence = EVIDENCE_LABEL[level];
  return `${base} Evidência: ${evidence}.`;
}

// ─── Cálculo principal ───────────────────────────────────────────────────────

export function buildImpactReport(input: ImpactInput): ImpactReport {
  const ivoDelta = input.ivoScoreAfter - input.ivoScoreBefore;
  const ivoDir = direction(ivoDelta);

  // ROI
  const roiRatio =
    input.estimatedProgramCostBRL > 0
      ? input.avoidedCostBRL / input.estimatedProgramCostBRL
      : 0;
  const roi: RoiResult = {
    ratio: Math.round(roiRatio * 10) / 10,
    label: roiRatio >= 1 ? `${(Math.round(roiRatio * 10) / 10).toFixed(1)}× o investimento` : "< 1× (ainda em ciclo)",
    formula: `avoidedCost (R$ ${input.avoidedCostBRL.toLocaleString("pt-BR")}) ÷ programCost (R$ ${input.estimatedProgramCostBRL.toLocaleString("pt-BR")})`,
  };

  // Maturidade (semanas × 2 + ivo% × 40 + evidence% × 30 + cert × 30)
  const weekScore = Math.min(input.programWeeks * 2, 20); // max 20 pts (10+ semanas)
  const ivoScore = Math.min(Math.round((input.ivoScoreAfter / 1000) * 40), 40);
  const confRate = input.experimentsTotal > 0 ? input.experimentsConfirmed / input.experimentsTotal : 0;
  const evidScore = Math.round(confRate * 30);
  const certScore = input.certGranted ? 10 : Math.round((input.certEssentialMet / Math.max(input.certEssentialTotal, 1)) * 10);
  const rawScore = weekScore + ivoScore + evidScore + certScore;
  // Clamp a [0,100] e garante número finito — protege a busca de faixa de NaN.
  const matScore = Number.isFinite(rawScore) ? Math.min(Math.max(rawScore, 0), 100) : 0;
  const bandDef = BAND_THRESHOLDS.find((b) => matScore >= b.min) ?? BAND_THRESHOLDS[BAND_THRESHOLDS.length - 1]!;
  const maturity: MaturityResult = {
    score: matScore,
    band: bandDef.band,
    bandLabel: bandDef.label,
    formula: `semanas(${weekScore}) + ivo(${ivoScore}) + evidência(${evidScore}) + certificação(${certScore})`,
  };

  const evLevel = evidenceLevel(input.experimentsConfirmed, input.experimentsTotal, input.ivoScoreAfter);

  // Seções
  const sections: ImpactSection[] = [
    {
      id: "ivo_delta",
      title: "Variação IVO",
      value: `${ivoDelta >= 0 ? "+" : ""}${ivoDelta} pts`,
      sub: `${input.ivoScoreBefore} → ${input.ivoScoreAfter}`,
      direction: ivoDir,
    },
    {
      id: "roi",
      title: "Retorno estimado",
      value: roi.label,
      sub: `R$ ${input.avoidedCostBRL.toLocaleString("pt-BR")} custo evitado`,
      note: "Estimativa correlacional — não é promessa.",
    },
    {
      id: "evidence",
      title: "Nível de evidência",
      value: `${input.experimentsConfirmed}/${input.experimentsTotal} experimentos`,
      sub: EVIDENCE_LABEL[evLevel],
    },
    {
      id: "certification",
      title: "Selo Empresa Viva",
      value: input.certGranted ? input.certTierLabel : `Em jornada (${input.certEssentialMet}/${input.certEssentialTotal})`,
      sub: input.certGranted ? "Critérios essenciais cumpridos" : "Critérios ainda em progresso",
    },
    {
      id: "maturity",
      title: "Maturidade do programa",
      value: `${matScore}/100`,
      sub: bandDef.label,
    },
    {
      id: "employees",
      title: "Pessoas impactadas",
      value: input.employees.toLocaleString("pt-BR"),
      sub: `${input.programWeeks} semanas de programa`,
    },
  ];

  return {
    ivoOverall: { before: input.ivoScoreBefore, after: input.ivoScoreAfter, delta: ivoDelta, direction: ivoDir },
    lensDeltas: input.lensDeltas,
    roi,
    maturity,
    evidenceLevel: evLevel,
    sections,
    proofSentence: proofSentence(input, evLevel),
    disclaimer:
      "Dados fictícios para demonstração. Variações IVO são correlacionais — causalidade requer delineamento experimental controlado. " +
      "Estimativas financeiras baseadas em parâmetros conservadores declarados pelo usuário, não em garantias contratuais.",
  };
}

export const EVIDENCE_LEVEL_LABEL = EVIDENCE_LABEL;
export const DIRECTION_SYMBOL: Record<DeltaDirection, string> = {
  alta: "↑",
  queda: "↓",
  estavel: "→",
};
