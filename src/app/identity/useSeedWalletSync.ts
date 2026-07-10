// Liga a carteira de Sementes à persistência real quando existe uma sessão
// real (Academia Viva 2.0 I1 real) — demo segue 100% efêmera, por design.
// Mesmo idioma do usePracticeJournalSync/useParticipationSync.

import { useEffect, useRef } from "react";
import { useRealOrgSession } from "./useRealOrgSession";
import { useSeedWallet } from "@/engine/recognition/seed-economy-store";

export function useSeedWalletSync(): { isRealSession: boolean } {
  const { org } = useRealOrgSession();
  const setSyncContext = useSeedWallet((s) => s.setSyncContext);
  const hydrate = useSeedWallet((s) => s.hydrate);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    const context = org ? { userId: org.userId, orgId: org.orgId } : null;
    setSyncContext(context);
    if (!context || hydratedFor.current === context.userId) return;

    hydratedFor.current = context.userId;
    import("@/lib/cloud/seed-wallet-adapter").then(({ loadOwnSeedEvents }) => {
      loadOwnSeedEvents(context.userId)
        .then(hydrate)
        .catch(() => {
          // best-effort: sem backend, segue no que já está local.
        });
    });
  }, [org, setSyncContext, hydrate]);

  return { isRealSession: !!org };
}
