// Socratic Arena Engine — debate socrático DETERMINÍSTICO e governado
// (LD-010, ADR: docs/learning/PLANO_ARENA_SOCRATICA_LD010_2026-07-21.md).
//
// Doutrina (LD-010, risco R3_HIGH, aiMode GENERATIVE_PROHIBITED):
// - SEM IA generativa — nenhuma chamada de modelo, by construction;
// - SEM ranking/pontuação de argumento — summary só conta ESTRUTURA
//   (cartas consideradas, estágios visitados), nunca qualidade;
// - SEM vencedor — não existe campo de "vencedor" em lugar nenhum do estado
//   ou do resumo; a síntese (conteúdo, Fatia B) fecha em trade-off honesto;
// - SEM avaliação do participante — nada aqui julga o raciocínio de quem usa;
// - SEM inferência psicológica — a posição (antes/depois) é AUTODECLARADA
//   via setPositionBefore/After, nunca derivada de comportamento ou tempo;
// - SEM texto livre no engine — decisão de DESIGN, não filtro a posteriori:
//   um rascunho de reflexão, se a UI (Fatia C) oferecer um, vive só no estado
//   do componente e nunca chega a este motor;
// - "ambos os lados com mérito real" é responsabilidade EDITORIAL do
//   conteúdo (Fatia B) — o motor só garante estruturalmente que nenhum lado
//   fica vazio (validateDilemma) e que toda carta declara sua natureza
//   (ArgumentBasis), para a distinção evidência×valor nunca se perder.
//
// Engine puro: sem React, sem I/O, sem Date/random, sem import de src/domain.

export type ArenaSide = "A" | "B";

/** Natureza da carta — nunca omitida, nunca inferida. `evidencia_empirica` só
 * para achado de estudo empírico/quase-experimental/meta-análise; `sintese_
 * teorica` para modelo/revisão conceitual (não é intervenção testada);
 * `valor_operacional` para raciocínio legítimo sem estudo por trás — rotulado
 * como tal, NUNCA disfarçado de evidência. */
export type ArgumentBasis = "evidencia_empirica" | "sintese_teorica" | "valor_operacional";

export interface ArgumentCard {
  id: string;
  side: ArenaSide;
  text: string;
  basis: ArgumentBasis;
  /** Presente só quando basis for evidência/síntese teórica de um estudo real. */
  sourceStudyId?: string;
}

/** Posição AUTODECLARADA — nunca inferida. "indeciso" é uma resposta legítima. */
export type ArenaPosition = "ladoA" | "ladoB" | "indeciso";

export const ARENA_STAGE_ORDER = [
  "enquadramento",
  "tese",
  "antitese",
  "evidencia",
  "revisao",
  "sintese",
] as const;

export type ArenaStage = (typeof ARENA_STAGE_ORDER)[number];

export interface ArenaDilemma {
  id: string;
  title: string;
  /** Enquadramento do dilema + regras de civilidade (exibidas antes de começar). */
  framing: string;
  sideALabel: string;
  sideBLabel: string;
  cards: readonly ArgumentCard[];
  /** Síntese de fechamento — trade-off honesto, redigida para NUNCA declarar vencedor. */
  closingSynthesis: string;
}

export interface ArenaState {
  dilemmaId: string;
  stage: ArenaStage;
  /** Estágios já visitados nesta sessão (para navegação livre para trás). */
  visitedStages: readonly ArenaStage[];
  consideredCardIds: readonly string[];
  positionBefore: ArenaPosition | null;
  positionAfter: ArenaPosition | null;
}

// ─── Validação estrutural do dilema ──────────────────────────────────────────

/** Garante que o dilema é utilizável: as duas cartelas não-vazias e toda
 * carta com `basis` declarado (nunca omitido). NÃO avalia qualidade
 * argumentativa — isso é revisão editorial (Fatia B), fora do escopo do motor. */
export function validateDilemma(dilemma: ArenaDilemma): string[] {
  const errors: string[] = [];
  if (!dilemma.id.trim()) errors.push("dilema sem id");
  if (!dilemma.framing.trim()) errors.push("dilema sem enquadramento");

  const sideACards = dilemma.cards.filter((c) => c.side === "A");
  const sideBCards = dilemma.cards.filter((c) => c.side === "B");
  if (sideACards.length === 0) errors.push("Lado A sem cartas — ambos os lados precisam de mérito real");
  if (sideBCards.length === 0) errors.push("Lado B sem cartas — ambos os lados precisam de mérito real");

  const seen = new Set<string>();
  for (const card of dilemma.cards) {
    if (seen.has(card.id)) errors.push(`carta duplicada: ${card.id}`);
    seen.add(card.id);
    if (!card.text.trim()) errors.push(`carta sem texto: ${card.id}`);
    if (card.basis === "valor_operacional" && card.sourceStudyId) {
      errors.push(`carta ${card.id}: valor_operacional não deve citar sourceStudyId (evitaria disfarçar valor de evidência)`);
    }
    if (card.basis !== "valor_operacional" && !card.sourceStudyId) {
      errors.push(`carta ${card.id}: evidência/síntese teórica exige sourceStudyId`);
    }
  }
  return errors;
}

// ─── Ciclo de vida da sessão ──────────────────────────────────────────────────

export function startArena(dilemma: ArenaDilemma): ArenaState {
  return {
    dilemmaId: dilemma.id,
    stage: "enquadramento",
    visitedStages: ["enquadramento"],
    consideredCardIds: [],
    positionBefore: null,
    positionAfter: null,
  };
}

/** Cartas consideradas de um lado, na sessão. */
function cardsConsidered(dilemma: ArenaDilemma, state: ArenaState, side: ArenaSide): string[] {
  const ids = new Set(state.consideredCardIds);
  return dilemma.cards.filter((c) => c.side === side && ids.has(c.id)).map((c) => c.id);
}

/** Regra de avanço mínimo: sair de "tese" exige ≥1 carta considerada do Lado
 * A; sair de "antitese" exige ≥1 carta do Lado B. Reforça o primaryOutcome
 * ("argumentar os dois lados") sem avaliar qualidade — só engajamento
 * estrutural. Navegação para TRÁS (estágio já visitado) é sempre livre. */
export function canAdvanceFrom(dilemma: ArenaDilemma, state: ArenaState, stage: ArenaStage): boolean {
  if (stage === "tese") return cardsConsidered(dilemma, state, "A").length > 0;
  if (stage === "antitese") return cardsConsidered(dilemma, state, "B").length > 0;
  return true;
}

/** Navega para um estágio. Avançar (estágio ainda não visitado) respeita
 * `canAdvanceFrom` do estágio ATUAL; voltar para um estágio já visitado é
 * sempre permitido (navegação determinística e reversível). Estágio inválido
 * ou avanço bloqueado é no-op (devolve o mesmo estado). */
export function goToStage(dilemma: ArenaDilemma, state: ArenaState, stage: ArenaStage): ArenaState {
  if (!ARENA_STAGE_ORDER.includes(stage)) return state;

  const alreadyVisited = state.visitedStages.includes(stage);
  const currentIdx = ARENA_STAGE_ORDER.indexOf(state.stage);
  const targetIdx = ARENA_STAGE_ORDER.indexOf(stage);
  const isBackward = targetIdx <= currentIdx;

  if (!alreadyVisited && !isBackward && !canAdvanceFrom(dilemma, state, state.stage)) {
    return state;
  }

  return {
    ...state,
    stage,
    visitedStages: alreadyVisited ? state.visitedStages : [...state.visitedStages, stage],
  };
}

/** Alterna se uma carta foi considerada (idempotente: chamar de novo desfaz). */
export function toggleArgumentConsidered(state: ArenaState, cardId: string): ArenaState {
  const has = state.consideredCardIds.includes(cardId);
  return {
    ...state,
    consideredCardIds: has
      ? state.consideredCardIds.filter((id) => id !== cardId)
      : [...state.consideredCardIds, cardId],
  };
}

/** Registra a posição autodeclarada ANTES de ver as cartas (estágio "tese"). */
export function setPositionBefore(state: ArenaState, position: ArenaPosition): ArenaState {
  return { ...state, positionBefore: position };
}

/** Registra a posição autodeclarada DEPOIS de considerar os dois lados
 * (estágio "revisao"). Pode ser chamada de novo para corrigir — reversível. */
export function setPositionAfter(state: ArenaState, position: ArenaPosition): ArenaState {
  return { ...state, positionAfter: position };
}

// ─── Síntese (contagem estrutural — nunca qualidade, nunca vencedor) ────────

export interface ArenaSummary {
  dilemmaId: string;
  stagesVisited: number;
  totalStages: number;
  sideACardsConsidered: number;
  sideBCardsConsidered: number;
  totalCardsConsidered: number;
  positionBefore: ArenaPosition | null;
  positionAfter: ArenaPosition | null;
  /** True quando a posição autodeclarada mudou entre antes e depois. Fato
   * estrutural, não juízo — mudar ou não mudar são igualmente válidos. */
  positionShifted: boolean;
  reachedSynthesis: boolean;
}

export function summarizeArena(dilemma: ArenaDilemma, state: ArenaState): ArenaSummary {
  const sideA = cardsConsidered(dilemma, state, "A");
  const sideB = cardsConsidered(dilemma, state, "B");
  const positionShifted =
    state.positionBefore !== null &&
    state.positionAfter !== null &&
    state.positionBefore !== state.positionAfter;

  return {
    dilemmaId: dilemma.id,
    stagesVisited: state.visitedStages.length,
    totalStages: ARENA_STAGE_ORDER.length,
    sideACardsConsidered: sideA.length,
    sideBCardsConsidered: sideB.length,
    totalCardsConsidered: sideA.length + sideB.length,
    positionBefore: state.positionBefore,
    positionAfter: state.positionAfter,
    positionShifted,
    reachedSynthesis: state.visitedStages.includes("sintese"),
  };
}
