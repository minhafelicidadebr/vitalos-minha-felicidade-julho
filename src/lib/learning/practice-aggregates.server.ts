// Agregado coletivo REAL do Diário de Prática (Academia Viva 2.0 I7, fatia 2).
//
// PRIVACIDADE POR CONSULTA, não por confiança: o SELECT via service role pede
// SÓ `driver_id` e `user_id` de registros com share_consent=true — a coluna
// `summary` (conteúdo reflexivo pessoal) NUNCA sai do banco por este caminho,
// nem para o servidor. O k-anonimato (≥5 praticantes únicos consentidos) é
// computado pela MESMA função pura do modo demo (buildPracticeAggregates) —
// zero duplicação de regra entre demo e real.

import {
  buildPracticeAggregates,
  type PracticeAggregate,
  type PracticeJournalPolicy,
} from "@/engine/learning/practice-journal-engine";

interface ConsentedRow {
  driver_id: string;
  user_id: string;
}

/** Agregados k-anon da org — só contagens; conteúdo jamais é lido. */
export async function loadOrgPracticeAggregates(
  orgId: string,
  policy: PracticeJournalPolicy,
): Promise<PracticeAggregate[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data, error } = await admin
    .from("practice_entries")
    .select("driver_id, user_id")
    .eq("org_id", orgId)
    .eq("share_consent", true);
  if (error || !data) return [];

  // Adapta as linhas mínimas ao shape do engine puro. `summary` vazio de
  // PROPÓSITO: o engine só conta autores/consentimento — e assim fica provado
  // por construção que o agregado não depende (nem tem acesso) ao conteúdo.
  const rows = (data as ConsentedRow[]).map((row, i) => ({
    id: `agg-${i}`,
    authorId: row.user_id,
    driverId: row.driver_id,
    kind: "texto" as const,
    summary: "",
    shareConsent: true,
    occurredOn: "1970-01-01",
  }));

  return buildPracticeAggregates(rows, policy);
}
