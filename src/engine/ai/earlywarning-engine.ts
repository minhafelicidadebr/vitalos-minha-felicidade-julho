// Early-warning engine — puro. A camada de VIGILÂNCIA da FlorescerIA Proativa:
// NÃO computa métrica nova; COMPÕE as saídas de quatro motores já existentes —
// trend (curva longitudinal), signals (percepção × comportamento), consent
// (quais canais a IA pode observar) e priority (a melhor primeira ação) — para
// responder uma pergunta só: "onde a vitalidade está em risco AGORA, e qual o
// primeiro movimento?". Honestidade Fable 5: tendência, não promessa. Privacidade:
// alertas que dependem de um canal não consentido NÃO aparecem — viram um aviso de
// que existe uma camada cega, sem jamais revelar o dado. Nunca importa de domain/.

import type { Momentum, TrendResult } from "../trend/trend-engine";
import type { SignalsReconciliation } from "../signals/signals-engine";

export type Severity = "critico" | "atencao" | "observar";
export type WarningStatus = "em_risco" | "atencao" | "saudavel";
export type AlertSource = "momentum" | "lente" | "pilar" | "divergencia";

// Limiares (pts, exceto divergência em 0–1). Exportados para o teste fixar o contrato.
export const LENS_DROP_ATTN = 15;
export const LENS_DROP_CRIT = 40;
export const PILLAR_DROP_ATTN = 10;
export const PILLAR_DROP_CRIT = 20;
export const DIVERGENCE_ATTN = 0.25;
export const DIVERGENCE_CRIT = 0.4;

const SEVERITY_ORDER: Record<Severity, number> = { critico: 0, atencao: 1, observar: 2 };

export interface DecliningPillar {
  pillarId: string;
  name: string;
  score: number;
  drop: number; // pts perdidos desde o ciclo anterior (positivo = caiu)
}

export interface RecommendedMove {
  label: string;
  lift: number;
  isQuickWin: boolean;
  owner: string | null;
}

export interface RiskAlert {
  id: string;
  severity: Severity;
  source: AlertSource;
  title: string; // o que está acontecendo
  evidence: string; // o número que sustenta (agregado, k≥5)
  interpretation: string; // leitura honesta — tendência, não promessa
  recommendedMove: string | null; // primeira ação (compõe priority)
  targetRoute: string;
  requiresChannel?: string; // canal de observação que sustenta este alerta
}

export interface BlockedLayer {
  channel: string;
  title: string;
  note: string;
}

export interface EarlyWarningInput {
  trend: TrendResult;
  /** Reconciliação percepção×comportamento — só quando o canal signals é observável. */
  reconciliation: SignalsReconciliation | null;
  decliningPillars: DecliningPillar[];
  /** Melhor alavancagem disponível (priority-engine) — vira o "primeiro movimento". */
  topMove: RecommendedMove | null;
  /** Canais que a IA pode observar no agregado (consent-engine, nível org). */
  observableChannels: Set<string>;
}

export interface EarlyWarningResult {
  status: WarningStatus;
  momentum: Momentum;
  headline: string;
  alerts: RiskAlert[];
  blocked: BlockedLayer[];
  counts: Record<Severity, number>;
}

const MOMENTUM_LABEL: Record<Momentum, string> = {
  acelerando: "acelerando",
  subindo: "subindo",
  estavel: "estável",
  caindo: "em queda",
};

function moveText(move: RecommendedMove | null): string | null {
  if (!move) return null;
  const who = move.owner ? `, com ${move.owner} à frente` : "";
  const tag = move.isQuickWin ? " (vitória rápida)" : "";
  return `Primeiro movimento: ativar “${move.label}” (+${move.lift} pts esperados)${who}${tag}.`;
}

export function detectEarlyWarnings(input: EarlyWarningInput): EarlyWarningResult {
  const { trend, reconciliation, decliningPillars, topMove, observableChannels } = input;
  const alerts: RiskAlert[] = [];
  const blocked: BlockedLayer[] = [];
  const move = moveText(topMove);

  // 1) Momentum da curva inteira (trend-engine).
  if (trend.momentum === "caindo") {
    alerts.push({
      id: "ew-momentum",
      severity: "critico",
      source: "momentum",
      title: "Tendência geral em queda",
      evidence: `${trend.slopePerCycle} pts/ciclo na curva (${trend.firstIvo} → ${trend.lastIvo}).`,
      interpretation:
        "Queda sustentada na trajetória observada — tendência, não promessa. Reverter cedo custa menos do que recuperar depois.",
      recommendedMove: move,
      targetRoute: "/evolucao",
    });
  } else if (trend.momentum === "estavel" && trend.recentDelta < 0) {
    alerts.push({
      id: "ew-momentum",
      severity: "observar",
      source: "momentum",
      title: "Curva estagnada com recuo recente",
      evidence: `Último passo ${trend.recentDelta} pts; inclinação ${trend.slopePerCycle} pts/ciclo.`,
      interpretation:
        "Sem tendência clara, mas o passo recente recuou — observar no próximo ciclo.",
      recommendedMove: null,
      targetRoute: "/evolucao",
    });
  }

  // 2) Lente que mais perdeu força no período (trend-engine).
  const worst = trend.worstLens;
  if (worst && worst.delta <= -LENS_DROP_ATTN) {
    const severity: Severity = worst.delta <= -LENS_DROP_CRIT ? "critico" : "atencao";
    alerts.push({
      id: `ew-lente-${worst.id}`,
      severity,
      source: "lente",
      title: `Lente ${worst.name} perdendo força`,
      evidence: `${worst.delta} pts no período (${worst.first} → ${worst.last}).`,
      interpretation:
        "É a lente com a pior trajetória — concentrar a leitura de pilares aqui antes da próxima aferição.",
      recommendedMove: severity === "critico" ? move : null,
      targetRoute: "/ivo",
    });
  }

  // 3) Pilares em queda desde o ciclo anterior (IVO atual × anterior).
  for (const d of decliningPillars) {
    if (d.drop < PILLAR_DROP_ATTN) continue;
    const severity: Severity = d.drop >= PILLAR_DROP_CRIT ? "critico" : "atencao";
    alerts.push({
      id: `ew-pilar-${d.pillarId}`,
      severity,
      source: "pilar",
      title: `${d.name} em queda`,
      evidence: `Caiu ${d.drop} pts desde o ciclo anterior (agora ${d.score}).`,
      interpretation: "Sinal de percepção em deterioração — janela aberta para intervir.",
      recommendedMove: severity === "critico" ? move : null,
      targetRoute: "/prioridades",
    });
  }

  // 4) Divergência discurso × prática (signals-engine) — GATEADA por consentimento.
  if (observableChannels.has("signals")) {
    const top = reconciliation?.topDivergence ?? null;
    if (
      top &&
      top.divergence > DIVERGENCE_ATTN &&
      (top.quadrant === "discurso_sem_pratica" || top.quadrant === "lacuna_dupla")
    ) {
      const severity: Severity =
        top.quadrant === "lacuna_dupla" || top.divergence >= DIVERGENCE_CRIT
          ? "critico"
          : "atencao";
      alerts.push({
        id: `ew-divergencia-${top.pillarId}`,
        severity,
        source: "divergencia",
        title: `Discurso × prática divergem em ${top.pillarName}`,
        evidence: `Percepção ${top.perceptionScore}/1000 × comportamento ${top.behaviorValue}/100 (agregado, k≥5).`,
        interpretation:
          top.quadrant === "discurso_sem_pratica"
            ? "Diz-se que sim, mas o comportamento agregado não acompanha — a lacuna está na execução."
            : "Nem praticado nem percebido — prioridade de intervenção.",
        recommendedMove: severity === "critico" ? move : null,
        targetRoute: "/sinais",
        requiresChannel: "signals",
      });
    }
  } else {
    // Canal não consentido coletivamente: existe uma camada que a IA NÃO observa.
    // Mostramos a cegueira — nunca o dado.
    blocked.push({
      channel: "signals",
      title: "Camada de comportamento não observável",
      note: "Sinais Vivos não têm consentimento coletivo suficiente — divergências entre discurso e prática ficam invisíveis para a FlorescerIA, por princípio.",
    });
  }

  // Ordena por severidade (estável: preserva a ordem de geração nos empates).
  const sorted = alerts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => SEVERITY_ORDER[x.a.severity] - SEVERITY_ORDER[y.a.severity] || x.i - y.i)
    .map(({ a }) => a);

  const counts: Record<Severity, number> = { critico: 0, atencao: 0, observar: 0 };
  for (const a of sorted) counts[a.severity] += 1;

  const status: WarningStatus =
    counts.critico > 0 ? "em_risco" : counts.atencao > 0 ? "atencao" : "saudavel";

  const momentumLabel = MOMENTUM_LABEL[trend.momentum];
  const visibleCount = sorted.length;
  const headline =
    status === "saudavel"
      ? `Sem sinais de risco: a tendência está ${momentumLabel} e as divergências estão sob controle.`
      : status === "em_risco"
        ? `${visibleCount} ${visibleCount === 1 ? "sinal pede" : "sinais pedem"} atenção — a tendência geral está ${momentumLabel}.`
        : `${visibleCount} ${visibleCount === 1 ? "ponto" : "pontos"} de atenção — a tendência está ${momentumLabel}, sem risco crítico.`;

  return { status, momentum: trend.momentum, headline, alerts: sorted, blocked, counts };
}
