// Persistência pessoal do Diário de Prática (Academia Viva 2.0 I7 real).
// Mesmo modelo de confiança do learning-adapter (S5): cada linha pertence à
// PRÓPRIA pessoa (auth.uid()), cliente autenticado lê/escreve direto via RLS
// — nenhuma service role, nenhuma server function no caminho pessoal.
//
// Só chamado quando useRealOrgSession() confirma sessão real — a demo segue
// 100% efêmera (mock + delta Zustand), por design. Falha de rede vira
// console.warn: a persistência é best-effort, a UX local nunca trava.

import { supabase } from "@/integrations/supabase/client";
import type { PracticeEntry } from "@/engine/learning/practice-journal-engine";

const db = supabase as any; // tipos resolvem pós-geração de schema pelo Lovable

interface PracticeRow {
  id: string;
  driver_id: string;
  kind: string;
  summary: string;
  share_consent: boolean;
  occurred_on: string;
}

/** Registros do PRÓPRIO usuário (RLS garante o recorte — o filtro é redundância). */
export async function loadOwnPracticeEntries(userId: string): Promise<PracticeEntry[]> {
  const { data, error } = await db
    .from("practice_entries")
    .select("id, driver_id, kind, summary, share_consent, occurred_on")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: true });
  if (error) {
    console.warn("[practice-journal-adapter] falha ao carregar diário", error.message);
    return [];
  }
  return ((data ?? []) as PracticeRow[]).map((row) => ({
    id: row.id,
    authorId: userId,
    driverId: row.driver_id,
    kind: row.kind as PracticeEntry["kind"],
    summary: row.summary,
    shareConsent: row.share_consent,
    occurredOn: row.occurred_on,
  }));
}

/**
 * Persiste um registro JÁ VALIDADO pelo engine puro (recordPractice) —
 * este adapter nunca revalida regra de domínio, só transporta.
 * Devolve o id REAL da linha (uuid do banco) para o store trocar o id local.
 */
export async function savePracticeEntry(
  userId: string,
  orgId: string,
  entry: PracticeEntry,
): Promise<{ savedId: string | null }> {
  const { data, error } = await db
    .from("practice_entries")
    .insert({
      user_id: userId,
      org_id: orgId,
      driver_id: entry.driverId,
      kind: entry.kind,
      summary: entry.summary,
      share_consent: entry.shareConsent,
      occurred_on: entry.occurredOn,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("[practice-journal-adapter] falha ao persistir registro", error.message);
    return { savedId: null };
  }
  return { savedId: (data as { id: string }).id };
}

/** Apaga um registro PRÓPRIO (LGPD art. 18 — reflexão pessoal apagável). */
export async function deleteOwnPracticeEntry(userId: string, entryId: string): Promise<boolean> {
  const { error } = await db
    .from("practice_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", entryId);
  if (error) {
    console.warn("[practice-journal-adapter] falha ao apagar registro", error.message);
    return false;
  }
  return true;
}
