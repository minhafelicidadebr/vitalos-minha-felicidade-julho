import { describe, expect, test } from "bun:test";
import { hydrateDueSession, type SavedCardState } from "./card-state-hydration";
import { initialSchedule } from "./sm2-engine";

interface Card {
  id: string;
}
const CATALOG: Card[] = [{ id: "c1" }, { id: "c2" }, { id: "c3" }];
const TODAY = new Date("2026-07-03T12:00:00.000Z");

describe("hydrateDueSession — reconstrói a sessão a partir do que foi salvo", () => {
  test("cartão sem entrada salva é sempre vencido (começa do zero, honesto)", () => {
    const session = hydrateDueSession(CATALOG, [], TODAY);
    expect(session.map((s) => s.id).sort()).toEqual(["c1", "c2", "c3"]);
    expect(session.every((s) => s.schedule.intervalDays === 0)).toBe(true);
  });

  test("cartão revisado com intervalo futuro NÃO aparece na sessão de hoje", () => {
    const saved: SavedCardState[] = [
      { cardId: "c1", schedule: { repetition: 2, easiness: 2.6, intervalDays: 30, lapses: 0 }, reviewedAt: "2026-07-01T00:00:00.000Z" },
    ];
    const session = hydrateDueSession(CATALOG, saved, TODAY);
    expect(session.map((s) => s.id).sort()).toEqual(["c2", "c3"]);
  });

  test("cartão revisado com intervalo já vencido volta a aparecer", () => {
    const saved: SavedCardState[] = [
      { cardId: "c1", schedule: { repetition: 1, easiness: 2.5, intervalDays: 1, lapses: 0 }, reviewedAt: "2026-07-01T00:00:00.000Z" },
    ];
    const session = hydrateDueSession(CATALOG, saved, TODAY);
    expect(session.map((s) => s.id)).toContain("c1");
  });

  test("preserva o agendamento salvo (não reseta para initialSchedule por engano)", () => {
    const saved: SavedCardState[] = [
      { cardId: "c1", schedule: { repetition: 3, easiness: 2.8, intervalDays: 1, lapses: 1 }, reviewedAt: "2026-07-02T00:00:00.000Z" },
    ];
    const session = hydrateDueSession(CATALOG, saved, TODAY);
    const c1 = session.find((s) => s.id === "c1")!;
    expect(c1.schedule).toEqual({ repetition: 3, easiness: 2.8, intervalDays: 1, lapses: 1 });
  });

  test("nunca muta o initialSchedule() compartilhado entre chamadas", () => {
    const a = hydrateDueSession(CATALOG, [], TODAY);
    a[0]!.schedule.repetition = 99; // se isto vazasse para outra chamada, seria bug
    const b = hydrateDueSession(CATALOG, [], TODAY);
    expect(b[0]!.schedule).toEqual(initialSchedule());
  });
});
