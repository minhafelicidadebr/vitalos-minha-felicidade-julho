import { describe, expect, test } from "bun:test";
import { expeditionReadState } from "./expedition-engine";

const ok = (cycleCount: number) => ({ available: true as const, state: { cycleCount } });

describe("expeditionReadState", () => {
  test("demo, carregando e indisponível nunca viram 'sem dado'", () => {
    expect(expeditionReadState({ isRealMode: false, status: "idle", result: null })).toBe("demo");
    expect(expeditionReadState({ isRealMode: true, status: "idle", result: null })).toBe("loading");
    expect(expeditionReadState({ isRealMode: true, status: "loading", result: null })).toBe("loading");
    expect(expeditionReadState({ isRealMode: true, status: "error", result: null })).toBe("unavailable");
    expect(expeditionReadState({ isRealMode: true, status: "done", result: { available: false } })).toBe("unavailable");
  });

  test("zero, um e dois ou mais ciclos", () => {
    expect(expeditionReadState({ isRealMode: true, status: "done", result: ok(0) })).toBe("zero");
    expect(expeditionReadState({ isRealMode: true, status: "done", result: ok(1) })).toBe("one");
    expect(expeditionReadState({ isRealMode: true, status: "done", result: ok(3) })).toBe("comparable");
  });
});
