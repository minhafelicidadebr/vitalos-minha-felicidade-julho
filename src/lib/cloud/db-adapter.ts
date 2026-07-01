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
  // Quando presente, deve ter exatamente inviteCount itens — um e-mail por convite,
  // na mesma ordem em que os tokens serão gerados (alinhamento garantido pelo
  // caller via emails.length === inviteCount, validado em wave-admin.server.ts).
  emails?: string[];
}

export interface CreateWaveResult {
  waveId: string;
  inviteTokens: string[];
  inviteLinks: string[];
  // Alinhado por índice com inviteTokens/inviteLinks; null quando o convite
  // não tem e-mail associado (fluxo de link genérico para WhatsApp).
  inviteEmails: (string | null)[];
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
  const { data: valid } = await db.rpc("is_invite_valid_for_wave", {
    p_wave_id: input.waveId,
    p_token: input.inviteToken,
  });
  if (!valid) return { accepted: false, reason: "already_used" };

  const { error: insertErr } = await db.from("wave_responses").insert({
    wave_id: input.waveId,
    invite_token: input.inviteToken,
    answers: input.answers,
  });
  if (insertErr) return { accepted: false, reason: "db_error" };

  // RPC SECURITY DEFINER — wave_invites não tem policy de UPDATE para o cliente anônimo.
  await db.rpc("mark_invite_used", { p_token: input.inviteToken });

  const { data: count } = await db.rpc("count_wave_responses", { p_wave_id: input.waveId });
  return { accepted: true, responseCount: count ?? undefined };
}

// ─── Ondas (admin — usa service role via server function) ──────────────────────

export async function createWaveWithAdmin(
  input: CreateWaveInput,
  adminClient: any,
): Promise<CreateWaveResult | { error: string }> {
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

  if (waveErr || !wave) {
    return { error: waveErr?.message ?? "Falha ao inserir onda — resposta vazia do banco." };
  }

  const inviteRows = Array.from({ length: input.inviteCount }, (_, i) => ({
    wave_id: wave.id,
    email: input.emails?.[i] ?? null,
  }));
  const { data: invites, error: inviteErr } = await adminClient
    .from("wave_invites")
    .insert(inviteRows)
    .select("token, email");

  if (inviteErr || !invites) {
    return { error: inviteErr?.message ?? "Falha ao gerar convites — resposta vazia do banco." };
  }

  // Zipado da MESMA resposta — garante alinhamento de índice entre os três arrays.
  const rows = invites as Array<{ token: string; email: string | null }>;
  const tokens = rows.map((i) => i.token);
  const links = rows.map((i) => `${BASE_URL}/convite/${i.token}`);
  const emails = rows.map((i) => i.email);

  return { waveId: wave.id, inviteTokens: tokens, inviteLinks: links, inviteEmails: emails };
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
