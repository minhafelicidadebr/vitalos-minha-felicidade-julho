import { describe, expect, test } from "bun:test";
import {
  detectEarlyWarnings,
  LENS_DROP_CRIT,
  PILLAR_DROP_CRIT,
  type EarlyWarningInput,
  type RecommendedMove,
} from "./earlywarning-engine";
import type { TrendResult, Momentum } from "../trend/trend-engine";
import type { SignalsReconciliation, ReconciledPair } from "../signals/signals-engine";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function trend(momentum: Momentum, over: Partial<TrendResult> = {}): TrendResult {
  return {
    points: [],
    firstIvo: 600,
    lastIvo: momentum === "caindo" ? 540 : 660,
    totalDelta: momentum === "caindo" ? -60 : 60,
    slopePerCycle: momentum === "caindo" ? -15 : 15,
    recentDelta: momentum === "caindo" ? -20 : 12,
    momentum,
    projectedNext: 540,
    lensTrends: [],
    bestLens: null,
    worstLens: null,
    ...over,
  };
}

const MOVE: RecommendedMove = {
  label: "Rituais de reconhecimento",
  lift: 28,
  isQuickWin: true,
  owner: "Embaixadoria X",
};

function divergentRecon(
  quadrant: ReconciledPair["quadrant"],
  divergence: number,
): SignalsReconciliation {
  const pair: ReconciledPair = {
    pillarId: "reconhecimento_pares",
    pillarName: "Reconhecimento entre Pares",
    perceptionScore: 700,
    behaviorValue: 30,
    perceptionNorm: 0.7,
    behaviorNorm: 0.3,
    quadrant,
    divergence,
  };
  return {
    pairs: [pair],
    alignmentIndex: 60,
    byQuadrant: {
      praticado_e_sentido: 0,
      discurso_sem_pratica: 0,
      pratica_nao_sentida: 0,
      lacuna_dupla: 0,
    },
    divergentCount: 1,
    topDivergence: pair,
  };
}

function baseInput(over: Partial<EarlyWarningInput> = {}): EarlyWarningInput {
  return {
    trend: trend("subindo"),
    reconciliation: null,
    decliningPillars: [],
    topMove: MOVE,
    observableChannels: new Set(["pulses"]),
    ...over,
  };
}

// ─── Momentum ─────────────────────────────────────────────────────────────────

describe("early-warning — momentum", () => {
  test("momentum caindo → alerta crítico e status em_risco", () => {
    const r = detectEarlyWarnings(baseInput({ trend: trend("caindo") }));
    const m = r.alerts.find((a) => a.source === "momentum");
    expect(m?.severity).toBe("critico");
    expect(r.status).toBe("em_risco");
    expect(m?.recommendedMove).toContain("Rituais de reconhecimento");
  });

  test("momentum subindo → nenhum alerta de momentum, status saudável", () => {
    const r = detectEarlyWarnings(baseInput({ trend: trend("subindo") }));
    expect(r.alerts.some((a) => a.source === "momentum")).toBe(false);
    expect(r.status).toBe("saudavel");
  });

  test("estável com recuo recente → apenas 'observar'", () => {
    const r = detectEarlyWarnings(
      baseInput({
        trend: trend("estavel", { momentum: "estavel", recentDelta: -8, slopePerCycle: 1 }),
      }),
    );
    expect(r.alerts.find((a) => a.source === "momentum")?.severity).toBe("observar");
    expect(r.status).toBe("saudavel"); // observar não eleva o status
  });
});

// ─── Lente e pilares ──────────────────────────────────────────────────────────

describe("early-warning — lente e pilares", () => {
  test("pior lente abaixo do limiar crítico → crítico", () => {
    const worstLens = {
      id: "lideranca",
      name: "LIDERANÇA",
      first: 600,
      last: 600 - LENS_DROP_CRIT - 5,
      delta: -(LENS_DROP_CRIT + 5),
    };
    const r = detectEarlyWarnings(baseInput({ trend: trend("estavel", { worstLens }) }));
    expect(r.alerts.find((a) => a.source === "lente")?.severity).toBe("critico");
  });

  test("queda de pilar ≥ limiar crítico → crítico com primeiro movimento", () => {
    const r = detectEarlyWarnings(
      baseInput({
        decliningPillars: [
          {
            pillarId: "condicoes_carga",
            name: "Condições & Carga",
            score: 440,
            drop: PILLAR_DROP_CRIT + 4,
          },
        ],
      }),
    );
    const p = r.alerts.find((a) => a.source === "pilar");
    expect(p?.severity).toBe("critico");
    expect(p?.recommendedMove).toBeTruthy();
  });

  test("queda de pilar abaixo do limiar de atenção é ignorada", () => {
    const r = detectEarlyWarnings(
      baseInput({ decliningPillars: [{ pillarId: "x", name: "X", score: 700, drop: 3 }] }),
    );
    expect(r.alerts.some((a) => a.source === "pilar")).toBe(false);
  });
});

// ─── Consentimento (a trava que torna isto honesto) ───────────────────────────

describe("early-warning — gate de consentimento", () => {
  test("signals observável + divergência → alerta gateado por canal", () => {
    const r = detectEarlyWarnings(
      baseInput({
        observableChannels: new Set(["pulses", "signals"]),
        reconciliation: divergentRecon("discurso_sem_pratica", 0.4),
      }),
    );
    const d = r.alerts.find((a) => a.source === "divergencia");
    expect(d?.requiresChannel).toBe("signals");
    expect(r.blocked).toHaveLength(0);
  });

  test("signals NÃO observável → nenhum alerta de divergência, mas uma camada bloqueada", () => {
    const r = detectEarlyWarnings(
      baseInput({
        observableChannels: new Set(["pulses"]),
        reconciliation: divergentRecon("discurso_sem_pratica", 0.4),
      }),
    );
    expect(r.alerts.some((a) => a.source === "divergencia")).toBe(false);
    expect(r.blocked.map((b) => b.channel)).toContain("signals");
  });

  test("a camada bloqueada nunca expõe o dado (só a cegueira)", () => {
    const r = detectEarlyWarnings(baseInput({ observableChannels: new Set(["pulses"]) }));
    const b = r.blocked.find((x) => x.channel === "signals")!;
    expect(b.note).not.toContain("700");
    expect(b.note).not.toContain("Reconhecimento");
  });
});

// ─── Ordenação e contagem ─────────────────────────────────────────────────────

describe("early-warning — ordenação e contagem", () => {
  test("alertas saem ordenados por severidade (crítico primeiro)", () => {
    const r = detectEarlyWarnings(
      baseInput({
        trend: trend("caindo"), // crítico
        decliningPillars: [{ pillarId: "y", name: "Y", score: 600, drop: 12 }], // atenção
      }),
    );
    const sev = r.alerts.map((a) => a.severity);
    const firstAtt = sev.indexOf("atencao");
    const lastCrit = sev.lastIndexOf("critico");
    expect(lastCrit).toBeLessThan(firstAtt);
    expect(r.counts.critico).toBeGreaterThanOrEqual(1);
    expect(r.counts.atencao).toBeGreaterThanOrEqual(1);
  });
});
