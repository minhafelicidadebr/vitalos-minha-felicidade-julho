// ESG Report engine — puro. Sintetiza o ANO inteiro num Relatório Global ESG:
// organiza KPIs por dimensão E/S/G, cada um rastreável ao instrumento de origem
// (IVO/PERMA · VIA-T · FIB-T · COPSOQ) e a um ODS. Não computa medições novas —
// COMPÕE as saídas dos motores numa narrativa longitudinal de board. Nunca
// importa de domain/. É o "Q5" do ciclo: a prova consolidada do ano.

export type EsgDimension = "E" | "S" | "G";

// ─── Linhagem (Dossiê ESG Auditável, I-E1, §F1) ────────────────────────────────
// Extensão RETROCOMPATÍVEL: `lineage` é opcional — KPIs sem linhagem continuam
// funcionando exatamente como antes (buildAnnualEsgReport nunca a exige). A
// checagem "KPI sem linhagem não publica" (§F3.1) vive em assurance-annex-engine,
// não aqui — este engine continua sem saber o que é "publicável".

export interface EsgLineage {
  instrument: string;
  waveId: string;
  capsuleId: string;
  n: number;
  kAnonStatus: "ok" | "partially_suppressed";
  /** Dimensões omitidas por k-anon — declaradas, nunca escondidas (§F3.4). */
  suppressedDimensions?: string[];
  /** A conta, visível — idioma do Vitality P&L (nunca "caixa preta"). */
  formula: string;
}

export interface EsgKpi {
  id: string;
  label: string;
  valueNorm: number; // 0–1000 (para agregação entre dimensões)
  display: string; // exibição humana (ex.: "640 / 1000", "2,8 / 4")
  source: string; // instrumento de origem (rastreabilidade)
  dim: EsgDimension;
  ods?: string; // ex.: "ODS 3"
  trend?: "up" | "down" | "flat";
  /** Cadeia onda→cápsula→fórmula que gerou o número — clique e veja a origem. */
  lineage?: EsgLineage;
}

// ─── Dupla materialidade declarada (§F2) ───────────────────────────────────────
// O engine só passa a declaração adiante e nunca a infere — quem declara é a
// organização (autor + data), sempre.

export interface MaterialityDeclaration {
  theme: string;
  /** 1..5 — declarado pela organização, nunca inferido pelo engine. */
  impactRelevance: number;
  financialRelevance: number;
  declaredByRole: string;
  declaredAt: string; // ISO "YYYY-MM-DD"
}

export interface QuarterSummary {
  quarter: string; // "T1".."T4"
  lensName: string;
  instrument: string;
  highlight: string;
}

export interface MethodologyEntry {
  instrument: string;
  measures: string;
  science: string;
}

export interface AnnualEsgReportInput {
  year: number;
  orgName: string;
  kpis: EsgKpi[];
  journey: QuarterSummary[];
  proof: {
    experimentsConcluded: number;
    experimentsConfirmed: number;
    sealLabel: string;
    sealGranted: boolean;
  };
  methodology: MethodologyEntry[];
  overallReadiness?: number | null; // do esg-engine; se ausente, média das dimensões
  /** Declarações de materialidade dupla (§F2) — opcional, propagada sem alteração. */
  materiality?: MaterialityDeclaration[];
}

export interface EsgDimensionReport {
  dim: EsgDimension;
  label: string;
  score: number | null; // 0–1000, média dos KPIs da dimensão
  bandLabel: string | null;
  kpis: EsgKpi[];
  narrative: string;
}

export interface AnnualEsgReport {
  year: number;
  orgName: string;
  overallReadiness: number | null;
  overallBandLabel: string | null;
  headline: string;
  dimensions: EsgDimensionReport[];
  journey: QuarterSummary[];
  proof: AnnualEsgReportInput["proof"];
  odsCovered: string[];
  methodology: MethodologyEntry[];
  materiality: MaterialityDeclaration[];
}

const DIM_LABEL: Record<EsgDimension, string> = {
  E: "Ambiental",
  S: "Social",
  G: "Governança",
};

const DIM_ORDER: EsgDimension[] = ["E", "S", "G"];

function bandLabel(score: number | null): string | null {
  if (score === null) return null;
  if (score >= 800) return "Referência";
  if (score >= 650) return "Consolidando";
  if (score >= 350) return "Em progresso";
  return "Inicial";
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

function dimensionNarrative(dim: EsgDimension, score: number | null, kpis: EsgKpi[]): string {
  if (score === null || kpis.length === 0) {
    return `Dimensão ${DIM_LABEL[dim]} ainda sem indicadores mensuráveis neste ciclo.`;
  }
  const sources = Array.from(new Set(kpis.map((k) => k.source))).join(", ");
  const tone =
    score >= 650
      ? "consolidada — sustentar e comprovar"
      : score >= 350
        ? "em progresso — há lacunas endereçáveis"
        : "inicial — prioridade de atenção";
  return `${DIM_LABEL[dim]} ${tone}. ${kpis.length} indicador(es) de ${sources}, prontidão ${score}/1000.`;
}

export function buildAnnualEsgReport(input: AnnualEsgReportInput): AnnualEsgReport {
  const dimensions: EsgDimensionReport[] = DIM_ORDER.map((dim) => {
    const kpis = input.kpis.filter((k) => k.dim === dim);
    const score = avg(kpis.map((k) => k.valueNorm));
    return {
      dim,
      label: DIM_LABEL[dim],
      score,
      bandLabel: bandLabel(score),
      kpis,
      narrative: dimensionNarrative(dim, score, kpis),
    };
  });

  const dimScores = dimensions.map((d) => d.score).filter((s): s is number => s !== null);
  const overallReadiness = input.overallReadiness ?? (dimScores.length ? avg(dimScores) : null);
  const overallBandLabel = bandLabel(overallReadiness);

  const odsCovered = Array.from(
    new Set(input.kpis.map((k) => k.ods).filter((o): o is string => Boolean(o))),
  ).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10);
    const nb = parseInt(b.replace(/\D/g, ""), 10);
    return na - nb;
  });

  const headline = buildHeadline(input, overallReadiness, overallBandLabel);

  return {
    year: input.year,
    orgName: input.orgName,
    overallReadiness,
    overallBandLabel,
    headline,
    dimensions,
    journey: input.journey,
    proof: input.proof,
    odsCovered,
    methodology: input.methodology,
    materiality: input.materiality ?? [],
  };
}

function buildHeadline(
  input: AnnualEsgReportInput,
  overall: number | null,
  band: string | null,
): string {
  const proofPhrase =
    input.proof.experimentsConcluded > 0
      ? `${input.proof.experimentsConfirmed}/${input.proof.experimentsConcluded} transformações comprovadas`
      : "primeiras transformações em curso";
  const sealPhrase = input.proof.sealGranted
    ? `Selo ${input.proof.sealLabel} ativo`
    : `${input.proof.sealLabel} (selo em jornada)`;
  const readinessPhrase =
    overall !== null ? `prontidão social ${overall}/1000 (${band})` : "prontidão em construção";
  return `Ano ${input.year}: ${readinessPhrase}, ${proofPhrase}, ${sealPhrase}. A vitalidade virou evidência ESG auditável.`;
}
