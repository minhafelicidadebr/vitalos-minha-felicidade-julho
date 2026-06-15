import { describe, expect, test } from "bun:test";
import { buildTrend, type TrendPoint } from "./trend-engine";

function pt(label: string, ivo: number, lenses: Record<string, number> = {}): TrendPoint {
  return {
    cycleId: label,
    label,
    ivo,
    lenses: Object.entries(lenses).map(([id, score]) => ({ id, name: id.toUpperCase(), score })),
  };
}

// ─── Inclinação e deltas ──────────────────────────────────────────────────────

describe("buildTrend — inclinação", () => {
  test("delta total e inclinação por ciclo", () => {
    const r = buildTrend([pt("a", 500), pt("b", 540), pt("c", 600)]);
    expect(r.firstIvo).toBe(500);
    expect(r.lastIvo).toBe(600);
    expect(r.totalDelta).toBe(100);
    expect(r.slopePerCycle).toBe(50); // 100 / 2
    expect(r.recentDelta).toBe(60); // 600 − 540
  });
});

// ─── Momentum ─────────────────────────────────────────────────────────────────

describe("buildTrend — momentum", () => {
  test("subindo de forma constante → subindo", () => {
    expect(buildTrend([pt("a", 500), pt("b", 520), pt("c", 540)]).momentum).toBe("subindo");
  });

  test("último passo maior que a média → acelerando", () => {
    expect(buildTrend([pt("a", 500), pt("b", 510), pt("c", 560)]).momentum).toBe("acelerando");
  });

  test("variação pequena → estável", () => {
    expect(buildTrend([pt("a", 600), pt("b", 602), pt("c", 603)]).momentum).toBe("estavel");
  });

  test("em queda → caindo", () => {
    expect(buildTrend([pt("a", 600), pt("b", 570), pt("c", 540)]).momentum).toBe("caindo");
  });
});

// ─── Projeção (tendência, não promessa) ──────────────────────────────────────

describe("buildTrend — projeção", () => {
  test("projeta o próximo ciclo pela inclinação", () => {
    const r = buildTrend([pt("a", 500), pt("b", 540), pt("c", 580)]);
    expect(r.slopePerCycle).toBe(40);
    expect(r.projectedNext).toBe(620); // 580 + 40
  });

  test("projeção respeita o teto 1000", () => {
    const r = buildTrend([pt("a", 900), pt("b", 950), pt("c", 990)]);
    expect(r.projectedNext).toBeLessThanOrEqual(1000);
  });
});

// ─── Tendência por lente ─────────────────────────────────────────────────────

describe("buildTrend — lentes", () => {
  const series = [pt("a", 500, { eu: 480, nos: 520 }), pt("c", 580, { eu: 600, nos: 540 })];

  test("delta por lente entre primeiro e último ponto", () => {
    const r = buildTrend(series);
    const eu = r.lensTrends.find((l) => l.id === "eu")!;
    expect(eu.delta).toBe(120); // 600 − 480
  });

  test("bestLens e worstLens", () => {
    const r = buildTrend(series);
    expect(r.bestLens!.id).toBe("eu"); // +120
    expect(r.worstLens!.id).toBe("nos"); // +20
  });
});

// ─── Bordas ───────────────────────────────────────────────────────────────────

describe("buildTrend — bordas", () => {
  test("série vazia é segura", () => {
    const r = buildTrend([]);
    expect(r.firstIvo).toBeNull();
    expect(r.projectedNext).toBeNull();
    expect(r.momentum).toBe("estavel");
  });

  test("ponto único: sem inclinação, projeção = o próprio valor", () => {
    const r = buildTrend([pt("a", 600, { eu: 600 })]);
    expect(r.slopePerCycle).toBe(0);
    expect(r.projectedNext).toBe(600);
    expect(r.bestLens!.delta).toBe(0);
  });
});
