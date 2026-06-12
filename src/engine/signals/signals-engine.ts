// Sinais Vivos — behavioral telemetry from PLATFORM EVENTS ONLY, aggregated
// with k>=5. Never message content, never individual productivity.

export const SIGNALS_K_MIN = 5;

export interface SignalAggregate {
  signalId: string;
  label: string;
  /** 0–100 — adesão/intensidade agregada do comportamento */
  value: number;
  deltaVsPrev: number;
  n: number;
  relatedPillarId: string;
}

export interface PerceptionBehaviorPair {
  pillarId: string;
  pillarName: string;
  perceptionScore: number; // IVO pillar score 0–1000
  behaviorValue: number; // signal 0–100
  reading: "coerente" | "divergente";
  note: string;
}

/** Hides aggregates below k-anonymity. */
export function visibleSignals(signals: SignalAggregate[]): SignalAggregate[] {
  return signals.filter((s) => s.n >= SIGNALS_K_MIN);
}

/**
 * Cross perception (IVO pillar score) with behavior (signal value).
 * Both normalized to 0–1; divergence > threshold flags a "divergente" pair —
 * which is where the most valuable questions live.
 */
export function crossPerceptionBehavior(
  pairs: Array<{
    pillarId: string;
    pillarName: string;
    perceptionScore: number;
    behaviorValue: number;
  }>,
  divergenceThreshold = 0.25,
): PerceptionBehaviorPair[] {
  return pairs.map((p) => {
    const perception = p.perceptionScore / 1000;
    const behavior = p.behaviorValue / 100;
    const divergent = Math.abs(perception - behavior) > divergenceThreshold;
    return {
      ...p,
      reading: divergent ? "divergente" : "coerente",
      note: divergent
        ? perception > behavior
          ? "Percepção alta, comportamento baixo — risco de discurso sem prática."
          : "Comportamento alto, percepção baixa — prática existe, mas não é sentida. Comunicar melhor?"
        : "Percepção e comportamento andam juntos.",
    };
  });
}
