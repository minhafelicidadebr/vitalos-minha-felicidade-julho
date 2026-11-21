// Ajuda contextual · conteúdo editorial versionado (v0.1.0 · proposta editorial).
//
// Cada entrada responde a UMA pergunta de um ponto da interface. A seleção é determinística
// (ponto × papel × estado) em src/engine/help/contextual-help-engine.ts. Estudo científico
// NUNCA é fixado aqui: entra só pelo resolver, quando o Claim Registry tem claim para o
// contexto exato. Candidatas sem claim ficam em HELP_EVIDENCE_CANDIDATES para a curadoria.
// Regra de redação: frase de produto rotulada como produto; frase do Manual do MTE rotulada
// como orientação oficial, com item e página; nenhuma promessa de efeito ou conformidade.

import {
  createHelpEvidenceResolver,
  type ContextualHelpEntry,
} from "@/engine/help/contextual-help-engine";
import { CLAIM_REGISTRY, EVIDENCE_REGISTRY } from "@/domain/evidence/registries";

export const HELP_CONTENT_VERSION = "0.1.0";

const MANUAL_MTE = {
  title: "Manual de interpretação e aplicação do capítulo 1.5 da NR-1 (MTE, 2026)",
  href: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2026/manual_gro_pgr_da_nr_1.pdf",
} as const;

const REVIEW = { status: "proposta_editorial", reviewer: null, date: "2026-11-21" } as const;

export const HELP_EMBAIXADORIAS: ContextualHelpEntry = {
  id: "help.embaixadorias.geral",
  version: HELP_CONTENT_VERSION,
  route: "/embaixadorias",
  anchor: "titulo-pagina",
  question: "Como funcionam as embaixadorias?",
  summary:
    "Cada embaixadoria é um grupo voluntário de colegas que cuida de um tema do dia a dia de trabalho, com missões combinadas pelo próprio grupo. Não é cargo nem avaliação: entrar e sair é livre.",
  demoNotice:
    "As pessoas e as missões desta tela são de exemplo. O botão Participar muda só esta página e não registra adesão na empresa.",
  roles: {
    geral: {
      example:
        "Você escolhe uma frente cujo tema faz sentido para a sua rotina e combina com o grupo uma missão pequena, como uma pausa de equipe ou uma troca entre áreas.",
      nextStep:
        "Use o botão de informação de cada frente para entender o que ela faz antes de marcar Participar.",
    },
    lideranca: {
      example:
        "Você pode apoiar quem quer participar, abrindo espaço na agenda para a missão do grupo. A participação continua sendo escolha de cada pessoa.",
      nextStep: "Converse com a equipe sobre as frentes. Não indique nem cobre participação.",
    },
    rh: {
      example:
        "Você ajuda as frentes a se organizarem e acompanha quantas missões acontecem, sem transformar participação em critério de avaliação.",
      nextStep: "Nesta demonstração, os números servem para conhecer a tela. Eles não descrevem a sua empresa.",
    },
  },
  limits: [
    "Participar ou sair nunca gera consequência para a pessoa.",
    "Participação não entra em avaliação de desempenho, promoção ou remuneração.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Embaixadorias do Florescimento",
      supports: "Frentes voluntárias, contagens e adesão de exemplo desta tela.",
      locator: "Dados de demonstração do VitalOS",
    },
  ],
  review: REVIEW,
};

const GUARDIOES_COLABORADOR = {
  example:
    "Uma colega comenta que a passagem de turno deixa tarefas sem dono. Como participante da frente, você agradece, pergunta o que ajudaria e combina quando volta a conversar com ela.",
  nextStep:
    "Nesta tela, Participar mostra como a adesão funcionaria. Para praticar a primeira resposta a um relato, abra a trilha Voz Segura.",
  link: { to: "/voz-segura", label: "Abrir a trilha Voz Segura" },
};

export const HELP_GUARDIOES_VOZ_SEGURA: ContextualHelpEntry = {
  id: "help.embaixadorias.guardioes-voz-segura",
  version: HELP_CONTENT_VERSION,
  route: "/embaixadorias",
  anchor: "card-amb-seguranca",
  question: "Como funciona Guardiões da Voz Segura?",
  summary:
    "É uma frente voluntária de colegas que ajuda a equipe a fazer perguntas, pedir ajuda e contar dificuldades do trabalho sem medo de uma resposta punitiva. Na prática, a equipe combina como ouvir uma preocupação e como dar retorno a quem falou.",
  demoNotice:
    "As contagens e a missão aberta deste card são de exemplo. Marcar Participar muda só esta página.",
  flow: [
    { verb: "Ouvir", who: "Quem recebe a preocupação", text: "Agradece o aviso e pergunta o que a pessoa viu, antes de qualquer análise." },
    { verb: "Combinar um retorno", who: "Quem ouviu e quem falou", text: "Combinam o próximo passo e quando voltam a conversar." },
    { verb: "Acompanhar", who: "A equipe, no prazo combinado", text: "Contam o que foi feito ou por que ainda não foi possível." },
  ],
  roles: {
    geral: GUARDIOES_COLABORADOR,
    colaborador: GUARDIOES_COLABORADOR,
    lideranca: {
      example:
        "Alguém da equipe aponta um erro no processo. Você agradece o aviso antes de qualquer análise, pergunta o que a pessoa viu e combina quando volta com uma decisão.",
      nextStep:
        "Prepare essa conversa na trilha Voz Segura, que traz um roteiro para a primeira resposta a um relato.",
      link: { to: "/voz-segura", label: "Abrir a trilha Voz Segura" },
    },
    rh: {
      example:
        "Você ajuda as equipes a combinar um ritual simples de escuta, com prazo de retorno, e acompanha se o ritual acontece. O conteúdo das conversas não chega ao RH.",
      nextStep:
        "Apresente a prática às lideranças pela trilha Voz Segura. O registro das rodadas guarda apenas números agregados.",
    },
    sst: {
      example:
        "A embaixadoria é uma prática educativa de equipe. Ela não substitui os meios formais de consulta e de comunicação aos trabalhadores em SST, como a CIPA.",
      nextStep:
        "Quando um relato envolver risco à saúde ou à segurança, oriente o encaminhamento pelos canais formais que a organização mantém.",
    },
    direcao: {
      example:
        "Você acompanha se as equipes têm um jeito combinado de ouvir e responder. A frente não gera nota nem lista de pessoas.",
      nextStep: "Nesta tela, a direção só consulta. A prática acontece nas equipes.",
    },
  },
  limits: [
    "Não é canal de denúncia nem investigação.",
    "Não avalia pessoas. Participar ou sair não gera consequência.",
    "O conteúdo de uma conversa não é registrado nesta tela.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Embaixadorias do Florescimento",
      supports: "Propósito da frente, contagens de exemplo e funcionamento do botão Participar.",
      locator: "Dados de demonstração do VitalOS",
    },
    {
      nature: "produto",
      title: "Trilha Voz Segura",
      supports:
        "O mecanismo de segurança psicológica e os Passaportes de Evidência aprovados para aquela trilha.",
      to: "/voz-segura",
    },
    {
      nature: "orientacao_oficial",
      title: MANUAL_MTE.title,
      supports:
        "Meios de consulta e de comunicação aos trabalhadores em SST. O Manual não trata desta embaixadoria.",
      locator: "Itens 6.2 e 6.3, p. 23–24",
      href: MANUAL_MTE.href,
    },
  ],
  evidence: {
    studyId: "TRU-006",
    intendedUse: "explain_mechanism",
    targetContext: "embaixadorias-ajuda",
    segment: "enterprise",
  },
  review: REVIEW,
};

export const HELP_VIAT_RESULTADO: ContextualHelpEntry = {
  id: "help.viat.resultado",
  version: HELP_CONTENT_VERSION,
  route: "/viat",
  anchor: "titulo-forcas",
  question: "Como ler este resultado?",
  summary:
    "Cada nota vai de 0 a 10 e é a média das respostas aos itens daquela força. O rótulo vem dessa média: 8,5 ou mais é Força Assinatura; de 7 até menos de 8,5, alta manifestação; de 4 até menos de 7, moderada; abaixo de 4, baixa. A leitura mostra como a pessoa percebe suas forças no trabalho, não quem ela é.",
  demoNotice:
    "O resultado desta tela é de Marina, uma pessoa fictícia. O questionário de exemplo não substitui este resultado e não é enviado a ninguém.",
  roles: {
    geral: {
      example:
        "Escolha uma das cinco forças de destaque e pense numa tarefa desta semana em que você poderia usá-la.",
      nextStep: "Toque numa força para ver a missão sugerida para ela.",
    },
    lideranca: {
      example:
        "Na Visão da Equipe aparecem só médias de grupo, e só com 5 pessoas ou mais. O resultado individual de alguém não aparece para você.",
      nextStep:
        "Use a média do grupo para abrir uma conversa sobre como a equipe usa suas forças, nunca para escolher ou avaliar pessoas.",
    },
    rh: {
      example:
        "A Visão da Equipe mostra médias agregadas por força e o contexto do trabalho, sempre com 5 pessoas ou mais.",
      nextStep:
        "Use a leitura para planejar desenvolvimento e cultura. Ela não serve para seleção, promoção, remuneração ou desligamento.",
    },
  },
  limits: [
    "Instrumento exploratório autoral: não é diagnóstico psicológico e não substitui a Pesquisa VIA oficial.",
    "Não serve para seleção, promoção, punição, remuneração, desligamento ou alocação de pessoas.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Regras do VIA-T v1 exploratório",
      supports:
        "Escala de 0 a 10, faixas dos rótulos (8,5 · 7 · 4) e visão de grupo apenas com 5 pessoas ou mais.",
      locator: "Motor VIA-T do VitalOS",
    },
  ],
  review: REVIEW,
};

export const HELP_EXPEDICAO_PRIORIDADE: ContextualHelpEntry = {
  id: "help.expedicao.prioridade",
  version: HELP_CONTENT_VERSION,
  route: "/expedicao",
  anchor: "antagonista-da-temporada",
  question: "Como a prioridade é definida?",
  summary:
    "Antagonista é o nome que o VitalOS dá a um padrão de trabalho que drena energia, nunca a uma pessoa. A prioridade da temporada vem do driver com maior exposição na medição mais recente, e o produto escolhe o antagonista ligado a esse driver.",
  states: {
    demo: {
      label: "Leitura de referência do setor",
      meaning:
        "Os números vêm da série de exemplo do setor ativo, a mesma de Matriz e Reavaliação NR-1. Servem para conhecer a tela e não descrevem a sua empresa.",
    },
    loading: {
      label: "Consultando o Cofre de Ciclos",
      meaning: "A leitura da sua organização ainda está carregando. Enquanto isso, a tela não tira conclusão.",
    },
    unavailable: {
      label: "Leitura indisponível",
      meaning:
        "Não foi possível ler o Cofre de Ciclos agora. Nesta situação, a falta de antagonista não significa falta de exposição.",
    },
    zero: {
      label: "Nenhum ciclo registrado",
      meaning: "Sem medição registrada, a tela não escolhe prioridade.",
    },
    one: {
      label: "Um ciclo registrado",
      meaning:
        "A prioridade já vem da medição. Para dizer se a exposição recuou, esta tela precisa de um segundo ciclo comparável.",
    },
    comparable: {
      label: "Ciclos comparáveis",
      meaning:
        "A tela compara a medição atual com a anterior e mostra se a exposição de cada driver subiu, caiu ou ficou estável.",
    },
  },
  roles: {
    geral: {
      example:
        "Se o antagonista estiver ligado à carga de trabalho, a conversa começa pelas condições da tarefa, como prazos, volume e pausas, e não pelo comportamento de alguém.",
      nextStep: "Abra as trilhas da Academia ligadas a esse tema.",
      link: { to: "/academia", label: "Ir para a Academia" },
    },
    rh: {
      example:
        "Uma medida registrada no plano informa o que foi feito. Para avaliar a eficácia, a organização acompanha se a medida segue a hierarquia de prevenção e se continua funcionando ao longo do tempo.",
      nextStep:
        "Acompanhe a evolução entre ciclos na Reavaliação NR-1. A avaliação técnica das medidas cabe a profissional habilitado.",
      link: { to: "/evolucao-nr1", label: "Abrir a Reavaliação NR-1" },
    },
    sst: {
      example:
        "O recuo de um antagonista é evolução observada entre ciclos. A eficácia de uma medida se avalia pelo atendimento à hierarquia de prevenção e pelo funcionamento mantido ao longo do tempo.",
      nextStep:
        "Use a Reavaliação NR-1 como apoio ao acompanhamento. Ela é educativa e não substitui o PGR.",
    },
  },
  limits: [
    "O antagonista é uma metáfora do VitalOS. O Manual do MTE não trata dela.",
    "Recuo na tela é evolução observada entre ciclos, não prova de eficácia da medida.",
    "Conteúdo educativo: não substitui o PGR nem o profissional habilitado.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Regras da Expedição",
      supports:
        "Escolha do antagonista pelo driver mais exposto, estados do Cofre de Ciclos e comparação entre ciclos.",
      locator: "Motor da Expedição do VitalOS",
    },
    {
      nature: "orientacao_oficial",
      title: MANUAL_MTE.title,
      supports:
        "Eficácia das medidas de prevenção: atendimento à hierarquia de prevenção e funcionamento e manutenção adequados ao longo do tempo.",
      locator: "Item 11.4.4, p. 63–64",
      href: MANUAL_MTE.href,
    },
    {
      nature: "orientacao_oficial",
      title: MANUAL_MTE.title,
      supports: "Implementação e acompanhamento das medidas de prevenção.",
      locator: "Item 12.2, p. 77",
      href: MANUAL_MTE.href,
    },
  ],
  review: REVIEW,
};

export const HELP_Q1_PREPARACAO: ContextualHelpEntry = {
  id: "help.q1.preparacao",
  version: HELP_CONTENT_VERSION,
  route: "/ivo-integral/preparar-q1",
  anchor: "titulo-pagina",
  question: "O que acontece nesta preparação?",
  summary:
    "Aqui a empresa organiza a comunicação com a equipe e registra os controles que já existem, antes da coleta COPSOQ. Preparar não abre a coleta: hoje, a coleta e os resultados do Q1 seguem bloqueados até que se confirme a correspondência entre a versão brasileira aprovada e o instrumento servido.",
  roles: {
    geral: {
      example:
        "Antes de qualquer coleta, a equipe recebe um comunicado sobre a escuta. A devolutiva prevista é coletiva.",
      nextStep:
        "Nesta etapa não há questionário para responder. Dúvidas sobre o processo vão pelos canais indicados no comunicado.",
    },
    rh: {
      example:
        "Você escolhe o ciclo, prepara o comunicado pré-coleta e registra os controles existentes, sempre com referências coletivas: sem nomes, informações de saúde ou relatos individuais.",
      nextStep:
        "Abra o ciclo e salve a preparação. A revisão técnica é uma etapa separada, conduzida por SST.",
    },
    sst: {
      example:
        "A revisão técnica de SST é uma etapa distinta da preparação feita pelo representante da empresa.",
      nextStep:
        "Acompanhe o painel de revisão técnica deste ciclo quando ele estiver disponível para o seu papel.",
    },
    lideranca: {
      example:
        "Você ajuda a equipe a entender para que serve a escuta, sem pedir respostas, nomes ou relatos.",
      nextStep: "Encaminhe as dúvidas da equipe aos canais indicados no comunicado.",
    },
  },
  limits: [
    "Preparar não abre a coleta e não gera resultado.",
    "Nenhum dado individual é registrado nesta etapa.",
    "Conteúdo educativo: não substitui o PGR nem profissional habilitado.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Contrato de módulos do Q1",
      supports:
        "Coleta e resultados bloqueados até que se confirme a correspondência com o instrumento servido.",
      locator: "Contrato de módulos do VitalOS",
    },
    {
      nature: "produto",
      title: "Preparação Q1",
      supports: "Ciclo, comunicado pré-coleta, controles existentes e revisão técnica como etapa separada.",
      locator: "Fluxo de preparação do VitalOS",
    },
    {
      nature: "orientacao_oficial",
      title: MANUAL_MTE.title,
      supports: "Meios de consulta e de comunicação aos trabalhadores em SST.",
      locator: "Itens 6.2 e 6.3, p. 23–24",
      href: MANUAL_MTE.href,
    },
  ],
  review: REVIEW,
};

export const HELP_Q2_DEVOLUTIVA: ContextualHelpEntry = {
  id: "help.q2.devolutiva-coletiva",
  version: HELP_CONTENT_VERSION,
  route: "/ivo-integral/q2",
  anchor: "member-feedback-title",
  question: "O que esta devolutiva mostra?",
  summary:
    "Mostra as ações que a organização decidiu a partir do resultado FIB-T publicado, por ciclo, setor e fator. É uma leitura do grupo: não mostra a resposta de ninguém e não indica que o indicador melhorou.",
  roles: {
    geral: {
      example:
        "Se aparece uma ação sobre um fator no seu setor, ela responde ao resultado coletivo, não a uma resposta sua.",
      nextStep:
        "Acompanhe se o plano está ativo ou encerrado. Dúvidas sobre uma ação vão aos canais da sua organização.",
    },
    rh: {
      example: "Este é o retorno que os membros veem. A gestão do plano fica em Ações do ciclo.",
      nextStep: "Para incluir ações ou acompanhar registros, abra Ações do ciclo.",
      link: { to: "/ivo-integral/acoes", label: "Abrir Ações do ciclo" },
    },
  },
  limits: [
    "Não mostra respostas individuais.",
    "Uma ação listada não é prova de melhora do indicador.",
    "Lista vazia não é zero: pode ainda não haver resultado publicado ou ação em andamento.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Devolutiva coletiva do Q2",
      supports: "Projeção do servidor com ciclo, estado do plano, setor e fator, sem dado de pessoa.",
      locator: "Fluxo Q2 do VitalOS",
    },
  ],
  review: REVIEW,
};

export const HELP_Q2_ACOES: ContextualHelpEntry = {
  id: "help.q2.acoes-evidencias",
  version: HELP_CONTENT_VERSION,
  route: "/ivo-integral/acoes",
  anchor: "titulo-pagina",
  question: "Como ler as evidências deste plano?",
  summary:
    "O plano segue a ordem resultado → prioridade → ação → evidência → aprendizagem. A evidência de execução mostra que a ação aconteceu, mas não mostra que o indicador melhorou nem que a ação causou alguma mudança. Avaliar eficácia é uma etapa própria, com protocolo registrado.",
  flow: [
    { verb: "Registrar execução", who: "Responsável pela ação", text: "Informa que a ação aconteceu, como um encontro realizado." },
    { verb: "Registrar aprendizagem", who: "Quem conduziu a ação", text: "Anota o que a equipe aprendeu, sem nomes nem relatos individuais." },
    { verb: "Avaliar eficácia", who: "Papel habilitado no servidor", text: "Segue um protocolo próprio. Um registro de execução não substitui essa etapa." },
  ],
  roles: {
    geral: {
      example:
        "Esta área é de gestão do plano. O retorno para os membros fica na devolutiva coletiva do Q2.",
      nextStep: "Veja na devolutiva o que a organização está fazendo.",
      link: { to: "/ivo-integral/q2", label: "Ver a devolutiva coletiva" },
    },
    lideranca: {
      example:
        "Você vê só as ações das quais é responsável. Depois de um encontro com a equipe, registre a execução; o que a equipe aprendeu entra em aprendizagem.",
      nextStep: "Atualize o estado da ação e registre a evidência no card correspondente.",
    },
    rh: {
      example:
        "Você monta o plano a partir das prioridades, define responsável, prazo e indicador, e acompanha os registros na linha do tempo.",
      nextStep: "Abra a avaliação de eficácia só com protocolo registrado. Até lá, leia os registros como execução.",
    },
  },
  limits: [
    "Execução registrada não é prova de efeito.",
    "Registros usam referências coletivas: sem nomes, informações de saúde ou relatos individuais.",
    "O plano não serve para avaliar desempenho de pessoas.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Ciclo de ações da FIB-T",
      supports: "Diferença entre execução, aprendizagem e avaliação de eficácia; liderança vê só as próprias ações.",
      locator: "Fluxo de ações do VitalOS",
    },
  ],
  review: REVIEW,
};

export const CONTEXTUAL_HELP: readonly ContextualHelpEntry[] = [
  HELP_Q1_PREPARACAO,
  HELP_Q2_DEVOLUTIVA,
  HELP_Q2_ACOES,
  HELP_EMBAIXADORIAS,
  HELP_GUARDIOES_VOZ_SEGURA,
  HELP_VIAT_RESULTADO,
  HELP_EXPEDICAO_PRIORIDADE,
];

/** Resolver ligado aos registros congelados (Evidence + Claim Registry). */
export const resolveHelpEvidence = createHelpEvidenceResolver(EVIDENCE_REGISTRY, CLAIM_REGISTRY);

/**
 * Referências candidatas para curadoria. NÃO aparecem na tela: falta claim do Claim
 * Registry para o contexto (exigiria descongelamento formal e parecer humano).
 */
export const HELP_EVIDENCE_CANDIDATES = [
  {
    helpId: HELP_GUARDIOES_VOZ_SEGURA.id,
    studyId: "TRU-006",
    citation: "Edmondson (1999), Administrative Science Quarterly 44(2)",
    gap: "Sem claim para target_context 'embaixadorias-ajuda'. Os claims existentes valem para /voz-segura (passaporte, preparar conversa, ESG) e Q2.",
  },
  {
    helpId: HELP_VIAT_RESULTADO.id,
    studyId: null,
    citation: "Seligman, Steen, Park & Peterson (2005), American Psychologist 60(5) · PMID 16045394",
    gap: "Estudo fora do Evidence Registry congelado. Entrada exige verificação B2 e novo claim.",
  },
] as const;

/** Rótulos da moldura da ajuda (mesma fonte editorial do conteúdo). */
export const HELP_UI_COPY = {
  eyebrow: "Ajuda desta tela",
  demoBadge: "Demonstração",
  stateHeading: "O que a tela mostra agora",
  flowHeading: "Como a prática acontece",
  roleHeading: "Na sua função",
  roleSwitchLabel: "Ver a explicação como",
  yourRole: "seu perfil",
  generalRole: "Visão geral",
  nextStep: "Próximo passo",
  limitsHeading: "O que isto não é",
  sourcesHeading: "Fonte e alcance",
  sourcesHint: "De onde vem cada parte desta explicação",
  supports: "Sustenta",
  openOfficial: "Abrir a publicação oficial (PDF, português)",
  openStudy: "Ler o estudo original",
  openInApp: "Abrir no VitalOS",
  studyPending:
    "Estudo científico: a associação para este ponto ainda está em revisão. Por isso esta ajuda não cita estudo aqui.",
  close: "Fechar",
  newTab: " (abre em nova aba)",
  stepPrefix: (n: number) => `Passo ${n}: `,
  reviewLine: (version: string) => `Texto editorial v${version} · proposta em revisão humana`,
  natureLabel: {
    produto: "Como funciona no VitalOS",
    orientacao_oficial: "Orientação oficial",
    estudo: "Estudo científico",
  },
  roleLabel: {
    colaborador: "Colaborador",
    lideranca: "Liderança",
    rh: "RH",
    sst: "SST",
    direcao: "Direção",
  },
} as const;
