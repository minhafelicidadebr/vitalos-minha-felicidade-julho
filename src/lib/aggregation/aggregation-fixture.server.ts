import type { AggregationSubmission } from "@/engine/aggregation/response-aggregation-engine";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";

export interface ServerAggregationFixture {
  packId: string;
  waveId: string;
  surveyId: string;
  organizationId: string;
  cycleId: string;
  submissions: AggregationSubmission[];
  protectedCohort: AggregationSubmission[];
}

export function buildServerAggregationFixture(packId: string): ServerAggregationFixture | null {
  const wave = getActiveWave(packId);
  const survey = getWaveSurvey(packId, wave.instrumentShort);
  if (!survey) return null;

  const submissions = Array.from({ length: 8 }, (_, participantIndex) => ({
    submissionId: `server-only-${participantIndex + 1}`,
    answers: survey.items.map((item, itemIndex) => ({
      itemId: item.id,
      value:
        survey.scale.options[(participantIndex + itemIndex * 2) % survey.scale.options.length]!
          .value,
    })),
  }));

  return {
    packId,
    waveId: wave.id,
    surveyId: survey.id,
    organizationId: packId === "school" ? "school-horizonte" : "org-vitalis",
    cycleId: wave.id,
    submissions,
    protectedCohort: submissions.slice(0, 3),
  };
}
