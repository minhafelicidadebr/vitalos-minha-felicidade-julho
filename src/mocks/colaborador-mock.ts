// Collaborator mock data — deterministic, no individual responses
// Persona: Marina Santos, Produto, TechCorp Ltda

export const MOCK_USER = {
  id: "u-marina-01",
  name: "Marina Santos",
  firstName: "Marina",
  role: "COLABORADOR" as const,
  department: "Produto",
  team: "Experiência do Usuário",
  avatarInitials: "MS",
  xpWeek: 340,
  xpTotal: 2_180,
  kudosBalanceWeek: 3,   // remaining kudos to give (max 5/week)
  kudosReceivedWeek: 2,
} as const;

export interface MockMission {
  id: string;
  type: "micro" | "macro" | "legendary";
  pillarId: string;
  pillarName: string;
  title: string;
  xp?: number;
  impact?: number;
  progressPct: number;
  status: "pending" | "in_progress" | "completed";
  daysLeft: number;
}

export const MOCK_MISSIONS: MockMission[] = [
  {
    id: "m_micro_kudo_semana",
    type: "micro",
    pillarId: "reconhecimento_pares",
    pillarName: "Reconhecimento entre Pares",
    title: "Reconheça um colega esta semana",
    xp: 20,
    progressPct: 60,
    status: "in_progress",
    daysLeft: 3,
  },
  {
    id: "m_micro_pausa_real",
    type: "micro",
    pillarId: "energia_vitalidade",
    pillarName: "Energia & Vitalidade",
    title: "Faça 3 pausas reais de 5 minutos hoje",
    xp: 15,
    progressPct: 0,
    status: "pending",
    daysLeft: 1,
  },
  {
    id: "m_macro_almoco_cruzado",
    type: "macro",
    pillarId: "comunicacao_pertencimento",
    pillarName: "Comunicação & Pertencimento",
    title: "Organize um almoço cruzado entre duas áreas",
    impact: 50,
    progressPct: 30,
    status: "in_progress",
    daysLeft: 18,
  },
];

export interface MockKudo {
  id: string;
  fromName: string;
  fromInitials: string;
  pillarName: string;
  message: string;
  isPublic: boolean;
  date: string;
}

export const MOCK_KUDOS_RECEIVED: MockKudo[] = [
  {
    id: "k-01",
    fromName: "Pedro Alves",
    fromInitials: "PA",
    pillarName: "Cooperação & Confiança",
    message: "Obrigado pelo apoio na sprint de onboarding — fez toda a diferença!",
    isPublic: true,
    date: "Ontem",
  },
  {
    id: "k-02",
    fromName: "Ana Costa",
    fromInitials: "AC",
    pillarName: "Comunicação & Pertencimento",
    message: "Sua apresentação trouxe clareza para todo o time.",
    isPublic: true,
    date: "3 dias atrás",
  },
];

export const MOCK_COLLEAGUES = [
  { id: "u-pedro", name: "Pedro Alves", initials: "PA", team: "Engenharia" },
  { id: "u-ana", name: "Ana Costa", initials: "AC", team: "Marketing" },
  { id: "u-julia", name: "Julia Mendes", initials: "JM", team: "Produto" },
  { id: "u-carlos", name: "Carlos Santos", initials: "CS", team: "RH" },
  { id: "u-fernanda", name: "Fernanda Oliveira", initials: "FO", team: "Design" },
];

export const MOCK_KUDOS_PILLARS = [
  { id: "reconhecimento_pares", name: "Reconhecimento entre Pares" },
  { id: "cooperacao_confianca", name: "Cooperação & Confiança" },
  { id: "seguranca_psicologica", name: "Segurança Psicológica" },
  { id: "comunicacao_pertencimento", name: "Comunicação & Pertencimento" },
  { id: "crescimento_maestria", name: "Crescimento & Maestria" },
];

export interface MockBadge {
  id: string;
  name: string;
  earned: boolean;
  earnedAt?: string;
  emoji: string;
}

export const MOCK_BADGES: MockBadge[] = [
  { id: "primeiro_passo", name: "Primeiro Passo", earned: true, earnedAt: "Jan 2026", emoji: "🌱" },
  { id: "espelho_ativo", name: "Espelho Ativo", earned: true, earnedAt: "Mar 2026", emoji: "🪞" },
  { id: "colega_que_conecta", name: "Colega que Conecta", earned: false, emoji: "🤝" },
  { id: "reconhecedor_serial", name: "Reconhecedor Serial", earned: false, emoji: "⭐" },
];

export const MOCK_SEASON = {
  id: "t1-2026",
  name: "Temporada Primavera da Vitalidade",
  cycleId: "T1-2026",
  phase: "transformar" as const,
  phaseLabel: "Transformar",
  weekNumber: 6,
  totalWeeks: 13,
  progressPct: Math.round((6 / 13) * 100),
  nextEvent: "Pulse de Equipe",
  nextEventDate: "Próxima semana",
  phases: [
    { id: "mensurar", label: "Mensurar", done: true },
    { id: "educar", label: "Educar", done: true },
    { id: "transformar", label: "Transformar", done: false, current: true },
    { id: "evoluir", label: "Evoluir", done: false },
  ],
} as const;

// FlorescerIA — mockada (Bloco 12 implementará o real)
export const FLORESCERIA_SUGGESTION = {
  mode: "insight_semanal",
  text: "Seu pilar **Propósito & Significado** está em alta esta semana. Que tal compartilhar com a equipe o que mais te motiva no projeto atual? Uma frase sua pode ser o kudo mais poderoso do dia.",
  action: "Compartilhar agora",
} as const;
