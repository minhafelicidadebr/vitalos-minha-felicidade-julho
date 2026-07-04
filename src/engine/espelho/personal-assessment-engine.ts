// Espelho Vivo — motor PURO de autoavaliação pessoal (Mensurar Vivo, I-M3).
//
// TRILHO B da arquitetura dos Dois Trilhos: este motor pontua a autoavaliação
// IDENTIFICADA e opt-in da própria pessoa — nunca toca, lê ou deriva de
// resposta de onda organizacional (Trilho A, anônimo por arquitetura física).
//
// Engine ≠ Domínio: fatores, itens, faixas e cadências chegam por parâmetro.
// O motor não sabe o que é "PERMA" — pontua qualquer bateria de fatores sobre
// escala injetada. O resultado sai em FAIXAS (vocabulário §5.7 — nunca nota
// crua como veredito) e o snapshot computado é o que se persiste (minimização
// LGPD: as respostas item a item nunca saem da sessão).
//
// Honestidade §8: item não respondido é excluído da média e a completude é
// reportada; fator sem respostas sai como null ("sem dados"), nunca como zero.

// ─── Definições injetadas (do mock/pack, nunca daqui) ───────────────────────

export interface PersonalFactorDef {
  id: string;
  name: string;
  itemIds: string[];
  /** Pilares do índice que este fator informa — alimenta a Bússola (I-M4). */
  pillarIds: string[];
}

export interface PersonalBandDef {
  id: string;
  label: string;
  /** Piso da faixa na escala da bateria (ex.: 1–5). A maior faixa cujo min ≤ score vence. */
  min: number;
}

export interface PersonalScaleDef {
  min: number;
  max: number;
}

// ─── Resultado (o snapshot que se persiste — nunca as respostas cruas) ──────

export interface PersonalFactorScore {
  id: string;
  name: string;
  /** null = sem dados (nenhum item do fator respondido). */
  score: number | null;
  bandId: string | null;
  bandLabel: string | null;
  answered: number;
  total: number;
  pillarIds: string[];
}

export interface PersonalAssessmentResult {
  factors: PersonalFactorScore[];
  /** Média dos fatores com dados; null se nenhum fator tem dados. */
  global: number | null;
  globalBandId: string | null;
  globalBandLabel: string | null;
  /** % de itens respondidos (0–100). */
  completeness: number;
  takenAt: string;
}

/** Registro persistível (S6.5) — snapshot + versões p/ honestidade histórica. */
export interface PersonalAssessmentRecord {
  assessmentId: string;
  instrument: string;
  instrumentVersion: string;
  engineVersion: string;
  takenAt: string;
  result: PersonalAssessmentResult;
}

export const PERSONAL_ASSESSMENT_ENGINE_VERSION = "1.0.0";

// ─── Scoring ─────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pickBand(score: number, bands: readonly PersonalBandDef[]): PersonalBandDef | null {
  return (
    [...bands].sort((a, b) => b.min - a.min).find((band) => score >= band.min) ?? null
  );
}

export function scorePersonalAssessment(
  responses: Readonly<Record<string, number>>,
  factors: readonly PersonalFactorDef[],
  bands: readonly PersonalBandDef[],
  scale: PersonalScaleDef,
  takenAt: string,
): PersonalAssessmentResult {
  const valid = (value: number | undefined): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= scale.min && value <= scale.max;

  const factorScores: PersonalFactorScore[] = factors.map((factor) => {
    const values = factor.itemIds.map((id) => responses[id]).filter(valid);
    if (values.length === 0) {
      return {
        id: factor.id,
        name: factor.name,
        score: null,
        bandId: null,
        bandLabel: null,
        answered: 0,
        total: factor.itemIds.length,
        pillarIds: factor.pillarIds,
      };
    }
    const score = round1(values.reduce((s, v) => s + v, 0) / values.length);
    const band = pickBand(score, bands);
    return {
      id: factor.id,
      name: factor.name,
      score,
      bandId: band?.id ?? null,
      bandLabel: band?.label ?? null,
      answered: values.length,
      total: factor.itemIds.length,
      pillarIds: factor.pillarIds,
    };
  });

  const withData = factorScores.filter((f) => f.score !== null);
  const global =
    withData.length === 0
      ? null
      : round1(withData.reduce((s, f) => s + (f.score ?? 0), 0) / withData.length);
  const globalBand = global === null ? null : pickBand(global, bands);

  const totalItems = factors.reduce((s, f) => s + f.itemIds.length, 0);
  const answeredItems = factorScores.reduce((s, f) => s + f.answered, 0);

  return {
    factors: factorScores,
    global,
    globalBandId: globalBand?.id ?? null,
    globalBandLabel: globalBand?.label ?? null,
    completeness: totalItems === 0 ? 0 : Math.round((answeredItems / totalItems) * 100),
    takenAt,
  };
}

// ─── Tendência entre reavaliações (histórico INSERT-only) ───────────────────

export type TrendDirection = "melhorando" | "estavel" | "atencao";

export interface AssessmentTrendPoint {
  takenAt: string;
  global: number | null;
}

export interface AssessmentTrend {
  points: AssessmentTrendPoint[];
  /** Delta entre a última e a penúltima leitura com dados; null com <2 leituras. */
  lastDelta: number | null;
  direction: TrendDirection | null;
}

const TREND_EPSILON = 0.2;

export function buildAssessmentTrend(
  history: readonly PersonalAssessmentRecord[],
  instrument: string,
): AssessmentTrend {
  const points = history
    .filter((r) => r.instrument === instrument)
    .slice()
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map((r) => ({ takenAt: r.takenAt, global: r.result.global }));

  const withData = points.filter((p) => p.global !== null);
  if (withData.length < 2) return { points, lastDelta: null, direction: null };

  const last = withData[withData.length - 1]!.global!;
  const prev = withData[withData.length - 2]!.global!;
  const lastDelta = round1(last - prev);
  const direction: TrendDirection =
    lastDelta > TREND_EPSILON ? "melhorando" : lastDelta < -TREND_EPSILON ? "atencao" : "estavel";

  return { points, lastDelta, direction };
}

// ─── Guarda de cadência (anti re-testagem obsessiva) ────────────────────────

export interface RetakeGate {
  allowed: boolean;
  daysRemaining: number;
}

const MS_PER_DAY = 86_400_000;

export function canRetake(
  lastTakenAt: string | null,
  today: string,
  minDays: number,
): RetakeGate {
  if (!lastTakenAt) return { allowed: true, daysRemaining: 0 };
  const elapsed = Math.floor(
    (Date.parse(today) - Date.parse(lastTakenAt)) / MS_PER_DAY,
  );
  const remaining = Math.max(0, minDays - elapsed);
  return { allowed: remaining === 0, daysRemaining: remaining };
}
