// O Programa — conteúdo da landing/packaging (apresentação de venda). Documenta
// a hierarquia corrigida do ecossistema e os 3 níveis de contratação, com
// narrativa de infoproduto premium. É copy de domínio; sem engine.

import { CANONICAL_JOURNEY } from "@/domain/journey";

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
    value: "4 Lentes VitalOS™",
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

// A jornada (o método) — os 4 trimestres derivam da jornada canônica (fonte
// única: mesma sequência de /temporada e /relatorio-global) + a síntese Q5.
export const PROGRAMA_JOURNEY: Array<{ q: string; lens: string; promise: string }> = [
  ...CANONICAL_JOURNEY.map((s) => ({ q: s.quarter, lens: s.lensName, promise: s.headline })),
  { q: "Q5", lens: "Relatório Global ESG", promise: "A prova consolidada do ano." },
];

// O que nenhum concorrente oferece (diferenciação / moat).
export const PROGRAMA_DIFFERENTIATORS = [
  "Ciclo completo: medir → agir → provar → certificar (não medir e parar).",
  "Efeito afirmado só quando um experimento atende ao critério de avaliação do Culture Lab.",
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
    tagline:
      "90 dias para definir uma prioridade, acompanhar a execução de uma ação e revisar as evidências disponíveis.",
    forWho: "Para a primeira prova de valor — uma lente por trimestre.",
    includes: [
      "1 lente (Q1 COPSOQ, Q2 FIB-T, Q3 PERMA+V ou Q4 VIA-T), conforme a disponibilidade de cada uma",
      "Ciclo de 4 fases: diagnóstico → educar → transformar → relatório",
      "Ação acompanhada, com registro de execução e decisão de continuidade",
      "Relatório trimestral com registro das ações e das evidências disponíveis",
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

// Q1 · oferta de serviços. O VitalOS cobra pelos serviços; o questionário não tem preço próprio.
export interface ProgramaQ1Deliverable {
  label: string;
  status: "available" | "planned";
}

export const PROGRAMA_Q1_OFFER = {
  eyebrow: "Q1 · Fatores psicossociais",
  title: "Da escuta dos trabalhadores ao plano de ação",
  text:
    "O Q1 reúne serviços de avaliação de fatores psicossociais, análise de resultados, consultoria e treinamento. " +
    "A contratação remunera os serviços previstos no plano. O questionário COPSOQ II-Br não tem cobrança separada.",
  statusLabels: { available: "Disponível", planned: "Previsto" },
  deliverables: [
    { label: "Preparação da avaliação: escopo, comunicado aos trabalhadores, papéis e revisão técnica", status: "available" },
    { label: "Leitura agregada por dimensão, só para grupos com 5 ou mais respostas", status: "planned" },
    { label: "Devolutiva descritiva aos trabalhadores e à gestão", status: "planned" },
    { label: "Apoio à elaboração do plano de ação a partir da leitura", status: "planned" },
    { label: "Treinamento de lideranças e equipes ligado às prioridades", status: "planned" },
  ] satisfies ProgramaQ1Deliverable[],
  collectionStatus:
    "Coleta oficial em preparação: a aplicação do COPSOQ II-Br ainda não está liberada. Hoje é possível preparar a avaliação.",
  disclaimer:
    "Apoio educativo e organizacional: não substitui o PGR nem profissional habilitado e não garante conformidade com a NR-1.",
  cta: { label: "Conversar sobre o Q1", href: "https://www.felicidadeparatodos.com.br/" },
};

export const PROGRAMA_CLOSING = {
  title: "Instale o sistema operacional da vitalidade",
  text:
    "Não é mais um programa de RH. É a infraestrutura que transforma bem-estar em performance " +
    "sustentável, compliance em vantagem e cultura em evidência — em um ciclo que se prova ano após ano.",
  cta: { label: "Começar pela demo", to: "/panorama" },
};
