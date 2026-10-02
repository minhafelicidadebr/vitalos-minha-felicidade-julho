import { describe, expect, test } from "bun:test";
import {
  cycleOfInstant,
  formatCycleKey,
  normalizeCycleKey,
  parseCycleKey,
  sameCycle,
  toJourneyCycleId,
} from "./cycle-key";

describe("cycle_key — representação interna e conversor", () => {
  test("converte os três formatos existentes para a mesma representação", () => {
    expect(parseCycleKey("2026-T2")).toEqual({ cycle: { year: 2026, quarter: 2 }, format: "canonical" });
    expect(parseCycleKey("2026-t2")).toEqual({ cycle: { year: 2026, quarter: 2 }, format: "registry_lowercase" });
    expect(parseCycleKey("T2-2026")).toEqual({ cycle: { year: 2026, quarter: 2 }, format: "journey" });
    expect(parseCycleKey(" t2-2026 ")?.cycle).toEqual({ year: 2026, quarter: 2 });
  });

  test("forma canônica é YYYY-Tn; jornada continua Tn-YYYY", () => {
    expect(formatCycleKey({ year: 2026, quarter: 3 })).toBe("2026-T3");
    expect(toJourneyCycleId({ year: 2026, quarter: 3 })).toBe("T3-2026");
    expect(normalizeCycleKey("T4-2025")).toBe("2025-T4");
    expect(normalizeCycleKey("2025-t1")).toBe("2025-T1");
  });

  test("slug de temporada e formatos fora do contrato são legados, nunca adivinhados", () => {
    for (const raw of ["fundacao-segura", "2026-S1", "2025-Q3", "2026-T5", "2026-T0", "T1-1999", "", null, undefined]) {
      expect(parseCycleKey(raw as string)).toBeNull();
      expect(normalizeCycleKey(raw as string)).toBeNull();
    }
  });

  test("equivalência entre formatos; legado só é igual a si mesmo", () => {
    expect(sameCycle("2026-t2", "T2-2026")).toBe(true);
    expect(sameCycle("2026-T2", "2026-T3")).toBe(false);
    expect(sameCycle("fundacao-segura", "fundacao-segura")).toBe(true);
    expect(sameCycle("fundacao-segura", "2026-T2")).toBe(false);
  });

  test("trimestre civil no fuso operacional (relógio controlado, sem Date.now)", () => {
    expect(cycleOfInstant("2026-04-01T12:00:00.000Z")).toEqual({ year: 2026, quarter: 2 });
    expect(cycleOfInstant("2026-06-30T23:00:00.000Z")).toEqual({ year: 2026, quarter: 2 });
    // 01:00 UTC de 1º de abril ainda é 31 de março em São Paulo (UTC-3).
    expect(cycleOfInstant("2026-04-01T01:00:00.000Z")).toEqual({ year: 2026, quarter: 1 });
    expect(cycleOfInstant("2026-04-01T01:00:00.000Z", "UTC")).toEqual({ year: 2026, quarter: 2 });
    expect(() => cycleOfInstant("não-é-data")).toThrow(/instante inválido/);
  });
});
