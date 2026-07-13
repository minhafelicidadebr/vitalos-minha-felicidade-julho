import { describe, expect, test } from "bun:test";
import {
  getPlanLimits,
  checkWaveQuota,
  checkInviteQuota,
  checkSeatQuota,
  checkInstrumentAllowed,
  describeLimitViolation,
  PLAN_CATALOG,
} from "./plan-engine";

describe("plan-engine", () => {
  test("unknown plan id falls back to pilot (fail-closed, never the most permissive plan)", () => {
    const plan = getPlanLimits("nonexistent");
    expect(plan).toEqual(PLAN_CATALOG.pilot);
  });

  test("pilot allows exactly 1 wave per month, blocks the 2nd", () => {
    expect(checkWaveQuota("pilot", 0).allowed).toBe(true);
    const second = checkWaveQuota("pilot", 1);
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe("wave_quota_exceeded");
  });

  test("growth allows up to 4 waves per month", () => {
    expect(checkWaveQuota("growth", 3).allowed).toBe(true);
    expect(checkWaveQuota("growth", 4).allowed).toBe(false);
  });

  test("enterprise has unlimited waves", () => {
    expect(checkWaveQuota("enterprise", 10_000).allowed).toBe(true);
  });

  test("invite quota respects plan ceiling", () => {
    expect(checkInviteQuota("pilot", 50).allowed).toBe(true);
    expect(checkInviteQuota("pilot", 51).allowed).toBe(false);
    expect(checkInviteQuota("growth", 500).allowed).toBe(true);
    expect(checkInviteQuota("growth", 501).allowed).toBe(false);
  });

  test("seat quota blocks adding a 2nd admin on pilot", () => {
    expect(checkSeatQuota("pilot", 0).allowed).toBe(true);
    expect(checkSeatQuota("pilot", 1).allowed).toBe(false);
  });

  test("instrument gating — pilot only unlocks COPSOQ", () => {
    expect(checkInstrumentAllowed("pilot", "COPSOQ").allowed).toBe(true);
    expect(checkInstrumentAllowed("pilot", "PERMA").allowed).toBe(false);
    expect(checkInstrumentAllowed("pilot", "VIA_T").allowed).toBe(false);
    expect(checkInstrumentAllowed("pilot", "FIB_T").allowed).toBe(false);
  });

  test("instrument gating — growth and enterprise unlock all four", () => {
    for (const plan of ["growth", "enterprise"]) {
      for (const instrument of ["COPSOQ", "PERMA", "VIA_T", "FIB_T"]) {
        expect(checkInstrumentAllowed(plan, instrument).allowed).toBe(true);
      }
    }
  });

  test("describeLimitViolation returns null for ok, a message for every violation reason", () => {
    expect(describeLimitViolation("ok")).toBeNull();
    expect(describeLimitViolation("wave_quota_exceeded")).toContain("upgrade");
    expect(describeLimitViolation("invite_quota_exceeded")).toContain("upgrade");
    expect(describeLimitViolation("seat_quota_exceeded")).toContain("upgrade");
    expect(describeLimitViolation("instrument_not_allowed")).toContain("upgrade");
  });

  test("every plan in the catalog has internally consistent limits", () => {
    for (const plan of Object.values(PLAN_CATALOG)) {
      expect(plan.maxWavesPerMonth).toBeGreaterThan(0);
      expect(plan.maxInvitesPerWave).toBeGreaterThan(0);
      expect(plan.maxAdminSeats).toBeGreaterThan(0);
      expect(plan.allowedInstruments.length).toBeGreaterThan(0);
      expect(plan.allowedInstruments).toContain("COPSOQ");
    }
  });
});
