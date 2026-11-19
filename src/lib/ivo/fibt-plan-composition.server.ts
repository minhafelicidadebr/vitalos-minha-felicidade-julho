// IVO PI-13 — incluir ação em plano existente e encerrar plano operacionalmente.
//
// Camada de servidor sobre o Ledger de Transformação. NENHUMA RPC pública nova
// (a M6A aborta função desconhecida em public): a escrita é de service_role, no
// servidor, DEPOIS de validar a sessão, e as regras vivem no banco como gatilhos
// do schema ivo_ledger (supabase/migrations/20261016120000_*). Esta camada
// antecipa as regras para dar mensagens claras; o BANCO é a autoridade — inclusive
// na corrida entre incluir ação e encerrar (trava da linha do plano).
//
// Regras desta camada:
//   · organização e papel vêm da sessão validada (requireOrgAdmin via
//     authorizeLedger); planId/waveId/cohortId do cliente são REFERÊNCIAS: o plano
//     é relido já filtrado pela organização da sessão e a origem é revalidada
//     contra o snapshot protegido dessa mesma organização;
//   · a origem da ação nova é a mesma da criação: setor com leitura PUBLICADA ×
//     fator FIB-T, sem copiar nenhum valor; e deve ser do MESMO ciclo do plano
//     (resolução de outro ciclo é PI-14, subordinada a D7–D9, e não é feita aqui);
//   · idempotência: `requestId` (uuid gerado pela interface por tentativa). O
//     mesmo pedido repetido devolve a ação já criada, sem duplicar; pedidos
//     distintos, ainda que parecidos, criam ações distintas. O que se compara,
//     contra o ESTADO ATUAL da linha gravada, é EXATAMENTE este conjunto: título,
//     descrição, esforço, coorte e fator de origem e o bloco §13 (responsável,
//     prazo e rótulo, linha de base, meta e unidade do indicador). A mesma chave
//     com diferença em qualquer um deles é conflito e não grava. `waveId` NÃO é
//     comparado: pelo fluxo normal da interface não é alcançável (vem de
//     view.wave.id e a chave gira a cada sucesso); por script, chamador futuro
//     ou resposta perdida (exceção: ivo-roadmap.md §8, item 17) é alcançável, e
//     é benigno (devolve a ação existente e não grava nada). Aberto: incluí-lo
//     depois de validar source_wave_id em banco local; e a comparação com o
//     estado mutável da linha (§13 preenchido depois) — ver ivo-roadmap.md §8;
//   · plano ativo exige responsável, prazo e indicador de execução NA inclusão (o
//     plano ativo nunca contém ação sem accountability); plano em rascunho aceita
//     a ação e segue o fluxo normal de §13 antes de ativar; plano encerrado recusa;
//   · encerrar = active→closed, plano não vazio, TODAS as ações em estado de saída;
//     repetir devolve o encerramento já feito sem gravar de novo; sem reabertura;
//   · encerrar NÃO avalia eficácia, NÃO altera o IVO e NÃO toca protocolos,
//     observações nem pareceres C8.

import { sameCycle } from "@/domain/ivo/cycle-key";
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import { loadIvoQ2ForOrg } from "./ivo-q2-reading.server";
import { authorizeLedger, resolveDesignatedOwner, type FibtActionLoopDeps } from "./fibt-action-loop.server";
import { PLAN_EMPTY_MESSAGE, assessPlanClosure, describePending } from "./plan-closure";
import type { LedgerWriteOutcome } from "./ivo-views";
import { encodeContentRef } from "./content-ref";

// ─── Contrato da store ──────────────────────────────────────────────────────

export interface PlanCompositionPlan {
  id: string;
  orgId: string;
  status: "draft" | "active" | "closed";
  cycleKey: string;
  closedAt: string | null;
  closedByRole: string | null;
  /** `false`: o banco ainda não tem a migration do PI-13 — nenhuma das duas operações é segura. */
  composition: boolean;
  actions: Array<{ id: string; title: string; status: PlanActionStatus }>;
}

export interface AddedActionRow {
  id: string;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  sourceCohortId: string | null;
  sourceFactorId: string | null;
  /** Bloco de accountability (§13) gravado na inclusão; nulo quando a ação entrou em rascunho sem ele. */
  ownerUserId?: string | null;
  ownerRoleLabel: string | null;
  dueOn: string | null;
  metricLabel: string | null;
  /** `numeric` do banco: pode chegar como número ou como texto ("10.00"). */
  metricBaseline: number | string | null;
  metricTarget: number | string | null;
  metricUnit: string | null;
}

export interface AddActionInput {
  orgId: string;
  planId: string;
  requestId: string;
  userId: string;
  /** Papel da sessão (nunca texto do cliente). */
  role: string;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  leverId: string;
  source: { waveId: string; cohortId: string; factorId: string };
  accountability: null | {
    /** Já resolvido por `resolveDesignatedOwner` (próprio RH ou liderança da org). */
    ownerUserId: string;
    ownerRoleLabel: string;
    dueOn: string;
    metric: { label: string; baseline: number; target: number; unit: string };
  };
}

export type AddActionResult = { accepted: true; itemId: string } | { accepted: false; reason: string };

export interface ClosePlanInput {
  orgId: string;
  planId: string;
  userId: string;
  role: string;
}

/** `accepted: false, reason: "no_row"`: nada foi gravado porque o plano não estava ativo (já encerrado, rascunho…). */
export type ClosePlanResult = { accepted: true } | { accepted: false; reason: string };

export interface PlanCompositionStore {
  loadPlan(orgId: string, planId: string): Promise<PlanCompositionPlan | null>;
  findAddedAction(orgId: string, planId: string, requestId: string): Promise<AddedActionRow | null>;
  addAction(input: AddActionInput): Promise<AddActionResult>;
  closePlan(input: ClosePlanInput): Promise<ClosePlanResult>;
}

export interface PlanCompositionDeps extends FibtActionLoopDeps {
  composition?: PlanCompositionStore;
}

function compositionOf(deps: PlanCompositionDeps): PlanCompositionStore {
  return deps.composition ?? createSupabasePlanCompositionStore();
}

// ─── Mensagens ──────────────────────────────────────────────────────────────

const REASON_MESSAGE: Record<string, string> = {
  plan_not_found: "Plano não encontrado nesta organização.",
  plan_closed: "Este plano está encerrado e não aceita novas ações.",
  composition_unavailable:
    "Esta operação ainda não está disponível neste ambiente: a atualização do banco de dados não foi aplicada. Nada foi alterado.",
  accountability_required:
    "Plano ativo: informe responsável, prazo e indicador de execução da nova ação. Um plano ativo não aceita ação sem eles.",
  source_not_published:
    "A prioridade só pode partir de um setor com leitura publicada. Setores protegidos não embasam ações.",
  origin_cycle_mismatch:
    "A leitura escolhida pertence a outro ciclo. O plano só recebe ações do próprio ciclo.",
  provenance_cross_tenant_denied: "A origem informada não pertence a esta organização.",
  request_conflict:
    "Este pedido já foi usado para uma ação diferente. Recarregue a página e tente de novo.",
  invalid_date: "Data inválida.",
  close_requires_active: "Só um plano ativo pode ser encerrado.",
  plan_empty: PLAN_EMPTY_MESSAGE,
  pending_actions:
    "Ainda há ações em andamento. Conclua, mantenha em vigilância ou interrompa cada uma antes de encerrar.",
  db_error: "O registro não pôde ser gravado agora. Nada foi alterado.",
};

function rejected(reason: string, message?: string): LedgerWriteOutcome {
  return { ok: true, accepted: false, reason, message: message ?? REASON_MESSAGE[reason] ?? REASON_MESSAGE.db_error! };
}

/** Traduz erros de gatilho/CHECK do PI-13 em motivos estáveis (a mensagem do gatilho é o token). */
export function mapPlanCompositionDbError(error: { code?: string; message?: string } | null | undefined): string {
  const message = error?.message ?? "";
  if (message.includes("ivo_plan_closed")) return "plan_closed"; // cobre ivo_plan_closed_is_immutable
  if (message.includes("ivo_plan_not_found")) return "plan_not_found";
  if (message.includes("ivo_plan_active_needs_accountability")) return "accountability_required";
  if (message.includes("ivo_plan_origin_denied")) return "provenance_cross_tenant_denied";
  if (message.includes("ivo_plan_source_not_published")) return "source_not_published";
  if (message.includes("ivo_plan_close_pending")) return "pending_actions";
  if (message.includes("ivo_plan_close_empty")) return "plan_empty";
  if (message.includes("ivo_plan_close_requires_active")) return "close_requires_active";
  if (error?.code === "23505") return "duplicate_request";
  if (error?.code === "42703" || error?.code === "PGRST204" || /column .* does not exist/i.test(message)) return "composition_unavailable";
  return "db_error";
}

/**
 * Tokens de gatilho do PI-13 SEM motivo público próprio. O usuário continua vendo `db_error` ("O registro
 * não pôde ser gravado agora. Nada foi alterado."): são defesas de integridade (identidade e auditoria
 * imutáveis, transição inválida) que o servidor não aciona no fluxo normal, não um erro que ele possa
 * corrigir. Cada uma tem diagnóstico interno próprio, que vai SÓ ao log do servidor. Todo `ivo_plan_*` que a
 * migration levanta precisa estar aqui OU em `mapPlanCompositionDbError` (teste de deriva em
 * plan-composition.server.test.ts).
 */
export const PLAN_TRIGGER_DIAGNOSTICS = {
  ivo_plan_identity_immutable: "plan_identity_immutable",
  ivo_plan_item_identity_immutable: "item_identity_immutable",
  ivo_plan_item_audit_immutable: "item_audit_immutable",
  ivo_plan_insert_must_be_draft: "insert_must_be_draft",
  ivo_plan_status_transition_invalid: "status_transition_invalid",
  ivo_plan_close_needs_actor: "close_needs_actor",
  ivo_plan_closure_audit_immutable: "closure_audit_immutable",
} as const;

/**
 * Recusa vinda do banco: motivo público estável (`mapPlanCompositionDbError`) e, se for uma das defesas de
 * `PLAN_TRIGGER_DIAGNOSTICS`, o diagnóstico interno no log. Só o código estático é registrado: nunca a
 * mensagem crua do banco (pode trazer DETAIL), identificadores nem texto digitado pelo usuário.
 */
export function planCompositionDbRejection(
  error: { code?: string; message?: string } | null | undefined,
): { accepted: false; reason: string } {
  const message = error?.message ?? "";
  const token = (Object.keys(PLAN_TRIGGER_DIAGNOSTICS) as Array<keyof typeof PLAN_TRIGGER_DIAGNOSTICS>).find((t) => message.includes(t));
  if (token) {
    console.warn("[ivo-plan-composition] gravação recusada por regra de integridade do banco", { diagnostic: PLAN_TRIGGER_DIAGNOSTICS[token] });
  }
  return { accepted: false, reason: mapPlanCompositionDbError(error) };
}

/** Data civil AAAA-MM-DD que existe no calendário (31/02 não passa: o Date do JS o "rola" para março). */
function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// ─── Incluir ação em plano existente ────────────────────────────────────────

export interface AddActionToPlanRequest {
  accessToken?: string;
  planId: string;
  /** Chave de idempotência do pedido (uma por tentativa de envio do formulário). */
  requestId: string;
  waveId: string;
  cohortId: string;
  factorId: string;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  /** Obrigatório em plano ativo; opcional em rascunho (o §13 segue o fluxo normal antes de ativar). */
  accountability?: { ownerRoleLabel: string; ownerUserId?: string; dueOn: string; executionMetric: { label: string; baseline: number; target: number; unit: string } };
}

export async function addFibtActionToPlan(
  input: AddActionToPlanRequest,
  deps: PlanCompositionDeps = {},
  learningReference?: { id: string; version: string },
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  if (/^\s*\[conteudo:/i.test(input.description)) return rejected("reserved_content_reference", "A referência educativa é definida pelo servidor. Use a jornada de aprendizagem.");
  if (learningReference) input = { ...input, description: encodeContentRef(learningReference, input.description) };
  try {
    const store = compositionOf(deps);
    const plan = await store.loadPlan(auth.orgId, input.planId);
    if (!plan || plan.orgId !== auth.orgId) return rejected("plan_not_found");
    if (!plan.composition) return rejected("composition_unavailable");

    // Repetição do MESMO pedido: devolve a ação já criada (mesmo depois de o plano encerrar).
    const replay = await resolveReplay(store, auth.orgId, plan.id, input, auth.userId);
    if (replay) return replay;

    if (plan.status === "closed") return rejected("plan_closed");
    if (plan.status === "active" && !input.accountability) return rejected("accountability_required");
    if (input.accountability && !isIsoDate(input.accountability.dueOn)) return rejected("invalid_date");
    // Mesma regra de designação do rascunho (função única).
    let ownerUserId = auth.userId;
    if (input.accountability) {
      const owner = await resolveDesignatedOwner(auth, input.accountability.ownerUserId, deps);
      if (!owner.ok) return owner.rejection;
      ownerUserId = owner.ownerUserId;
    }

    // A origem é revalidada AQUI, com a organização da SESSÃO e o snapshot protegido dela.
    const q2 = await loadIvoQ2ForOrg(auth.orgId, input.waveId, deps);
    if (!q2.ok) return q2;
    if (q2.state !== "ready") return rejected("source_not_published");
    const view = q2.view;
    const sector = view.sectors.find((s) => s.cohortId === input.cohortId);
    const factor = sector?.group === "available" ? sector.factors?.find((f) => f.id === input.factorId) : undefined;
    if (!sector || !factor) return rejected("source_not_published");
    // Mesmo ciclo do plano. Outro ciclo exigiria resolver leitura de ciclo diferente (PI-14): não aqui.
    if (!sameCycle(plan.cycleKey, view.cycleKey)) return rejected("origin_cycle_mismatch");

    const written = await store.addAction({
      orgId: auth.orgId,
      planId: plan.id,
      requestId: input.requestId,
      userId: auth.userId,
      role: auth.role,
      title: input.title,
      description: input.description,
      effort: input.effort,
      // Somente referências: nenhum valor (média, contagem, escore) acompanha a ação.
      leverId: `fibt:${sector.key}:${factor.id}`,
      source: { waveId: view.wave.id, cohortId: sector.cohortId, factorId: factor.id },
      accountability: input.accountability
        ? { ownerUserId, ownerRoleLabel: input.accountability.ownerRoleLabel, dueOn: input.accountability.dueOn, metric: input.accountability.executionMetric }
        : null,
    });
    if (written.accepted) return { ok: true, accepted: true, id: written.itemId };
    if (written.reason === "duplicate_request") {
      // Corrida entre dois envios do mesmo pedido: o índice único decidiu; devolve o vencedor.
      return (await resolveReplay(store, auth.orgId, plan.id, input, auth.userId)) ?? rejected("db_error");
    }
    return rejected(written.reason);
  } catch {
    return rejected("db_error");
  }
}

async function resolveReplay(
  store: PlanCompositionStore,
  orgId: string,
  planId: string,
  input: AddActionToPlanRequest,
  sessionUserId: string,
): Promise<LedgerWriteOutcome | null> {
  const existing = await store.findAddedAction(orgId, planId, input.requestId);
  if (!existing) return null;
  const accountability = input.accountability;
  const requested = additionIdentity({
    title: input.title,
    description: input.description,
    effort: input.effort,
    cohortId: input.cohortId,
    factorId: input.factorId,
    // A pessoa designada faz parte do pedido: mesmo requestId com outra pessoa é conflito.
    ownerUserId: existing.ownerUserId === undefined ? undefined : accountability ? (accountability.ownerUserId ?? sessionUserId) : null,
    ownerRoleLabel: accountability?.ownerRoleLabel,
    dueOn: accountability?.dueOn, // texto contratual: aparado, SEM truncar (a tolerância é só da linha)
    metricLabel: accountability?.executionMetric.label,
    metricBaseline: accountability?.executionMetric.baseline,
    metricTarget: accountability?.executionMetric.target,
    metricUnit: accountability?.executionMetric.unit,
  });
  const stored = additionIdentity({
    title: existing.title,
    description: existing.description,
    effort: existing.effort,
    cohortId: existing.sourceCohortId,
    factorId: existing.sourceFactorId,
    // `undefined` = store sem a coluna: os dois lados ficam fora da comparação (stores antigas).
    ownerUserId: existing.ownerUserId,
    ownerRoleLabel: existing.ownerRoleLabel,
    dueOn: dateKey(existing.dueOn), // a tolerância de serialização vale SÓ aqui, no lado da linha
    metricLabel: existing.metricLabel,
    metricBaseline: existing.metricBaseline,
    metricTarget: existing.metricTarget,
    metricUnit: existing.metricUnit,
  });
  return requested === stored ? { ok: true, accepted: true, id: existing.id, replayed: true } : rejected("request_conflict");
}

/** Texto como o gravado: aparado (o validador da server function aplica `trim`); vazio ≡ ausente. */
function textKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

/** `numeric` do banco pode chegar como texto ("10.00"): compara pelo valor, nunca pela grafia. */
function numberKey(value: unknown): string | null {
  const text = textKey(value);
  return text === null ? null : String(Number(text));
}

/**
 * Prazo (`due_on`, coluna `date`) COMO A LINHA GRAVADA O DEVOLVE; o lado do PEDIDO não passa por aqui.
 * O banco pode serializá-lo com hora ou fuso ("2026-11-30T00:00:00+00:00", "2026-11-30 00:00:00"):
 * compara só a data civil AAAA-MM-DD (os 10 primeiros caracteres). Valor que não começa com uma data
 * fica como o texto aparado.
 * Limite: cortar o prefixo só dá a data civil CORRETA se a store devolver a própria data civil (o
 * PostgREST serializa `date` como AAAA-MM-DD) ou um instante em UTC ou sem fuso. Um instante com
 * deslocamento ("2026-11-29T21:00:00-03:00", o mesmo instante que 2026-11-30T00:00:00Z) NÃO é
 * convertido: se o formato real vier a ser um instante com fuso, derive a data civil do instante em
 * vez de cortar o prefixo.
 */
function dateKey(value: unknown): string | null {
  const text = textKey(value);
  if (text === null) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
}

/**
 * Identidade de uma inclusão, comparada com o ESTADO ATUAL da linha: título, descrição, esforço,
 * coorte e fator de origem e o bloco §13 de accountability (responsável, prazo e rótulo, linha de
 * base, meta e unidade do indicador). `waveId` NÃO entra (ver o cabeçalho do arquivo). A MESMA
 * normalização vale para o pedido e para a linha gravada, de modo que o mesmo pedido nunca vire
 * falso conflito (nulo ≡ ausente; número ≡ texto numérico). Única exceção, o prazo: a tolerância à
 * serialização do banco (`dateKey`) é aplicada por quem chama SÓ à linha; o pedido entra como texto
 * contratual aparado, sem truncar, para que um prazo mal grafado nunca vire repetição.
 */
function additionIdentity(v: {
  title: unknown;
  description: unknown;
  effort: unknown;
  cohortId: unknown;
  factorId: unknown;
  ownerUserId?: unknown;
  ownerRoleLabel: unknown;
  dueOn: unknown;
  metricLabel: unknown;
  metricBaseline: unknown;
  metricTarget: unknown;
  metricUnit: unknown;
}): string {
  return JSON.stringify([
    textKey(v.title),
    textKey(v.description),
    textKey(v.effort),
    textKey(v.cohortId),
    textKey(v.factorId),
    textKey(v.ownerUserId),
    textKey(v.ownerRoleLabel),
    textKey(v.dueOn),
    textKey(v.metricLabel),
    numberKey(v.metricBaseline),
    numberKey(v.metricTarget),
    textKey(v.metricUnit),
  ]);
}

// ─── Encerrar plano ─────────────────────────────────────────────────────────

export async function closeFibtActionPlan(
  input: { accessToken?: string; planId: string },
  deps: PlanCompositionDeps = {},
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  try {
    const store = compositionOf(deps);
    const plan = await store.loadPlan(auth.orgId, input.planId);
    if (!plan || plan.orgId !== auth.orgId) return rejected("plan_not_found");
    if (!plan.composition) return rejected("composition_unavailable");
    // Repetição: o plano já está encerrado — devolve o desfecho, não grava, não duplica nada.
    if (plan.status === "closed") return { ok: true, accepted: true, id: plan.id, replayed: true };
    if (plan.status !== "active") return rejected("close_requires_active");

    const assessment = assessPlanClosure({ status: plan.status, actions: plan.actions });
    if (assessment.block === "plan_empty") return rejected("plan_empty");
    if (assessment.block === "pending_actions") {
      return rejected(
        "pending_actions",
        `Ainda há ${assessment.pending.length} ação(ões) em andamento (${describePending(assessment.pending)}). ` +
        "Conclua, mantenha em vigilância ou interrompa cada uma antes de encerrar.",
      );
    }

    const closed = await store.closePlan({ orgId: auth.orgId, planId: plan.id, userId: auth.userId, role: auth.role });
    if (closed.accepted) return { ok: true, accepted: true, id: plan.id };
    if (closed.reason === "no_row") {
      // O plano deixou de estar ativo entre a leitura e a escrita (outro envio venceu): relê e decide.
      const now = await store.loadPlan(auth.orgId, plan.id);
      if (now?.status === "closed") return { ok: true, accepted: true, id: plan.id, replayed: true };
      return rejected("close_requires_active");
    }
    return rejected(closed.reason);
  } catch {
    return rejected("db_error");
  }
}

// ─── Store Supabase (service_role; sempre filtrada pela organização da sessão) ─

function createSupabasePlanCompositionStore(): PlanCompositionStore {
  async function admin() {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Tipos gerados ainda não conhecem as colunas novas (migration local).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabaseAdmin as any;
  }
  const undefinedColumn = (e: { code?: string; message?: string } | null | undefined) =>
    mapPlanCompositionDbError(e) === "composition_unavailable";

  return {
    async loadPlan(orgId, planId) {
      const db = await admin();
      let composition = true;
      let read = await db
        .from("action_plans")
        .select("id, org_id, status, cycle_key, closed_at, closed_by_role")
        .eq("id", planId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (read.error && undefinedColumn(read.error)) {
        composition = false;
        read = await db.from("action_plans").select("id, org_id, status, cycle_key").eq("id", planId).eq("org_id", orgId).maybeSingle();
      }
      if (read.error) throw new Error("IVO_PLAN_READ_FAILED");
      if (!read.data) return null;
      const { data: items, error: itemsErr } = await db
        .from("action_items")
        .select("id, title, status")
        .eq("plan_id", planId)
        .eq("org_id", orgId)
        .order("rank", { ascending: true });
      if (itemsErr) throw new Error("IVO_PLAN_ITEMS_READ_FAILED");
      return {
        id: String(read.data.id),
        orgId: String(read.data.org_id),
        status: read.data.status as PlanCompositionPlan["status"],
        cycleKey: String(read.data.cycle_key),
        closedAt: (read.data.closed_at as string | null | undefined) ?? null,
        closedByRole: (read.data.closed_by_role as string | null | undefined) ?? null,
        composition,
        actions: ((items ?? []) as Array<Record<string, unknown>>).map((i) => ({
          id: String(i.id),
          title: String(i.title),
          status: i.status as PlanActionStatus,
        })),
      };
    },

    async findAddedAction(orgId, planId, requestId) {
      const db = await admin();
      const { data, error } = await db
        .from("action_items")
        // As colunas de accountability têm os MESMOS nomes que o INSERT de addAction grava.
        .select(
          "id, title, description, effort, source_cohort_id, source_factor_id, owner_user_id, owner_role_label, due_on, metric_label, metric_baseline, metric_target, metric_unit",
        )
        .eq("org_id", orgId)
        .eq("plan_id", planId)
        .eq("add_request_id", requestId)
        .maybeSingle();
      if (error) throw new Error("IVO_PLAN_REPLAY_READ_FAILED");
      return data
        ? {
          id: String(data.id),
          title: String(data.title),
          description: String(data.description ?? ""),
          effort: data.effort as AddedActionRow["effort"],
          sourceCohortId: (data.source_cohort_id as string | null) ?? null,
          sourceFactorId: (data.source_factor_id as string | null) ?? null,
          ownerUserId: (data.owner_user_id as string | null) ?? null,
          ownerRoleLabel: (data.owner_role_label as string | null) ?? null,
          dueOn: (data.due_on as string | null) ?? null,
          metricLabel: (data.metric_label as string | null) ?? null,
          // `numeric` pode voltar como texto; resolveReplay compara pelo valor.
          metricBaseline: (data.metric_baseline as number | string | null) ?? null,
          metricTarget: (data.metric_target as number | string | null) ?? null,
          metricUnit: (data.metric_unit as string | null) ?? null,
        }
        : null;
    },

    async addAction(input) {
      const db = await admin();
      const row: Record<string, unknown> = {
        plan_id: input.planId,
        org_id: input.orgId,
        // rank: atribuído pelo gatilho sob trava do plano (max+1).
        lever_id: input.leverId,
        title: input.title,
        description: input.description,
        effort: input.effort,
        expected_ivo_lift: 0,
        is_quick_win: false,
        lens_id: "fibt",
        lens_label: "FIB-T · Q2",
        esg_codes: [],
        // Agendamento padrão de um ciclo trimestral (igual ao da criação do plano).
        start_week: 1,
        end_week: 13,
        milestone_week: 7,
        weeks_budget: 13,
        source_lens_id: "fibt",
        source_wave_id: input.source.waveId,
        source_cohort_id: input.source.cohortId,
        source_factor_id: input.source.factorId,
        // source_instrument_version e source_published_at: DERIVADOS pelo gatilho.
        add_request_id: input.requestId,
        added_by: input.userId,
        added_by_role: input.role,
      };
      if (input.accountability) {
        Object.assign(row, {
          owner_user_id: input.accountability.ownerUserId,
          owner_role_label: input.accountability.ownerRoleLabel,
          due_on: input.accountability.dueOn,
          metric_label: input.accountability.metric.label,
          metric_baseline: input.accountability.metric.baseline,
          metric_target: input.accountability.metric.target,
          metric_unit: input.accountability.metric.unit,
        });
      }
      const { data, error } = await db.from("action_items").insert(row).select("id").single();
      if (error || !data) return planCompositionDbRejection(error);
      return { accepted: true, itemId: String(data.id) };
    },

    async closePlan(input) {
      const db = await admin();
      // UPDATE condicional: só fecha se AINDA estiver ativo. O gatilho do banco confere, sob a
      // trava da linha, plano não vazio e todas as ações em estado de saída, e define closed_at.
      const { data, error } = await db
        .from("action_plans")
        .update({ status: "closed", closed_by: input.userId, closed_by_role: input.role })
        .eq("id", input.planId)
        .eq("org_id", input.orgId)
        .eq("status", "active")
        .select("id");
      if (error) return planCompositionDbRejection(error);
      if (!data || data.length === 0) return { accepted: false, reason: "no_row" };
      return { accepted: true };
    },
  };
}
