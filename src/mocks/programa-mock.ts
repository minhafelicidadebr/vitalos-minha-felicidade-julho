// O Programa — conteúdo da landing/packaging (apresentação de venda). Documenta
// a hierarquia corrigida do ecossistema e os 3 níveis de contratação, com
// narrativa de infoproduto premium. É copy de domínio; sem engine.

export const PROGRAMA_HERO = {
  eyebrow: "VitalOS · Sistema Operacional da Vitalidade",
  category: "Clima se mede. Vitalidade se opera.",
  promise:
    "Um programa científico de 12 meses que mede, age, prova e certifica a evolução humana da " +
    "sua organização — fechando o ciclo que ferramentas de clima deixam aberto.",
  subpromise:
    "Quando as pessoas florescem, a empresa vira comunidade — e a comunidade vira resultado.",
  primaryCta: { label: "Explorar a demo", to: "/panorama" },
  secondaryCta: { label: "Ver o ciclo anual", to: "/temporada" },
};

// A dor (agitação) — por que o mercado não resolve.
export const PROGRAMA_PROBLEM = {
  title: "O bem-estar morre no PDF",
  bullets: [
    "Ferramentas de clima medem e param — geram diagnóstico, não transformação.",
    "Plataformas de benefício tratam o indivíduo e ignoram o sistema que adoece.",
    "Consultorias são caras, episódicas e não deixam sistema instalado.",
    "Ninguém fecha o ciclo medir → agir → comprovar, com ciência e prova auditável.",
  ],
};

// A hierarquia corrigida do ecossistema (resolve a colisão de marca).
export const PROGRAMA_HIERARCHY: Array<{ layer: string; value: string; note: string }> = [
  {
    layer: "Marca",
    value: "4 Lentes VITA™",
    note: "EU · NÓS · LIDERANÇA · ORGANIZAÇÃO — como a vitalidade é lida em qualquer momento.",
  },
  {
    layer: "Metodologia",
    value: "Jornada anual M.E.T.E.",
    note: "4 instrumentos em 4 trimestres: COPSOQ · FIB-T · PERMA+V · VIA-T.",
  },
  {
    layer: "Índice integrador",
    value: "IVO",
    note: "Índice de Vitalidade Organizacional (0–1000).",
  },
  {
    layer: "Inteligência",
    value: "FlorescerIA",
    note: "Copiloto que observa, propõe — você aprova.",
  },
  {
    layer: "Engajamento",
    value: "Gamificação ética",
    note: "Adesão ao ciclo, jamais ligada a desempenho.",
  },
  {
    layer: "Confiança",
    value: "Trust Ledger",
    note: "Privacidade radical e consentimento como produto.",
  },
  {
    layer: "Prova",
    value: "Relatórios + Selo",
    note: "Evidência auditável e Certificação Empresa Viva.",
  },
];

// A jornada (o método) — os 4 trimestres + síntese.
export const PROGRAMA_JOURNEY: Array<{ q: string; lens: string; promise: string }> = [
  { q: "T1", lens: "COPSOQ — Compliance", promise: "Blindagem NR-1 e mapa de risco psicossocial." },
  { q: "T2", lens: "FIB-T — Ecossistema", promise: "A felicidade que o sistema sustenta." },
  { q: "T3", lens: "PERMA+V — Performance", promise: "Florescimento e capital psicológico." },
  { q: "T4", lens: "VIA-T — Cultura", promise: "Forças de caráter e cultura de potência." },
  { q: "Q5", lens: "Relatório Global ESG", promise: "A prova consolidada do ano." },
];

// O que nenhum concorrente oferece (diferenciação / moat).
export const PROGRAMA_DIFFERENTIATORS = [
  "Ciclo completo: medir → agir → provar → certificar (não medir e parar).",
  "Transformação comprovada por experimento controlado — não discurso.",
  "Privacidade radical: k-anonimato e consentimento que governam a própria IA.",
  "Moat de dados: benchmark setorial anônimo entre clientes.",
  "Selo Empresa Viva auditável, exibível na página de carreira.",
];

// Os 3 níveis de contratação (packaging).
export interface ProgramaTier {
  id: string;
  name: string;
  tagline: string;
  forWho: string;
  includes: string[];
  cta: { label: string; to: string };
  featured?: boolean;
}

export const PROGRAMA_TIERS: ProgramaTier[] = [
  {
    id: "demo",
    name: "Demo Estratégica",
    tagline: "Veja a jornada científica funcionando, com dados navegáveis.",
    forWho: "Para quem quer entender o método antes de decidir.",
    includes: [
      "Acesso navegável a todo o ecossistema (mock)",
      "Panorama executivo e Relatório Global ESG de exemplo",
      "Demonstração do ciclo M.E.T.E. e do Selo",
    ],
    cta: { label: "Explorar agora", to: "/panorama" },
  },
  {
    id: "sprint",
    name: "Sprint Trimestral",
    tagline: "Comece por uma lente, com efeito medido em 90 dias.",
    forWho: "Para a primeira prova de valor — uma cunha por trimestre.",
    includes: [
      "1 instrumento (COPSOQ, FIB-T, PERMA+V ou VIA-T)",
      "Ciclo de 4 fases: diagnóstico → educar → transformar → relatório",
      "1 experimento no Culture Lab com efeito medido",
      "Relatório trimestral auditável",
    ],
    cta: { label: "Escolher uma lente", to: "/temporada" },
    featured: true,
  },
  {
    id: "anual",
    name: "Programa Anual",
    tagline: "As 4 lentes em 12 meses, do risco à certificação.",
    forWho: "Para instalar o sistema operacional da vitalidade.",
    includes: [
      "As 4 lentes em jornada longitudinal",
      "Relatórios trimestrais + Relatório Global ESG",
      "Benchmark setorial e Trajetória preditiva",
      "Certificação Selo Empresa Viva (anual, auditável)",
    ],
    cta: { label: "Falar com especialista", to: "/selo" },
  },
];

export const PROGRAMA_CLOSING = {
  title: "Instale o sistema operacional da vitalidade",
  text:
    "Não é mais um programa de RH. É a infraestrutura que transforma bem-estar em performance " +
    "sustentável, compliance em vantagem e cultura em evidência — em um ciclo que se prova ano após ano.",
  cta: { label: "Começar pela demo", to: "/panorama" },
};
