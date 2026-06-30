// Camada de acesso ao banco — abstrai Supabase e mantém invariantes de privacidade.
// Regra central: wave_responses nunca é lida pelo app. Apenas INSERT.
// Capsules são o único dado de volta — sempre agregados, sempre n≥5.
//
// Nota de tipos: usamos 'as any' nos pontos de fronteira Supabase porque
// a inferência genérica do SDK falha sem um projeto Supabase real conectado
// (o 'from()' resolve para 'never' sem schema auto-gerado). Os tipos de domínio
// (interfaces abaixo) continuam totalmente tipados.

import { getSupabaseClient } from "./supabase-client";
import type { WaveStatus } from "./database.types";

// ─── Tipos de domínio ──────────────────────────────────────────────────────────

export interface SubmitResponseInput {
  waveId: string;
  inviteToken: string;
  answers: Record<string, number>; // { item_id: score }
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

// ─── Respostas (write-only) ────────────────────────────────────────────────────

/**
 * Salva uma resposta de questionário. O invite_token é o único elo de auditoria —
 * NÃO é a identidade do respondente. Após INSERT, marca o token como usado.
 * Invariante: nenhum SELECT em wave_responses — só o COUNT server-side.
 */
export async function saveWaveResponse(input: SubmitResponseInput): Promise<SubmitResponseResult> {
  const db = getSupabaseClient();
  if (!db) return { accepted: false, reason: "no_cloud" };

  const client = db as any; // fronteira Supabase — tipos resolvem pós-geração de schema

  // 1. Valida token via função SECURITY DEFINER (não lê a tabela diretamente)
  const { data: valid } = await client.rpc("is_invite_valid", { p_token: input.inviteToken });
  if (!valid) return { accepted: false, reason: "already_used" };

  // 2. INSERT resposta (RLS garante que só insere com token válido)
  const { error: insertErr } = await client.from("wave_responses").insert({
    wave_id: input.waveId,
    invite_token: input.inviteToken,
    answers: input.answers,
  });
  if (insertErr) return { accepted: false, reason: "db_error" };

  // 3. Marca token como usado (quem chegar primeiro leva)
  await client
    .from("wave_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", input.inviteToken);

  // 4. Conta respostas via função server-side (nunca SELECT direto)
  const { data: count } = await client.rpc("count_wave_responses", { p_wave_id: input.waveId });

  return { accepted: true, responseCount: count ?? undefined };
}

// ─── Ondas (admin) ─────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_APP_URL?.trim() || "https://app.vitalos.com.br";

export async function createWave(input: CreateWaveInput): Promise<CreateWaveResult | null> {
  const db = getSupabaseClient();
  if (!db) return null;

  const client = db as any;

  const { data: wave, error: waveErr } = await client
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

  const { data: invites, error: inviteErr } = await client
    .from("wave_invites")
    .insert(inviteRows)
    .select("token");

  if (inviteErr || !invites) return null;

  const tokens = (invites as Array<{ token: string }>).map((i) => i.token);
  const links = tokens.map((t) => `${BASE_URL}/responder/${t}`);

  return { waveId: wave.id, inviteTokens: tokens, inviteLinks: links };
}

export async function listOrgWaves(orgId: string): Promise<WaveSummary[]> {
  const db = getSupabaseClient();
  if (!db) return [];

  const client = db as any;
  const { data } = await client
    .from("waves")
    .select("id, instrument, label, status, invited_count, closes_at, created_at, sealed_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as Array<{
    id: string; instrument: string; label: string | null; status: WaveStatus;
    invited_count: number; closes_at: string | null; created_at: string; sealed_at: string | null;
  }>).map((w) => ({
    id: w.id,
    instrument: w.instrument,
    label: w.label,
    status: w.status,
    invitedCount: w.invited_count,
    closesAt: w.closes_at,
    createdAt: w.created_at,
    sealedAt: w.sealed_at,
  }));
}

// ─── Capsules (read) ───────────────────────────────────────────────────────────

export async function listOrgCapsules(orgId: string): Promise<CapsuleSummary[]> {
  const db = getSupabaseClient();
  if (!db) return [];

  const client = db as any;
  const { data } = await client
    .from("wave_capsules")
    .select("id, wave_id, instrument, participant_count, aggregated_at, dimensions, outcomes")
    .eq("org_id", orgId)
    .order("aggregated_at", { ascending: false });

  return ((data ?? []) as Array<{
    id: string; wave_id: string; instrument: string; participant_count: number;
    aggregated_at: string; dimensions: unknown; outcomes: unknown;
  }>).map((c) => ({
    id: c.id,
    waveId: c.wave_id,
    instrument: c.instrument,
    participantCount: c.participant_count,
    aggregatedAt: c.aggregated_at,
    dimensions: (c.dimensions ?? {}) as DimMap,
    outcomes: (c.outcomes ?? null) as CapsuleSummary["outcomes"],
  }));
}

export async function getLatestCapsuleForOrg(
  orgId: string,
  instrument: string,
): Promise<CapsuleSummary | null> {
  const db = getSupabaseClient();
  if (!db) return null;

  const client = db as any;
  const { data } = await client
    .from("wave_capsules")
    .select("id, wave_id, instrument, participant_count, aggregated_at, dimensions, outcomes")
    .eq("org_id", orgId)
    .eq("instrument", instrument)
    .order("aggregated_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  const c = data as {
    id: string; wave_id: string; instrument: string; participant_count: number;
    aggregated_at: string; dimensions: unknown; outcomes: unknown;
  };

  return {
    id: c.id,
    waveId: c.wave_id,
    instrument: c.instrument,
    participantCount: c.participant_count,
    aggregatedAt: c.aggregated_at,
    dimensions: (c.dimensions ?? {}) as DimMap,
    outcomes: (c.outcomes ?? null) as CapsuleSummary["outcomes"],
  };
}
