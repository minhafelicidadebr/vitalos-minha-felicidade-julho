import { describe, expect, test } from "bun:test";
import {
  classifySectorLink,
  isValidSectorKey,
  normalizeSectorKey,
  protectSectorParticipation,
} from "./sector-operations";

describe("sector operations contract", () => {
  test("normalizes a human label into the exact cohort/link key", () => {
    expect(normalizeSectorKey("  Operacoes Sao Paulo  ")).toBe("OPERACOES-SAO-PAULO");
    expect(normalizeSectorKey("TESTE-ISG-A")).toBe("TESTE-ISG-A");
    expect(isValidSectorKey("TESTE-ISG-A")).toBe(true);
    expect(isValidSectorKey("teste isg a")).toBe(false);
  });

  test("classifies links without needing the raw token", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    expect(
      classifySectorLink({ status: "active", expiresAt: "2026-08-13T12:00:00.000Z" }, now),
    ).toBe("active");
    expect(
      classifySectorLink({ status: "active", expiresAt: "2026-08-11T12:00:00.000Z" }, now),
    ).toBe("expired");
    expect(
      classifySectorLink({ status: "revoked", expiresAt: "2026-08-13T12:00:00.000Z" }, now),
    ).toBe("revoked");
  });

  test("suppresses exact participation below k=5", () => {
    for (const count of [0, 1, 2, 3, 4]) {
      expect(protectSectorParticipation(count)).toEqual({ reportable: false, countLabel: "<5" });
    }
    expect(protectSectorParticipation(5)).toEqual({ reportable: true, countLabel: "5" });
  });
});
