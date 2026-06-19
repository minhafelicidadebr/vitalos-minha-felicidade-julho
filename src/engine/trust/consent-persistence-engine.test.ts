import { describe, expect, test } from "bun:test";
import {
  issueDurableConsentReceipt,
  planConsentPersistence,
  type CommittedConsentEvent,
  type ConsentAppendEnvelope,
  type ConsentPersistenceSession,
} from "./consent-persistence-engine";

const session: ConsentPersistenceSession = {
  authenticated: true,
  subjectId: "subject-a",
  tenantId: "tenant-a",
  organizationId: "org-a",
};

const envelope: ConsentAppendEnvelope = {
  tenantId: "tenant-a",
  organizationId: "org-a",
  requestId: "request-a",
  purposeId: "pulses",
  revision: 2,
  decision: "revoked",
  policyVersion: "2026.1",
  occurredAt: "2026-06-19T15:00:00.000Z",
};

const committed: CommittedConsentEvent = {
  idempotencyKey: "consent:tenant-a:subject-a:pulses:request-a",
  tenantId: "tenant-a",
  organizationId: "org-a",
  subjectId: "subject-a",
  requestId: "request-a",
  purposeId: "pulses",
  revision: 2,
  decision: "revoked",
  policyVersion: "2026.1",
  occurredAt: "2026-06-19T15:00:00.000Z",
  commitId: "commit-a",
  committedAt: "2026-06-19T15:00:01.000Z",
};

describe("consent persistence planning", () => {
  test("first valid append requires one insert", () => {
    expect(planConsentPersistence(session, envelope, 1, null)).toMatchObject({
      allowed: true,
      action: "insert",
      reason: "insert_required",
      expectedRevision: 2,
    });
  });

  test("exact retry becomes an idempotent replay", () => {
    expect(planConsentPersistence(session, envelope, 2, committed)).toMatchObject({
      allowed: true,
      action: "replay",
      reason: "idempotent_replay",
    });
  });

  test("same request with changed decision is a conflict", () => {
    expect(
      planConsentPersistence(session, { ...envelope, decision: "granted" }, 2, committed).reason,
    ).toBe("request_conflict");
  });

  test("revision must be exactly latest plus one", () => {
    expect(planConsentPersistence(session, { ...envelope, revision: 3 }, 1, null)).toMatchObject({
      allowed: false,
      reason: "revision_conflict",
      expectedRevision: 2,
    });
  });

  test("client tenant and organization cannot override the session", () => {
    expect(
      planConsentPersistence(session, { ...envelope, tenantId: "tenant-b" }, 1, null).reason,
    ).toBe("tenant_mismatch");
  });

  test("invalid session and malformed timestamps fail closed", () => {
    expect(
      planConsentPersistence({ ...session, authenticated: false }, envelope, 1, null).reason,
    ).toBe("invalid_session");
    expect(
      planConsentPersistence(session, { ...envelope, occurredAt: "not-a-date" }, 1, null).reason,
    ).toBe("invalid_envelope");
  });
});

describe("durable consent receipt", () => {
  test("confirmed scoped commit issues a content-free receipt", () => {
    expect(
      issueDurableConsentReceipt(session, envelope, {
        confirmed: true,
        status: "committed",
        record: committed,
      }),
    ).toEqual({
      issued: true,
      receipt: {
        receiptId: "consent:commit-a",
        purposeId: "pulses",
        revision: 2,
        decision: "revoked",
        policyVersion: "2026.1",
        acceptedAt: "2026-06-19T15:00:01.000Z",
        persistence: "cloud_persisted",
        persisted: true,
        replayed: false,
        contentReturned: false,
      },
    });
  });

  test("rollback, cross-tenant commit and metadata drift emit no receipt", () => {
    expect(
      issueDurableConsentReceipt(session, envelope, {
        confirmed: false,
        status: "rolled_back",
        record: null,
      }).issued,
    ).toBe(false);
    expect(
      issueDurableConsentReceipt(session, envelope, {
        confirmed: true,
        status: "committed",
        record: { ...committed, tenantId: "tenant-b" },
      }).issued,
    ).toBe(false);
    expect(
      issueDurableConsentReceipt(session, envelope, {
        confirmed: true,
        status: "committed",
        record: { ...committed, policyVersion: "2025.4" },
      }).issued,
    ).toBe(false);
  });
});
