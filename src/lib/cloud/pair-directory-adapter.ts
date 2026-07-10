// Diretório consentido de colegas (Academia Viva 2.0 I6 real) — cada pessoa
// controla a própria entrada (RLS own-write), mas a leitura alcança todo
// colega VISÍVEL da mesma organização (RLS org-scoped read) — é o propósito
// da tabela: ser um diretório, não um registro privado.
//
// Entrar no diretório É o ato de consentir ser visto — nenhum roster
// importado automaticamente. Sair (setVisible(false) ou remove) tira a
// pessoa de toda sugestão/listagem imediatamente.

import { supabase } from "@/integrations/supabase/client";
import type { PairProfile } from "@/engine/learning/practice-pair-engine";

const db = supabase as any; // tipos resolvem pós-geração de schema pelo Lovable

interface DirectoryRow {
  user_id: string;
  display_name: string;
  focus_driver_id: string;
  shared_strength_ids: string[];
}

/** Colegas visíveis da MESMA org (RLS já filtra — nunca cross-tenant). */
export async function loadOrgDirectory(excludeUserId: string): Promise<PairProfile[]> {
  const { data, error } = await db
    .from("pair_directory_entries")
    .select("user_id, display_name, focus_driver_id, shared_strength_ids")
    .neq("user_id", excludeUserId);
  if (error) {
    console.warn("[pair-directory-adapter] falha ao carregar diretório", error.message);
    return [];
  }
  return ((data ?? []) as DirectoryRow[]).map((row) => ({
    personId: row.user_id,
    displayName: row.display_name,
    focusDriverId: row.focus_driver_id,
    sharedStrengthIds: row.shared_strength_ids,
  }));
}

/** A PRÓPRIA entrada (para saber se a pessoa já optou por entrar). */
export async function loadOwnDirectoryEntry(userId: string): Promise<PairProfile | null> {
  const { data, error } = await db
    .from("pair_directory_entries")
    .select("user_id, display_name, focus_driver_id, shared_strength_ids")
    .eq("user_id", userId)
    .eq("visible", true)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as DirectoryRow;
  return {
    personId: row.user_id,
    displayName: row.display_name,
    focusDriverId: row.focus_driver_id,
    sharedStrengthIds: row.shared_strength_ids,
  };
}

/** Entra (ou atualiza a própria entrada) no diretório — o ato de consentir. */
export async function upsertOwnDirectoryEntry(
  userId: string,
  orgId: string,
  profile: PairProfile,
): Promise<boolean> {
  const { error } = await db.from("pair_directory_entries").upsert(
    {
      user_id: userId,
      org_id: orgId,
      display_name: profile.displayName,
      focus_driver_id: profile.focusDriverId,
      shared_strength_ids: [...profile.sharedStrengthIds],
      visible: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.warn("[pair-directory-adapter] falha ao entrar no diretório", error.message);
    return false;
  }
  return true;
}

/** Sai do diretório — tira a pessoa de toda sugestão/listagem imediatamente. */
export async function leaveDirectory(userId: string): Promise<boolean> {
  const { error } = await db
    .from("pair_directory_entries")
    .update({ visible: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) {
    console.warn("[pair-directory-adapter] falha ao sair do diretório", error.message);
    return false;
  }
  return true;
}
