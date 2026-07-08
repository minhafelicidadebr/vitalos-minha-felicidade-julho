import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CircleSession } from "./circle-engine";

// Delta de sessão das rodas dos Círculos Vivos (mesmo idioma do seed-wallet, do
// diário de prática e das celebrações): a demo não tem histórico-base — cada
// sessão de navegador começa "sem rodas ainda". Guarda só metadados, nunca
// conteúdo (a mesma garantia estrutural do engine).
interface CircleSessionState {
  sessions: CircleSession[];
  append: (session: CircleSession) => void;
  reset: () => void;
}

export const useCircleSessions = create<CircleSessionState>()(
  persist(
    (set) => ({
      sessions: [],
      append: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
      reset: () => set({ sessions: [] }),
    }),
    { name: "vitalos-circle-sessions" },
  ),
);
