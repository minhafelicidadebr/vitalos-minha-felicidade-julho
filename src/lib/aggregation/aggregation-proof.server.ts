import {
  aggregateValidatedResponses,
  publishKAnonymousAggregation,
  type AggregationItemDefinition,
  type PublicAggregation,
} from "@/engine/aggregation/response-aggregation-engine";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { REGISTERED_PACK_IDS } from "@/domain/packs/registry";
import { buildServerAggregationFixture } from "./aggregation-fixture.server";

export interface AggregationProof {
  packId: string;
  waveId: string;
  surveyId: string;
  organizationId: string;
  cycleId: string;
  generatedAt: string;
  organization: PublicAggregation;
  protectedCohort: PublicAggregation;
  rawResponsesReturned: false;
}

export function buildAggregationProof(
  packId: string,
  generatedAt = new Date().toISOString(),
): AggregationProof | null {
  if (!REGISTERED_PACK_IDS.includes(packId)) return null;
  const wave = getActiveWave(packId);
  const survey = getWaveSurvey(packId, wave.instrumentShort);
  const fixture = buildServerAggregationFixture(packId);
  if (!survey || !fixture) return null;

  const items: AggregationItemDefinition[] = survey.items.map((item) => ({
    itemId: item.id,
    pillarId: item.pillarId,
    reverse: item.reverse,
  }));
  const values = survey.scale.options.map((option) => option.value);
  const scale = { min: Math.min(...values), max: Math.max(...values) };

  const organization = aggregateValidatedResponses(fixture.submissions, items, scale);
  const protectedCohort = aggregateValidatedResponses(fixture.protectedCohort, items, scale);

  return {
    packId,
    waveId: fixture.waveId,
    surveyId: fixture.surveyId,
    organizationId: fixture.organizationId,
    cycleId: fixture.cycleId,
    generatedAt,
    organization: publishKAnonymousAggregation("organization", organization, 5),
    protectedCohort: publishKAnonymousAggregation("protected-cohort", protectedCohort, 5),
    rawResponsesReturned: false,
  };
}
