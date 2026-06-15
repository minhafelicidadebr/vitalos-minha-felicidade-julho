// Copiloto — copy de domínio para a FlorescerIA Proativa. As propostas em si
// vêm do agent-engine (compõe priority/evidence/IVO/season). Aqui só vivem
// rótulos, cores e textos institucionais.

import type { ProposalKind, ProposalUrgency } from "@/engine/ai/agent-engine";

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
