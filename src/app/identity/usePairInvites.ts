// Convites e dupla ativa da pessoa (I6 real, fase 2) — sessão real apenas.
// Mesmo idioma dos hooks irmãos (usePairDirectorySync): estado local +
// reload após cada ação; toda validação de estado vive nas RPCs do banco.

import { useCallback, useEffect, useState } from "react";
import { useRealOrgSession } from "./useRealOrgSession";
import type { PairInvite, RealPair } from "@/lib/cloud/pair-invite-adapter";

export interface PairInvitesState {
  invitesReceived: PairInvite[];
  invitesSent: PairInvite[];
  activePair: RealPair | null;
  loading: boolean;
  invite: (toUser: string, focusDriverId: string) => Promise<{ sent: boolean; reason?: string }>;
  accept: (inviteId: string) => Promise<{ accepted: boolean; reason?: string }>;
  decline: (inviteId: string) => Promise<boolean>;
  cancel: (inviteId: string) => Promise<boolean>;
}

export function usePairInvites(): PairInvitesState {
  const { org } = useRealOrgSession();
  const [invitesReceived, setInvitesReceived] = useState<PairInvite[]>([]);
  const [invitesSent, setInvitesSent] = useState<PairInvite[]>([]);
  const [activePair, setActivePair] = useState<RealPair | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    try {
      const { loadMyPendingInvites, loadMyActivePair } = await import(
        "@/lib/cloud/pair-invite-adapter"
      );
      const [invites, pair] = await Promise.all([loadMyPendingInvites(), loadMyActivePair()]);
      setInvitesReceived(invites.filter((i) => i.toUser === org.userId));
      setInvitesSent(invites.filter((i) => i.fromUser === org.userId));
      setActivePair(pair);
    } catch {
      // best-effort: sem backend, a seção segue sem convites (nunca quebra).
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => {
    if (org) reload();
  }, [org, reload]);

  const invite = useCallback(
    async (toUser: string, focusDriverId: string) => {
      if (!org) return { sent: false, reason: "no_session" };
      const { sendPairInvite } = await import("@/lib/cloud/pair-invite-adapter");
      const result = await sendPairInvite(org.orgId, org.userId, toUser, focusDriverId);
      if (result.sent) await reload();
      return result;
    },
    [org, reload],
  );

  const accept = useCallback(
    async (inviteId: string) => {
      const { acceptPairInvite } = await import("@/lib/cloud/pair-invite-adapter");
      const result = await acceptPairInvite(inviteId);
      await reload();
      return result;
    },
    [reload],
  );

  const decline = useCallback(
    async (inviteId: string) => {
      const { declinePairInvite } = await import("@/lib/cloud/pair-invite-adapter");
      const ok = await declinePairInvite(inviteId);
      if (ok) await reload();
      return ok;
    },
    [reload],
  );

  const cancel = useCallback(
    async (inviteId: string) => {
      const { cancelPairInvite } = await import("@/lib/cloud/pair-invite-adapter");
      const ok = await cancelPairInvite(inviteId);
      if (ok) await reload();
      return ok;
    },
    [reload],
  );

  return { invitesReceived, invitesSent, activePair, loading, invite, accept, decline, cancel };
}
