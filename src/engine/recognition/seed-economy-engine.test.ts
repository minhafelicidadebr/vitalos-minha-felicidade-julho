import { describe, expect, test } from "bun:test";
import {
  buildSeedPools,
  donationBudgetRemaining,
  recordSeedDonation,
  recordSeedEarn,
  seedBalance,
  weeklySeedsEarned,
  type SeedCatalogItem,
  type SeedEconomyPolicy,
  type SeedPoolDef,
  type SeedWalletEvent,
} from "./seed-economy-engine";

const POLICY: SeedEconomyPolicy = {
  earning: { pulse_completed: 2, kudo_sent: 1, mission_evidence: 3 },
  weeklyEarnCap: 6,
  weeklyDonationBudget: 2,
  kAnonymityMin: 5,
};

const CATALOG: SeedCatalogItem[] = [
  { id: "carvalho", name: "Semente de Carvalho", emoji: "🌳", cost: 5, meaning: "sustentação" },
  { id: "girassol", name: "Semente de Girassol", emoji: "🌻", cost: 3, meaning: "energia" },
];

// Semana determinística: 2026-07-01 é quarta; 2026-07-06 é a segunda seguinte.
const WED = "2026-07-01";
const NEXT_MON = "2026-07-06";

function earned(id: string, amount: number, occurredOn = WED): SeedWalletEvent {
  return { id, kind: "earned", amount, sourceKind: "pulse_completed", occurredOn };
}

describe("seed-economy — ganho (derivado do ledger, nunca torneira nova)", () => {
  test("kind configurado no pack gera sementes; o valor vem da config, nunca do engine", () => {
    const result = recordSeedEarn([], { id: "e1", sourceKind: "mission_evidence", occurredOn: WED }, POLICY);
    expect(result.reason).toBe("recorded");
    expect(result.event?.amount).toBe(3);
    expect(result.balance).toBe(3);
  });

  test("kind fora da config → no_rule (nenhum evento criado)", () => {
    const result = recordSeedEarn([], { id: "e1", sourceKind: "invented_kind", occurredOn: WED }, POLICY);
    expect(result.reason).toBe("no_rule");
    expect(result.events).toHaveLength(0);
  });

  test("id repetido → duplicate (proteção contra replay do mesmo evento do ledger)", () => {
    const first = recordSeedEarn([], { id: "e1", sourceKind: "kudo_sent", occurredOn: WED }, POLICY);
    const replay = recordSeedEarn(first.events, { id: "e1", sourceKind: "kudo_sent", occurredOn: WED }, POLICY);
    expect(replay.reason).toBe("duplicate");
    expect(replay.events).toHaveLength(1);
  });

  test("teto semanal corta PARCIALMENTE com flag capped (honesto, não silencioso)", () => {
    // 5 já ganhas na semana; mission_evidence renderia 3, mas só cabe 1.
    const existing = [earned("e1", 5)];
    const result = recordSeedEarn(existing, { id: "e2", sourceKind: "mission_evidence", occurredOn: WED }, POLICY);
    expect(result.reason).toBe("recorded");
    expect(result.event?.amount).toBe(1);
    expect(result.capped).toBe(true);
  });

  test("teto semanal esgotado → cap_reached, nenhum evento de valor zero é criado", () => {
    const existing = [earned("e1", 6)];
    const result = recordSeedEarn(existing, { id: "e2", sourceKind: "kudo_sent", occurredOn: WED }, POLICY);
    expect(result.reason).toBe("cap_reached");
    expect(result.events).toHaveLength(1);
  });

  test("a semana vira na segunda-feira: o teto reseta (mesma chave do recognition-engine)", () => {
    const existing = [earned("e1", 6, WED)];
    const result = recordSeedEarn(existing, { id: "e2", sourceKind: "kudo_sent", occurredOn: NEXT_MON }, POLICY);
    expect(result.reason).toBe("recorded");
    expect(weeklySeedsEarned(result.events, NEXT_MON)).toBe(1);
  });

  test("request sem id ou sem sourceKind → invalid_request", () => {
    expect(recordSeedEarn([], { id: " ", sourceKind: "kudo_sent", occurredOn: WED }, POLICY).reason).toBe("invalid_request");
    expect(recordSeedEarn([], { id: "e1", sourceKind: "", occurredOn: WED }, POLICY).reason).toBe("invalid_request");
  });
});

describe("seed-economy — saldo (fold puro, event sourcing)", () => {
  test("earned soma, doações subtraem — determinístico sobre a mesma lista", () => {
    const events: SeedWalletEvent[] = [
      earned("e1", 6),
      { id: "d1", kind: "donated_person", amount: 3, itemId: "girassol", recipientId: "ana", occurredOn: WED },
      { id: "d2", kind: "donated_team", amount: 2, poolId: "pomar", occurredOn: WED },
    ];
    expect(seedBalance(events)).toBe(1);
    expect(seedBalance(events)).toBe(seedBalance([...events])); // sem estado escondido
  });
});

describe("seed-economy — doação a colega (canal person)", () => {
  const WALLET = [earned("e1", 6)];

  test("doação válida debita o custo do item e registra destinatário", () => {
    const result = recordSeedDonation(
      WALLET,
      { id: "d1", channel: "person", donorId: "eu", recipientId: "ana", itemId: "girassol", occurredOn: WED },
      POLICY,
      CATALOG,
    );
    expect(result.reason).toBe("recorded");
    expect(result.balance).toBe(3);
    expect(result.event).toMatchObject({ kind: "donated_person", amount: 3, recipientId: "ana" });
  });

  test("plantar para si mesmo → self_donation (reconhecimento é relacional)", () => {
    const result = recordSeedDonation(
      WALLET,
      { id: "d1", channel: "person", donorId: "eu", recipientId: "eu", itemId: "girassol", occurredOn: WED },
      POLICY,
      CATALOG,
    );
    expect(result.reason).toBe("self_donation");
  });

  test("item fora do catálogo do pack → unknown_item", () => {
    const result = recordSeedDonation(
      WALLET,
      { id: "d1", channel: "person", donorId: "eu", recipientId: "ana", itemId: "orquidea", occurredOn: WED },
      POLICY,
      CATALOG,
    );
    expect(result.reason).toBe("unknown_item");
  });

  test("saldo insuficiente → insufficient_balance (carteira nunca fica negativa)", () => {
    const poor = [earned("e1", 2)];
    const result = recordSeedDonation(
      poor,
      { id: "d1", channel: "person", donorId: "eu", recipientId: "ana", itemId: "carvalho", occurredOn: WED },
      POLICY,
      CATALOG,
    );
    expect(result.reason).toBe("insufficient_balance");
    expect(result.balance).toBe(2);
  });

  test("orçamento semanal de doação esgota após N doações — mistura de canais conta junto", () => {
    let events: readonly SeedWalletEvent[] = [earned("e1", 6)];
    const r1 = recordSeedDonation(events, { id: "d1", channel: "person", donorId: "eu", recipientId: "ana", itemId: "girassol", occurredOn: WED }, POLICY, CATALOG);
    events = r1.events;
    const r2 = recordSeedDonation(events, { id: "d2", channel: "team", donorId: "eu", poolId: "pomar", amount: 1, occurredOn: WED }, POLICY, CATALOG);
    events = r2.events;
    expect(r2.remainingDonationBudget).toBe(0);
    const r3 = recordSeedDonation(events, { id: "d3", channel: "person", donorId: "eu", recipientId: "bia", itemId: "girassol", occurredOn: WED }, POLICY, CATALOG);
    expect(r3.reason).toBe("budget_exhausted");
  });

  test("o orçamento de doação reabre na semana seguinte", () => {
    const events: SeedWalletEvent[] = [
      earned("e1", 6),
      { id: "d1", kind: "donated_person", amount: 3, itemId: "girassol", recipientId: "ana", occurredOn: WED },
      { id: "d2", kind: "donated_team", amount: 1, poolId: "pomar", occurredOn: WED },
    ];
    expect(donationBudgetRemaining(events, WED, POLICY)).toBe(0);
    expect(donationBudgetRemaining(events, NEXT_MON, POLICY)).toBe(2);
  });

  test("id de doação repetido → duplicate", () => {
    const r1 = recordSeedDonation(WALLET, { id: "d1", channel: "person", donorId: "eu", recipientId: "ana", itemId: "girassol", occurredOn: WED }, POLICY, CATALOG);
    const r2 = recordSeedDonation(r1.events, { id: "d1", channel: "person", donorId: "eu", recipientId: "bia", itemId: "girassol", occurredOn: WED }, POLICY, CATALOG);
    expect(r2.reason).toBe("duplicate");
  });

  test("INVARIANTE SDT: doar não rende NADA de volta — nenhum evento earned nasce da doação e o resultado não tem campo de XP", () => {
    const result = recordSeedDonation(
      WALLET,
      { id: "d1", channel: "person", donorId: "eu", recipientId: "ana", itemId: "girassol", occurredOn: WED },
      POLICY,
      CATALOG,
    );
    expect(result.events.filter((e) => e.kind === "earned")).toHaveLength(1); // só o ganho original
    expect("xp" in result).toBe(false);
    expect("xpAwarded" in (result.event ?? {})).toBe(false);
  });
});

describe("seed-economy — pools coletivos (team/cause)", () => {
  const POOLS: SeedPoolDef[] = [
    { id: "pomar", name: "Pomar da Equipe", channel: "team" },
    { id: "bosque", name: "Bosque do Bem-Comum", channel: "cause", target: 100 },
  ];

  test("contribuição a pool exige quantia positiva e poolId", () => {
    const wallet = [earned("e1", 6)];
    expect(recordSeedDonation(wallet, { id: "d1", channel: "team", donorId: "eu", poolId: "pomar", amount: 0, occurredOn: WED }, POLICY, CATALOG).reason).toBe("invalid_request");
    expect(recordSeedDonation(wallet, { id: "d1", channel: "cause", donorId: "eu", amount: 2, occurredOn: WED }, POLICY, CATALOG).reason).toBe("invalid_request");
  });

  test("pool abaixo de k contribuintes fica PROTEGIDO (visible=false) — k-anon no engine, não na UI", () => {
    const contributions = [
      { poolId: "pomar", contributorId: "a", amount: 2 },
      { poolId: "pomar", contributorId: "b", amount: 1 },
      { poolId: "pomar", contributorId: "a", amount: 3 }, // mesma pessoa não conta 2×
    ];
    const [pomar] = buildSeedPools(contributions, POOLS, POLICY);
    expect(pomar!.uniqueContributors).toBe(2);
    expect(pomar!.visible).toBe(false);
    expect(pomar!.total).toBe(6); // o total agrega mesmo protegido — quem decide exibir é a UI via visible
  });

  test("pool com k contribuintes únicos fica visível e soma corretamente", () => {
    const contributions = ["a", "b", "c", "d", "e"].map((who, i) => ({
      poolId: "bosque",
      contributorId: who,
      amount: i + 1, // 1+2+3+4+5 = 15
    }));
    const bosque = buildSeedPools(contributions, POOLS, POLICY)[1]!;
    expect(bosque.visible).toBe(true);
    expect(bosque.total).toBe(15);
    expect(bosque.pctOfTarget).toBe(15);
  });

  test("pool acima da meta clampa em 100% (nunca promete além do declarado)", () => {
    const contributions = ["a", "b", "c", "d", "e"].map((who) => ({
      poolId: "bosque",
      contributorId: who,
      amount: 30, // 150 > 100
    }));
    const bosque = buildSeedPools(contributions, POOLS, POLICY)[1]!;
    expect(bosque.pctOfTarget).toBe(100);
  });

  test("pool sem meta reporta pctOfTarget=null (team não tem meta por padrão)", () => {
    const [pomar] = buildSeedPools([{ poolId: "pomar", contributorId: "a", amount: 1 }], POOLS, POLICY);
    expect(pomar!.target).toBeNull();
    expect(pomar!.pctOfTarget).toBeNull();
  });

  test("contribuições de valor não-positivo são ignoradas no agregado", () => {
    const [pomar] = buildSeedPools(
      [
        { poolId: "pomar", contributorId: "a", amount: 5 },
        { poolId: "pomar", contributorId: "b", amount: 0 },
        { poolId: "pomar", contributorId: "c", amount: -3 },
      ],
      POOLS,
      POLICY,
    );
    expect(pomar!.total).toBe(5);
    expect(pomar!.uniqueContributors).toBe(1);
  });
});
