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
import {
  buildPersistenceContractProof,
  type PersistenceContractProof,
} from "../persistence/persistence-contract-proof.server";

export interface DataPipelineSnapshot {
  generatedAt: string;
  aggregation: AggregationProof;
  index: ServerIndexProof;
  attestation: SealedPipelineAttestation;
  persistence: PersistenceContractProof;
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
    persistence: buildPersistenceContractProof(generatedAt),
  };
}
