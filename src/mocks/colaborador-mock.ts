// Collaborator mock data — deterministic, no individual responses
// Persona: Marina Santos, Produto, TechCorp Ltda

import { computeSeasonOverview } from "@/engine/season/season-engine";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "./season-mock";

export const MOCK_USER = {
  id: "u-marina-01",
  name: "Marina Santos",
  firstName: "Marina",
  role: "COLABORADOR" as const,
  department: "Produto",
  team: "Experiência do Usuário",
  avatarInitials: "MS",
} as const;

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
  {
    id: "k-03",
    fromName: "Julia Mendes",
    fromInitials: "JM",
    pillarName: "Crescimento & Maestria",
    message: "Sua escuta na revisão me ajudou a enxergar uma alternativa melhor. Obrigada.",
    isPublic: false,
    date: "5 dias atrás",
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

export const RECOGNITION_AGGREGATES = [
  {
    pillarId: "reconhecimento_pares",
    pillarLabel: "Reconhecimento entre Pares",
    recognitionCount: 38,
    uniqueContributors: 19,
  },
  {
    pillarId: "cooperacao_confianca",
    pillarLabel: "Cooperação & Confiança",
    recognitionCount: 27,
    uniqueContributors: 14,
  },
  {
    pillarId: "comunicacao_pertencimento",
    pillarLabel: "Comunicação & Pertencimento",
    recognitionCount: 18,
    uniqueContributors: 11,
  },
  {
    pillarId: "crescimento_maestria",
    pillarLabel: "Crescimento & Maestria",
    recognitionCount: 4,
    uniqueContributors: 4,
  },
] as const;

export const RECOGNITION_COPY = {
  eyebrow: "Comunidade · Reconhecimento",
  title: "Reconhecer o que alguém fez — sem transformar afeto em vigilância",
  lead: "Um Kudo específico fortalece vínculos e torna contribuições visíveis para quem as recebeu. O VitalOS™ protege a mensagem: o ledger guarda apenas metadados mínimos para orçamento e antiabuso.",
  privateNote:
    "Privado: somente você e a pessoa reconhecida acessam a mensagem na experiência real.",
  publicNote:
    "Público: exige consentimento explícito de publicação. A liderança vê apenas Kudos públicos e métricas coletivas protegidas.",
  noMessagePersistence:
    "Nesta demonstração, o texto é usado apenas para simular a entrega e desaparece após o envio. Ele não entra no ledger, no XP ou em Sinais Vivos.",
} as const;

// Fonte ÚNICA: a temporada do colaborador deriva do season-engine sobre o
// ANNUAL_PLAN — nada de estado paralelo hardcoded. O card e a rota /temporada
// passam a contar exatamente a mesma história (week, fase, progresso).
const _season = computeSeasonOverview(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK);

export const MOCK_SEASON = {
  id: _season.currentSeason.id,
  name: `Temporada ${_season.currentSeason.name}`,
  cycleId: _season.currentSeason.cycleId,
  phase: _season.currentPhase.id,
  phaseLabel: _season.currentPhase.label,
  weekNumber: _season.position.weekInSeason,
  totalWeeks: ANNUAL_PLAN.weeksPerSeason,
  progressPct: _season.currentSeason.progressPct,
  nextEvent: _season.nextMilestone?.label ?? "Próxima fase",
  nextEventDate: _season.nextMilestone
    ? `em ${_season.nextMilestone.weeksAway} ${_season.nextMilestone.weeksAway === 1 ? "semana" : "semanas"}`
    : "—",
  phases: _season.currentSeason.phases.map((p) => ({
    id: p.id,
    label: p.label,
    done: p.status === "concluida",
    current: p.status === "atual",
  })),
};

// FlorescerIA — mockada (Bloco 12 implementará o real)
export const FLORESCERIA_SUGGESTION = {
  mode: "insight_semanal",
  text: "Seu pilar **Propósito & Significado** está em alta esta semana. Que tal compartilhar com a equipe o que mais te motiva no projeto atual? Uma frase sua pode ser o kudo mais poderoso do dia.",
  action: "Compartilhar agora",
} as const;
