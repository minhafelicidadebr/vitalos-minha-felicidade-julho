// Metodologia — artefato de credibilidade. A maior parte da página COMPÕE fontes
// únicas já existentes (CANONICAL_JOURNEY, METE_GLOSSARY, METHODOLOGY). Aqui vive
// só o que é próprio desta tela: o hero, as intros de seção e os compromissos
// éticos (a doutrina de honestidade/privacidade virando feature visível). Copy.

export const METODOLOGIA_HERO = {
  eyebrow: "Metodologia · A Ciência da Vitalidade",
  title: "Como o VitalOS mede o que importa — sem atalhos",
  lead:
    "Quatro instrumentos científicos, um ciclo operacional e uma fronteira ética inegociável. " +
    "Não é um questionário de clima: é um método longitudinal que transforma diagnóstico em " +
    "ação e ação em prova — protegendo as pessoas em cada passo.",
};

export const SECTIONS = {
  jornada: {
    title: "A jornada em quatro lentes",
    lead: "A ordem não é arbitrária: primeiro o que pode adoecer, depois o que faz florescer. Cada lente é um instrumento validado e uma pergunta-guia.",
  },
  mete: {
    title: "O ciclo M.E.T.E.",
    lead: "Cada lente roda o mesmo ciclo de 13 semanas. Aferir é só o começo — o trimestre inteiro existe para virar dado em mudança e prova.",
  },
  ciencia: {
    title: "A ciência por instrumento",
    lead: "Cada índice é rastreável à sua base científica. Nada é caixa-preta.",
  },
  evidencias: {
    title: "O corpus de evidência, aberto",
    lead: "Cada mecanismo do VitalOS se apoia num estudo verificado — explore o corpus, filtre por eixo e escolha o nível de leitura. Nenhum estudo aparece aqui sem passar pelo mesmo portão de confiança.",
  },
  etica: {
    title: "Compromissos inegociáveis",
    lead: "O que nos separa do teatro do bem-estar não é o dado — é o que recusamos fazer com ele.",
  },
};

export interface Guardrail {
  icon: "shield" | "split" | "scale" | "sigma" | "lock";
  title: string;
  desc: string;
}

export const GUARDRAILS: Guardrail[] = [
  {
    icon: "shield",
    title: "k-anonimato ≥ 5",
    desc: "Nenhum resultado individual aparece. Recortes só com 5+ respondentes (10+ em temas sensíveis). Se o grupo é pequeno demais para proteger, o dado não é mostrado.",
  },
  {
    icon: "split",
    title: "Separação de domínios A / B",
    desc: "Desenvolvimento (Domínio A) e risco psicossocial/saúde (Domínio B) nunca se cruzam. XP, vitalidade e forças jamais alimentam avaliação de desempenho.",
  },
  {
    icon: "scale",
    title: "Não é diagnóstico",
    desc: "O VIA-T é exploratório e de autodesenvolvimento — nunca laudo, ranking de pessoas, score de talento ou predição de desempenho. Linguagem de crescimento, não de julgamento.",
  },
  {
    icon: "sigma",
    title: "Transparência radical",
    desc: "Toda métrica mostra a fórmula e a fonte. Quando é estimativa, dizemos 'tendência', não promessa. Não prometemos resultado — mostramos como o número nasce.",
  },
  {
    icon: "lock",
    title: "Consentimento como produto",
    desc: "O colaborador controla o que a FlorescerIA pode observar. Privacidade é configuração no painel, não cláusula em política — e pode ser revogada a qualquer momento.",
  },
];

export const METODOLOGIA_CLOSING = {
  title: "Método é o que sustenta a confiança",
  lead: "Veja o método aplicado: a jornada operacional na prática, ou a prova consolidada do ano.",
};
