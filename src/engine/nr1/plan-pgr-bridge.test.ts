import { describe, expect, test } from "bun:test";
import { buildPgrMeasuresFromPlan, type PlanMeasureSourceItem } from "./plan-pgr-bridge";

function item(overrides: Partial<PlanMeasureSourceItem> = {}): PlanMeasureSourceItem {
  return {
    leverId: "lever-a",
    controlTier: "organizacao",
    title: "Redesenhar fluxo de aprovação",
    description: "Reduzir etapas de aprovação de 5 para 2 no processo X.",
    ownerRoleLabel: "RH_ADMIN",
    status: "planejada",
    ...overrides,
  };
}

const leverToDriverAll = new Map<string, string | null>([
  ["lever-a", "carga"],
  ["lever-b", "carga"],
  ["lever-c", null], // sem correspondência real — nunca inventar
]);

describe("plan-pgr-bridge — mapeamento de status real (PlanActionStatus → MeasureStatus)", () => {
  test("planejada → planejada", () => {
    const [seed] = buildPgrMeasuresFromPlan([item({ status: "planejada" })], leverToDriverAll);
    expect(seed!.knownStatus).toBe("planejada");
  });

  test("em_execucao → em_andamento", () => {
    const [seed] = buildPgrMeasuresFromPlan([item({ status: "em_execucao" })], leverToDriverAll);
    expect(seed!.knownStatus).toBe("em_andamento");
  });

  test("concluida → implementada", () => {
    const [seed] = buildPgrMeasuresFromPlan([item({ status: "concluida" })], leverToDriverAll);
    expect(seed!.knownStatus).toBe("implementada");
  });

  test("em_vigilancia → implementada (pós-conclusão, Vigia I-E4)", () => {
    const [seed] = buildPgrMeasuresFromPlan([item({ status: "em_vigilancia" })], leverToDriverAll);
    expect(seed!.knownStatus).toBe("implementada");
  });

  test("interrompida → planejada (nunca creditada como concluída)", () => {
    const [seed] = buildPgrMeasuresFromPlan([item({ status: "interrompida" })], leverToDriverAll);
    expect(seed!.knownStatus).toBe("planejada");
  });
});

describe("plan-pgr-bridge — honestidade (nunca força correspondência)", () => {
  test("item sem controlTier fica fora do PGR", () => {
    const seeds = buildPgrMeasuresFromPlan([item({ controlTier: null })], leverToDriverAll);
    expect(seeds).toHaveLength(0);
  });

  test("item cujo lever não tem driver correspondente (bridge → null) fica fora do PGR", () => {
    const seeds = buildPgrMeasuresFromPlan([item({ leverId: "lever-c" })], leverToDriverAll);
    expect(seeds).toHaveLength(0);
  });

  test("item cujo lever não existe no mapa (ausente) fica fora do PGR", () => {
    const seeds = buildPgrMeasuresFromPlan([item({ leverId: "lever-desconhecido" })], leverToDriverAll);
    expect(seeds).toHaveLength(0);
  });

  test("driverId da medida vem exatamente do mapa lever→driver, nunca inventado", () => {
    const [seed] = buildPgrMeasuresFromPlan([item({ leverId: "lever-b" })], leverToDriverAll);
    expect(seed!.driverId).toBe("carga");
  });
});

describe("plan-pgr-bridge — conteúdo da medida", () => {
  test("usa a descrição como ação quando presente", () => {
    const [seed] = buildPgrMeasuresFromPlan(
      [item({ description: "Ação detalhada real.", title: "Título curto" })],
      leverToDriverAll,
    );
    expect(seed!.action).toBe("Ação detalhada real.");
  });

  test("cai para o título quando a descrição está vazia/em branco", () => {
    const [seed] = buildPgrMeasuresFromPlan(
      [item({ description: "   ", title: "Título vira a ação" })],
      leverToDriverAll,
    );
    expect(seed!.action).toBe("Título vira a ação");
  });

  test("item sem título nem descrição não vira medida (ação nunca vazia)", () => {
    const seeds = buildPgrMeasuresFromPlan(
      [item({ description: "   ", title: "  " })],
      leverToDriverAll,
    );
    expect(seeds).toHaveLength(0);
  });

  test("usa o papel do dono como responsável quando presente", () => {
    const [seed] = buildPgrMeasuresFromPlan([item({ ownerRoleLabel: "SESMT" })], leverToDriverAll);
    expect(seed!.responsible).toBe("SESMT");
  });

  test("cai para 'Responsável a definir' quando não há dono (§13 incompleto, honesto)", () => {
    const [seed] = buildPgrMeasuresFromPlan([item({ ownerRoleLabel: null })], leverToDriverAll);
    expect(seed!.responsible).toBe("Responsável a definir");
  });

  test("tier da medida é exatamente o controlTier real do item (mesma hierarquia NR-01)", () => {
    const [seed] = buildPgrMeasuresFromPlan([item({ controlTier: "eliminacao" })], leverToDriverAll);
    expect(seed!.tier).toBe("eliminacao");
  });
});

describe("plan-pgr-bridge — múltiplos itens", () => {
  test("vários itens do mesmo driver viram várias seeds (pgr-engine agrupa por driverId)", () => {
    const seeds = buildPgrMeasuresFromPlan(
      [item({ leverId: "lever-a" }), item({ leverId: "lever-b" })],
      leverToDriverAll,
    );
    expect(seeds).toHaveLength(2);
    expect(seeds.every((s) => s.driverId === "carga")).toBe(true);
  });

  test("determinístico: mesma entrada → mesma saída, preservando ordem", () => {
    const items = [item({ leverId: "lever-a" }), item({ leverId: "lever-b", status: "concluida" })];
    const a = buildPgrMeasuresFromPlan(items, leverToDriverAll);
    const b = buildPgrMeasuresFromPlan(items, leverToDriverAll);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
