// Evidences, reports and Selo Empresa Viva — deterministic mock

export interface Evidence {
  id: string;
  title: string;
  type: "foto" | "documento" | "checklist" | "relato";
  pillarName: string;
  submittedBy: string;
  date: string;
  status: "pendente" | "aprovada";
  linkedTo: string; // ação/missão/protocolo
}

export const EVIDENCES: Evidence[] = [
  {
    id: "ev-01",
    title: "Registro do ritual de reconhecimento — retro de maio",
    type: "foto",
    pillarName: "Reconhecimento entre Pares",
    submittedBy: "Equipe Atendimento",
    date: "28/05/2026",
    status: "aprovada",
    linkedTo: "Protocolo: Ritual de Reconhecimento Quinzenal",
  },
  {
    id: "ev-02",
    title: "Ata de repactuação de prazos do fechamento",
    type: "documento",
    pillarName: "Condições & Carga de Trabalho",
    submittedBy: "Clara N. (RH)",
    date: "02/06/2026",
    status: "aprovada",
    linkedTo: "Ação GRO: Mapear sobrecarga no fechamento (Sul)",
  },
  {
    id: "ev-03",
    title: "Checklist semana 3 — Pausas Protegidas",
    type: "checklist",
    pillarName: "Equilíbrio & Autonomia",
    submittedBy: "Rafael L. (Líder UX)",
    date: "09/06/2026",
    status: "pendente",
    linkedTo: "Experimento: Pausas Protegidas",
  },
  {
    id: "ev-04",
    title: "Relato do almoço cruzado Produto × Marketing",
    type: "relato",
    pillarName: "Comunicação & Pertencimento",
    submittedBy: "Embaixadoria Anfitriões",
    date: "05/06/2026",
    status: "aprovada",
    linkedTo: "Missão macro: Almoço cruzado",
  },
];

export interface ReportDef {
  id: string;
  title: string;
  description: string;
  audience: string;
  pages: number;
}

export const REPORTS: ReportDef[] = [
  {
    id: "rep-exec",
    title: "Relatório Executivo do Ciclo",
    description: "IVO, radar, deltas, participação e 3 prioridades — pronto para diretoria.",
    audience: "C-Level / Conselho",
    pages: 4,
  },
  {
    id: "rep-gro",
    title: "Trilha Documental GRO",
    description: "Inventário de riscos, COPSOQ agregado, ações com evidências e responsáveis.",
    audience: "Profissional do PGR (educativo)",
    pages: 12,
  },
  {
    id: "rep-pnl",
    title: "Vitality P&L — 1 página",
    description: "Custos correntes, evitáveis e da inação, com todas as fórmulas visíveis.",
    audience: "CFO",
    pages: 1,
  },
  {
    id: "rep-temporada",
    title: "Retrospectiva da Temporada",
    description: "Arco M.E.T.E., experimentos do Culture Lab, missões e celebração.",
    audience: "Toda a organização",
    pages: 6,
  },
];

// Selo Empresa Viva — certification ladder mirrors maturityLevels
export const SEAL_STATUS = {
  currentLevelName: "Organização Saudável",
  currentBadge: "saudavel",
  ivoScore: 619,
  nextLevelName: "Organização Sustentável",
  nextLevelMin: 650,
  requirements: [
    {
      id: "r1",
      label: "IVO ≥ 650 por 2 temporadas consecutivas",
      done: false,
      detail: "Atual: 619 (1ª temporada na faixa)",
    },
    { id: "r2", label: "Participação ≥ 70%", done: true, detail: "78% ✓" },
    {
      id: "r3",
      label: "≥ 1 experimento com efeito confirmado pelo critério do Culture Lab",
      done: true,
      detail: "Ritual de Reconhecimento ✓ (dado demonstrativo)",
    },
    {
      id: "r4",
      label: "Trilha GRO com evidências aprovadas",
      done: true,
      detail: "3 evidências aprovadas ✓",
    },
    {
      id: "r5",
      label: "Trust Ledger ativo para 100% dos colaboradores",
      done: true,
      detail: "Ativo desde o onboarding ✓",
    },
  ],
  publicNote:
    "O Selo Empresa Viva é anual, auditável e pode ser exibido nas páginas de carreira. Reconhece sistema instalado e pelo menos um experimento com efeito medido pelo critério do Culture Lab.",
} as const;
