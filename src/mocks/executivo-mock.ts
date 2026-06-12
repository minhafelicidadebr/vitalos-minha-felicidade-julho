// C-Level, SST/CIPA and Holding mock data — aggregates only, deterministic

// ─── C-Level ──────────────────────────────────────────────────────────────────

export const CLEVEL_TREND = [
  { cycle: "T2/2025", score: 531 },
  { cycle: "T3/2025", score: 549 },
  { cycle: "T4/2025", score: 568 },
  { cycle: "T1/2026", score: 619 },
] as const;

// Vitality P&L resumido (Bloco 16 trará fórmulas editáveis completas)
export const CLEVEL_PNL = {
  scenario: "médio" as const,
  turnoverCostYear: 2_840_000,
  absenteeismCostYear: 960_000,
  presenteeismCostYear: 1_750_000,
  avoidedCostByIvoDelta: 410_000,
  inactionCost12m: 5_550_000,
  disclaimer:
    "Estimativas correlacionais com fórmulas transparentes — não são promessas de resultado. Detalhe completo no Vitality P&L (em construção).",
} as const;

export const CLEVEL_NR1_RISK = {
  level: "moderado" as const,
  label: "Exposição moderada",
  detail:
    "2 categorias de risco psicossocial com pilares em zona crítica (carga de trabalho, equilíbrio). Plano de ação preparatório em andamento — trilha educativa, não substitui o PGR.",
} as const;

export const CLEVEL_PRIORITIES = [
  {
    id: "p1",
    title: "Reverter zona crítica de Condições & Carga na Unidade Sul",
    rationale: "Maior risco regulatório e de turnover. Protocolo de revisão de carga em piloto.",
  },
  {
    id: "p2",
    title: "Sustentar a alta de participação (78%)",
    rationale: "Confiança é o oxigênio do dado. Trust Ledger e embaixadores são os motores.",
  },
  {
    id: "p3",
    title: "Escalar o protocolo 'Pausas Protegidas' se o piloto confirmar efeito",
    rationale: "Equilíbrio & Autonomia é o pilar mais baixo da empresa (475 pts).",
  },
] as const;

// ─── SST/CIPA (Domínio B — educativo) ────────────────────────────────────────

export const SST_DISCLAIMER =
  "Conteúdo educativo e preparatório. Não substitui o PGR nem a atuação de profissional habilitado em segurança e saúde no trabalho.";

export interface RiskCategory {
  id: string;
  name: string;
  exposure: "baixa" | "moderada" | "alta";
  relatedPillar: string;
  actionsOpen: number;
}

export const SST_RISK_INVENTORY: RiskCategory[] = [
  {
    id: "carga",
    name: "Sobrecarga e ritmo de trabalho",
    exposure: "alta",
    relatedPillar: "Condições & Carga de Trabalho",
    actionsOpen: 2,
  },
  {
    id: "jornada",
    name: "Jornada e desconexão",
    exposure: "moderada",
    relatedPillar: "Equilíbrio & Autonomia",
    actionsOpen: 1,
  },
  {
    id: "assedio",
    name: "Assédio e violência no trabalho",
    exposure: "baixa",
    relatedPillar: "Inclusão, Equidade & Diversidade",
    actionsOpen: 0,
  },
  {
    id: "claridade",
    name: "Falta de clareza de papéis",
    exposure: "moderada",
    relatedPillar: "Clareza & Direção",
    actionsOpen: 1,
  },
  {
    id: "reconhecimento",
    name: "Baixo reconhecimento",
    exposure: "moderada",
    relatedPillar: "Reconhecimento entre Pares",
    actionsOpen: 1,
  },
];

// Canal de escuta — só volumes agregados, NUNCA relatos individuais
export const SST_LISTENING = {
  totalReportsQuarter: 14,
  byCategory: [
    { label: "Sobrecarga", count: 6 },
    { label: "Conflitos interpessoais", count: 4 },
    { label: "Condições físicas", count: 3 },
    { label: "Outros", count: 1 },
  ],
  avgResponseDays: 4,
  microcopy:
    "Volumes agregados por categoria. O conteúdo dos relatos é confidencial e acessível apenas ao fluxo de escuta protegida.",
} as const;

export const SST_CHECKLIST = [
  { id: "c1", label: "Inventário de riscos psicossociais revisado no trimestre", done: true },
  { id: "c2", label: "COPSOQ agregado aplicado e arquivado", done: true },
  { id: "c3", label: "Plano de ação preparatório com responsáveis e prazos", done: true },
  { id: "c4", label: "Treinamento de líderes em riscos psicossociais", done: false },
  { id: "c5", label: "Trilha documental exportada para o profissional do PGR", done: false },
] as const;

// ─── Holding ──────────────────────────────────────────────────────────────────

export interface PortfolioCompany {
  id: string;
  name: string;
  sector: string;
  employees: number;
  ivoScore: number | null; // null → ciclo ainda não concluído
  maturityName: string | null;
  participationPct: number;
  adoptionHealth: "saudável" | "atenção" | "crítico";
}

export const HOLDING_PORTFOLIO: PortfolioCompany[] = [
  {
    id: "techcorp",
    name: "TechCorp Ltda",
    sector: "Tecnologia",
    employees: 480,
    ivoScore: 619,
    maturityName: "Organização Saudável",
    participationPct: 78,
    adoptionHealth: "saudável",
  },
  {
    id: "agrovida",
    name: "AgroVida S.A.",
    sector: "Agronegócio",
    employees: 1_240,
    ivoScore: 552,
    maturityName: "Organização Saudável",
    participationPct: 64,
    adoptionHealth: "atenção",
  },
  {
    id: "construmax",
    name: "ConstruMax",
    sector: "Construção",
    employees: 860,
    ivoScore: 487,
    maturityName: "Organização Colaborativa",
    participationPct: 51,
    adoptionHealth: "crítico",
  },
  {
    id: "saudeplena",
    name: "Saúde Plena",
    sector: "Saúde",
    employees: 390,
    ivoScore: null,
    maturityName: null,
    participationPct: 23,
    adoptionHealth: "atenção",
  },
];

export const HOLDING_SUMMARY = {
  companies: 4,
  totalEmployees: 2_970,
  avgIvo: 553, // média das 3 com ciclo concluído
  avgParticipation: 54,
  microcopy:
    "Benchmark interno anonimizado. Cada organização vê apenas seus próprios dados — a holding vê agregados, nunca indivíduos.",
} as const;
