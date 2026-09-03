import { describe, expect, test } from "bun:test";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { buildFactorComparison, buildManagerAnalytics } from "./fibt-manager-control-center";

const manifest = getFibtManifest();
const answers = (value: number) =>
  Object.fromEntries(manifest.items.map((item) => [item.id, value]));
const response = (value = 3) => ({
  answers: answers(value),
  instrumentVersion: manifest.instrument_version,
});

describe("FIB-T manager analytics", () => {
  test("separates no data from privacy suppression", () => {
    expect(buildManagerAnalytics([], manifest.instrument_version).state).toBe("no_data");

    const suppressed = buildManagerAnalytics(
      Array.from({ length: 4 }, () => response()),
      manifest.instrument_version,
    );
    expect(suppressed).toMatchObject({ state: "suppressed", countLabel: "<5", kMin: 5 });
    expect(JSON.stringify(suppressed)).not.toMatch(/"n":4/);
  });

  test("uses the canonical engine for the three factors", () => {
    const result = buildManagerAnalytics(
      Array.from({ length: 5 }, () => response(3)),
      manifest.instrument_version,
    );

    expect(result.state).toBe("available");
    if (result.state === "available") {
      expect(result.result.factors).toHaveLength(3);
      expect(result.result.factors.map((factor) => factor.mean)).toEqual([3, 3, 3]);
      expect(result.result.escoreBruto).toBe(9);
    }
  });

  test("never treats a missing answer as zero", () => {
    const incomplete = response();
    delete incomplete.answers.q32;
    const result = buildManagerAnalytics(
      [incomplete, response(), response(), response(), response()],
      manifest.instrument_version,
    );
    expect(result).toMatchObject({ state: "error", countLabel: "Indisponível" });
    expect(result.state === "error" ? result.message : "").toContain("Nenhum valor ausente");
  });

  test("rejects methodology version drift", () => {
    expect(buildManagerAnalytics([response()], "legacy-version")).toMatchObject({ state: "error" });
  });

  test("comparison includes only publishable cohorts", () => {
    const available = buildManagerAnalytics(
      Array.from({ length: 5 }, () => response()),
      manifest.instrument_version,
    );
    const suppressed = buildManagerAnalytics([response()], manifest.instrument_version);
    const comparison = buildFactorComparison([
      { id: "a", label: "Setor A", analytics: available },
      { id: "b", label: "Setor B", analytics: suppressed },
    ]);
    expect(comparison).toHaveLength(1);
    expect(comparison[0]?.cohortLabel).toBe("Setor A");
    expect(comparison[0]?.factors).toHaveLength(3);
  });
});
