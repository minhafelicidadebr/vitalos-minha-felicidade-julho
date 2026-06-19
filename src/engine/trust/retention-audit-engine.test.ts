import { describe, expect, test } from "bun:test";
import {
  canonicalizeAuditDraft,
  evaluateRetention,
  validateAuditChain,
  type AuditChainEntry,
  type RetainedRecordMetadata,
  type RetentionPolicy,
} from "./retention-audit-engine";

const policy: RetentionPolicy = {
  id: "consent-events",
  version: "2026.1",
  retentionDays: 365,
  expiryAction: "anonymize",
  legalHoldAllowed: true,
};
const record: RetainedRecordMetadata = {
  recordId: "record-a",
  policyId: "consent-events",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastChangedAt: "2026-01-01T00:00:00.000Z",
  state: "active",
  contentPresent: true,
};

describe("retention policy engine", () => {
  test("retains an active record before the configured due date", () => {
    expect(evaluateRetention(policy, record, "2026-06-19T00:00:00.000Z")).toMatchObject({
      valid: true,
      reason: "retain",
      action: "none",
      dueAt: "2027-01-01T00:00:00.000Z",
    });
  });

  test("applies the configured disposal action at the boundary", () => {
    expect(evaluateRetention(policy, record, "2027-01-01T00:00:00.000Z")).toMatchObject({
      reason: "retention_due",
      action: "anonymize",
    });
  });

  test("legal hold temporarily overrides disposal", () => {
    expect(
      evaluateRetention(
        policy,
        { ...record, legalHoldUntil: "2027-03-01T00:00:00.000Z" },
        "2027-01-02T00:00:00.000Z",
      ).reason,
    ).toBe("legal_hold");
  });

  test("disposed records are not processed twice", () => {
    expect(evaluateRetention(policy, { ...record, state: "anonymized" }, "2028-01-01").reason).toBe(
      "already_disposed",
    );
  });

  test("policy and record validation fail closed", () => {
    expect(evaluateRetention({ ...policy, retentionDays: 0 }, record, "2026-06-19").reason).toBe(
      "invalid_policy",
    );
    expect(evaluateRetention(policy, { ...record, policyId: "other" }, "2026-06-19").reason).toBe(
      "invalid_record",
    );
  });
});

describe("audit chain", () => {
  const entries: AuditChainEntry[] = [
    {
      eventId: "event-a",
      eventType: "consent.granted",
      occurredAt: "2026-06-19T10:00:00.000Z",
      policyVersion: "2026.1",
      subjectRef: "subject-ref-a",
      resourceRef: "purpose-ref-a",
      contentIncluded: false,
      sequence: 1,
      previousDigest: null,
      digest: "digest-a",
    },
    {
      eventId: "event-b",
      eventType: "consent.revoked",
      occurredAt: "2026-06-19T11:00:00.000Z",
      policyVersion: "2026.1",
      subjectRef: "subject-ref-a",
      resourceRef: "purpose-ref-a",
      contentIncluded: false,
      sequence: 2,
      previousDigest: "digest-a",
      digest: "digest-b",
    },
  ];

  test("validates monotonic append-only links", () => {
    expect(validateAuditChain(entries)).toEqual({ valid: true, reason: "valid", entryCount: 2 });
  });

  test("detects broken links, duplicate ids and sequence gaps", () => {
    expect(
      validateAuditChain([entries[0]!, { ...entries[1]!, previousDigest: "tampered" }]).reason,
    ).toBe("broken_link");
    expect(validateAuditChain([entries[0]!, { ...entries[1]!, eventId: "event-a" }]).reason).toBe(
      "duplicate_event",
    );
    expect(validateAuditChain([{ ...entries[0]!, sequence: 2 }]).reason).toBe("invalid_sequence");
  });

  test("rejects non-monotonic timestamps and content-bearing logs", () => {
    expect(
      validateAuditChain([entries[0]!, { ...entries[1]!, occurredAt: "2026-06-19T09:00:00.000Z" }])
        .reason,
    ).toBe("invalid_timestamp");
    expect(
      validateAuditChain([{ ...entries[0]!, contentIncluded: true } as unknown as AuditChainEntry])
        .reason,
    ).toBe("content_forbidden");
  });

  test("canonical payload contains metadata, never content", () => {
    const canonical = canonicalizeAuditDraft(entries[0]!, 1, null);
    expect(canonical).toContain("vitalos.audit-entry.v1");
    expect(canonical).toContain('"contentIncluded":false');
    expect(canonical).not.toContain("answer");
  });
});
