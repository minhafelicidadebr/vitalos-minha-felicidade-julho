// Trend — ciclos históricos de demonstração. Gera 5 ciclos trimestrais a partir
// do ciclo-base (ivoCurrentCycle), aplicando uma deriva crescente às médias.
// A rota roda o MESMO calculateIVO sobre cada ciclo (compõe o motor IVO) para
// produzir a curva longitudinal real. Dados fictícios, determinísticos.

import { ivoCurrentCycle } from "./ivo-mock";
import type { IVOInput } from "@/engine/index/ivo-engine";

const CYCLE_LABELS = ["2025-T2", "2025-T3", "2025-T4", "2026-T1", "2026-T2"];
// Deriva crescente: a organização evolui ao longo do ano.
const DRIFT = [0.88, 0.92, 0.96, 1.0, 1.05];

function makeCycle(label: string, mult: number): IVOInput {
  return {
    organizationId: ivoCurrentCycle.organizationId,
    cycleId: label,
    aggregates: ivoCurrentCycle.aggregates.map((a) => ({
      ...a,
      mean: Math.max(1, Math.min(5, Math.round(a.mean * mult * 100) / 100)),
    })),
  };
}

export const TREND_CYCLES: IVOInput[] = CYCLE_LABELS.map((label, i) => makeCycle(label, DRIFT[i]!));

export const MOMENTUM_COPY: Record<string, { label: string; color: string; icon: string }> = {
  acelerando: { label: "Acelerando", color: "text-violet-700 dark:text-violet-300", icon: "🚀" },
  subindo: { label: "Subindo", color: "text-emerald-700 dark:text-emerald-300", icon: "📈" },
  estavel: { label: "Estável", color: "text-sky-700 dark:text-sky-300", icon: "➖" },
  caindo: { label: "Caindo", color: "text-red-700 dark:text-red-300", icon: "📉" },
};

export const TREND_INTRO = {
  eyebrow: "Evolução · Curva Longitudinal",
  title: "Como a vitalidade evoluiu de verdade",
  lead:
    "Não é projeção por alavancas — é o track record. O mesmo IVO, medido ciclo a ciclo, " +
    "revela a trajetória real da organização e para onde a tendência aponta.",
  disclaimer:
    "A projeção do próximo ciclo é uma extrapolação linear da tendência observada — orientativa, " +
    "não promessa. O futuro depende das ações tomadas (veja o Simulador de Trajetória).",
};
