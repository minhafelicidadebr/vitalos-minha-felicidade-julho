// Círculos Vivos reais (I5) — liga o registro de rodas à persistência real
// quando há sessão real. Demo segue 100% efêmera (store local). Mesmo idioma
// dos outros syncs da Academia (usePracticeJournalSync/useSeedWalletSync).

import { useCallback, useEffect, useState } from "react";
import { useRealOrgSession } from "./useRealOrgSession";
import type { CircleSession } from "@/engine/embaixadorias/circle-engine";

export interface CircleSessionsSyncState {
  isRealSession: boolean;
  orgSessions: CircleSession[];
  /** Persiste uma roda JÁ validada; devolve o id real e recarrega. */
  persist: (session: Omit<CircleSession, "facilitatorId">) => Promise<boolean>;
}

export function useCircleSessionsSync(): CircleSessionsSyncState {
  const { org } = useRealOrgSession();
  const [orgSessions, setOrgSessions] = useState<CircleSession[]>([]);

  const reload = useCallback(async () => {
    if (!org) return;
    const { loadOrgCircleSessions } = await import("@/lib/cloud/circle-sessions-adapter");
    try {
      setOrgSessions(await loadOrgCircleSessions());
    } catch {
      // best-effort: sem backend, a seção segue sem rodas (nunca quebra).
    }
  }, [org]);

  useEffect(() => {
    if (org) reload();
  }, [org, reload]);

  const persist = useCallback(
    async (session: Omit<CircleSession, "facilitatorId">) => {
      if (!org) return false;
      const { saveCircleSession } = await import("@/lib/cloud/circle-sessions-adapter");
      const { savedId } = await saveCircleSession(org.orgId, org.userId, session);
      if (savedId) await reload();
      return !!savedId;
    },
    [org, reload],
  );

  return { isRealSession: !!org, orgSessions, persist };
}
