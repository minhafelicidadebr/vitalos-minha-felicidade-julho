// Evidence Explorer Engine — busca, filtro e agregação sobre o corpus
// congelado de evidência (LD-005, Fatia A).
// ADR: docs/learning/PLANO_EVIDENCE_EXPLORER_LD005_2026-07-22.md.
//
// Doutrina (LD-005): o explorador só TORNA VISÍVEL o que o registro congelado
// já autoriza — nunca cria, corrige ou completa nada.
// - "nenhum DOI inventado" (acceptanceCriteria): campo ausente permanece
//   ausente; este motor jamais preenche placeholder;
// - fail-closed: estudo reprovado no trustGate nunca entra na lista utilizável;
// - o texto exibido continua vindo de buildPassport (que já garante que o nível
//   humano não vê jargão) — este motor só decide QUAIS estudos aparecem;
// - sem IA, sem I/O, sem persistência.
//
// Engine puro: sem React, sem I/O, sem import de src/domain.

import { trustGate, type EvidenceStudy } from "./passport-engine";

// ─── Normalização de busca ───────────────────────────────────────────────────

/** Normaliza para busca: minúsculas, sem acento, espaços colapsados. Só afeta
 * a COMPARAÇÃO — o conteúdo exibido nunca é alterado. */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Filtro ──────────────────────────────────────────────────────────────────

export interface ExplorerFilters {
  /** Eixo (origin_driver) exato; ausente/vazio = todos. */
  axis?: string;
  /** Busca livre em citação, safe_claim, eixo, study_id e aliases. */
  query?: string;
  /** Quando true, remove os que não passam no trustGate (default: true). */
  onlyTrusted?: boolean;
}

/** Campos varridos pela busca — citação, claim, eixo, id e aliases. */
function searchableText(study: EvidenceStudy): string {
  return normalizeForSearch(
    [
      study.canonical_citation,
      study.safe_claim,
      study.origin_driver,
      study.study_id,
      ...study.aliases,
      ...study.mechanisms,
    ].join(" "),
  );
}

/** Filtra o corpus. Determinístico: preserva a ordem de entrada, nunca embaralha.
 * Fail-closed por padrão — só devolve estudos confiáveis, a menos que o chamador
 * peça explicitamente o contrário (ex.: uma tela de auditoria interna). */
export function filterStudies(
  studies: readonly EvidenceStudy[],
  filters: ExplorerFilters = {},
): EvidenceStudy[] {
  const onlyTrusted = filters.onlyTrusted ?? true;
  const axis = filters.axis?.trim();
  const query = filters.query ? normalizeForSearch(filters.query) : "";

  return studies.filter((study) => {
    if (onlyTrusted && !trustGate(study).trusted) return false;
    if (axis && study.origin_driver !== axis) return false;
    if (query && !searchableText(study).includes(query)) return false;
    return true;
  });
}

// ─── Agregação por eixo ──────────────────────────────────────────────────────

export interface AxisCount {
  axis: string;
  count: number;
}

/** Contagem por eixo, ordenada do maior para o menor e, em empate, alfabética
 * (determinístico — a UI de filtros nunca "pula" entre renders). */
export function groupByAxis(studies: readonly EvidenceStudy[]): AxisCount[] {
  const counts = new Map<string, number>();
  for (const study of studies) {
    counts.set(study.origin_driver, (counts.get(study.origin_driver) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([axis, count]) => ({ axis, count }))
    .sort((a, b) => b.count - a.count || a.axis.localeCompare(b.axis));
}

// ─── Resumo honesto do corpus ────────────────────────────────────────────────

export interface ExplorerSummary {
  total: number;
  /** Passam no trustGate. */
  trusted: number;
  /** Confiáveis, mas que EXIGEM ressalva registrada (C3/V2). */
  requiringCaveat: number;
  /** Reprovados no trustGate — existem no arquivo, mas não são utilizáveis. */
  blocked: number;
  /** Quantos declaram DOI. O restante NÃO ganha placeholder — some, e a
   * diferença fica visível aqui em vez de ser disfarçada. */
  withDoi: number;
  axes: number;
}

export function explorerSummary(studies: readonly EvidenceStudy[]): ExplorerSummary {
  let trusted = 0;
  let requiringCaveat = 0;
  let blocked = 0;
  let withDoi = 0;

  for (const study of studies) {
    const gate = trustGate(study);
    if (gate.trusted) {
      trusted += 1;
      if (gate.requiredCaveat) requiringCaveat += 1;
    } else {
      blocked += 1;
    }
    if (study.doi) withDoi += 1;
  }

  return {
    total: studies.length,
    trusted,
    requiringCaveat,
    blocked,
    withDoi,
    axes: groupByAxis(studies).length,
  };
}

// ─── Leitura de um estudo na listagem ────────────────────────────────────────

export interface ExplorerRow {
  studyId: string;
  citation: string;
  axis: string;
  /** null quando o registro não traz DOI — NUNCA um placeholder inventado. */
  doi: string | null;
  /** Ressalva obrigatória (C3/V2) ou null. A UI não pode omiti-la. */
  requiredCaveat: string | null;
}

/** Projeta o estudo para a listagem. Só reproduz o que está no registro —
 * campo ausente continua ausente (invariante "nenhum DOI inventado"). */
export function toExplorerRow(study: EvidenceStudy): ExplorerRow {
  const gate = trustGate(study);
  return {
    studyId: study.study_id,
    citation: study.canonical_citation,
    axis: study.origin_driver,
    doi: study.doi ?? null,
    requiredCaveat: gate.requiredCaveat,
  };
}
