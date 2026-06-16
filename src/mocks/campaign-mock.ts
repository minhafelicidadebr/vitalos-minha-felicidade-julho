// Onda de medição — dados de demonstração do eixo MENSURAR. A onda ativa aplica o
// instrumento da estação atual (Florescimento → PERMA+V/IVO). Inclui um recorte com
// n<5 (Diretoria) para provar, ao vivo, a trava de privacidade: o líder NÃO vê a
// taxa desse recorte, mas as respostas ainda contam no agregado. Agregados fictícios.

import type { MeasurementWaveInput, IndividualStatus } from "@/engine/campaign/campaign-engine";

// Injetado no motor (pureza). Alinhado à data corrente do ambiente.
export const TODAY = "2026-06-16";

export const ACTIVE_WAVE_INPUT: MeasurementWaveInput = {
  id: "onda-2026-t3-perma",
  instrumentLabel: "PERMA+V → IVO",
  instrumentShort: "PERMA+V / IVO",
  season: "Florescimento",
  opensOn: "2026-06-08",
  closesOn: "2026-06-22",
  today: TODAY,
  invitedTotal: 480,
  respondedTotal: 311,
  segments: [
    { segmentId: "eng", label: "Engenharia", invited: 120, responded: 92 },
    { segmentId: "ops", label: "Operações", invited: 140, responded: 78 },
    { segmentId: "com", label: "Comercial", invited: 95, responded: 71 },
    { segmentId: "pc", label: "Pessoas & Cultura", invited: 40, responded: 31 },
    { segmentId: "noite", label: "Turno noite (Sul)", invited: 77, responded: 36 },
    { segmentId: "dir", label: "Diretoria", invited: 8, responded: 3 }, // n<5 → oculto ao líder
  ],
};

// Status do colaborador demo nesta onda (alterna a visão individual).
export const MY_WAVE_STATUS: IndividualStatus = "pendente";

// Histórico de ondas do ano (só exibição) — a sequência da jornada canônica.
export interface PastWave {
  id: string;
  instrumentShort: string;
  season: string;
  windowLabel: string;
  participationPct: number;
}

export const PAST_WAVES: PastWave[] = [
  {
    id: "onda-2026-t1-copsoq",
    instrumentShort: "COPSOQ",
    season: "Fundação Segura",
    windowLabel: "Jan → Mar",
    participationPct: 84,
  },
  {
    id: "onda-2026-t2-fibt",
    instrumentShort: "FIB-T",
    season: "Raízes do Bem-Comum",
    windowLabel: "Abr → Jun",
    participationPct: 79,
  },
];

export const ONDA_INTRO = {
  eyebrow: "Mensurar · Onda Ativa",
  title: "A campanha de medição, em andamento",
  leadLeader:
    "A onda da estação aplica um instrumento à comunidade inteira. Você acompanha o ritmo e a " +
    "participação por recorte — sempre agregado, n≥5. O que você nunca vê é quem respondeu ou " +
    "deixou de responder: medição voluntária não vira vigilância.",
  leadIndividual:
    "Há uma onda de medição aberta. Sua voz molda a leitura da cultura — e é anônima por " +
    "construção. Leva poucos minutos, e a participação é sempre voluntária.",
  segmentsTitle: "Participação por recorte (n≥5)",
  historyTitle: "Ondas do ano",
};

// Estilos por estado da onda (cor institucional, sem hex solto em componente).
export const WAVE_STATE_STYLE: Record<string, { label: string; cls: string }> = {
  agendada: { label: "Agendada", cls: "bg-muted text-muted-foreground" },
  aberta: {
    label: "Aberta",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  encerrando: {
    label: "Encerrando",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  fechada: {
    label: "Fechada",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
};
