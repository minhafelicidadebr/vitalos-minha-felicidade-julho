import { describe, expect, test } from "bun:test";
import {
  applyConsentDecision,
  projectConsentLedger,
  type ConsentLedgerEvent,
  type ConsentPurposeDefinition,
} from "./consent-ledger-engine";

const purposes: ConsentPurposeDefinition[] = [
  { id: "pulses", policyVersion: "2026.1" },
  { id: "essential_privacy", policyVersion: "2026.1", required: true },
];
const initial: ConsentLedgerEvent[] = [
  {
    eventId: "event-1",
    requestId: "request-1",
    purposeId: "pulses",
    revision: 1,
    decision: "granted",
    policyVersion: "2026.1",
    occurredAt: "2026-06-19T10:00:00.000Z",
    actor: "subject",
    source: "self_service",
  },
];

describe("consent ledger projection", () => {
  test("rebuilds current state from monotonic revisions", () => {
    const projection = projectConsentLedger(purposes, initial);

    expect(projection.valid).toBe(true);
    if (!projection.valid) return;
    expect(projection.states.find((state) => state.purposeId === "pulses")).toMatchObject({
      granted: true,
      revision: 1,
    });
    expect(
      projection.states.find((state) => state.purposeId === "essential_privacy"),
    ).toMatchObject({
      granted: true,
      revision: 0,
    });
  });

  test("rejects duplicate requests, revision gaps and stale policy events", () => {
    expect(
      projectConsentLedger(purposes, [...initial, { ...initial[0]!, eventId: "event-2" }]),
    ).toMatchObject({ valid: false, reason: "duplicate_request" });
    expect(
      projectConsentLedger(purposes, [
        ...initial,
        {
          ...initial[0]!,
          eventId: "event-2",
          requestId: "request-2",
          revision: 3,
        },
      ]),
    ).toMatchObject({ valid: false, reason: "invalid_revision" });
    expect(
      projectConsentLedger(purposes, [{ ...initial[0]!, policyVersion: "old" }]),
    ).toMatchObject({ valid: false, reason: "stale_policy" });
  });
});

describe("consent decisions", () => {
  test("revocation appends a new revision and takes effect immediately", () => {
    const result = applyConsentDecision(purposes, initial, {
      requestId: "request-revoke",
      purposeId: "pulses",
      decision: "revoked",
      expectedRevision: 1,
      policyVersion: "2026.1",
      occurredAt: "2026-06-19T11:00:00.000Z",
    });

    expect(result).toMatchObject({ accepted: true, reason: "appended" });
    if (!result.accepted) return;
    const projection = projectConsentLedger(purposes, result.events);
    expect(projection.valid && projection.states[0]?.granted).toBe(false);
    expect(result.receipt).toMatchObject({
      revision: 2,
      persisted: false,
      changed: true,
      contentReturned: false,
    });
  });

  test("optimistic revision prevents a stale concurrent write", () => {
    const result = applyConsentDecision(purposes, initial, {
      requestId: "request-stale",
      purposeId: "pulses",
      decision: "revoked",
      expectedRevision: 0,
      policyVersion: "2026.1",
      occurredAt: "2026-06-19T11:00:00.000Z",
    });

    expect(result).toMatchObject({ accepted: false, reason: "revision_conflict" });
  });

  test("same request is replayed without appending another event", () => {
    const request = {
      requestId: "request-revoke",
      purposeId: "pulses",
      decision: "revoked" as const,
      expectedRevision: 1,
      policyVersion: "2026.1",
      occurredAt: "2026-06-19T11:00:00.000Z",
    };
    const first = applyConsentDecision(purposes, initial, request);
    expect(first.accepted).toBe(true);
    if (!first.accepted) return;
    const replay = applyConsentDecision(purposes, first.events, request);

    expect(replay).toMatchObject({ accepted: true, reason: "idempotent_replay" });
    if (!replay.accepted) return;
    expect(replay.events).toHaveLength(first.events.length);
    expect(replay.receipt.replayed).toBe(true);
  });

  test("required purpose cannot be revoked and stale policy cannot be accepted", () => {
    expect(
      applyConsentDecision(purposes, initial, {
        requestId: "request-required",
        purposeId: "essential_privacy",
        decision: "revoked",
        expectedRevision: 0,
        policyVersion: "2026.1",
        occurredAt: "2026-06-19T11:00:00.000Z",
      }),
    ).toMatchObject({ accepted: false, reason: "required_purpose" });
    expect(
      applyConsentDecision(purposes, initial, {
        requestId: "request-old-policy",
        purposeId: "pulses",
        decision: "revoked",
        expectedRevision: 1,
        policyVersion: "2025.4",
        occurredAt: "2026-06-19T11:00:00.000Z",
      }),
    ).toMatchObject({ accepted: false, reason: "stale_policy" });
  });
});
