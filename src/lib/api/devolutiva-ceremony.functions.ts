// Server functions da Cerimônia da Devolutiva (I-T2, Sprint S6.4).
//
// Modelo de confiança (mesma disciplina de wave-admin.functions.ts, P0-04):
// nenhuma função aqui aceita orgId do cliente. O chamador manda o
// access_token da própria sessão; o servidor resolve a organização real via
// resolveOrgMembership/requireOrgAdmin — nunca uma escolhida pelo payload.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  castPriorityVoteAsAdmin,
  closeDevolutivaSessionAsAdmin,
  loadLatestDevolutivaSessionForOrg,
  openDevolutivaSessionAsAdmin,
  setDevolutivaAttendanceAsAdmin,
  type LoadedCeremonySession,
} from "./devolutiva-ceremony.server";

export type { LoadedCeremonySession } from "./devolutiva-ceremony.server";
import { isCloudReady } from "../cloud/supabase-client";
import { describeAuthFailure, requireOrgAdmin, resolveOrgMembership } from "@/lib/auth/authorize.server";

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });

// ─── Carregar a sessão corrente da org (leitura — qualquer membro) ──────────

export type LoadCeremonyResult =
  | { cloudReady: false }
  | { cloudReady: true; error: string }
  | { cloudReady: true; session: LoadedCeremonySession | null };

export const loadDevolutivaCeremony = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema)
  .handler(async ({ data }): Promise<LoadCeremonyResult> => {
    if (!isCloudReady()) return { cloudReady: false };

    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { cloudReady: true, error: describeAuthFailure(auth.reason) };

    const session = await loadLatestDevolutivaSessionForOrg(auth.membership.orgId);
    return { cloudReady: true, session };
  });

// ─── Abrir a cerimônia (facilitador = admin do pack) ────────────────────────

const openSchema = accessTokenSchema.extend({
  capsuleId: z.string().uuid().nullable(),
  scriptVersion: z.string().min(1).max(20).default("v1"),
});

export const openDevolutivaCeremony = createServerFn({ method: "POST" })
  .inputValidator(openSchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) return { accepted: false as const, reason: "cloud_not_ready" };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { accepted: false as const, reason: describeAuthFailure(auth.reason) };

    return openDevolutivaSessionAsAdmin({
      orgId: auth.membership.orgId,
      capsuleId: data.capsuleId,
      facilitatorUserId: auth.membership.userId,
      scriptVersion: data.scriptVersion,
    });
  });

// ─── Votar — nunca carrega identidade de quem vota ──────────────────────────

const voteSchema = accessTokenSchema.extend({
  sessionId: z.string().uuid(),
  driverId: z.string().min(1).max(120),
});

export const castCeremonyVote = createServerFn({ method: "POST" })
  .inputValidator(voteSchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) return { accepted: false, reason: "cloud_not_ready", votes: null };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { accepted: false, reason: describeAuthFailure(auth.reason), votes: null };

    return castPriorityVoteAsAdmin(data.sessionId, data.driverId);
  });

// ─── Atualizar presença ──────────────────────────────────────────────────────

const attendanceSchema = accessTokenSchema.extend({
  sessionId: z.string().uuid(),
  attendanceCount: z.number().int().min(0).max(100000),
});

export const setCeremonyAttendance = createServerFn({ method: "POST" })
  .inputValidator(attendanceSchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) return { accepted: false, reason: "cloud_not_ready" };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { accepted: false, reason: describeAuthFailure(auth.reason) };

    return setDevolutivaAttendanceAsAdmin(data.sessionId, data.attendanceCount);
  });

// ─── Fechar — o quórum decide se a pauta é publicada ────────────────────────

const closeSchema = accessTokenSchema.extend({
  sessionId: z.string().uuid(),
  candidateDriverIds: z.array(z.string().min(1)).min(1).max(50),
});

export const closeCeremony = createServerFn({ method: "POST" })
  .inputValidator(closeSchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) {
      return { accepted: false as const, reason: "cloud_not_ready", published: false, pauta: null };
    }

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) {
      return { accepted: false as const, reason: describeAuthFailure(auth.reason), published: false, pauta: null };
    }

    return closeDevolutivaSessionAsAdmin(data.sessionId, data.candidateDriverIds);
  });
