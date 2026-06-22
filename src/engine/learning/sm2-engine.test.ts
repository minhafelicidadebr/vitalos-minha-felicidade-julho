import { describe, expect, test } from "bun:test";
import {
  initialSchedule,
  isDue,
  nextReviewDate,
  reviewCard,
  selectDueCards,
  summarizeDeck,
  SM2_DEFAULT_EASINESS,
  SM2_MIN_EASINESS,
  type CardSchedule,
  type ScheduledCard,
} from "./sm2-engine";

describe("sm2 — agendamento de repetição espaçada (Woźniak 1990)", () => {
  test("cartão novo começa em EF 2.5, sem repetições, intervalo 0", () => {
    expect(initialSchedule()).toEqual({
      repetition: 0,
      easiness: SM2_DEFAULT_EASINESS,
      intervalDays: 0,
      lapses: 0,
    });
  });

  test("sequência de acertos perfeitos cresce 1 → 6 → round(6×EF)", () => {
    // 1ª revisão perfeita: n=1, I=1; EF = 2.5 + (0.1 - 0×…) = 2.6
    const r1 = reviewCard(initialSchedule(), 5);
    expect(r1).toEqual({ repetition: 1, easiness: 2.6, intervalDays: 1, lapses: 0 });

    // 2ª: n=2, I=6; EF = 2.6 + 0.1 = 2.7
    const r2 = reviewCard(r1, 5);
    expect(r2).toEqual({ repetition: 2, easiness: 2.7, intervalDays: 6, lapses: 0 });

    // 3ª: I = round(6 × 2.7[EF vigente ANTES da atualização]) = round(16.2) = 16; EF = 2.8
    const r3 = reviewCard(r2, 5);
    expect(r3).toEqual({ repetition: 3, easiness: 2.8, intervalDays: 16, lapses: 0 });
  });

  test("intervalo usa o EF anterior à atualização (fidelidade ao SM-2 original)", () => {
    // Estado: n=2, EF=2.5, I=6. q=4 → I = round(6 × 2.5) = 15 (não 6 × EF_novo).
    const prev: CardSchedule = { repetition: 2, easiness: 2.5, intervalDays: 6, lapses: 0 };
    const next = reviewCard(prev, 4);
    expect(next.intervalDays).toBe(15);
    // EF com q=4: 2.5 + (0.1 - 1×(0.08 + 1×0.02)) = 2.5 + (0.1 - 0.1) = 2.5
    expect(next.easiness).toBe(2.5);
  });

  test("q=3 ainda é acerto (limiar inclusivo), mas penaliza o EF", () => {
    // q=3: EF = 2.5 + (0.1 - 2×(0.08 + 2×0.02)) = 2.5 + (0.1 - 0.24) = 2.36
    const r = reviewCard(initialSchedule(), 3);
    expect(r.repetition).toBe(1);
    expect(r.intervalDays).toBe(1);
    expect(r.easiness).toBe(2.36);
    expect(r.lapses).toBe(0);
  });

  test("errar (q<3) reinicia a sequência, registra lapso e mantém EF acima do piso", () => {
    const mature: CardSchedule = { repetition: 5, easiness: 2.4, intervalDays: 40, lapses: 0 };
    const lapsed = reviewCard(mature, 1);
    expect(lapsed.repetition).toBe(0);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.lapses).toBe(1);
    // EF com q=1: 2.4 + (0.1 - 4×(0.08 + 4×0.02)) = 2.4 + (0.1 - 0.64) = 1.86
    expect(lapsed.easiness).toBe(1.86);
  });

  test("EF nunca cai abaixo do piso 1.3 mesmo com erros repetidos (q=0)", () => {
    let s: CardSchedule = { repetition: 0, easiness: 1.3, intervalDays: 1, lapses: 0 };
    for (let i = 0; i < 10; i++) s = reviewCard(s, 0);
    expect(s.easiness).toBe(SM2_MIN_EASINESS);
    expect(s.lapses).toBe(10);
  });

  test("após reaprender, a sequência recomeça do intervalo 1 → 6", () => {
    const lapsed = reviewCard({ repetition: 4, easiness: 2.5, intervalDays: 30, lapses: 0 }, 2);
    expect(lapsed.intervalDays).toBe(1);
    const back1 = reviewCard(lapsed, 5);
    expect(back1.intervalDays).toBe(1);
    const back2 = reviewCard(back1, 5);
    expect(back2.intervalDays).toBe(6);
  });

  test("não muta o agendamento de entrada", () => {
    const prev = initialSchedule();
    const snapshot = { ...prev };
    reviewCard(prev, 5);
    expect(prev).toEqual(snapshot);
  });
});

describe("sm2 — datas e seleção de vencidos", () => {
  const today = new Date("2026-06-22T00:00:00Z");

  test("nextReviewDate soma o intervalo sem mutar a data original", () => {
    const reviewed = new Date("2026-06-22T00:00:00Z");
    const due = nextReviewDate(reviewed, 6);
    expect(due.toISOString().slice(0, 10)).toBe("2026-06-28");
    expect(reviewed.toISOString().slice(0, 10)).toBe("2026-06-22");
  });

  test("isDue é verdadeiro no próprio dia e no passado, falso no futuro", () => {
    expect(isDue(new Date("2026-06-21T00:00:00Z"), today)).toBe(true);
    expect(isDue(new Date("2026-06-22T00:00:00Z"), today)).toBe(true);
    expect(isDue(new Date("2026-06-23T00:00:00Z"), today)).toBe(false);
  });

  test("selectDueCards filtra vencidos e ordena do mais atrasado ao menos", () => {
    const cards: ScheduledCard<string>[] = [
      { card: "c-futuro", schedule: initialSchedule(), dueDate: new Date("2026-06-30T00:00:00Z") },
      { card: "c-hoje", schedule: initialSchedule(), dueDate: new Date("2026-06-22T00:00:00Z") },
      { card: "c-antigo", schedule: initialSchedule(), dueDate: new Date("2026-06-18T00:00:00Z") },
    ];
    expect(selectDueCards(cards, today).map((c) => c.card)).toEqual(["c-antigo", "c-hoje"]);
  });
});

describe("sm2 — resumo honesto do baralho", () => {
  const today = new Date("2026-06-22T00:00:00Z");

  test("baralho vazio devolve zeros sem dividir por zero", () => {
    expect(summarizeDeck([], today)).toEqual({
      total: 0,
      due: 0,
      mature: 0,
      young: 0,
      fresh: 0,
      averageEasiness: 0,
    });
  });

  test("classifica fresh / young / mature e conta vencidos", () => {
    const cards: ScheduledCard<string>[] = [
      // fresh: intervalo 0
      { card: "novo", schedule: initialSchedule(), dueDate: new Date("2026-06-22T00:00:00Z") },
      // young: intervalo 6, vencido
      {
        card: "jovem",
        schedule: { repetition: 2, easiness: 2.5, intervalDays: 6, lapses: 0 },
        dueDate: new Date("2026-06-20T00:00:00Z"),
      },
      // mature: intervalo 30, não vencido
      {
        card: "maduro",
        schedule: { repetition: 5, easiness: 2.6, intervalDays: 30, lapses: 0 },
        dueDate: new Date("2026-07-10T00:00:00Z"),
      },
    ];
    const s = summarizeDeck(cards, today);
    expect(s).toEqual({
      total: 3,
      due: 2, // novo (hoje) + jovem (atrasado)
      mature: 1,
      young: 1,
      fresh: 1,
      averageEasiness: 2.53, // (2.5 + 2.5 + 2.6) / 3 = 2.533… → 2.53
    });
  });
});
