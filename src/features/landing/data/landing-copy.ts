// Landing — copy estruturada (sem dados reais, sem claims absolutos). Toda a
// narrativa premium da página principal vive aqui; os componentes só apresentam.
// Tom: institucional, SaaS de alto valor. Os instrumentos aparecem com seus
// qualificadores honestos (exploratório/educativo) — nunca como promessa clínica
// ou jurídica.

export type LandingModalType = "journey" | "dashboard" | "executive";

export type CtaAction = { kind: "modal"; modal: LandingModalType } | { kind: "route"; to: string };

export interface Cta {
  label: string;
  action: CtaAction;
  variant?: "primary" | "outline" | "ghost";
}

// ─── 1 · Hero ─────────────────────────────────────────────────────────────────
export const HERO = {
  eyebrow: "VitalOS · 4 Lentes VITA™",
  headline: "O Sistema Operacional da Vitalidade Organizacional",
  subheadline:
    "Transforme bem-estar, riscos psicossociais, cultura e performance humana em dados, ações, relatórios e evidências — com uma plataforma SaaS baseada nas 4 Lentes VITA™.",
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
