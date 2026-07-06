// Persistência pessoal do Espelho Vivo (S6.5 "Espelhar e Guardar") — a
// autoavaliação PERMA pessoal. Mesmo modelo simples de learning-adapter.ts:
// cada linha pertence à PRÓPRIA pessoa (auth.uid()), sem k-anonimato a
// proteger, cliente autenticado lê/escreve direto via RLS — nenhuma service
// role, nenhuma server function.
//
// MINIMIZAÇÃO LGPD: só o snapshot computado (PersonalAssessmentResult) é
// persistido — as respostas item a item nunca saem da sessão do cliente.
//
// Só chamado quando useRealOrgSession() confirma uma sessão real — a
// demonstração continua 100% localStorage, por design (ver /espelho.tsx).

import { supabase } from "@/integrations/supabase/client";
import type { PersonalAssessmentRecord } from "@/engine/espelho/personal-assessment-engine";

const db = supabase as any; // tipos resolvem pós-geração de schema pelo Lovable

export async function loadAssessmentHistory(
  userId: string,
  instrument: string,
): Promise<PersonalAssessmentRecord[]> {
  const { data } = await db
    .from("personal_assessments")
    .select("id, instrument, instrument_version, engine_version, result, taken_at")
    .eq("user_id", userId)
    .eq("instrument", instrument)
    .order("taken_at", { ascending: true });

  return ((data ?? []) as Array<{
    id: string;
    instrument: string;
    instrument_version: string;
    engine_version: string;
    result: PersonalAssessmentRecord["result"];
    taken_at: string;
  }>).map((row) => ({
    assessmentId: row.id,
    instrument: row.instrument,
    instrumentVersion: row.instrument_version,
    engineVersion: row.engine_version,
    takenAt: row.taken_at,
    result: row.result,
  }));
}

/** INSERT-only — cada autoavaliação tomada é uma NOVA linha (histórico = tendência). */
export async function saveAssessmentRecord(
  userId: string,
  record: Omit<PersonalAssessmentRecord, "assessmentId">,
): Promise<void> {
  const { error } = await db.from("personal_assessments").insert({
    user_id: userId,
    instrument: record.instrument,
    instrument_version: record.instrumentVersion,
    engine_version: record.engineVersion,
    result: record.result,
    taken_at: record.takenAt,
  });
  if (error) {
    console.warn("[espelho-adapter] falha ao persistir autoavaliação", error.message);
  }
}

/** Cofre Pessoal (LGPD art. 18) — o único caminho de apagar tudo, via RPC. */
export async function eraseMyAssessments(): Promise<{ success: boolean; erasedCount: number }> {
  const { data, error } = await db.rpc("erase_my_assessments");
  if (error) return { success: false, erasedCount: 0 };
  const row = Array.isArray(data) ? data[0] : data;
  return { success: Boolean(row?.accepted), erasedCount: row?.erased_count ?? 0 };
}
