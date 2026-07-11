// Convites e formação bilateral da Dupla de Prática (I6 real, fase 2).
// Convidar/listar = cliente via RLS (só as duas partes enxergam); ACEITAR/
// recusar/cancelar = RPCs (máquina de estados atômica — nunca UPDATE livre).
// A dupla (pair_records) só nasce dentro da RPC accept_pair_invite.

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any; // tipos resolvem pós-geração de schema pelo Lovable

export interface PairInvite {
  id: string;
  fromUser: string;
  toUser: string;
  focusDriverId: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
}

export interface RealPair {
  id: string;
  memberA: string;
  memberB: string;
  focusDriverId: string;
  formedOn: string;
}

interface InviteRow {
  id: string;
  from_user: string;
  to_user: string;
  focus_driver_id: string;
  status: string;
}

interface PairRow {
  id: string;
  member_a: string;
  member_b: string;
  focus_driver_id: string;
  formed_on: string;
}

/** Convites PENDENTES em que eu sou parte (enviados e recebidos — RLS já recorta). */
export async function loadMyPendingInvites(): Promise<PairInvite[]> {
  const { data, error } = await db
    .from("pair_invites")
    .select("id, from_user, to_user, focus_driver_id, status")
    .eq("status", "pending");
  if (error) {
    console.warn("[pair-invite-adapter] falha ao carregar convites", error.message);
    return [];
  }
  return ((data ?? []) as InviteRow[]).map((row) => ({
    id: row.id,
    fromUser: row.from_user,
    toUser: row.to_user,
    focusDriverId: row.focus_driver_id,
    status: row.status as PairInvite["status"],
  }));
}

/** Minha dupla ATIVA, se existir (RLS: só membros enxergam). */
export async function loadMyActivePair(): Promise<RealPair | null> {
  const { data, error } = await db
    .from("pair_records")
    .select("id, member_a, member_b, focus_driver_id, formed_on")
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as PairRow;
  return {
    id: row.id,
    memberA: row.member_a,
    memberB: row.member_b,
    focusDriverId: row.focus_driver_id,
    formedOn: row.formed_on,
  };
}

/** Convida um colega do diretório (RLS valida: visível, mesma org, nunca a si mesmo). */
export async function sendPairInvite(
  orgId: string,
  fromUser: string,
  toUser: string,
  focusDriverId: string,
): Promise<{ sent: boolean; reason?: string }> {
  const { error } = await db.from("pair_invites").insert({
    org_id: orgId,
    from_user: fromUser,
    to_user: toUser,
    focus_driver_id: focusDriverId,
  });
  if (error) {
    // 23505 = UNIQUE parcial: já existe convite pendente para esse par.
    const reason = String(error.code) === "23505" ? "already_invited" : "insert_failed";
    if (reason === "insert_failed") {
      console.warn("[pair-invite-adapter] falha ao convidar", error.message);
    }
    return { sent: false, reason };
  }
  return { sent: true };
}

/** Aceita — o aperto de mão atômico acontece DENTRO da RPC. */
export async function acceptPairInvite(
  inviteId: string,
): Promise<{ accepted: boolean; reason?: string; pairId?: string }> {
  const { data, error } = await db.rpc("accept_pair_invite", { p_invite_id: inviteId });
  if (error) {
    console.warn("[pair-invite-adapter] falha ao aceitar", error.message);
    return { accepted: false, reason: "rpc_error" };
  }
  const outcome = (Array.isArray(data) ? data[0] : data) as
    | { accepted: boolean; reason: string | null; pair_id: string | null }
    | null;
  if (!outcome?.accepted) return { accepted: false, reason: outcome?.reason ?? "rpc_error" };
  return { accepted: true, pairId: outcome.pair_id ?? undefined };
}

export async function declinePairInvite(inviteId: string): Promise<boolean> {
  const { data, error } = await db.rpc("decline_pair_invite", { p_invite_id: inviteId });
  return !error && Boolean(data);
}

export async function cancelPairInvite(inviteId: string): Promise<boolean> {
  const { data, error } = await db.rpc("cancel_pair_invite", { p_invite_id: inviteId });
  return !error && Boolean(data);
}
