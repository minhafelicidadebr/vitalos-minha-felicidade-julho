import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  recordParticipationEvent,
  type ParticipationAwardRule,
  type ParticipationEventRequest,
  type ParticipationLedgerEvent,
  type ParticipationRecordResult,
} from "./participation-ledger";
import type { AntiGamingRules } from "./gamification-engine";

interface ParticipationLedgerState {
  events: ParticipationLedgerEvent[];
  record: (
    request: ParticipationEventRequest,
    awardRules: readonly ParticipationAwardRule[],
    antiGaming: AntiGamingRules,
  ) => ParticipationRecordResult;
  reset: () => void;
}

export const useParticipationLedger = create<ParticipationLedgerState>()(
  persist(
    (set, get) => ({
      events: [],
      record: (request, awardRules, antiGaming) => {
        const result = recordParticipationEvent(get().events, request, awardRules, antiGaming);
        if (result.reason === "recorded" || result.reason === "recorded_capped") {
          set({ events: result.events });
        }
        return result;
      },
      reset: () => set({ events: [] }),
    }),
    { name: "vitalos-participation-ledger" },
  ),
);
