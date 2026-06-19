import { evaluateCloudReadiness } from "@/engine/cloud/cloud-readiness-engine";
import { buildIsolationAuditProof } from "../identity/isolation-audit-proof.server";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";
import { buildDataPipelineSnapshot } from "../pipeline/data-pipeline-snapshot.server";
import { buildConsentLedgerContractProof } from "../trust/consent-ledger-proof.server";

export interface CloudReadinessProof extends ReturnType<typeof evaluateCloudReadiness> {
  generatedAt: string;
  environment: "demo";
  lovableCloudConfigured: false;
  sensitivePayloadReturned: false;
}

export function buildCloudReadinessProof(
  packId: string,
  generatedAt = new Date().toISOString(),
): CloudReadinessProof | null {
  const pipeline = buildDataPipelineSnapshot(packId, generatedAt);
  if (!pipeline) return null;
  const identity = readIdentityBoundaryStatus();
  const isolation = buildIsolationAuditProof(generatedAt);
  const consent = buildConsentLedgerContractProof(generatedAt);

  return {
    generatedAt,
    environment: "demo",
    lovableCloudConfigured: false,
    sensitivePayloadReturned: false,
    ...evaluateCloudReadiness({
      identityContractKnown: identity.reason === "demo_isolated",
      persistenceContractVerified: pipeline.persistence.status === "contract_verified",
      isolationOracleVerified: isolation.status === "verified",
      consentContractVerified: consent.status === "contract_verified",
      pipelineContractVerified: pipeline.attestation.status === "verified",
      signedSessionActive: identity.realAuthentication && identity.serverEnforced,
      persistenceAdapterAvailable: pipeline.persistence.runtime === "cloud_available",
      rlsDeployed: isolation.rlsDeployed,
      durableConsentLedger: consent.persisted,
      productionAttestationVerified:
        pipeline.attestation.assuranceLevel === "production_runtime" &&
        pipeline.attestation.status === "verified",
    }),
  };
}
