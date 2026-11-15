// Server functions do Cofre de Ciclos (I-P1, Sprint S6.75).
//
// Modelo de confiança (mesma disciplina de wave-admin.functions.ts, P0-04):
// nenhuma função aqui aceita orgId do cliente. O chamador manda o
// access_token da própria sessão; o servidor resolve a organização real via
// resolveOrgMembership/requireOrgAdmin — nunca uma escolhida pelo payload.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  listRegisterableCapsulesForOrg,
  loadOrgCycleHistory,
  registerOrgCycleAsAdmin,
  type RegisterableCapsule,
} from "../evolucao/cycle-history.server";
import { buildCycleProofFromHistory, type CycleProof } from "../proof/cycle-proof.server";
import { isCloudReady } from "../cloud/supabase-client";
import { describeAuthFailure, requireOrgAdmin, resolveOrgMembership } from "@/lib/auth/authorize.server";
import { isCapabilityEnabled } from "@/lib/capabilities/registry";

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });
const instrumentSchema = z.string().min(2).max(20).default("COPSOQ");

// ─── Carregar o histórico + a Prova de Ciclo real (leitura — qualquer membro) ─

export type LoadCycleHistoryResult =
  | { cloudReady: false }
  | { cloudReady: true; error: string }
  | {
    cloudReady: true;
    instrument: string;
    registeredCycles: Array<{ cycleKey: string; closedOn: string; participantCount: number }>;
    proof: CycleProof | null;
  };

export const loadCycleHistory = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema.extend({ instrument: instrumentSchema }))
  .handler(async ({ data }): Promise<LoadCycleHistoryResult> => {
    if (!isCapabilityEnabled("ORGANIZATION_CYCLE")) return { cloudReady: false };
    if (!isCloudReady()) return { cloudReady: false };

    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { cloudReady: true, error: describeAuthFailure(auth.reason) };

    const access = await (await import("@/lib/identity/module-access.server")).checkInstrument(auth.membership.orgId, data.instrument);
    if (!access.ok) return { cloudReady: true, error: access.error };
    const history = await loadOrgCycleHistory(auth.membership.orgId, data.instrument);
    const registeredCycles = history.map((c) => ({
      cycleKey: c.cohortId,
      closedOn: c.closedOn,
      participantCount: c.participantCount,
    }));
    const proof =
      history.length >= 2
        ? buildCycleProofFromHistory(history, history[0]!.packId, data.instrument)
        : null;

    return { cloudReady: true, instrument: data.instrument, registeredCycles, proof };
  });

// ─── Listar cápsulas seladas elegíveis para registro (admin) ────────────────

export type ListRegisterableResult =
  | { cloudReady: false }
  | { cloudReady: true; error: string }
  | { cloudReady: true; capsules: RegisterableCapsule[] };

export const listRegisterableCapsules = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema.extend({ instrument: instrumentSchema }))
  .handler(async ({ data }): Promise<ListRegisterableResult> => {
    if (!isCapabilityEnabled("ORGANIZATION_CYCLE")) return { cloudReady: false };
    if (!isCloudReady()) return { cloudReady: false };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { cloudReady: true, error: describeAuthFailure(auth.reason) };

    const access = await (await import("@/lib/identity/module-access.server")).checkInstrument(auth.membership.orgId, data.instrument);
    if (!access.ok) return { cloudReady: true, error: access.error };
    const capsules = await listRegisterableCapsulesForOrg(auth.membership.orgId, data.instrument);
    return { cloudReady: true, capsules };
  });

// ─── Registrar uma cápsula selada como ciclo da série ───────────────────────

const registerSchema = accessTokenSchema.extend({
  instrument: instrumentSchema,
  cycleKey: z.string().min(1).max(40),
  capsuleId: z.string().uuid(),
});

export const registerOrgCycle = createServerFn({ method: "POST" })
  .inputValidator(registerSchema)
  .handler(async ({ data }) => {
    if (!isCapabilityEnabled("ORGANIZATION_CYCLE")) {
      return { accepted: false as const, reason: "capability_disabled", registryId: null };
    }
    if (!isCloudReady()) return { accepted: false as const, reason: "cloud_not_ready", registryId: null };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) {
      return { accepted: false as const, reason: describeAuthFailure(auth.reason), registryId: null };
    }

    // O registrador também confere a cápsula; resolve-se aqui sua onda persistida.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const capsule = await (supabaseAdmin as any).from("wave_capsules").select("wave_id").eq("id", data.capsuleId).eq("org_id", auth.membership.orgId).maybeSingle();
    const source = capsule.data && !capsule.error ? await (await import("@/lib/identity/module-access.server")).checkWave(auth.membership.orgId, capsule.data.wave_id) : { ok: false as const, error: "Cápsula indisponível nesta empresa." };
    if (!source.ok) return { accepted: false as const, reason: source.error, registryId: null };
    return registerOrgCycleAsAdmin(
      auth.membership.orgId,
      data.instrument,
      data.cycleKey,
      data.capsuleId,
      auth.membership.userId,
    );
  });
