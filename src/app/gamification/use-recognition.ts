import { useMemo } from "react";
import {
  getAntiGamingRules,
  getParticipationLedgerConfig,
  getRecognitionPolicy,
} from "@/engine/gamification/gamification-engine";
import { useParticipationLedger } from "@/engine/gamification/participation-store";
import {
  buildRecognitionAggregates,
  recognitionBudgetRemaining,
  type RecognitionRecordResult,
  type RecognitionVisibility,
} from "@/engine/recognition/recognition-engine";
import { useRecognitionLedger } from "@/engine/recognition/recognition-store";
import { usePack } from "@/engine/pack";
import { MOCK_USER, RECOGNITION_AGGREGATES } from "@/mocks/colaborador-mock";
import { GAMIFICATION_TODAY } from "@/mocks/gamification-mock";

export interface SendRecognitionInput {
  recipientId: string;
  pillarId: string;
  visibility: RecognitionVisibility;
  publicationConsent: boolean;
}

export function useRecognition() {
  const { gamification } = usePack();
  const events = useRecognitionLedger((state) => state.events);
  const recordRecognition = useRecognitionLedger((state) => state.record);
  const recordParticipation = useParticipationLedger((state) => state.record);

  return useMemo(() => {
    if (!gamification) {
      return {
        events,
        policy: null,
        remainingBudget: 0,
        aggregates: [],
        today: GAMIFICATION_TODAY,
        send: (_input: SendRecognitionInput): RecognitionRecordResult | null => null,
      };
    }

    const policy = getRecognitionPolicy(gamification);
    const participationConfig = getParticipationLedgerConfig(gamification);
    const antiGaming = getAntiGamingRules(gamification);
    const remainingBudget = recognitionBudgetRemaining(
      events,
      MOCK_USER.id,
      GAMIFICATION_TODAY,
      policy,
    );

    return {
      events,
      policy,
      remainingBudget,
      aggregates: buildRecognitionAggregates(RECOGNITION_AGGREGATES, policy),
      today: GAMIFICATION_TODAY,
      send: (input: SendRecognitionInput): RecognitionRecordResult => {
        const id = `recognition:${MOCK_USER.id}:${GAMIFICATION_TODAY}:${events.length + 1}`;
        const result = recordRecognition(
          {
            id,
            senderId: MOCK_USER.id,
            recipientId: input.recipientId,
            pillarId: input.pillarId,
            visibility: input.visibility,
            publicationConsent: input.publicationConsent,
            occurredOn: GAMIFICATION_TODAY,
          },
          policy,
        );

        if (result.reason === "recorded" && result.event) {
          recordParticipation(
            {
              id: `kudo-sent:${result.event.id}`,
              kind: "kudo_sent",
              sourceId: result.event.id,
              occurredOn: GAMIFICATION_TODAY,
            },
            participationConfig.awards,
            antiGaming,
          );
        }
        return result;
      },
    };
  }, [events, gamification, recordParticipation, recordRecognition]);
}
