// RH/CHRO mock data — org-level aggregates only, deterministic
// Heatmap: 3 unidades × 4 lentes. One cut (Unidade Sul · Turno Noturno) has n<5.

export const MOCK_RH = {
  id: "u-clara-01",
  name: "Clara Nogueira",
  firstName: "Clara",
  role: "CHRO" as const,
  avatarInitials: "CN",
} as const;

export interface HeatmapCell {
  lensId: string;
  score: number | null; // null → hidden by k-anonymity
}

export interface HeatmapRow {
  unitId: string;
  unitLabel: string;
  n: number;
  participationPct: number;
  cells: HeatmapCell[];
}

// Scores 0–1000 per lens (eu, nos, lideranca, organizacao)
export const HEATMAP_UNITS: HeatmapRow[] = [
  {
    unitId: "matriz",
    unitLabel: "Matriz — São Paulo",
    n: 214,
    participationPct: 82,
    cells: [
      { lensId: "eu", score: 668 },
      { lensId: "nos", score: 671 },
      { lensId: "lideranca", score: 593 },
      { lensId: "organizacao", score: 612 },
    ],
  },
  {
    unitId: "sul",
    unitLabel: "Unidade Sul — Curitiba",
    n: 138,
    participationPct: 76,
    cells: [
      { lensId: "eu", score: 601 },
      { lensId: "nos", score: 645 },
      { lensId: "lideranca", score: 552 },
      { lensId: "organizacao", score: 489 },
    ],
  },
  {
    unitId: "nordeste",
    unitLabel: "Unidade NE — Recife",
    n: 96,
    participationPct: 71,
    cells: [
      { lensId: "eu", score: 689 },
      { lensId: "nos", score: 702 },
      { lensId: "lideranca", score: 631 },
      { lensId: "organizacao", score: 597 },
    ],
  },
  {
    unitId: "sul-noturno",
    unitLabel: "Sul · Turno Noturno",
    n: 4,
    participationPct: 0,
    cells: [
      { lensId: "eu", score: null },
      { lensId: "nos", score: null },
      { lensId: "lideranca", score: null },
      { lensId: "organizacao", score: null },
    ],
  },
];

export const PARTICIPATION = {
  overallPct: 78,
  respondents: 374,
  invited: 480,
  deltaVsPrevPct: 9, // +9 p.p. vs T4/2025
  byRole: [
    { label: "Operação", pct: 71 },
    { label: "Administrativo", pct: 84 },
    { label: "Liderança", pct: 92 },
  ],
} as const;

export interface RHAlert {
  id: string;
  severity: "high" | "medium" | "info";
  title: string;
  detail: string;
  pillarName?: string;
  unitLabel?: string;
}

export const RH_ALERTS: RHAlert[] = [
  {
    id: "al-01",
    severity: "high",
    title: "Lente ORGANIZAÇÃO em zona crítica na Unidade Sul",
    detail:
      "Score 489 — puxado por Condições & Carga (2.8 média). Sugerido: protocolo de revisão de carga + escuta ativa.",
    pillarName: "Condições & Carga de Trabalho",
    unitLabel: "Unidade Sul — Curitiba",
  },
  {
    id: "al-02",
    severity: "medium",
    title: "Equilíbrio & Autonomia caiu em 3 das 4 lentes de equipes de Produto",
    detail: "Delta médio −38 pts vs T4/2025. Coincide com a mudança para o novo release train.",
    pillarName: "Equilíbrio & Autonomia",
  },
  {
    id: "al-03",
    severity: "info",
    title: "Participação subiu 9 p.p. após campanha dos embaixadores",
    detail:
      "78% — melhor marca histórica. Trust Ledger citado em 64% dos feedbacks como motivo de confiança.",
  },
];

export interface KanbanItem {
  id: string;
  title: string;
  pillarName: string;
  ownerName: string;
  dueLabel: string;
  evidence: "pendente" | "anexada" | "aprovada";
}

export interface KanbanColumn {
  id: "todo" | "doing" | "done";
  label: string;
  items: KanbanItem[];
}

export const GRO_KANBAN: KanbanColumn[] = [
  {
    id: "todo",
    label: "A fazer",
    items: [
      {
        id: "g-01",
        title: "Mapear sobrecarga no fechamento mensal (Sul)",
        pillarName: "Condições & Carga de Trabalho",
        ownerName: "Clara N. (RH)",
        dueLabel: "15 dias",
        evidence: "pendente",
      },
      {
        id: "g-02",
        title: "Formação de líderes em conversas de carreira",
        pillarName: "Desenvolvimento de Pessoas",
        ownerName: "Time DHO",
        dueLabel: "30 dias",
        evidence: "pendente",
      },
    ],
  },
  {
    id: "doing",
    label: "Em andamento",
    items: [
      {
        id: "g-03",
        title: "Protocolo 'Pausas Protegidas' — piloto em 4 equipes",
        pillarName: "Equilíbrio & Autonomia",
        ownerName: "Rafael L. (Líder UX)",
        dueLabel: "Semana 3 de 4",
        evidence: "anexada",
      },
      {
        id: "g-04",
        title: "Revisão da política de reuniões (blocos sem agenda)",
        pillarName: "Energia & Vitalidade",
        ownerName: "Comitê de Vitalidade",
        dueLabel: "20 dias",
        evidence: "anexada",
      },
    ],
  },
  {
    id: "done",
    label: "Concluído",
    items: [
      {
        id: "g-05",
        title: "Canal de escuta segura divulgado em todas as unidades",
        pillarName: "Cultura de Bem-Estar",
        ownerName: "Clara N. (RH)",
        dueLabel: "Entregue",
        evidence: "aprovada",
      },
    ],
  },
];

export const SEASON_RH = {
  name: "Temporada Primavera da Vitalidade",
  cycleId: "T1-2026",
  weekNumber: 6,
  totalWeeks: 13,
  progressPct: Math.round((6 / 13) * 100),
  phases: [
    { id: "mensurar", label: "Mensurar", done: true },
    { id: "educar", label: "Educar", done: true },
    { id: "transformar", label: "Transformar", done: false, current: true },
    { id: "evoluir", label: "Evoluir", done: false },
  ],
  highlights: [
    "374 respondentes no diagnóstico (78%)",
    "2 protocolos do Culture Lab em piloto",
    "12 missões macro ativas em 8 departamentos",
  ],
} as const;
