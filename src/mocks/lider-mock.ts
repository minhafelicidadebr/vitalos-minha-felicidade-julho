// Team-leader mock data — deterministic, only aggregates with n >= 5
// Persona: Rafael Lima, líder da equipe "Experiência do Usuário" (8 pessoas)
import type { IVOInput } from "../engine/index/ivo-engine";

export const MOCK_LEADER = {
  id: "u-rafael-01",
  name: "Rafael Lima",
  firstName: "Rafael",
  role: "LIDER_EQUIPE" as const,
  team: "Experiência do Usuário",
  department: "Produto",
  teamSize: 8,
  teamRespondents: 7, // n >= 5 → agregados visíveis
  avatarInitials: "RL",
} as const;

// Team aggregates T1/2026 — all n=7 (above k-anonymity).
// Two pillars deliberately critical to drive the demo narrative.
export const teamCurrentCycle: IVOInput = {
  organizationId: "techcorp-ltda",
  cycleId: "T1-2026",
  aggregates: [
    { pillarId: "energia_vitalidade", mean: 3.4, n: 7 },
    { pillarId: "proposito_significado", mean: 4.2, n: 7 },
    { pillarId: "crescimento_maestria", mean: 4.0, n: 7 },
    { pillarId: "equilibrio_autonomia", mean: 2.7, n: 7 },
    { pillarId: "seguranca_psicologica", mean: 4.1, n: 7 },
    { pillarId: "cooperacao_confianca", mean: 3.9, n: 7 },
    { pillarId: "reconhecimento_pares", mean: 3.0, n: 7 },
    { pillarId: "comunicacao_pertencimento", mean: 3.8, n: 7 },
    { pillarId: "clareza_direcao", mean: 3.7, n: 7 },
    { pillarId: "justica_coerencia", mean: 3.5, n: 7 },
    { pillarId: "desenvolvimento_pessoas", mean: 3.6, n: 7 },
    { pillarId: "cuidado_ativo", mean: 3.4, n: 7 },
    { pillarId: "condicoes_carga", mean: 2.9, n: 7 },
    { pillarId: "cultura_bem_estar", mean: 3.5, n: 7 },
    { pillarId: "inclusao_equidade", mean: 3.9, n: 7 },
    { pillarId: "sustentabilidade_bem_comum", mean: 3.8, n: 7 },
  ],
};

export const teamPreviousCycle: IVOInput = {
  organizationId: "techcorp-ltda",
  cycleId: "T4-2025",
  aggregates: [
    { pillarId: "energia_vitalidade", mean: 3.2, n: 6 },
    { pillarId: "proposito_significado", mean: 4.0, n: 6 },
    { pillarId: "crescimento_maestria", mean: 3.8, n: 6 },
    { pillarId: "equilibrio_autonomia", mean: 2.9, n: 6 },
    { pillarId: "seguranca_psicologica", mean: 3.8, n: 6 },
    { pillarId: "cooperacao_confianca", mean: 3.7, n: 6 },
    { pillarId: "reconhecimento_pares", mean: 2.8, n: 6 },
    { pillarId: "comunicacao_pertencimento", mean: 3.6, n: 6 },
    { pillarId: "clareza_direcao", mean: 3.5, n: 6 },
    { pillarId: "justica_coerencia", mean: 3.4, n: 6 },
    { pillarId: "desenvolvimento_pessoas", mean: 3.4, n: 6 },
    { pillarId: "cuidado_ativo", mean: 3.2, n: 6 },
    { pillarId: "condicoes_carga", mean: 3.0, n: 6 },
    { pillarId: "cultura_bem_estar", mean: 3.3, n: 6 },
    { pillarId: "inclusao_equidade", mean: 3.7, n: 6 },
    { pillarId: "sustentabilidade_bem_comum", mean: 3.6, n: 6 },
  ],
};

// Sub-cut example to demonstrate k-anonymity in leader view:
// shift "Noturno" has only 2 respondents → must be hidden
export const TEAM_CUTS = [
  { id: "integral", label: "Turno Integral", n: 5, visible: true },
  { id: "noturno", label: "Turno Noturno", n: 2, visible: false },
] as const;

export interface LeaderMission {
  id: string;
  title: string;
  pillarName: string;
  xp: number;
  status: "pending" | "in_progress" | "completed";
}

export const LEADER_MISSIONS: LeaderMission[] = [
  {
    id: "m_micro_pergunta_segura",
    title: "Abra a reunião com a pergunta: 'O que quase deu errado esta semana?'",
    pillarName: "Segurança Psicológica",
    xp: 25,
    status: "in_progress",
  },
  {
    id: "m_lider_1on1_equilibrio",
    title: "Converse individualmente com a equipe sobre carga de trabalho",
    pillarName: "Equilíbrio & Autonomia",
    xp: 30,
    status: "pending",
  },
];

export interface ActionItem {
  id: string;
  title: string;
  pillarName: string;
  status: "todo" | "doing" | "done";
  dueLabel: string;
}

export const ACTION_PLAN: ActionItem[] = [
  {
    id: "a-01",
    title: "Bloquear agenda sem reunião nas quartas à tarde",
    pillarName: "Equilíbrio & Autonomia",
    status: "doing",
    dueLabel: "Esta semana",
  },
  {
    id: "a-02",
    title: "Ritual de reconhecimento quinzenal na retro",
    pillarName: "Reconhecimento entre Pares",
    status: "todo",
    dueLabel: "Próxima sprint",
  },
  {
    id: "a-03",
    title: "Revisar distribuição de demandas com o time",
    pillarName: "Condições & Carga de Trabalho",
    status: "done",
    dueLabel: "Concluído",
  },
];

// Copiloto do Líder — mock (FlorescerIA agêntica chega no Bloco 12)
export const LEADER_COPILOT_SUGGESTION = {
  text: "O pilar **Equilíbrio & Autonomia** da sua equipe caiu 50 pontos vs o ciclo anterior e está em zona crítica. Sugiro o protocolo 'Pausas Protegidas' (4 semanas) e uma conversa aberta na próxima reunião. Lembre: o dado mostra caminhos, não culpados.",
  protocol: "Pausas Protegidas",
} as const;
