// Vitrine do Bem-Comum — engine PURO (I-M6, Mensurar Vivo). "A retribuição da instituição."
//
// TESE (§F do blueprint PLANO_MENSURAR_VIVO_1.0.md): o indivíduo sai da posição de
// comprador. Sementes NUNCA são moeda da Vitrine — este engine é estruturalmente incapaz
// de ler saldo ou mérito de ninguém: nenhum tipo abaixo carrega um campo de pontuação
// (mesma tática do seed-economy-engine — "sem caminho de código para X").
//
// F3 (verbatim) — as 4 constantes NUNCA da Vitrine, cada uma com sua garantia aqui:
// 1. eligibility_never_reads_merit_or_balance — `EligibilityEvent` só tem um booleano
//    ("participou ≥1 vez"); não existe parâmetro de XP/sementes/desempenho para ler.
// 2. care_is_a_right_not_a_reward — `PortaAbertaResource` é um tipo à parte, sem
//    category/accessMode/capacity: nada aqui aceita esse tipo como entrada de elegibilidade
//    ou sorteio, porque a assinatura das funções não tem onde encaixá-lo.
// 3. platform_never_intermediates_money — ofertas são compromissos declarados
//    (`mirroredPledge`), nunca checkout: não há tipo de preço/pagamento em lugar nenhum.
// 4. every_individual_offer_mirrors_collective — `defineOffer` rejeita qualquer oferta
//    sem `mirroredPledge` não-vazio; não existe caminho para uma oferta sem contrapartida.
//
// Ciranda (F2.2): sorteio determinístico auditável — a MESMA seed + o MESMO pool elegível
// sempre produzem os MESMOS vencedores; qualquer pessoa pode recomputar `resultHash` e
// conferir que não houve favorecimento.
//
// Engine ≠ Domínio: categorias, catálogo, textos e a seed publicada chegam por parâmetro
// (pack/mock/server) — zero import de domain/, zero React, zero I/O.

export type OfferCategory = "cultural" | "educacional" | "entretenimento" | "comunitario";

export type OfferAccessMode = "collective" | "lottery" | "rotation" | "universal_unlock";

export interface InstitutionalOffer {
  id: string;
  category: OfferCategory;
  title: string;
  description: string;
  provider: "institution" | "partner";
  accessMode: OfferAccessMode;
  /** F3.4: a contrapartida coletiva declarada. Sem isto, a oferta não existe (ver defineOffer). */
  mirroredPledge: string;
  /** Só relevante em accessMode "lottery" — nº de vagas da Ciranda deste ciclo. */
  capacity?: number;
}

/**
 * Recurso de saúde mental (F3.2, REDLINE) — estruturalmente fora do catálogo. Repare a
 * ausência de category/accessMode/capacity/mirroredPledge: nenhuma função deste arquivo
 * aceita este tipo como entrada, então não há como "Porta Aberta" entrar numa elegibilidade
 * ou num sorteio por engano. Sempre visível, sem condição — a UI que compõe isto deve
 * renderizá-lo ACIMA do catálogo, nunca dentro dele.
 */
export interface PortaAbertaResource {
  id: string;
  title: string;
  description: string;
  howToAccess: string;
}

const ALLOWED_CATEGORIES: readonly OfferCategory[] = [
  "cultural",
  "educacional",
  "entretenimento",
  "comunitario",
];

export function isAllowedOfferCategory(value: string): value is OfferCategory {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(value);
}

export type OfferDefinitionRejection =
  | "missing_title"
  | "missing_mirrored_pledge"
  | "invalid_capacity"
  | "category_not_allowed";

export type DefineOfferResult =
  | { ok: true; offer: InstitutionalOffer }
  | { ok: false; reason: OfferDefinitionRejection };

/**
 * Único construtor válido de uma InstitutionalOffer. O catálogo chega do pack como JSON
 * solto — sem tipos do TS te protegendo — então é AQUI que uma categoria "saude_mental"
 * ou uma oferta sem contrapartida coletiva é rejeitada, nunca aceita silenciosamente.
 */
export function defineOffer(input: {
  id: string;
  category: string;
  title: string;
  description: string;
  provider: "institution" | "partner";
  accessMode: OfferAccessMode;
  mirroredPledge: string;
  capacity?: number;
}): DefineOfferResult {
  if (!input.title.trim()) return { ok: false, reason: "missing_title" };
  if (!input.mirroredPledge.trim()) return { ok: false, reason: "missing_mirrored_pledge" };
  if (input.capacity !== undefined && input.capacity <= 0) {
    return { ok: false, reason: "invalid_capacity" };
  }
  if (!isAllowedOfferCategory(input.category)) {
    return { ok: false, reason: "category_not_allowed" };
  }
  return {
    ok: true,
    offer: {
      id: input.id,
      category: input.category,
      title: input.title,
      description: input.description,
      provider: input.provider,
      accessMode: input.accessMode,
      mirroredPledge: input.mirroredPledge,
      capacity: input.capacity,
    },
  };
}

// ─── Elegibilidade (F3.1: booleana, nunca mérito) ────────────────────────────

export interface EligibilityEvent {
  userId: string;
  /** O ÚNICO critério permitido — nunca XP, sementes, desempenho, ranking ou intensidade. */
  participatedInCycle: boolean;
}

/** Pool elegível: participação booleana, deduplicada, ordenada (nunca por mérito). */
export function computeEligiblePool(events: readonly EligibilityEvent[]): string[] {
  const eligible = new Set<string>();
  for (const event of events) {
    if (event.participatedInCycle) eligible.add(event.userId);
  }
  return [...eligible].sort();
}

// ─── Ciranda (F2.2: sorteio determinístico auditável) ────────────────────────

function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CirandaInput {
  eligibleUserIds: readonly string[];
  winnerCount: number;
  /** Semente publicável — a mesma seed + o mesmo pool sempre produzem o mesmo sorteio. */
  seed: string;
}

export interface CirandaResult {
  winners: string[];
  seed: string;
  /** Hash de auditoria: recompute com (seed, pool ordenado, winners) e confira. */
  resultHash: string;
}

/** Sorteio de chance uniforme — jamais ponderado por mérito/saldo/desempenho. */
export function runCiranda(input: CirandaInput): CirandaResult {
  const pool = [...new Set(input.eligibleUserIds)].sort();
  const winnerCount = Math.max(0, Math.min(input.winnerCount, pool.length));

  const rng = mulberry32(fnv1aHash(input.seed));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const winners = shuffled.slice(0, winnerCount).sort();
  const resultHash = fnv1aHash(`${input.seed}|${pool.join(",")}|${winners.join(",")}`).toString(16);

  return { winners, seed: input.seed, resultHash };
}

// ─── Oferta Espelhada (F2.3: toda oferta individual espelha o coletivo) ──────

export interface MirroredImpactSummary {
  offerId: string;
  mirroredPledge: string;
  timesFulfilled: number;
}

/** Nunca inventa um valor — só ecoa a contrapartida DECLARADA e conta cumprimentos reais. */
export function summarizeMirroredImpact(
  offers: readonly InstitutionalOffer[],
  fulfilledCountByOfferId: Readonly<Record<string, number>>,
): MirroredImpactSummary[] {
  return offers.map((offer) => ({
    offerId: offer.id,
    mirroredPledge: offer.mirroredPledge,
    timesFulfilled: fulfilledCountByOfferId[offer.id] ?? 0,
  }));
}
