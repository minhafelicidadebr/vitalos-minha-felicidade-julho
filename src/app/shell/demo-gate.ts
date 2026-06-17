// Portão de demonstração (mock-first).
//
// HONESTIDADE (doutrina Fable 5): isto NÃO é autenticação. A senha vive no cliente
// apenas para manter visitantes casuais fora do demo navegável — é o "cordão de veludo"
// do palco, não um cofre. Não há dado individual no cliente (k-anon ≥ 5, só agregados),
// então não há o que proteger além do acesso à navegação. Autenticação real
// (Lovable Cloud / RLS por tenant) é Fase 2 — ver HANDOVER_OPUS48.md §8, Sprint 8.

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Senha do demo. Trocar aqui é a fonte única. */
export const DEMO_PASSWORD = "luzpazeamor";

/** Verificação pura (testável sem store): tolerante a espaços e caixa. */
export function checkDemoPassword(input: string): boolean {
  return input.trim().toLowerCase() === DEMO_PASSWORD;
}

interface DemoGateState {
  unlocked: boolean;
  /** True após a rehidratação do localStorage — evita flash do portão p/ quem já entrou. */
  hasHydrated: boolean;
  /** Tenta destravar; retorna se a senha estava correta. */
  unlock: (password: string) => boolean;
  lock: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useDemoGate = create<DemoGateState>()(
  persist(
    (set) => ({
      unlocked: false,
      hasHydrated: false,
      unlock: (password) => {
        const ok = checkDemoPassword(password);
        if (ok) set({ unlocked: true });
        return ok;
      },
      lock: () => set({ unlocked: false }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "vita-demo-gate",
      // Só o estado de acesso persiste — hasHydrated é sempre derivado em runtime.
      partialize: (s) => ({ unlocked: s.unlocked }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
