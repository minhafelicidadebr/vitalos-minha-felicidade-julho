import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SeedWalletEvent } from "./seed-economy-engine";

// Delta de sessão da carteira de Sementes. O histórico-base demonstrativo vive
// no mock (SEED_WALLET_SEED, imutável); aqui só entram os eventos que a pessoa
// gera nesta sessão. Quem valida (saldo, orçamento, no-self...) é o engine puro
// — o hook compõe base+delta e só faz append do evento já validado.
//
// Sessão REAL (I1 real, mesmo padrão do practice-journal-store): quando
// syncContext está definido, cada evento novo também persiste no Supabase
// (fire-and-forget) e a hidratação substitui o delta pelos eventos já salvos.
interface SeedSyncContext {
  userId: string;
  orgId: string;
}

interface SeedWalletState {
  events: SeedWalletEvent[];
  syncContext: SeedSyncContext | null;
  append: (event: SeedWalletEvent) => void;
  reset: () => void;
  setSyncContext: (context: SeedSyncContext | null) => void;
  hydrate: (events: SeedWalletEvent[]) => void;
}

export const useSeedWallet = create<SeedWalletState>()(
  persist(
    (set, get) => ({
      events: [],
      syncContext: null,
      append: (event) => {
        set((state) => ({ events: [...state.events, event] }));

        const context = get().syncContext;
        if (context) {
          import("@/lib/cloud/seed-wallet-adapter").then(({ saveSeedEvent }) => {
            saveSeedEvent(context.userId, context.orgId, event)
              .then(({ savedId }) => {
                if (!savedId) return;
                set((state) => ({
                  events: state.events.map((e) => (e.id === event.id ? { ...e, id: savedId } : e)),
                }));
              })
              .catch(() => {
                // best-effort: falha de rede não quebra a experiência local.
              });
          });
        }
      },
      reset: () => set({ events: [] }),
      setSyncContext: (context) => set({ syncContext: context }),
      hydrate: (events) => set({ events }),
    }),
    {
      name: "vitalos-seed-wallet",
      // syncContext nunca persiste — derivado da sessão real a cada load.
      partialize: (s) => ({ events: s.events }),
    },
  ),
);
