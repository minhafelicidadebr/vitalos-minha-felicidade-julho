import type { SignalAggregate } from "../engine/signals/signals-engine";

// Platform-event aggregates only. One signal with n=3 to prove k-anonymity.
export const SIGNALS: SignalAggregate[] = [
  {
    signalId: "sig-kudos-flow",
    label: "Fluxo de kudos entre áreas",
    value: 64,
    deltaVsPrev: 12,
    n: 374,
    relatedPillarId: "reconhecimento_pares",
  },
  {
    signalId: "sig-pausas",
    label: "Adesão a pausas registradas",
    value: 31,
    deltaVsPrev: -4,
    n: 198,
    relatedPillarId: "energia_vitalidade",
  },
  {
    signalId: "sig-rituais",
    label: "Participação em rituais de equipe",
    value: 72,
    deltaVsPrev: 8,
    n: 287,
    relatedPillarId: "comunicacao_pertencimento",
  },
  {
    signalId: "sig-planos",
    label: "Velocidade de resposta a planos de ação",
    value: 58,
    deltaVsPrev: 15,
    n: 41,
    relatedPillarId: "cuidado_ativo",
  },
  {
    signalId: "sig-noturno",
    label: "Adesão do turno noturno (Sul)",
    value: 0,
    deltaVsPrev: 0,
    n: 3, // < 5 → oculto
    relatedPillarId: "condicoes_carga",
  },
];

// Pairs for the perception × behavior panel (perception = IVO pillar score)
export const PERCEPTION_BEHAVIOR_INPUT = [
  {
    pillarId: "reconhecimento_pares",
    pillarName: "Reconhecimento entre Pares",
    perceptionScore: 550,
    behaviorValue: 64,
  },
  {
    pillarId: "energia_vitalidade",
    pillarName: "Energia & Vitalidade",
    perceptionScore: 625,
    behaviorValue: 31,
  },
  {
    pillarId: "comunicacao_pertencimento",
    pillarName: "Comunicação & Pertencimento",
    perceptionScore: 650,
    behaviorValue: 72,
  },
  {
    pillarId: "cuidado_ativo",
    pillarName: "Cuidado Ativo da Liderança",
    perceptionScore: 525,
    behaviorValue: 58,
  },
] as const;

export const SIGNALS_CONSENT_NOTE =
  "Sinais Vivos usam apenas eventos da própria plataforma (kudos, rituais, planos), agregados com 5+ pessoas e mediante consentimento individual. Nunca: conteúdo de mensagens, e-mails ou produtividade individual.";

export const QUADRANT_COPY: Record<
  string,
  { label: string; color: string; bg: string; action: string }
> = {
  praticado_e_sentido: {
    label: "Praticado e sentido",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    action: "Manter e celebrar — percepção e comportamento andam juntos.",
  },
  discurso_sem_pratica: {
    label: "Discurso sem prática",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    action: "A percepção supera o comportamento — fechar a lacuna na execução.",
  },
  pratica_nao_sentida: {
    label: "Prática não percebida",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    action: "O comportamento existe, mas não é sentido — comunicar e dar visibilidade.",
  },
  lacuna_dupla: {
    label: "Lacuna dupla",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
    action: "Nem praticado nem sentido — prioridade de intervenção.",
  },
};

export const SIGNALS_INTRO = {
  eyebrow: "Sinais Vivos · Motor 1 · Percepção × Comportamento",
  title: "O que se diz × o que se faz",
  lead:
    "O IVO mede a percepção; os Sinais Vivos medem o comportamento agregado da própria " +
    "plataforma. A interseção — não cada metade — é a inteligência: percepção sem comportamento " +
    "é opinião, comportamento sem percepção é vigilância.",
  lockedTitle: "Sinais Vivos aguardam consentimento coletivo",
  lockedNote:
    "Este painel só liga quando adesão suficiente da organização consente os Sinais Vivos " +
    "(agregado, k≥5). Sem consentimento coletivo, não há observação comportamental — por princípio.",
  disclaimer:
    "Leitura indicativa por interseção de duas fontes agregadas (k≥5). Sinais Vivos jamais usam " +
    "conteúdo de mensagens, e-mails ou produtividade individual — apenas eventos consentidos da " +
    "plataforma. Divergência não é culpa: é uma pergunta a investigar.",
};
