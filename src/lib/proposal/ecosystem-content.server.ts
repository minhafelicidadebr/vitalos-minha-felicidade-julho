// Proposta para o ecossistema ISG · conteúdo canônico das 24 cenas.
// Servido SOMENTE pela API autenticada (/api/proposta/ecossistema), com a mesma sessão da proposta
// original. Redação final: super prompt "VitalOS ISG Ecossistema", seção 4 (25/11/2026).
// Regras: sem cifras internas da FIB-T; sem valor, horas ou calendário do cenário anterior;
// números só com claim aprovado no Commercial Claims Registry (fail-closed → alternativa literal).
import type { EcoScene, EcosystemProposal } from "@/features/proposal/ecosystem/types";
import { resolveCommercialClaim } from "@/domain/commercial-claims/commercial-claims-resolver";
import { COMMERCIAL_SURFACE_IDS as S } from "@/domain/commercial-claims/commercial-surface-ids";

type Resolve = typeof resolveCommercialClaim;

const SOURCES = {
  whoIlo: {
    label: "OMS e OIT",
    href: "https://www.who.int/news/item/28-09-2022-who-and-ilo-call-for-new-measures-to-tackle-mental-health-issues-at-work",
  },
  gallup: {
    label: "Gallup Q12, 11ª edição",
    href: "https://www.gallup.com/workplace/321725/employee-engagement-meta-analysis.aspx",
  },
  fibt: {
    label: "Devolutiva oficial FIB-T",
    href: "https://pesquisadefelicidade.com.br/isg/apresentacao",
  },
  nr1: {
    label: "NR-1 no Ministério do Trabalho e Emprego",
    href: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/nr-1",
  },
} as const;

/**
 * Cena 03 · dados globais OMS/OIT. Números vêm do claim aprovado CLAIM-COM-PRESENTATION-WHO-001
 * (variantes "days" e "cost"). Sem claim, a cena mantém os rótulos e omite os números.
 */
export function resolveGlobalStats(resolve: Resolve = resolveCommercialClaim): EcoScene["items"] {
  try {
    const read = (variant: string) =>
      resolve({
        claimId: "CLAIM-COM-PRESENTATION-WHO-001",
        surfaceId: S.PROPOSAL_ECOSYSTEM_CONTEXT,
        variant,
      }).text;
    const days = read("days");
    const cost = read("cost");
    if (!/^\d+$/.test(days) || !/^\d+$/.test(cost)) throw new Error("variante inválida");
    return [
      { label: `${days} bilhões`, body: "de dias de trabalho perdidos por ano", icon: "calendar" },
      {
        label: `Cerca de US$ ${cost} trilhão`,
        body: "por ano em perdas de produtividade",
        icon: "productivity",
      },
    ];
  } catch {
    return [
      { label: "Dias de trabalho perdidos", icon: "calendar" },
      { label: "Perdas de produtividade", icon: "productivity" },
    ];
  }
}

/**
 * Cena 04 · Gallup Q12 2024. Os percentuais (14 %, 78 %, 70 %) NÃO têm claim aprovado no
 * registry nesta data; aplica-se a alternativa literal prevista no super prompt, com títulos por
 * indicador no mesmo layout. Para exibir os números: registrar e aprovar o claim antes.
 */
const GALLUP_ALTERNATIVE =
  "Acompanhar produtividade, absenteísmo e bem-estar ajuda a discutir como as pessoas vivenciam o trabalho e quais prioridades merecem atenção.";

const EXECUTIVE = new Set([1, 2, 5, 7, 11, 13, 16, 17, 20, 24]);

type SceneInput = Omit<EcoScene, "executive">;

export function buildEcosystemScenes(resolve: Resolve = resolveCommercialClaim): EcoScene[] {
  const stats = resolveGlobalStats(resolve);
  const statsApproved = stats.some((s) => Boolean(s.body));
  const scenes: SceneInput[] = [
    {
      id: "proposta",
      number: 1,
      chapter: "Abertura",
      title: "Da pesquisa à vitalidade de todo o ecossistema ISG",
      layout: "cover",
      lead: "O Instituto Felicidade para Todos propõe uma implantação acompanhada do VitalOS para transformar a escuta em decisões, ações e aprendizagem entre operações.",
      items: [],
      cta: { label: "Explorar a proposta" },
      image: "brasilia",
      imageNote: "Ilustração gerada",
      speech:
        "Já construímos conhecimento juntos. Hoje vamos mostrar como esse trabalho pode ganhar continuidade em todo o ecossistema da ISG.",
    },
    {
      id: "o-que-construimos",
      number: 2,
      chapter: "Abertura",
      title: "A parceria começou em Brasília e chegou à escuta na ISG",
      layout: "timeline",
      items: [
        { label: "Pesquisa FIB em Brasília", icon: "map" },
        { label: "Relatório de felicidade com apoio da ISG", icon: "report" },
        { label: "Difusão da Ciência da Felicidade", icon: "dialogue" },
        { label: "Pesquisa FIB-T na ISG", icon: "team" },
      ],
      speech:
        "A ISG apoiou a produção de conhecimento para Brasília. Depois, a escuta FIB-T trouxe essa conversa para dentro da organização.",
    },
    {
      id: "trabalho-saude-mental",
      number: 3,
      chapter: "Contexto",
      title: "Depressão e ansiedade afetam a presença e a produtividade no trabalho",
      layout: "stats",
      items: stats,
      caption: "Estimativas globais associadas à depressão e à ansiedade · OMS e OIT",
      understand: {
        question: "O que esses números medem?",
        body: "Os dois números descrevem dimensões da mesma questão em escala mundial. A estimativa em dinheiro se refere à perda de produtividade. Para discutir impactos na ISG, o ponto de partida são indicadores próprios e seu contexto.",
      },
      sources: [SOURCES.whoIlo],
      speech:
        "A escala mundial ajuda a situar o tema. Para decidir o que fazer na ISG, vamos olhar para a escuta e para as condições de trabalho.",
      ...(statsApproved
        ? {}
        : { alternative: "Números OMS/OIT omitidos: claim indisponível para esta superfície." }),
    },
    {
      id: "estudos",
      number: 4,
      chapter: "Contexto",
      title: "O engajamento está associado a resultados que a gestão acompanha",
      layout: "indicators",
      lead: GALLUP_ALTERNATIVE,
      items: [
        { label: "Produtividade", body: "medida por registros e avaliações", icon: "productivity" },
        { label: "Absenteísmo", icon: "absence" },
        { label: "Bem-estar", body: "na medida de pessoas em florescimento", icon: "wellbeing" },
      ],
      understand: {
        question: "Como ler a comparação?",
        body: "A meta-análise compara unidades com níveis diferentes de engajamento. As diferenças são associações observadas. Para avaliar uma intervenção na ISG, precisamos acompanhar sua execução e comparar medidas adequadas ao seu contexto.",
      },
      sources: [SOURCES.gallup],
      alternative:
        "Alternativa literal aplicada: os percentuais Gallup Q12 2024 não têm claim aprovado no registro.",
      speech:
        "Esses estudos ajudam a escolher perguntas e indicadores. A avaliação das ações vem da aplicação e do acompanhamento na própria ISG.",
    },
    {
      id: "escuta-realizada",
      number: 5,
      chapter: "Ponto de partida",
      title: "A FIB-T da ISG oferece um ponto de partida para agir",
      layout: "cards",
      items: [
        { label: "O que as pessoas percebem no trabalho", icon: "listen" },
        { label: "Quais condições merecem ser preservadas", icon: "protect" },
        { label: "Quais questões vale aprofundar com as equipes", icon: "search" },
      ],
      understand: {
        question: "Qual é o alcance da leitura?",
        body: "A devolutiva reúne percepções agregadas do público que respondeu à pesquisa. O desenho da implantação confirma quais operações participaram e quais precisam de uma escuta complementar.",
      },
      sources: [SOURCES.fibt],
      speech:
        "Vamos começar pelo que as pessoas já disseram. A devolutiva é a referência para verificar o alcance de cada leitura.",
    },
    {
      id: "prioridade",
      number: 6,
      chapter: "Ponto de partida",
      title: "O primeiro acordo é o que preservar e o que aprofundar",
      layout: "decision-cards",
      items: [
        { label: "Preservar", body: "Identificar práticas que já funcionam.", icon: "protect" },
        {
          label: "Aprofundar",
          body: "Entender o que explica um ponto de atenção.",
          icon: "search",
        },
        {
          label: "Pactuar",
          body: "Escolher uma prioridade com quem vive o trabalho.",
          icon: "pact",
        },
      ],
      speech:
        "A prioridade é validada com as equipes. Isso permite aproveitar o que já funciona e agir sobre condições que podem mudar.",
    },
    {
      id: "programa-plataforma",
      number: 7,
      chapter: "Programa",
      title: "O Instituto conduz o programa e o VitalOS dá visibilidade à execução",
      layout: "converge",
      items: [
        {
          label: "Programa VitalOS",
          body: "Facilitação, educação e acompanhamento conduzidos pelo IFT.",
          icon: "facilitation",
        },
        {
          label: "Plataforma VitalOS",
          body: "Organiza leituras, prioridades e registros conforme as capacidades disponíveis e o escopo pactuado.",
          icon: "dashboard",
        },
      ],
      closing: "Devolutiva às equipes",
      speech:
        "O trabalho começa com quem vai conduzir e acompanhar as ações. A plataforma dá visibilidade ao que foi combinado e registrado.",
    },
    {
      id: "promocao-prevencao",
      number: 8,
      chapter: "Programa",
      title: "Bem-estar e riscos psicossociais exigem ações coordenadas",
      layout: "tracks",
      items: [
        {
          label: "Promoção do bem-estar",
          body: "escuta coletiva, aprendizagem e intervenções.",
          icon: "leaf",
        },
        {
          label: "Gestão de riscos psicossociais",
          body: "identificação, avaliação e medidas preventivas no contexto do GRO/PGR.",
          icon: "shield",
        },
      ],
      understand: {
        question: "Como as duas frentes se conectam?",
        body: "A escuta de bem-estar pode orientar temas para investigação. A frente de riscos tem finalidade, critérios e responsabilidades técnicas próprios. Instrumentos como o COPSOQ podem apoiar a escuta sobre condições de trabalho.",
      },
      sources: [SOURCES.nr1],
      speech:
        "As duas frentes se complementam. Cada decisão precisa respeitar o objetivo e a responsabilidade técnica do seu escopo.",
    },
    {
      id: "metodo",
      number: 9,
      chapter: "Programa",
      title: "O ciclo transforma o que ouvimos em aprendizagem e ação",
      layout: "cycle",
      items: [
        { label: "Mensurar", body: "entender o ponto de partida.", icon: "search" },
        { label: "Educar", body: "desenvolver repertório.", icon: "book" },
        { label: "Transformar", body: "testar ações no trabalho.", icon: "action" },
        { label: "Evoluir", body: "reavaliar e planejar o próximo ciclo.", icon: "review" },
      ],
      speech:
        "Cada volta do ciclo deixa decisões, registros e aprendizados que orientam a seguinte.",
    },
    {
      id: "ivo",
      number: 10,
      chapter: "Lentes",
      title: "Índice de Vitalidade Organizacional",
      layout: "ivo",
      items: [
        { label: "Eu", body: "Como vivencio meu trabalho?", icon: "person" },
        { label: "Nós", body: "Como colaboramos e nos apoiamos?", icon: "team" },
        { label: "Liderança", body: "Como a gestão dá clareza e suporte?", icon: "compass" },
        {
          label: "Organização e governança",
          body: "Que condições sustentam o bem-estar?",
          icon: "building",
        },
      ],
      understand: {
        question: "Como o IVO é lido?",
        body: "As quatro dimensões ajudam a interpretar o que pede atenção. Cada instrumento mantém sua escala, sua origem e seu contexto. O resultado da FIB-T é lido na sua escala. O registro de uma ação indica execução. Para avaliar mudança, use uma nova leitura comparável.",
      },
      speech:
        "O IVO ajuda a organizar perguntas de gestão, da experiência individual às condições que a organização cria.",
    },
    {
      id: "lentes",
      number: 11,
      chapter: "Lentes",
      title: "Cada lente responde a uma pergunta diferente",
      layout: "lenses",
      items: [
        {
          code: "Q1",
          label: "COPSOQ",
          body: "Que condições de trabalho merecem atenção?",
          icon: "shield",
        },
        {
          code: "Q2",
          label: "FIB-T",
          body: "Como as equipes percebem o bem-estar coletivo?",
          icon: "team",
        },
        {
          code: "Q3",
          label: "PERMA+V",
          body: "Que condições favorecem o florescimento?",
          icon: "leaf",
        },
        {
          code: "Q4",
          label: "VIA-T",
          body: "Que forças podemos aplicar no trabalho?",
          icon: "compass",
        },
        {
          code: "Q5",
          label: "Síntese",
          body: "O que aprendemos e o que faremos a seguir?",
          icon: "synthesis",
        },
      ],
      understand: {
        question: "O que cada lente orienta?",
        body: "COPSOQ investiga condições psicossociais como demandas, autonomia e apoio. FIB-T organiza percepções coletivas de bem-estar. PERMA+V orienta práticas relacionadas a emoções positivas, engajamento, relações, sentido, realização e vitalidade. VIA-T oferece uma linguagem para explorar forças de caráter no trabalho. O Q5 reúne aprendizados e prepara o plano seguinte.",
      },
      speech:
        "A pesquisa já realizada informa o Q2. As demais lentes complementam a jornada conforme o desenho da implantação.",
    },
    {
      id: "intervencao",
      number: 12,
      chapter: "Lentes",
      title: "Uma dificuldade para levantar dúvidas pode orientar uma rotina de escuta",
      layout: "sequence",
      items: [
        { label: "Sinal", body: "pessoas hesitam em levantar dúvidas.", icon: "signal" },
        { label: "Hipótese", body: "pode faltar espaço seguro para falar.", icon: "hypothesis" },
        {
          label: "Ação proposta",
          body: "reservar tempo para perguntas e combinar o retorno da liderança.",
          icon: "action",
        },
      ],
      caption: "Exemplo ilustrativo de segurança psicológica",
      understand: {
        question: "Que outras intervenções são possíveis?",
        body: "Quando o problema for falta de clareza sobre responsabilidades, a equipe pode revisar papéis e decisões. Quando houver dificuldade de recuperação, pode revisar a agenda e combinar pausas protegidas. Em cada caso, a equipe confirma a hipótese antes de escolher a ação.",
      },
      image: "listening",
      imageNote: "Ilustração gerada",
      speech:
        "O método é o mesmo. A intervenção muda de acordo com a leitura do contexto e com o que a equipe consegue testar.",
    },
    {
      id: "demonstracao",
      number: 13,
      chapter: "Demonstração",
      title: "RH, liderança e equipes acompanham a mesma ação",
      layout: "demo",
      items: [
        { label: "Pactuar", body: "RH e equipe escolhem a prioridade.", icon: "pact" },
        { label: "Registrar", body: "a liderança anota a execução.", icon: "record" },
        {
          label: "Revisar",
          body: "RH, liderança e equipe observam o que funcionou na rotina.",
          icon: "review",
        },
        {
          label: "Devolver",
          body: "a equipe recebe o retorno e conhece o próximo passo.",
          icon: "feedback",
        },
      ],
      cta: { label: "Ver demonstração" },
      speech:
        "O exemplo mostra quem faz o quê, o que fica registrado e como a equipe recebe retorno.",
    },
    {
      id: "evidencia-cenario",
      number: 14,
      chapter: "Demonstração",
      title: "Execução, mudança observada e cenário respondem a perguntas distintas",
      layout: "cards",
      items: [
        { label: "Execução", body: "o que foi feito?", icon: "record" },
        { label: "Reavaliação", body: "o que mudou em uma leitura comparável?", icon: "review" },
        {
          label: "Cenário",
          body: "o que poderia acontecer se as premissas mudarem?",
          icon: "hypothesis",
        },
      ],
      understand: {
        question: "Como ler um cenário econômico?",
        body: "Um cenário pode combinar dias de ausência e custo por dia para ilustrar diferenças entre hipóteses. O resultado depende das premissas. Para verificar mudanças, acompanhe a execução e analise os indicadores observados.",
      },
      speech:
        "Uma ação registrada e um cenário ajudam a decidir. A reavaliação responde se houve mudança.",
    },
    {
      id: "transicao",
      number: 15,
      chapter: "Ecossistema",
      title: "Da prioridade escolhida à execução em todo o ecossistema",
      layout: "transition",
      lead: "Direção comum. Planos que cabem na realidade de cada operação.",
      items: [],
      image: "workplace",
      imageNote: "Ilustração gerada",
      speech:
        "Agora vamos mostrar como essa lógica se aplica às operações da ISG e como os aprendizados retornam à direção.",
    },
    {
      id: "escopo-integral",
      number: 16,
      chapter: "Ecossistema",
      title: "A implantação abrange todo o ecossistema ISG",
      layout: "ring",
      items: [
        {
          label: "Governança comum",
          body: "alinhar objetivos, critérios e indicadores.",
          icon: "governance",
        },
        {
          label: "Execução nas operações",
          body: "adaptar ações ao contexto local.",
          icon: "operation",
        },
        {
          label: "Aprendizagem em rede",
          body: "compartilhar práticas e obstáculos.",
          icon: "network",
        },
      ],
      speech:
        "O perímetro inclui as empresas, áreas e operações que a ISG confirmar. Cada operação contribui para os objetivos comuns e conduz ações adequadas ao seu contexto.",
    },
    {
      id: "ondas",
      number: 17,
      chapter: "Ecossistema",
      title: "As ondas organizam a execução do escopo integral",
      layout: "waves",
      items: [
        { label: "Preparar", body: "mapear a cobertura, os responsáveis e a linha de base." },
        {
          label: "Implementar",
          body: "sequenciar as operações, executar e acompanhar os marcos.",
        },
        { label: "Consolidar", body: "devolver resultados e preparar o próximo ciclo." },
      ],
      understand: {
        question: "Como o calendário será definido?",
        body: "O calendário depende do perímetro validado, da cobertura da escuta já realizada e da capacidade das equipes. Cada onda tem responsáveis, entregas e critérios de aceite definidos na sessão de desenho.",
      },
      speech:
        "Sequenciar as ondas reduz a carga de implantação e dá tempo para incorporar o que as operações aprendem.",
    },
    {
      id: "responsabilidades",
      number: 18,
      chapter: "Ecossistema",
      title: "O Instituto e a ISG decidem juntos, com papéis definidos",
      layout: "cards",
      items: [
        {
          label: "IFT",
          body: "conduz a metodologia, facilita oficinas e acompanha entregas.",
          icon: "facilitation",
        },
        {
          label: "Coordenação ISG",
          body: "valida escopo, decide prioridades e acompanha os marcos.",
          icon: "governance",
        },
        {
          label: "Pontos focais",
          body: "mobilizam as equipes, registram a execução e levam obstáculos à revisão.",
          icon: "operation",
        },
      ],
      speech:
        "O Instituto oferece condução técnica. A coordenação da ISG e os pontos focais dão continuidade às decisões no trabalho cotidiano.",
    },
    {
      id: "q5",
      number: 19,
      chapter: "Continuidade",
      title: "O ciclo termina com uma síntese e um plano de continuidade",
      layout: "report",
      items: [
        { label: "Síntese executiva", body: "decisões, ações e aprendizados.", icon: "synthesis" },
        { label: "Devolutiva", body: "o que avançou e o que pede revisão.", icon: "feedback" },
        {
          label: "Próximo plano",
          body: "prioridades, responsáveis, indicadores e data de revisão.",
          icon: "calendar",
        },
      ],
      caption: "Capa ilustrativa",
      understand: {
        question: "Como isso pode apoiar a agenda ESG?",
        body: "O registro de condições de trabalho, participação e aprendizagem pode apoiar a dimensão Social. Responsabilidades, decisões e revisões contribuem para a Governança. Indicadores ambientais entram quando o escopo prevê registros dessa natureza.",
      },
      speech:
        "A direção recebe uma síntese do ciclo e um plano que pode acompanhar no período seguinte.",
    },
    {
      id: "investimento",
      number: 20,
      chapter: "Continuidade",
      title: "O investimento será dimensionado para o ecossistema",
      layout: "investment",
      items: [
        { label: "Cobertura", body: "operações e pessoas no perímetro.", icon: "network" },
        { label: "Entrega", body: "facilitação, educação e acompanhamento.", icon: "team" },
        { label: "Tecnologia", body: "acesso e necessidades de integração.", icon: "platform" },
      ],
      closing: "Investimento a pactuar após dimensionamento.",
      speech:
        "Com o perímetro e as entregas definidos, podemos apresentar o valor, os marcos e as condições de aceite de todo o programa.",
    },
    {
      id: "cooperacao-tecnica",
      number: 21,
      chapter: "Continuidade",
      title: "A experiência tecnológica da ISG pode ajudar a qualificar a implantação",
      layout: "cards",
      items: [
        {
          label: "Acessibilidade e experiência",
          body: "testar percursos de uso.",
          icon: "accessibility",
        },
        { label: "Desempenho", body: "identificar prioridades técnicas.", icon: "performance" },
        { label: "Integrações", body: "avaliar necessidades e viabilidade.", icon: "integration" },
      ],
      understand: {
        question: "O que será definido em conjunto?",
        body: "IFT e ISG podem pactuar responsabilidades, horas, entregas e critérios de aceite para a colaboração técnica. A implantação também pode identificar integrações que mereçam escopo específico.",
      },
      speech:
        "Podemos desenhar uma cooperação técnica que melhore a experiência das equipes e produza aprendizados úteis para as duas instituições.",
    },
    {
      id: "brasilia",
      number: 22,
      chapter: "Brasília",
      title: "O trabalho iniciado em Brasília abre uma nova agenda de cooperação",
      layout: "photo",
      items: [
        {
          label: "Mensurar novamente",
          body: "atualizar a escuta sobre bem-estar.",
          icon: "search",
        },
        { label: "Educar", body: "ampliar o acesso à Ciência da Felicidade.", icon: "book" },
        {
          label: "Transformar",
          body: "articular projetos a partir dos resultados e da aprendizagem.",
          icon: "action",
        },
      ],
      image: "brasilia",
      imageNote: "Ilustração gerada",
      speech:
        "A ISG ajudou a trazer essa conversa para Brasília. A continuidade pode conectar a pesquisa, a formação e a articulação de projetos no território.",
    },
    {
      id: "alcance-publico",
      number: 23,
      chapter: "Brasília",
      title: "Tecnologia pode ampliar o acesso à aprendizagem de bem-estar em Brasília",
      layout: "cards",
      items: [
        { label: "Formação introdutória em Ciência da Felicidade", icon: "learning" },
        { label: "Game da Felicidade em desenvolvimento", icon: "game" },
        {
          label:
            "Possíveis frentes de cooperação: acessibilidade, desempenho e experiência de uso.",
          icon: "integration",
        },
      ],
      understand: {
        question: "Como participar dessa agenda?",
        body: "IFT e ISG podem identificar necessidades, públicos e formas de participação em uma conversa própria. A cooperação para Brasília terá escopo e decisões próprios.",
      },
      speech:
        "Essa agenda pode avançar em uma conversa dedicada, com critérios claros sobre o que é possível entregar para a população.",
    },
    {
      id: "decisao",
      number: 24,
      chapter: "Decisão",
      title: "Vamos desenhar a implantação no ecossistema ISG?",
      layout: "decision",
      items: [
        { label: "Validar o perímetro do programa." },
        { label: "Indicar a coordenação e os pontos focais." },
        { label: "Marcar a sessão de desenho." },
      ],
      cta: {
        label: "Combinar sessão de desenho",
        support:
          "Responda à mensagem em que recebeu esta proposta com duas opções de data e horário.",
      },
      speech:
        "A sessão de desenho serve para sair com o perímetro, as responsabilidades e as primeiras ondas definidos para decisão da ISG.",
    },
  ];
  return scenes.map((s) => ({ ...s, executive: EXECUTIVE.has(s.number) }));
}

export function getEcosystemProposal(): EcosystemProposal {
  return {
    version: "ecossistema-v1 · 25/11/2026",
    title: "Proposta para o ecossistema",
    recipient: "ISG Participações",
    scenes: buildEcosystemScenes(),
    demo: {
      title: "Da prioridade à devolutiva",
      rows: [
        { label: "Prioridade", value: "abrir espaço para perguntas." },
        { label: "Ação", value: "testar uma roda curta de escuta na reunião de equipe." },
        { label: "Responsável", value: "liderança da equipe." },
        { label: "Evidência", value: "data, pauta e temas tratados em conjunto." },
        { label: "Revisão", value: "verificar viabilidade e combinar o próximo retorno." },
      ],
      caption: "Exemplo ilustrativo, com dados fictícios.",
    },
    // A proposta original também não tem canal aprovado (nextSession.contact = null).
    contact: null,
  };
}
