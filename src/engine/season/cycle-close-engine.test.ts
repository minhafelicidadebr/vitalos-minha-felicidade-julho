import { describe, expect, test } from "bun:test";
import { closeCycle, type CycleCloseInput } from "./cycle-close-engine";

function base(over: Partial<CycleCloseInput> = {}): CycleCloseInput {
  return {
    seasonName: "Florescimento",
    phaseLabel: "Evoluir",
    cycleId: "T3-2026",
    proposalsGenerated: 4,
    experimentsConcluded: 3,
    experimentsConfirmed: 2,
    consentCoveragePct: 88,
    kAnonRespected: true,
    domainSeparated: true,
    ...over,
  };
}

describe("cycle-close — veredito honesto", () => {
  test("≥1 experimento confirmado + governança limpa → fecha COM PROVA", () => {
    const r = closeCycle(base());
    expect(r.proven).toBe(true);
    expect(r.governanceClean).toBe(true);
    expect(r.verdict).toContain("COM PROVA");
  });

  test("sem experimento confirmado → não fecha com prova (atividade ≠ evidência)", () => {
    const r = closeCycle(base({ experimentsConfirmed: 0 }));
    expect(r.proven).toBe(false);
    expect(r.verdict).toContain("atividade não é evidência");
  });

  test("consentimento abaixo do piso reprova a atestação e suja a governança", () => {
    const r = closeCycle(base({ consentCoveragePct: 40 }));
    const att = r.attestations.find((a) => a.label.includes("Consentimento"))!;
    expect(att.ok).toBe(false);
    expect(r.governanceClean).toBe(false);
  });

  test("provado mas governança suja → veredito pede sanar antes de publicar", () => {
    const r = closeCycle(base({ kAnonRespected: false }));
    expect(r.proven).toBe(true);
    expect(r.governanceClean).toBe(false);
    expect(r.verdict).toContain("sanar");
  });

  test("decisão humana é sempre atestada", () => {
    const r = closeCycle(base());
    expect(r.attestations.some((a) => a.label.includes("Decisão humana") && a.ok)).toBe(true);
  });
});
