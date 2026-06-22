import { describe, expect, test } from "bun:test";
import {
  currentCard,
  gradeCurrent,
  sessionProgress,
  startSession,
  type SessionCard,
} from "./flashcard-session";
import { initialSchedule } from "./sm2-engine";

function deck(...ids: string[]): SessionCard<string>[] {
  return ids.map((id) => ({ id, card: id, schedule: initialSchedule() }));
}

describe("flashcard-session — fila de revisão (compõe SM-2)", () => {
  test("inicia com todos na fila e contadores zerados", () => {
    const s = startSession(deck("a", "b", "c"));
    expect(s.total).toBe(3);
    expect(s.queue.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(s.reviewed).toEqual([]);
    expect(s.reviewCount).toBe(0);
    expect(s.lapseCount).toBe(0);
    expect(currentCard(s)?.id).toBe("a");
  });

  test("acertar (q≥3) gradua o cartão e avança a fila", () => {
    const s1 = startSession(deck("a", "b"));
    const s2 = gradeCurrent(s1, 5);
    expect(s2.queue.map((c) => c.id)).toEqual(["b"]);
    expect(s2.reviewed.map((c) => c.id)).toEqual(["a"]);
    expect(s2.reviewed[0]!.schedule.intervalDays).toBe(1); // 1ª revisão correta
    expect(s2.reviewCount).toBe(1);
    expect(s2.lapseCount).toBe(0);
  });

  test("errar (q<3) reagenda e recoloca o cartão no FIM da fila", () => {
    const s1 = startSession(deck("a", "b"));
    const s2 = gradeCurrent(s1, 1);
    expect(s2.queue.map((c) => c.id)).toEqual(["b", "a"]);
    expect(s2.reviewed).toEqual([]);
    expect(s2.lapseCount).toBe(1);
    // o cartão recaído carrega o lapso e voltou ao intervalo de reaprendizagem
    const requeued = s2.queue.find((c) => c.id === "a")!;
    expect(requeued.schedule.lapses).toBe(1);
    expect(requeued.schedule.intervalDays).toBe(1);
  });

  test("cartão recaído eventualmente gradua quando acertado", () => {
    let s = startSession(deck("a", "b"));
    s = gradeCurrent(s, 0); // a erra → vai pro fim: [b, a]
    s = gradeCurrent(s, 4); // b acerta → [a]
    s = gradeCurrent(s, 4); // a acerta → []
    expect(sessionProgress(s).finished).toBe(true);
    expect(s.reviewed.map((c) => c.id)).toEqual(["b", "a"]);
    expect(s.reviewCount).toBe(3); // 3 avaliações para 2 cartões (1 recaída)
    expect(s.lapseCount).toBe(1);
  });

  test("graduar com a fila vazia é no-op", () => {
    const s = startSession(deck());
    expect(gradeCurrent(s, 5)).toEqual(s);
    expect(currentCard(s)).toBeNull();
  });

  test("não muta o estado de entrada", () => {
    const s1 = startSession(deck("a", "b"));
    const snapshot = JSON.parse(JSON.stringify(s1));
    gradeCurrent(s1, 5);
    expect(JSON.parse(JSON.stringify(s1))).toEqual(snapshot);
  });

  test("sessionProgress reporta done/remaining/pct corretamente", () => {
    let s = startSession(deck("a", "b", "c", "d"));
    expect(sessionProgress(s)).toEqual({
      done: 0,
      remaining: 4,
      total: 4,
      pct: 0,
      finished: false,
    });
    s = gradeCurrent(s, 5); // 1/4
    expect(sessionProgress(s).pct).toBe(25);
    s = gradeCurrent(s, 5); // 2/4
    expect(sessionProgress(s).pct).toBe(50);
  });

  test("deck vazio reporta progresso 0 e finished true", () => {
    expect(sessionProgress(startSession(deck()))).toEqual({
      done: 0,
      remaining: 0,
      total: 0,
      pct: 0,
      finished: true,
    });
  });
});
