// Ajuda contextual · onda 4 (telas do piloto): /devolutiva, /lider e /rh. Versão 0.2.0,
// proposta editorial. Só regra de produto: nenhuma destas telas tem claim aprovado no
// Claim Registry, então nenhuma ajuda cita estudo. Cada afirmação descreve uma regra já
// implementada e verificada (leitura publicada com 5 ou mais respostas; plano ativado só
// com responsável, prazo e indicador; liderança vê só as próprias ações; SST não registra
// no plano; a organização vê só quantas pessoas praticaram, nunca quem, e só com 5 ou mais).
// A cerimônia da devolutiva ao vivo está desligada no produto (capacidade DEVOLUTIVA): a ajuda
// não a apresenta como próximo passo.

import type { ContextualHelpEntry } from "@/engine/help/contextual-help-engine";

const VERSION = "0.2.0";
const REVIEW = { status: "proposta_editorial", reviewer: null, date: "2026-11-21" } as const;

export const HELP_DEVOLUTIVA_COLETIVA: ContextualHelpEntry = {
  id: "help.devolutiva.coletiva",
  version: VERSION,
  route: "/devolutiva",
  anchor: "titulo-pagina",
  question: "Esta devolutiva é sobre mim ou sobre o grupo?",
  summary:
    "Sobre o grupo. A devolutiva mostra a leitura coletiva da onda: o índice e as lentes calculados a partir das respostas de todas as pessoas, nunca o resultado de alguém.",
  demoNotice:
    "Sem uma sessão real da organização, os números vêm da série de exemplo do setor ativo e não descrevem a sua empresa.",
  dataScope:
    "Médias do grupo, mostradas só com 5 ou mais respostas. Nenhuma resposta individual aparece para ninguém, nem para o RH.",
  afterwards:
    "A organização usa esta leitura para escolher o que vai transformar no ciclo. As ações escolhidas aparecem depois no Diário de cada pessoa, sem nomes.",
  whyItMatters:
    "Fecha o Educar: o grupo entende a leitura antes de decidir o que vai transformar.",
  roles: {
    geral: {
      example:
        "Você lê como o grupo está e qual lente pede mais atenção. A sua resposta não aparece aqui, e ninguém consegue ver o que você respondeu.",
      nextStep:
        "Acompanhe no Diário o que a organização está fazendo a partir desta leitura.",
      link: { to: "/diario", label: "Abrir o Diário" },
    },
    lideranca: {
      example:
        "Você vê a mesma leitura coletiva que o grupo. Ela serve para abrir conversa com a equipe sobre condições de trabalho, não para avaliar pessoas.",
      nextStep: "Leve à conversa da equipe a lente que pede mais atenção e a pergunta que a acompanha.",
    },
    rh: {
      example:
        "Você usa esta leitura para conversar com o grupo e escolher as prioridades do plano do ciclo.",
      nextStep: "Registre as ações escolhidas em Ações do ciclo.",
      link: { to: "/ivo-integral/acoes", label: "Abrir Ações do ciclo" },
    },
  },
  limits: [
    "Não é resultado individual nem avaliação de desempenho.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Devolutiva da onda",
      supports: "Leitura coletiva e limite de 5 respostas.",
      locator: "Motor da devolutiva do VitalOS",
    },
  ],
  review: REVIEW,
};

export const HELP_LIDER_ACAO: ContextualHelpEntry = {
  id: "help.lider.acao-atribuida",
  version: VERSION,
  route: "/lider",
  anchor: "plano-de-acao",
  question: "O que eu faço com uma ação atribuída a mim?",
  summary:
    "Quando o RH designa você como responsável por uma ação do plano, você registra a execução: atualiza o estado da ação e registra a evidência do que foi feito.",
  demoNotice:
    "Este painel é de demonstração: Rafael e a equipe são fictícios. As ações reais atribuídas a você ficam em Ações do ciclo.",
  dataScope:
    "Médias da sua equipe, só com 5 ou mais respostas. Você não vê respostas individuais nem o resultado de nenhuma pessoa.",
  afterwards:
    "O RH acompanha o estado e as evidências no plano. O colaborador vê na devolutiva o que está sendo feito, sem o seu nome e sem o conteúdo da evidência.",
  whyItMatters:
    "É o Transformar: a evidência mostra que a ação aconteceu. Mudança no indicador só aparece no ciclo seguinte e não é atribuída a você.",
  roles: {
    geral: {
      example:
        "O RH designa você para um ritual semanal de prioridades da equipe. Você marca a ação como em execução e registra, por exemplo, que o primeiro ritual aconteceu.",
      nextStep: "Abra Ações do ciclo para ver só as ações sob sua responsabilidade.",
      link: { to: "/ivo-integral/acoes", label: "Abrir Ações do ciclo" },
    },
  },
  limits: [
    "Você não cria nem ativa o plano: isso é do RH.",
    "Os registros não avaliam o desempenho de pessoas.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Ações do ciclo (Q2)",
      supports: "Escopo da liderança nas próprias ações, registro de estado e evidência, devolutiva sem nomes.",
      locator: "Ledger de ações do VitalOS",
    },
  ],
  review: REVIEW,
};

export const HELP_RH_JORNADA: ContextualHelpEntry = {
  id: "help.rh.da-leitura-a-aplicacao",
  version: VERSION,
  route: "/rh",
  anchor: "da-leitura-a-aplicacao",
  question: "Como sigo da leitura à aplicação?",
  summary:
    "Você lê o resultado coletivo publicado, cria ações a partir dele, designa a liderança responsável, acompanha a execução e a aprendizagem e devolve ao grupo o que está sendo feito.",
  flow: [
    { verb: "Ler", who: "RH", text: "Abra a leitura Q2: só aparecem setores com 5 ou mais respostas." },
    {
      verb: "Designar",
      who: "RH",
      text: "No plano, escolha a liderança responsável. O plano só é ativado com responsável, prazo e indicador em todas as ações.",
    },
    {
      verb: "Acompanhar",
      who: "RH e liderança",
      text: "A liderança registra a execução; você acompanha execução e aprendizagem em separado.",
    },
    {
      verb: "Devolver",
      who: "RH",
      text: "O colaborador vê no Diário o que está sendo feito, sem nomes nem conteúdo das evidências.",
    },
  ],
  dataScope:
    "Resultados agregados com 5 ou mais respostas. O plano e as evidências ficam só na sua organização; a área de SST não registra no plano.",
  afterwards:
    "No ciclo seguinte, a nova leitura mostra se a exposição mudou. Execução registrada não é avaliação de eficácia.",
  whyItMatters:
    "Liga o Mensurar ao Transformar e ao Evoluir: a leitura aponta onde agir, o plano registra o que foi feito e o próximo ciclo mostra o que mudou.",
  roles: {
    geral: {
      example:
        "O setor Equipe aparece com o fator Bem-Estar mais baixo. Você cria a ação, designa a liderança da equipe com prazo e indicador e ativa o plano.",
      nextStep: "Comece pela leitura Q2 e siga para Ações do ciclo.",
      link: { to: "/ivo-integral/acoes", label: "Abrir Ações do ciclo" },
    },
  },
  limits: [
    "Habilitar o módulo, coletar e publicar são etapas distintas.",
    "Execução e aprendizagem registradas não demonstram eficácia.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Jornada Q2 do VitalOS",
      supports: "Limite de publicação, regras de designação e ativação, acompanhamento e devolutiva.",
      locator: "Leitura Q2, ledger de ações e devolutiva do VitalOS",
    },
  ],
  review: REVIEW,
};

export const HELP_COLABORADOR_ACADEMIA: ContextualHelpEntry = {
  id: "help.colaborador.academia-privacidade",
  version: VERSION,
  route: "/colaborador",
  anchor: "sua-academia",
  question: "Quem vê minhas práticas e conquistas?",
  summary:
    "O detalhe é só seu. A organização vê apenas quantas pessoas participaram, nunca quem, e só quando há 5 pessoas ou mais.",
  dataScope:
    "Seus registros de participação ficam na sua conta e só você os lê. O RH e a liderança não veem o que você praticou nem quais conquistas você tem.",
  afterwards:
    "Cada prática registrada conta para o seu percurso na Academia. No Diário, um registro só entra na contagem coletiva se você consentir, e o texto nunca sai de lá.",
  whyItMatters:
    "É o Educar e o Transformar do seu lado: a prática conta para você, sem virar vigilância.",
  roles: {
    geral: {
      example:
        "Você registra que testou uma pausa sem reunião com a equipe. Isso soma uma prática no seu percurso; a organização só vê que mais uma pessoa praticou, se houver 5 ou mais.",
      nextStep: "Continue na Academia ou registre uma prática no Diário.",
      link: { to: "/diario", label: "Abrir o Diário" },
    },
  },
  limits: [
    "Práticas e conquistas não entram em avaliação de desempenho, promoção ou remuneração.",
    "Não há ranking entre pessoas.",
  ],
  sources: [
    {
      nature: "produto",
      title: "Academia e Diário de Prática",
      supports:
        "Leitura dos próprios registros, contagem coletiva sem identificar pessoas e limite de 5 pessoas.",
      locator: "Ledger de participação e motor do Diário do VitalOS",
    },
  ],
  review: REVIEW,
};

export const PILOT_HELP: readonly ContextualHelpEntry[] = [
  HELP_COLABORADOR_ACADEMIA,
  HELP_DEVOLUTIVA_COLETIVA,
  HELP_LIDER_ACAO,
  HELP_RH_JORNADA,
];
