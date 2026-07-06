// Anexo de Asseguração — engine PURO (Dossiê ESG Auditável, I-E1, §F).
//
// Este engine nunca monta o relatório (isso é esg-report-engine.ts) — ele
// AUDITA um conjunto de EsgKpi/MaterialityDeclaration já montado contra as
// regras verbatim do §F3, decidindo o que pode ser PUBLICADO com integridade
// e o que vira lacuna honesta ("medição planejada, ainda não realizada").
//
// COMPOSIÇÃO (Fable5 §5.1): reusa EsgKpi/EsgLineage/MaterialityDeclaration de
// esg-report-engine.ts — zero tipo duplicado. Nunca importa domain/.
//
// F3 · Regras anti-greenwashing (verbatim do blueprint, checadas — nunca
// reescritas por instância):
//   F3.1 "Nenhum indicador sem linhagem" — KPI sem cadeia onda→cápsula→
//        fórmula não publica.
//   F3.2 "Pronto para asseguração ≠ assegurado" — disclaimer obrigatório.
//   F3.3 "Nenhuma afirmação de resultado sem ciclo medido" — claims de
//        melhora/piora exigem ≥2 ciclos registrados no Cofre de Ciclos.
//   F3.4 "Omissão documentada" — dimensão suprimida por k-anon aparece como
//        decisão de privacidade declarada, nunca como lacuna escondida.
//   F3.5 "Equilíbrio GRI" — o que piorou reporta com a mesma tipografia do
//        que melhorou (nenhum filtro seletivo de KPIs desfavoráveis).

import type { EsgKpi, MaterialityDeclaration } from "./esg-report-engine";

export const READY_FOR_ASSURANCE_NOTE =
  "Este relatório organiza evidência com linhagem auditável; não constitui verificação independente.";

// ─── F3.1 · Nenhum indicador sem linhagem ───────────────────────────────────

export function hasCompleteLineage(kpi: EsgKpi): boolean {
  const l = kpi.lineage;
  if (!l) return false;
  return Boolean(
    l.instrument.trim() && l.waveId.trim() && l.capsuleId.trim() && l.n > 0 && l.formula.trim(),
  );
}

export interface LineagePartition {
  /** Linhagem completa — pode entrar no corpo do Dossiê. */
  published: EsgKpi[];
  /** Sem linhagem completa — vira "medição planejada, ainda não realizada". */
  gaps: EsgKpi[];
}

export function partitionKpisByLineage(kpis: readonly EsgKpi[]): LineagePartition {
  const published: EsgKpi[] = [];
  const gaps: EsgKpi[] = [];
  for (const k of kpis) (hasCompleteLineage(k) ? published : gaps).push(k);
  return { published, gaps };
}

// ─── F3.3 · Nenhuma afirmação de resultado sem ciclo medido ─────────────────

/** trend "up"/"down" é uma AFIRMAÇÃO de resultado — exige ≥2 ciclos no Cofre. */
export function canClaimTrend(kpi: EsgKpi, registeredCycleCount: number): boolean {
  if (!kpi.trend || kpi.trend === "flat") return true;
  return registeredCycleCount >= 2;
}

// ─── F3.4 · Omissão documentada ──────────────────────────────────────────────

export function isOmissionDocumented(kpi: EsgKpi): boolean {
  const l = kpi.lineage;
  if (!l || l.kAnonStatus !== "partially_suppressed") return true;
  return Boolean(l.suppressedDimensions && l.suppressedDimensions.length > 0);
}

// ─── F3.5 · Equilíbrio GRI ────────────────────────────────────────────────────
// O conjunto PUBLICADO não pode omitir seletivamente KPIs desfavoráveis (trend
// "down") que tinham linhagem completa e portanto eram publicáveis.

export function isBalancedReporting(
  allKpis: readonly EsgKpi[],
  published: readonly EsgKpi[],
): boolean {
  const downPublishable = allKpis.filter((k) => k.trend === "down" && hasCompleteLineage(k));
  const downPublished = published.filter((k) => k.trend === "down");
  return downPublishable.length === downPublished.length;
}

// ─── F2 · Dupla materialidade — o engine só valida completude ───────────────

export interface MaterialityValidation {
  theme: string;
  valid: boolean;
  missingFields: string[];
}

export function validateMaterialityDeclaration(d: MaterialityDeclaration): MaterialityValidation {
  const missing: string[] = [];
  if (!d.theme.trim()) missing.push("theme");
  if (!Number.isFinite(d.impactRelevance) || d.impactRelevance < 1 || d.impactRelevance > 5) {
    missing.push("impactRelevance");
  }
  if (!Number.isFinite(d.financialRelevance) || d.financialRelevance < 1 || d.financialRelevance > 5) {
    missing.push("financialRelevance");
  }
  if (!d.declaredByRole.trim()) missing.push("declaredByRole");
  if (!d.declaredAt.trim()) missing.push("declaredAt");
  return { theme: d.theme, valid: missing.length === 0, missingFields: missing };
}

// ─── Anexo consolidado ────────────────────────────────────────────────────────

export type GreenwashRuleId =
  | "f3_1_lineage"
  | "f3_2_disclaimer"
  | "f3_3_trend_cycles"
  | "f3_4_omission"
  | "f3_5_balance";

export interface GreenwashCheck {
  rule: GreenwashRuleId;
  label: string;
  passed: boolean;
  detail: string;
}

export interface AssuranceAnnex {
  publishedKpis: EsgKpi[];
  gapKpis: EsgKpi[];
  materialityValidations: MaterialityValidation[];
  checks: GreenwashCheck[];
  allChecksPassed: boolean;
  readyForAssuranceNote: string;
}

/**
 * Audita um conjunto de KPIs e declarações de materialidade contra as 5
 * regras F3 e devolve o que pode publicar. `registeredCycleCount` vem do
 * Cofre de Ciclos (S6.75) — 0 numa demonstração pura, real numa organização.
 */
export function buildAssuranceAnnex(
  kpis: readonly EsgKpi[],
  materiality: readonly MaterialityDeclaration[],
  registeredCycleCount: number,
): AssuranceAnnex {
  const { published, gaps } = partitionKpisByLineage(kpis);

  const trendViolations = published.filter((k) => !canClaimTrend(k, registeredCycleCount));
  const omissionViolations = published.filter((k) => !isOmissionDocumented(k));
  const balanced = isBalancedReporting(kpis, published);
  const materialityValidations = materiality.map(validateMaterialityDeclaration);

  const checks: GreenwashCheck[] = [
    {
      rule: "f3_1_lineage",
      label: "Nenhum indicador sem linhagem",
      passed: published.every(hasCompleteLineage),
      detail:
        gaps.length > 0
          ? `${gaps.length} indicador(es) sem linhagem completa — movido(s) para a seção de lacunas, nunca publicado(s).`
          : "Todos os indicadores publicados têm linhagem completa (onda → cápsula → fórmula).",
    },
    {
      rule: "f3_2_disclaimer",
      label: "Pronto para asseguração ≠ assegurado",
      passed: true,
      detail: READY_FOR_ASSURANCE_NOTE,
    },
    {
      rule: "f3_3_trend_cycles",
      label: "Nenhuma afirmação de resultado sem ciclo medido",
      passed: trendViolations.length === 0,
      detail:
        trendViolations.length > 0
          ? `${trendViolations.length} indicador(es) afirmam tendência sem 2 ciclos registrados no Cofre.`
          : `Ciclos registrados no Cofre: ${registeredCycleCount}. Toda afirmação de tendência está lastreada.`,
    },
    {
      rule: "f3_4_omission",
      label: "Omissão documentada",
      passed: omissionViolations.length === 0,
      detail:
        omissionViolations.length > 0
          ? `${omissionViolations.length} indicador(es) com supressão k-anon sem documentar quais dimensões foram omitidas.`
          : "Nenhuma supressão k-anon sem documentação — omissão é sempre decisão declarada.",
    },
    {
      rule: "f3_5_balance",
      label: "Equilíbrio GRI",
      passed: balanced,
      detail: balanced
        ? "Indicadores desfavoráveis (tendência de piora) recebem a mesma tipografia dos favoráveis."
        : "Indicador(es) com tendência de piora e linhagem completa foram omitidos do corpo publicado.",
    },
  ];

  return {
    publishedKpis: published,
    gapKpis: gaps,
    materialityValidations,
    checks,
    allChecksPassed: checks.every((c) => c.passed) && materialityValidations.every((m) => m.valid),
    readyForAssuranceNote: READY_FOR_ASSURANCE_NOTE,
  };
}
