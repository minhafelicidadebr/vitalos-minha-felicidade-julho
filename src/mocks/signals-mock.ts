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
