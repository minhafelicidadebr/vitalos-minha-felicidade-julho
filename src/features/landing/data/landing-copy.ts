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
  | "method-deep";

export type CtaAction = { kind: "modal"; modal: LandingModalType } | { kind: "route"; to: string };

export interface Cta {
  label: string;
  action: CtaAction;
  variant?: "primary" | "outline" | "ghost";
}

// ─── 1 · Hero ─────────────────────────────────────────────────────────────────
export const HERO = {
  eyebrow: "Programa Felicidade e crescimentos para Todos - VITALOS™",
  headline: "O Sistema Operacional da Vitalidade Organizacional",
  subheadline:
    "Transforme bem-estar, riscos psicossociais, cultura e performance em dados, ações, relatórios e evidências — Programa Felicidade e Crescimentos para Todos VITALOS™.",
  support: "Meça o invisível. Desenvolva pessoas. Proteja a organização. Comprove evolução.",
  ctas: [
    {
      label: "Agendar demonstração",
      action: { kind: "modal", modal: "executive" },
      variant: "primary",
    },
    {
      label: "Ver metodologia das 4 Lentes",
      action: { kind: "route", to: "/metodologia" },
      variant: "outline",
    },
    {
      label: "Explorar dashboard demo",
      action: { kind: "modal", modal: "dashboard" },
      variant: "ghost",
    },
  ] as Cta[],
  signals: ["k-anonimato ≥ 5", "Dados agregados", "Consentimento como produto", "WCAG 2.2 AA"],
};

// ─── 2 · Problema ─────────────────────────────────────────────────────────────
export const PROBLEM = {
  eyebrow: "O problema",
  title: "Quase sempre, o risco humano só aparece quando já é tarde",
  text: "A maior parte das organizações só percebe seus riscos humanos quando eles já viraram afastamento, turnover, conflito, baixa produtividade ou passivo trabalhista. O Vita Happiness Org ajuda gestores a enxergar antes, agir melhor e comprovar evolução com dados.",
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
  title: "De programas isolados para um sistema operacional humano",
  text: "O Vita Happiness Org não é apenas uma pesquisa de clima, nem apenas um dashboard de RH. É uma plataforma de inteligência organizacional que integra diagnóstico, educação, transformação, IA, gamificação ética, relatórios e certificação em uma jornada anual de evolução.",
};

// ─── 4 · As 4 Lentes VITA™ (Q1–Q4) ────────────────────────────────────────────
export const LENSES = {
  eyebrow: "As 4 Lentes VITA™",
  title: "Nenhuma ferramenta sozinha explica a complexidade humana",
  items: [
    {
      q: "Q1",
      instrument: "COPSOQ",
      theme: "Compliance & Blindagem",
      text: "Mapeamento educativo de fatores psicossociais, riscos organizacionais e prioridades de prevenção.",
      tone: "sky",
    },
    {
      q: "Q2",
      instrument: "FIB-T",
      theme: "Ecossistema & Governança",
      text: "Leitura sistêmica da qualidade de vida no trabalho — bem-comum, tempo, comunidade, vitalidade e governança.",
      tone: "emerald",
    },
    {
      q: "Q3",
      instrument: "PERMA+V",
      theme: "Performance & Flow",
      text: "Mensuração de florescimento, energia, engajamento, relações, sentido, realização e vitalidade.",
      tone: "rose",
    },
    {
      q: "Q4",
      instrument: "VIA-T",
      theme: "Cultura & Forças",
      text: "Mapeamento exploratório de forças, talentos, virtudes e diversidade de potência nas equipes.",
      tone: "violet",
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
  title: "As 4 Lentes VITA™ — a ciência viva por trás de cada decisão",
  subtitle:
    "Quatro instrumentos validados que, juntos, traduzem a complexidade humana em sinais acionáveis. Nenhum sozinho responde — combinados, formam o primeiro Sistema Operacional da Vitalidade Organizacional.",
  hook: "Pessoas não cabem em um único termômetro. A vitalidade emerge na intersecção de risco, ecossistema, florescimento e forças.",
  pillars: [
    {
      q: "Q1 · Compliance & Blindagem",
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
      why: "Florescimento prediz +21% produtividade, +300% criatividade e -59% burnout (Gallup, Fredrickson, OMS).",
      tone: "rose",
    },
    {
      q: "Q4 · Cultura & Forças",
      instrument: "VIA-T v1 (exploratório, adaptado de Peterson & Seligman)",
      science:
        "24 forças de caráter, 6 virtudes universais — base do Values in Action Institute.",
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

// ─── 4 (Q5) · Relatório Global ESG ────────────────────────────────────────────
export const GLOBAL_ESG = {
  eyebrow: "Q5 · Inteligência Sistêmica",
  badge: "Relatório Global ESG",
  title: "O ano inteiro, sintetizado em evidência",
  text: "Síntese anual com evolução, evidências, recomendações, indicadores e maturidade organizacional — as quatro lentes consolidadas na linguagem de ESG e governança.",
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
      what: "Dashboards, relatórios anuais, benchmark setorial anônimo, inteligência preditiva e certificação computada do arco.",
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
    { icon: "award", title: "Selo VITA", desc: "Certificação computada do arco — não comprada." },
  ],
};

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
  lenses: [
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
  text: "Agende uma demonstração e veja como as 4 Lentes VITA™ podem transformar dados humanos em estratégia, ação e impacto.",
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
      text: "Relatório Global ESG + Selo VITA — a prova consolidada do ano.",
      tone: "amber",
    },
  ],
};

// ─── Modal · Receber apresentação executiva (form visual, sem backend) ────────
export const EXECUTIVE_FORM = {
  title: "Receber apresentação executiva",
  subtitle: "Deixe seus dados e o time VITA entra em contato. (Demonstração — sem envio real.)",
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
  successTitle: "Tudo certo — em produção, sua solicitação seguiria para o time VITA.",
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
  returnTitle: "O retorno de florescer",
  returns: [
    { value: "+21%", label: "Produtividade", source: "Gallup, 2023", dir: "up" },
    { value: "+45%", label: "Adaptabilidade", source: "Achor, 2010", dir: "up" },
    { value: "+300%", label: "Criatividade / Inovação", source: "Fredrickson, 2009", dir: "up" },
    { value: "-37%", label: "Absenteísmo / Turnover", source: "Gallup, 2022", dir: "down" },
    { value: "-48%", label: "Acidentes de trabalho", source: "Seligman, 2011", dir: "down" },
    { value: "-59%", label: "Burnout", source: "Gallup / OMS", dir: "down" },
  ],
  roi: {
    ratio: "4:1",
    unit: "ROI",
    text: "Cada R$ 1 investido em bem-estar retorna ~R$ 4",
    source: "Programas de bem-estar reduzem burnout ~40% · Deloitte, 2022",
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
    "Valores de “custo” representam impacto econômico agregado estimado (não gasto direto) e projeções cuja metodologia varia entre fontes. Indicadores de retorno são de estudos organizacionais citados.",
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
    "Modelagem baseada em meta-análise OMS (2019), Gallup (2020) e Oxford Wellbeing Research (2019). Valores estimados — não constituem auditoria financeira.",
};

// ─── Gestão NR-1 com Bem-Estar ────────────────────────────────────────────────
export const NR1 = {
  eyebrow: "Compliance que cuida",
  title: "Gestão NR-1 com Bem-Estar",
  text: "Mapeamento e mitigação de riscos psicossociais com COPSOQ II e o playbook de bem-estar no trabalho de Oxford — material auditável e plano de ação apoiado por IA.",
  bullets: [
    { icon: "shield-check", text: "COPSOQ II + matriz NR-1 (referência MTE 2026)" },
    { icon: "scroll", text: "Playbook Oxford · +3.000 papers revisados" },
    { icon: "file-bar-chart", text: "Material/laudo em PDF auditável" },
    { icon: "sparkles", text: "Plano de ação com apoio do chatbot de IA" },
  ],
  cta: {
    label: "Conhecer a Rede NR-1",
    action: { kind: "route", to: "/sst" },
    variant: "outline",
  } as Cta,
  disclaimer:
    "Material educativo e preparatório. A elaboração do PGR e a avaliação de riscos nos termos da NR-1 exigem profissional legalmente habilitado.",
};

// ─── Números Vivos (prova do programa — dados demo, computados pelos motores) ──
export const PROOF_NUMBERS = {
  eyebrow: "Números Vivos",
  title: "O que um ciclo de programa entrega",
  lead: "Baseado em dados fictícios de demonstração, processados pelos mesmos motores que operam em produção. Os números refletem o que o sistema mede — não promessas contratuais.",
  items: [
    {
      value: "+50 pts",
      label: "Variação IVO",
      note: "Score de vitalidade organizacional: 568 → 618 no ciclo demo",
      color: "emerald",
    },
    {
      value: "1.8×",
      label: "ROI estimado",
      note: "Custo evitado (turnover + absenteísmo + presenteísmo) ÷ investimento (cenário médio)",
      color: "primary",
    },
    {
      value: "2/3",
      label: "Experimentos confirmados",
      note: "Diferença-em-diferenças: efeito líquido positivo e replicável",
      color: "amber",
    },
    {
      value: "480",
      label: "Pessoas impactadas",
      note: "Organização demo — dados agregados (k-anonimato ≥ 5)",
      color: "sky",
    },
    {
      value: "13 semanas",
      label: "Ciclo completo",
      note: "De diagnóstico ao relatório de impacto board-ready",
      color: "violet",
    },
    {
      value: "476",
      label: "Testes automatizados",
      note: "Os motores da plataforma são verificados continuamente",
      color: "slate",
    },
  ],
  disclaimer:
    "Dados fictícios de demonstração — processados pelos motores reais da plataforma. Variações IVO são correlacionais; estimativas financeiras usam parâmetros declarados, não garantias contratuais.",
};

// ─── Instituto Felicidade Para Todos (proponente) ─────────────────────────────
export const INSTITUTE = {
  eyebrow: "Quem está por trás",
  name: "Instituto Felicidade Para Todos",
  tagline: "Ecossistemas sustentáveis de felicidade humana, socioambiental e organizacional.",
  text: "O Instituto Felicidade Para Todos é uma organização de impacto social que une ciência, dados e tecnologia para transformar realidades. Atua por quatro pilares — Mensuração, Educação, Transformação e Evolução — e detém o Recorde Mundial de aplicação da Pesquisa de Felicidade Interna Bruta (FIB).",
  stats: [
    { value: "+110.000", label: "Aplicações FIB · Recorde Mundial" },
    { value: "+219", label: "Municípios impactados" },
    { value: "+700", label: "Instituições parceiras" },
    { value: "+1.300", label: "Projetos classificados por ODS" },
  ],
  // Logos oficiais do Instituto (uso de marca do proponente).
  logoLight:
    "https://static.wixstatic.com/media/575677_04ecbb3d6dcc4c2fa42da8ea5211c91f~mv2.png/v1/fill/w_600,h_238,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1_edited.png",
  logoMark:
    "https://static.wixstatic.com/media/575677_11e5bfdb643b47d28d70ff33bf0c1646~mv2.png/v1/fill/w_236,h_236,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/6.png",
};
