// Server-only: usa supabaseAdmin (service role) para chamar as 5 RPCs do
// Ledger de Transformação (migration 20260705100000_action_plan_ledger.sql).
// Seguro apenas em .server.ts — não importar em código de cliente.
//
// DECISÃO DE ESCOPO (S6 v1, declarada por honestidade — Fable5 §8): "dono"
// de uma ação hoje é sempre quem administra o plano (RH_ADMIN/SST), nunca um
// terceiro escolhido por um diretório de membros — este projeto ainda não
// tem listagem de membros da org. Delegar a responsabilidade a OUTRA pessoa
// nomeada (com notificação) é escopo natural de S6.75, não deste sprint.
//
// O PLANO É CONGELADO NA CRIAÇÃO: agendamento (esforço, semanas, embaixadoria,
// lente, ESG) é um snapshot gravado uma vez — não recalculado a cada leitura
// — para que dono/prazo já combinados nunca sejam invalidados por uma
// reordenação de prioridade no meio da temporada (ver nota na migration).

import type { ControlTier } from "@/engine/action-plan/plan-enrichment-engine";
import type { ActionLogEventKind, PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import type { LoadedActionPlan } from "./action-plan-shapes";

// Reexporta o TIPO para quem já importava daqui — a lógica pura (toAccountability,
// toQuarterlyPlan) mora em action-plan-shapes.ts (sem I/O), pois o CLIENTE
// precisa dela e nunca deve importar de um .server.ts.
export type { LoadedActionItem, LoadedActionPlan } from "./action-plan-shapes";

type RpcRow<Extra extends Record<string, unknown> = Record<string, never>> = {
  accepted: boolean;
  reason: string | null;
} & Partial<Extra>;

export async function callLedgerRpc<Extra extends Record<string, unknown> = Record<string, never>>(
  fn: string,
  params: Record<string, unknown>,
): Promise<RpcRow<Extra>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data, error } = await admin.rpc(fn, params);
  if (error) return { accepted: false, reason: "db_error" } as RpcRow<Extra>;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? { accepted: false, reason: "db_error" }) as RpcRow<Extra>;
}

// ─── Criar plano ─────────────────────────────────────────────────────────────

export interface CreateActionPlanItemInput {
  rank: number;
  leverId: string;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  expectedIvoLift: number;
  isQuickWin: boolean;
  amb: { id: string | null; name: string | null; emoji: string | null };
  lensId: string | null;
  lensLabel: string | null;
  lensColor: string | null;
  esgCodes: string[];
  startWeek: number;
  endWeek: number;
  milestoneWeek: number;
  weeksBudget: number;
  controlTier: ControlTier | null;
}

export interface CreateActionPlanInput {
  orgId: string;
  createdBy: string;
  cycleKey: string;
  seasonName: string;
  sourceCapsuleId: string | null;
  items: CreateActionPlanItemInput[];
}

export type CreateActionPlanResult =
  | { accepted: true; planId: string }
  | { accepted: false; reason: string };

export async function createActionPlanAsAdmin(
  input: CreateActionPlanInput,
): Promise<CreateActionPlanResult> {
  const row = await callLedgerRpc<{ plan_id: string | null }>("create_action_plan", {
    p_org_id: input.orgId,
    p_cycle_key: input.cycleKey,
    p_season_name: input.seasonName,
    p_source_capsule_id: input.sourceCapsuleId,
    p_created_by: input.createdBy,
    p_items: input.items.map((item) => ({
      rank: item.rank,
      lever_id: item.leverId,
      title: item.title,
      description: item.description,
      effort: item.effort,
      expected_ivo_lift: item.expectedIvoLift,
      is_quick_win: item.isQuickWin,
      amb_id: item.amb.id,
      amb_name: item.amb.name,
      amb_emoji: item.amb.emoji,
      lens_id: item.lensId,
      lens_label: item.lensLabel,
      lens_color: item.lensColor,
      esg_codes: item.esgCodes,
      start_week: item.startWeek,
      end_week: item.endWeek,
      milestone_week: item.milestoneWeek,
      weeks_budget: item.weeksBudget,
      control_tier: item.controlTier,
    })),
  });
  if (!row.accepted || !row.plan_id) return { accepted: false, reason: row.reason ?? "db_error" };
  return { accepted: true, planId: row.plan_id };
}

// ─── Definir accountability §13 de uma ação ─────────────────────────────────

export interface SetAccountabilityInput {
  itemId: string;
  owner: { userId: string; roleLabel: string } | null;
  dueOn: string | null;
  metric: { label: string; baseline: number; target: number; unit: string } | null;
  cmo: { context: string; mechanism: string; outcome: string } | null;
  controlTier: ControlTier | null;
}

export async function setActionItemAccountabilityAsAdmin(
  input: SetAccountabilityInput,
): Promise<{ accepted: boolean; reason: string | null }> {
  return callLedgerRpc("set_action_item_accountability", {
    p_item_id: input.itemId,
    p_owner_user_id: input.owner?.userId ?? null,
    p_owner_role_label: input.owner?.roleLabel ?? null,
    p_due_on: input.dueOn,
    p_metric_label: input.metric?.label ?? null,
    p_metric_baseline: input.metric?.baseline ?? null,
    p_metric_target: input.metric?.target ?? null,
    p_metric_unit: input.metric?.unit ?? null,
    p_cmo_context: input.cmo?.context ?? null,
    p_cmo_mechanism: input.cmo?.mechanism ?? null,
    p_cmo_outcome: input.cmo?.outcome ?? null,
    p_control_tier: input.controlTier,
  });
}

// ─── Ativar plano — o §13 como constraint de verdade ────────────────────────

export type ActivatePlanResult =
  | { accepted: true }
  | { accepted: false; reason: string; incompleteCount: number };

export async function activateActionPlanAsAdmin(planId: string): Promise<ActivatePlanResult> {
  const row = await callLedgerRpc<{ incomplete_count: number | null }>("activate_action_plan", {
    p_plan_id: planId,
  });
  if (!row.accepted) {
    return { accepted: false, reason: row.reason ?? "db_error", incompleteCount: row.incomplete_count ?? 0 };
  }
  return { accepted: true };
}

// ─── Registrar evento (status/checkin/nota/vigia) ───────────────────────────

export interface RecordEventInput {
  itemId: string;
  kind: ActionLogEventKind;
  actorUserId: string;
  actorRoleLabel: string;
  toStatus?: PlanActionStatus;
  maintained?: boolean;
  note?: string;
}

export async function recordActionEventAsAdmin(
  input: RecordEventInput,
): Promise<{ accepted: boolean; reason: string | null }> {
  return callLedgerRpc("record_action_event", {
    p_item_id: input.itemId,
    p_event_kind: input.kind,
    p_actor_user_id: input.actorUserId,
    p_actor_role_label: input.actorRoleLabel,
    p_to_status: input.toStatus ?? null,
    p_maintained: input.maintained ?? null,
    p_note: input.note ?? null,
  });
}

// ─── Registrar evidência ─────────────────────────────────────────────────────

export interface RecordEvidenceInput {
  itemId: string;
  /** `aprendizagem` exige a migration 20261002120000 (escopo de evidência IVO R6). */
  evidenceKind: "texto" | "foto" | "checklist" | "metrica" | "aprendizagem";
  contentRef: string;
  sourceKind: "direct" | "practice_record_ref";
  consentRef: string | null;
  occurredOn: string;
  recordedBy: string;
  actorRoleLabel: string;
}

export async function recordEvidenceAsAdmin(
  input: RecordEvidenceInput,
): Promise<{ accepted: boolean; reason: string | null; evidenceId: string | null }> {
  const row = await callLedgerRpc<{ evidence_id: string | null }>("record_evidence", {
    p_item_id: input.itemId,
    p_evidence_kind: input.evidenceKind,
    p_content_ref: input.contentRef,
    p_source_kind: input.sourceKind,
    p_consent_ref: input.consentRef,
    p_occurred_on: input.occurredOn,
    p_recorded_by: input.recordedBy,
    p_actor_role_label: input.actorRoleLabel,
  });
  return { accepted: row.accepted, reason: row.reason, evidenceId: row.evidence_id ?? null };
}

// ─── Leitura: plano + ações + log da org (mais recente) ─────────────────────
// Shapes (LoadedActionItem/LoadedActionPlan) vivem em action-plan-shapes.ts.

export async function loadLatestActionPlanForOrg(
  orgId: string,
): Promise<LoadedActionPlan | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: plan } = await admin
    .from("action_plans")
    .select("id, cycle_key, season_name, status, source_capsule_id, created_at, activated_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;

  const { data: items } = await admin
    .from("action_items")
    .select(
      "id, rank, lever_id, title, description, effort, expected_ivo_lift, is_quick_win, amb_id, amb_name, amb_emoji, lens_id, lens_label, lens_color, esg_codes, start_week, end_week, milestone_week, weeks_budget, control_tier, owner_user_id, owner_role_label, due_on, metric_label, metric_baseline, metric_target, metric_unit, cmo_context, cmo_mechanism, cmo_outcome, status",
    )
    .eq("plan_id", plan.id)
    .order("rank", { ascending: true });

  const itemIds = (items ?? []).map((i: any) => i.id as string);
  const { data: log } = itemIds.length
    ? await admin
        .from("action_log")
        .select("id, item_id, event_kind, actor_role_label, to_status, maintained, note, occurred_at")
        .in("item_id", itemIds)
        .order("occurred_at", { ascending: true })
    : { data: [] };

  return {
    id: plan.id,
    cycleKey: plan.cycle_key,
    seasonName: plan.season_name,
    status: plan.status,
    sourceCapsuleId: plan.source_capsule_id,
    createdAt: plan.created_at,
    activatedAt: plan.activated_at,
    items: (items ?? []).map((item: any) => ({
      id: item.id,
      rank: item.rank,
      leverId: item.lever_id,
      title: item.title,
      description: item.description,
      effort: item.effort,
      expectedIvoLift: Number(item.expected_ivo_lift),
      isQuickWin: item.is_quick_win,
      amb: { id: item.amb_id, name: item.amb_name, emoji: item.amb_emoji },
      lensId: item.lens_id,
      lensLabel: item.lens_label,
      lensColor: item.lens_color,
      esgCodes: item.esg_codes ?? [],
      startWeek: item.start_week,
      endWeek: item.end_week,
      milestoneWeek: item.milestone_week,
      weeksBudget: item.weeks_budget,
      controlTier: item.control_tier,
      owner: item.owner_user_id
        ? { userId: item.owner_user_id, roleLabel: item.owner_role_label ?? "" }
        : null,
      dueOn: item.due_on,
      metric:
        item.metric_label != null && item.metric_baseline != null && item.metric_target != null
          ? {
              label: item.metric_label,
              baseline: Number(item.metric_baseline),
              target: Number(item.metric_target),
              unit: item.metric_unit ?? "",
            }
          : null,
      cmo:
        item.cmo_context && item.cmo_mechanism && item.cmo_outcome
          ? { context: item.cmo_context, mechanism: item.cmo_mechanism, outcome: item.cmo_outcome }
          : null,
      status: item.status,
    })),
    log: (log ?? []).map((event: any) => ({
      id: event.id,
      itemId: event.item_id,
      kind: event.event_kind,
      actorRoleLabel: event.actor_role_label,
      toStatus: event.to_status,
      maintained: event.maintained,
      note: event.note,
      occurredAt: event.occurred_at,
    })),
  };
}
