import { createHash } from "node:crypto";
import {
  buildPipelineAttestation,
  canonicalAttestationPayload,
  type PipelineAttestationDraft,
  type PipelineRuntimeMode,
} from "@/engine/proof/pipeline-attestation-engine";
import type { AggregationProof } from "../aggregation/aggregation-proof.server";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";
import type { ServerIndexProof } from "../index/server-index-proof.server";

export interface SealedPipelineAttestation extends PipelineAttestationDraft {
  generatedAt: string;
  attestationId: string;
  digest: string;
  digestScope: "sanitized_public_metadata";
  rawResponsesReturned: false;
}

function captureMode(): PipelineRuntimeMode {
  const boundary = readIdentityBoundaryStatus();
  if (boundary.state === "blocked") return "cloud_blocked";
  return "ephemeral_demo";
}

export function sealPipelineAttestation(
  draft: PipelineAttestationDraft,
  generatedAt = new Date().toISOString(),
): SealedPipelineAttestation {
  const digest = createHash("sha256").update(canonicalAttestationPayload(draft)).digest("hex");
  return {
    ...draft,
    generatedAt,
    attestationId: `pipeline:${draft.packId}:${draft.cycleId}:${digest.slice(0, 16)}`,
    digest: `sha256:${digest}`,
    digestScope: "sanitized_public_metadata",
    rawResponsesReturned: false,
  };
}

export function buildSealedPipelineAttestation(
  aggregation: AggregationProof,
  index: ServerIndexProof,
  generatedAt = aggregation.generatedAt,
): SealedPipelineAttestation {
  const mode = captureMode();
  const protectedContractValid =
    aggregation.protectedCohort.pillars.length > 0 &&
    aggregation.protectedCohort.pillars.every((pillar) => !pillar.visible && pillar.mean === null);

  const draft = buildPipelineAttestation({
    packId: aggregation.packId,
    organizationId: aggregation.organizationId,
    cycleId: aggregation.cycleId,
    capture: {
      mode,
      persisted: mode === "cloud_persisted",
      contentReturned: false,
    },
    aggregation: {
      participantCount: aggregation.organization.participantCount,
      kAnonymityMin: aggregation.organization.kAnonymityMin,
      publishable: aggregation.organization.publishable,
      publishedPillarCount: aggregation.organization.pillars.filter((pillar) => pillar.visible)
        .length,
      protectedPillarCount: aggregation.protectedCohort.pillars.length,
      protectedContractValid,
      rawResponsesReturned: aggregation.rawResponsesReturned,
    },
    index: {
      indexId: index.indexId,
      indexLabel: index.indexLabel,
      score: index.score,
      respondentCount: index.respondentCount,
      visiblePillarCount: index.visiblePillarCount,
      source: index.source,
      rawResponsesReturned: index.rawResponsesReturned,
    },
  });

  return sealPipelineAttestation(draft, generatedAt);
}
