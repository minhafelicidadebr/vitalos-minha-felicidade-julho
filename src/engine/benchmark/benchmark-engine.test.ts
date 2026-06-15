import { describe, expect, test } from "bun:test";
import {
  buildBenchmark,
  MIN_COHORT_ORGS,
  type CohortStats,
  type OrgMetric,
} from "./benchmark-engine";

const COHORT: CohortStats = {
  cohortId: "tech",
  label: "Tecnologia · 200–1000",
  nOrgs: 14,
  metrics: [
    { metricId: "ivo", p25: 520, median: 600, p75: 680 },
    { metricId: "eu", p25: 540, median: 615, p75: 700 },
    { metricId: "seguranca", p25: 500, median: 580, p75: 660 },
    { metricId: "carga", p25: 480, median: 560, p75: 640 },
  ],
};

function org(scores: Record<string, number>): OrgMetric[] {
  return [
    { metricId: "ivo", label: "IVO", score: scores.ivo ?? 600, kind: "ivo" },
    { metricId: "eu", label: "EU", score: scores.eu ?? 615, kind: "lens" },
    {
      metricId: "seguranca",
      label: "Segurança",
      score: scores.seguranca ?? 580,
      kind: "pillar",
      weight: 0.08,
    },
    { metricId: "carga", label: "Carga", score: scores.carga ?? 560, kind: "pillar", weight: 0.08 },
  ];
}

// ─── Posição ──────────────────────────────────────────────────────────────────

describe("buildBenchmark — posição", () => {
  test("score ≥ p75 → líder", () => {
    const r = buildBenchmark(org({ ivo: 690 }), COHORT);
    expect(r.overall!.position).toBe("lider");
  });
  test("mediana ≤ score < p75 → acima", () => {
    expect(buildBenchmark(org({ ivo: 640 }), COHORT).overall!.position).toBe("acima");
  });
  test("p25 ≤ score < mediana → mediana", () => {
    expect(buildBenchmark(org({ ivo: 540 }), COHORT).overall!.position).toBe("mediana");
  });
  test("score < p25 → abaixo", () => {
    expect(buildBenchmark(org({ ivo: 480 }), COHORT).overall!.position).toBe("abaixo");
  });
});

// ─── Percentil e lacunas ─────────────────────────────────────────────────────

describe("buildBenchmark — percentil e lacunas", () => {
  test("score = mediana → percentil 50", () => {
    expect(buildBenchmark(org({ ivo: 600 }), COHORT).overall!.percentile).toBe(50);
  });
  test("score = p25 → percentil 25; p75 → 75", () => {
    expect(buildBenchmark(org({ ivo: 520 }), COHORT).overall!.percentile).toBe(25);
    expect(buildBenchmark(org({ ivo: 680 }), COHORT).overall!.percentile).toBe(75);
  });
  test("percentil é monotônico no score", () => {
    const a = buildBenchmark(org({ ivo: 540 }), COHORT).overall!.percentile;
    const b = buildBenchmark(org({ ivo: 620 }), COHORT).overall!.percentile;
    expect(b).toBeGreaterThan(a);
  });
  test("gapToMedian e gapToTopQuartile", () => {
    const r = buildBenchmark(org({ ivo: 640 }), COHORT).overall!;
    expect(r.gapToMedian).toBe(40); // 640 − 600
    expect(r.gapToTopQuartile).toBe(-40); // 640 − 680
  });
});

// ─── Lidera / fica atrás / oportunidade ──────────────────────────────────────

describe("buildBenchmark — leitura", () => {
  test("classifica leads (acima) e lags (abaixo)", () => {
    const r = buildBenchmark(org({ eu: 710, seguranca: 590, carga: 450 }), COHORT);
    expect(r.leads.some((x) => x.metricId === "eu")).toBe(true); // 710 > p75 700
    expect(r.lags.some((x) => x.metricId === "carga")).toBe(true); // 450 < p25 480
  });

  test("topOpportunity é o pilar abaixo da mediana com maior lacuna ponderada", () => {
    // seguranca 520 (gap -60, w .08 → 4.8) ; carga 540 (gap -20, w .08 → 1.6)
    const r = buildBenchmark(org({ seguranca: 520, carga: 540 }), COHORT);
    expect(r.topOpportunity!.metricId).toBe("seguranca");
  });

  test("sem pilar abaixo da mediana → topOpportunity nulo", () => {
    const r = buildBenchmark(org({ seguranca: 600, carga: 600 }), COHORT);
    expect(r.topOpportunity).toBeNull();
  });
});

// ─── k-anonimato entre tenants ───────────────────────────────────────────────

describe("buildBenchmark — k-anon entre tenants", () => {
  test("coorte com nOrgs < mínimo fica indisponível e sem linhas", () => {
    const thin: CohortStats = { ...COHORT, cohortId: "thin", nOrgs: 3 };
    const r = buildBenchmark(org({}), thin);
    expect(r.available).toBe(false);
    expect(r.rows).toHaveLength(0);
    expect(r.overall).toBeNull();
    expect(r.topOpportunity).toBeNull();
  });

  test("coorte com nOrgs === mínimo fica disponível", () => {
    const edge: CohortStats = { ...COHORT, nOrgs: MIN_COHORT_ORGS };
    expect(buildBenchmark(org({}), edge).available).toBe(true);
  });
});

// ─── Interseção ──────────────────────────────────────────────────────────────

describe("buildBenchmark — interseção org × coorte", () => {
  test("métrica sem estatística no coorte é ignorada", () => {
    const extra = [...org({}), { metricId: "x", label: "X", score: 500, kind: "pillar" as const }];
    const r = buildBenchmark(extra, COHORT);
    expect(r.rows.some((row) => row.metricId === "x")).toBe(false);
  });

  test("propaga rótulo e nOrgs do coorte", () => {
    const r = buildBenchmark(org({}), COHORT);
    expect(r.cohortLabel).toBe("Tecnologia · 200–1000");
    expect(r.nOrgs).toBe(14);
  });
});
