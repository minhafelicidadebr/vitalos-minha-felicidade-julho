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

// ─── Reconciliação por quadrantes (Motor 1 — a interseção é inteligência) ─────
// "Percepção sem comportamento é opinião; comportamento sem percepção é
//  vigilância. A interseção, agregada com k≥5, é inteligência." (genesis)

export type Quadrant =
  | "praticado_e_sentido" // percepção alta + comportamento alto
  | "discurso_sem_pratica" // percepção alta + comportamento baixo
  | "pratica_nao_sentida" // percepção baixa + comportamento alto
  | "lacuna_dupla"; // percepção baixa + comportamento baixo

export interface ReconciledPair {
  pillarId: string;
  pillarName: string;
  perceptionScore: number; // 0–1000
  behaviorValue: number; // 0–100
  perceptionNorm: number; // 0–1
  behaviorNorm: number; // 0–1
  quadrant: Quadrant;
  divergence: number; // |percepção − comportamento|, 0–1
}

export interface SignalsReconciliation {
  pairs: ReconciledPair[];
  /** 0–100 — quão alinhados percepção e comportamento estão (100 = idênticos). */
  alignmentIndex: number;
  byQuadrant: Record<Quadrant, number>;
  divergentCount: number;
  topDivergence: ReconciledPair | null;
}

function quadrantFor(perceptionNorm: number, behaviorNorm: number, t: number): Quadrant {
  const pHigh = perceptionNorm >= t;
  const bHigh = behaviorNorm >= t;
  if (pHigh && bHigh) return "praticado_e_sentido";
  if (pHigh && !bHigh) return "discurso_sem_pratica";
  if (!pHigh && bHigh) return "pratica_nao_sentida";
  return "lacuna_dupla";
}

/**
 * Reconcilia percepção (IVO) × comportamento (Sinais Vivos) em quatro quadrantes
 * e num índice de alinhamento agregado. A divergência é onde moram as perguntas
 * mais valiosas: "diz que sim, mas não faz" ou "faz, mas não é sentido".
 */
export function reconcileSignals(
  pairs: Array<{
    pillarId: string;
    pillarName: string;
    perceptionScore: number;
    behaviorValue: number;
  }>,
  opts: { highThreshold?: number; divergenceThreshold?: number } = {},
): SignalsReconciliation {
  const t = opts.highThreshold ?? 0.5;
  const divThreshold = opts.divergenceThreshold ?? 0.25;

  const reconciled: ReconciledPair[] = pairs.map((p) => {
    const perceptionNorm = p.perceptionScore / 1000;
    const behaviorNorm = p.behaviorValue / 100;
    return {
      pillarId: p.pillarId,
      pillarName: p.pillarName,
      perceptionScore: p.perceptionScore,
      behaviorValue: p.behaviorValue,
      perceptionNorm,
      behaviorNorm,
      quadrant: quadrantFor(perceptionNorm, behaviorNorm, t),
      divergence: Math.abs(perceptionNorm - behaviorNorm),
    };
  });

  const byQuadrant: Record<Quadrant, number> = {
    praticado_e_sentido: 0,
    discurso_sem_pratica: 0,
    pratica_nao_sentida: 0,
    lacuna_dupla: 0,
  };
  for (const r of reconciled) byQuadrant[r.quadrant] += 1;

  const meanDivergence =
    reconciled.length > 0
      ? reconciled.reduce((s, r) => s + r.divergence, 0) / reconciled.length
      : 0;

  const topDivergence =
    reconciled.length > 0
      ? reconciled.reduce((best, r) => (r.divergence > best.divergence ? r : best))
      : null;

  return {
    pairs: reconciled,
    alignmentIndex: Math.round((1 - meanDivergence) * 100),
    byQuadrant,
    divergentCount: reconciled.filter((r) => r.divergence > divThreshold).length,
    topDivergence,
  };
}
