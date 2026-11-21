// Guia da Jornada · funções puras: entrada de "Meu percurso" e regra de CTA operacional.
// Nada aqui lê sessão, banco ou navegador: o contexto chega montado pelo SERVIDOR.
import registry from "@/domain/guide/guide-availability.json";
import type { AvailabilityEntry, AvailabilityLevel, GuideLens, GuidePerspective } from "@/domain/guide/guide-types";

export interface GuideTask {
  lens: GuideLens;
  id: string;
  title: string;
  status: "planejada" | "em_execucao" | "concluida" | "cancelada" | string;
  dueOn: string | null;
  /** Prioridade reconhecida pelo fluxo existente. O Q2 atual não define nenhuma. */
  prioritized?: boolean;
  capability: string;
  recipient: string;
}

export interface GuideServerContext {
  perspective: GuidePerspective;
  roleLabel: string;
  /** Lentes cujo conteúdo operacional está disponível ao perfil nesta organização. */
  availableLenses: GuideLens[];
  activeStage: GuideLens | null;
  tasks: GuideTask[];
  /** Capacidades que o servidor confirmou para ESTA sessão (ex.: membro do Q2). */
  grantedCapabilities: string[];
  environment: string;
}

export type GuideEntry =
  | { kind: "task"; task: GuideTask }
  | { kind: "stage"; lens: GuideLens }
  | { kind: "map"; reason: "no_context" | "several_tasks" | "no_stage"; options: { kind: "task" | "stage"; label: string; lens: GuideLens; taskId?: string }[] };

const ACTIONABLE = new Set(["planejada", "em_execucao"]);

/** Ordem da V2.1 §3: tarefa acionável com prioridade reconhecida → etapa ativa → mapa. */
export function resolveGuideEntry(ctx: GuideServerContext | null): GuideEntry {
  if (!ctx) return { kind: "map", reason: "no_context", options: [] };
  const actionable = ctx.tasks.filter((t) => ACTIONABLE.has(t.status));
  const prioritized = actionable.filter((t) => t.prioritized);
  if (prioritized.length === 1) return { kind: "task", task: prioritized[0]! };
  if (prioritized.length === 0 && actionable.length === 1) return { kind: "task", task: actionable[0]! };
  const stageOk = ctx.activeStage !== null && ctx.availableLenses.includes(ctx.activeStage);
  if (actionable.length > 1) {
    return {
      kind: "map",
      reason: "several_tasks",
      options: [
        ...actionable.map((t) => ({ kind: "task" as const, label: t.title, lens: t.lens, taskId: t.id })),
        ...(stageOk ? [{ kind: "stage" as const, label: `Etapa ativa: ${ctx.activeStage}`, lens: ctx.activeStage! }] : []),
      ],
    };
  }
  if (stageOk) return { kind: "stage", lens: ctx.activeStage! };
  return {
    kind: "map",
    reason: "no_stage",
    options: ctx.availableLenses.map((lens) => ({ kind: "stage" as const, label: `Ver ${lens}`, lens })),
  };
}

const ENTRIES = (registry as { entries: AvailabilityEntry[] }).entries;

export function availabilityEntry(id: string): AvailabilityEntry | undefined {
  return ENTRIES.find((e) => e.id === id);
}

export function allAvailabilityEntries(): readonly AvailabilityEntry[] {
  return ENTRIES;
}

/** Nível efetivo no ambiente atual: `ambiente` só quando o ambiente foi verificado. */
export function effectiveLevel(id: string, environment: string): AvailabilityLevel | null {
  const e = availabilityEntry(id);
  if (!e) return null;
  return e.verifiedIn.includes(environment) ? "ambiente" : e.level;
}

export function statusLabel(level: AvailabilityLevel | null): "Disponível" | "Em preparação" {
  return level === "ambiente" ? "Disponível" : "Em preparação";
}

/**
 * CTA operacional: só com fluxo comprovado NO AMBIENTE e capacidade confirmada pelo
 * servidor PARA ESTA SESSÃO. A perspectiva escolhida na leitura não entra na decisão.
 */
export function operationalCta(
  capability: string | undefined,
  ctx: Pick<GuideServerContext, "grantedCapabilities" | "environment"> | null,
): { label: string; href: string } | null {
  if (!capability || !ctx) return null;
  const e = availabilityEntry(capability);
  if (!e || !e.route || !e.ctaLabel) return null;
  if (effectiveLevel(capability, ctx.environment) !== "ambiente") return null;
  if (!ctx.grantedCapabilities.includes(capability)) return null;
  return { label: e.ctaLabel, href: e.route };
}
