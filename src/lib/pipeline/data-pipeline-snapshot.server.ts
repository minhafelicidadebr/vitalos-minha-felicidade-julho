import {
  buildAggregationProof,
  type AggregationProof,
} from "../aggregation/aggregation-proof.server";
import {
  buildIndexProofFromAggregation,
  type ServerIndexProof,
} from "../index/server-index-proof.server";
import {
  buildSealedPipelineAttestation,
  type SealedPipelineAttestation,
} from "../proof/pipeline-attestation.server";

export interface DataPipelineSnapshot {
  generatedAt: string;
  aggregation: AggregationProof;
  index: ServerIndexProof;
  attestation: SealedPipelineAttestation;
}

export function buildDataPipelineSnapshot(
  packId: string,
  generatedAt = new Date().toISOString(),
): DataPipelineSnapshot | null {
  const aggregation = buildAggregationProof(packId, generatedAt);
  if (!aggregation) return null;
  const index = buildIndexProofFromAggregation(aggregation);
  if (!index) return null;

  return {
    generatedAt,
    aggregation,
    index,
    attestation: buildSealedPipelineAttestation(aggregation, index, generatedAt),
  };
}
