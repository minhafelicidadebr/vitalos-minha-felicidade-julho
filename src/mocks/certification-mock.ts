// Certification — copy de domínio para o Selo Empresa Viva. A elegibilidade é
// COMPUTADA pelo certification-engine a partir do arco real (IVO, evidência,
// consentimento, NR-1). Aqui só vivem rótulos, cores e textos institucionais,
// além dos fatos de Domínio B que ainda não têm motor próprio (trilha GRO).

import type { SealTier } from "@/engine/certification/certification-engine";

// Domínio B: prontidão da trilha GRO/NR-1 (evidências organizadas para o PGR).
// Em produção viria do módulo de SST; aqui é um fato declarado do mock.
export const DOMAIN_B_READY = true;

export const TIER_STYLE: Record<
  SealTier,
  { color: string; bg: string; ring: string; emoji: string }
> = {
  nao_elegivel: {
    color: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-900/40",
    ring: "ring-slate-300/50",
    emoji: "🌱",
  },
  em_jornada: {
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    ring: "ring-amber-300/50",
    emoji: "🌿",
  },
  empresa_viva: {
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    ring: "ring-emerald-400/60",
    emoji: "🌳",
  },
  referencia: {
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    ring: "ring-violet-400/60",
    emoji: "🏆",
  },
};

export const STATUS_STYLE: Record<string, { label: string; color: string; icon: string }> = {
  cumprido: { label: "Cumprido", color: "text-emerald-600 dark:text-emerald-400", icon: "✓" },
  parcial: { label: "Parcial", color: "text-amber-600 dark:text-amber-400", icon: "◐" },
  nao_cumprido: { label: "Pendente", color: "text-slate-500 dark:text-slate-400", icon: "○" },
};

export const SEAL_INTRO = {
  eyebrow: "Certificação · Selo Empresa Viva",
  title: "O selo que não se compra",
  lead:
    "A elegibilidade é computada ao vivo a partir do que a organização efetivamente fez — " +
    "mede com continuidade, atinge maturidade, e tem ao menos um experimento com efeito " +
    "medido pelo critério do Culture Lab. Reconhece sistema instalado e evidência registrada.",
  publicNote:
    "O Selo Empresa Viva é anual e auditável; pode ser exibido nas páginas de carreira. " +
    "Cada critério é rastreável até a sua evidência — um auditor consegue refazer a conta.",
  grantedNote: "Selo ativo. Exibível publicamente, com validade anual e trilha auditável.",
  pendingNote: "Selo ainda não concedido — abaixo está exatamente o que falta para conquistá-lo.",
};
