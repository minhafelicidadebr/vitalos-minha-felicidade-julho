import { createHash } from "node:crypto";
import {
  attestIdentityTrustChain,
  canonicalizeTrustChainAttestation,
} from "@/engine/security/trust-chain-attestation-engine";
import { buildGrantIssuanceContractProof } from "../identity/grant-issuance-proof.server";
import { buildIsolationAuditProof } from "../identity/isolation-audit-proof.server";
import { buildSignedSessionContractProof } from "../identity/session-contract-proof.server";
import { buildRlsParityProof } from "./rls-parity-proof.server";

export interface IdentityTrustChainProof extends ReturnType<typeof attestIdentityTrustChain> {
  generatedAt: string;
  digestAlgorithm: "sha256";
  digestScope: "sanitized_public_metadata";
  digest: string;
  sensitivePayloadReturned: false;
}

export function buildIdentityTrustChainProof(
  generatedAt = new Date().toISOString(),
): IdentityTrustChainProof {
  const session = buildSignedSessionContractProof(generatedAt);
  const grants = buildGrantIssuanceContractProof(generatedAt);
  const rls = buildRlsParityProof(generatedAt);
  const isolation = buildIsolationAuditProof(generatedAt);

  const attestation = attestIdentityTrustChain({
    sessionContractVerified: session.status === "contract_verified",
    rawTokenAccepted: session.invariants.rawTokenAccepted,
    clientPersonaTrusted: session.invariants.clientPersonaTrusted,
    grantContractVerified: grants.status === "contract_verified",
    atomicGrantBatch: grants.invariants.atomicBatch,
    leastPrivilege: grants.invariants.leastPrivilege,
    tenantBoundGrants: grants.invariants.tenantBound,
    rlsParityVerified: rls.status === "verified",
    rlsDefaultDeny: rls.manifest.defaultDeny,
    rawResponseReadDenied: rls.cases.some(
      (item) => item.expectedClass === "privacy" && item.passed,
    ),
    isolationOracleVerified: isolation.status === "verified",
    sensitivePayloadReturned:
      session.invariants.sensitivePayloadReturned ||
      grants.invariants.sensitivePayloadReturned ||
      rls.sensitivePayloadReturned ||
      isolation.sensitiveFixturesReturned,
    signedSessionActive: session.signedSessionActive,
    grantsServerIssued: grants.grantsServerIssued,
    rlsDeployed: rls.rlsDeployed,
  });
  const canonical = canonicalizeTrustChainAttestation(attestation);

  return {
    generatedAt,
    ...attestation,
    digestAlgorithm: "sha256",
    digestScope: "sanitized_public_metadata",
    digest: createHash("sha256").update(canonical).digest("hex"),
    sensitivePayloadReturned: false,
  };
}
