// Estado de sessão das respostas de onda (mock-first). Guarda apenas QUAIS ondas o
// indivíduo já respondeu (por id) — nunca o conteúdo das respostas, que em produção
// vai para a edge function agregadora (Fase 2). Persistido como as demais escolhas
// do usuário (persona, pack). Co-localizado com o survey-engine.
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WaveResponseState {
  respondedWaveIds: string[];
  hasResponded: (waveId: string) => boolean;
  markResponded: (waveId: string) => void;
  reset: (waveId: string) => void;
}

export const useWaveResponses = create<WaveResponseState>()(
  persist(
    (set, get) => ({
      respondedWaveIds: [],
      hasResponded: (waveId) => get().respondedWaveIds.includes(waveId),
      markResponded: (waveId) =>
        set((s) =>
          s.respondedWaveIds.includes(waveId)
            ? s
            : { respondedWaveIds: [...s.respondedWaveIds, waveId] },
        ),
      reset: (waveId) =>
        set((s) => ({ respondedWaveIds: s.respondedWaveIds.filter((id) => id !== waveId) })),
    }),
    { name: "vita-wave-responses" },
  ),
);
