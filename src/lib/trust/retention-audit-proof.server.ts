import { createHash } from "node:crypto";
import {
  canonicalizeAuditDraft,
  evaluateRetention,
  validateAuditChain,
  type AuditChainEntry,
  type AuditEntryDraft,
  type RetainedRecordMetadata,
  type RetentionPolicy,
} from "@/engine/trust/retention-audit-engine";

export interface RetentionAuditProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  runtime: "scheduler_missing";
  retentionJobsActive: false;
  immutableAuditStoreActive: false;
  productionClaimsAllowed: false;
  policySource: "injected_demo_policy";
  checks: Array<{ id: string; label: string; passed: boolean; note: string }>;
  passedCheckCount: number;
  checkCount: number;
  auditDigest: string;
  digestScope: "sanitized_audit_metadata";
  sensitivePayloadReturned: false;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function append(entries: AuditChainEntry[], draft: AuditEntryDraft): AuditChainEntry[] {
  const sequence = entries.length + 1;
  const previousDigest = entries.at(-1)?.digest ?? null;
  const digest = hash(canonicalizeAuditDraft(draft, sequence, previousDigest));
  return [...entries, { ...draft, sequence, previousDigest, digest }];
}

export function buildRetentionAuditProof(
  generatedAt = new Date().toISOString(),
): RetentionAuditProof {
  const policy: RetentionPolicy = {
    id: "consent-events",
    version: "demo.2026.1",
    retentionDays: 365,
    expiryAction: "anonymize",
    legalHoldAllowed: true,
  };
  const record: RetainedRecordMetadata = {
    recordId: "fixture-record",
    policyId: policy.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastChangedAt: "2026-01-01T00:00:00.000Z",
    state: "active",
    contentPresent: true,
  };
  const retained = evaluateRetention(policy, record, "2026-06-19T00:00:00.000Z");
  const due = evaluateRetention(policy, record, "2027-01-01T00:00:00.000Z");
  const held = evaluateRetention(
    policy,
    { ...record, legalHoldUntil: "2027-03-01T00:00:00.000Z" },
    "2027-01-02T00:00:00.000Z",
  );
  const disposed = evaluateRetention(
    policy,
    { ...record, state: "anonymized", contentPresent: false },
    "2028-01-01T00:00:00.000Z",
  );

  let chain: AuditChainEntry[] = [];
  chain = append(chain, {
    eventId: "fixture-audit-a",
    eventType: "consent.granted",
    occurredAt: "2026-06-19T10:00:00.000Z",
    policyVersion: policy.version,
    subjectRef: "subject-ref",
    resourceRef: "purpose-ref",
    contentIncluded: false,
  });
  chain = append(chain, {
    eventId: "fixture-audit-b",
    eventType: "consent.revoked",
    occurredAt: "2026-06-19T11:00:00.000Z",
    policyVersion: policy.version,
    subjectRef: "subject-ref",
    resourceRef: "purpose-ref",
    contentIncluded: false,
  });
  const validChain = validateAuditChain(chain);
  const tamperedChain = validateAuditChain([
    chain[0]!,
    { ...chain[1]!, previousDigest: "tampered" },
  ]);

  const checks = [
    {
      id: "policy_injected",
      label: "Prazos vêm de política versionada",
      passed: policy.version.length > 0 && policy.retentionDays > 0,
      note: "O engine não inventa prazo jurídico por tipo de dado.",
    },
    {
      id: "retain_before_due",
      label: "Registro ativo é mantido antes do prazo",
      passed: retained.valid && retained.reason === "retain",
      note: "Nenhuma exclusão antecipada é inferida.",
    },
    {
      id: "configured_disposal",
      label: "Vencimento aplica a ação configurada",
      passed: due.valid && due.action === "anonymize",
      note: "Delete ou anonymize são decisões explícitas da política.",
    },
    {
      id: "legal_hold",
      label: "Legal hold suspende descarte",
      passed: held.valid && held.reason === "legal_hold",
      note: "A exceção é temporal e precisa estar autorizada pela política.",
    },
    {
      id: "no_double_disposal",
      label: "Registro descartado não é processado novamente",
      passed: disposed.valid && disposed.reason === "already_disposed",
      note: "Jobs de ciclo de vida permanecem idempotentes.",
    },
    {
      id: "audit_chain",
      label: "Audit trail é sequencial e encadeado",
      passed: validChain.valid && validChain.entryCount === 2,
      note: "Cada entrada aponta o digest público da anterior.",
    },
    {
      id: "tamper_detection",
      label: "Quebra de encadeamento é detectada",
      passed: !tamperedChain.valid && tamperedChain.reason === "broken_link",
      note: "Alteração retroativa invalida a prova.",
    },
    {
      id: "metadata_only",
      label: "Audit log não carrega conteúdo",
      passed: chain.every((entry) => entry.contentIncluded === false),
      note: "Somente metadados minimizados entram no manifesto.",
    },
  ];
  const passedCheckCount = checks.filter((item) => item.passed).length;
  const publicManifest = JSON.stringify(
    chain.map((entry) => ({
      sequence: entry.sequence,
      previousDigest: entry.previousDigest,
      digest: entry.digest,
      eventType: entry.eventType,
      policyVersion: entry.policyVersion,
      contentIncluded: false,
    })),
  );

  return {
    generatedAt,
    status: passedCheckCount === checks.length ? "contract_verified" : "contract_failed",
    runtime: "scheduler_missing",
    retentionJobsActive: false,
    immutableAuditStoreActive: false,
    productionClaimsAllowed: false,
    policySource: "injected_demo_policy",
    checks,
    passedCheckCount,
    checkCount: checks.length,
    auditDigest: hash(publicManifest),
    digestScope: "sanitized_audit_metadata",
    sensitivePayloadReturned: false,
  };
}
