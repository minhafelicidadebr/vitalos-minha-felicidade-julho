// Proposta do Instituto Felicidade para Todos à ISG Participações · conteúdo canônico.
// Servido SOMENTE pela API autenticada (/api/proposta). Nada aqui entra em metadados públicos.
// Maturidade das etapas conferida em docs/vitalos/piloto/ (MO3, MO4, CHECKLIST 23/11, CONTINUIDADE).
// Ficha de fontes e classificações: docs/vitalos/proposta-isg/FICHA_REVISAO_2026-11-23.md
import type { JourneyStage, ProposalContent, ProposalMetric } from "@/features/proposal/types";
import { resolveCommercialClaim } from "@/domain/commercial-claims/commercial-claims-resolver";
import { COMMERCIAL_SURFACE_IDS as S } from "@/domain/commercial-claims/commercial-surface-ids";

/** Única fonte do valor. Resumo, detalhamento, marcos e impressão derivam daqui. */
export const PROPOSAL_TOTAL = 60_000;
export const PROPOSAL_INSTALLMENTS = 5;
/** Cada etapa dura três meses (informação do fundador). O "por mês" é equivalente derivado, não cobrança. */
export const PROPOSAL_MONTHS_PER_STAGE = 3;
const installment = PROPOSAL_TOTAL / PROPOSAL_INSTALLMENTS;
export const PROPOSAL_MONTHLY_EQUIVALENT = installment / PROPOSAL_MONTHS_PER_STAGE;

// Afirmações quantitativas e científicas vêm do Commercial Claims Registry (fail-closed: sem claim,
// o bloco some e a página mostra o estado vazio). Autorização: PROPOSTA_V2_FOUNDER_APPROVAL_2026-11-23.
type Resolve = typeof resolveCommercialClaim;
const claimText = (resolve: Resolve, claimId: string, surfaceId: string, variant: string) =>
  resolve({ claimId, surfaceId, variant }).text;
const claimNumber = (resolve: Resolve, claimId: string, surfaceId: string, variant: string) => {
  const n = Number(claimText(resolve, claimId, surfaceId, variant));
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Número inválido em ${claimId}/${variant}`);
  return n;
};
const attempt = <T>(build: () => T): T | null => {
  try {
    return build();
  } catch {
    return null;
  }
};

export function resolveTrack(resolve: Resolve = resolveCommercialClaim): ProposalContent["track"] {
  const id = "CLAIM-COM-PROPOSAL-INSTITUTE-TRACK-001";
  const surface = S.PROPOSAL_INSTITUTE_TRACK_RECORD;
  return attempt(() => {
    const n = (v: string) => claimNumber(resolve, id, surface, v);
    const items: ProposalMetric[] = [
      {
        value: n("responses"),
        prefix: "+",
        label: "respostas em pesquisas FIB",
        detail: "Sobretudo em contextos educacionais",
      },
      {
        value: n("municipalities"),
        prefix: "+",
        label: "municípios alcançados",
        detail: "Em todo o Brasil",
      },
      {
        value: n("schools"),
        prefix: "+",
        label: "instituições de ensino",
        detail: "Mobilizadas pelo Instituto",
      },
      {
        value: n("projects"),
        prefix: "+",
        label: "projetos escolares",
        detail: "Classificados segundo os ODS",
      },
    ];
    return {
      title: "O que o Instituto já fez",
      intro: claimText(resolve, id, surface, "scope"),
      items,
      record: claimText(resolve, id, surface, "record"),
      scope: "Não são resultados em empresas e não preveem resultado na ISG.",
      source: claimText(resolve, id, surface, "default"),
    };
  });
}

export function resolveLiterature(
  resolve: Resolve = resolveCommercialClaim,
): ProposalContent["literature"] {
  const id = "CLAIM-COM-PRESENTATION-BENEFITS-001";
  const surface = S.PROPOSAL_LITERATURE_EVIDENCE;
  return attempt(() => {
    claimText(resolve, id, surface, "default");
    return {
      title: "O que a literatura mostra",
      intro:
        "Duas associações publicadas pelo Gallup, para dimensionar o tema. São correlações em outros contextos, não promessas para a ISG.",
      items: [
        {
          value: claimNumber(resolve, id, surface, "burnout"),
          suffix: "× menor",
          label: "probabilidade de sentir burnout",
          detail: "Pessoas prosperando em quatro ou mais elementos de bem-estar · Gallup, 2019",
        },
        {
          value: claimNumber(resolve, id, surface, "turnover"),
          prefix: "−",
          suffix: "%",
          label: "rotatividade em unidades engajadas",
          detail: "Organizações de baixa rotatividade · Gallup, 2017",
        },
      ],
      note: "Correlação não é causa. Os números descrevem as populações estudadas.",
    };
  });
}

export function resolvePlaybook(
  resolve: Resolve = resolveCommercialClaim,
): ProposalContent["science"]["playbook"] {
  const id = "CLAIM-COM-PROPOSAL-PLAYBOOK-001";
  const surface = S.PROPOSAL_SCIENCE_ANCHORS;
  return attempt(() => ({
    statement: claimText(resolve, id, surface, "default"),
    detail: claimText(resolve, id, surface, "detail"),
    attribution: claimText(resolve, id, surface, "attribution"),
    studies: claimNumber(resolve, id, surface, "studies"),
    edition: claimText(resolve, id, surface, "edition"),
    source: {
      label: "Work Wellbeing Playbook · Wellbeing Research Centre",
      href: "https://wellbeing.hmc.ox.ac.uk/publications/work-wellbeing-playbook/",
    },
  }));
}

const governed = (claimId: string, variant: string, fallback: string) =>
  attempt(() => claimText(resolveCommercialClaim, claimId, S.PROPOSAL_SCIENCE_ANCHORS, variant)) ??
  fallback;

export const formatBRL = (value: number) =>
  "R$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const stages: JourneyStage[] = [
  {
    id: "q1",
    code: "Q1",
    verb: "Preparar",
    deliverable:
      "Plano de escuta, comunicado às equipes e revisão da preparação com os responsáveis da ISG.",
    condition:
      "A coleta depende da liberação do instrumento e das condições metodológicas; não faz parte deste marco.",
    installment,
    participants: ["Patrocinador da direção", "RH", "SST", "Responsável pela unidade inicial"],
    instituteActivities: [
      "Desenhar o plano de escuta com finalidade, público e calendário",
      "Redigir o comunicado às equipes: participação voluntária, privacidade e o que acontece depois",
      "Conduzir a revisão da preparação com RH e SST e registrar os ajustes",
    ],
    acceptance: [
      "Plano de escuta aprovado pelo patrocinador",
      "Comunicado revisado por RH e SST",
      "Registro da revisão da preparação, com pendências nomeadas",
    ],
    capabilities: [
      {
        label: "Comunicado, controles de preparação e revisão técnica de SST",
        availability: "plataforma",
      },
      {
        label: "Coleta da escuta desta etapa",
        availability: "condicionada",
        decision:
          "A coleta aguarda a ficha oficial do instrumento e a permissão de uso. Se forem liberadas durante o programa, as partes decidem incluí-la por aditivo de escopo ou mantê-la fora; o marco Q1 não depende disso.",
      },
    ],
  },
  {
    id: "q2",
    code: "Q2",
    verb: "Agir e devolver",
    deliverable:
      "Priorização, plano com responsável e acompanhamento, apoio à liderança e devolutiva coletiva.",
    condition: "Conforme os fluxos habilitados no ambiente da ISG.",
    installment,
    participants: ["RH", "Liderança da unidade", "Equipes da unidade inicial"],
    instituteActivities: [
      "Analisar a leitura coletiva e preparar a conversa de priorização",
      "Facilitar a escolha de prioridades e o plano com responsável, prazo e revisão",
      "Mentorar a liderança durante a execução",
      "Preparar e facilitar a devolutiva coletiva à equipe",
    ],
    acceptance: [
      "Prioridades escolhidas e registradas",
      "Cada ação com responsável, prazo e estado atualizado",
      "Devolutiva coletiva realizada com a equipe",
    ],
    capabilities: [
      {
        label: "Leitura coletiva, plano, designação, execução, revisão e devolutiva",
        availability: "plataforma",
      },
      {
        label: "Convite das pessoas no ambiente publicado",
        availability: "condicionada",
        decision:
          "O convite de ponta a ponta ainda será verificado no ambiente publicado. A etapa começa só depois dessa verificação; se ela não ocorrer até a data acordada, as partes escolhem entre adiar o marco ou ajustar o escopo.",
      },
    ],
  },
  {
    id: "q3",
    code: "Q3",
    verb: "Praticar",
    deliverable:
      "Oficina, prática voluntária de vitalidade e decisão de manter, adaptar ou encerrar a prática.",
    condition: "Mensuração em separado; não incluída neste marco.",
    installment,
    participants: ["Equipes da unidade inicial (adesão voluntária)", "Liderança", "RH"],
    instituteActivities: [
      "Conduzir a oficina de abertura da prática",
      "Acompanhar a prática voluntária e recolher percepções de uso",
      "Facilitar a decisão de manter, adaptar ou encerrar",
    ],
    acceptance: [
      "Oficina realizada",
      "Prática oferecida com adesão voluntária",
      "Decisão registrada: manter, adaptar ou encerrar",
    ],
    capabilities: [
      { label: "Oficina e acompanhamento da prática", availability: "instituto" },
      {
        label: "Prática de vitalidade dentro da plataforma",
        availability: "condicionada",
        decision:
          "A unidade de prática está aprovada só para uso local. Se a extensão não for aprovada a tempo, a prática é conduzida pelo Instituto em material próprio, sem mudar o marco.",
      },
      {
        label: "Mensuração da vitalidade",
        availability: "condicionada",
        decision:
          "Fora desta proposta. Depende de fonte metodológica aprovada e de acordo próprio.",
      },
    ],
  },
  {
    id: "q4",
    code: "Q4",
    verb: "Refletir e aplicar",
    deliverable:
      "Oficina e roteiro individual para aplicar uma força pessoal no trabalho, com privacidade explícita.",
    condition: "Sem painel coletivo: o roteiro pertence a cada pessoa.",
    installment,
    participants: ["Pessoas da unidade inicial (adesão voluntária)", "Liderança"],
    instituteActivities: [
      "Conduzir a oficina de reflexão sobre forças pessoais",
      "Entregar o roteiro individual de aplicação de uma força no trabalho",
      "Explicar, antes de começar, quem vê o quê: a ISG não recebe respostas individuais",
    ],
    acceptance: [
      "Oficina realizada",
      "Roteiro disponível a cada participante",
      "Regra de privacidade comunicada por escrito",
    ],
    capabilities: [
      { label: "Oficina e roteiro individual em material do Instituto", availability: "instituto" },
      {
        label: "Roteiro de prática dentro da plataforma",
        availability: "condicionada",
        decision:
          "A prática de forças ainda não está na versão principal da plataforma. Sem ela, o roteiro segue em material do Instituto; nenhuma leitura coletiva desta etapa está incluída.",
      },
    ],
  },
  {
    id: "q5",
    code: "Q5",
    verb: "Consolidar",
    deliverable:
      "Síntese dos registros disponíveis e reunião executiva para decidir o próximo ciclo.",
    condition: "A síntese descreve execução; não afirma efeito.",
    installment,
    participants: ["Patrocinador da direção", "RH", "SST", "Liderança", "Tecnologia"],
    instituteActivities: [
      "Consolidar o que foi feito, o que foi devolvido e o que ficou pendente",
      "Conduzir a reunião executiva de encerramento",
      "Recomendar o escopo do próximo ciclo",
    ],
    acceptance: [
      "Síntese executiva entregue",
      "Reunião executiva realizada",
      "Decisão sobre o próximo ciclo registrada",
    ],
    capabilities: [
      { label: "Síntese executiva e reunião", availability: "instituto" },
      {
        label: "Relatório do ciclo gerado pela plataforma",
        availability: "condicionada",
        decision:
          "Hoje o relatório do ciclo existe só como extrato demonstrativo, com dados fictícios. Se for mostrado, virá identificado assim; a síntese da ISG é preparada pelo Instituto.",
      },
    ],
  },
];

export const ISG_PROPOSAL: ProposalContent = {
  version: "Versão para revisão · 23/11/2026",
  date: "23/11/2026",
  recipient: "ISG Participações",
  hero: {
    eyebrow:
      "Proposta à ISG Participações · VitalOS, sistema operacional da vitalidade organizacional",
    title: "Ciência da felicidade aplicada ao trabalho, com decisões que a empresa acompanha",
    subtitle:
      "O Instituto Felicidade para Todos propõe à ISG uma implantação acompanhada em cinco etapas de três meses: escuta com método, ações com responsável, devolutiva às equipes e registros que podem apoiar o relato de sustentabilidade da empresa.",
    primaryCta: "Combinar a reunião de implantação",
    secondaryCta: "Ver o que está incluído",
    imageAlt:
      "Ilustração: quatro colegas conversam em volta de uma mesa de madeira, em ambiente de trabalho com plantas e luz natural.",
    imageCaption: "Ilustração gerada · pessoas fictícias",
  },
  summary: [
    {
      label: "O que a ISG recebe",
      title: "Uma implantação acompanhada em cinco etapas",
      body: "Escuta, prioridades, ações com responsável e devolutiva às equipes, numa operação ou unidade escolhida pela ISG. Cada etapa termina com uma entrega que a ISG aceita ou devolve.",
    },
    {
      label: "Quanto investe",
      title: `${formatBRL(installment)} por etapa`,
      body: `Cada etapa dura ${PROPOSAL_MONTHS_PER_STAGE} meses e é paga após o aceite do seu marco: o equivalente a cerca de ${formatBRL(PROPOSAL_MONTHLY_EQUIVALENT)} por mês. Total do programa, em ${PROPOSAL_INSTALLMENTS} etapas: ${formatBRL(PROPOSAL_TOTAL)}.`,
    },
    {
      label: "O que o Instituto entrega",
      title: "Método, facilitação e acompanhamento",
      body: "Coordenação científica e análise, educação e facilitação, implantação e engajamento, com a plataforma VitalOS conforme o escopo acordado.",
    },
    {
      label: "Contribuição esperada da ISG",
      title: "Contexto da operação e olhar técnico",
      body: "Patrocínio, responsáveis por área e, a negociar, 40 horas de contribuição técnica para revisar a experiência e apontar melhorias.",
    },
  ],
  opening: {
    question:
      "Depois de ouvir as equipes, como sabemos o que virou ação e o que ainda precisa de decisão?",
    note: "Não partimos de nenhum problema interno da ISG. São três dificuldades comuns depois de uma escuta.",
    difficulties: [
      {
        title: "Quem faz o quê",
        body: "A escuta termina com temas importantes, mas sem dono, prazo ou critério de revisão.",
      },
      {
        title: "Devolver à equipe",
        body: "As pessoas responderam e não sabem o que aconteceu depois. A próxima escuta encontra menos disposição.",
      },
      {
        title: "Um registro que a direção interpreta",
        body: "O que foi decidido e feito fica espalhado em atas e mensagens, difícil de acompanhar e de comparar.",
      },
    ],
  },
  why: {
    parties: [
      {
        name: "Instituto Felicidade para Todos",
        role: "Método, facilitação e acompanhamento",
        body: "Conduz a jornada, prepara cada conversa e responde pelas entregas de cada marco.",
      },
      {
        name: "VitalOS",
        role: "Plataforma da jornada",
        body: "Organiza os fluxos disponíveis e guarda os registros: prioridades, ações, responsáveis, estados e devolutivas.",
      },
      {
        name: "ISG",
        role: "Contexto da operação e capacidade técnica",
        body: "Conhece a operação, escolhe a unidade inicial e pode revisar a experiência com olhar de quem implanta tecnologia e gestão.",
      },
    ],
    affinity: {
      body: "A ISG comunica publicamente gestão de portfólios, projetos e processos, gerenciamento da realização de benefícios, integração, painéis de BI, gestão de pessoas e cultura organizacional. A proposta é aplicar essa mesma disciplina à gestão do bem-estar: decisão com responsável, acompanhamento e registro.",
      source: { label: "isgsa.com.br", href: "https://www.isgsa.com.br/" },
      checked: "Consultado em 23/11/2026",
    },
    window:
      "Agora: escolher a unidade inicial e encaixar as cinco etapas no calendário da ISG, sem disputar espaço com períodos críticos da operação.",
  },
  scenario: {
    title: "Exemplo fictício · passagem de informações entre turnos",
    context:
      "Uma equipe de serviços tecnológicos atende clientes em turnos. Na troca de turno, informações sobre chamados em andamento se perdem e o trabalho é refeito.",
    steps: [
      {
        label: "Escuta coletiva",
        body: "A equipe responde à escuta. A leitura é coletiva e só aparece para grupos com pelo menos 5 respostas.",
      },
      {
        label: "Prioridade",
        body: "Liderança e RH escolhem um tema: a passagem de informações entre turnos.",
      },
      {
        label: "Ação com responsável",
        body: "Uma lista de passagem de turno é testada por quatro semanas, com responsável, prazo e revisão quinzenal.",
      },
      {
        label: "Devolutiva",
        body: "A equipe ouve o que foi escutado, o que foi decidido, o que foi feito e o que ainda não se sabe.",
      },
    ],
    record: [
      { field: "Ação", value: "Testar lista de passagem de turno" },
      { field: "Responsável", value: "Coordenação do turno da noite (cargo fictício)" },
      { field: "Prazo", value: "4 semanas, revisão quinzenal" },
      { field: "Estado", value: "Execução registrada" },
      { field: "Efeito", value: "Não avaliado" },
    ],
    missing: [
      "Uma linha de base registrada antes da ação",
      "Um indicador acordado, como chamados reabertos por falha na passagem",
      "Um período de comparação e o registro do que mais mudou ao mesmo tempo",
      "Um protocolo de avaliação próprio, combinado antes de começar",
    ],
  },
  journey: {
    intro:
      "Cada etapa tem um verbo, uma entrega que a ISG pode aceitar e uma condição dita com clareza. Cada marco aceito libera uma parcela.",
    sharedCondition:
      "Condição comum a tudo que roda na plataforma: verificar o convite de ponta a ponta no ambiente publicado antes de convidar as equipes.",
    stages,
  },
  indicators: {
    operational: [
      {
        title: "Conclusão de tarefas por perfil",
        body: "Quanto das tarefas previstas para RH, liderança e equipes foi concluído em cada etapa.",
      },
      {
        title: "Execução registrada",
        body: "Quantas ações têm responsável, prazo e estado atualizado até a revisão combinada.",
      },
      {
        title: "Devolutiva realizada",
        body: "Se a devolutiva coletiva aconteceu no prazo acordado com a equipe.",
      },
      {
        title: "Compreensão do processo",
        body: "Se as pessoas sabem dizer o que aconteceu com a escuta, numa pergunta curta ao fim da etapa.",
      },
    ],
    effect:
      "Avaliar efeito, por exemplo menos retrabalho ou mais bem-estar, é outra pergunta. Exige linha de base, indicador, período de comparação e protocolo próprio. Não está incluído nesta proposta e pode ser desenhado em conjunto.",
  },
  investment: {
    total: PROPOSAL_TOTAL,
    installments: PROPOSAL_INSTALLMENTS,
    monthsPerStage: PROPOSAL_MONTHS_PER_STAGE,
    scope: "Para uma operação ou unidade a definir na sessão de desenho.",
    composition: [
      "Implantação acompanhada das cinco etapas",
      "Plataforma VitalOS conforme o escopo acordado",
      "Análise para priorização e síntese executiva",
      "Comunicação com as equipes",
      "Facilitação de oficinas e devolutiva",
      "Mentoria da liderança",
    ],
    quantities: [
      "Proposta: uma oficina de cerca de 2 horas no Q3 e outra no Q4",
      "Proposta: quatro encontros de mentoria de 1 hora com a liderança no Q2",
      "Proposta: unidade com pelo menos 5 pessoas por grupo de leitura, para que a leitura coletiva possa aparecer",
    ],
    terms: [
      "Cada parcela é faturada depois do aceite do marco correspondente",
      "O valor por mês é só um equivalente para comparação: o faturamento é por etapa, não mensal",
      "Calendário proposto: cinco etapas sequenciais de três meses, a confirmar na reunião de implantação",
      "Quantidades de encontros, horas e participantes são propostas até a confirmação",
      "Regra de guarda e descarte dos dados acordada antes do início da coleta",
    ],
  },
  counterpart: {
    hours: 40,
    intro:
      "Ponto de negociação: entregas, calendário e formato dependem de acordo na sessão de desenho.",
    deliverables: [
      {
        title: "Revisão de arquitetura ou integrações",
        body: "Olhar técnico sobre como a plataforma se encaixaria no ambiente da ISG.",
      },
      {
        title: "Revisão de usabilidade por perfil",
        body: "Percurso de RH, liderança e equipes, com os pontos de atrito encontrados.",
      },
      {
        title: "Parecer de encerramento",
        body: "Melhorias priorizadas para as próximas implantações do Instituto.",
      },
    ],
    caseUse:
      "Caso anonimizado: o Instituto pode registrar aprendizados da implantação sem identificar a ISG, a unidade ou as pessoas. O que entra e quem revisa ficam combinados por escrito.",
    externalUse:
      "Uso externo de nome, marca ou depoimento da ISG: só com aprovação própria, em decisão separada. Não é condição desta proposta.",
  },
  roles: [
    {
      title: "Coordenação científica e análise",
      deliverables:
        "Plano de escuta (Q1), análise para priorização (Q2), critérios de aceite e síntese executiva (Q5).",
    },
    {
      title: "Educação e facilitação",
      deliverables:
        "Apoio à liderança e devolutiva (Q2), oficinas de prática (Q3) e de forças (Q4).",
    },
    {
      title: "Implantação e engajamento",
      deliverables:
        "Comunicado e convites (Q1–Q2), configuração conforme escopo, acompanhamento e canal de dúvidas.",
    },
  ],
  responsibilities: [
    {
      party: "Direção",
      group: "isg",
      does: "Patrocina, aprova o escopo e participa da reunião executiva do Q5.",
      effort: "Proposta: cerca de 1 hora por marco",
    },
    {
      party: "RH",
      group: "isg",
      does: "Coordena a unidade inicial, aprova o comunicado e acompanha as ações.",
      effort: "Proposta: 2 a 3 horas por semana nas etapas ativas",
    },
    {
      party: "SST",
      group: "isg",
      does: "Revisa a preparação do Q1 dentro da sua competência técnica.",
      effort: "Proposta: cerca de 4 horas no Q1",
    },
    {
      party: "Liderança da unidade",
      group: "isg",
      does: "Prioriza com a equipe, responde pelas ações e participa da devolutiva.",
      effort: "Proposta: cerca de 1 hora por semana no Q2",
    },
    {
      party: "Tecnologia",
      group: "isg",
      does: "Revisa a experiência e as integrações (contribuição técnica).",
      effort: "A negociar: 40 horas no programa",
    },
    {
      party: "Instituto",
      group: "instituto",
      does: "Conduz as cinco etapas, entrega cada marco e mantém o canal de dúvidas.",
      effort: "Incluído no investimento",
    },
  ],
  conditions: [
    "O apoio à SST é educativo e de preparação: não substitui o profissional habilitado, não constitui avaliação de riscos para fins normativos e não confere conformidade com normas.",
    "Nenhum recorte com menos de 5 respostas aparece. Respostas individuais não são entregues à ISG.",
    "A participação das pessoas é voluntária, com saída livre.",
    "A proposta não promete efeito sobre bem-estar, produtividade ou retorno financeiro.",
  ],
  nextSession: {
    title: "Reunião de implantação",
    goal: "Uma sessão de desenho de cerca de uma hora, para sair com a implantação desenhada e pronta para a decisão da ISG.",
    agenda: [
      "Escolher a unidade inicial",
      "Nomear o patrocinador e o responsável técnico",
      "Confirmar o escopo de cada etapa",
      "Encaixar os cinco marcos no calendário",
      "Combinar a contribuição técnica da ISG",
    ],
    howTo:
      "Para combinar, responda à mensagem em que recebeu esta proposta indicando duas opções de data e horário.",
    note: "Combinar a reunião não confirma a contratação nem inicia o projeto. Valor, quantidades e condições continuam como proposta e estimativa até a aprovação das duas partes.",
    contact: null,
  },
  track: resolveTrack(),
  literature: resolveLiterature(),
  science: {
    title: "Ancorado na ciência do bem-estar",
    intro:
      "As intervenções, os conteúdos e as atividades de educação desta proposta se apoiam em referências da psicologia positiva e da ciência do bem-estar no trabalho. Cada referência aparece com o papel que cumpre aqui e o seu limite.",
    playbook: resolvePlaybook(),
    anchors: [
      {
        id: "playbook",
        icon: "book",
        name: "Work Wellbeing Playbook",
        what: "Evidências sobre intervenções de bem-estar no trabalho, organizadas em fatores-chave.",
        inProposal: "Ancora as intervenções do Q2 e a prática do Q3.",
        status: "ancora",
        statusLabel: "Âncora das intervenções",
      },
      {
        id: "perma",
        icon: "heart",
        name: "PERMA · Martin Seligman",
        what: "Modelo de bem-estar com emoções positivas, engajamento, relações, sentido e realização.",
        inProposal:
          "Orienta os conteúdos da prática de vitalidade (Q3). A mensuração fica fora desta proposta.",
        status: "referencia",
        statusLabel: "Referência teórica",
      },
      {
        id: "via",
        icon: "compass",
        name: "Forças de caráter · VIA (Peterson e Seligman)",
        what: governed(
          "CLAIM-COM-VIAT-EXPLORATORY-001",
          "default",
          "Leitura exploratória das forças percebidas no trabalho.",
        ),
        inProposal: "Base da oficina e do roteiro individual do Q4, com privacidade.",
        status: "referencia",
        statusLabel: "Uso exploratório",
      },
      {
        id: "fib",
        icon: "sun",
        name: "Felicidade Interna Bruta (FIB)",
        what: "Abordagem de felicidade coletiva, inspirada no índice do Butão, que o Instituto aplica em pesquisas com escolas e territórios.",
        inProposal:
          "Dá a linguagem de bem-estar coletivo e de sustentabilidade usada na escuta e na devolutiva.",
        status: "referencia",
        statusLabel: "Experiência do Instituto",
      },
      {
        id: "q1",
        icon: "shield",
        name: governed(
          "CLAIM-COM-INSTRUMENT-LABEL-001",
          "short",
          "Mapeamento psicossocial estruturado",
        ),
        what: "Escuta de fatores psicossociais do trabalho, de apoio ao trabalho de SST, com resultados só para grupos de pelo menos 5 respostas.",
        inProposal: "O Q1 prepara a escuta. A coleta depende da liberação do instrumento.",
        status: "condicionado",
        statusLabel: "Coleta condicionada",
      },
    ],
    principle:
      "Como recomenda o Guia Prático, não há fórmula mágica: combinar ações da organização, dos grupos e das pessoas funciona melhor que uma ação isolada. É assim que as cinco etapas se encadeiam.",
  },
  externalCase: {
    title: "Um caso brasileiro: a felicidade entrou na conversa de gestão",
    summary:
      "A Heineken Brasil descreve uma Jornada da Felicidade que combina escuta recorrente, o modelo PERMA-V e ações sobre a experiência de trabalhar. É um exemplo externo para conhecer e aprender, não um resultado desta proposta.",
    practices: [
      {
        label: "Escuta",
        body: "Pesquisas recorrentes sobre emoções, relações, engajamento, significado e vitalidade.",
      },
      { label: "Prática", body: "Os resultados orientam mentorias e conversas com as equipes." },
      { label: "Reconhecimento", body: "Programa reconhecido pela Você RH em 2026." },
    ],
    note: "Caso empresarial externo, descrito pela própria empresa e pela publicação responsável pela premiação. Sem relação com o Instituto ou com a VitalOS.",
    sources: [
      {
        label: "Heineken Brasil · felicidade e positividade",
        href: "https://www.heinekenbrasil.com.br/noticias/felicidade-x-positividade",
      },
      {
        label: "Você RH · Jornada da Felicidade · 2026",
        href: "https://vocerh.abril.com.br/melhores-empresas/conheca-os-cases-vencedores-de-futuro-do-bem-estar-no-premio-da-voce-rh/",
      },
    ],
  },
  bands: [
    {
      id: "faixa-escutar",
      image: "compreender",
      kicker: "Escutar com método",
      title: "Ouvir as equipes de um jeito que elas reconheçam",
      summary:
        "Escuta coletiva, com finalidade clara, participação voluntária e leitura só para grupos com pelo menos 5 respostas.",
      imageAlt:
        "Ilustração: quatro colegas atentos a uma colega que fala, em volta de uma mesa com um documento.",
    },
    {
      id: "faixa-agir",
      image: "agir",
      kicker: "Agir e devolver",
      title: "Do que foi ouvido ao que foi decidido, com nome e prazo",
      summary:
        "Prioridades escolhidas em conjunto, ações com responsável e revisão, e uma devolutiva que fecha o ciclo com a equipe.",
      imageAlt:
        "Ilustração: colegas organizam cartões em branco sobre a mesa para decidir uma ordem.",
    },
    {
      id: "faixa-consolidar",
      image: "evoluir",
      kicker: "Consolidar",
      title: "Uma síntese que a direção consegue interpretar",
      summary:
        "O que foi feito, o que foi devolvido e o que ficou pendente, para decidir o próximo ciclo com informação.",
      imageAlt:
        "Ilustração: duas profissionais leem um documento juntas enquanto dois colegas acompanham.",
    },
  ],
  schedule: {
    title: "Quinze meses, cinco etapas de três meses",
    intro:
      "Cada etapa tem um ritmo de três meses: abrir, praticar e fechar com um marco que a ISG aceita. O calendário é relativo; as datas saem da reunião de implantação.",
    note: "Calendário proposto. Atividades, encontros e horas são estimativas até a confirmação. Trechos tracejados dependem de liberação.",
    monthsPerStage: PROPOSAL_MONTHS_PER_STAGE,
    stages: [
      {
        id: "q1",
        months: [
          {
            label: "Mês 1",
            focus: "Alinhar",
            activities: [
              "Reunião de abertura com o patrocinador",
              "Unidade inicial e responsáveis definidos",
              "Plano de escuta: finalidade, público e calendário",
            ],
          },
          {
            label: "Mês 2",
            focus: "Comunicar",
            activities: [
              "Comunicado às equipes: participação voluntária e privacidade",
              "Revisão da preparação com RH e SST",
            ],
          },
          {
            label: "Mês 3",
            focus: "Revisar",
            activities: ["Registro da revisão, com pendências nomeadas"],
            conditioned: "Coleta da escuta, só se o instrumento for liberado (aditivo)",
            milestone: "Aceite do marco Q1",
          },
        ],
      },
      {
        id: "q2",
        months: [
          {
            label: "Mês 4",
            focus: "Ouvir e ler",
            activities: [
              "Escuta da equipe e leitura coletiva",
              "Conversa de priorização preparada pelo Instituto",
            ],
            conditioned: "Convite verificado no ambiente publicado antes de começar",
          },
          {
            label: "Mês 5",
            focus: "Decidir e agir",
            activities: [
              "Priorização com liderança e RH",
              "Plano com responsável, prazo e revisão",
              "Mentoria da liderança",
            ],
          },
          {
            label: "Mês 6",
            focus: "Devolver",
            activities: ["Revisão das ações", "Devolutiva coletiva à equipe"],
            milestone: "Aceite do marco Q2",
          },
        ],
      },
      {
        id: "q3",
        months: [
          {
            label: "Mês 7",
            focus: "Abrir",
            activities: [
              "Oficina de abertura da prática (cerca de 2 horas)",
              "Convite à prática voluntária",
            ],
          },
          {
            label: "Mês 8",
            focus: "Praticar",
            activities: [
              "Prática voluntária acompanhada",
              "Percepções de uso recolhidas pelo Instituto",
            ],
          },
          {
            label: "Mês 9",
            focus: "Decidir",
            activities: ["Manter, adaptar ou encerrar a prática"],
            milestone: "Aceite do marco Q3",
          },
        ],
      },
      {
        id: "q4",
        months: [
          {
            label: "Mês 10",
            focus: "Refletir",
            activities: [
              "Oficina sobre forças pessoais (cerca de 2 horas)",
              "Regra de privacidade por escrito",
            ],
          },
          {
            label: "Mês 11",
            focus: "Aplicar",
            activities: [
              "Roteiro individual para aplicar uma força no trabalho",
              "Apoio do Instituto, sem respostas individuais para a ISG",
            ],
          },
          {
            label: "Mês 12",
            focus: "Fechar",
            activities: ["Conversa de encerramento com o que cada pessoa escolher compartilhar"],
            milestone: "Aceite do marco Q4",
          },
        ],
      },
      {
        id: "q5",
        months: [
          {
            label: "Mês 13",
            focus: "Reunir",
            activities: ["Registros consolidados: feito, devolvido e pendente"],
          },
          {
            label: "Mês 14",
            focus: "Sintetizar",
            activities: ["Síntese executiva", "Revisão com RH, SST, liderança e tecnologia"],
          },
          {
            label: "Mês 15",
            focus: "Decidir",
            activities: ["Reunião executiva sobre o próximo ciclo"],
            milestone: "Aceite do marco Q5",
          },
        ],
      },
    ],
  },
  team: {
    title: "Quem conduz",
    intro:
      "Três cofundadores do Instituto, com atuação em pesquisa de felicidade, educação e projetos de impacto.",
    members: [
      {
        name: "João Paulo Brandão Barboza",
        label: "Cofundador · Cientista da Felicidade",
        bio: "Atua há mais de 12 anos entre Felicidade Interna Bruta (FIB), ODS e práticas ESG. Gestor de inovação no Instituto, lidera a estruturação das soluções ESG. Membro da Rede de Pesquisas Científica da Felicidade.",
        role: "Coordenação científica e análise",
        photo: "joao-paulo",
      },
      {
        name: "Ana Paula Daltoé Inglêz Barbalho",
        label: "Cofundadora",
        bio: "Bióloga, advogada e graduanda em Ciência da Felicidade. Coordenou o projeto FIB 2030, de felicidade e ODS no Brasil, e coliderou em 2023 a pesquisa de felicidade escolar do projeto Estudantes de Atitude.",
        role: "Implantação e engajamento",
        photo: "ana-paula",
      },
      {
        name: "Olga Mariano",
        label: "Cofundadora · Facilitadora em FIB",
        bio: "Mais de 13 anos em inovação social, impacto comunitário e gestão de projetos. Facilitadora certificada em Teoria U e no Sistema FIB-Feliciência. Cocriou a Pesquisa FIB Educacional e coordenou a 1ª Pesquisa de Felicidade de Brasília.",
        role: "Educação e facilitação",
        photo: "olga",
      },
    ],
    note: "Papéis propostos, a confirmar na reunião de implantação.",
  },
  sources: [
    {
      claim:
        "Áreas que a ISG comunica (gestão de projetos, BRM, integração, BI, gestão de pessoas, cultura organizacional)",
      kind: "fato",
      source: "isgsa.com.br, consultado em 23/11/2026",
    },
    {
      claim: "Maturidade de Q1 a Q5",
      kind: "fato",
      source: "Registros internos do piloto VitalOS (23/11/2026)",
    },
    {
      claim: "Pergunta de abertura e três dificuldades",
      kind: "hipotese",
      source: "Hipótese do Instituto para a conversa",
    },
    {
      claim: "Valor, parcelas, marcos, quantidades e esforço interno",
      kind: "condicao",
      source: "Condição comercial proposta, a confirmar",
    },
    { claim: "Contribuição técnica de 40 horas", kind: "condicao", source: "Ponto de negociação" },
    {
      claim: "Equipe, turnos, registro de execução e cargos do exemplo",
      kind: "exemplo",
      source: "Exemplo fictício",
    },
    {
      claim: "Ilustrações de abertura e das faixas de seção",
      kind: "exemplo",
      source: "Imagens geradas, pessoas fictícias (procedência: PRESENTATION_V4_IMAGES_2026-11-17)",
    },
    {
      claim: "Números do Instituto e recorde de aplicação da pesquisa FIB",
      kind: "fato",
      source:
        "Dados do Instituto, confirmados pelo fundador em 23/11/2026; sem certificação externa apresentada",
    },
    {
      claim: "Ancoragem no Work Wellbeing Playbook (Guia Prático, mais de 3.000 estudos)",
      kind: "fato",
      source:
        "Wellbeing Research Centre, Universidade de Oxford; atribuição à obra, sem parceria ou endosso",
    },
    {
      claim: "Associações do Gallup (burnout e rotatividade)",
      kind: "fato",
      source: "Gallup 2019 e 2017; correlações, não promessa",
    },
    {
      claim: "Caso Heineken Brasil",
      kind: "fato",
      source: "Relato da empresa e Você RH 2026; caso externo, sem relação com o Instituto",
    },
    {
      claim: "Calendário de 15 meses e equivalente mensal",
      kind: "condicao",
      source: "Etapas de três meses informadas pelo fundador; datas a confirmar",
    },
    {
      claim: "Bios e fotos dos cofundadores",
      kind: "fato",
      source:
        "Textos de apresentação das próprias pessoas e fotos enviadas pelo fundador; uso autorizado em 23/11/2026",
    },
  ],
};

export const getIsgProposal = (): ProposalContent => ISG_PROPOSAL;
