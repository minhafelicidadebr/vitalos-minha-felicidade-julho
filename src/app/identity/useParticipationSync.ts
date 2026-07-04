// Liga o ledger de participação (XP/badges) à persistência real quando existe
// uma sessão real (Sprint S5) — para exploradores de demo, nada muda: o
// ledger continua 100% efêmero em Zustand/localStorage, por design.
//
// Usado uma vez em /academia (hoje o único consumidor real do ledger fora do
// fluxo de resposta a pesquisas) — qualquer outra tela que já chame
// useParticipationLedger ganha sincronização de graça, sem precisar mudar
// nada: o merge acontece no próprio store.

import { useEffect, useRef } from "react";
import { useRealOrgSession } from "./useRealOrgSession";
import { useParticipationLedger } from "@/engine/gamification/participation-store";

export function useParticipationSync(): void {
  const { org } = useRealOrgSession();
  const setSyncUserId = useParticipationLedger((s) => s.setSyncUserId);
  const hydrate = useParticipationLedger((s) => s.hydrate);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    const userId = org?.userId ?? null;
    setSyncUserId(userId);
    if (!userId || hydratedFor.current === userId) return;

    hydratedFor.current = userId;
    import("@/lib/cloud/learning-adapter").then(({ loadParticipationEvents }) => {
      loadParticipationEvents(userId)
        .then((events) => {
          // Nota de honestidade: se o usuário registrar um evento no instante
          // entre montar esta tela e esta hidratação terminar, esta chamada
          // pode sobrescrevê-lo localmente (o evento já persistiu no banco de
          // qualquer forma — só o reflexo imediato na UI pode piscar). Risco
          // aceito por ser de baixíssima gravidade (XP motivacional, nunca
          // dado de segurança) e por uma janela de corrida maior exigir
          // reconciliação por timestamp que este recurso não justifica ainda.
          hydrate(events);
        })
        .catch(() => {
          // best-effort: sem backend disponível, segue no que já está local.
        });
    });
  }, [org?.userId, setSyncUserId, hydrate]);
}
