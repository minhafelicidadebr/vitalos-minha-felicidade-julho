// Ata de Vitória — engine PURO (Arco da Prova, I-E2). Quando a Reavaliação
// NR-1 REAL mostra que um driver recuou, com a medida de fonte MANTIDA
// (Vigia I-E4) e evidência reportável (k-anon), o driver ganha uma Ata —
// documento da família pgr-document (mesmo idioma de pgr-document-engine.ts
// e plan-document-engine.ts: meta → seções título+corpo → aviso legal) que
// declara o delta com tamanho de efeito HONESTO. Sem delta ou sem manutenção
// → NÃO HÁ ATA — "atividade não é evidência" é o resultado, não um erro.
//
// DECISÃO REGISTRADA (Fable5 §8, verificado contra o código real): o
// blueprint original (Academia Viva 2.0, I4 "Expedições") previa um
// "antagonista" nomeado por driver, ligado via `collectiveNarrative`
// (bestiário) — auditado o repositório, essa camada de Expedições NUNCA foi
// implementada (só a fatia I1 "Sementes Vivas" da Academia Viva 2.0 existe).
// Em vez de inventar nomes de antagonistas sem fonte, a Ata declara o DRIVER
// pelo seu próprio rótulo real do crosswalk (ex.: "Carga & Recuperação
// recuou"). Quando as Expedições existirem de fato, a interface
// driver→antagonista pode ser injetada aqui sem mudar a lógica de vitória.
//
// COMPOSIÇÃO: reusa DriverEvolution de reavaliacao-engine.ts — não redefine
// severidade, risco ou tendência. O limiar de magnitude reusa o MESMO
// "variação relevante" (5 pts) já estabelecido em reavaliacao-engine.
//
// Engine puro: sem React, sem I/O, sem imports de domain/.

import type { DriverEvolution } from "../nr1/reavaliacao-engine";

export type EffectMagnitude = "pequeno" | "moderado" | "amplo";

/** Mesmo limiar de "variação relevante" de reavaliacao-engine.ts (MEANINGFUL). */
export const MEANINGFUL_REDUCTION = 5;

function magnitudeFor(reductionPts: number): EffectMagnitude {
  if (reductionPts < 10) return "pequeno";
  if (reductionPts <= 20) return "moderado";
  return "amplo";
}

// ─── Condição de vitória ──────────────────────────────────────────────────────

export interface VictoryConditionInput {
  driver: DriverEvolution;
  /** true = medida de fonte segue mantida (Vigia I-E4); false = caiu em desuso; undefined = sem atestação. */
  maintained: boolean | undefined;
  participantCount: number;
  kAnonymityMin: number;
}

export type VictoryDenialReason =
  | "no_reduction"
  | "below_meaningful_threshold"
  | "not_maintained"
  | "not_reportable";

export interface VictoryCondition {
  eligible: boolean;
  reason: VictoryDenialReason | null;
}

const REASON_LABEL: Record<VictoryDenialReason, string> = {
  no_reduction: "A exposição não caiu neste driver — sem vitória a declarar.",
  below_meaningful_threshold: `A variação está dentro da margem de ruído (< ${MEANINGFUL_REDUCTION} pts) — sem vitória a declarar.`,
  not_maintained: "A medida de fonte caiu em desuso (ou nunca foi atestada) — a queda não pode ser creditada a ela.",
  not_reportable: "Amostra abaixo do k-anonimato mínimo — resultado protegido, sem vitória a declarar.",
};

export function explainVictoryDenial(reason: VictoryDenialReason): string {
  return REASON_LABEL[reason];
}

/**
 * A condição de vitória — TODAS devem ser verdadeiras: (1) exposição caiu,
 * (2) a queda é maior que o ruído de medição, (3) a medida segue mantida,
 * (4) a amostra é reportável (k-anon). Ausência de atestação de manutenção
 * NÃO é presumida como mantida — mesma doutrina de action-log-engine.
 */
export function evaluateVictoryCondition(input: VictoryConditionInput): VictoryCondition {
  if (input.participantCount < input.kAnonymityMin) {
    return { eligible: false, reason: "not_reportable" };
  }
  if (input.driver.reduction <= 0) {
    return { eligible: false, reason: "no_reduction" };
  }
  if (input.driver.reduction < MEANINGFUL_REDUCTION) {
    return { eligible: false, reason: "below_meaningful_threshold" };
  }
  if (input.maintained !== true) {
    return { eligible: false, reason: "not_maintained" };
  }
  return { eligible: true, reason: null };
}

// ─── A Ata — idioma pgr-document (meta + seções + aviso legal) ──────────────

export interface AtaMeta {
  orgName: string;
  /** Ex.: "2026-t1 → 2026-t2". */
  cycleLabel: string;
  documentId: string;
  generatedAt: string; // ISO
}

export interface AtaSection {
  id: string;
  title: string;
  body: string[];
}

export interface AtaDeVitoria {
  driverId: string;
  meta: AtaMeta;
  sections: AtaSection[];
  legalNotice: string;
}

const LEGAL_NOTICE =
  "Associação orientativa entre medida implementada e queda de exposição medida — correlação, " +
  "não prova de causalidade (Guia MTE 2026 §11.4.4). Agregado protegido por k-anonimato (≥5).";

/**
 * Monta a Ata de Vitória — retorna null quando a condição não é atendida.
 * Nunca inventa vitória; a ausência de Ata é o resultado honesto.
 */
export function buildAtaDeVitoria(input: VictoryConditionInput, meta: AtaMeta): AtaDeVitoria | null {
  const condition = evaluateVictoryCondition(input);
  if (!condition.eligible) return null;

  const { driver, maintained } = input;
  const magnitude = magnitudeFor(driver.reduction);

  const sections: AtaSection[] = [
    {
      id: "identificacao",
      title: "1. Identificação",
      body: [
        `Organização: ${meta.orgName}`,
        `Ciclo: ${meta.cycleLabel}`,
        `Documento: ${meta.documentId}`,
        `Gerado em: ${meta.generatedAt}`,
        `Driver: ${driver.label} (${driver.macroLayer})`,
      ],
    },
    {
      id: "delta",
      title: "2. O que mudou",
      body: [
        `Exposição (${driver.dimensionLabel}): ${driver.firstLoad} → ${driver.lastLoad} (redução de ${driver.reduction} pts).`,
        `Nível de risco: ${driver.firstRisk} → ${driver.lastRisk}.`,
        `Tamanho de efeito: ${magnitude} (limiar de variação relevante: ${MEANINGFUL_REDUCTION} pts).`,
      ],
    },
    {
      id: "manutencao",
      title: "3. Manutenção da medida",
      body: [
        maintained
          ? "A medida de fonte segue em funcionamento — a queda de exposição pode ser associada a ela."
          : "Sem atestação de manutenção — esta Ata não existiria sem a medida confirmada como mantida.",
      ],
    },
    {
      id: "hipotese",
      title: "4. Hipótese de mudança (correlação, não causalidade)",
      body: [
        `No contexto de ${driver.label.toLowerCase()}, a medida implementada teria reduzido a exposição — ` +
          `associação orientativa entre medida e resultado, sem grupo de controle (Guia MTE §11.4.4).`,
      ],
    },
  ];

  return { driverId: driver.driverId, meta, sections, legalNotice: LEGAL_NOTICE };
}
