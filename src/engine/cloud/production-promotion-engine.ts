export type ProductionControlId =
  | "signed_session"
  | "persistence_adapter"
  | "rls"
  | "consent_durable"
  | "production_attestation";

export interface RuntimeEvidence {
  controlId: ProductionControlId;
  environment: "demo" | "production";
  assurance: "contract_only" | "runtime_verified";
  status: "verified" | "failed";
  deploymentId: string;
  releaseCommit: string;
  observedAt: string;
  expiresAt: string;
  digest: string;
}

export interface ProductionPromotionInput {
  deploymentId: string;
  releaseCommit: string;
  evaluatedAt: string;
  evidence: readonly RuntimeEvidence[];
}

export type ProductionControlReason =
  | "passed"
  | "missing"
  | "duplicate"
  | "demo_evidence"
  | "contract_only"
  | "failed"
  | "deployment_mismatch"
  | "release_mismatch"
  | "invalid_time"
  | "not_yet_observed"
  | "expired"
  | "invalid_digest";

export interface ProductionControlDecision {
  controlId: ProductionControlId;
  passed: boolean;
  reason: ProductionControlReason;
}

export interface PromotionCertificateDraft {
  schema: "vitalos.production-promotion.v1";
  deploymentId: string;
  releaseCommit: string;
  evaluatedAt: string;
  evidenceDigests: Array<{ controlId: ProductionControlId; digest: string }>;
}

export interface ProductionPromotionResult {
  status: "ready" | "blocked";
  productionClaimsAllowed: boolean;
  passedControlCount: number;
  controlCount: 5;
  controls: ProductionControlDecision[];
  certificate: PromotionCertificateDraft | null;
}

export const REQUIRED_PRODUCTION_CONTROLS: readonly ProductionControlId[] = [
  "signed_session",
  "persistence_adapter",
  "rls",
  "consent_durable",
  "production_attestation",
];

function validTime(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validDigest(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function decide(
  controlId: ProductionControlId,
  input: ProductionPromotionInput,
): ProductionControlDecision {
  const matches = input.evidence.filter((item) => item.controlId === controlId);
  if (matches.length === 0) return { controlId, passed: false, reason: "missing" };
  if (matches.length > 1) return { controlId, passed: false, reason: "duplicate" };
  const evidence = matches[0]!;

  if (evidence.environment !== "production") {
    return { controlId, passed: false, reason: "demo_evidence" };
  }
  if (evidence.assurance !== "runtime_verified") {
    return { controlId, passed: false, reason: "contract_only" };
  }
  if (evidence.status !== "verified") return { controlId, passed: false, reason: "failed" };
  if (evidence.deploymentId !== input.deploymentId) {
    return { controlId, passed: false, reason: "deployment_mismatch" };
  }
  if (evidence.releaseCommit !== input.releaseCommit) {
    return { controlId, passed: false, reason: "release_mismatch" };
  }

  const evaluated = validTime(input.evaluatedAt);
  const observed = validTime(evidence.observedAt);
  const expires = validTime(evidence.expiresAt);
  if (evaluated === null || observed === null || expires === null || expires <= observed) {
    return { controlId, passed: false, reason: "invalid_time" };
  }
  if (observed > evaluated) return { controlId, passed: false, reason: "not_yet_observed" };
  if (expires <= evaluated) return { controlId, passed: false, reason: "expired" };
  if (!validDigest(evidence.digest)) {
    return { controlId, passed: false, reason: "invalid_digest" };
  }
  return { controlId, passed: true, reason: "passed" };
}

/**
 * Issues only a certificate draft. A server adapter must hash/sign and persist
 * it after evaluating evidence from the actual production deployment.
 */
export function evaluateProductionPromotion(
  input: ProductionPromotionInput,
): ProductionPromotionResult {
  const controls = REQUIRED_PRODUCTION_CONTROLS.map((controlId) => decide(controlId, input));
  const passedControlCount = controls.filter((item) => item.passed).length;
  const ready =
    Boolean(input.deploymentId.trim()) &&
    /^[a-f0-9]{7,64}$/.test(input.releaseCommit) &&
    passedControlCount === REQUIRED_PRODUCTION_CONTROLS.length;

  return {
    status: ready ? "ready" : "blocked",
    productionClaimsAllowed: ready,
    passedControlCount,
    controlCount: 5,
    controls,
    certificate: ready
      ? {
          schema: "vitalos.production-promotion.v1",
          deploymentId: input.deploymentId,
          releaseCommit: input.releaseCommit,
          evaluatedAt: input.evaluatedAt,
          evidenceDigests: REQUIRED_PRODUCTION_CONTROLS.map((controlId) => ({
            controlId,
            digest: input.evidence.find((item) => item.controlId === controlId)!.digest,
          })),
        }
      : null,
  };
}

export function canonicalizePromotionCertificate(certificate: PromotionCertificateDraft): string {
  return JSON.stringify(certificate);
}
