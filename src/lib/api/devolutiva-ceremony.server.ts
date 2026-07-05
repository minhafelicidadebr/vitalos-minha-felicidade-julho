// Server-only: usa supabaseAdmin (service role) para chamar as 4 RPCs da
// Cerimônia da Devolutiva (migration 20260705120000_devolutiva_sessions.sql).
// Seguro apenas em .server.ts — não importar em código de cliente.
//
// A lista de drivers candidatos NUNCA é persistida — vem do mesmo motor
// determinístico (priority-engine) usado em /plano-acao; o servidor só grava
// a pauta final que o CHAMADOR apresentou no fechamento (mesma disciplina de
// create_action_plan receber os itens prontos, não recalculá-los).

type RpcRow<Extra extends Record<string, unknown> = Record<string, never>> = {
  accepted: boolean;
  reason: string | null;
} & Partial<Extra>;

async function callCeremonyRpc<Extra extends Record<string, unknown> = Record<string, never>>(
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

// ─── Abrir a cerimônia ───────────────────────────────────────────────────────

export interface OpenSessionInput {
  orgId: string;
  capsuleId: string | null;
  facilitatorUserId: string;
  scriptVersion: string;
}

export type OpenSessionResult =
  | { accepted: true; sessionId: string }
  | { accepted: false; reason: string };

export async function openDevolutivaSessionAsAdmin(input: OpenSessionInput): Promise<OpenSessionResult> {
  const row = await callCeremonyRpc<{ session_id: string | null }>("open_devolutiva_session", {
    p_org_id: input.orgId,
    p_capsule_id: input.capsuleId,
    p_facilitator_user_id: input.facilitatorUserId,
    p_script_version: input.scriptVersion,
  });
  if (!row.accepted || !row.session_id) return { accepted: false, reason: row.reason ?? "db_error" };
  return { accepted: true, sessionId: row.session_id };
}

// ─── Votar ───────────────────────────────────────────────────────────────────

export async function castPriorityVoteAsAdmin(
  sessionId: string,
  driverId: string,
): Promise<{ accepted: boolean; reason: string | null; votes: Record<string, number> | null }> {
  const row = await callCeremonyRpc<{ votes: Record<string, number> | null }>("cast_priority_vote", {
    p_session_id: sessionId,
    p_driver_id: driverId,
  });
  return { accepted: row.accepted, reason: row.reason, votes: row.votes ?? null };
}

// ─── Presença ────────────────────────────────────────────────────────────────

export async function setDevolutivaAttendanceAsAdmin(
  sessionId: string,
  attendanceCount: number,
): Promise<{ accepted: boolean; reason: string | null }> {
  return callCeremonyRpc("set_devolutiva_attendance", {
    p_session_id: sessionId,
    p_attendance_count: attendanceCount,
  });
}

// ─── Fechar — o quórum decide se a pauta é publicada ────────────────────────

export interface CloseSessionResult {
  accepted: boolean;
  reason: string | null;
  published: boolean;
  pauta: string[] | null;
}

export async function closeDevolutivaSessionAsAdmin(
  sessionId: string,
  candidateDriverIds: string[],
): Promise<CloseSessionResult> {
  const row = await callCeremonyRpc<{ published: boolean | null; pauta: string[] | null }>(
    "close_devolutiva_session",
    { p_session_id: sessionId, p_candidate_driver_ids: candidateDriverIds },
  );
  return { accepted: row.accepted, reason: row.reason, published: row.published ?? false, pauta: row.pauta ?? null };
}

// ─── Leitura: sessão mais recente da org ────────────────────────────────────

export interface LoadedCeremonySession {
  id: string;
  orgId: string;
  capsuleId: string | null;
  status: "open" | "closed";
  attendanceCount: number;
  votesByDriver: Record<string, number>;
  pautaDriverIds: string[] | null;
  heldOn: string;
  createdAt: string;
  closedAt: string | null;
}

export async function loadLatestDevolutivaSessionForOrg(
  orgId: string,
): Promise<LoadedCeremonySession | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data } = await admin
    .from("devolutiva_sessions")
    .select(
      "id, org_id, capsule_id, status, attendance_count, priority_votes, pauta_driver_ids, held_on, created_at, closed_at",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    orgId: data.org_id,
    capsuleId: data.capsule_id,
    status: data.status,
    attendanceCount: data.attendance_count,
    votesByDriver: data.priority_votes ?? {},
    pautaDriverIds: data.pauta_driver_ids ?? null,
    heldOn: data.held_on,
    createdAt: data.created_at,
    closedAt: data.closed_at,
  };
}
