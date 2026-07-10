import { useEffect, useMemo, useState } from "react";
import {
  getSeedCatalog,
  getSeedEconomyPolicy,
  getSeedEconomyVocabulary,
  getSeedPools,
} from "@/engine/gamification/gamification-engine";
import {
  buildSeedPools,
  donationBudgetRemaining,
  recordSeedDonation,
  recordSeedEarn,
  seedBalance,
  type SeedDonationResult,
  type SeedEarnResult,
  type SeedPoolAggregate,
} from "@/engine/recognition/seed-economy-engine";
import { useSeedWallet } from "@/engine/recognition/seed-economy-store";
import { useSeedWalletSync } from "@/app/identity/useSeedWalletSync";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { supabase } from "@/integrations/supabase/client";
import { loadRealSeedPools } from "@/lib/api/seed-pools.functions";
import { usePack } from "@/engine/pack";
import { MOCK_USER } from "@/mocks/colaborador-mock";
import { GAMIFICATION_TODAY } from "@/mocks/gamification-mock";
import {
  SEED_ECONOMY_COPY,
  SEED_POOL_CONTRIBUTIONS,
  SEED_WALLET_SEED,
} from "@/mocks/seed-economy-mock";

export interface PlantSeedInput {
  recipientId: string;
  itemId: string;
  /** Consentimento de exibir o nome do doador NESTA doação (opt-in por presente). */
  namedVisibility: boolean;
}

/**
 * Sementes Vivas (Academia Viva 2.0 · I1) — composição pack × engine × mock,
 * espelho do use-recognition. A carteira demo = histórico-base determinístico
 * (mock) + delta desta sessão (store). Toda validação é do engine puro.
 */
export function useSeedEconomy() {
  const { gamification } = usePack();
  const sessionEvents = useSeedWallet((state) => state.events);
  const append = useSeedWallet((state) => state.append);

  // Sessão real (I1 real): hidrata a carteira persistida e liga o sync.
  const { isRealSession } = useSeedWalletSync();
  const { org } = useRealOrgSession();

  // Pools coletivos REAIS da org (k-anon no servidor) quando há sessão real.
  const [realPools, setRealPools] = useState<SeedPoolAggregate[]>([]);
  useEffect(() => {
    if (!isRealSession) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token;
      if (!accessToken) return;
      loadRealSeedPools({ data: { accessToken } })
        .then((r) => active && r.available && setRealPools(r.pools))
        .catch(() => {});
    });
    return () => {
      active = false;
    };
  }, [isRealSession, sessionEvents.length]);

  return useMemo(() => {
    const policy = gamification ? getSeedEconomyPolicy(gamification) : null;
    if (!gamification || !policy) {
      return {
        isRealSession,
        policy: null,
        vocabulary: { currencyName: "Sementes", verb: "plantar" },
        catalog: [],
        pools: [],
        balance: 0,
        donationBudget: 0,
        copy: SEED_ECONOMY_COPY,
        events: [],
        plant: (_input: PlantSeedInput): SeedDonationResult | null => null,
        earnFromParticipation: (_kind: string, _sourceId: string): SeedEarnResult | null => null,
      };
    }

    const catalog = getSeedCatalog(gamification);
    const poolDefs = getSeedPools(gamification);
    // Real: SÓ os eventos persistidos da pessoa (nunca compor o mock).
    // Demo: base imutável + delta da sessão — id único protege contra colisão.
    const events = isRealSession ? sessionEvents : [...SEED_WALLET_SEED, ...sessionEvents];
    const donorId = isRealSession && org ? org.userId : MOCK_USER.id;
    const today = isRealSession ? new Date().toISOString().slice(0, 10) : GAMIFICATION_TODAY;

    return {
      isRealSession,
      policy,
      vocabulary: getSeedEconomyVocabulary(gamification),
      catalog,
      // Real: agregados k-anon do servidor. Demo: contribuições mock.
      pools: isRealSession ? realPools : buildSeedPools(SEED_POOL_CONTRIBUTIONS, poolDefs, policy),
      balance: seedBalance(events),
      donationBudget: donationBudgetRemaining(events, today, policy),
      copy: SEED_ECONOMY_COPY,
      events,
      plant: (input: PlantSeedInput): SeedDonationResult => {
        const result = recordSeedDonation(
          events,
          {
            id: `gift:${donorId}:${today}:${sessionEvents.length + 1}:${input.itemId}`,
            channel: "person",
            donorId,
            recipientId: input.recipientId,
            itemId: input.itemId,
            occurredOn: today,
          },
          policy,
          catalog,
        );
        // namedVisibility é metadado de consentimento da UI (padrão privado);
        // no S6.5 vai para recognition_gifts.named_visibility — a demo o exibe
        // mas nunca o persiste (mesmo idioma da mensagem de Kudo).
        if (result.reason === "recorded" && result.event) append(result.event);
        return result;
      },
      earnFromParticipation: (kind: string, sourceId: string): SeedEarnResult => {
        const result = recordSeedEarn(
          events,
          { id: `seed:${sourceId}`, sourceKind: kind, occurredOn: today },
          policy,
        );
        if (result.reason === "recorded" && result.event) append(result.event);
        return result;
      },
    };
  }, [gamification, sessionEvents, append, isRealSession, org, realPools]);
}
