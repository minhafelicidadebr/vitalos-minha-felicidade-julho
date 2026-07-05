// Server functions do Plano Vivo (Ledger de Transformação, Sprint S6).
//
// Modelo de confiança (mesma disciplina de wave-admin.functions.ts, P0-04):
// nenhuma função aqui aceita orgId do cliente. O chamador manda o
// access_token da própria sessão; o servidor resolve a organização real via
// resolveOrgMembership/requireOrgAdmin — nunca uma escolhida pelo payload.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  activateActionPlanAsAdmin,
  createActionPlanAsAdmin,
  loadLatestActionPlanForOrg,
  recordActionEventAsAdmin,
  recordEvidenceAsAdmin,
  setActionItemAccountabilityAsAdmin,
} from "./action-plan.server";
import { toAccountability, type LoadedActionPlan } from "./action-plan-shapes";
import { isCloudReady } from "../cloud/supabase-client";
import { describeAuthFailure, requireOrgAdmin, resolveOrgMembership } from "@/lib/auth/authorize.server";
import type { ActionAccountability } from "@/engine/action-plan/plan-enrichment-engine";

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });

const controlTierSchema = z.enum(["eliminacao", "organizacao", "administrativa", "monitoramento"]);

// ─── Carregar o plano corrente da org (leitura — qualquer membro) ───────────

export type LoadActionPlanResult =
  | { cloudReady: false }
  | { cloudReady: true; error: string }
  | { cloudReady: true; plan: LoadedActionPlan | null; accountability: ActionAccountability[] };

export const loadActionPlan = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema)
  .handler(async ({ data }): Promise<LoadActionPlanResult> => {
    if (!isCloudReady()) return { cloudReady: false };

    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { cloudReady: true, error: describeAuthFailure(auth.reason) };

    const plan = await loadLatestActionPlanForOrg(auth.membership.orgId);
    return { cloudReady: true, plan, accountability: plan ? toAccountability(plan) : [] };
  });

// ─── Criar plano (RH_ADMIN/SST/CHRO — papéis-admin do pack) ─────────────────

const createPlanSchema = accessTokenSchema.extend({
  cycleKey: z.string().min(1).max(40),
  seasonName: z.string().min(1).max(80),
  sourceCapsuleId: z.string().uuid().nullable(),
  items: z
    .array(
      z.object({
        rank: z.number().int().min(1),
        leverId: z.string().min(1),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).default(""),
        effort: z.enum(["baixo", "medio", "alto"]),
        expectedIvoLift: z.number().min(0),
        isQuickWin: z.boolean(),
        amb: z.object({
          id: z.string().nullable(),
          name: z.string().nullable(),
          emoji: z.string().nullable(),
        }),
        lensId: z.string().nullable(),
        lensLabel: z.string().nullable(),
        lensColor: z.string().nullable(),
        esgCodes: z.array(z.string()).default([]),
        startWeek: z.number().int().min(1),
        endWeek: z.number().int().min(1),
        milestoneWeek: z.number().int().min(1),
        weeksBudget: z.number().int().min(1),
        controlTier: controlTierSchema.nullable(),
      }),
    )
    .min(1)
    .max(20),
});

export const createActionPlan = createServerFn({ method: "POST" })
  .inputValidator(createPlanSchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) return { accepted: false as const, reason: "cloud_not_ready" };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { accepted: false as const, reason: describeAuthFailure(auth.reason) };

    return createActionPlanAsAdmin({
      orgId: auth.membership.orgId,
      createdBy: auth.membership.userId,
      cycleKey: data.cycleKey,
      seasonName: data.seasonName,
      sourceCapsuleId: data.sourceCapsuleId,
      items: data.items,
    });
  });

// ─── Definir accountability §13 de uma ação ──────────────────────────────────
// Escopo S6 v1 (declarado): o dono é sempre quem administra o plano — não há
// ainda diretório de membros para delegar a um terceiro nomeado.

const setAccountabilitySchema = accessTokenSchema.extend({
  itemId: z.string().uuid(),
  ownerRoleLabel: z.string().min(1).max(80).nullable(),
  dueOn: z.string().date().nullable(),
  metric: z
    .object({
      label: z.string().min(1).max(120),
      baseline: z.number(),
      target: z.number(),
      unit: z.string().max(20),
    })
    .nullable(),
  cmo: z
    .object({
      context: z.string().min(1).max(300),
      mechanism: z.string().min(1).max(300),
      outcome: z.string().min(1).max(300),
    })
    .nullable(),
  controlTier: controlTierSchema.nullable(),
});

export const setActionItemAccountability = createServerFn({ method: "POST" })
  .inputValidator(setAccountabilitySchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) return { accepted: false, reason: "cloud_not_ready" };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { accepted: false, reason: describeAuthFailure(auth.reason) };

    return setActionItemAccountabilityAsAdmin({
      itemId: data.itemId,
      owner: data.ownerRoleLabel
        ? { userId: auth.membership.userId, roleLabel: data.ownerRoleLabel }
        : null,
      dueOn: data.dueOn,
      metric: data.metric,
      cmo: data.cmo,
      controlTier: data.controlTier,
    });
  });

// ─── Ativar plano — o §13 vira constraint de verdade ────────────────────────

const activatePlanSchema = accessTokenSchema.extend({ planId: z.string().uuid() });

export const activateActionPlan = createServerFn({ method: "POST" })
  .inputValidator(activatePlanSchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) return { accepted: false as const, reason: "cloud_not_ready", incompleteCount: 0 };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) {
      return { accepted: false as const, reason: describeAuthFailure(auth.reason), incompleteCount: 0 };
    }

    return activateActionPlanAsAdmin(data.planId);
  });

// ─── Registrar evento (status/checkin/nota/vigia) ───────────────────────────

const recordEventSchema = accessTokenSchema.extend({
  itemId: z.string().uuid(),
  kind: z.enum(["status_change", "checkin", "note", "maintenance_check"]),
  actorRoleLabel: z.string().min(1).max(80),
  toStatus: z
    .enum(["planejada", "em_execucao", "concluida", "em_vigilancia", "interrompida"])
    .optional(),
  maintained: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

export const recordActionEvent = createServerFn({ method: "POST" })
  .inputValidator(recordEventSchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) return { accepted: false, reason: "cloud_not_ready" };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { accepted: false, reason: describeAuthFailure(auth.reason) };

    return recordActionEventAsAdmin({
      itemId: data.itemId,
      kind: data.kind,
      actorUserId: auth.membership.userId,
      actorRoleLabel: data.actorRoleLabel,
      toStatus: data.toStatus,
      maintained: data.maintained,
      note: data.note,
    });
  });

// ─── Registrar evidência ─────────────────────────────────────────────────────

const recordEvidenceSchema = accessTokenSchema.extend({
  itemId: z.string().uuid(),
  evidenceKind: z.enum(["texto", "foto", "checklist", "metrica"]),
  contentRef: z.string().min(1).max(2000),
  sourceKind: z.enum(["direct", "practice_record_ref"]).default("direct"),
  consentRef: z.string().max(200).nullable(),
  occurredOn: z.string().date(),
  actorRoleLabel: z.string().min(1).max(80),
});

export const recordEvidence = createServerFn({ method: "POST" })
  .inputValidator(recordEvidenceSchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) return { accepted: false, reason: "cloud_not_ready", evidenceId: null };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { accepted: false, reason: describeAuthFailure(auth.reason), evidenceId: null };

    return recordEvidenceAsAdmin({
      itemId: data.itemId,
      evidenceKind: data.evidenceKind,
      contentRef: data.contentRef,
      sourceKind: data.sourceKind,
      consentRef: data.consentRef,
      occurredOn: data.occurredOn,
      recordedBy: auth.membership.userId,
      actorRoleLabel: data.actorRoleLabel,
    });
  });
