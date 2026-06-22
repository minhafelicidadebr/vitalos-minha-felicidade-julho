// SM-2 (SuperMemo 2, Woźniak 1990) — motor de repetição espaçada PURO, setor-agnóstico.
//
// HONESTIDADE (doutrina Fable 5 §8): isto é um *agendador de estudo*, não psicometria
// nem diagnóstico. A partir da autoavaliação de recordação (q = 0..5) decide QUANDO um
// cartão de memória deve voltar para revisão. Não mede a pessoa, não pontua talento e
// NUNCA alimenta desempenho/promoção/remuneração (invariante §9.6). O estado de um
// baralho pertence ao próprio aprendiz; qualquer agregação organizacional a jusante
// exige k-anonimato ≥ 5 (invariante §9.5).
//
// Fonte: P. A. Woźniak, "Optimization of learning", SuperMemo (1990) — algoritmo de
// domínio público, replicado em larga escala (Anki, Mnemosyne). Determinístico (mesma
// entrada → mesma saída), sem I/O, sem React, sem import de domain/.

/** Autoavaliação de recordação do cartão. 0–2 = errou; 3–5 = acertou (com esforço → fácil). */
export type RecallQuality = 0 | 1 | 2 | 3 | 4 | 5;

/** Limiar de acerto: q < 3 dispara reaprendizagem (SM-2 original). */
export const SM2_PASS_THRESHOLD = 3 as const;
/** Fator de facilidade inicial de um cartão novo. */
export const SM2_DEFAULT_EASINESS = 2.5 as const;
/** Piso do fator de facilidade — impede intervalos que encolhem indefinidamente. */
export const SM2_MIN_EASINESS = 1.3 as const;
/**
 * Cartões com intervalo ≥ 21 dias são considerados "consolidados" (convenção Anki para
 * retenção madura). Não é alegação clínica de memória — é um marcador de agendamento.
 */
export const SM2_MATURE_INTERVAL_DAYS = 21 as const;

export interface CardSchedule {
  /** Repetições corretas consecutivas (n). Zera ao errar. */
  repetition: number;
  /** Fator de facilidade (EF), piso {@link SM2_MIN_EASINESS}. */
  easiness: number;
  /** Intervalo em dias até a próxima revisão. */
  intervalDays: number;
  /** Quantas vezes o cartão foi esquecido (q < 3) — sinal honesto de dificuldade. */
  lapses: number;
}

/** Estado inicial de um cartão nunca revisado. */
export function initialSchedule(): CardSchedule {
  return { repetition: 0, easiness: SM2_DEFAULT_EASINESS, intervalDays: 0, lapses: 0 };
}

/** Mantém o EF acima do piso, arredondando a 2 casas para estabilidade determinística. */
function clampEasiness(ef: number): number {
  return Math.round(Math.max(SM2_MIN_EASINESS, ef) * 100) / 100;
}

/**
 * Aplica uma revisão e devolve o NOVO agendamento (imutável — não muta `prev`).
 *
 * Fiel ao SM-2 original: o intervalo usa o EF vigente ANTES da atualização; o EF é
 * então recalculado a partir da qualidade (vale para acerto e erro). Ao errar (q < 3),
 * a sequência reinicia (n = 0, intervalo = 1) — reaprender, sem punir.
 */
export function reviewCard(prev: CardSchedule, quality: RecallQuality): CardSchedule {
  const passed = quality >= SM2_PASS_THRESHOLD;

  let repetition: number;
  let intervalDays: number;
  if (passed) {
    repetition = prev.repetition + 1;
    intervalDays =
      repetition === 1 ? 1 : repetition === 2 ? 6 : Math.round(prev.intervalDays * prev.easiness);
  } else {
    repetition = 0;
    intervalDays = 1;
  }

  const easiness = clampEasiness(
    prev.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  return {
    repetition,
    easiness,
    intervalDays,
    lapses: passed ? prev.lapses : prev.lapses + 1,
  };
}

/** Data da próxima revisão = data revisada + intervalo (cópia pura, não muta a entrada). */
export function nextReviewDate(reviewedAt: Date, intervalDays: number): Date {
  const next = new Date(reviewedAt.getTime());
  next.setDate(next.getDate() + intervalDays);
  return next;
}

/** Um cartão está vencido quando sua data de revisão já chegou (≤ hoje). */
export function isDue(dueDate: Date, today: Date): boolean {
  return dueDate.getTime() <= today.getTime();
}

export interface ScheduledCard<T> {
  card: T;
  schedule: CardSchedule;
  dueDate: Date;
}

/** Filtra os cartões vencidos em `today` e os ordena do mais atrasado ao menos. */
export function selectDueCards<T>(cards: ScheduledCard<T>[], today: Date): ScheduledCard<T>[] {
  return cards
    .filter((c) => isDue(c.dueDate, today))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export interface DeckSummary {
  total: number;
  /** Vencidos em `today` (a revisar agora). */
  due: number;
  /** Consolidados: intervalo ≥ {@link SM2_MATURE_INTERVAL_DAYS}. */
  mature: number;
  /** Em aprendizagem: já vistos, ainda não consolidados. */
  young: number;
  /** Nunca revisados (intervalo 0). */
  fresh: number;
  /** Facilidade média do baralho — leitura agregada, nunca individual exposta. */
  averageEasiness: number;
}

/**
 * Resumo honesto de um baralho. Conta estados de agendamento; não infere "quanto a
 * pessoa sabe" — apenas o que o agendador planejou. Útil para a UI da Academia mostrar
 * progresso sem overclaim.
 */
export function summarizeDeck<T>(cards: ScheduledCard<T>[], today: Date): DeckSummary {
  const total = cards.length;
  if (total === 0) {
    return { total: 0, due: 0, mature: 0, young: 0, fresh: 0, averageEasiness: 0 };
  }

  let due = 0;
  let mature = 0;
  let young = 0;
  let fresh = 0;
  let efSum = 0;

  for (const { schedule, dueDate } of cards) {
    efSum += schedule.easiness;
    if (schedule.intervalDays === 0) fresh += 1;
    else if (schedule.intervalDays >= SM2_MATURE_INTERVAL_DAYS) mature += 1;
    else young += 1;
    if (isDue(dueDate, today)) due += 1;
  }

  return {
    total,
    due,
    mature,
    young,
    fresh,
    averageEasiness: Math.round((efSum / total) * 100) / 100,
  };
}
