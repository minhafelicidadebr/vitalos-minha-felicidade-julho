// Experiment — config de domínio (não é engine). Casos de experimento do Culture
// Lab ligados às alavancas do Playbook e aos protocolos existentes. Os vereditos
// NÃO são escritos à mão: o evidence-engine os computa a partir dos dados
// observados (antes/depois/comparação/n). Tudo fictício e agregado.

import type { EvidenceInput, Verdict } from "@/engine/lab/evidence-engine";

export type ExperimentStatus = "concluido" | "em_curso" | "planejado";

export interface ExperimentCase {
  id: string;
  leverId: string; // alavanca do Playbook (FORECAST_LEVERS)
  protocolId?: string; // protocolo do Culture Lab (lab-mock PROTOCOLS)
  pilotTeams: string[];
  startedLabel: string;
  weeksElapsed: number;
  durationWeeks: number;
  status: ExperimentStatus;
  observed?: EvidenceInput; // presente quando concluído (ou parcial em curso)
}

// Casos: 2 concluídos (1 confirmado, 1 que superou), 1 em curso, 1 protegido por
// k-anonimato (piloto pequeno). Os demais "a iniciar" vêm das prioridades vivas.
export const EXPERIMENT_CASES: ExperimentCase[] = [
  {
    id: "exp-reconhecimento",
    leverId: "reconhecimento",
    protocolId: "pr-kudos-ritual",
    pilotTeams: ["Atendimento", "Logística"],
    startedLabel: "Nov 2025",
    weeksElapsed: 6,
    durationWeeks: 6,
    status: "concluido",
    // hipótese da alavanca ~ +12 a +25; observado net +28 → superou
    observed: {
      before: 547,
      after: 581,
      comparisonDelta: 6,
      n: 23,
      expectedBand: { low: 12, high: 25 },
    },
  },
  {
    id: "exp-seguranca",
    leverId: "seguranca_voz",
    protocolId: "pr-pergunta-segura",
    pilotTeams: ["Plataforma", "Dados"],
    startedLabel: "Fev 2026",
    weeksElapsed: 4,
    durationWeeks: 4,
    status: "concluido",
    // observado net +16 dentro da faixa +12 a +22 → confirmado
    observed: {
      before: 512,
      after: 534,
      comparisonDelta: 6,
      n: 18,
      expectedBand: { low: 12, high: 22 },
    },
  },
  {
    id: "exp-energia",
    leverId: "energia_carga",
    protocolId: "pr-pausas-protegidas",
    pilotTeams: ["Experiência do Usuário", "Suporte"],
    startedLabel: "Mai 2026",
    weeksElapsed: 3,
    durationWeeks: 4,
    status: "em_curso",
  },
  {
    id: "exp-clareza",
    leverId: "lideranca_justica",
    protocolId: "pr-clareza-prioridades",
    pilotTeams: ["Fechamento (Sul)"],
    startedLabel: "Mar 2026",
    weeksElapsed: 4,
    durationWeeks: 4,
    status: "concluido",
    // piloto pequeno: n=4 → protegido por k-anonimato
    observed: {
      before: 498,
      after: 520,
      comparisonDelta: 5,
      n: 4,
      expectedBand: { low: 10, high: 20 },
    },
  },
];

export const VERDICT_COPY: Record<
  Verdict,
  { label: string; color: string; bg: string; icon: string }
> = {
  superou: {
    label: "Superou a hipótese",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-950/40",
    icon: "🚀",
  },
  confirmado: {
    label: "Hipótese confirmada",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    icon: "✅",
  },
  parcial: {
    label: "Efeito parcial",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    icon: "🌤️",
  },
  efeito_positivo: {
    label: "Efeito positivo",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: "📈",
  },
  sem_efeito: {
    label: "Sem efeito detectável",
    color: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-900/40",
    icon: "➖",
  },
  protegido: {
    label: "Protegido (k-anonimato)",
    color: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-900/40",
    icon: "🔒",
  },
};

export const STATUS_COPY: Record<ExperimentStatus, { label: string; color: string }> = {
  concluido: { label: "Concluído", color: "text-emerald-600 dark:text-emerald-400" },
  em_curso: { label: "Em curso", color: "text-sky-600 dark:text-sky-400" },
  planejado: { label: "A iniciar", color: "text-muted-foreground" },
};

export const TIER_COPY: Record<string, string> = {
  oculto: "oculto",
  exploratório: "exploratório (n pequeno)",
  indicativo: "indicativo",
  robusto: "robusto",
};

export const EXPERIMENT_INTRO = {
  eyebrow: "Culture Lab · Camada de Evidência",
  title: "Da prioridade à prova",
  lead:
    "Cada prioridade vira um experimento falsificável: uma hipótese de ganho, um piloto " +
    "com grupo de comparação, e um veredito computado por diferença-em-diferenças. " +
    "É assim que a cultura deixa de ser opinião e vira evidência auditável.",
  disclaimer:
    "Os vereditos são estimativas por diferença-em-diferenças (piloto vs. comparação na mesma " +
    "janela), não ensaios controlados — confundidores são possíveis e a confiança é qualitativa, " +
    "por tamanho de amostra. Resultados com n<5 ficam protegidos por k-anonimato. Cada experimento " +
    "concluído alimenta o repositório do que funciona nesta cultura.",
};
