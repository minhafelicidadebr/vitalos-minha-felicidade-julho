// Camada de acesso ao banco — usa o client Lovable como fonte de verdade.
// Regra: wave_responses nunca é lida pelo app. Apenas INSERT via RPC.
// Capsules são o único dado de volta — sempre agregados, n≥5.

import { supabase } from "@/integrations/supabase/client";
import type { WaveStatus } from "./database.types";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";

// ─── Tipos de domínio ──────────────────────────────────────────────────────────

export interface SubmitResponseInput {
  waveId: string;
  inviteToken: string;
  answers: Record<string, number>;
}

export interface SubmitResponseResult {
  accepted: boolean;
  reason?: "invalid_token" | "already_used" | "wave_not_open" | "db_error" | "no_cloud";
  responseCount?: number;
}

export interface CreateWaveInput {
  orgId: string;
  instrument: "COPSOQ" | "PERMA" | "VIA_T" | "FIB_T";
  label?: string;
  inviteCount: number;
  distributionMode?: "individual" | "sector";
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

// Atomicidade (P0-06, Sprint S3): validar convite, checar vínculo com a
// onda, checar status, inserir e consumir o token viviam em 3 chamadas HTTP
// separadas — duas submissões simultâneas com o mesmo token podiam ambas
// passar pela checagem antes de qualquer uma consumi-lo. Agora é uma única
// RPC (submit_wave_response) que trava a linha do convite e faz tudo na
// mesma transação: a segunda chamada concorrente sempre vê "already_used".
export async function saveWaveResponse(input: SubmitResponseInput): Promise<SubmitResponseResult> {
  const { data, error } = await db.rpc("submit_wave_response", {
    p_wave_id: input.waveId,
    p_invite_token: input.inviteToken,
    p_answers: input.answers,
  });

  if (error) return { accepted: false, reason: "db_error" };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.accepted) {
    const reason = row?.reason as SubmitResponseResult["reason"] | undefined;
    return { accepted: false, reason: reason ?? "db_error" };
  }

  return { accepted: true, responseCount: (row.response_count as number | null) ?? undefined };
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
      // FIB-T: a versao aplicada na onda e a do manifesto carregado. Sem ela o
      // leitor protegido recusa a onda (methodology_error) e nenhuma leitura
      // aparece. Outros instrumentos seguem como estavam.
      ...(input.instrument === "FIB_T" ? { instrument_version: getFibtManifest().instrument_version } : {}),
    })
    .select("id")
    .single();

  if (waveErr || !wave) {
    return { error: waveErr?.message ?? "Falha ao inserir onda — resposta vazia do banco." };
  }

  if (input.distributionMode === "sector") {
    return {
      waveId: wave.id,
      inviteTokens: [],
      inviteLinks: [],
      inviteEmails: [],
    };
  }

  // Só toca na coluna email quando há e-mails de fato: o fluxo majoritário
  // (links genéricos p/ WhatsApp) não pode falhar se a migration
  // 20260713210000_add_wave_invites_email ainda não tiver sido aplicada ao
  // banco remoto — inserir a chave (mesmo NULL) ou selecioná-la derruba o
  // PostgREST com "Could not find the 'email' column in the schema cache".
  const hasEmails = (input.emails ?? []).some((e) => e != null && e.trim() !== "");
  const inviteRows = Array.from({ length: input.inviteCount }, (_, i) =>
    hasEmails ? { wave_id: wave.id, email: input.emails?.[i] ?? null } : { wave_id: wave.id },
  );
  const { data: invites, error: inviteErr } = await adminClient
    .from("wave_invites")
    .insert(inviteRows)
    .select(hasEmails ? "token, email" : "token");

  if (inviteErr || !invites) {
    return { error: inviteErr?.message ?? "Falha ao gerar convites — resposta vazia do banco." };
  }

  // Zipado da MESMA resposta — garante alinhamento de índice entre os três arrays.
  const rows = invites as Array<{ token: string; email?: string | null }>;
  const tokens = rows.map((i) => i.token);
  const links = rows.map((i) => `${BASE_URL}/convite/${i.token}`);
  const emails = rows.map((i) => i.email ?? null);

  return { waveId: wave.id, inviteTokens: tokens, inviteLinks: links, inviteEmails: emails };
}

// ─── Leitura org-scoped (Q1.1B) ────────────────────────────────────────────
// Autorização nunca depende só do filtro .eq("org_id", orgId): orgId nunca é
// aceito como prova de autorização por si — cada leitura reverifica de forma
// autoritativa, a partir do PRÓPRIO access_token, qual é a org real do
// chamador (resolveMembership), e só prossegue se ela bater com o orgId
// pedido. Isso fecha a lacuna registrada em
// docs/handoff/Q1.1_SAAS_OPERATIONAL_PROOF_2026-07-24.md §3: antes, o client
// (`db`) rodava sem sessão anexada no servidor, então a policy de RLS
// (`waves_org`/`capsule_org`, auth.uid()-based) nunca discriminava aqui — a
// única proteção era o filtro de aplicação. Agora a checagem de membership é
// refeita no próprio ponto de leitura, nunca só herdada de quem chamou antes.
//
// `resolveMembership` é OBRIGATÓRIO (sem default): db-adapter.ts não tem
// sufixo .server.ts e não deve depender estaticamente de authorize.server.ts
// (que resolve sessão real via service role). Quem chama em produção
// (wave-admin.functions.ts) importa e passa resolveOrgMembership.

/** Mesma forma de src/lib/auth/authorize.server.ts — import de TIPO apenas
 * (erased em runtime), para não criar dependência estática real. */
export type ResolveOrgMembershipFn = (accessToken: string) => Promise<
  | { ok: true; membership: { userId: string; orgId: string; role: string } }
  | { ok: false; reason: "invalid_session" | "no_profile" | "not_admin" }
>;

export interface OrgScopedReadDeps {
  /** Injeção de teste — nunca fornecida em produção. Ausente, usa o client real (db). */
  client?: typeof db;
  /** Validação autoritativa de membership — sempre a real (resolveOrgMembership) em produção. */
  resolveMembership: ResolveOrgMembershipFn;
}

export type OrgScopedReadFailure = "invalid_session" | "no_profile" | "org_mismatch";

export type OrgScopedListResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; reason: OrgScopedReadFailure };

async function authorizeOrgRead(
  accessToken: string,
  orgId: string,
  resolveMembership: ResolveOrgMembershipFn,
): Promise<{ ok: true } | { ok: false; reason: OrgScopedReadFailure }> {
  const membership = await resolveMembership(accessToken);
  if (!membership.ok) {
    // "not_admin" nunca se aplica a uma leitura (qualquer membro pode ler a
    // própria org) — só pode surgir aqui se o chamador reusar um resolver de
    // admin por engano; tratado como sessão sem perfil válido para leitura.
    return { ok: false, reason: membership.reason === "not_admin" ? "no_profile" : membership.reason };
  }
  if (membership.membership.orgId !== orgId) {
    return { ok: false, reason: "org_mismatch" };
  }
  return { ok: true };
}

export async function listOrgWaves(
  accessToken: string,
  orgId: string,
  deps: OrgScopedReadDeps,
): Promise<OrgScopedListResult<WaveSummary>> {
  const authz = await authorizeOrgRead(accessToken, orgId, deps.resolveMembership);
  if (!authz.ok) return authz;

  const client = deps.client ?? db;
  const { data } = await client
    .from("waves")
    .select("id, instrument, label, status, invited_count, closes_at, created_at, sealed_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const items = ((data ?? []) as Array<{
    id: string; instrument: string; label: string | null; status: WaveStatus;
    invited_count: number; closes_at: string | null; created_at: string; sealed_at: string | null;
  }>).map((w) => ({
    id: w.id, instrument: w.instrument, label: w.label, status: w.status,
    invitedCount: w.invited_count, closesAt: w.closes_at,
    createdAt: w.created_at, sealedAt: w.sealed_at,
  }));
  return { ok: true, items };
}

export async function listOrgCapsules(
  accessToken: string,
  orgId: string,
  deps: OrgScopedReadDeps,
): Promise<OrgScopedListResult<CapsuleSummary>> {
  const authz = await authorizeOrgRead(accessToken, orgId, deps.resolveMembership);
  if (!authz.ok) return authz;

  const client = deps.client ?? db;
  const { data } = await client
    .from("wave_capsules")
    .select("id, wave_id, instrument, participant_count, aggregated_at, dimensions, outcomes")
    .eq("org_id", orgId)
    .order("aggregated_at", { ascending: false });

  const items = ((data ?? []) as Array<{
    id: string; wave_id: string; instrument: string; participant_count: number;
    aggregated_at: string; dimensions: unknown; outcomes: unknown;
  }>).map((c) => ({
    id: c.id, waveId: c.wave_id, instrument: c.instrument,
    participantCount: c.participant_count, aggregatedAt: c.aggregated_at,
    dimensions: (c.dimensions ?? {}) as DimMap,
    outcomes: (c.outcomes ?? null) as CapsuleSummary["outcomes"],
  }));
  return { ok: true, items };
}
