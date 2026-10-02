import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIvoMatrix } from "@/engine/ivo/ivo-matrix";
import { ivoDimensionsForPack, ivoLensCatalog } from "@/domain/ivo/lens-catalog";
import { getDimensionMappings } from "@/domain/ivo/dimension-mappings";
import type { ManagerAnalytics } from "./fibt-manager-control-center";
import type { FibtManagerSnapshot } from "./fibt-manager-control-center.server";
import { FIBT_RAW_SCORE_CONSTRUCT_ID, toFibtLensReading } from "./fibt-lens-adapter";

const available: ManagerAnalytics = {
  state: "available",
  countLabel: "7",
  n: 7,
  publishedAt: "2026-06-20T12:00:00.000Z",
  finalUpdateWithheld: false,
  result: {
    escoreBruto: 8.4,
    factors: [
      { id: "padrao_de_vida", name: "Padrao de Vida", mean: 2.6, domains: [] },
      { id: "bem_estar", name: "Bem-Estar", mean: 3.1, domains: [] },
      { id: "satisfacao_empresa", name: "Satisfacao com a Empresa", mean: 2.7, domains: [] },
    ],
    domains: [],
  },
};

const protectedStates: ManagerAnalytics[] = [
  { state: "insufficient_participants", countLabel: "<5", kMin: 5, message: "abaixo do limiar" },
  { state: "awaiting_batched_release", countLabel: "protegida", kMin: 5, message: "lote" },
  { state: "complementary_suppression", countLabel: "protegida", kMin: 5, message: "complementar" },
  { state: "awaiting_item_coverage", countLabel: "protegida", kMin: 5, message: "cobertura" },
  { state: "withheld_on_close", countLabel: "protegida", kMin: 5, message: "retida" },
  { state: "methodology_error", countLabel: "Indisponível", message: "versão" },
  { state: "technical_error", countLabel: "Indisponível", message: "técnico" },
];

function sector(key: string, analytics: ManagerAnalytics) {
  return {
    id: `cohort-${key}`,
    key,
    label: `Setor ${key}`,
    operationalState: "collecting" as const,
    participationState: analytics.state,
    participationLabel: analytics.countLabel,
    readingPublished: analytics.state === "available",
    analytics,
    links: [],
  };
}

function snapshot(sectors: ReturnType<typeof sector>[], status = "collecting"): FibtManagerSnapshot {
  return {
    campaign: {
      waveId: "wave-demo",
      organizationName: "Organização Fictícia",
      label: "Onda sintética",
      instrument: "FIB_T",
      instrumentVersion: "1.0.0",
      status,
      sealOutcome: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      closesAt: null,
      environment: "application",
      hmlAttested: false,
    },
    participation: { countLabel: "protegida", publishedCohorts: 0, totalCohorts: sectors.length },
    waveAnalytics: { state: "wave_reading_unavailable", countLabel: "protegida", message: "por setor" },
    sectors,
    factorComparison: [],
    readiness: { state: "ready", operational: true, blockers: [], nextAction: "" },
    telemetry: [],
    privacy: { kMin: 5, individualResponsesExposed: false, rawTokensExposed: false },
  };
}

const ctx = { organizationId: "org-demo", cycleKey: "2026-T2", generatedAt: "2026-06-30T00:00:00.000Z" };

describe("adaptador FIB-T → leitura IVO", () => {
  test("coorte publicada transporta fatores e escore bruto exatamente como publicados (F2)", () => {
    const r = toFibtLensReading(snapshot([sector("A", available)]), ctx);
    const cohort = r.cohorts[0]!;
    expect(cohort.publication).toBe("published");
    expect(cohort.countLabel).toBe("7");
    expect(cohort.constructs!.map((c) => [c.id, c.value])).toEqual([
      ["padrao_de_vida", 2.6],
      ["bem_estar", 3.1],
      ["satisfacao_empresa", 2.7],
      [FIBT_RAW_SCORE_CONSTRUCT_ID, 8.4],
    ]);
    expect(cohort.constructs!.find((c) => c.id === FIBT_RAW_SCORE_CONSTRUCT_ID)!.scaleMax).toBe(12);
    expect(r.quarter).toBe("Q2");
    expect(r.privacyStatus).toBe("published");
  });

  test("nenhum estado protegido expõe número (F1)", () => {
    for (const analytics of protectedStates) {
      const r = toFibtLensReading(snapshot([sector("A", available), sector("B", analytics)]), ctx);
      const protectedCohort = r.cohorts.find((c) => c.cohortKey === "B")!;
      expect(protectedCohort.publication).toBe("protected");
      expect(protectedCohort.constructs).toBeNull();
      expect(protectedCohort.countLabel).not.toMatch(/^[1-9]\d*$/);
      expect(r.privacyStatus).toBe("protected");
    }
  });

  test("sem dados: coletando enquanto a onda coleta, concluída quando selada", () => {
    const noData: ManagerAnalytics = { state: "no_data", countLabel: "0", message: "sem dados" };
    expect(toFibtLensReading(snapshot([sector("A", noData)]), ctx).publicationStatus).toBe("collecting");
    expect(toFibtLensReading(snapshot([sector("A", noData)], "sealed"), ctx).publicationStatus).toBe("concluded");
  });

  test("onda que não é FIB-T é recusada (F3)", () => {
    const s = snapshot([sector("A", available)]);
    (s.campaign as { instrument: string }).instrument = "COPSOQ";
    expect(() => toFibtLensReading(s, ctx)).toThrow(/não é de uma onda FIB-T/);
  });

  test("leitura FIB-T alimenta a matriz pelo estado da lente; sem mapeamento aprovado não há evidência", () => {
    const reading = toFibtLensReading(snapshot([sector("A", available)]), ctx);
    const matrix = buildIvoMatrix({
      organizationId: "org-demo",
      dimensions: ivoDimensionsForPack("enterprise"),
      lenses: ivoLensCatalog(),
      readings: [reading],
      mappings: getDimensionMappings(),
    });
    for (const row of matrix.rows) {
      const fibt = row.cells.find((c) => c.lens === "fibt")!;
      expect(fibt.publicationState).toBe("published");
      expect(fibt.evidence).toEqual([]);
      expect(row.cells.filter((c) => c.lens !== "fibt").every((c) => c.publicationState === "planned")).toBe(true);
    }
    expect(matrix.warnings).toEqual([]);
  });
});

describe("independência de cliente do núcleo FIB-T (F4)", () => {
  const PRODUCT_MODULES = [
    "fibt-manager-control-center.ts",
    "fibt-manager-control-center.server.ts",
    "fibt-cohort-report.ts",
    "fibt-lens-adapter.ts",
  ];

  test("nenhum módulo de produto FIB-T importa a identidade de lote HML", () => {
    for (const file of PRODUCT_MODULES) {
      const source = readFileSync(join(import.meta.dir, file), "utf8");
      expect(source.includes("@/lib/fibt-hml/hml-contract")).toBe(false);
      expect(/\bISG\b/.test(source)).toBe(false);
    }
  });
});
