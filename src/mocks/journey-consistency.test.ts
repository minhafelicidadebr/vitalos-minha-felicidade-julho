import { describe, expect, test } from "bun:test";
import { CANONICAL_JOURNEY } from "@/domain/journey";
import { ANNUAL_PLAN } from "./season-mock";
import { JOURNEY_QUARTERS } from "./esg-report-mock";
import { PROGRAMA_JOURNEY } from "./programa-mock";

// Trava a FONTE ÚNICA da jornada. /temporada, /relatorio-global e /programa
// derivam todos de CANONICAL_JOURNEY — estes testes garantem que nunca voltem
// a contar ordens diferentes (a inconsistência que motivou a reordenação).

describe("Jornada canônica — fonte única", () => {
  test("a espinha está na ordem do anexo (Risco → Bem-Comum → Florescimento → Forças)", () => {
    expect(CANONICAL_JOURNEY.map((s) => s.key)).toEqual([
      "risco",
      "bem_comum",
      "florescimento",
      "forcas",
    ]);
    expect(CANONICAL_JOURNEY.map((s) => s.order)).toEqual([1, 2, 3, 4]);
  });

  test("COPSOQ (risco) vem ANTES de qualquer florescimento — piso ético", () => {
    const risco = CANONICAL_JOURNEY.findIndex((s) => s.key === "risco");
    const florescimento = CANONICAL_JOURNEY.findIndex((s) => s.key === "florescimento");
    const forcas = CANONICAL_JOURNEY.findIndex((s) => s.key === "forcas");
    expect(risco).toBeLessThan(florescimento);
    expect(florescimento).toBeLessThan(forcas);
  });

  test("/temporada (ANNUAL_PLAN) deriva identidade da jornada canônica", () => {
    expect(ANNUAL_PLAN.seasons).toHaveLength(CANONICAL_JOURNEY.length);
    ANNUAL_PLAN.seasons.forEach((s, i) => {
      const j = CANONICAL_JOURNEY[i]!;
      expect(s.name).toBe(j.seasonName);
      expect(s.cycleId).toBe(j.cycleId);
      expect(s.layer).toBe(j.layer);
      expect(s.primaryInstrument).toBe(j.instrument);
      expect(s.question).toBe(j.guidingQuestion);
      expect(s.color).toBe(j.color);
    });
  });

  test("/relatorio-global (JOURNEY_QUARTERS) deriva da mesma fonte", () => {
    expect(JOURNEY_QUARTERS).toHaveLength(CANONICAL_JOURNEY.length);
    JOURNEY_QUARTERS.forEach((q, i) => {
      const j = CANONICAL_JOURNEY[i]!;
      expect(q.quarter).toBe(j.quarter);
      expect(q.lensName).toBe(j.lensName);
      expect(q.highlight).toBe(j.headline);
    });
  });

  test("/programa (PROGRAMA_JOURNEY) abre com as 4 estações + a síntese Q5", () => {
    CANONICAL_JOURNEY.forEach((j, i) => {
      expect(PROGRAMA_JOURNEY[i]!.q).toBe(j.quarter);
      expect(PROGRAMA_JOURNEY[i]!.lens).toBe(j.lensName);
    });
    expect(PROGRAMA_JOURNEY).toHaveLength(CANONICAL_JOURNEY.length + 1);
    expect(PROGRAMA_JOURNEY.at(-1)!.q).toBe("Q5");
  });
});
