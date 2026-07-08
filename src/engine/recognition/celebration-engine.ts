// Celebração do Jardineiro — engine PURO (I6, Academia Viva 2.0). Fecha uma promessa
// aberta desde a sprint das Sementes Vivas (I1): o Pomar da Equipe acumula, mas só
// o LÍDER pode convertê-lo em celebração real registrada — o arquétipo Líder-Jardineiro
// do cânone (§1.4) virando mecânica, não metáfora.
//
// TESE: só o LIDER_EQUIPE da equipe destrava esta conversão (RBAC na composição, não
// aqui — o engine não conhece papéis, só recebe quem está pedindo). Só pools do canal
// "team" podem ser celebrados: o canal "cause" (Bosque do Bem-Comum) é cumprimento de
// compromisso CSR institucional — mecânica intencionalmente DIFERENTE (nunca "celebrada"
// por um indivíduo). Uma celebração por pool por semana (mesma semana determinística do
// recognition-engine) — protege contra "celebrar" o mesmo pool repetidamente para inflar
// eventos. O snapshot (total, contribuintes) é IMUTÁVEL no momento do registro — a
// celebração é prova do que aconteceu, não um número que muda depois.
//
// K-ANON (invariante 3 do app inteiro): um pool com uniqueContributors < k continua
// PROTEGIDO mesmo para o líder — celebrar um pool de poucas pessoas vazaria indiretamente
// quem contribuiu quanto. `pool.visible` já carrega essa decisão (buildSeedPools) — este
// engine só recusa celebrar o que a própria UI já esconde.
//
// Engine ≠ Domínio: descrição da celebração e vocabulário chegam por parâmetro.

import { recognitionWeekKey } from "./recognition-engine";
import type { SeedPoolAggregate } from "./seed-economy-engine";

export interface CelebrationRequest {
  id: string;
  poolId: string;
  leaderId: string;
  /** O que o líder declara — nunca genérico "recompensa"; verbo do pack. */
  celebrationDescription: string;
  occurredOn: string;
}

export type CelebrationRejectReason =
  | "invalid_request"
  | "duplicate"
  | "not_team_channel"
  | "empty_pool"
  | "pool_protected"
  | "already_celebrated_this_week";

export interface CelebrationRecord {
  id: string;
  poolId: string;
  poolName: string;
  leaderId: string;
  celebrationDescription: string;
  /** Snapshot imutável do pool NO MOMENTO da celebração — nunca recalculado depois. */
  seedsConverted: number;
  contributorCount: number;
  occurredOn: string;
}

export interface CelebrationResult {
  records: CelebrationRecord[];
  record: CelebrationRecord | null;
  reason: "recorded" | CelebrationRejectReason;
}

export function celebratePool(
  existing: readonly CelebrationRecord[],
  request: CelebrationRequest,
  pool: SeedPoolAggregate,
): CelebrationResult {
  const finish = (
    reason: CelebrationResult["reason"],
    records: CelebrationRecord[] = [...existing],
    record: CelebrationRecord | null = null,
  ): CelebrationResult => ({ records, record, reason });

  if (
    !request.id.trim() ||
    !request.poolId.trim() ||
    !request.leaderId.trim() ||
    !request.celebrationDescription.trim()
  ) {
    return finish("invalid_request");
  }
  if (existing.some((r) => r.id === request.id)) return finish("duplicate");
  if (pool.channel !== "team") return finish("not_team_channel");
  if (pool.total <= 0) return finish("empty_pool");
  if (!pool.visible) return finish("pool_protected");

  const week = recognitionWeekKey(request.occurredOn);
  const alreadyThisWeek = existing.some(
    (r) => r.poolId === request.poolId && recognitionWeekKey(r.occurredOn) === week,
  );
  if (alreadyThisWeek) return finish("already_celebrated_this_week");

  const record: CelebrationRecord = {
    id: request.id,
    poolId: request.poolId,
    poolName: pool.name,
    leaderId: request.leaderId,
    celebrationDescription: request.celebrationDescription.trim(),
    seedsConverted: pool.total,
    contributorCount: pool.uniqueContributors,
    occurredOn: request.occurredOn,
  };
  return finish("recorded", [...existing, record], record);
}

/** Já foi celebrado nesta semana? Útil pra UI decidir se mostra o botão ou o registro. */
export function celebratedThisWeek(
  existing: readonly CelebrationRecord[],
  poolId: string,
  today: string,
): boolean {
  const week = recognitionWeekKey(today);
  return existing.some((r) => r.poolId === poolId && recognitionWeekKey(r.occurredOn) === week);
}
