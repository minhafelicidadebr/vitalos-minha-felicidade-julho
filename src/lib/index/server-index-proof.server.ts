import { resolvePackBundle } from "@/domain/packs/registry";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { publicAggregationToIndexInput } from "@/engine/index/public-index-engine";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";
import {
  buildAggregationProof,
  type AggregationProof,
} from "../aggregation/aggregation-proof.server";

interface IndexFrameworkMeta {
  responseScale?: { min?: number; max?: number };
}

export interface ServerIndexLens {
  lensId: string;
  lensName: string;
  color: string;
  score: number;
  visiblePillarCount: number;
  totalPillarCount: number;
}

export interface ServerIndexProof {
  packId: string;
  organizationId: string;
  cycleId: string;
  generatedAt: string;
  indexId: string;
  indexName: string;
  indexLabel: string;
  indexVersion: string;
  score: number;
  maturity: {
    name: string;
    badge: string;
  };
  respondentCount: number;
  visiblePillarCount: number;
  protectedPillarCount: number;
  totalFrameworkPillarCount: number;
  aggregationCohortId: string;
  source: "published_aggregates_only";
  rawResponsesReturned: false;
  disclaimer: string;
  lenses: ServerIndexLens[];
}

export function buildIndexProofFromAggregation(
  aggregationProof: AggregationProof,
): ServerIndexProof | null {
  const bundle = resolvePackBundle(aggregationProof.packId);
  const index = bundle.index;
  if (!index || bundle.pack.packId !== aggregationProof.packId) return null;

  const framework = index as ProprietaryIndex & IndexFrameworkMeta;
  const converted = publicAggregationToIndexInput(
    aggregationProof.organizationId,
    aggregationProof.cycleId,
    aggregationProof.organization,
    {
      min: framework.responseScale?.min ?? 1,
      max: framework.responseScale?.max ?? 5,
    },
  );
  if (!converted.valid) return null;

  const result = calculateIVO(converted.input, index);
  const visibleIds = new Set(converted.input.aggregates.map((pillar) => pillar.pillarId));

  return {
    packId: aggregationProof.packId,
    organizationId: result.organizationId,
    cycleId: result.cycleId,
    generatedAt: aggregationProof.generatedAt,
    indexId: index.id,
    indexName: index.name,
    indexLabel: String(bundle.pack.labels.index ?? index.id.toUpperCase()),
    indexVersion: index.version,
    score: result.ivoScore,
    maturity: {
      name: result.maturityLevel.name,
      badge: result.maturityLevel.badge,
    },
    respondentCount: result.totalRespondents,
    visiblePillarCount: converted.visiblePillarCount,
    protectedPillarCount: converted.protectedPillarCount,
    totalFrameworkPillarCount: result.lenses.reduce(
      (total, lens) => total + lens.pillars.length,
      0,
    ),
    aggregationCohortId: aggregationProof.organization.cohortId,
    source: "published_aggregates_only",
    rawResponsesReturned: false,
    disclaimer: result.disclaimer,
    lenses: result.lenses.map((lens) => ({
      lensId: lens.lensId,
      lensName: lens.lensName,
      color: lens.color,
      score: lens.score,
      visiblePillarCount: lens.pillars.filter((pillar) => visibleIds.has(pillar.pillarId)).length,
      totalPillarCount: lens.pillars.length,
    })),
  };
}

export function buildServerIndexProof(
  packId: string,
  generatedAt = new Date().toISOString(),
): ServerIndexProof | null {
  const aggregation = buildAggregationProof(packId, generatedAt);
  return aggregation ? buildIndexProofFromAggregation(aggregation) : null;
}
