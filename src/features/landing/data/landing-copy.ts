// Landing — copy estruturada (sem dados reais, sem claims absolutos). Toda a
// narrativa premium da página principal vive aqui; os componentes só apresentam.
// Tom: institucional, SaaS de alto valor. Os instrumentos aparecem com seus
// qualificadores honestos (exploratório/educativo) — nunca como promessa clínica
// ou jurídica.

export type LandingModalType =
  | "journey"
  | "dashboard"
  | "executive"
  | "lenses-deep"
  | "method-deep"
  | "lens-copsoq"
  | "lens-fibt"
  | "lens-perma"
  | "lens-viat"
  | "nr1-playbook"
  | "innovation-yale"
  | "innovation-multiscience"
  | "innovation-nr1"
  | "application-enterprises"
  | "application-education"
  | "application-governments"
  | "application-cities"
  | "application-communities"
  | "ivo-eu"
  | "ivo-nos"
  | "ivo-lideranca"
  | "ivo-organizacao";

export type CtaAction =
  | { kind: "modal"; modal: LandingModalType }
  | { kind: "route"; to: string }
  | { kind: "anchor"; id: string };

export interface Cta {
  label: string;
  action: CtaAction;
  variant?: "primary" | "outline" | "ghost";
}

type IvoDimensionModalType = Extract<LandingModalType, `ivo-${string}`>;

interface IvoDimensionCopy {
  id: string;
  label: string;
  title: string;
  text: string;
  signal: string;
  tone: string;
  modal: IvoDimensionModalType;
  cta: string;
}

// ─── 1 · Hero ─────────────────────────────────────────────────────────────────
export const HERO = {
  eyebrow: "NR-1 EM VIGOR · RISCOS PSICOSSOCIAIS NO GRO/PGR",
  headline: "O Sistema Operacional da Vitalidade Organizacional",
  subheadline:
    "Transforme a adequação à NR-1 em uma jornada contínua de diagnóstico, aprendizagem e transformação. O VitalOS combina dados agregados, ciência da felicidade aplicada e planos de ação para proteger pessoas, fortalecer equipes e evidenciar a evolução.",
  support: "Meça o invisível. Desenvolva pessoas. Proteja a organização. Evidencie a evolução.",
  ctas: [
    {
      label: "Avaliar a prontidão da organização",
      action: { kind: "route", to: "/nr1" },
      variant: "primary",
    },
    {
      label: "Conhecer Sistema VitalOS",
      action: { kind: "anchor", id: "nova-categoria" },
      variant: "outline",
    },
  ] as Cta[],
  signals: ["k-anonimato ≥ 5", "Dados agregados", "Consentimento como produto", "WCAG 2.2 AA"],
};

// ─── 2 · Problema ─────────────────────────────────────────────────────────────
export const PROBLEM = {
  eyebrow: "O problema",
  title: "Quase sempre, o risco humano só aparece quando já é tarde",
  text: "A maior parte das organizações só percebe seus riscos humanos quando eles já viraram afastamento, turnover, conflito, baixa produtividade ou passivo trabalhista. O VitalOS ajuda gestores a enxergar antes, agir melhor e comprovar evolução com dados.",
  cards: [
    { icon: "shield-alert", title: "Riscos psicossociais não mapeados" },
    { icon: "puzzle", title: "Clima e cultura fragmentados" },
    { icon: "battery-low", title: "Baixa energia emocional" },
    { icon: "gem", title: "Talentos subutilizados" },
    { icon: "file-x", title: "Falta de evidências para ESG, RH e governança" },
    { icon: "activity", title: "Ações de bem-estar sem mensuração de impacto" },
  ],
};

// ─── 3 · Nova categoria ───────────────────────────────────────────────────────
export const CATEGORY = {
  eyebrow: "Nova categoria",
  title:
    "De programas isolados para um sistema operacional de florescimento humano com crescimento institucional",
  text: "O Sistema Operacional VitalOS não é apenas uma pesquisa de clima, nem apenas um dashboard de RH. É uma infraestrutura de inteligência organizacional que integra diagnóstico, educação, transformação, IA, gamificação ética, relatórios e certificação em uma jornada anual de evolução, conectando florescimento humano, compliance, ESG social e crescimento institucional em linguagem executiva.",
};

// ─── 3b · As 4 Dimensões da Vitalidade Organizacional ─────────────────────────
export const IVO_DIMENSIONS = {
  eyebrow: "As 4 Dimensões da Vitalidade Organizacional",
  title: "Onde a vitalidade acontece e onde a transformação precisa chegar",
  text: "O IVO organiza a atenção da liderança em quatro dimensões interdependentes: a experiência da pessoa, a qualidade dos vínculos, a prática da liderança e o sistema institucional. Essa arquitetura evita reduzir bem-estar a sentimento individual e mostra onde observar, aprender e agir.",
  insight:
    "Quando EU, NÓS, LIDERANÇA e ORGANIZAÇÃO evoluem juntos, o dado deixa de ser diagnóstico estático e vira direção de crescimento: mais energia, confiança, clareza e capacidade coletiva de agir.",
  dimensions: [
    {
      id: "eu",
      label: "EU",
      title: "Vitalidade da pessoa",
      text: "Energia, propósito, autonomia e crescimento percebidos no trabalho.",
      signal: "A pessoa sente que tem recurso interno para florescer.",
      tone: "sky",
      modal: "ivo-eu",
      cta: "Explorar a dimensão EU",
    },
    {
      id: "nos",
      label: "NÓS",
      title: "Qualidade dos vínculos",
      text: "Confiança, cooperação, reconhecimento e pertencimento no time.",
      signal: "O time vira ambiente seguro para aprender, contribuir e sustentar rituais.",
      tone: "emerald",
      modal: "ivo-nos",
      cta: "Explorar a dimensão NÓS",
    },
    {
      id: "lideranca",
      label: "LIDERANÇA",
      title: "Prática de gestão",
      text: "Clareza, justiça, feedback, cuidado ativo e regulação da carga.",
      signal: "A liderança transforma intenção cultural em rotina observável.",
      tone: "amber",
      modal: "ivo-lideranca",
      cta: "Explorar a dimensão LIDERANÇA",
    },
    {
      id: "organizacao",
      label: "ORGANIZAÇÃO",
      title: "Sistema institucional",
      text: "Políticas, governança, condições, coerência e compromisso com bem-comum.",
      signal: "A instituição cria as condições para o florescimento não depender de heroísmo.",
      tone: "violet",
      modal: "ivo-organizacao",
      cta: "Explorar a dimensão ORGANIZAÇÃO",
    },
  ] satisfies IvoDimensionCopy[],
  bridge: {
    eyebrow: "Arquitetura VitalOS 4 × 4",
    title: "As dimensões mostram onde agir. As lentes mostram como compreender e evoluir.",
    text: "Em cada trimestre, uma Lente VitalOS™ observa as quatro dimensões da vitalidade. O resultado é uma leitura sistêmica que conecta pessoa, vínculos, liderança e organização à prevenção, ao bem-comum, ao florescimento e às forças.",
    dimensionsLabel: "Onde a vitalidade acontece",
    lensesLabel: "Como a vitalidade é lida e desenvolvida",
    equation: "4 dimensões × 4 lentes × 4 trimestres",
  },
};

export const IVO_BRAND = {
  acronym: "IVO",
  name: "Índice de Vitalidade Organizacional",
  promise: "Vitalidade que conecta pessoas, vínculos, liderança e sistema institucional.",
  axes: ["EU", "NÓS", "LIDERANÇA", "ORGANIZAÇÃO"],
  signature: "medir • aprender • transformar • comprovar",
};

export const IVO_DIMENSION_MODALS = {
  "ivo-eu": {
    index: "01",
    label: "EU",
    title: "Vitalidade começa quando a pessoa recupera energia para agir",
    subtitle:
      "A dimensão EU torna visíveis os recursos internos que sustentam presença, autonomia, propósito e crescimento no trabalho, sem reduzir o indivíduo a uma nota.",
    thesis:
      "Antes de pedir mais desempenho, a organização precisa compreender se as pessoas dispõem de energia, clareza e margem psicológica para contribuir.",
    neuroHook:
      "O cérebro investe atenção quando percebe segurança, significado e possibilidade de escolha. A dimensão EU converte essas percepções em sinais agregados para orientar desenvolvimento, não vigilância.",
    tone: "sky",
    icon: "user",
    drivers: [
      {
        label: "Energia",
        title: "Recurso disponível",
        text: "Vitalidade física e emocional para sustentar atenção, presença e recuperação.",
      },
      {
        label: "Propósito",
        title: "Sentido percebido",
        text: "Conexão entre esforço cotidiano, contribuição e algo que vale a pena construir.",
      },
      {
        label: "Autonomia",
        title: "Capacidade de escolha",
        text: "Margem para decidir, organizar o trabalho e influenciar a própria experiência.",
      },
      {
        label: "Crescimento",
        title: "Futuro possível",
        text: "Percepção de aprendizagem, desenvolvimento e avanço profissional sustentável.",
      },
    ],
    learningFlow: [
      {
        k: "01",
        title: "Perceber",
        text: "A pessoa reconhece seu estado com linguagem simples e sem julgamento.",
      },
      {
        k: "02",
        title: "Compreender",
        text: "A devolutiva transforma o dado em significado e repertório de ação.",
      },
      {
        k: "03",
        title: "Experimentar",
        text: "Micropráticas e missões testam mudanças possíveis na rotina real.",
      },
      {
        k: "04",
        title: "Evoluir",
        text: "Novos pulsos mostram se energia, autonomia e sentido ganharam consistência.",
      },
    ],
    activations: [
      {
        title: "FlorescerIA",
        text: "Tutoria contextual para interpretar sinais e escolher práticas adequadas.",
      },
      {
        title: "Academia VitalOS",
        text: "Trilhas breves de autorregulação, forças, propósito, flow e vitalidade.",
      },
      {
        title: "Pulsos éticos",
        text: "Acompanhamento agregado, consentido e protegido por k-anonimato.",
      },
    ],
    outcome:
      "Gestores recebem tendências coletivas para melhorar condições e desenvolvimento. A pessoa recebe linguagem, escolhas e recursos para florescer sem exposição individual.",
    guardrail: "Desenvolvimento sem diagnóstico clínico, ranking ou monitoramento individual.",
  },
  "ivo-nos": {
    index: "02",
    label: "NÓS",
    title: "Times florescem quando confiança deixa de ser discurso e vira experiência",
    subtitle:
      "A dimensão NÓS observa a qualidade dos vínculos que transforma um grupo de pessoas em ambiente seguro para cooperar, aprender e realizar.",
    thesis:
      "Pertencimento não nasce em campanhas. Ele emerge de interações repetidas nas quais as pessoas podem contribuir, discordar, pedir ajuda e ser reconhecidas.",
    neuroHook:
      "Segurança relacional reduz o custo cognitivo da autoproteção. Quando o time percebe confiança e reciprocidade, mais energia fica disponível para aprendizagem, criatividade e colaboração.",
    tone: "emerald",
    icon: "users",
    drivers: [
      {
        label: "Confiança",
        title: "Previsibilidade relacional",
        text: "Acordos, coerência e liberdade para falar sem medo de punição indevida.",
      },
      {
        label: "Cooperação",
        title: "Inteligência coletiva",
        text: "Capacidade de compartilhar recursos, resolver tensões e agir em conjunto.",
      },
      {
        label: "Reconhecimento",
        title: "Contribuição percebida",
        text: "Sinais concretos de que esforço, ideias e avanços são vistos pelo grupo.",
      },
      {
        label: "Pertencimento",
        title: "Lugar legítimo",
        text: "Experiência de inclusão, identidade compartilhada e participação significativa.",
      },
    ],
    learningFlow: [
      {
        k: "01",
        title: "Escutar",
        text: "Pulsos agregados revelam padrões de confiança e fricção sem expor pessoas.",
      },
      {
        k: "02",
        title: "Dialogar",
        text: "A equipe transforma sinais em perguntas e acordos de convivência.",
      },
      {
        k: "03",
        title: "Ritualizar",
        text: "Reconhecimento, feedback e cooperação entram na cadência do trabalho.",
      },
      {
        k: "04",
        title: "Sustentar",
        text: "Indicadores e experimentos mostram quais rituais fortalecem os vínculos.",
      },
    ],
    activations: [
      {
        title: "Rituais de time",
        text: "Check-ins, pactos, retrospectivas e reconhecimento com intenção pedagógica.",
      },
      {
        title: "Missões cooperativas",
        text: "Gamificação ética que recompensa progresso coletivo, não competição interna.",
      },
      {
        title: "Mapa de vínculos",
        text: "Leitura agregada de confiança, pertencimento e segurança para aprender.",
      },
    ],
    outcome:
      "A liderança enxerga onde o vínculo amplia ou bloqueia a capacidade coletiva e recebe caminhos concretos para transformar clima em práticas sociais observáveis.",
    guardrail:
      "Leitura de padrões coletivos, nunca exposição de conflitos ou opiniões individuais.",
  },
  "ivo-lideranca": {
    index: "03",
    label: "LIDERANÇA",
    title: "A cultura se torna real naquilo que a liderança repete",
    subtitle:
      "A dimensão LIDERANÇA traduz intenção cultural em comportamentos observáveis: clareza, justiça, feedback, cuidado ativo e regulação responsável da carga.",
    thesis:
      "Pessoas não experimentam a estratégia no PowerPoint. Elas experimentam prioridades, decisões, conversas e limites estabelecidos por quem lidera.",
    neuroHook:
      "Ambiguidade, injustiça e imprevisibilidade mantêm o cérebro em estado de ameaça. Clareza, voz e feedback reduzem incerteza e liberam capacidade para decidir e executar.",
    tone: "amber",
    icon: "compass",
    drivers: [
      {
        label: "Clareza",
        title: "Direção compreensível",
        text: "Prioridades, papéis, critérios e expectativas que orientam decisões cotidianas.",
      },
      {
        label: "Justiça",
        title: "Coerência decisória",
        text: "Processos percebidos como explicáveis, consistentes e abertos à escuta.",
      },
      {
        label: "Feedback",
        title: "Aprendizagem contínua",
        text: "Conversas frequentes que reconhecem avanços e tornam o próximo passo possível.",
      },
      {
        label: "Cuidado ativo",
        title: "Carga sustentável",
        text: "Atenção a sinais de sobrecarga, recursos disponíveis e condições de execução.",
      },
    ],
    learningFlow: [
      {
        k: "01",
        title: "Enxergar",
        text: "A liderança recebe sinais agregados sobre a experiência real da gestão.",
      },
      {
        k: "02",
        title: "Aprender",
        text: "Trilhas convertem lacunas em repertório prático de liderança humana.",
      },
      {
        k: "03",
        title: "Praticar",
        text: "Experimentos aplicam novos rituais em decisões, carga, feedback e reconhecimento.",
      },
      {
        k: "04",
        title: "Comprovar",
        text: "Pulsos e evidências mostram se a prática gerencial mudou a experiência do time.",
      },
    ],
    activations: [
      {
        title: "Copiloto de liderança",
        text: "Recomendações contextuais com aprovação humana e rastreabilidade.",
      },
      {
        title: "Trilhas aplicadas",
        text: "Microaprendizagens sobre segurança psicológica, feedback e carga.",
      },
      {
        title: "Experimentos de gestão",
        text: "Planos curtos com hipótese, responsável, indicador e veredito.",
      },
    ],
    outcome:
      "A organização deixa de avaliar liderança apenas por intenção ou resultado final e passa a desenvolver práticas que conectam confiança, saúde, execução e aprendizagem.",
    guardrail:
      "Desenvolvimento gerencial baseado em padrões agregados, sem ranking punitivo de líderes.",
  },
  "ivo-organizacao": {
    index: "04",
    label: "ORGANIZAÇÃO",
    title: "Florescimento sustentável precisa estar incorporado ao sistema",
    subtitle:
      "A dimensão ORGANIZAÇÃO verifica se políticas, governança, recursos e decisões institucionais tornam a vitalidade possível, coerente e duradoura.",
    thesis:
      "Quando o bem-estar depende de esforço individual ou de líderes excepcionais, ele é frágil. A maturidade começa quando o sistema protege, aprende e melhora por desenho.",
    neuroHook:
      "Coerência institucional reduz cinismo e aumenta confiança. Quando discurso, regra e experiência se alinham, as pessoas investem mais energia porque o ambiente se torna previsível e legítimo.",
    tone: "violet",
    icon: "building",
    drivers: [
      {
        label: "Políticas",
        title: "Regras que protegem",
        text: "Diretrizes e critérios que incorporam prevenção, equidade e desenvolvimento.",
      },
      {
        label: "Governança",
        title: "Decisão rastreável",
        text: "Papéis, fóruns, evidências e responsabilidades para agir e prestar contas.",
      },
      {
        label: "Condições",
        title: "Recursos reais",
        text: "Carga, tecnologia, tempo e suporte compatíveis com o trabalho esperado.",
      },
      {
        label: "Coerência",
        title: "Promessa vivida",
        text: "Alinhamento entre valores declarados, decisões, incentivos e experiência humana.",
      },
    ],
    learningFlow: [
      {
        k: "01",
        title: "Integrar",
        text: "Dados humanos entram na governança junto a risco, estratégia e ESG.",
      },
      {
        k: "02",
        title: "Priorizar",
        text: "Lacunas sistêmicas viram backlog com responsáveis, prazos e critérios.",
      },
      {
        k: "03",
        title: "Transformar",
        text: "Políticas, processos e recursos são testados por experimentos controlados.",
      },
      {
        k: "04",
        title: "Prestar contas",
        text: "Relatórios consolidam evolução, evidências e maturidade institucional.",
      },
    ],
    activations: [
      {
        title: "Governança ESG",
        text: "Indicadores sociais conectados a evidências, planos e relato executivo.",
      },
      {
        title: "NR-1 e ISO 45003",
        text: "Prevenção psicossocial integrada ao GRO/PGR e à melhoria contínua.",
      },
      {
        title: "Relatório Global",
        text: "Síntese board-ready das quatro dimensões, lentes aplicadas, decisões e evolução anual.",
      },
    ],
    outcome:
      "Conselho, RH, SST e lideranças passam a compartilhar uma infraestrutura comum para prevenir riscos, desenvolver pessoas e demonstrar evolução institucional.",
    guardrail:
      "Governança com dados agregados, finalidade explícita, consentimento e trilha de auditoria.",
  },
} as const;

// ─── 4 · As 4 Lentes VitalOS™ (Q1–Q4) ─────────────────────────────────────────
export const LENSES = {
  eyebrow: "4 Lentes VitalOS™ de Mensuração, Aprendizagem e Evolução",
  title: "Quatro leituras complementares para desenvolver as mesmas quatro dimensões",
  lead: "COPSOQ, FIB-T, PERMA+V e VIA-T entram em sequência ao longo do ano. Cada lente observa EU, NÓS, LIDERANÇA e ORGANIZAÇÃO por um ângulo científico distinto.",
  annual:
    "Programa anual em quatro trimestres: cada lente entra no momento certo, lê as quatro dimensões, transforma aprendizado em ação e consagra o ciclo no Relatório Global ESG.",
  finale: {
    q: "Q5",
    title: "Relatório Global ESG",
    text: "Síntese anual board-ready: evidências, evolução, recomendações e maturidade institucional.",
  },
  items: [
    {
      q: "Q1",
      period: "Trimestre 1",
      instrument: "COPSOQ",
      theme: "Compliance & Prevenção",
      text: "Mapeamento educativo de fatores psicossociais, riscos organizacionais e prioridades de prevenção.",
      tone: "sky",
      modal: "lens-copsoq",
    },
    {
      q: "Q2",
      period: "Trimestre 2",
      instrument: "FIB-T",
      theme: "Ecossistema & Governança",
      text: "Leitura sistêmica da qualidade de vida no trabalho — bem-comum, tempo, comunidade, vitalidade e governança.",
      tone: "emerald",
      modal: "lens-fibt",
    },
    {
      q: "Q3",
      period: "Trimestre 3",
      instrument: "PERMA+V",
      theme: "Performance & Flow",
      text: "Mensuração de florescimento, energia, engajamento, relações, sentido, realização e vitalidade.",
      tone: "rose",
      modal: "lens-perma",
    },
    {
      q: "Q4",
      period: "Trimestre 4",
      instrument: "VIA-T",
      theme: "Cultura & Forças",
      text: "Mapeamento exploratório de forças, talentos, virtudes e diversidade de potência nas equipes.",
      tone: "violet",
      modal: "lens-viat",
    },
  ],
  cta: {
    label: "Ver a ciência por trás das lentes",
    action: { kind: "modal", modal: "lenses-deep" },
    variant: "primary",
  } as Cta,
};

// ─── Deep dive · As 4 Lentes (ciência aplicada) ───────────────────────────────
export const LENSES_DEEP = {
  title: "As 4 Lentes VitalOS™ — mensuração, aprendizagem e evolução em cada trimestre",
  subtitle:
    "Quatro instrumentos complementares que observam as mesmas dimensões — EU, NÓS, LIDERANÇA e ORGANIZAÇÃO — por ângulos científicos distintos. Juntos, traduzem complexidade humana em aprendizagem e ação.",
  hook: "As dimensões mostram onde a vitalidade acontece. As lentes revelam como ela precisa ser compreendida, desenvolvida e acompanhada ao longo do ano.",
  pillars: [
    {
      q: "Q1 · Compliance & Prevenção",
      instrument: "COPSOQ II / NR-1",
      science:
        "Copenhagen Psychosocial Questionnaire — referência internacional em fatores psicossociais (Kristensen, NRCWE).",
      what: "Mapeia educativamente exigências, controle, suporte, recompensa e ambientes adoecedores.",
      why: "Antecipa risco psicossocial antes que vire afastamento, passivo trabalhista ou crise — alinhado à NR-1 (Guia MTE 2026).",
      tone: "sky",
    },
    {
      q: "Q2 · Ecossistema & Governança",
      instrument: "FIB-T (Furtado, 2020)",
      science:
        "Felicidade Interna Bruta no Trabalho — 32 itens, 3 fatores, 9 domínios. Ponte direta entre bem-estar e ESG.",
      what: "Leitura sistêmica do bem-comum, tempo, comunidade, vitalidade e governança organizacional.",
      why: "Conecta cultura a indicadores E/S/G rastreáveis e ao relato de sustentabilidade do conselho.",
      tone: "emerald",
    },
    {
      q: "Q3 · Performance & Flow",
      instrument: "PERMA+V (Seligman / Butler & Kern)",
      science:
        "Psicologia Positiva aplicada ao trabalho — Positive emotions, Engagement, Relationships, Meaning, Achievement + Vitality.",
      what: "Mensura florescimento, engajamento real, sentido percebido e energia disponível para entregar.",
      why: "Florescimento no trabalho se associa a mais engajamento, criatividade e saúde sustentável; no VITALOS, qualquer impacto vira hipótese mensurada, não promessa.",
      tone: "rose",
    },
    {
      q: "Q4 · Cultura & Forças",
      instrument: "VIA-T v1 (exploratório, adaptado de Peterson & Seligman)",
      science: "24 forças de caráter, 6 virtudes universais — base do Values in Action Institute.",
      what: "Identifica forças, talentos, virtudes e diversidade de potência dentro de cada time.",
      why: "Times que jogam com suas forças têm 6× mais engajamento e 3× mais qualidade de vida no trabalho.",
      tone: "violet",
    },
  ],
  closing:
    "Cada lente é honesta sobre seus limites. Juntas, formam evidência — não opinião. É assim que se governa a vitalidade humana com o rigor de um sistema operacional.",
  cta: {
    label: "Quero ver isso aplicado na minha organização",
    action: { kind: "modal", modal: "executive" },
    variant: "primary",
  } as Cta,
};

export const LENS_TOOL_MODALS = {
  "lens-copsoq": {
    quarter: "Q1 · Trimestre 1",
    instrument: "COPSOQ",
    theme: "Compliance & Prevenção",
    title: "O mapa preventivo dos fatores psicossociais",
    subtitle:
      "A primeira lente cria segurança metodológica: antes de falar em felicidade, a organização precisa enxergar o que pode adoecer pessoas e times.",
    neuroHook:
      "O cérebro aprende melhor quando reduz incerteza. O COPSOQ transforma risco difuso em mapa visual, linguagem comum e prioridade de ação.",
    measures: [
      "Exigências do trabalho",
      "Autonomia e controle",
      "Suporte social",
      "Reconhecimento",
      "Conflitos e insegurança",
    ],
    learningFlow: [
      "Nomear o risco",
      "Priorizar recortes agregados",
      "Criar plano preventivo",
      "Registrar evidência NR-1",
    ],
    output:
      "Matriz educativa de riscos psicossociais, prioridades de prevenção e recomendações agregadas.",
    evidence:
      "Baseado no Copenhagen Psychosocial Questionnaire como referência internacional para fatores psicossociais no trabalho.",
    tone: "sky",
  },
  "lens-fibt": {
    quarter: "Q2 · Trimestre 2",
    instrument: "FIB-T",
    theme: "Ecossistema & Governança",
    title: "A leitura sistêmica do bem-comum no trabalho",
    subtitle:
      "Depois de reduzir risco, a segunda lente amplia a visão: qualidade de vida, vínculos, tempo, comunidade, governança e vitalidade institucional.",
    neuroHook:
      "Pessoas engajam quando percebem pertencimento e justiça. O FIB-T traduz o bem-comum em sinais organizacionais que líderes conseguem governar.",
    measures: ["Bem-comum", "Tempo e equilíbrio", "Comunidade", "Vitalidade", "Governança"],
    learningFlow: [
      "Ler o ecossistema",
      "Encontrar padrões de confiança",
      "Educar lideranças",
      "Conectar a ESG social",
    ],
    output:
      "Mapa de qualidade de vida no trabalho com sinais de governança humana e maturidade cultural.",
    evidence:
      "Inspirado na lógica da Felicidade Interna Bruta aplicada ao contexto de trabalho e à governança de bem-estar.",
    tone: "emerald",
  },
  "lens-perma": {
    quarter: "Q3 · Trimestre 3",
    instrument: "PERMA+V",
    theme: "Performance & Flow",
    title: "O pulso do florescimento, energia e realização",
    subtitle:
      "A terceira lente mede o que sustenta performance humana: emoções positivas, engajamento, relações, sentido, realização e vitalidade.",
    neuroHook:
      "Florescimento não é ornamento: ele regula energia, atenção, criatividade e persistência. PERMA+V torna esses recursos observáveis.",
    measures: [
      "Emoções positivas",
      "Engajamento",
      "Relações",
      "Sentido",
      "Realização",
      "Vitalidade",
    ],
    learningFlow: [
      "Mensurar energia",
      "Interpretar motivadores",
      "Ativar microaprendizagens",
      "Testar experimentos de flow",
    ],
    output:
      "Radar de florescimento e vitalidade com hipóteses de intervenção para times e lideranças.",
    evidence:
      "Baseado na Psicologia Positiva aplicada ao trabalho, com leitura ética e agregada dos fatores de florescimento.",
    tone: "rose",
  },
  "lens-viat": {
    quarter: "Q4 · Trimestre 4",
    instrument: "VIA-T",
    theme: "Cultura & Forças",
    title: "A cartografia das forças que dão potência à cultura",
    subtitle:
      "A quarta lente fecha o ciclo antes da síntese ESG: identifica forças, talentos, virtudes e diversidade de potência nas equipes.",
    neuroHook:
      "O aprendizado acelera quando pessoas reconhecem suas forças e sabem onde aplicá-las. VIA-T transforma virtude em repertório de ação coletiva.",
    measures: [
      "Forças de caráter",
      "Virtudes",
      "Talentos percebidos",
      "Diversidade de potência",
      "Rituais culturais",
    ],
    learningFlow: [
      "Reconhecer forças",
      "Combinar complementaridades",
      "Desenhar rituais",
      "Preparar síntese anual",
    ],
    output:
      "Mapa exploratório de forças e virtudes para cultura, reconhecimento e desenvolvimento de lideranças.",
    evidence:
      "Inspirado no campo VIA de forças de caráter, usado aqui como lente exploratória de desenvolvimento, não como avaliação individual.",
    tone: "violet",
  },
} as const;

// ─── 4 (Q5) · Relatório Global ESG ────────────────────────────────────────────
export const GLOBAL_ESG = {
  eyebrow: "Q5 · Inteligência Sistêmica",
  badge: "Relatório Global ESG",
  title: "O ano inteiro, sintetizado em evidência",
  text: "Síntese anual com evolução, evidências, recomendações, indicadores e maturidade organizacional — as quatro lentes aplicadas às quatro dimensões e consolidadas na linguagem de ESG e governança.",
  points: [
    "Evolução longitudinal por lente",
    "Indicadores E/S/G rastreáveis ao instrumento",
    "Maturidade e recomendações priorizadas",
    "Pronto para conselho e relato de sustentabilidade",
  ],
};

// ─── 5 · Como funciona (M.E.T.E.) ─────────────────────────────────────────────
export const METHODOLOGY = {
  eyebrow: "Como funciona",
  title: "Mensurar, Educar, Transformar e Evoluir",
  steps: [
    {
      key: "mensurar",
      title: "Mensurar",
      text: "Diagnósticos científicos, ciclos de aplicação, indicadores e baseline organizacional.",
    },
    {
      key: "educar",
      title: "Educar",
      text: "Trilhas, microaprendizagens, conteúdos aplicados e apoio da FlorescerIA.",
    },
    {
      key: "transformar",
      title: "Transformar",
      text: "Missões, experimentos, planos de ação e gamificação cooperativa.",
    },
    {
      key: "evoluir",
      title: "Evoluir",
      text: "Dashboards, relatórios, selo, benchmark, ESG e inteligência preditiva.",
    },
  ],
  cta: {
    label: "Entender o método M.E.T.E. em profundidade",
    action: { kind: "modal", modal: "method-deep" },
    variant: "primary",
  } as Cta,
};

// ─── Deep dive · Método M.E.T.E. (ciência do aprendizado aplicada) ────────────
export const METHOD_DEEP = {
  title: "M.E.T.E. — o ciclo anual que transforma dado em evidência",
  subtitle:
    "Mensurar · Educar · Transformar · Evoluir. Um ano dividido em quatro temporadas, cada uma fundamentada na ciência do aprendizado adulto, da mudança comportamental e da gestão baseada em evidência.",
  hook: "A maior parte das pesquisas de clima morre num PDF. O M.E.T.E. transforma o ciclo inteiro em aprendizado vivo da organização.",
  stages: [
    {
      n: "01",
      title: "Mensurar",
      science: "Psicometria · COPSOQ, FIB-T, PERMA+V, VIA-T",
      what: "Diagnóstico científico aplicado por trimestre. Baseline rastreável ao instrumento, k-anonimato ≥ 5 garantido por construção.",
      learning:
        "Princípio da consciência (Kolb): toda mudança duradoura começa com uma percepção honesta da realidade atual.",
      tone: "sky",
    },
    {
      n: "02",
      title: "Educar",
      science: "Microaprendizagem · Andragogia · Trilhas FlorescerIA",
      what: "Conteúdos aplicados, micro-doses, vídeos, podcasts e copilota de IA que devolve sentido ao dado coletado.",
      learning:
        "Curva de Ebbinghaus + Bloom revisado: aprendizado espaçado, contextualizado e ativado supera 4× o e-learning tradicional.",
      tone: "emerald",
    },
    {
      n: "03",
      title: "Transformar",
      science: "Behavioral Design · Nudges · Gamificação cooperativa",
      what: "Missões, experimentos, Culture Lab e planos de ação por time — co-criados, não impostos.",
      learning:
        "BJ Fogg: comportamento = motivação × habilidade × gatilho. A plataforma desenha os três no fluxo de trabalho.",
      tone: "rose",
    },
    {
      n: "04",
      title: "Evoluir",
      science: "Evidence-based management · ESG · Selo Empresa Viva",
      what: "Dashboards, relatórios anuais, benchmark setorial anônimo, inteligência preditiva e certificação computada do ciclo anual.",
      learning:
        "Deming: o que não se mede não se melhora; o que se mede e se comunica gera cultura. O ciclo recomeça com novo baseline.",
      tone: "violet",
    },
  ],
  pillars: [
    "Cada temporada dura ≈ 13 semanas — cadência de aprendizado, não de checklist.",
    "Cada lente entra na hora certa: primeiro o risco, depois o florescimento, depois as forças, depois a síntese.",
    "Cada papel — colaborador, líder, RH, C-Level — tem o seu painel e o seu nudge no tempo certo.",
    "Cada ciclo deixa rastro auditável: nada se perde, tudo se compõe na evidência do ano.",
  ],
  closing:
    "M.E.T.E. não é uma metodologia decorativa. É como uma organização adulta aprende a si mesma — com método, ética e evidência.",
  cta: {
    label: "Ver a jornada de 12 meses em detalhe",
    action: { kind: "modal", modal: "journey" },
    variant: "primary",
  } as Cta,
};

// ─── 6 · O que a plataforma entrega ───────────────────────────────────────────
export const MODULES = {
  eyebrow: "A plataforma",
  title: "Tudo o que a organização precisa, em um só sistema",
  items: [
    {
      icon: "layout-dashboard",
      title: "Dashboard executivo",
      desc: "Risco, cultura, performance e ESG em linguagem de board.",
    },
    {
      icon: "users",
      title: "Painel de RH",
      desc: "Heatmap, prioridades e jornada anual de evolução.",
    },
    {
      icon: "compass",
      title: "Painel de liderança",
      desc: "Recomendações práticas para o time, no agregado.",
    },
    {
      icon: "user-round",
      title: "Jornada do colaborador",
      desc: "Check-ins, trilhas e reconhecimento — voluntário.",
    },
    {
      icon: "sparkles",
      title: "FlorescerIA",
      desc: "Copilota que lê os motores e propõe — com aprovação humana.",
    },
    {
      icon: "shield-check",
      title: "Trust Ledger",
      desc: "Consentimento e privacidade auditáveis, como produto.",
    },
    {
      icon: "file-bar-chart",
      title: "Relatório Global ESG",
      desc: "Síntese anual de evidências, pronta para o conselho.",
    },
    {
      icon: "award",
      title: "Selo VitalOS™",
      desc: "Certificação computada do ciclo anual — não comprada.",
    },
  ],
};

// ─── 6b · Ecossistemas de aplicação ──────────────────────────────────────────
export const APPLICATIONS = {
  eyebrow: "Ecossistema operacional",
  title: "O mesmo sistema de vitalidade, adaptado a diferentes organizações",
  lead: "O VitalOS preserva as quatro dimensões do IVO — EU, NÓS, LIDERANÇA e ORGANIZAÇÃO — e adapta linguagem, indicadores, rituais e evidências ao contexto onde o florescimento precisa acontecer.",
  items: [
    {
      modal: "application-enterprises",
      icon: "briefcase",
      label: "Empresas",
      title: "VitalOS Empresas",
      text: "Bem-estar corporativo, compliance NR-1, ESG social e gestão de riscos psicossociais para organizações de todos os portes.",
      signal:
        "Sinal estratégico: saúde mental, cultura e produtividade já são pauta de risco, reputação e crescimento.",
      cta: "Transforme sua organização",
      tone: "sky",
    },
    {
      modal: "application-education",
      icon: "graduation-cap",
      label: "Educação",
      title: "VitalOS Educação",
      text: "EdTech para escolas, redes de ensino e IES com Educação Positiva, clima escolar e florescimento de estudantes e educadores.",
      signal:
        "Sinal estratégico: exaustão docente, pertencimento estudantil e segurança emocional pedem gestão contínua.",
      cta: "Conheça para escolas",
      tone: "emerald",
    },
    {
      modal: "application-governments",
      icon: "layout-dashboard",
      label: "Governos",
      title: "VitalOS Gov",
      text: "GovTech de bem-estar público: FIB Cidades, saúde mental de servidores e políticas baseadas em evidências.",
      signal:
        "Sinal estratégico: a Agenda 2030 pede métricas humanas, territoriais e socioambientais para decisões públicas.",
      cta: "Veja para governos",
      tone: "amber",
    },
    {
      modal: "application-cities",
      icon: "compass",
      label: "Cidades",
      title: "VitalOS Cidades",
      text: "Sistema operacional de felicidade urbana com FIB Cidades, Mini PERMA e dashboards territoriais.",
      signal:
        "Sinal estratégico: ODS 11 exige cidades e comunidades mais sustentáveis, inclusivas, seguras e resilientes.",
      cta: "Explore para cidades",
      tone: "rose",
    },
    {
      modal: "application-communities",
      icon: "users-round",
      label: "Comunidades",
      title: "VitalOS Comunidades",
      text: "Infraestrutura de bem-estar, convivência, cuidado e corresponsabilidade para condomínios, bairros e comunidades.",
      signal:
        "Sinal estratégico: transformar onde se vive em ecossistema de apoio reduz isolamento e aumenta pertencimento.",
      cta: "Descubra comunidades",
      tone: "violet",
    },
  ],
} as const;

export const APPLICATION_MODALS = {
  "application-enterprises": {
    eyebrow: "Adaptação IVO · Empresas",
    title: "Índice de Vitalidade Organizacional para crescimento institucional",
    subtitle:
      "Nas empresas, o IVO transforma saúde mental, cultura, liderança e ESG social em uma agenda executiva de prevenção, performance humana e governança.",
    thesis:
      "Vitalidade corporativa não é benefício isolado: é capacidade institucional de proteger pessoas, desenvolver times e sustentar crescimento com evidência.",
    dimensions: [
      {
        label: "Eu",
        title: "Energia e autonomia do colaborador",
        text: "Lê recursos internos, carga percebida, propósito, segurança emocional e condição de florescer no trabalho.",
        tone: "sky",
      },
      {
        label: "Nós",
        title: "Confiança e cooperação no time",
        text: "Observa pertencimento, reconhecimento, segurança psicológica e qualidade dos rituais coletivos.",
        tone: "emerald",
      },
      {
        label: "Liderança",
        title: "Gestão que regula risco e desempenho",
        text: "Traduz cuidado, clareza, feedback, justiça e gestão de carga em prática observável.",
        tone: "amber",
      },
      {
        label: "Organização",
        title: "Governança, NR-1 e ESG social",
        text: "Conecta políticas, evidências, prevenção e coerência institucional para decisão de conselho.",
        tone: "violet",
      },
    ],
    learning:
      "A ciência do aprendizado entra em microciclos: diagnóstico, devolutiva, prática de liderança, experimento de cultura e evidência para governança.",
    outcome:
      "Entrega para gestores: mapa de riscos e potências, prioridades por criticidade, trilhas de desenvolvimento e relatório executivo auditável.",
  },
  "application-education": {
    eyebrow: "Adaptação IVO · Educação",
    title: "Vitalidade educacional para escolas, redes e IES",
    subtitle:
      "Na educação, o IVO lê o florescimento de estudantes, educadores, equipes pedagógicas e gestão institucional como um ecossistema de aprendizagem.",
    thesis:
      "Uma instituição educacional floresce quando aprender, conviver e cuidar deixam de ser ações separadas e viram cultura mensurável.",
    dimensions: [
      {
        label: "Eu",
        title: "Estudante e educador com recursos internos",
        text: "Mapeia vitalidade, sentido, emoções, segurança para aprender e percepção de progresso.",
        tone: "sky",
      },
      {
        label: "Nós",
        title: "Turmas e equipes com pertencimento",
        text: "Observa vínculos, clima escolar, cooperação, respeito, convivência e apoio entre pares.",
        tone: "emerald",
      },
      {
        label: "Liderança",
        title: "Gestão pedagógica e cuidado ativo",
        text: "Acompanha escuta, clareza, apoio a professores, mediação de conflitos e coerência educativa.",
        tone: "amber",
      },
      {
        label: "Instituição",
        title: "Política de bem-estar e aprendizagem",
        text: "Conecta projeto pedagógico, Educação Positiva, dados, família, território e governança escolar.",
        tone: "violet",
      },
    ],
    learning:
      "O design instrucional usa devolutivas visuais, rituais socioemocionais, trilhas para educadores e práticas curtas que entram na rotina pedagógica.",
    outcome:
      "Entrega para gestores: mapa de clima e florescimento, prioridades por segmento, trilhas formativas e evidências para redes, conselhos e famílias.",
  },
  "application-governments": {
    eyebrow: "Adaptação IVO · Governos",
    title: "Vitalidade governamental para servidores, políticas e território",
    subtitle:
      "Em governos, o IVO vira infraestrutura GovTech para saúde mental de servidores, bem-estar público, FIB Cidades e decisões intersetoriais.",
    thesis:
      "Política pública de bem-estar exige escuta contínua, recortes territoriais, indicadores compreensíveis e capacidade de coordenar ações entre áreas.",
    dimensions: [
      {
        label: "Eu",
        title: "Servidor e cidadão com dignidade",
        text: "Lê vitalidade, acesso, segurança emocional, sentido de serviço e percepção de qualidade de vida.",
        tone: "sky",
      },
      {
        label: "Nós",
        title: "Equipes públicas e comunidades",
        text: "Observa confiança, colaboração, convivência, redes de apoio e capital social.",
        tone: "emerald",
      },
      {
        label: "Liderança",
        title: "Gestão pública orientada por evidências",
        text: "Traduz prioridades, cuidado com servidores, transparência e corresponsabilidade em rotina decisória.",
        tone: "amber",
      },
      {
        label: "Sistema",
        title: "Governança intersetorial e ODS",
        text: "Conecta saúde, educação, assistência, segurança, cultura, território e indicadores da Agenda 2030.",
        tone: "violet",
      },
    ],
    learning:
      "A aprendizagem acontece por painéis territoriais, laboratórios de política pública, formação de lideranças e ciclos de prestação de contas.",
    outcome:
      "Entrega para gestores: diagnóstico territorial, priorização intersetorial, trilhas de cuidado para servidores e relatórios de impacto público.",
  },
  "application-cities": {
    eyebrow: "Adaptação IVO · Cidades",
    title: "Vitalidade urbana para felicidade pública e comunidades sustentáveis",
    subtitle:
      "Nas cidades, o IVO se expande para bairros, serviços, convivência, pertencimento e qualidade de vida territorial.",
    thesis:
      "Uma cidade floresce quando dados humanos ajudam a decidir onde investir, que vínculos fortalecer e quais serviços precisam evoluir.",
    dimensions: [
      {
        label: "Eu",
        title: "Morador com bem-estar percebido",
        text: "Lê segurança, mobilidade emocional, acesso, tempo, saúde, sentido de lugar e esperança.",
        tone: "sky",
      },
      {
        label: "Nós",
        title: "Bairro com vínculos e confiança",
        text: "Observa convivência, redes de apoio, cultura, participação e pertencimento comunitário.",
        tone: "emerald",
      },
      {
        label: "Liderança",
        title: "Gestão territorial e escuta ativa",
        text: "Acompanha capacidade de responder, comunicar prioridades e coordenar agentes locais.",
        tone: "amber",
      },
      {
        label: "Cidade",
        title: "ODS 11 e governança urbana",
        text: "Conecta dados de bem-estar, sustentabilidade, inclusão, segurança, serviços e planejamento urbano.",
        tone: "violet",
      },
    ],
    learning:
      "O método combina mapas participativos, devolutivas por território, missões comunitárias e aprendizagem cívica baseada em evidências.",
    outcome:
      "Entrega para gestores: dashboard territorial, mapa de vulnerabilidades e potências, prioridades por bairro e relatório de felicidade urbana.",
  },
  "application-communities": {
    eyebrow: "Adaptação IVO · Comunidades",
    title: "Vitalidade comunitária para convivência, apoio e pertencimento",
    subtitle:
      "Em comunidades, condomínios e bairros, o IVO vira tecnologia social para fortalecer relações, cuidado mútuo e cultura de convivência.",
    thesis:
      "O lugar onde se vive também pode ser um ecossistema de florescimento: menos isolamento, mais confiança, mais participação e mais cuidado.",
    dimensions: [
      {
        label: "Eu",
        title: "Pessoa com segurança e pertencimento",
        text: "Lê bem-estar percebido, solidão, apoio, participação e sentido de comunidade.",
        tone: "sky",
      },
      {
        label: "Nós",
        title: "Relações de vizinhança e apoio",
        text: "Observa cooperação, confiança, convivência, acolhimento e resolução de conflitos.",
        tone: "emerald",
      },
      {
        label: "Liderança",
        title: "Síndicos, lideranças e guardiões locais",
        text: "Traduz escuta, mediação, comunicação e mobilização em práticas simples e recorrentes.",
        tone: "amber",
      },
      {
        label: "Comunidade",
        title: "Infraestrutura social de cuidado",
        text: "Conecta espaços, regras, rituais, canais de ajuda, cultura e corresponsabilidade.",
        tone: "violet",
      },
    ],
    learning:
      "A ciência do aprendizado vira rituais leves: encontros, missões de convivência, desafios cooperativos e devolutivas visuais por comunidade.",
    outcome:
      "Entrega para gestores locais: mapa de pertencimento, prioridades de convivência, agenda de cuidado comunitário e evidências de participação.",
  },
} as const;

// ─── DashboardPreview (mock visual) ───────────────────────────────────────────
export const DASHBOARD_PREVIEW = {
  eyebrow: "Demonstração",
  title: "Veja a vitalidade ganhar forma",
  note: "Pré-visualização ilustrativa com dados fictícios — não representa nenhuma organização real.",
  metrics: [
    { label: "Índice de Vitalidade", value: "619", sub: "/1000 · Saudável" },
    { label: "Participação", value: "78%", sub: "agregada (n≥5)" },
    { label: "Tendência", value: "↑ +51", sub: "vs. ciclo anterior" },
  ],
  dimensions: [
    { name: "EU", score: 71 },
    { name: "NÓS", score: 64 },
    { name: "LIDERANÇA", score: 58 },
    { name: "ORGANIZAÇÃO", score: 49 },
  ],
  cta: {
    label: "Explorar dashboard demo",
    action: { kind: "modal", modal: "dashboard" },
    variant: "outline",
  } as Cta,
};

// ─── 6c · Inovações Educacionais ─────────────────────────────────────────────
export const EDUCATIONAL_INNOVATIONS = {
  eyebrow: "Inovações Educacionais",
  title: "Formações que transformam ciência da felicidade em aprendizagem viva",
  lead: "Um ecossistema EdTech de alto impacto: ciência rigorosa, IA tutora, gamificação ética, design instrucional e evidências aplicadas para escolas, empresas, governos e comunidades.",
  imageAlt:
    "Educadores, estudantes e líderes em um laboratório de aprendizagem com interfaces holográficas sobre felicidade, dados e inovação educacional",
  highlights: [
    "IA tutora",
    "Gamificação ética",
    "Evidências verificáveis",
    "Aprendizagem aplicada",
  ],
  items: [
    {
      modal: "innovation-yale",
      sourceUrl: "https://curso-yale-felicidade.lovable.app/",
      q: "01",
      title: "Ciência do Bem-Estar para Adolescentes",
      subtitle: "Curso mais concorrido da Universidade de Yale",
      text: "Curso gratuito em português, inspirado no curso aberto de Yale, com 5 semanas, Tutora de IA treinada, quizzes, flashcards, simuladores e ferramentas de auto-observação.",
      signal:
        "Transforma conceitos abstratos de bem-estar em micro-hábitos, prática emocional e engajamento de juventudes.",
      tone: "sky",
    },
    {
      modal: "innovation-multiscience",
      sourceUrl: "https://curso-multi-ciencia-felicidade.lovable.app/",
      q: "02",
      title: "Ciência da Felicidade Aplicações",
      subtitle:
        "A Ciência da Felicidade como ferramenta do florescimento humano, vetor do desenvolvimento sustentável e progresso socioeconômico",
      text: "Percurso que integra Psicologia Positiva, Neurociência aplicada, Ciência das Emoções, filosofia, economia comportamental e do bem-comum, direito ao bem-estar e bem-estar organizacional.",
      signal:
        "Converte repertório científico complexo em trilhas, módulos, práticas e linguagem acessível para multiplicadores.",
      tone: "emerald",
    },
    {
      modal: "innovation-nr1",
      sourceUrl: "https://nr1-playbook.lovable.app/",
      q: "03",
      title: "NR-1 com Ciência do Bem-Estar Laboral",
      subtitle: "3.000+ artigos científicos curados sob chancela da University of Oxford",
      subtitleLines: [
        "3.000+ artigos científicos",
        "Curados sob chancela da",
        "University of Oxford",
      ],
      text: "Playbook educacional que conecta NR-1, COPSOQ, ISO 45003, com 12 drivers, IA tutora e documentação para GRO/PGR.",
      signal:
        "Tira a NR-1 da burocracia e a transforma em jornada de aprendizagem, prevenção e governança psicossocial.",
      tone: "amber",
    },
  ],
} as const;

export const EDUCATIONAL_INNOVATION_MODALS = {
  "innovation-yale": {
    eyebrow: "Formação 01 · Ciência do Bem-Estar para Adolescentes",
    title:
      "O curso mais concorrido de Yale traduzido em uma jornada gamificada de bem-estar juvenil",
    subtitle:
      "Uma experiência educacional desenhada para traduzir psicologia positiva em hábitos treináveis, linguagem jovem e prática contínua.",
    sourceUrl: "https://curso-yale-felicidade.lovable.app/",
    thesis:
      "O diferencial não está em explicar felicidade. Está em fazer o estudante praticar, refletir, testar e consolidar repertórios de bem-estar com tutoria, feedback e progressão.",
    pillars: [
      {
        label: "Conteúdo",
        title: "5 semanas com ciência aplicada",
        text: "Estrutura inspirada no curso aberto de Yale, reformulada para adolescentes em português e com práticas semanais.",
        tone: "sky",
      },
      {
        label: "IA",
        title: "Tutora de IA treinada como mediação socrática",
        text: "A IA orienta perguntas, explica conceitos, adapta linguagem e cita evidências para sustentar aprendizagem.",
        tone: "emerald",
      },
      {
        label: "Prática",
        title: "Quiz, flashcards e simuladores",
        text: "Repetição espaçada, feedback imediato e cenários de decisão transformam teoria em memória e comportamento.",
        tone: "amber",
      },
      {
        label: "Impacto",
        title: "Bem-estar como alfabetização emocional",
        text: "Termômetro emocional, diário, desafios e mapa mental ajudam o estudante a observar padrões e agir melhor.",
        tone: "violet",
      },
    ],
    learningFlow: [
      "Atenção: começa com uma promessa simples e verificável de bem-estar treinável.",
      "Engajamento: usa XP, streaks, desafios e feedback para reduzir abandono.",
      "Consolidação: combina prática distribuída, reflexão e repetição ativa.",
      "Transferência: conecta escolhas reais da adolescência a consequências e repertórios saudáveis.",
    ],
    outcome:
      "Para escolas e programas sociais, a formação vira uma camada de Educação Positiva com linguagem jovem, evidências, dados agregados e experiência digital de alto engajamento.",
  },
  "innovation-multiscience": {
    eyebrow: "Formação 02 · Ciência da Felicidade Aplicações",
    title: "A Ciência da Felicidade como ferramenta de florescimento, sustentabilidade e progresso",
    subtitle:
      "Um percurso premium que organiza campos científicos diferentes em uma jornada coerente de florescimento humano, sustentabilidade, educação e organizações.",
    sourceUrl: "https://curso-multi-ciencia-felicidade.lovable.app/",
    thesis:
      "A inovação está em conectar ciência, filosofia, dados, ODS, educação e gestão em uma gramática única para formar pessoas capazes de aplicar felicidade com rigor.",
    pillars: [
      {
        label: "Base",
        title: "PERMA+V, SPIRE, hedonia e eudaimonia",
        text: "Fundamentos de florescimento humano organizados com clareza conceitual e aplicabilidade pessoal.",
        tone: "sky",
      },
      {
        label: "Planeta",
        title: "ODS, biofilia e indicadores além do PIB",
        text: "Bem-estar subjetivo conectado a desenvolvimento sustentável, cidades felizes e métricas públicas.",
        tone: "emerald",
      },
      {
        label: "Trabalho",
        title: "Flow, PsyCap e segurança psicológica",
        text: "Felicidade como vetor de produtividade, criatividade, inovação e cultura organizacional.",
        tone: "amber",
      },
      {
        label: "Educação",
        title: "Educação Positiva, CASEL e VIA",
        text: "Competências socioemocionais, forças de caráter e práticas pedagógicas para sistemas educacionais.",
        tone: "violet",
      },
    ],
    learningFlow: [
      "Curadoria: transforma múltiplas ciências em eixos de compreensão progressiva.",
      "Mapa mental: conecta conceitos para reduzir sobrecarga cognitiva.",
      "Prática: converte frameworks em exercícios, diagnósticos e repertórios de aplicação.",
      "Multiplicação: forma linguagem comum para educadores, gestores, comunidades e políticas públicas.",
    ],
    outcome:
      "Para o VitalOS, essa formação funciona como camada de capacitação avançada: prepara lideranças e multiplicadores para interpretar dados humanos e desenhar intervenções de florescimento com profundidade.",
  },
  "innovation-nr1": {
    eyebrow: "Formação 03 · NR-1 com Ciência do Bem-Estar Laboral",
    title: "NR-1, COPSOQ e ciência do bem-estar como jornada educacional de prevenção",
    subtitle:
      "Um playbook que transforma NR-1, COPSOQ e ISO 45003 em experiência de aprendizagem para líderes, RH, SST e governança.",
    sourceUrl: "https://nr1-playbook.lovable.app/",
    thesis:
      "A inovação é tirar o risco psicossocial da planilha e colocá-lo em um ciclo de mensuração, entendimento, transformação, educação e governança.",
    pillars: [
      {
        label: "Mensurar",
        title: "COPSOQ com leitura organizacional",
        text: "Questionário e dimensões psicossociais ajudam a identificar perigos, exposição e prioridades preventivas.",
        tone: "sky",
      },
      {
        label: "Entender",
        title: "Matriz dimensão × driver",
        text: "A leitura conecta COPSOQ, JD-R, ISO 45003 e Work Wellbeing Playbook para orientar decisões.",
        tone: "emerald",
      },
      {
        label: "Transformar",
        title: "Backlog de prevenção e evidência",
        text: "Achados viram ações, responsáveis, indicadores, trilhas e documentação para GRO/PGR.",
        tone: "amber",
      },
      {
        label: "Governar",
        title: "12 drivers e prontidão auditável",
        text: "Lideranças aprendem por trilhas gamificadas com IA tutora, relatórios e catálogo documental.",
        tone: "violet",
      },
    ],
    learningFlow: [
      "Clareza: nomeia riscos psicossociais em linguagem executiva e educativa.",
      "Priorização: reduz ansiedade regulatória ao mostrar o que deve ser tratado primeiro.",
      "Aprendizagem: forma lideranças por microconteúdos, simulações e feedback.",
      "Evidência: consolida trilhas, decisões e documentos para governança responsável.",
    ],
    outcome:
      "Para empresas, a formação vira uma ponte entre compliance, cultura de cuidado e ESG social: menos reatividade, mais prevenção e mais evidência.",
  },
} as const;

// ─── 7 · Para quem é ──────────────────────────────────────────────────────────
export const PERSONAS = {
  eyebrow: "Para quem é",
  title: "Cada papel vê o que precisa — só o que precisa",
  items: [
    { icon: "users", role: "RH", text: "Transforme ações de bem-estar em estratégia mensurável." },
    {
      icon: "shield-plus",
      role: "SST",
      text: "Apoie a gestão de riscos psicossociais com dados, prevenção e evidências.",
    },
    {
      icon: "briefcase",
      role: "C-Level",
      text: "Visualize riscos, cultura, performance humana e ESG em linguagem executiva.",
    },
    {
      icon: "compass",
      role: "Lideranças",
      text: "Receba recomendações práticas para desenvolver times com mais energia, confiança e sentido.",
    },
    {
      icon: "graduation-cap",
      role: "Educação",
      text: "Acompanhe bem-estar, engajamento e cultura de forma sistêmica, ética e longitudinal.",
    },
  ],
};

// ─── 8 · Confiança e privacidade ──────────────────────────────────────────────
export const TRUST = {
  eyebrow: "Confiança e privacidade",
  title: "Medição que protege — por construção",
  points: [
    {
      icon: "users-round",
      title: "Dados agregados",
      text: "Resultados sempre coletivos; respostas individuais nunca aparecem.",
    },
    {
      icon: "lock",
      title: "k-anonimato",
      text: "Recortes com menos de 5 respondentes ficam ocultos, por princípio.",
    },
    {
      icon: "check-circle",
      title: "Consentimento",
      text: "A pessoa controla o que a IA pode observar — revogável a qualquer momento.",
    },
    {
      icon: "scroll",
      title: "Trust Ledger",
      text: "Cada permissão e uso de dado é registrado de forma auditável.",
    },
    {
      icon: "split",
      title: "Desenvolvimento ≠ avaliação",
      text: "Desenvolvimento humano e avaliação individual nunca se cruzam.",
    },
    {
      icon: "ban",
      title: "Sem uso punitivo",
      text: "Nunca para punição, promoção ou remuneração — jamais.",
    },
  ],
};

// ─── 9 · CTA final ────────────────────────────────────────────────────────────
export const FINAL_CTA = {
  title: "Pronto para enxergar a vitalidade da sua organização com mais clareza?",
  text: "Agende uma demonstração e veja como as 4 Dimensões do IVO e as 4 Lentes VitalOS™ transformam dados humanos em estratégia, aprendizagem, ação e impacto.",
  buttons: [
    {
      label: "Agendar demonstração",
      action: { kind: "modal", modal: "executive" },
      variant: "primary",
    },
    {
      label: "Ver jornada de 12 meses",
      action: { kind: "modal", modal: "journey" },
      variant: "outline",
    },
    {
      label: "Receber apresentação executiva",
      action: { kind: "modal", modal: "executive" },
      variant: "ghost",
    },
  ] as Cta[],
};

// ─── Modal · Jornada de 12 meses ──────────────────────────────────────────────
export const JOURNEY = {
  title: "Jornada de 12 meses",
  subtitle: "Uma estação por trimestre — do risco à síntese.",
  quarters: [
    {
      q: "Q1",
      instrument: "COPSOQ",
      theme: "Fundação Segura",
      text: "Mapeamento educativo de riscos psicossociais. Primeiro, o que pode adoecer.",
      tone: "sky",
    },
    {
      q: "Q2",
      instrument: "FIB-T",
      theme: "Raízes do Bem-Comum",
      text: "Linha de base do bem-estar do ecossistema e da governança.",
      tone: "emerald",
    },
    {
      q: "Q3",
      instrument: "PERMA+V",
      theme: "Florescimento",
      text: "Engajamento, sentido e vitalidade convertidos em índice.",
      tone: "rose",
    },
    {
      q: "Q4",
      instrument: "VIA-T",
      theme: "Forças em Cultura",
      text: "Forças de caráter percebidas — base para a cultura de potência.",
      tone: "violet",
    },
    {
      q: "Q5",
      instrument: "ESG",
      theme: "Síntese Global",
      text: "Relatório Global ESG + Selo VitalOS™ — a prova consolidada do ano.",
      tone: "amber",
    },
  ],
};

// ─── Modal · Receber apresentação executiva (form visual, sem backend) ────────
export const EXECUTIVE_FORM = {
  title: "Receber apresentação executiva",
  subtitle: "Deixe seus dados e o time VitalOS™ entra em contato. (Demonstração — sem envio real.)",
  fields: [
    { id: "nome", label: "Nome", type: "text", placeholder: "Seu nome" },
    {
      id: "empresa",
      label: "Empresa / Organização",
      type: "text",
      placeholder: "Nome da organização",
    },
    { id: "cargo", label: "Cargo", type: "text", placeholder: "Ex.: CHRO, Diretor SST…" },
    { id: "email", label: "E-mail corporativo", type: "email", placeholder: "voce@empresa.com" },
    { id: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "(00) 00000-0000" },
  ],
  interests: [
    "Riscos psicossociais (NR-1)",
    "Cultura e clima",
    "Performance e engajamento",
    "ESG e governança",
    "Educação / instituições de ensino",
  ],
  submitLabel: "Enviar (demonstração)",
  successTitle: "Tudo certo — em produção, sua solicitação seguiria para o time VitalOS™.",
  successText: "Esta é uma demonstração visual: nenhum dado foi enviado ou armazenado.",
};

// ─── Por que isso importa · custo ↔ retorno ───────────────────────────────────
export const WHY_IT_MATTERS = {
  eyebrow: "Por que isso importa",
  titleA: "De um custo silencioso a um",
  titleB: "retorno mensurável",
  lead: "O adoecimento mental tem um custo econômico gigante — mas florescer gera retorno comprovado. A Ciência da Felicidade transforma uma coisa na outra, com base em evidências.",
  costTitle: "O custo de não cuidar",
  costs: [
    {
      value: "US$ 5 tri/ano",
      label: "Impacto econômico global das condições de saúde mental",
      note: "Impacto agregado estimado (produtividade, absenteísmo, presenteísmo), não gasto direto.",
      source: "OMS · materiais Sodexo (2024)",
    },
    {
      value: "US$ 1 tri/ano",
      label: "Perda de produtividade por depressão e ansiedade",
      source: "OMS / OIT",
    },
    {
      value: "12 bi dias/ano",
      label: "Dias de trabalho perdidos por depressão e ansiedade",
      source: "OMS / OIT",
    },
    {
      value: "US$ 16 tri",
      label: "Projeção de custo acumulado até 2030 sem intervenção",
      note: "Projeção; o valor varia conforme a metodologia (anual vs. acumulado).",
      source: "Estimativas internacionais de economia da saúde mental",
    },
  ],
  returnTitle: "Benefícios organizacionais e econômicos de promover a felicidade para todos",
  returnSource:
    "Compilação de indicadores citados na literatura de bem-estar organizacional (Gallup, Shawn Achor, Martin Seligman) — números ilustrativos de estudos distintos, não uma medição única e verificada.",
  returns: [
    { value: "+21%", label: "Produtividade", icon: "cog", tone: "emerald" },
    { value: "+45%", label: "Adaptabilidade à mudança", icon: "workflow", tone: "cyan" },
    { value: "+300%", label: "Inovação", icon: "rocket", tone: "rose" },
    { value: "-37%", label: "Absenteísmo", icon: "users", tone: "amber" },
    { value: "-48%", label: "Acidentes de trabalho", icon: "shield", tone: "emerald" },
    { value: "-59%", label: "Probabilidade de deixar a empresa", icon: "log-out", tone: "cyan" },
    { value: "4x menor", label: "Probabilidade de burnout", icon: "flame", tone: "amber" },
  ],
  roi: {
    ratio: "4:1",
    unit: "ROI",
    text: "Cada R$ 1 investido em bem-estar retorna ~R$ 4",
    source: "Ordem de grandeza observada em revisões de programas de bem-estar corporativo · referência: Deloitte, 2022 (retorno varia por tipo de programa)",
  },
  bridge: {
    title: "Bem-estar é investimento, não custo",
    text: "Os números à esquerda mostram o preço de não agir; os da direita, o retorno de florescer. No meio está a decisão: investir em educação positiva e gestão de riscos psicossociais (alinhada à NR-1) converte sofrimento evitável em produtividade, criatividade e saúde — com retorno mensurável.",
    cta: {
      label: "Transformar dor em florescimento",
      action: { kind: "modal", modal: "executive" },
      variant: "primary",
    } as Cta,
  },
  disclaimer:
    "Valores de “custo” representam impacto econômico agregado estimado (não gasto direto) e projeções cuja metodologia varia entre fontes. Indicadores de retorno são ilustrativos, compilados de estudos organizacionais distintos — não constituem auditoria da VitalOS nem garantia de resultado.",
};

// ─── Calculadora de Impacto Financeiro (copy) ─────────────────────────────────
export const CALCULATOR = {
  eyebrow: "Quantifique sua realidade",
  titleA: "O custo da inação,",
  titleB: "em números seus.",
  lead: "Ajuste os parâmetros à sua organização e veja, em segundos, quanto a falta de bem-estar já está custando — e quanto pode ser recuperado.",
  cardTitle: "Calculadora de Impacto Financeiro",
  cardLead:
    "Quantifique o custo da inação e projete o ROI de investir em bem-estar. Fórmulas explícitas com benchmarks de mercado — ajuste ao seu contexto.",
  tabs: { cost: "Custo da Inação", roi: "ROI Potencial" },
  costHeader: "Impacto Estimado · Sangria Silenciosa",
  roiHeader: "ROI Potencial · Cuidar gera retorno",
  totalLabel: "Custo Total Anual Estimado",
  netGainLabel: "Ganho líquido anual projetado",
  disclaimer:
    "Modelagem ilustrativa baseada em pesquisas públicas sobre bem-estar no trabalho (OMS, Gallup, Oxford) — parâmetros ajustáveis, não uma auditoria financeira nem previsão garantida.",
};

// ─── Gestão NR-1 com Bem-Estar ────────────────────────────────────────────────
export const NR1 = {
  eyebrow: "Compliance que cuida",
  title: "Gestão NR-1 com Bem-Estar",
  text: "Mapeamento e mitigação de riscos psicossociais com COPSOQ II e o playbook de bem-estar no trabalho de Oxford — material auditável e plano de ação apoiado por IA.",
  bullets: [
    { icon: "shield-check", text: "COPSOQ II + matriz NR-1 (referência MTE 2026)" },
    { icon: "scroll", text: "Playbook Oxford · +3.000 papers revisados" },
    { icon: "file-bar-chart", text: "Relatório educativo em PDF auditável" },
    { icon: "sparkles", text: "Plano de ação com apoio do chatbot de IA" },
  ],
  cta: {
    label: "Ver conformidade NR-1",
    action: { kind: "route", to: "/nr1" },
    variant: "outline",
  } as Cta,
  disclaimer:
    "Material educativo e preparatório. A elaboração do PGR e a avaliação de riscos nos termos da NR-1 exigem profissional legalmente habilitado.",
};

// ─── Página de conversão dedicada · /nr1 ──────────────────────────────────────
// Entrada de campanha (tráfego pago). Foca a janela regulatória da NR-1 como
// PORTA — o T1 (COPSOQ II) — e conduz à jornada anual das 4 Lentes + ESG.
// Doutrina de honestidade (Fable 5 §8, invariante #8): a NR-1 é contexto real;
// o VitalOS entrega MEDIÇÃO e EVIDÊNCIA agregada — nunca "blindagem jurídica".
// A responsabilidade técnica do PGR/laudo é sempre do profissional habilitado.
// ⚠️ VALORES/DATAS: ilustrativos — CONFIRMAR na fonte oficial antes de publicar.
export const NR1_LANDING = {
  meta: {
    title: "Conformidade NR-1 sem dor — Riscos Psicossociais | VitalOS™",
    description:
      "A NR-1 passou a exigir a gestão de riscos psicossociais. O VitalOS™ aplica o COPSOQ II com anonimato garantido e entrega a evidência agregada que fundamenta o seu PGR — início de uma jornada anual de vitalidade.",
  },
  hero: {
    eyebrow: "Conformidade NR-1 · Riscos Psicossociais",
    headline: "A NR-1 agora exige gerenciar riscos psicossociais.",
    headlineAccent: "Comece pela medição que dá base ao seu PGR.",
    sub: "O VitalOS™ aplica o COPSOQ II — referência internacional em fatores psicossociais — com anonimato garantido por construção (n≥5) e devolve a evidência agregada que fundamenta o seu Programa de Gerenciamento de Riscos. É o primeiro trimestre de uma jornada anual de vitalidade.",
    disclaimer:
      "Instrumento educativo de mensuração e apoio à gestão. A elaboração do PGR e a avaliação de riscos nos termos da NR-1 são de responsabilidade de profissional legalmente habilitado.",
    ctas: [
      { label: "Agendar demonstração", action: { kind: "modal", modal: "executive" }, variant: "primary" },
      { label: "Ver como funciona", action: { kind: "anchor", id: "nr1-como-funciona" }, variant: "outline" },
    ] as Cta[],
    signals: [
      "COPSOQ II validado",
      "Anonimato n≥5 no banco",
      "Evidência agregada auditável",
      "Responsável técnico habilitado",
    ],
  },
  momento: {
    eyebrow: "O momento",
    title: "A exigência entrou em vigor — e toda empresa com CLT passou a precisar",
    lead: "Não é mais uma pauta de RH inspirado. Virou requisito de gestão de risco, com fiscalização e prazo. Quem estrutura o método primeiro, com ciência e evidência, atende melhor e mais rápido.",
    cards: [
      {
        icon: "gavel",
        title: "A obrigação é real",
        text: "A NR-1 passou a exigir o gerenciamento dos riscos psicossociais dentro do PGR. Deixou de ser boa prática opcional.",
      },
      {
        icon: "clock",
        title: "O prazo já corre",
        text: "A fiscalização passou a considerar os fatores psicossociais. Adiar acumula exposição — para o cliente e para quem o atende.",
      },
      {
        icon: "door-open",
        title: "O mercado abriu de uma vez",
        text: "Milhões de organizações precisam da mesma coisa ao mesmo tempo. Método com rigor científico é o que separa quem entrega de quem improvisa.",
      },
    ],
  },
  mudou: {
    eyebrow: "O que mudou na NR-1",
    title: "Do risco físico ao risco psicossocial — dentro do mesmo PGR",
    text: "A NR-1 incorporou a gestão dos fatores psicossociais ao Gerenciamento de Riscos Ocupacionais. Os números abaixo são contexto de mercado, definidos pela legislação — não uma promessa nossa. Mostram por que a demanda virou universal.",
    // ⚠️ VERIFICAR na fonte oficial (NR-01/NR-28 e Portaria MTE vigente) antes de publicar.
    stats: [
      { value: "Vigente", label: "Gestão de riscos psicossociais exigida na NR-1", flag: "confirmar cronograma" },
      { value: "R$ 1.610", label: "Multa mínima por trabalhador exposto (referência ilustrativa)" },
      { value: "R$ 6.708", label: "Multa máxima por trabalhador exposto (referência ilustrativa)" },
      { value: "R$ 322 mil+", label: "Exposição potencial numa empresa de 200 pessoas (ilustrativo)" },
    ],
    source:
      "Referências: NR-01 e NR-28 (tabela de gradação de multas), Portaria MTE. Valores ilustrativos — confirme prazos e valores vigentes na fonte oficial. O VitalOS não presta consultoria jurídica.",
  },
  comoFunciona: {
    eyebrow: "Como funciona",
    title: "Da onda de escuta ao relatório educativo — em quatro passos",
    lead: "Você não monta o diagnóstico no Word. A plataforma coleta com anonimato garantido, agrega com rigor e devolve a evidência pronta para o profissional habilitado interpretar.",
    steps: [
      {
        k: "01",
        title: "Crie a onda",
        text: "Configure a medição COPSOQ II para a organização ou por unidade. Gera links de convite anônimos, um por participante.",
      },
      {
        k: "02",
        title: "Colaboradores respondem",
        text: "Resposta anônima por token, no celular, em minutos. O conteúdo individual nunca é lido pela empresa nem pela plataforma.",
      },
      {
        k: "03",
        title: "Agregação k-anônima (n≥5)",
        text: "Ao atingir cinco respostas num recorte, o motor agrega e sela a cápsula. Recortes menores ficam ocultos — privacidade por construção.",
      },
      {
        k: "04",
        title: "Evidência para o PGR",
        text: "Matriz educativa de fatores psicossociais por dimensão, com faixas de risco e prioridades — base auditável para o responsável técnico estruturar o plano.",
      },
    ],
    note: "K-anonimato imposto no banco de dados, não apenas na tela. Respostas individuais não trafegam para a interface — é o que torna a escuta segura e a evidência confiável.",
  },
  jornada: {
    eyebrow: "E não para no primeiro trimestre",
    title: "A obrigação vira jornada. A jornada vira vantagem.",
    lead: "A NR-1 abre a porta. As 4 Lentes VitalOS™ transformam um relatório de compliance num sistema operacional de vitalidade — uma leitura científica por trimestre, culminando num Relatório Global ESG board-ready.",
    quarters: [
      { q: "T1", instrument: "COPSOQ II", theme: "Risco & Prevenção", text: "A base NR-1: fatores psicossociais, prioridades de prevenção.", tone: "sky" },
      { q: "T2", instrument: "FIB-T", theme: "Ecossistema & Governança", text: "Qualidade de vida no trabalho e ponte direta com ESG social.", tone: "emerald" },
      { q: "T3", instrument: "PERMA+V", theme: "Florescimento & Flow", text: "Energia, engajamento, sentido e realização que sustentam performance.", tone: "rose" },
      { q: "T4", instrument: "VIA-T", theme: "Cultura & Forças", text: "Forças e virtudes das equipes — leitura exploratória de desenvolvimento.", tone: "violet" },
    ],
    finale: {
      badge: "Relatório Global ESG",
      title: "O ano inteiro, sintetizado em evidência",
      text: "Evolução longitudinal, indicadores E/S/G rastreáveis ao instrumento e maturidade institucional — pronto para conselho e relato de sustentabilidade. É o que faz a NR-1 pagar por si mesma.",
    },
  },
  porQue: {
    eyebrow: "Por que VitalOS",
    title: "Guias ensinam a montar. O VitalOS entrega a evidência.",
    lead: "A diferença entre uma apostila e uma infraestrutura de mensuração.",
    rows: [
      { sem: "Você monta o questionário e o relatório no Word", com: "A plataforma aplica o COPSOQ II e agrega automaticamente" },
      { sem: "Respostas em planilha — risco de reidentificar pessoas", com: "K-anonimato imposto no banco: individual nunca é lido" },
      { sem: "Um PDF entregue uma vez", com: "Jornada anual de 4 lentes + Relatório Global ESG" },
      { sem: "Fica na obrigação de compliance", com: "Vira ativo de governança e cultura" },
    ],
  },
  paraQuem: {
    eyebrow: "Para quem é",
    title: "Feito para quem responde pela saúde psicossocial da organização",
    items: [
      { icon: "brain", label: "Psicólogos organizacionais", text: "Responsável técnico do PGR psicossocial." },
      { icon: "hard-hat", label: "Engenheiros e técnicos de SST", text: "Que conduzem o GRO/PGR na prática." },
      { icon: "users", label: "Consultores de SST e RH", text: "Que atendem carteiras de empresas." },
      { icon: "briefcase", label: "Gestores de pessoas", text: "Responsáveis pela conformidade NR-1." },
      { icon: "building", label: "RH e SST internos", text: "De organizações de todos os portes." },
      { icon: "shield-check", label: "Comitês e CIPA", text: "Que precisam de evidência auditável." },
    ],
  },
  faq: {
    eyebrow: "Perguntas frequentes",
    title: "O que você quer saber antes de começar",
    items: [
      {
        q: "O VitalOS emite o PGR ou o laudo NR-1?",
        a: "Não. O VitalOS é a ferramenta de mensuração e a fonte da evidência agregada. A elaboração do PGR e a avaliação de riscos nos termos da NR-1 são de responsabilidade do profissional legalmente habilitado — que usa a nossa evidência como base.",
      },
      {
        q: "As respostas dos colaboradores ficam expostas?",
        a: "Nunca. O anonimato é imposto no banco de dados: respostas individuais não são lidas pela empresa nem pela plataforma. Só aparecem agregados com no mínimo cinco respondentes (n≥5).",
      },
      {
        q: "Isso é consultoria jurídica?",
        a: "Não. É um instrumento profissional de apoio à gestão de riscos psicossociais. Os valores e prazos citados são contexto de mercado da legislação — confirme sempre na fonte oficial.",
      },
      {
        q: "Precisa de quantas pessoas para gerar resultado?",
        a: "O recorte precisa de pelo menos cinco respondentes para virar resultado visível (k-anonimato). Em organizações menores, o VitalOS agrega no nível da empresa para preservar a privacidade e ainda entregar evidência.",
      },
      {
        q: "Por que quatro instrumentos e não só o COPSOQ?",
        a: "Você começa só pelo COPSOQ II (a exigência NR-1). As outras três lentes entram ao longo do ano, opcionalmente, transformando a obrigação numa jornada de desenvolvimento e num Relatório ESG anual.",
      },
    ],
  },
  fechamento: {
    title: "A NR-1 já está valendo. A pergunta é se vai ser você a atender com método.",
    text: "De um lado, montar cada diagnóstico do zero e ver os contratos passarem. Do outro, aplicar o COPSOQ II com anonimato garantido, entregar evidência auditável e começar a jornada anual de vitalidade.",
    cta: { label: "Agendar demonstração", action: { kind: "modal", modal: "executive" }, variant: "primary" } as Cta,
    reassurance: "Sem compromisso. Uma conversa para ver a plataforma aplicada ao seu contexto.",
  },
};

export const NR1_PLAYBOOK_MODAL = {
  eyebrow: "Rede NR-1 + COPSOQ",
  title: "Da obrigação regulatória ao plano de bem-estar com evidência",
  subtitle:
    "Síntese instrucional do playbook NR-1/COPSOQ: organizar escopo, aplicar escuta psicossocial, traduzir dimensões críticas em drivers de bem-estar e deixar rastros para governança do GRO/PGR.",
  sourceLabel: "Playbook NR-1/COPSOQ",
  sourceUrl: "https://nr1-playbook.lovable.app/nr1-copsoq",
  thesis:
    "COPSOQ organiza a escuta. NR-1 define a obrigação. ISO 45003 dá a linguagem de gestão. O Playbook de Bem-Estar orienta ações educativas para reduzir risco, desenvolver líderes e sustentar evidências.",
  flow: [
    {
      k: "01",
      title: "Planejar",
      text: "Delimitar escopo, unidades, grupos de trabalhadores, responsável técnico, comunicação e cronograma.",
      tone: "sky",
    },
    {
      k: "02",
      title: "Identificar",
      text: "Coletar sinais psicossociais com governança, anonimato por token e leitura agregada por dimensão.",
      tone: "amber",
    },
    {
      k: "03",
      title: "Correlacionar",
      text: "Conectar dimensões COPSOQ a drivers de bem-estar para priorizar o que deve virar ação.",
      tone: "emerald",
    },
    {
      k: "04",
      title: "Transformar",
      text: "Converter achados em backlog de prevenção, responsáveis, indicadores, aprendizagem e evidências.",
      tone: "rose",
    },
    {
      k: "05",
      title: "Governar",
      text: "Consolidar registros, relatórios, decisões e acompanhamento para auditoria, ESG social e melhoria contínua.",
      tone: "violet",
    },
  ],
  deliverables: [
    "Escopo documentado e comunicação institucional clara",
    "Mapa educativo de fatores psicossociais por dimensão",
    "Matriz dimensão × driver para orientar prioridades",
    "Top prioridades executivas para plano de prevenção",
    "Catálogo de evidências para validação técnica e governança",
  ],
  guardrails: [
    "A plataforma apoia diagnóstico educativo, documentação e decisão gerencial.",
    "A avaliação legal do PGR/GRO deve ser validada por profissional habilitado.",
    "Dados pessoais devem ser tratados de forma agregada, consentida e com anonimato operacional.",
  ],
  closing:
    "A Rede NR-1 não transforma compliance em burocracia. Ela transforma obrigação em rotina inteligente de cuidado, aprendizagem e proteção institucional.",
} as const;

// ─── Números Vivos (prova metodológica — sem dados fictícios) ─────────────────
export const PROOF_NUMBERS = {
  eyebrow: "Números Vivos",
  title: "O que um ciclo de programa entrega",
  lead: "Sem inventar indicadores. A força do ciclo está na qualidade dos sinais que ele organiza: risco, vitalidade, aprendizagem, evidência e governança em um sistema que gestores conseguem operar.",
  managementSignal:
    "Para a liderança, o VitalOS transforma dados humanos em uma pauta executiva: onde há risco, onde existe potência, qual intervenção merece prioridade e que evidência sustenta a próxima decisão.",
  layers: [
    {
      label: "Leitura sistêmica",
      note: "Integra risco psicossocial, qualidade de vida, florescimento, forças e governança em uma visão única.",
      color: "sky",
    },
    {
      label: "Priorização executiva",
      note: "Converte sinais dispersos em agenda de decisão: prevenir, educar, redesenhar rotinas e acompanhar evolução.",
      color: "amber",
    },
    {
      label: "Evidência rastreável",
      note: "Cada artefato nasce de uma lente, uma hipótese, uma ação e um registro que pode ser apresentado à governança.",
      color: "emerald",
    },
  ],
  outcomes: [
    {
      stage: "Ver",
      title: "Risco antes da crise",
      text: "A gestão passa a enxergar fatores psicossociais, carga, suporte, confiança e vulnerabilidades antes que virem afastamento ou conflito.",
      color: "sky",
    },
    {
      stage: "Escolher",
      title: "Intervenção com foco",
      text: "O comitê deixa de discutir opinião e passa a decidir por prioridade, criticidade, viabilidade e potencial de aprendizado.",
      color: "amber",
    },
    {
      stage: "Desenvolver",
      title: "Liderança acionável",
      text: "Dados viram rituais de gestão, microaprendizagens, experimentos de cultura e planos que cabem na rotina das equipes.",
      color: "emerald",
    },
    {
      stage: "Comprovar",
      title: "Governança pronta",
      text: "A organização consolida relatórios, trilhas de evidência, recomendações e síntese ESG social sem depender de narrativas soltas.",
      color: "violet",
    },
  ],
  artifacts: [
    "Mapa IVO pelas dimensões EU, NÓS, LIDERANÇA e ORGANIZAÇÃO",
    "Backlog de prevenção e desenvolvimento priorizado",
    "Trilhas educativas conectadas aos achados do ciclo",
    "Relatório executivo para RH, SST, ESG, conselho e governança",
  ],
  disclaimer:
    "Indicadores quantitativos aparecem somente quando a organização informa bases reais e autoriza o processamento. Esta seção apresenta entregáveis metodológicos, não resultados fictícios.",
};

// ─── Instituto Felicidade Para Todos (proponente) ─────────────────────────────
export const INSTITUTE = {
  eyebrow: "Quem está por trás",
  name: "Instituto Felicidade Para Todos",
  tagline: "Ecossistemas sustentáveis de felicidade humana, socioambiental e organizacional.",
  text: "O Instituto Felicidade Para Todos combina pesquisa aplicada, mobilização social, educação positiva e tecnologia para criar ecossistemas de bem-estar mensurável. Sua atuação conecta felicidade como política de desenvolvimento humano, cultura organizacional, ODS, ESG social e aprendizagem coletiva com linguagem acessível para comunidades, empresas e instituições públicas.",
  stats: [
    { value: "+110.000", label: "Aplicações FIB · Recorde Mundial" },
    { value: "+219", label: "Municípios impactados" },
    { value: "+700", label: "Instituições parceiras" },
    { value: "+1.300", label: "Projetos classificados por ODS" },
  ],
  // Logos oficiais do Instituto (uso de marca do proponente).
  logoLight:
    "https://static.wixstatic.com/media/575677_22e0dfa7c2cd4eb896bb7a33223c585e~mv2.png/v1/fill/w_600,h_219,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/3_edited.png",
  logoMark:
    "https://static.wixstatic.com/media/575677_11e5bfdb643b47d28d70ff33bf0c1646~mv2.png/v1/fill/w_236,h_236,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/6.png",
};
