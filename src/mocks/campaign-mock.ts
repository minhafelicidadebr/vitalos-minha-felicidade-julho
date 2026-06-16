// Ondas de medição — registro por setor. Cada estação da jornada aplica seu
// instrumento como UMA onda; o ano é uma sequência de ondas (uma fechada após a
// outra, a do trimestre corrente aberta, a próxima agendada). A Escola tem a sua
// onda própria (IEV), provando que Mensurar é setor-agnóstico. Agregados fictícios;
// um recorte com n<5 em cada onda ativa prova a trava de privacidade ao vivo.

import type { MeasurementWaveInput } from "@/engine/campaign/campaign-engine";

// Injetado no motor (pureza). Alinhado à data corrente do ambiente.
export const TODAY = "2026-06-16";

// ─── Ondas da Empresa (a jornada canônica, trimestre a trimestre) ─────────────

const WAVE_COPSOQ: MeasurementWaveInput = {
  id: "onda-2026-t1-copsoq",
  instrumentLabel: "COPSOQ II · NR-1",
  instrumentShort: "COPSOQ",
  season: "Fundação Segura",
  opensOn: "2026-01-08",
  closesOn: "2026-01-22",
  today: TODAY,
  invitedTotal: 480,
  respondedTotal: 403,
  segments: [
    { segmentId: "eng", label: "Engenharia", invited: 120, responded: 104 },
    { segmentId: "ops", label: "Operações", invited: 140, responded: 116 },
    { segmentId: "com", label: "Comercial", invited: 95, responded: 79 },
    { segmentId: "pc", label: "Pessoas & Cultura", invited: 40, responded: 36 },
    { segmentId: "noite", label: "Turno noite (Sul)", invited: 77, responded: 61 },
    { segmentId: "dir", label: "Diretoria", invited: 8, responded: 7 },
  ],
};

const WAVE_FIBT: MeasurementWaveInput = {
  id: "onda-2026-t2-fibt",
  instrumentLabel: "FIB-T · Felicidade Interna Bruta",
  instrumentShort: "FIB-T",
  season: "Raízes do Bem-Comum",
  opensOn: "2026-04-08",
  closesOn: "2026-04-22",
  today: TODAY,
  invitedTotal: 480,
  respondedTotal: 379,
  segments: [
    { segmentId: "eng", label: "Engenharia", invited: 120, responded: 95 },
    { segmentId: "ops", label: "Operações", invited: 140, responded: 104 },
    { segmentId: "com", label: "Comercial", invited: 95, responded: 79 },
    { segmentId: "pc", label: "Pessoas & Cultura", invited: 40, responded: 33 },
    { segmentId: "noite", label: "Turno noite (Sul)", invited: 77, responded: 64 },
    { segmentId: "dir", label: "Diretoria", invited: 8, responded: 4 }, // n<5
  ],
};

const WAVE_PERMA: MeasurementWaveInput = {
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

const WAVE_VIAT: MeasurementWaveInput = {
  id: "onda-2026-t4-viat",
  instrumentLabel: "VIA-T v1 · Forças de caráter",
  instrumentShort: "VIA-T",
  season: "Forças em Cultura",
  opensOn: "2026-10-08",
  closesOn: "2026-10-22",
  today: TODAY,
  invitedTotal: 480,
  respondedTotal: 0,
  segments: [
    { segmentId: "eng", label: "Engenharia", invited: 120, responded: 0 },
    { segmentId: "ops", label: "Operações", invited: 140, responded: 0 },
    { segmentId: "com", label: "Comercial", invited: 95, responded: 0 },
    { segmentId: "pc", label: "Pessoas & Cultura", invited: 40, responded: 0 },
    { segmentId: "noite", label: "Turno noite (Sul)", invited: 77, responded: 0 },
    { segmentId: "dir", label: "Diretoria", invited: 8, responded: 0 },
  ],
};

export const ENTERPRISE_WAVES: MeasurementWaveInput[] = [
  WAVE_COPSOQ,
  WAVE_FIBT,
  WAVE_PERMA,
  WAVE_VIAT,
];

// Compat: a onda ATIVA da empresa (consumida por /responder e /devolutiva).
export const ACTIVE_WAVE_INPUT = WAVE_PERMA;

// ─── Onda da Escola (IEV) — Mensurar é setor-agnóstico ────────────────────────

const WAVE_ESCOLA: MeasurementWaveInput = {
  id: "onda-2026-escola-iev",
  instrumentLabel: "PERMA+V escolar → IEV",
  instrumentShort: "IEV",
  season: "Florescimento Escolar",
  opensOn: "2026-06-09",
  closesOn: "2026-06-23",
  today: TODAY,
  invitedTotal: 540,
  respondedTotal: 396,
  segments: [
    { segmentId: "fund1", label: "Fundamental I", invited: 180, responded: 140 },
    { segmentId: "fund2", label: "Fundamental II", invited: 200, responded: 148 },
    { segmentId: "medio", label: "Ensino Médio", invited: 120, responded: 86 },
    { segmentId: "docentes", label: "Educadores", invited: 32, responded: 19 },
    { segmentId: "direcao", label: "Direção", invited: 8, responded: 3 }, // n<5 → oculto
  ],
};

export const SCHOOL_WAVES: MeasurementWaveInput[] = [WAVE_ESCOLA];

// ─── Seletores por setor ──────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
function day(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
}
function isOpen(w: MeasurementWaveInput): boolean {
  const t = day(w.today);
  return t >= day(w.opensOn) && t <= day(w.closesOn);
}

export function getSectorWaves(packId: string): MeasurementWaveInput[] {
  return packId === "school" ? SCHOOL_WAVES : ENTERPRISE_WAVES;
}

/** A onda em andamento do setor; se nenhuma estiver aberta, a mais recente. */
export function getActiveWave(packId: string): MeasurementWaveInput {
  const waves = getSectorWaves(packId);
  return waves.find(isOpen) ?? waves[waves.length - 1]!;
}

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
