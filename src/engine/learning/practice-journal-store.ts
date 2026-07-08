import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PracticeEntry } from "./practice-journal-engine";

// Delta de sessão do Diário de Prática (mesmo idioma do seed-economy-store):
// a base demonstrativa vive no mock (imutável); aqui só entram os registros que
// a pessoa cria nesta sessão. Quem valida (dedupe, tipo habilitado, limite) é o
// engine puro — o hook compõe base+delta e só faz append do registro já validado.
interface PracticeJournalState {
  entries: PracticeEntry[];
  append: (entry: PracticeEntry) => void;
  reset: () => void;
}

export const usePracticeJournal = create<PracticeJournalState>()(
  persist(
    (set) => ({
      entries: [],
      append: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
      reset: () => set({ entries: [] }),
    }),
    { name: "vitalos-practice-journal" },
  ),
);
