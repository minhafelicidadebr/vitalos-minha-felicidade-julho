// Server functions do ciclo resultado FIB-T → prioridade → ação → evidência →
// aprendizagem (IVO R6, recorte mínimo sobre o Ledger de Transformação).
//
// Todas POST, todas `.strict()` (orgId do cliente é recusado), todas exigem a
// sessão. Autorização, capability e checagem de posse vivem em
// src/lib/ivo/fibt-action-loop.server.ts. Fora da allowlist HML.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const token = z.string().min(10).optional();
const factorId = z.string().regex(/^[a-z][a-z_]{0,39}$/);
const planStatus = z.enum(["planejada", "em_execucao", "concluida", "em_vigilancia", "interrompida"]);
const executionMetric = z
  .object({
    label: z.string().trim().min(2).max(120),
    baseline: z.number().finite(),
    target: z.number().finite(),
    unit: z.string().trim().max(20),
  })
  .strict();

export const ivoActionLoopSchemas = {
  load: z.object({ accessToken: token }).strict(),
  createPriorities: z
    .object({
      accessToken: token,
      waveId: z.string().uuid(),
      priorities: z
        .array(
          z
            .object({
              cohortId: z.string().uuid(),
              factorId,
              title: z.string().trim().min(3).max(200),
              description: z.string().trim().max(1000).default(""),
              effort: z.enum(["baixo", "medio", "alto"]),
            })
            .strict(),
        )
        .min(1)
        .max(6),
    })
    .strict(),
  accountability: z
    .object({
      accessToken: token,
      itemId: z.string().uuid(),
      ownerRoleLabel: z.string().trim().min(2).max(80),
      dueOn: z.string().date(),
      executionMetric,
    })
    .strict(),
  activate: z.object({ accessToken: token, planId: z.string().uuid() }).strict(),
  // PI-13 · incluir ação em plano existente. planId/waveId/cohortId são REFERÊNCIAS: a
  // organização vem da sessão; o servidor relê o plano e revalida a origem publicada.
  addAction: z
    .object({
      accessToken: token,
      planId: z.string().uuid(),
      requestId: z.string().uuid(),
      waveId: z.string().uuid(),
      cohortId: z.string().uuid(),
      factorId,
      title: z.string().trim().min(3).max(200),
      description: z.string().trim().max(1000).default(""),
      effort: z.enum(["baixo", "medio", "alto"]),
      accountability: z
        .object({
          ownerRoleLabel: z.string().trim().min(2).max(80),
          dueOn: z.string().date(),
          executionMetric,
        })
        .strict()
        .optional(),
    })
    .strict(),
  // PI-13 · encerramento operacional. `confirm: true` é o aceite explícito do efeito (sem reabertura).
  closePlan: z.object({ accessToken: token, planId: z.string().uuid(), confirm: z.literal(true) }).strict(),
  status: z
    .object({
      accessToken: token,
      itemId: z.string().uuid(),
      toStatus: planStatus,
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
  evidence: z
    .object({
      accessToken: token,
      itemId: z.string().uuid(),
      scope: z.enum(["execucao", "aprendizagem"]),
      kind: z.enum(["texto", "checklist", "metrica"]).optional(),
      content: z.string().trim().min(3).max(2000),
      occurredOn: z.string().date(),
      contentId: z.string().regex(/^[A-Za-z0-9_.-]{1,80}$/).optional(),
    })
    .strict(),
};

async function loop() {
  return import("@/lib/ivo/fibt-action-loop.server");
}

export const loadFibtActionLoopFn = createServerFn({ method: "POST" })
  .inputValidator(ivoActionLoopSchemas.load)
  .handler(async ({ data }) => (await loop()).loadFibtActionLoop(data));

export const createFibtPriorityActionsFn = createServerFn({ method: "POST" })
  .inputValidator(ivoActionLoopSchemas.createPriorities)
  .handler(async ({ data }) => (await loop()).createFibtPriorityActions(data));

export const setFibtActionAccountabilityFn = createServerFn({ method: "POST" })
  .inputValidator(ivoActionLoopSchemas.accountability)
  .handler(async ({ data }) => (await loop()).setFibtActionAccountability(data));

export const activateFibtActionPlanFn = createServerFn({ method: "POST" })
  .inputValidator(ivoActionLoopSchemas.activate)
  .handler(async ({ data }) => (await loop()).activateFibtActionPlan(data));

async function composition() {
  return import("@/lib/ivo/fibt-plan-composition.server");
}

export const addFibtActionToPlanFn = createServerFn({ method: "POST" })
  .inputValidator(ivoActionLoopSchemas.addAction)
  .handler(async ({ data }) => (await composition()).addFibtActionToPlan(data));

export const closeFibtActionPlanFn = createServerFn({ method: "POST" })
  .inputValidator(ivoActionLoopSchemas.closePlan)
  .handler(async ({ data }) => (await composition()).closeFibtActionPlan({ accessToken: data.accessToken, planId: data.planId }));

export const recordFibtActionStatusFn = createServerFn({ method: "POST" })
  .inputValidator(ivoActionLoopSchemas.status)
  .handler(async ({ data }) => (await loop()).recordFibtActionStatus(data));

export const recordFibtActionEvidenceFn = createServerFn({ method: "POST" })
  .inputValidator(ivoActionLoopSchemas.evidence)
  .handler(async ({ data }) => (await loop()).recordFibtActionEvidence(data));
