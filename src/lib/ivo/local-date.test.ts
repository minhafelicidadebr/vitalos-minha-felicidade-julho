import { describe, expect, test } from "bun:test";
import { formatIsoDateLong, todayInSaoPaulo } from "./local-date";

describe("todayInSaoPaulo", () => {
  test("21h29 em Brasília (00h29 UTC do dia seguinte) ainda é o dia local", () => {
    // Caso real do staging: evidência às 04/10/2026 21:29 (BRT) ficou com data 2026-10-05.
    const instant = new Date("2026-10-05T00:29:13.949Z");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-10-05");
    expect(todayInSaoPaulo(instant)).toBe("2026-10-04");
  });
  test("meio-dia e virada local", () => {
    expect(todayInSaoPaulo(new Date("2026-10-11T15:00:00Z"))).toBe("2026-10-11");
    expect(todayInSaoPaulo(new Date("2026-10-11T03:00:00Z"))).toBe("2026-10-11");
    expect(todayInSaoPaulo(new Date("2026-10-11T02:59:59Z"))).toBe("2026-10-10");
  });
  test("data armazenada por extenso, sem fuso e sem trocar dia e mês", () => {
    expect(formatIsoDateLong("2026-10-11")).toBe("11 de outubro de 2026");
    expect(formatIsoDateLong("2026-01-11")).toBe("11 de janeiro de 2026");
    expect(formatIsoDateLong("2026-03-01")).toBe("1 de março de 2026");
    expect(formatIsoDateLong("11/10/2026")).toBe("—");
    expect(formatIsoDateLong("2026-13-01")).toBe("—");
    expect(formatIsoDateLong(null)).toBe("—");
  });
  test("formato canônico AAAA-MM-DD, sem inverter dia e mês", () => {
    expect(todayInSaoPaulo(new Date("2026-01-11T15:00:00Z"))).toBe("2026-01-11");
    expect(todayInSaoPaulo(new Date("2026-10-11T15:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
