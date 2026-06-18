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
