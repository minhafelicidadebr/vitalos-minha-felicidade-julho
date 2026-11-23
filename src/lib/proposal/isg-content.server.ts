// Proposta do Instituto Felicidade para Todos à ISG Participações · conteúdo canônico.
// Servido SOMENTE pela API autenticada (/api/proposta). Nada aqui entra em metadados públicos.
// Maturidade das etapas conferida em docs/vitalos/piloto/ (MO3, MO4, CHECKLIST 23/11, CONTINUIDADE).
// Ficha de fontes e classificações: docs/vitalos/proposta-isg/FICHA_REVISAO_2026-11-23.md
import type { JourneyStage, ProposalContent } from "@/features/proposal/types";

/** Única fonte do valor. Resumo, detalhamento, marcos e impressão derivam daqui. */
export const PROPOSAL_TOTAL = 60_000;
export const PROPOSAL_INSTALLMENTS = 5;
const installment = PROPOSAL_TOTAL / PROPOSAL_INSTALLMENTS;

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
    eyebrow: "Proposta à ISG Participações",
    title: "Da escuta das equipes às decisões que a empresa consegue acompanhar",
    subtitle:
      "O Instituto Felicidade para Todos propõe à ISG uma implantação acompanhada da jornada VitalOS, com cinco etapas, entregas verificáveis e uma contribuição técnica desenhada em conjunto.",
    primaryCta: "Agendar sessão de desenho da implantação",
    secondaryCta: "Ver o que está incluído",
    imageAlt:
      "Ilustração: quatro colegas em volta de uma mesa organizam cartões em branco durante uma conversa.",
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
      title: formatBRL(PROPOSAL_TOTAL),
      body: `Em ${PROPOSAL_INSTALLMENTS} parcelas de ${formatBRL(installment)}, cada uma vinculada a um marco aceito. Condição proposta para uma operação ou unidade a definir.`,
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
    title: "Sessão de desenho da implantação",
    goal: "Em cerca de uma hora, sair com a implantação desenhada e pronta para a decisão da ISG.",
    agenda: [
      "Escolher a unidade inicial",
      "Nomear o patrocinador e o responsável técnico",
      "Confirmar o escopo de cada etapa",
      "Encaixar os cinco marcos no calendário",
      "Combinar a contribuição técnica da ISG",
    ],
    howTo: "Para agendar, responda à mensagem em que recebeu esta proposta.",
    contact: null,
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
      claim: "Ilustração de abertura",
      kind: "exemplo",
      source: "Imagem gerada, pessoas fictícias",
    },
  ],
};

export const getIsgProposal = (): ProposalContent => ISG_PROPOSAL;
