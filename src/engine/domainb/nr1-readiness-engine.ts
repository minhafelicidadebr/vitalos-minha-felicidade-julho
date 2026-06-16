// NR-1 readiness engine — puro. Síntese EDUCATIVA da prontidão para o Domínio B:
// compõe as faixas do COPSOQ, a exposição do inventário de riscos e o avanço do
// checklist GRO num resumo para o conselho/CIPA — SEM jamais constituir PGR ou
// laudo. Fronteira inegociável: organiza evidências preparatórias, não substitui o
// profissional legalmente habilitado. Domínio A nunca entra aqui. Nunca importa de
// domain/ (recebe formas simples, agnósticas).

export type CopsoqBand = "favorável" | "intermediário" | "risco";
export type RiskExposure = "baixa" | "moderada" | "alta";

export interface NR1Input {
  copsoqDimensions: Array<{ band: CopsoqBand }>;
  riskExposures: Array<{ exposure: RiskExposure; actionsOpen: number }>;
  checklist: Array<{ done: boolean }>;
}

export interface NR1Readiness {
  dimensionsByBand: Record<CopsoqBand, number>;
  riskDimensions: number; // dimensões COPSOQ em faixa de risco
  highExposureRisks: number; // categorias com exposição alta
  openActions: number;
  checklistDone: number;
  checklistTotal: number;
  checklistPct: number;
  readinessNote: string;
}

export function summarizeNR1Readiness(input: NR1Input): NR1Readiness {
  const dimensionsByBand: Record<CopsoqBand, number> = {
    favorável: 0,
    intermediário: 0,
    risco: 0,
  };
  for (const d of input.copsoqDimensions) dimensionsByBand[d.band] += 1;

  const riskDimensions = dimensionsByBand.risco;
  const highExposureRisks = input.riskExposures.filter((r) => r.exposure === "alta").length;
  const openActions = input.riskExposures.reduce((s, r) => s + r.actionsOpen, 0);

  const checklistTotal = input.checklist.length;
  const checklistDone = input.checklist.filter((c) => c.done).length;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const attention = riskDimensions + highExposureRisks;
  const readinessNote =
    attention > 0
      ? `Há ${riskDimensions} dimensão(ões) em faixa de risco e ${highExposureRisks} categoria(s) de exposição alta, com ${openActions} ação(ões) em aberto. Este material é preparatório — cabe ao profissional legalmente habilitado conduzir a avaliação e o PGR nos termos da NR-1.`
      : `Nenhuma dimensão em faixa de risco no recorte agregado, com ${openActions} ação(ões) em aberto. Mesmo favorável, a leitura formal para o PGR cabe ao profissional legalmente habilitado.`;

  return {
    dimensionsByBand,
    riskDimensions,
    highExposureRisks,
    openActions,
    checklistDone,
    checklistTotal,
    checklistPct,
    readinessNote,
  };
}
