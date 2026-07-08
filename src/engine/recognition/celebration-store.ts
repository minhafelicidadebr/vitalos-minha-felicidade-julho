import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CelebrationRecord } from "./celebration-engine";

// Delta de sessão das Celebrações do Jardineiro (mesmo idioma do seed-wallet e do
// diário de prática): a demo não tem histórico-base — cada sessão começa "sem
// celebrações ainda", coerente com o Pomar sendo um recorte vivo desta demonstração.
interface CelebrationState {
  records: CelebrationRecord[];
  append: (record: CelebrationRecord) => void;
  reset: () => void;
}

export const useCelebrations = create<CelebrationState>()(
  persist(
    (set) => ({
      records: [],
      append: (record) => set((state) => ({ records: [...state.records, record] })),
      reset: () => set({ records: [] }),
    }),
    { name: "vitalos-celebrations" },
  ),
);
