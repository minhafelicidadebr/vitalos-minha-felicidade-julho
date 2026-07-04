import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SeedWalletEvent } from "./seed-economy-engine";

// Delta de sessão da carteira de Sementes. O histórico-base demonstrativo vive
// no mock (SEED_WALLET_SEED, imutável); aqui só entram os eventos que a pessoa
// gera nesta sessão. Quem valida (saldo, orçamento, no-self...) é o engine puro
// — o hook compõe base+delta e só faz append do evento já validado.
interface SeedWalletState {
  events: SeedWalletEvent[];
  append: (event: SeedWalletEvent) => void;
  reset: () => void;
}

export const useSeedWallet = create<SeedWalletState>()(
  persist(
    (set) => ({
      events: [],
      append: (event) => set((state) => ({ events: [...state.events, event] })),
      reset: () => set({ events: [] }),
    }),
    { name: "vitalos-seed-wallet" },
  ),
);
