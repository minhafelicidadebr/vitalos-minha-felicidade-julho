// Ajuda por card de /embaixadorias (v0.2.0 · proposta editorial).
//
// Cada card responde à dúvida daquela frente: propósito, exemplo concreto de participação,
// próximo passo e por que o tema importa no ciclo. Só regra de produto: nenhuma frente tem
// claim científico aprovado para esta tela, então nenhuma ajuda cita estudo. Guardiões da
// Voz Segura mantém a entrada própria (fluxo, papéis e Manual do MTE) de contextual-help.ts.

import type { ContextualHelpEntry, HelpRoleVariant } from "@/engine/help/contextual-help-engine";
import { HELP_CONTENT_VERSION, HELP_GUARDIOES_VOZ_SEGURA } from "./contextual-help";

interface CardSeed {
  id: string;
  name: string;
  pillar: string;
  /** O que é, em uma frase. */
  purpose: string;
  example: string;
  nextStep: string;
  link?: HelpRoleVariant["link"];
  /** Variações por papel só quando a tarefa muda. */
  roles?: Partial<Record<"colaborador" | "lideranca" | "rh", HelpRoleVariant>>;
  /** Limites próprios da frente, além dos comuns. */
  limits?: string[];
}

const COMMON_LIMIT = "Participar é voluntário, e sair não gera consequência nem entra em avaliação.";

function cardHelp(seed: CardSeed): ContextualHelpEntry {
  return {
    id: `help.embaixadorias.${seed.id}`,
    version: HELP_CONTENT_VERSION,
    route: "/embaixadorias",
    anchor: `card-${seed.id}`,
    question: `Como funciona ${seed.name}?`,
    summary: seed.purpose,
    demoNotice:
      "As contagens e as missões deste card são de exemplo. Marcar Participar muda só esta página.",
    afterwards:
      "Ao participar, você entra no grupo desta frente e combina com ele a próxima missão. Nesta demonstração, nada é registrado.",
    dataScope:
      "O card mostra só números de exemplo: quantas pessoas participam e quantas missões estão abertas. Nenhum nome aparece.",
    whyItMatters: `${seed.pillar} é um dos temas que o VitalOS acompanha nos ciclos. A frente leva esse tema para a prática da equipe entre uma medição e outra.`,
    roles: {
      geral: { example: seed.example, nextStep: seed.nextStep, link: seed.link },
      ...seed.roles,
    },
    limits: [COMMON_LIMIT, ...(seed.limits ?? [])],
    sources: [
      {
        nature: "produto",
        title: "Embaixadorias do Florescimento",
        supports: `Propósito de ${seed.name}, missões e contagens de exemplo desta tela.`,
        locator: "Dados de demonstração do VitalOS",
      },
    ],
    review: { status: "proposta_editorial", reviewer: null, date: "2026-11-21" },
  };
}

const FORMAL_CHANNELS = "Relatos de risco ou de conduta seguem os canais formais da organização.";

const SEEDS: CardSeed[] = [
  {
    id: "amb-energia",
    name: "Guardiões da Energia",
    pillar: "Energia e vitalidade",
    purpose:
      "Frente voluntária que ajuda a equipe a combinar pausas reais e rituais de recuperação, para que o cansaço não seja visto como sinal de dedicação.",
    example:
      "Você propõe à sua equipe uma pausa de dez minutos sem reunião no meio da tarde e combina com o grupo como testar a ideia por duas semanas.",
    nextStep: "Escolha uma das missões abertas e combine com o grupo quem testa e quando.",
  },
  {
    id: "amb-proposito",
    name: "Tecelões de Propósito",
    pillar: "Propósito e significado",
    purpose: "Frente voluntária que ajuda as pessoas a ligar a tarefa do dia a quem ela beneficia.",
    example:
      "Numa reunião de equipe, você convida alguém a contar como uma entrega recente ajudou um cliente ou um colega de outra área.",
    nextStep: "Traga ao grupo um exemplo da sua área para a próxima roda de conversa.",
  },
  {
    id: "amb-aprendizagem",
    name: "Cultivadores de Maestria",
    pillar: "Crescimento e maestria",
    purpose: "Frente voluntária que organiza comunidades de prática e trocas de conhecimento entre áreas.",
    example:
      "Você oferece meia hora para mostrar a colegas de outra área uma ferramenta que usa bem, ou pede para aprender uma.",
    nextStep: "Diga ao grupo o que você pode ensinar e o que gostaria de aprender.",
    link: { to: "/academia", label: "Ver as trilhas da Academia" },
  },
  {
    id: "amb-equilibrio",
    name: "Defensores do Equilíbrio",
    pillar: "Equilíbrio e autonomia",
    purpose:
      "Frente voluntária que ajuda as equipes a combinar horários de resposta e agendas que respeitem a vida fora do trabalho.",
    example:
      "Você sugere à equipe um acordo simples, como não marcar reuniões depois de certo horário, e o grupo acompanha se o acordo se mantém.",
    nextStep: "Leve ao grupo um combinado de agenda que faria diferença na sua equipe.",
    limits: ["Acordos de equipe não mudam jornada nem contrato: seguem as políticas da empresa."],
  },
  {
    id: "amb-cooperacao",
    name: "Pontes de Confiança",
    pillar: "Cooperação e confiança",
    purpose:
      "Frente voluntária que aproxima equipes que dependem uma da outra, para resolverem juntas o que trava entre as áreas.",
    example:
      "Duas equipes que trocam muitas tarefas marcam uma conversa curta para combinar como avisar quando algo vai atrasar.",
    nextStep: "Indique ao grupo uma passagem entre áreas que costuma travar.",
  },
  {
    id: "amb-reconhecimento",
    name: "Multiplicadores de Kudos",
    pillar: "Reconhecimento entre pares",
    purpose:
      "Frente voluntária que estimula o reconhecimento específico entre colegas: dizer o que a pessoa fez e por que ajudou.",
    example:
      "Em vez de dizer só “bom trabalho”, você agradece a um colega dizendo qual entrega ajudou e de que forma.",
    nextStep: "Combine com o grupo um momento da semana para reconhecer alguém de outra área.",
    limits: ["Reconhecimento não vira ranking e não entra em avaliação de desempenho."],
  },
  {
    id: "amb-pertencimento",
    name: "Anfitriões da Comunidade",
    pillar: "Comunicação e pertencimento",
    purpose: "Frente voluntária que cuida da acolhida, para que ninguém fique isolado se não quiser.",
    example:
      "Você convida uma pessoa recém-chegada para almoçar ou tomar um café com a equipe na primeira semana.",
    nextStep: "Ofereça-se ao grupo para acolher a próxima pessoa que chegar à sua área.",
  },
  {
    id: "amb-clareza",
    name: "Tradutores de Clareza",
    pillar: "Clareza e direção",
    purpose: "Frente voluntária que ajuda a tornar prioridades e comunicados fáceis de entender.",
    example:
      "Depois de um comunicado importante, você ajuda a equipe a resumir em três linhas o que muda na rotina e leva as dúvidas a quem enviou.",
    nextStep: "Leve ao grupo um comunicado recente que gerou dúvida.",
  },
  {
    id: "amb-justica",
    name: "Sentinelas da Coerência",
    pillar: "Justiça e coerência",
    purpose:
      "Frente voluntária que ajuda a explicar regras e decisões coletivas, para que fique claro o que vale para todos.",
    example:
      "O grupo reúne dúvidas frequentes sobre um processo, como a escala de férias, e pede à área responsável uma explicação para todos.",
    nextStep:
      "Esta frente não tem missão aberta no exemplo. Você pode sugerir ao grupo um tema que precise de explicação.",
    limits: ["Não julga casos individuais nem revisa decisões sobre pessoas.", FORMAL_CHANNELS],
  },
  {
    id: "amb-desenvolvimento",
    name: "Mentores do Caminho",
    pillar: "Desenvolvimento de pessoas",
    purpose: "Frente voluntária de mentoria e de conversas de carreira entre colegas.",
    example:
      "Uma pessoa mais experiente conversa uma vez por mês com alguém que quer conhecer outra área.",
    nextStep: "Diga ao grupo se você quer ser mentor, receber mentoria ou as duas coisas.",
    limits: ["A mentoria voluntária não substitui o processo de desenvolvimento da empresa nem interfere em promoção."],
  },
  {
    id: "amb-cuidado",
    name: "Rede do Cuidado Ativo",
    pillar: "Cuidado ativo da liderança",
    purpose:
      "Frente voluntária que ajuda lideranças a perceber cedo sinais de sobrecarga na equipe e a abrir uma conversa de apoio.",
    example:
      "Você pode participar como colega, ajudando o grupo a pensar em formas simples de apoio. A frente é voltada sobretudo a quem lidera.",
    nextStep: "Conte ao grupo que tipo de apoio da liderança faz diferença para você.",
    roles: {
      lideranca: {
        example:
          "Um grupo de líderes troca experiências sobre como perguntar à equipe como as pessoas estão, de um jeito que abra conversa de verdade.",
        nextStep: "Leve ao grupo uma situação recente em que você gostaria de ter agido antes.",
      },
    },
    limits: ["Não substitui apoio profissional de saúde.", FORMAL_CHANNELS],
  },
  {
    id: "amb-condicoes",
    name: "Vigias da Carga Justa",
    pillar: "Condições e carga de trabalho",
    purpose:
      "Frente voluntária que ajuda as equipes a conversar sobre o volume de trabalho e a repactuar prioridades sem medo.",
    example:
      "Quando surge uma demanda urgente, a equipe lista o que está em andamento e decide junta o que pode esperar.",
    nextStep: "Proponha ao grupo um jeito simples de a equipe avisar quando a carga passou do limite.",
    limits: [
      "Não substitui a avaliação de riscos do PGR nem o trabalho de SST.",
      "Relatos de risco seguem os canais formais da organização.",
    ],
  },
  {
    id: "amb-inclusao",
    name: "Construtores de Equidade",
    pillar: "Inclusão, equidade e diversidade",
    purpose:
      "Frente voluntária que ajuda a ampliar oportunidades e o respeito às diferentes identidades no dia a dia.",
    example:
      "O grupo revisa com a área responsável se os convites para projetos e treinamentos chegam a todas as pessoas da equipe.",
    nextStep: "Traga ao grupo uma prática da sua área que poderia incluir mais gente.",
    limits: ["Situações de discriminação ou assédio seguem os canais formais da organização."],
  },
  {
    id: "amb-sustentabilidade",
    name: "Agentes do Bem-Comum",
    pillar: "Sustentabilidade e bem comum",
    purpose: "Frente voluntária que organiza voluntariado, ações de impacto social e cuidado ambiental.",
    example:
      "O grupo organiza uma campanha de arrecadação ou uma manhã de voluntariado e convida outras áreas.",
    nextStep: "Sugira ao grupo uma causa local em que a equipe possa ajudar.",
  },
];

/** Ajuda de cada um dos 15 cards, por id da embaixadoria. */
export const EMBAIXADORIA_CARD_HELP: Readonly<Record<string, ContextualHelpEntry>> = {
  ...Object.fromEntries(SEEDS.map((s) => [s.id, cardHelp(s)])),
  "amb-seguranca": HELP_GUARDIOES_VOZ_SEGURA,
};
