import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  recordRecognition,
  type RecognitionEvent,
  type RecognitionPolicy,
  type RecognitionRecordResult,
  type RecognitionRequest,
} from "./recognition-engine";

interface RecognitionState {
  events: RecognitionEvent[];
  record: (request: RecognitionRequest, policy: RecognitionPolicy) => RecognitionRecordResult;
  reset: () => void;
}

export const useRecognitionLedger = create<RecognitionState>()(
  persist(
    (set, get) => ({
      events: [],
      record: (request, policy) => {
        const result = recordRecognition(get().events, request, policy);
        if (result.reason === "recorded") set({ events: result.events });
        return result;
      },
      reset: () => set({ events: [] }),
    }),
    { name: "vitalos-recognition-ledger" },
  ),
);
