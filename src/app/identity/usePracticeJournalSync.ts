// Liga o Diário de Prática à persistência real quando existe uma sessão real
// (Academia Viva 2.0 I7 real) — para exploradores de demo, nada muda: o diário
// continua 100% efêmero em Zustand/localStorage, por design.
//
// Mesmo idioma do useParticipationSync (S5): usado uma vez em /diario;
// qualquer outra tela que já leia usePracticeJournal (Diploma Vivo, Loop
// Vivo) ganha os registros reais de graça — a composição acontece no store.

import { useEffect, useRef } from "react";
import { useRealOrgSession } from "./useRealOrgSession";
import { usePracticeJournal } from "@/engine/learning/practice-journal-store";

export function usePracticeJournalSync(): { isRealSession: boolean } {
  const { org } = useRealOrgSession();
  const setSyncContext = usePracticeJournal((s) => s.setSyncContext);
  const hydrate = usePracticeJournal((s) => s.hydrate);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    const context = org ? { userId: org.userId, orgId: org.orgId } : null;
    setSyncContext(context);
    if (!context || hydratedFor.current === context.userId) return;

    hydratedFor.current = context.userId;
    import("@/lib/cloud/practice-journal-adapter").then(({ loadOwnPracticeEntries }) => {
      loadOwnPracticeEntries(context.userId)
        .then((entries) => {
          // Mesma nota de honestidade do useParticipationSync: registro criado
          // na janela entre montar e hidratar pode piscar localmente (já
          // persistiu no banco de qualquer forma). Risco aceito — diário
          // pessoal, nunca dado de segurança.
          hydrate(entries);
        })
        .catch(() => {
          // best-effort: sem backend disponível, segue no que já está local.
        });
    });
  }, [org, setSyncContext, hydrate]);

  return { isRealSession: !!org };
}
