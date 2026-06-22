// Estado da conversa do copiloto — EFÊMERO (em memória, não persistido).
//
// Honestidade/privacidade: a conversa pode conter perguntas sensíveis do usuário.
// Mantemos só na sessão (sobrevive à navegação entre telas, some no reload) — nunca
// vai para localStorage. Threads são por pack: trocar de setor abre uma conversa nova.

import { create } from "zustand";
import type { CopilotTurn } from "@/engine/ai/copilot-engine";
import type { CopilotMessage } from "@/engine/ai/copilot-conversation";

interface CopilotConvState {
  threads: Record<string, CopilotMessage[]>;
  seq: number;
  /** Registra um par pergunta→resposta na thread do pack. */
  ask: (packId: string, userText: string, turn: CopilotTurn) => void;
  /** Limpa a conversa do pack. */
  clear: (packId: string) => void;
}

export const useCopilotConversation = create<CopilotConvState>((set) => ({
  threads: {},
  seq: 0,
  ask: (packId, userText, turn) =>
    set((state) => {
      const prev = state.threads[packId] ?? [];
      const userMsg: CopilotMessage = { id: state.seq, author: "user", text: userText };
      const botMsg: CopilotMessage = { id: state.seq + 1, author: "copilot", turn };
      return {
        seq: state.seq + 2,
        threads: { ...state.threads, [packId]: [...prev, userMsg, botMsg] },
      };
    }),
  clear: (packId) => set((state) => ({ threads: { ...state.threads, [packId]: [] } })),
}));
