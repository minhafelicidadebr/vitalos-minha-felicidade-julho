import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PracticeEntry } from "./practice-journal-engine";

// Delta de sessão do Diário de Prática (mesmo idioma do seed-economy-store):
// a base demonstrativa vive no mock (imutável); aqui só entram os registros que
// a pessoa cria nesta sessão. Quem valida (dedupe, tipo habilitado, limite) é o
// engine puro — o hook compõe base+delta e só faz append do registro já validado.
//
// Sessão REAL (Academia Viva 2.0 I7 real, padrão S5): quando syncContext está
// definido, cada registro novo também persiste no Supabase (fire-and-forget,
// best-effort) e a hidratação inicial substitui o delta local pelos registros
// já salvos da pessoa. null = demo: 100% efêmero, inalterado.
interface PracticeSyncContext {
  userId: string;
  orgId: string;
}

interface PracticeJournalState {
  entries: PracticeEntry[];
  syncContext: PracticeSyncContext | null;
  append: (entry: PracticeEntry) => void;
  reset: () => void;
  setSyncContext: (context: PracticeSyncContext | null) => void;
  /** Substitui o delta local pelos registros já persistidos — hidratação de sessão real. */
  hydrate: (entries: PracticeEntry[]) => void;
}

export const usePracticeJournal = create<PracticeJournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      syncContext: null,
      append: (entry) => {
        set((state) => ({ entries: [...state.entries, entry] }));

        const context = get().syncContext;
        if (context) {
          // Import dinâmico: engine/learning não depende de cloud por padrão —
          // só toca a rede quando uma sessão real pediu sincronização.
          import("@/lib/cloud/practice-journal-adapter").then(({ savePracticeEntry }) => {
            savePracticeEntry(context.userId, context.orgId, entry)
              .then(({ savedId }) => {
                if (!savedId) return;
                // Troca o id local pelo uuid REAL do banco — o registro
                // hidratado em sessões futuras é o mesmo objeto, sem duplicar.
                set((state) => ({
                  entries: state.entries.map((e) =>
                    e.id === entry.id ? { ...e, id: savedId } : e,
                  ),
                }));
              })
              .catch(() => {
                // best-effort: falha de rede não quebra a experiência local.
              });
          });
        }
      },
      reset: () => set({ entries: [] }),
      setSyncContext: (context) => set({ syncContext: context }),
      hydrate: (entries) => set({ entries }),
    }),
    {
      name: "vitalos-practice-journal",
      // syncContext nunca persiste em localStorage — derivado da sessão real a
      // cada carregamento (evita vazar sincronização entre contas no browser).
      partialize: (s) => ({ entries: s.entries }),
    },
  ),
);
