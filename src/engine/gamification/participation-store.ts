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
  /**
   * Sessão real detectada (Sprint S5, ver useParticipationSync) — quando
   * definido, todo evento NOVO também é persistido no Supabase
   * (fire-and-forget, best-effort). null = demo/sem sessão: comportamento
   * 100% efêmero de sempre, inalterado.
   */
  syncUserId: string | null;
  record: (
    request: ParticipationEventRequest,
    awardRules: readonly ParticipationAwardRule[],
    antiGaming: AntiGamingRules,
  ) => ParticipationRecordResult;
  reset: () => void;
  setSyncUserId: (userId: string | null) => void;
  /** Substitui o estado local pelos eventos já persistidos — hidratação inicial de sessão real. */
  hydrate: (events: ParticipationLedgerEvent[]) => void;
}

export const useParticipationLedger = create<ParticipationLedgerState>()(
  persist(
    (set, get) => ({
      events: [],
      syncUserId: null,
      record: (request, awardRules, antiGaming) => {
        const result = recordParticipationEvent(get().events, request, awardRules, antiGaming);
        if (result.reason === "recorded" || result.reason === "recorded_capped") {
          set({ events: result.events });

          const userId = get().syncUserId;
          if (userId && result.event) {
            // Import dinâmico: a camada engine/gamification não depende de
            // cloud/Supabase por padrão — só toca a rede quando uma sessão
            // real de fato pediu sincronização.
            import("@/lib/cloud/learning-adapter").then(({ saveParticipationEvent }) => {
              saveParticipationEvent(userId, result.event!).catch(() => {
                // best-effort: falha de rede não deve quebrar a experiência local.
              });
            });
          }
        }
        return result;
      },
      reset: () => set({ events: [] }),
      setSyncUserId: (userId) => set({ syncUserId: userId }),
      hydrate: (events) => set({ events }),
    }),
    {
      name: "vitalos-participation-ledger",
      // syncUserId nunca persiste em localStorage — é sempre derivado de novo
      // da sessão real a cada carregamento (evita "vazar" sincronização de
      // uma conta pra outra no mesmo navegador).
      partialize: (s) => ({ events: s.events }),
    },
  ),
);
