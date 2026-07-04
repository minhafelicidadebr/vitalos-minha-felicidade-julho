// Plano Vivo — enriquecimento §13 do plano trimestral (Arco da Prova, I-T1).
//
// O action-plan-engine agenda semanas e balanceia embaixadorias; este engine
// adiciona o que o Guia MTE 2026 §13 exige de um plano de ação de risco
// psicossocial: RESPONSÁVEL, PRAZO e MÉTRICA por ação — mais a hipótese CMO
// (Pawson & Tilley, 1997: "no contexto X, o mecanismo Y deve produzir Z"),
// que transforma o diff-in-diff do evidence-engine de conta solta em teste de
// hipótese declarada.
//
// GUARDA ESTRUTURAL (risco central do S6, verbatim: "nunca transformar risco
// organizacional em problema individual de resiliência"): o tier de controle
// só aceita a hierarquia NR-01 — eliminação > organização > administrativa >
// monitoramento. NÃO EXISTE tier de resiliência individual; o plano não
// consegue individualizar o risco por construção, não por política.
//
// O MEDIDOR §13 (% de ações com dono+prazo+métrica) é computado aqui — o
// critério de aceite do S6 vira número visível, nunca afirmação.
//
// Engine puro: sem React, sem I/O, sem domain/. Composição por cima do
// QuarterlyPlan existente — os 14 testes do action-plan-engine ficam intactos.

import type { ActionItem, QuarterlyPlan } from "./action-plan-engine";

// ─── Hierarquia NR-01 (os únicos 4 tiers que existem) ───────────────────────

export const CONTROL_TIERS = [
  "eliminacao",
  "organizacao",
  "administrativa",
  "monitoramento",
] as const;

export type ControlTier = (typeof CONTROL_TIERS)[number];

/** Guard de runtime para dados vindos de config/banco. "resiliencia_individual" → false, sempre. */
export function isControlTier(value: unknown): value is ControlTier {
  return typeof value === "string" && (CONTROL_TIERS as readonly string[]).includes(value);
}

// ─── Os campos §13 ───────────────────────────────────────────────────────────

export interface ActionOwner {
  membershipId: string;
  /** Papel exibido — o dono responde pela MEDIDA, nunca pelo risco de ninguém. */
  displayRole: string;
}

export interface ActionMetric {
  label: string;
  baseline: number;
  target: number;
  unit: string;
}

export interface CmoHypothesis {
  context: string;
  mechanism: string;
  outcome: string;
}

/** Accountability de UMA ação — o contrato dos futuros action_items (S6). */
export interface ActionAccountability {
  leverId: string;
  controlTier: ControlTier | null;
  owner: ActionOwner | null;
  /** Data ISO (YYYY-MM-DD) — prazo real, não só semana da temporada. */
  dueOn: string | null;
  metric: ActionMetric | null;
  cmo: CmoHypothesis | null;
}

// ─── Saídas ──────────────────────────────────────────────────────────────────

export type Section13Field = "owner" | "dueOn" | "metric";

export interface EnrichedActionItem extends ActionItem {
  controlTier: ControlTier | null;
  owner: ActionOwner | null;
  dueOn: string | null;
  metric: ActionMetric | null;
  cmo: CmoHypothesis | null;
  /** Guia MTE §13: dono + prazo + métrica presentes e válidos. */
  compliant: boolean;
  missing: Section13Field[];
}

export interface Section13Gauge {
  total: number;
  compliant: number;
  /** 0–100. Plano vazio = 0 (nada a cumprir não é cumprir). */
  pct: number;
  missingByField: Record<Section13Field, number>;
}

export interface EnrichedQuarterlyPlan extends Omit<QuarterlyPlan, "actions"> {
  actions: EnrichedActionItem[];
  gauge: Section13Gauge;
}

// ─── Validações de presença (§13 não aceita campo de fachada) ───────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validOwner(owner: ActionOwner | null): ActionOwner | null {
  if (!owner || !owner.membershipId.trim() || !owner.displayRole.trim()) return null;
  return owner;
}

function validDueOn(dueOn: string | null): string | null {
  if (!dueOn || !ISO_DATE.test(dueOn)) return null;
  return dueOn;
}

function validMetric(metric: ActionMetric | null): ActionMetric | null {
  if (!metric || !metric.label.trim()) return null;
  if (!Number.isFinite(metric.baseline) || !Number.isFinite(metric.target)) return null;
  return metric;
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export function enrichQuarterlyPlan(
  plan: QuarterlyPlan,
  accountability: readonly ActionAccountability[],
): EnrichedQuarterlyPlan {
  const byLever = new Map(accountability.map((a) => [a.leverId, a]));

  const actions: EnrichedActionItem[] = plan.actions.map((action) => {
    const acc = byLever.get(action.leverId);
    const owner = validOwner(acc?.owner ?? null);
    const dueOn = validDueOn(acc?.dueOn ?? null);
    const metric = validMetric(acc?.metric ?? null);
    const controlTier = isControlTier(acc?.controlTier) ? acc!.controlTier : null;

    const missing: Section13Field[] = [];
    if (!owner) missing.push("owner");
    if (!dueOn) missing.push("dueOn");
    if (!metric) missing.push("metric");

    return {
      ...action,
      controlTier,
      owner,
      dueOn,
      metric,
      cmo: acc?.cmo ?? null,
      compliant: missing.length === 0,
      missing,
    };
  });

  const missingByField: Record<Section13Field, number> = { owner: 0, dueOn: 0, metric: 0 };
  for (const action of actions) {
    for (const field of action.missing) missingByField[field] += 1;
  }

  const compliant = actions.filter((a) => a.compliant).length;
  const gauge: Section13Gauge = {
    total: actions.length,
    compliant,
    pct: actions.length === 0 ? 0 : Math.round((compliant / actions.length) * 100),
    missingByField,
  };

  return { ...plan, actions, gauge };
}
