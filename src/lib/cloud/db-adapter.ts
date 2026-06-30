// Camada de acesso ao banco — usa o client Lovable como fonte de verdade.
// Regra: wave_responses nunca é lida pelo app. Apenas INSERT via RPC.
// Capsules são o único dado de volta — sempre agregados, n≥5.

import { supabase } from "@/integrations/supabase/client";
import type { WaveStatus } from "./database.types";

// ─── Tipos de domínio ──────────────────────────────────────────────────────────

export interface SubmitResponseInput {
  waveId: string;
  inviteToken: string;
  answers: Record<string, number>;
}

export interface SubmitResponseResult {
  accepted: boolean;
  reason?: "invalid_token" | "already_used" | "db_error" | "no_cloud";
  responseCount?: number;
}

export interface CreateWaveInput {
  orgId: string;
  instrument: "COPSOQ" | "PERMA" | "VIA_T";
  label?: string;
  inviteCount: number;
  closesAt?: string;
}

export interface CreateWaveResult {
  waveId: string;
  inviteTokens: string[];
  inviteLinks: string[];
}

export interface WaveSummary {
  id: string;
  instrument: string;
  label: string | null;
  status: WaveStatus;
  invitedCount: number;
  closesAt: string | null;
  createdAt: string;
  sealedAt: string | null;
}

export type DimMap = Record<string, { mean: number; high_risk_pct: number; label?: string }>;

export interface CapsuleSummary {
  id: string;
  waveId: string;
  instrument: string;
  participantCount: number;
  aggregatedAt: string;
  dimensions: DimMap;
  outcomes: Record<string, string | number | boolean | null> | null;
}

const db = supabase as any; // tipos resolvem pós-geração de schema pelo Lovable

const BASE_URL = import.meta.env.VITE_APP_URL?.trim() || "https://app.vitalos.com.br";

// ─── Respostas (write-only) ────────────────────────────────────────────────────

export async function saveWaveResponse(input: SubmitResponseInput): Promise<SubmitResponseResult> {
  const { data: valid } = await db.rpc("is_invite_valid", { p_token: input.inviteToken });
  if (!valid) return { accepted: false, reason: "already_used" };

  const { error: insertErr } = await db.from("wave_responses").insert({
    wave_id: input.waveId,
    invite_token: input.inviteToken,
    answers: input.answers,
  });
  if (insertErr) return { accepted: false, reason: "db_error" };

  await db
    .from("wave_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", input.inviteToken);

  const { data: count } = await db.rpc("count_wave_responses", { p_wave_id: input.waveId });
  return { accepted: true, responseCount: count ?? undefined };
}

// ─── Ondas (admin — usa service role via server function) ──────────────────────

export async function createWaveWithAdmin(
  input: CreateWaveInput,
  adminClient: any,
): Promise<CreateWaveResult | null> {
  const { data: wave, error: waveErr } = await adminClient
    .from("waves")
    .insert({
      org_id: input.orgId,
      instrument: input.instrument,
      label: input.label ?? `${input.instrument} · ${new Date().toLocaleDateString("pt-BR")}`,
      status: "collecting",
      invited_count: input.inviteCount,
      closes_at: input.closesAt ?? null,
    })
    .select("id")
    .single();

  if (waveErr || !wave) return null;

  const inviteRows = Array.from({ length: input.inviteCount }, () => ({ wave_id: wave.id }));
  const { data: invites, error: inviteErr } = await adminClient
    .from("wave_invites")
    .insert(inviteRows)
    .select("token");

  if (inviteErr || !invites) return null;

  const tokens = (invites as Array<{ token: string }>).map((i) => i.token);
  const links = tokens.map((t) => `${BASE_URL}/responder/${t}`);
  return { waveId: wave.id, inviteTokens: tokens, inviteLinks: links };
}

export async function listOrgWaves(orgId: string): Promise<WaveSummary[]> {
  const { data } = await db
    .from("waves")
    .select("id, instrument, label, status, invited_count, closes_at, created_at, sealed_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as Array<{
    id: string; instrument: string; label: string | null; status: WaveStatus;
    invited_count: number; closes_at: string | null; created_at: string; sealed_at: string | null;
  }>).map((w) => ({
    id: w.id, instrument: w.instrument, label: w.label, status: w.status,
    invitedCount: w.invited_count, closesAt: w.closes_at,
    createdAt: w.created_at, sealedAt: w.sealed_at,
  }));
}

export async function listOrgCapsules(orgId: string): Promise<CapsuleSummary[]> {
  const { data } = await db
    .from("wave_capsules")
    .select("id, wave_id, instrument, participant_count, aggregated_at, dimensions, outcomes")
    .eq("org_id", orgId)
    .order("aggregated_at", { ascending: false });

  return ((data ?? []) as Array<{
    id: string; wave_id: string; instrument: string; participant_count: number;
    aggregated_at: string; dimensions: unknown; outcomes: unknown;
  }>).map((c) => ({
    id: c.id, waveId: c.wave_id, instrument: c.instrument,
    participantCount: c.participant_count, aggregatedAt: c.aggregated_at,
    dimensions: (c.dimensions ?? {}) as DimMap,
    outcomes: (c.outcomes ?? null) as CapsuleSummary["outcomes"],
  }));
}
