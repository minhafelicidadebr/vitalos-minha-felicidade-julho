// Fronteira server-only do ciclo de vida das ondas. A AUTORIDADE operacional:
// resolve o estado de uma onda, aplica transições do gestor e sela o capsule no
// fechamento. O cliente recebe um resumo SEGURO — nunca o capsule bruto com todas
// as dimensões, apenas o que a tela de gestão precisa.
//
// Em produção (Fase 2): substituir o mock por RPC Lovable Cloud com RLS por
// organization_id. A interface permanece idêntica. Hoje é ephemeral_demo: as
// transições COMPUTAM o resultado mas não persistem além da resposta.
//
// HONESTIDADE: o resumo do gestor reflete o sealOutcome — se n < k, a tela mostra
// "encerrada sem leitura divulgável", nunca um número inventado.

import {
  resolveEffectiveStatus,
  availableActions,
  applyTransition,
  sealWave,
  isPublishable,
  type WaveLifecycleRecord,
  type WaveLifecycleAction,
  type WaveLifecycleStatus,
  type WaveLifecycleEvent,
  type SealOutcome,
  type EffectiveStatus,
} from "@/engine/survey/wave-lifecycle-engine";
import { computeWave, type WaveState } from "@/engine/campaign/campaign-engine";
import {
  getWaveLifecycleRecord,
  getWaveSealInput,
  getPackWaveIds,
} from "@/mocks/wave-lifecycle-mock";
import { ENTERPRISE_WAVES, SCHOOL_WAVES, GOVERNMENT_WAVES } from "@/mocks/campaign-mock";
import type { MeasurementWaveInput } from "@/engine/campaign/campaign-engine";

// ─── Resumo seguro para o cliente (sem dimensões brutas) ───────────────────────

/** Resumo do ciclo de vida de uma onda — seguro para enviar à tela de gestão. */
export interface WaveLifecycleSummary {
  waveId: string;
  instrumentShort: string;
  instrumentLabel: string;
  season: string;
  /** Estado operacional efetivo (reconciliado com o calendário). */
  status: WaveLifecycleStatus;
  /** Estado temporal do calendário (agendada/aberta/encerrando/fechada). */
  calendarState: WaveState;
  /** O calendário indica que deveria abrir, mas ainda está scheduled. */
  shouldOpen: boolean;
  /** A janela fechou, mas a onda ainda não foi selada. */
  awaitingSeal: boolean;
  /** Ações que o gestor pode disparar agora. */
  availableActions: WaveLifecycleAction[];
  /** Participação agregada (k-anon a montante). */
  participationPct: number;
  invitedTotal: number;
  respondedTotal: number;
  /** Resultado do selamento, se já selada. */
  sealOutcome: SealOutcome | null;
  /** Há capsule publicável (alimenta a FlorescerIA)? */
  publishable: boolean;
  /** Domínio do instrumento — A (florescimento) ou B (risco). Null se não selada. */
  domain: "A" | "B" | null;
  /** Trilha de auditoria — ações de processo, nunca identidade de respondentes. */
  events: readonly WaveLifecycleEvent[];
}

// ─── Resolução de onda ─────────────────────────────────────────────────────────

const ALL_WAVES: MeasurementWaveInput[] = [
  ...ENTERPRISE_WAVES,
  ...SCHOOL_WAVES,
  ...GOVERNMENT_WAVES,
];

function findWaveInput(waveId: string): MeasurementWaveInput | null {
  return ALL_WAVES.find((w) => w.id === waveId) ?? null;
}

/** Monta o resumo seguro a partir de um record + a onda do calendário. */
function buildSummary(
  record: WaveLifecycleRecord,
  waveInput: MeasurementWaveInput,
): WaveLifecycleSummary {
  const wave = computeWave(waveInput);
  const effective: EffectiveStatus = resolveEffectiveStatus(record, wave.state);

  return {
    waveId: record.waveId,
    instrumentShort: waveInput.instrumentShort,
    instrumentLabel: waveInput.instrumentLabel,
    season: waveInput.season,
    status: effective.status,
    calendarState: wave.state,
    shouldOpen: effective.shouldOpen,
    awaitingSeal: effective.awaitingSeal,
    availableActions: availableActions(effective.status),
    participationPct: wave.participationPct,
    invitedTotal: wave.ledger.invitedTotal,
    respondedTotal: wave.ledger.respondedTotal,
    sealOutcome: record.sealOutcome,
    publishable: isPublishable(record),
    domain: record.capsule?.domain ?? null,
    events: record.events,
  };
}

/** Resolve o resumo de ciclo de vida de uma onda. Null se a onda não existe. */
export function resolveWaveLifecycle(waveId: string): WaveLifecycleSummary | null {
  const record = getWaveLifecycleRecord(waveId);
  const waveInput = findWaveInput(waveId);
  if (!record || !waveInput) return null;
  return buildSummary(record, waveInput);
}

/** Lista os resumos de ciclo de vida das ondas de um pack (para o painel do gestor). */
export function listWaveLifecycles(packId: string): WaveLifecycleSummary[] {
  return getPackWaveIds(packId)
    .map((id) => resolveWaveLifecycle(id))
    .filter((s): s is WaveLifecycleSummary => s !== null);
}

// ─── Transições do gestor ──────────────────────────────────────────────────────

export type WaveTransitionResult =
  | { ok: true; summary: WaveLifecycleSummary }
  | { ok: false; reason: string };

export interface TransitionRequest {
  waveId: string;
  action: WaveLifecycleAction;
  actorRole: string;
  reason?: string;
  /** Injetável para testes determinísticos. */
  nowIso?: string;
}

/**
 * Aplica uma transição do gestor. Para `seal`, compõe o sealInput da onda (o que
 * o pipeline produziu) e sela o capsule honestamente sob k-anon.
 *
 * ephemeral_demo: o resultado é COMPUTADO a partir do seed + a transição; não há
 * persistência. Em produção, a transição gravaria o novo estado com RLS.
 */
export function transitionWaveLifecycle(req: TransitionRequest): WaveTransitionResult {
  const record = getWaveLifecycleRecord(req.waveId);
  const waveInput = findWaveInput(req.waveId);
  if (!record || !waveInput) return { ok: false, reason: "Onda não encontrada." };

  const ctx = {
    actorRole: req.actorRole,
    at: req.nowIso ?? new Date().toISOString(),
    reason: req.reason,
  };

  if (req.action === "seal") {
    const sealInput = getWaveSealInput(req.waveId);
    if (!sealInput) {
      return { ok: false, reason: "Esta onda não tem dados de medição para selar." };
    }
    const result = sealWave(record, { capsule: sealInput }, ctx);
    if (!result.ok) return { ok: false, reason: result.rejection.message };
    return { ok: true, summary: buildSummary(result.record, waveInput) };
  }

  const result = applyTransition(record, req.action, ctx);
  if (!result.ok) return { ok: false, reason: result.rejection.message };
  return { ok: true, summary: buildSummary(result.record, waveInput) };
}
