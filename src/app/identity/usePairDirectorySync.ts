// Liga o diretório consentido de colegas à sessão real (Academia Viva 2.0 I6
// real) — demo segue 100% com MOCK_COLLEAGUES/PAIR_CANDIDATES, por design.
// Diferente do Diário/Sementes (sync silencioso), aqui a hidratação carrega
// DOIS sinais: a própria entrada (para saber se a pessoa já optou por
// entrar) e o diretório da org (para sugerir colegas reais).

import { useCallback, useEffect, useState } from "react";
import { useRealOrgSession } from "./useRealOrgSession";
import type { PairProfile } from "@/engine/learning/practice-pair-engine";

export interface PairDirectoryState {
  isRealSession: boolean;
  /** A própria entrada, se a pessoa já optou por entrar. null = ainda não entrou. */
  ownEntry: PairProfile | null;
  /** Colegas visíveis da mesma org (nunca inclui a própria pessoa). */
  directory: PairProfile[];
  loading: boolean;
  joinDirectory: (profile: PairProfile) => Promise<boolean>;
  leaveDirectory: () => Promise<boolean>;
}

export function usePairDirectorySync(): PairDirectoryState {
  const { org } = useRealOrgSession();
  const [ownEntry, setOwnEntry] = useState<PairProfile | null>(null);
  const [directory, setDirectory] = useState<PairProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    try {
      const { loadOwnDirectoryEntry, loadOrgDirectory } = await import(
        "@/lib/cloud/pair-directory-adapter"
      );
      const [own, others] = await Promise.all([
        loadOwnDirectoryEntry(org.userId),
        loadOrgDirectory(org.userId),
      ]);
      setOwnEntry(own);
      setDirectory(others);
    } catch {
      // best-effort: sem backend, segue sem diretório (nunca quebra a tela).
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => {
    if (org) reload();
  }, [org, reload]);

  const joinDirectory = useCallback(
    async (profile: PairProfile) => {
      if (!org) return false;
      const { upsertOwnDirectoryEntry } = await import("@/lib/cloud/pair-directory-adapter");
      const ok = await upsertOwnDirectoryEntry(org.userId, org.orgId, profile);
      if (ok) await reload();
      return ok;
    },
    [org, reload],
  );

  const leaveDirectoryFn = useCallback(async () => {
    if (!org) return false;
    const { leaveDirectory } = await import("@/lib/cloud/pair-directory-adapter");
    const ok = await leaveDirectory(org.userId);
    if (ok) setOwnEntry(null);
    return ok;
  }, [org]);

  return {
    isRealSession: !!org,
    ownEntry,
    directory,
    loading,
    joinDirectory,
    leaveDirectory: leaveDirectoryFn,
  };
}
