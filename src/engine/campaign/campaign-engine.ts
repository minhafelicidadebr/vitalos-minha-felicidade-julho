// Campaign engine — puro, setor-agnóstico. Orquestra uma ONDA DE MEDIÇÃO: aplicar
// UM instrumento (PERMA→IVO, FIB-T, VIA-T, COPSOQ) como campanha, dentro de uma
// janela, para uma audiência, no eixo MENSURAR do M.E.T.E. NÃO computa o resultado
// do instrumento (isso é dos motores de índice); orquestra o processo: estado da
// campanha, ritmo, lembrete e — o coração — o LIVRO-RAZÃO DE PARTICIPAÇÃO de
// DUPLA-VISÃO. Nunca importa de domain/.
//
// ⚖️ Trava inegociável (privacidade × honestidade):
//   • O INDIVÍDUO vê o próprio status e é convidado/lembrado.
//   • O LÍDER/RH vê APENAS a taxa agregada por recorte (n≥k). NUNCA uma lista de
//     quem não respondeu — expor não-respondentes transforma medição voluntária em
//     vigilância coercitiva. Por isso há DUAS funções, para DUAS audiências, e o
//     tipo da visão do líder não carrega identidade alguma.

export type WaveState = "agendada" | "aberta" | "encerrando" | "fechada";

export const WAVE_K_ANON_MIN = 5;
export const WAVE_CLOSING_DAYS = 3;
export const WAVE_DEFAULT_TARGET_PCT = 60;

const MS_PER_DAY = 86_400_000;

function parseDay(iso: string): number {
  // "YYYY-MM-DD" → epoch (UTC, meia-noite). Determinístico.
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDay(toIso) - parseDay(fromIso)) / MS_PER_DAY);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

// ─── Entradas ─────────────────────────────────────────────────────────────────

export interface SegmentParticipation {
  segmentId: string;
  label: string;
  invited: number;
  responded: number;
}

export interface MeasurementWaveInput {
  id: string;
  instrumentLabel: string;
  instrumentShort: string;
  season: string; // estação da Matriz IFT que esta onda mensura
  opensOn: string; // ISO "YYYY-MM-DD"
  closesOn: string; // ISO
  today: string; // ISO — injetado para manter pureza/determinismo
  invitedTotal: number;
  respondedTotal: number;
  segments: SegmentParticipation[];
  kAnonymityMin?: number;
  targetParticipationPct?: number;
}

// ─── Saída: visão do LÍDER/RH (agregado, sem identidade) ──────────────────────

export interface SegmentResult {
  segmentId: string;
  label: string;
  invited: number;
  responded: number;
  participationPct: number;
  /** O recorte tem n≥k? Só então o líder vê a taxa; senão fica oculto. */
  visibleToLeader: boolean;
  /** O recorte pode ter resultado publicado (n≥k)? */
  readyToPublish: boolean;
}

export interface WaveLedger {
  invitedTotal: number;
  respondedTotal: number;
  participationPct: number;
  segments: SegmentResult[];
  /** Recortes ocultos por n<k (a taxa não aparece, mas as respostas contam no total). */
  hiddenSegmentCount: number;
  readyToPublishOverall: boolean;
}

export interface ReminderPlan {
  shouldRemind: boolean;
  reason: string;
}

export interface MeasurementWave {
  id: string;
  instrumentLabel: string;
  instrumentShort: string;
  season: string;
  state: WaveState;
  daysRemaining: number;
  windowLabel: string;
  participationPct: number;
  targetParticipationPct: number;
  expectedByNowPct: number;
  onTrack: boolean;
  ledger: WaveLedger;
  reminder: ReminderPlan;
  privacyNote: string;
}

const PRIVACY_NOTE =
  "Você vê apenas a taxa por recorte (n≥5). Quem respondeu e quem não respondeu é invisível — " +
  "por princípio: medição voluntária não vira vigilância.";

function waveState(input: MeasurementWaveInput): { state: WaveState; daysRemaining: number } {
  const toOpen = daysBetween(input.today, input.opensOn);
  const toClose = daysBetween(input.today, input.closesOn);

  if (toOpen > 0) return { state: "agendada", daysRemaining: Math.max(0, toClose) };
  if (toClose < 0) return { state: "fechada", daysRemaining: 0 };
  const closing = toClose <= WAVE_CLOSING_DAYS;
  return { state: closing ? "encerrando" : "aberta", daysRemaining: Math.max(0, toClose) };
}

/** Visão do LÍDER/RH — orquestração + livro-razão agregado. Nenhuma identidade. */
export function computeWave(input: MeasurementWaveInput): MeasurementWave {
  const k = input.kAnonymityMin ?? WAVE_K_ANON_MIN;
  const target = input.targetParticipationPct ?? WAVE_DEFAULT_TARGET_PCT;
  const { state, daysRemaining } = waveState(input);

  const participationPct = pct(input.respondedTotal, input.invitedTotal);

  // Ritmo esperado: fração da janela decorrida × meta (honesto, não promessa).
  const totalWindow = Math.max(1, daysBetween(input.opensOn, input.closesOn));
  const elapsed = clamp(daysBetween(input.opensOn, input.today), 0, totalWindow);
  const elapsedFraction = elapsed / totalWindow;
  const expectedByNowPct = Math.round(elapsedFraction * target);
  const active = state === "aberta" || state === "encerrando";
  const onTrack = !active || participationPct >= expectedByNowPct;

  const segments: SegmentResult[] = input.segments.map((s) => {
    const visible = s.responded >= k;
    return {
      segmentId: s.segmentId,
      label: s.label,
      invited: s.invited,
      responded: s.responded,
      participationPct: pct(s.responded, s.invited),
      visibleToLeader: visible,
      readyToPublish: visible,
    };
  });

  const ledger: WaveLedger = {
    invitedTotal: input.invitedTotal,
    respondedTotal: input.respondedTotal,
    participationPct,
    segments,
    hiddenSegmentCount: segments.filter((s) => !s.visibleToLeader).length,
    readyToPublishOverall: input.respondedTotal >= k,
  };

  const shouldRemind = active && participationPct < target && (!onTrack || state === "encerrando");
  const reminder: ReminderPlan = {
    shouldRemind,
    reason: shouldRemind
      ? state === "encerrando"
        ? `Faltam ${daysRemaining} dia(s) e a participação (${participationPct}%) está abaixo da meta (${target}%).`
        : `O ritmo está atrás do esperado (${participationPct}% vs ${expectedByNowPct}% para esta altura da janela).`
      : active
        ? "No ritmo — sem necessidade de lembrete agora."
        : "Onda fechada — sem lembretes.",
  };

  return {
    id: input.id,
    instrumentLabel: input.instrumentLabel,
    instrumentShort: input.instrumentShort,
    season: input.season,
    state,
    daysRemaining,
    windowLabel: `${input.opensOn} → ${input.closesOn}`,
    participationPct,
    targetParticipationPct: target,
    expectedByNowPct,
    onTrack,
    ledger,
    reminder,
    privacyNote: PRIVACY_NOTE,
  };
}

// ─── Saída: visão do INDIVÍDUO (só o próprio status) ──────────────────────────

export type IndividualStatus = "respondeu" | "pendente";

export interface IndividualWaveView {
  instrumentLabel: string;
  state: WaveState;
  daysRemaining: number;
  myStatus: IndividualStatus;
  /** Convite/agradecimento conforme estado × status. */
  cta: string;
  canRespond: boolean;
  privacyAssurance: string;
  voluntaryNote: string;
}

const PRIVACY_ASSURANCE =
  "Sua resposta é anônima e entra apenas no agregado (n≥5). Ninguém — nem seu gestor — vê a sua resposta individual.";
const VOLUNTARY_NOTE = "A participação fortalece a cultura e é sempre voluntária, sem penalidade.";

/** Visão do INDIVÍDUO — só o próprio status. Jamais expõe os outros. */
export function buildIndividualView(
  input: MeasurementWaveInput,
  myStatus: IndividualStatus,
): IndividualWaveView {
  const { state, daysRemaining } = waveState(input);
  const open = state === "aberta" || state === "encerrando";
  const canRespond = open && myStatus === "pendente";

  let cta: string;
  if (myStatus === "respondeu") {
    cta = "Obrigado — sua resposta já foi registrada. A devolutiva chega no fim da onda.";
  } else if (state === "agendada") {
    cta = `A onda de ${input.instrumentLabel} abre em breve. Você será convidado(a).`;
  } else if (state === "fechada") {
    cta = "Esta onda encerrou. Fique atento(a) à devolutiva e à próxima.";
  } else if (state === "encerrando") {
    cta = `Últimos ${daysRemaining} dia(s) para responder — leva poucos minutos.`;
  } else {
    cta = "Responder agora — leva poucos minutos.";
  }

  return {
    instrumentLabel: input.instrumentLabel,
    state,
    daysRemaining,
    myStatus,
    cta,
    canRespond,
    privacyAssurance: PRIVACY_ASSURANCE,
    voluntaryNote: VOLUNTARY_NOTE,
  };
}
