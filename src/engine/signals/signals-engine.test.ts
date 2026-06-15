import { describe, expect, test } from "bun:test";
import {
  visibleSignals,
  crossPerceptionBehavior,
  reconcileSignals,
  SIGNALS_K_MIN,
  type SignalAggregate,
} from "./signals-engine";

// ─── k-anonimato dos sinais ───────────────────────────────────────────────────

describe("visibleSignals", () => {
  const sigs: SignalAggregate[] = [
    { signalId: "a", label: "A", value: 60, deltaVsPrev: 2, n: 100, relatedPillarId: "p1" },
    {
      signalId: "b",
      label: "B",
      value: 30,
      deltaVsPrev: 0,
      n: SIGNALS_K_MIN,
      relatedPillarId: "p2",
    },
    { signalId: "c", label: "C", value: 0, deltaVsPrev: 0, n: 3, relatedPillarId: "p3" },
  ];

  test("oculta sinais com n < k mínimo", () => {
    const visible = visibleSignals(sigs);
    expect(visible.map((s) => s.signalId)).toEqual(["a", "b"]);
  });

  test("n exatamente no mínimo é visível", () => {
    expect(visibleSignals(sigs).some((s) => s.signalId === "b")).toBe(true);
  });
});

// ─── crossPerceptionBehavior (leitura binária existente) ─────────────────────

describe("crossPerceptionBehavior", () => {
  test("percepção e comportamento próximos → coerente", () => {
    const [r] = crossPerceptionBehavior([
      { pillarId: "p", pillarName: "P", perceptionScore: 600, behaviorValue: 62 },
    ]);
    expect(r!.reading).toBe("coerente");
  });

  test("percepção >> comportamento → divergente (discurso sem prática)", () => {
    const [r] = crossPerceptionBehavior([
      { pillarId: "p", pillarName: "P", perceptionScore: 800, behaviorValue: 30 },
    ]);
    expect(r!.reading).toBe("divergente");
    expect(r!.note).toContain("discurso");
  });

  test("comportamento >> percepção → nota de 'não é sentido'", () => {
    const [r] = crossPerceptionBehavior([
      { pillarId: "p", pillarName: "P", perceptionScore: 300, behaviorValue: 80 },
    ]);
    expect(r!.reading).toBe("divergente");
    expect(r!.note).toContain("não é sentida");
  });
});

// ─── reconcileSignals (quadrantes + alinhamento) ─────────────────────────────

describe("reconcileSignals — quadrantes", () => {
  test("classifica os quatro quadrantes", () => {
    const r = reconcileSignals([
      { pillarId: "a", pillarName: "A", perceptionScore: 700, behaviorValue: 70 }, // alto/alto
      { pillarId: "b", pillarName: "B", perceptionScore: 700, behaviorValue: 30 }, // alto/baixo
      { pillarId: "c", pillarName: "C", perceptionScore: 300, behaviorValue: 70 }, // baixo/alto
      { pillarId: "d", pillarName: "D", perceptionScore: 300, behaviorValue: 30 }, // baixo/baixo
    ]);
    const q = (id: string) => r.pairs.find((p) => p.pillarId === id)!.quadrant;
    expect(q("a")).toBe("praticado_e_sentido");
    expect(q("b")).toBe("discurso_sem_pratica");
    expect(q("c")).toBe("pratica_nao_sentida");
    expect(q("d")).toBe("lacuna_dupla");
  });

  test("contagem por quadrante soma o total de pares", () => {
    const r = reconcileSignals([
      { pillarId: "a", pillarName: "A", perceptionScore: 700, behaviorValue: 70 },
      { pillarId: "b", pillarName: "B", perceptionScore: 700, behaviorValue: 30 },
    ]);
    const total = Object.values(r.byQuadrant).reduce((s, n) => s + n, 0);
    expect(total).toBe(2);
    expect(r.byQuadrant.praticado_e_sentido).toBe(1);
    expect(r.byQuadrant.discurso_sem_pratica).toBe(1);
  });
});

describe("reconcileSignals — alinhamento e divergência", () => {
  test("alinhamento perfeito → índice 100", () => {
    const r = reconcileSignals([
      { pillarId: "a", pillarName: "A", perceptionScore: 600, behaviorValue: 60 },
    ]);
    expect(r.alignmentIndex).toBe(100);
  });

  test("divergência máxima → índice baixo", () => {
    const r = reconcileSignals([
      { pillarId: "a", pillarName: "A", perceptionScore: 1000, behaviorValue: 0 },
    ]);
    expect(r.alignmentIndex).toBe(0);
  });

  test("divergence = |percepção − comportamento| normalizado", () => {
    const r = reconcileSignals([
      { pillarId: "a", pillarName: "A", perceptionScore: 800, behaviorValue: 30 },
    ]);
    expect(r.pairs[0]!.divergence).toBeCloseTo(0.5, 5); // |0.8 − 0.3|
  });

  test("topDivergence é o par de maior divergência", () => {
    const r = reconcileSignals([
      { pillarId: "a", pillarName: "A", perceptionScore: 600, behaviorValue: 58 }, // div ~0.02
      { pillarId: "b", pillarName: "B", perceptionScore: 900, behaviorValue: 20 }, // div 0.70
    ]);
    expect(r.topDivergence!.pillarId).toBe("b");
  });

  test("divergentCount conta pares acima do limiar", () => {
    const r = reconcileSignals([
      { pillarId: "a", pillarName: "A", perceptionScore: 600, behaviorValue: 58 }, // coerente
      { pillarId: "b", pillarName: "B", perceptionScore: 900, behaviorValue: 20 }, // divergente
    ]);
    expect(r.divergentCount).toBe(1);
  });

  test("entrada vazia é segura", () => {
    const r = reconcileSignals([]);
    expect(r.alignmentIndex).toBe(100);
    expect(r.topDivergence).toBeNull();
  });
});
