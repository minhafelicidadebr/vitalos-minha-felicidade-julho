// Testes do engine puro de resolução (Onda LDX-1). Nenhum destes testes
// importa JSON de domínio como fonte de verdade do engine — o catálogo é
// sempre passado por parâmetro (fixtures locais), provando a invariante
// Engine ≠ Domínio na prática, não só por comentário.

import { describe, expect, test } from "bun:test";
import {
  getDynamicById,
  getDynamicsForRoute,
  getDynamicsForRole,
  getVisibleDynamics,
  getAvailableDynamics,
  getRoadmapDynamics,
  assertDynamicRegistryIntegrity,
  deriveProductStatus,
  type CanonicalLearningDynamic,
} from "./learning-dynamics-resolution";

function makeDynamic(overrides: Partial<CanonicalLearningDynamic> = {}): CanonicalLearningDynamic {
  return {
    id: "LD-999",
    version: "1.0.0",
    slug: "fixture-dynamic",
    title: "Fixture",
    shortLabel: "Fixture",
    description: "Dinâmica de teste.",
    kind: "quiz",
    meteAxes: ["educar"],
    primaryOutcome: "Testar",
    authorizedRoles: ["LIDER_EQUIPE"],
    enrichesRoutes: ["/voz-segura"],
    runtimeStatus: "REAL",
    contentStatus: "VERIFIED",
    persistenceStatus: "NONE",
    aiMode: "NONE",
    publicExposure: "AVAILABLE",
    riskTier: "R1_LOW",
    dataClasses: [],
    evidenceRefs: [],
    runtimeEvidence: [],
    documentationEvidence: [],
    dependencies: [],
    forbiddenUses: [],
    accessibilityRequirements: [],
    acceptanceCriteria: ["existe"],
    rolloutWave: "LDX-1",
    ...overrides,
  };
}

const CATALOG: CanonicalLearningDynamic[] = [
  makeDynamic({ id: "LD-A", slug: "a", runtimeStatus: "REAL", publicExposure: "AVAILABLE", enrichesRoutes: ["/voz-segura"], authorizedRoles: ["LIDER_EQUIPE"] }),
  makeDynamic({ id: "LD-B", slug: "b", runtimeStatus: "PLANNED", publicExposure: "PREPARATION", enrichesRoutes: ["/voz-segura"], authorizedRoles: [] }),
  makeDynamic({ id: "LD-C", slug: "c", runtimeStatus: "PROPOSED", publicExposure: "HIDDEN", enrichesRoutes: [], authorizedRoles: [] }),
  makeDynamic({ id: "LD-D", slug: "d", runtimeStatus: "DEMO", publicExposure: "DEMO", enrichesRoutes: ["/academia"], authorizedRoles: ["COLABORADOR"] }),
];

describe("learning-dynamics-resolution — resolução básica", () => {
  test("getDynamicById encontra por id e devolve undefined para id inexistente", () => {
    expect(getDynamicById(CATALOG, "LD-A")?.id).toBe("LD-A");
    expect(getDynamicById(CATALOG, "LD-NAO-EXISTE")).toBeUndefined();
  });

  test("getDynamicsForRoute filtra por rota preservando a ordem do catálogo", () => {
    const result = getDynamicsForRoute(CATALOG, "/voz-segura");
    expect(result.map((d) => d.id)).toEqual(["LD-A", "LD-B"]);
  });

  test("getDynamicsForRole filtra por papel; authorizedRoles vazio nunca restringe", () => {
    const forLider = getDynamicsForRole(CATALOG, "LIDER_EQUIPE");
    expect(forLider.map((d) => d.id)).toEqual(["LD-A", "LD-B", "LD-C"]); // B e C têm authorizedRoles vazio
    const forColaborador = getDynamicsForRole(CATALOG, "COLABORADOR");
    expect(forColaborador.map((d) => d.id)).toEqual(["LD-B", "LD-C", "LD-D"]);
  });
});

describe("learning-dynamics-resolution — visibilidade e disponibilidade", () => {
  const context = { route: "/voz-segura", role: "LIDER_EQUIPE" };

  test("getVisibleDynamics exclui PROPOSED/HIDDEN da jornada comum", () => {
    const visible = getVisibleDynamics(CATALOG, context);
    expect(visible.map((d) => d.id)).toEqual(["LD-A", "LD-B"]);
    expect(visible.some((d) => d.id === "LD-C")).toBe(false);
  });

  test("getAvailableDynamics × getRoadmapDynamics são disjuntos e cobrem exatamente getVisibleDynamics", () => {
    const available = getAvailableDynamics(CATALOG, context);
    const roadmap = getRoadmapDynamics(CATALOG, context);
    expect(available.map((d) => d.id)).toEqual(["LD-A"]);
    expect(roadmap.map((d) => d.id)).toEqual(["LD-B"]);
    const availableIds = new Set(available.map((d) => d.id));
    const roadmapIds = new Set(roadmap.map((d) => d.id));
    for (const id of availableIds) expect(roadmapIds.has(id)).toBe(false);
  });

  test("PLANNED nunca aparece em getAvailableDynamics mesmo se authorizedRoles estiver vazio", () => {
    const available = getAvailableDynamics(CATALOG, context);
    expect(available.some((d) => d.runtimeStatus === "PLANNED")).toBe(false);
  });

  test("status desconhecido/malformado falha FECHADO — nunca vira disponível só por não estar na lista de roadmap", () => {
    const corrupted = makeDynamic({
      id: "LD-CORROMPIDO",
      // @ts-expect-error — simula dado corrompido/versão futura do schema, não um caso do TS
      runtimeStatus: "STATUS_DESCONHECIDO",
      publicExposure: "AVAILABLE",
      enrichesRoutes: ["/voz-segura"],
      authorizedRoles: [],
    });
    const available = getAvailableDynamics([...CATALOG, corrupted], context);
    expect(available.some((d) => d.id === "LD-CORROMPIDO")).toBe(false);
    const roadmap = getRoadmapDynamics([...CATALOG, corrupted], context);
    expect(roadmap.some((d) => d.id === "LD-CORROMPIDO")).toBe(false);
  });

  test("catálogo vazio nunca lança — devolve arrays vazios", () => {
    expect(getVisibleDynamics([], context)).toEqual([]);
    expect(getAvailableDynamics([], context)).toEqual([]);
    expect(getRoadmapDynamics([], context)).toEqual([]);
    expect(getDynamicsForRoute([], "/voz-segura")).toEqual([]);
  });

  test("sem role no contexto, dinâmicas com authorizedRoles não-vazio ficam de fora", () => {
    const noRole = getVisibleDynamics(CATALOG, { route: "/voz-segura" });
    expect(noRole.map((d) => d.id)).toEqual(["LD-B"]); // só a que tem authorizedRoles vazio
  });
});

describe("learning-dynamics-resolution — pureza", () => {
  test("nenhuma função muta o catálogo de entrada", () => {
    const before = JSON.stringify(CATALOG);
    getVisibleDynamics(CATALOG, { route: "/voz-segura", role: "LIDER_EQUIPE" });
    getAvailableDynamics(CATALOG, { route: "/academia", role: "COLABORADOR" });
    getRoadmapDynamics(CATALOG, { route: "/voz-segura", role: "LIDER_EQUIPE" });
    assertDynamicRegistryIntegrity(CATALOG);
    expect(JSON.stringify(CATALOG)).toBe(before);
  });

  test("chamadas repetidas com o mesmo input são determinísticas (mesma ordem, mesmo conteúdo)", () => {
    const context = { route: "/voz-segura", role: "LIDER_EQUIPE" };
    const run1 = getVisibleDynamics(CATALOG, context).map((d) => d.id);
    const run2 = getVisibleDynamics(CATALOG, context).map((d) => d.id);
    expect(run1).toEqual(run2);
  });
});

describe("learning-dynamics-resolution — assertDynamicRegistryIntegrity", () => {
  test("catálogo saudável não produz erros", () => {
    const result = assertDynamicRegistryIntegrity(CATALOG);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("pega id duplicado", () => {
    const dup = [...CATALOG, makeDynamic({ id: "LD-A", slug: "outro-slug" })];
    const result = assertDynamicRegistryIntegrity(dup);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("id duplicado"))).toBe(true);
  });

  test("pega GENERATIVE_GATED (proibido nesta onda)", () => {
    const gated = [...CATALOG, makeDynamic({ id: "LD-GATED", slug: "gated", aiMode: "GENERATIVE_GATED" })];
    const result = assertDynamicRegistryIntegrity(gated);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("GENERATIVE_GATED"))).toBe(true);
  });

  test("pega PLANNED com exposição operacional (funcionalidade fantasma)", () => {
    const phantom = [
      ...CATALOG,
      makeDynamic({ id: "LD-FANTASMA", slug: "fantasma", runtimeStatus: "PLANNED", publicExposure: "AVAILABLE" }),
    ];
    const result = assertDynamicRegistryIntegrity(phantom);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exposição operacional"))).toBe(true);
  });

  test("valida o catálogo real do registro canônico (integração leve)", async () => {
    const { getLearningDynamicsRegistry } = await import("@/domain/learning/learning-dynamics-registry");
    const result = assertDynamicRegistryIntegrity(getLearningDynamicsRegistry());
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe("deriveProductStatus — Truth Layer (elo mais fraco, falha fechado)", () => {
  test("runtime REAL + conteúdo VERIFIED → REAL (única combinação que se apresenta real)", () => {
    expect(deriveProductStatus(makeDynamic({ runtimeStatus: "REAL", contentStatus: "VERIFIED" }))).toBe("REAL");
    expect(deriveProductStatus(makeDynamic({ runtimeStatus: "REAL", contentStatus: "CURATED" }))).toBe("REAL");
  });

  test("runtime PARCIAL com conteúdo curado → PARCIAL; nunca REAL", () => {
    expect(deriveProductStatus(makeDynamic({ runtimeStatus: "PARCIAL", contentStatus: "VERIFIED" }))).toBe("PARCIAL");
  });

  test("conteúdo DEMO/DRAFT/ABSENT rebaixa a superfície inteira, mesmo com runtime REAL", () => {
    expect(deriveProductStatus(makeDynamic({ runtimeStatus: "REAL", contentStatus: "DEMO" }))).toBe("DEMO");
    expect(deriveProductStatus(makeDynamic({ runtimeStatus: "REAL", contentStatus: "DRAFT" }))).toBe("DEMO");
    expect(deriveProductStatus(makeDynamic({ runtimeStatus: "PARCIAL", contentStatus: "ABSENT" }))).toBe("DEMO");
  });

  test("runtime de roadmap/desconhecido → piso DEMO mesmo com conteúdo verificado (falha fechado)", () => {
    expect(deriveProductStatus(makeDynamic({ runtimeStatus: "PLANNED", contentStatus: "VERIFIED" }))).toBe("DEMO");
    expect(deriveProductStatus(makeDynamic({ runtimeStatus: "CORROMPIDO" as never, contentStatus: "VERIFIED" }))).toBe("DEMO");
  });
});

describe("deriveProductStatus — embed efêmero (superfície descarta persistência)", () => {
  test("dinâmica REAL embutida como efêmera rebaixa para PARCIAL — nunca se apresenta REAL", () => {
    const real = makeDynamic({ runtimeStatus: "REAL", contentStatus: "CURATED" });
    expect(deriveProductStatus(real, { ephemeral: true })).toBe("PARCIAL");
    expect(deriveProductStatus(real)).toBe("REAL"); // sem o flag, a dinâmica global segue REAL
  });

  test("efêmero nunca ELEVA — DEMO continua DEMO", () => {
    expect(
      deriveProductStatus(makeDynamic({ runtimeStatus: "PARCIAL", contentStatus: "DEMO" }), { ephemeral: true }),
    ).toBe("DEMO");
  });
});
