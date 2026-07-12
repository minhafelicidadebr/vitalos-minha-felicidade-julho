// Loop Vivo da Semana REAL (I3, Academia Viva 2.0) — server-only.
//
// A "equipe" hoje é a ORGANIZAÇÃO inteira (doutrina 1 pessoa=1 org=1 papel,
// S1) — o mesmo coletivo que o Diário/Sementes reais já agregam. Cada um dos
// 7 passos do ritual é a COBERTURA da org num sinal REAL já persistido:
//
//   aprender     → participation_events kind=learning_path (trilha concluída)
//   praticar     → participation_events kind=learning_module (módulo feito)
//   evidenciar   → practice_entries (Diário: pessoas com ≥1 registro)
//   refletir     → practice_entries kind=reflexao
//   compartilhar → practice_entries WHERE share_consent (consentiu o coletivo)
//   celebrar     → seed_events kind=donated_team no ciclo (Pomar celebrado)
//   evoluir      → sm2_card_state (revisão espaçada agendada)
//
// PRIVACIDADE: cada consulta conta DISTINCT user_id — nunca QUEM, só QUANTAS.
// O k-anon é imposto pelo próprio buildWeeklyLoop (visible=false quando a org
// tem menos que kAnonymityMin pessoas) — a org pequena nunca expõe cobertura.
// Nenhuma correspondência inventada: cada passo tem um sinal genuíno; o que
// não tivesse sinal ficaria em 0 honesto, jamais fabricado.
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import {
  buildWeeklyLoop,
  type LoopStepId,
  type WeeklyLoopPolicy,
  type WeeklyLoopResult,
} from "@/engine/season/weekly-loop-engine";

/** Nº de pessoas DISTINTAS da org que satisfazem um filtro numa tabela. */
async function countDistinctUsers(
  admin: any,
  table: string,
  userIds: Set<string>,
  filter?: (q: any) => any,
): Promise<number> {
  let query = admin.from(table).select("user_id");
  if (filter) query = filter(query);
  const { data, error } = await query;
  if (error || !data) return 0;
  const distinct = new Set<string>();
  for (const row of data as Array<{ user_id: string }>) {
    if (userIds.has(row.user_id)) distinct.add(row.user_id);
  }
  return distinct.size;
}

/**
 * Monta o Loop Vivo real de uma organização. `null` quando a org não tem
 * nenhum membro (nada a agregar). Determinístico para a mesma foto do banco.
 */
export async function loadRealWeeklyLoop(
  orgId: string,
  policy: WeeklyLoopPolicy,
): Promise<WeeklyLoopResult | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  // A "equipe" = membros da org. Só esses user_ids contam em qualquer passo
  // (defesa em profundidade: mesmo se uma tabela tivesse linha de outra org,
  // o cruzamento por este conjunto a exclui).
  const { data: members } = await admin.from("profiles").select("id").eq("org_id", orgId);
  const userIds = new Set<string>((members ?? []).map((m: { id: string }) => m.id));
  const teamSize = userIds.size;
  if (teamSize === 0) return null;

  const [aprender, praticar, evidenciar, refletir, compartilhar, celebrar, evoluir] =
    await Promise.all([
      countDistinctUsers(admin, "participation_events", userIds, (q) => q.eq("kind", "learning_path")),
      countDistinctUsers(admin, "participation_events", userIds, (q) => q.eq("kind", "learning_module")),
      countDistinctUsers(admin, "practice_entries", userIds),
      countDistinctUsers(admin, "practice_entries", userIds, (q) => q.eq("kind", "reflexao")),
      countDistinctUsers(admin, "practice_entries", userIds, (q) => q.eq("share_consent", true)),
      // Celebrar é all-or-nothing (o Pomar da org foi celebrado no ciclo?): se há
      // QUALQUER doação de time registrada, a org toda conta — senão, zero.
      countDistinctUsers(admin, "seed_events", userIds, (q) => q.eq("kind", "donated_team")).then((n) =>
        n > 0 ? teamSize : 0,
      ),
      countDistinctUsers(admin, "sm2_card_state", userIds),
    ]);

  const completedCountByStep: Partial<Record<LoopStepId, number>> = {
    aprender,
    praticar,
    evidenciar,
    refletir,
    compartilhar,
    celebrar,
    evoluir,
  };

  return buildWeeklyLoop({ teamSize, completedCountByStep }, policy);
}
