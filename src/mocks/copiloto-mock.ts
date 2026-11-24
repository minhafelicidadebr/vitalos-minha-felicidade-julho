// Copiloto — copy de domínio para a FlorescerIA Proativa. As propostas em si
// vêm do agent-engine (compõe priority/evidence/IVO/season). Aqui só vivem
// rótulos, cores e textos institucionais.

import type { ProposalKind, ProposalUrgency } from "@/engine/ai/agent-engine";
import type { Severity, WarningStatus, AlertSource } from "@/engine/ai/earlywarning-engine";

export const URGENCY_COPY: Record<ProposalUrgency, { label: string; color: string; bg: string }> = {
  alta: {
    label: "Alta",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  media: {
    label: "Média",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  baixa: {
    label: "Baixa",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/30",
  },
};

export const KIND_COPY: Record<ProposalKind, { label: string; icon: string; cta: string }> = {
  ativar_prioridade: { label: "Ativar prioridade", icon: "🎯", cta: "Aprovar e desenhar" },
  escalar_experimento: { label: "Escalar experimento", icon: "🚀", cta: "Aprovar escala" },
  revisar_experimento: { label: "Revisar experimento", icon: "🔧", cta: "Aprovar revisão" },
  agir_pilar_em_queda: { label: "Pilar em queda", icon: "📉", cta: "Aprovar e priorizar" },
  agir_sinal: { label: "Sinal Vivo", icon: "📡", cta: "Aprovar investigação" },
  aproveitar_fase: { label: "Janela de fase", icon: "⏱️", cta: "Aprovar foco" },
};

// ─── Vigilância · Alerta Precoce (earlywarning-engine) ────────────────────────

export const VIGILANCIA_INTRO = {
  eyebrow: "Vigilância · Alerta Precoce",
  title: "Onde a vitalidade está em risco agora",
  lead:
    "Antes de propor, a FlorescerIA observa: a curva longitudinal, a lente mais fraca, " +
    "os pilares em queda e — quando há consentimento coletivo — a divergência entre discurso " +
    "e prática. Tudo no agregado (k≥5). Tendência, não promessa.",
};

export const STATUS_COPY: Record<WarningStatus, { label: string; color: string; dot: string }> = {
  em_risco: { label: "Em risco", color: "text-red-700 dark:text-red-300", dot: "#dc2626" },
  atencao: { label: "Atenção", color: "text-amber-700 dark:text-amber-300", dot: "#d97706" },
  saudavel: { label: "Saudável", color: "text-emerald-700 dark:text-emerald-300", dot: "#059669" },
};

export const SEVERITY_COPY: Record<
  Severity,
  { label: string; color: string; bg: string; dot: string }
> = {
  critico: {
    label: "Crítico",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
    dot: "#dc2626",
  },
  atencao: {
    label: "Atenção",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    dot: "#d97706",
  },
  observar: {
    label: "Observar",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    dot: "#0284c7",
  },
};

export const SOURCE_COPY: Record<AlertSource, { icon: string; label: string }> = {
  momentum: { icon: "📉", label: "Tendência" },
  lente: { icon: "🔭", label: "Lente" },
  pilar: { icon: "📊", label: "Pilar" },
  divergencia: { icon: "📡", label: "Discurso × Prática" },
};

// ─── Laço M.E.T.E. · Propor → Entregar → Medir (orchestration-engine) ─────────

export const LACO_INTRO = {
  eyebrow: "Laço da Matriz IFT · da proposta à prova",
  title: "Aprovar não é o fim — é o começo do ciclo",
  lead:
    "A maior alavancagem de hoje vira um plano de entrega concreto (nudges, com opt-in " +
    "e teto de frequência respeitados) e, depois, um experimento mensurável. Mensurar → " +
    "Educar → Transformar → Evoluir, fechado.",
  stages: {
    propor: "Propor",
    entregar: "Entregar",
    medir: "Medir",
  },
};

export const COPILOTO_INTRO = {
  eyebrow: "FlorescerIA · Modo Proativo",
  title: "A copilota que propõe — você decide",
  lead:
    "A FlorescerIA observa apenas agregados e propõe os próximos passos de maior valor. " +
    "Nada acontece sem a sua aprovação: cada proposta é um convite, não uma ação. " +
    "Toda decisão fica registrada na trilha de auditoria.",
  approvedNote:
    "Aprovado — registrado na trilha de auditoria (mock). Em produção, seguiria para execução com responsável e prazo.",
  dismissedNote:
    "Dispensado — registrado na trilha de auditoria (mock). A FlorescerIA não insiste.",
};
