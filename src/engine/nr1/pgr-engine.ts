// PGR Psicossocial — engine PURO. Fecha o eixo TRANSFORMAR do M.E.T.E. na lane NR-1: dada a
// exposição psicossocial MEDIDA (COPSOQ agregado, k-anon a montante) e o crosswalk canônico,
// monta um Programa de Gerenciamento de Riscos psicossociais no formato NR-01 — inventário de
// riscos classificados (matriz probabilidade × severidade), medidas de controle na HIERARQUIA
// NR-01 (eliminação → organização → administrativa → monitoramento) com responsável, prazo e
// status, e risco residual estimado.
//
// COMPOSIÇÃO (não acumulação): reusa `rankDriversByExposure` do crosswalk-engine para a
// probabilidade medida e a ordenação, e lê a severidade das próprias células prioritárias do
// registro. NÃO recalcula exposição nem reinventa o catálogo de drivers.
//
// Engine ≠ Domínio: recebe registro + exposições + sementes de medida como parâmetro; não conhece
// setor nem vocabulário. Determinístico, sem React, sem I/O.
//
// HONESTIDADE (Fable 5 §8 + NR-01): a hierarquia de controle SEMPRE começa na organização do
// trabalho (eliminação/redução na fonte) — nunca em medida individual que "culpa" a pessoa. O
// risco residual é estimativa orientativa, não promessa. Desfechos (burnout, comportamentos
// ofensivos) são EFEITO no Domínio B e nunca viram "driver de risco" aqui — só os fatores
// (drivers) entram no inventário, garantido pelo registro (`isOutcome` não tem célula de driver).

import {
  rankDriversByExposure,
  type CrosswalkRegistry,
  type DimensionExposure,
} from "./crosswalk-engine";

// ─── Tipos de classificação NR-01 ──────────────────────────────────────────────

export type RiskLevel = "baixo" | "moderado" | "alto" | "critico";
export type ProbabilityBand = "baixa" | "media" | "alta" | "muito_alta";
export type SeverityBand = "leve" | "moderada" | "alta" | "severa";

/** Hierarquia de controle NR-01 (ordem = precedência: fonte primeiro, indivíduo nunca isolado). */
export type ControlTier = "eliminacao" | "organizacao" | "administrativa" | "monitoramento";
export type MeasureHorizon = "curto" | "medio" | "estrutural";
export type MeasureStatus = "planejada" | "em_andamento" | "implementada";

// ─── Entradas ───────────────────────────────────────────────────────────────────

/** Semente de medida de controle (mock de domínio) — uma ação organizacional por driver. */
export interface PgrMeasureSeed {
  driverId: string;
  tier: ControlTier;
  /** A ação concreta sobre a organização do trabalho. */
  action: string;
  /** Quem responde pela medida (RH, Liderança, CIPA, SESMT, Alta Direção…). */
  responsible: string;
  /** Fonte/embasamento opcional (anti-alucinação; ecoa o gate G1 do copiloto). */
  evidence?: string;
}

export interface PgrInput {
  registry: CrosswalkRegistry;
  exposures: DimensionExposure[];
  measures: PgrMeasureSeed[];
  /** Data de geração do programa (ISO). */
  generatedAt: string;
  /** Semana atual dentro do horizonte (1-based) — deriva o status das medidas. */
  currentWeek?: number;
  /** Horizonte do ciclo em semanas (default 13 = um trimestre M.E.T.E.). */
  horizonWeeks?: number;
  /** Quantos riscos priorizados exibir no programa (default 5). */
  topRisks?: number;
}

// ─── Saídas ───────────────────────────────────────────────────────────────────

export interface PgrMeasure {
  tier: ControlTier;
  horizon: MeasureHorizon;
  action: string;
  responsible: string;
  evidence: string | null;
  /** Semana-alvo de conclusão dentro do horizonte. */
  dueWeek: number;
  status: MeasureStatus;
}

export interface PgrRisk {
  driverId: string;
  label: string;
  macroLayer: string;
  riskLevel: RiskLevel;
  /** Pontuação 1..16 da matriz (probabilidade × severidade). */
  riskScore: number;
  probability: ProbabilityBand;
  severity: SeverityBand;
  /** Exposição medida da dimensão COPSOQ mais forte do driver (0..100). */
  load: number;
  topDimension: { id: string; label: string; load: number } | null;
  /** Hipótese da célula prioritária mais severa (orientação, não diagnóstico). */
  hypothesis: string | null;
  evidence: string | null;
  measures: PgrMeasure[];
  /** Risco residual estimado após as medidas planejadas (honesto: estimativa). */
  residual: RiskLevel;
}

export interface PgrSummary {
  total: number;
  critico: number;
  alto: number;
  moderado: number;
  baixo: number;
  measuresTotal: number;
  measuresImplemented: number;
  /** Cobertura de execução 0..1 (medidas implementadas / total). */
  coverage: number;
  /** Maior risco residual remanescente no programa. */
  topResidual: RiskLevel;
}

export interface PgrPlan {
  generatedAt: string;
  horizonWeeks: number;
  currentWeek: number;
  risks: PgrRisk[];
  /** Drivers expostos além do topRisks (não detalhados, mas contados). */
  hiddenRiskCount: number;
  summary: PgrSummary;
  disclaimer: string;
}

// ─── Rótulos (para a camada de UI; o engine não impõe vocabulário de tela) ──────

export const RISK_LABEL: Record<RiskLevel, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
};

export const PROBABILITY_LABEL: Record<ProbabilityBand, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  muito_alta: "Muito alta",
};

export const SEVERITY_LABEL: Record<SeverityBand, string> = {
  leve: "Leve",
  moderada: "Moderada",
  alta: "Alta",
  severa: "Severa",
};

export const TIER_LABEL: Record<ControlTier, string> = {
  eliminacao: "Eliminação na fonte",
  organizacao: "Organização do trabalho",
  administrativa: "Medida administrativa",
  monitoramento: "Monitoramento",
};

export const HORIZON_LABEL: Record<MeasureHorizon, string> = {
  curto: "Curto prazo",
  medio: "Médio prazo",
  estrutural: "Estrutural",
};

export const STATUS_LABEL: Record<MeasureStatus, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  implementada: "Implementada",
};

// ─── Constantes da matriz e do scheduling ───────────────────────────────────────

const TIER_RANK: Record<ControlTier, number> = {
  eliminacao: 0,
  organizacao: 1,
  administrativa: 2,
  monitoramento: 3,
};

/** Fonte = medida que ataca a causa na organização do trabalho (não o indivíduo). */
const SOURCE_TIERS: ReadonlySet<ControlTier> = new Set<ControlTier>(["eliminacao", "organizacao"]);

const TIER_HORIZON: Record<ControlTier, MeasureHorizon> = {
  eliminacao: "estrutural",
  organizacao: "medio",
  administrativa: "curto",
  monitoramento: "curto",
};

const HORIZON_WEEKS: Record<MeasureHorizon, number> = {
  curto: 4,
  medio: 9,
  estrutural: 13,
};

const HORIZON_DURATION: Record<MeasureHorizon, number> = {
  curto: 4,
  medio: 5,
  estrutural: 6,
};

const RISK_RANK: Record<RiskLevel, number> = { baixo: 0, moderado: 1, alto: 2, critico: 3 };
const RISK_BY_RANK: RiskLevel[] = ["baixo", "moderado", "alto", "critico"];

// ─── Classificadores puros ──────────────────────────────────────────────────────

interface Band<T> {
  band: T;
  score: number;
}

/** Probabilidade a partir da exposição medida (0..100; alto = pior). */
export function probabilityFromLoad(load: number): Band<ProbabilityBand> {
  if (load >= 75) return { band: "muito_alta", score: 4 };
  if (load >= 60) return { band: "alta", score: 3 };
  if (load >= 40) return { band: "media", score: 2 };
  return { band: "baixa", score: 1 };
}

/**
 * Severidade a partir da célula prioritária mais forte do driver (P0/crítico = mais severo).
 * Exportado para composição: o reavaliacao-engine lê a mesma severidade canônica, sem duplicar.
 */
export function driverSeverity(
  registry: CrosswalkRegistry,
  driverId: string,
): { band: SeverityBand; score: number; hypothesis: string | null; evidence: string | null } {
  const signals = registry.cells
    .filter((c) => c.driverId === driverId && c.priority)
    .map((c) => ({
      cell: c,
      sev: c.critical ? 4 : c.priority === "P0" ? 3 : c.priority === "P1" ? 2 : 1,
    }))
    .sort((a, b) => b.sev - a.sev || b.cell.strength - a.cell.strength);

  const top = signals[0];
  const score = top?.sev ?? 1;
  const band: SeverityBand =
    score >= 4 ? "severa" : score === 3 ? "alta" : score === 2 ? "moderada" : "leve";
  return {
    band,
    score,
    hypothesis: top?.cell.hypothesis ?? null,
    evidence: top?.cell.evidence ?? null,
  };
}

/** Nível de risco da matriz NR-01 5×5 reduzida (probabilidade × severidade → 1..16). */
export function classifyRisk(probabilityScore: number, severityScore: number): {
  level: RiskLevel;
  score: number;
} {
  const score = probabilityScore * severityScore;
  const level: RiskLevel =
    score >= 12 ? "critico" : score >= 8 ? "alto" : score >= 4 ? "moderado" : "baixo";
  return { level, score };
}

function deriveStatus(dueWeek: number, duration: number, currentWeek: number): MeasureStatus {
  if (currentWeek > dueWeek) return "implementada";
  if (currentWeek >= dueWeek - duration + 1) return "em_andamento";
  return "planejada";
}

/**
 * Risco residual estimado (honesto): medidas de FONTE (eliminação/organização) é que reduzem
 * risco de verdade. Se há medida de fonte e todas as medidas do risco foram implementadas →
 * cai 2 níveis; se há fonte e parte foi implementada → cai 1 nível; sem fonte ou sem execução →
 * permanece. Nunca abaixo de "baixo". É estimativa orientativa, não promessa.
 */
function residualRisk(level: RiskLevel, measures: PgrMeasure[]): RiskLevel {
  if (measures.length === 0) return level;
  const hasSource = measures.some((m) => SOURCE_TIERS.has(m.tier));
  if (!hasSource) return level;
  const implemented = measures.filter((m) => m.status === "implementada").length;
  if (implemented === 0) return level;
  const drop = implemented === measures.length ? 2 : 1;
  const idx = Math.max(0, RISK_RANK[level] - drop);
  return RISK_BY_RANK[idx]!;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function buildPgrPlan(input: PgrInput): PgrPlan {
  const {
    registry,
    exposures,
    measures,
    generatedAt,
    currentWeek = 1,
    horizonWeeks = 13,
    topRisks = 5,
  } = input;

  // Probabilidade medida + ordenação vêm do crosswalk-engine (Medir→Transformar).
  const needs = rankDriversByExposure(registry, exposures);
  const driverById = new Map(registry.drivers.map((d) => [d.id, d]));
  const measuresByDriver = new Map<string, PgrMeasureSeed[]>();
  for (const m of measures) {
    const list = measuresByDriver.get(m.driverId) ?? [];
    list.push(m);
    measuresByDriver.set(m.driverId, list);
  }

  // Só drivers com exposição medida (score > 0) entram no inventário de risco.
  const exposed = needs.filter((n) => n.score > 0);
  const selected = exposed.slice(0, topRisks);

  const risks: PgrRisk[] = selected.map((need, riskIndex) => {
    const driver = driverById.get(need.driverId)!;
    const load = need.topDimension?.load ?? 0;
    const prob = probabilityFromLoad(load);
    const sev = driverSeverity(registry, need.driverId);
    const { level, score } = classifyRisk(prob.score, sev.score);

    // Medidas na hierarquia NR-01 (fonte primeiro). Riscos mais altos começam mais cedo.
    const seeds = (measuresByDriver.get(need.driverId) ?? [])
      .slice()
      .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);

    const planMeasures: PgrMeasure[] = seeds.map((seed) => {
      const horizon = TIER_HORIZON[seed.tier];
      // Antecipa em até 2 semanas os riscos de topo (riskIndex 0 = mais prioritário).
      const lead = Math.max(0, 2 - riskIndex);
      const dueWeek = Math.min(horizonWeeks, Math.max(1, HORIZON_WEEKS[horizon] - lead));
      const duration = HORIZON_DURATION[horizon];
      return {
        tier: seed.tier,
        horizon,
        action: seed.action,
        responsible: seed.responsible,
        evidence: seed.evidence ?? null,
        dueWeek,
        status: deriveStatus(dueWeek, duration, currentWeek),
      };
    });

    return {
      driverId: driver.id,
      label: driver.label,
      macroLayer: driver.macroLayer,
      riskLevel: level,
      riskScore: score,
      probability: prob.band,
      severity: sev.band,
      load,
      topDimension: need.topDimension,
      hypothesis: sev.hypothesis,
      evidence: sev.evidence,
      measures: planMeasures,
      residual: residualRisk(level, planMeasures),
    };
  });

  const allMeasures = risks.flatMap((r) => r.measures);
  const measuresImplemented = allMeasures.filter((m) => m.status === "implementada").length;
  const summary: PgrSummary = {
    total: risks.length,
    critico: risks.filter((r) => r.riskLevel === "critico").length,
    alto: risks.filter((r) => r.riskLevel === "alto").length,
    moderado: risks.filter((r) => r.riskLevel === "moderado").length,
    baixo: risks.filter((r) => r.riskLevel === "baixo").length,
    measuresTotal: allMeasures.length,
    measuresImplemented,
    coverage:
      allMeasures.length === 0
        ? 0
        : Math.round((measuresImplemented / allMeasures.length) * 100) / 100,
    topResidual: risks.reduce<RiskLevel>(
      (acc, r) => (RISK_RANK[r.residual] > RISK_RANK[acc] ? r.residual : acc),
      "baixo",
    ),
  };

  return {
    generatedAt,
    horizonWeeks,
    currentWeek,
    risks,
    hiddenRiskCount: Math.max(0, exposed.length - selected.length),
    summary,
    disclaimer:
      "Programa educativo e orientativo derivado da exposição psicossocial medida (COPSOQ agregado, " +
      "k-anonimato ≥ 5). Estrutura inspirada na NR-01 (GRO/PGR) — não substitui o PGR formal nem a " +
      "avaliação de profissional legalmente habilitado. O risco residual é estimativa, não promessa.",
  };
}
