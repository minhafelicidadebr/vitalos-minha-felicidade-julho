import { useMemo } from "react";
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
} from "@/engine/recognition/seed-economy-engine";
import { useSeedWallet } from "@/engine/recognition/seed-economy-store";
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

  return useMemo(() => {
    const policy = gamification ? getSeedEconomyPolicy(gamification) : null;
    if (!gamification || !policy) {
      return {
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
    // Base imutável + delta da sessão — o id único protege contra colisão.
    const events = [...SEED_WALLET_SEED, ...sessionEvents];

    return {
      policy,
      vocabulary: getSeedEconomyVocabulary(gamification),
      catalog,
      pools: buildSeedPools(SEED_POOL_CONTRIBUTIONS, poolDefs, policy),
      balance: seedBalance(events),
      donationBudget: donationBudgetRemaining(events, GAMIFICATION_TODAY, policy),
      copy: SEED_ECONOMY_COPY,
      events,
      plant: (input: PlantSeedInput): SeedDonationResult => {
        const result = recordSeedDonation(
          events,
          {
            id: `gift:${MOCK_USER.id}:${GAMIFICATION_TODAY}:${sessionEvents.length + 1}:${input.itemId}`,
            channel: "person",
            donorId: MOCK_USER.id,
            recipientId: input.recipientId,
            itemId: input.itemId,
            occurredOn: GAMIFICATION_TODAY,
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
          { id: `seed:${sourceId}`, sourceKind: kind, occurredOn: GAMIFICATION_TODAY },
          policy,
        );
        if (result.reason === "recorded" && result.event) append(result.event);
        return result;
      },
    };
  }, [gamification, sessionEvents, append]);
}
