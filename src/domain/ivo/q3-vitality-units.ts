// Q3 · ponto único de acesso às unidades de Vitalidade (+V).
//
// Só entrega uma unidade APROVADA cuja aprovação registrada corresponde à versão do
// conteúdo e que não carrega códigos de evidência nem safe claims (decisão: aprovada sem
// citação científica). Qualquer outra combinação devolve null — a tela mostra o estado vazio.
import unit001 from "./q3-vitality-unit-001.json";

export type VitalityUnit = typeof unit001;

export const Q3_VITALITY_UNIT_COPY = {
  title: "Educar · prática de Vitalidade aprovada",
  approved: (date: string, version: string) => `Aprovada em revisão editorial (D10) em ${date} · versão ${version}`,
  noClaim: "Sem promessa de efeito: a unidade não cita estudo e não mede vitalidade.",
  empty: "Nenhuma prática de Vitalidade aprovada para esta versão.",
  stepsTitle: "Como fazer",
  recordsTitle: "O que registrar",
  records: { participation: "Participação", execution: "Execução", perceivedChange: "Mudança percebida" },
  limitsTitle: "Limites",
  decisionTitle: "Na revisão, decidir",
  decision: { keep: "Manter", adapt: "Adaptar", end: "Encerrar" },
  checkTitle: "Checagem rápida",
  showOptions: "Ver alternativas",
  correct: "Correto.",
  incorrect: "Ainda não.",
  weeks: (n: number) => `${n} semanas`,
} as const;

export function isPublishableVitalityUnit(u: {
  status: string;
  contentVersion: string;
  evidenceCodes: readonly unknown[];
  safeClaimIds: readonly unknown[];
  curation: { approval: { version: string; approvedOn: string } | null };
}): boolean {
  return (
    u.status === "APROVADO" &&
    u.curation.approval !== null &&
    u.curation.approval.version === u.contentVersion &&
    /^\d{4}-\d{2}-\d{2}$/.test(u.curation.approval.approvedOn) &&
    u.evidenceCodes.length === 0 &&
    u.safeClaimIds.length === 0
  );
}

export function getApprovedVitalityUnit(): VitalityUnit | null {
  return isPublishableVitalityUnit(unit001) ? unit001 : null;
}
