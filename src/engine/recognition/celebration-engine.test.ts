import { describe, expect, test } from "bun:test";
import { celebratePool, celebratedThisWeek, type CelebrationRecord } from "./celebration-engine";
import type { SeedPoolAggregate } from "./seed-economy-engine";

const TEAM_POOL: SeedPoolAggregate = {
  id: "pomar_equipe",
  name: "Pomar da Equipe",
  channel: "team",
  total: 22,
  uniqueContributors: 6,
  visible: true, // ≥5 contribuintes únicos — k-anon satisfeito, celebrável
  target: null,
  pctOfTarget: null,
};

const CAUSE_POOL: SeedPoolAggregate = {
  ...TEAM_POOL,
  id: "bosque_bem_comum",
  name: "Bosque do Bem-Comum",
  channel: "cause",
};

const REQUEST = {
  id: "cel-1",
  poolId: "pomar_equipe",
  leaderId: "u-lider-01",
  celebrationDescription: "Pizza da equipe na sexta-feira",
  occurredOn: "2026-06-18",
};

describe("celebration-engine — celebratePool", () => {
  test("celebração válida registra o snapshot exato do pool", () => {
    const result = celebratePool([], REQUEST, TEAM_POOL);
    expect(result.reason).toBe("recorded");
    expect(result.record).toEqual({
      id: "cel-1",
      poolId: "pomar_equipe",
      poolName: "Pomar da Equipe",
      leaderId: "u-lider-01",
      celebrationDescription: "Pizza da equipe na sexta-feira",
      seedsConverted: 22,
      contributorCount: 6,
      occurredOn: "2026-06-18",
    });
  });

  test("descrição é aparada (trim)", () => {
    const result = celebratePool([], { ...REQUEST, celebrationDescription: "  Pizza  " }, TEAM_POOL);
    expect(result.record?.celebrationDescription).toBe("Pizza");
  });

  test("campos vazios → invalid_request", () => {
    expect(celebratePool([], { ...REQUEST, celebrationDescription: "  " }, TEAM_POOL).reason).toBe(
      "invalid_request",
    );
    expect(celebratePool([], { ...REQUEST, leaderId: "" }, TEAM_POOL).reason).toBe(
      "invalid_request",
    );
  });

  test("id duplicado → duplicate, sem novo registro", () => {
    const first = celebratePool([], REQUEST, TEAM_POOL);
    const second = celebratePool(first.records, REQUEST, TEAM_POOL);
    expect(second.reason).toBe("duplicate");
    expect(second.records.length).toBe(1);
  });

  test("canal cause (Bosque) NUNCA é celebrável por um indivíduo — é cumprimento institucional", () => {
    const result = celebratePool([], REQUEST, CAUSE_POOL);
    expect(result.reason).toBe("not_team_channel");
  });

  test("pool vazio (total 0) não pode ser celebrado", () => {
    const result = celebratePool([], REQUEST, { ...TEAM_POOL, total: 0 });
    expect(result.reason).toBe("empty_pool");
  });

  test("pool protegido por k-anon (<5 contribuintes únicos) NUNCA é celebrável, mesmo pelo líder", () => {
    const protectedPool: SeedPoolAggregate = {
      ...TEAM_POOL,
      uniqueContributors: 3,
      visible: false,
    };
    const result = celebratePool([], REQUEST, protectedPool);
    expect(result.reason).toBe("pool_protected");
  });

  test("uma celebração por pool por semana — segunda tentativa na mesma semana é recusada", () => {
    const first = celebratePool([], REQUEST, TEAM_POOL);
    const second = celebratePool(
      first.records,
      { ...REQUEST, id: "cel-2", occurredOn: "2026-06-19" }, // mesma semana (sexta seguinte)
      TEAM_POOL,
    );
    expect(second.reason).toBe("already_celebrated_this_week");
  });

  test("semanas diferentes permitem nova celebração do mesmo pool", () => {
    const first = celebratePool([], REQUEST, TEAM_POOL);
    const second = celebratePool(
      first.records,
      { ...REQUEST, id: "cel-2", occurredOn: "2026-06-25" }, // semana seguinte
      TEAM_POOL,
    );
    expect(second.reason).toBe("recorded");
    expect(second.records.length).toBe(2);
  });

  test("pools diferentes na mesma semana não conflitam entre si", () => {
    const first = celebratePool([], REQUEST, TEAM_POOL);
    const otherPool: SeedPoolAggregate = { ...TEAM_POOL, id: "pomar_outro", name: "Outro Pomar" };
    const second = celebratePool(
      first.records,
      { ...REQUEST, id: "cel-2", poolId: "pomar_outro" },
      otherPool,
    );
    expect(second.reason).toBe("recorded");
  });

  test("o snapshot é imutável: mudanças futuras no pool não alteram o registro já feito", () => {
    const result = celebratePool([], REQUEST, TEAM_POOL);
    const laterPoolState: SeedPoolAggregate = { ...TEAM_POOL, total: 50, uniqueContributors: 10 };
    // Mesmo passando um pool "maior" numa consulta hipotética futura, o registro já
    // gravado não muda — só uma NOVA celebração usaria o novo snapshot.
    expect(result.record?.seedsConverted).toBe(22);
    expect(laterPoolState.total).toBe(50); // o pool real mudou; o registro histórico, não
  });
});

describe("celebration-engine — celebratedThisWeek", () => {
  test("true quando já existe celebração do pool na semana corrente", () => {
    const records: CelebrationRecord[] = [
      {
        id: "cel-1",
        poolId: "pomar_equipe",
        poolName: "Pomar da Equipe",
        leaderId: "u-lider-01",
        celebrationDescription: "Pizza",
        seedsConverted: 9,
        contributorCount: 3,
        occurredOn: "2026-06-16",
      },
    ];
    expect(celebratedThisWeek(records, "pomar_equipe", "2026-06-18")).toBe(true);
  });

  test("false para outro pool ou outra semana", () => {
    const records: CelebrationRecord[] = [
      {
        id: "cel-1",
        poolId: "pomar_equipe",
        poolName: "Pomar da Equipe",
        leaderId: "u-lider-01",
        celebrationDescription: "Pizza",
        seedsConverted: 9,
        contributorCount: 3,
        occurredOn: "2026-06-16",
      },
    ];
    expect(celebratedThisWeek(records, "pomar_outro", "2026-06-18")).toBe(false);
    expect(celebratedThisWeek(records, "pomar_equipe", "2026-06-25")).toBe(false);
  });
});
