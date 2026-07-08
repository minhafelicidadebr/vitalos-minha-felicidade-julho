import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PairConfirmation, PracticePair } from "./practice-pair-engine";

// Delta de sessão das Duplas de Prática (mesmo idioma do practice-journal-store):
// a base demonstrativa vive no mock (imutável); aqui só entram a dupla formada e
// as confirmações desta sessão. Quem valida (bilateralidade, anti-conluio,
// self-confirmation) é o engine puro — o hook só faz append do já validado.
interface PracticePairState {
  pairs: PracticePair[];
  confirmations: PairConfirmation[];
  appendPair: (pair: PracticePair) => void;
  appendConfirmation: (confirmation: PairConfirmation) => void;
  reset: () => void;
}

export const usePracticePairs = create<PracticePairState>()(
  persist(
    (set) => ({
      pairs: [],
      confirmations: [],
      appendPair: (pair) => set((state) => ({ pairs: [...state.pairs, pair] })),
      appendConfirmation: (confirmation) =>
        set((state) => ({ confirmations: [...state.confirmations, confirmation] })),
      reset: () => set({ pairs: [], confirmations: [] }),
    }),
    { name: "vitalos-practice-pairs" },
  ),
);
