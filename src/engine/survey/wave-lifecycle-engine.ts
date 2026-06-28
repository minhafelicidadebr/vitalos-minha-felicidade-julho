// Wave Lifecycle Engine — engine PURO. A camada OPERACIONAL da medição.
//
// O campaign-engine computa o estado TEMPORAL de uma onda (derivado das datas:
// agendada/aberta/encerrando/fechada) e a visão dupla de participação. Este
// engine adiciona a camada que faltava: as TRANSIÇÕES que o gestor (RH/SST)
// decide ativamente — publicar um rascunho, encerrar antes do prazo, SELAR o
// capsule de medição, arquivar — cada uma com guarda e trilha de auditoria.
//
// COMPOSIÇÃO (Fable 5 §5.1 — compor, não acumular):
//   campaign-engine.computeWave  → estado temporal (calendário)        [injetado]
//   ESTE engine                  → estado operacional + transições
//   measurement-capsule-engine   → buildMeasurementCapsule no selamento [composto]
//
// A SEPARAÇÃO temporal × operacional é deliberada: o calendário diz "a janela
// está aberta"; o gestor decide "encerro agora e selo". Os dois podem DIVERGIR
// (encerramento antecipado) — e quando divergem, a decisão operacional vence.
//
// HONESTIDADE (Fable 5 §6 + invariante k-anon):
//   - Selar exige nada — o gestor sempre pode encerrar. Mas o capsule só é
//     PUBLICÁVEL se n ≥ kMin. Abaixo disso, sela com outcome "insufficient_k_anon"
//     e capsule = null: encerrou, mas não há leitura divulgável. Sem fingir dado.
//   - A trilha de auditoria registra ação + papel + quando + porquê. NUNCA a
//     identidade de quem respondeu — auditar o processo não é vigiar pessoas.
//
// Engine puro: sem React, sem I/O, sem imports de domain/. Determinístico.

import type { WaveState } from "../campaign/campaign-engine";
import {
  buildMeasurementCapsule,
  type CapsuleInput,
  type MeasurementContextCapsule,
} from "../ai/measurement-capsule-engine";

// ─── Estado operacional (decisão do gestor, não do calendário) ─────────────────

export type WaveLifecycleStatus =
  | "draft" // criada, ainda não publicada aos participantes
  | "scheduled" // publicada, aguardando a data de abertura
  | "collecting" // aberta para respostas (cobre "aberta" e "encerrando" do calendário)
  | "sealed" // encerrada e selada — capsule produzido (ou marcada sem dados publicáveis)
  | "archived" // arquivada — histórico read-only
  | "cancelled"; // cancelada antes de coletar — nunca produziu dados

export type WaveLifecycleAction =
  | "publish" // draft → scheduled
  | "open" // scheduled → collecting
  | "seal" // collecting → sealed (encerra + tenta selar o capsule)
  | "archive" // sealed → archived
  | "cancel"; // draft | scheduled → cancelled

/** Registro persistido da onda (o que o "banco" guardaria). Sem identidade alguma. */
export interface WaveLifecycleRecord {
  waveId: string;
  status: WaveLifecycleStatus;
  /** Eventos em ordem cronológica — a trilha de auditoria do processo. */
  events: readonly WaveLifecycleEvent[];
  /** Capsule selado no fechamento; null até selar ou se n < kMin no selamento. */
  capsule: MeasurementContextCapsule | null;
  /** Resultado do selamento, quando aplicável. */
  sealOutcome: SealOutcome | null;
}

export type SealOutcome = "sealed_publishable" | "insufficient_k_anon" | "no_responses";

/** Um evento auditável. Registra o PROCESSO — nunca a identidade de respondentes. */
export interface WaveLifecycleEvent {
  action: WaveLifecycleAction;
  fromStatus: WaveLifecycleStatus;
  toStatus: WaveLifecycleStatus;
  /** Papel do ator (ex.: "RH", "SST", "sistema") — NUNCA o nome de uma pessoa. */
  actorRole: string;
  /** ISO timestamp da transição. */
  at: string;
  /** Justificativa opcional (ex.: "encerramento antecipado por meta atingida"). */
  reason: string | null;
}

// ─── Matriz de transições legais ───────────────────────────────────────────────

const LEGAL_TRANSITIONS: Record<WaveLifecycleStatus, Partial<Record<WaveLifecycleAction, WaveLifecycleStatus>>> = {
  draft: { publish: "scheduled", cancel: "cancelled" },
  scheduled: { open: "collecting", cancel: "cancelled" },
  collecting: { seal: "sealed" },
  sealed: { archive: "archived" },
  archived: {},
  cancelled: {},
};

/** Uma transição é legal a partir do status atual? */
export function canTransition(from: WaveLifecycleStatus, action: WaveLifecycleAction): boolean {
  return LEGAL_TRANSITIONS[from][action] !== undefined;
}

/** Lista as ações legais a partir de um status (para a UI habilitar/desabilitar botões). */
export function availableActions(from: WaveLifecycleStatus): WaveLifecycleAction[] {
  return Object.keys(LEGAL_TRANSITIONS[from]) as WaveLifecycleAction[];
}

// ─── Reconciliação: status operacional × estado do calendário ──────────────────

/**
 * Status EFETIVO da onda, reconciliando a decisão operacional com o calendário.
 *
 * Regra: status terminal do gestor (sealed/archived/cancelled) SEMPRE vence — uma
 * onda selada não "reabre" porque a data de fechamento ainda não chegou. Para os
 * status não-terminais, o calendário informa a progressão natural:
 *   - scheduled + calendário "aberta"/"encerrando" → deveria abrir (driftOpen)
 *   - collecting + calendário "fechada" → janela expirou, aguardando selamento (driftClose)
 */
export interface EffectiveStatus {
  status: WaveLifecycleStatus;
  /** O calendário indica que a onda deveria estar aberta, mas ainda está scheduled. */
  shouldOpen: boolean;
  /** A janela do calendário fechou, mas a onda ainda está collecting (aguardando selar). */
  awaitingSeal: boolean;
}

export function resolveEffectiveStatus(
  record: Pick<WaveLifecycleRecord, "status">,
  calendarState: WaveState,
): EffectiveStatus {
  const { status } = record;

  // Status terminais do gestor vencem o calendário.
  if (status === "sealed" || status === "archived" || status === "cancelled") {
    return { status, shouldOpen: false, awaitingSeal: false };
  }

  const calendarOpen = calendarState === "aberta" || calendarState === "encerrando";

  return {
    status,
    shouldOpen: status === "scheduled" && calendarOpen,
    awaitingSeal: status === "collecting" && calendarState === "fechada",
  };
}

// ─── Aplicar transição ─────────────────────────────────────────────────────────

export interface TransitionContext {
  actorRole: string;
  at: string; // ISO
  reason?: string;
}

export type TransitionResult =
  | { ok: true; record: WaveLifecycleRecord }
  | { ok: false; rejection: TransitionRejection };

export interface TransitionRejection {
  reason: "illegal_transition" | "seal_requires_seal_input";
  message: string;
}

/**
 * Aplica uma transição NÃO-selante (publish/open/archive/cancel). Para `seal`,
 * use sealWave() — que precisa dos dados de medição para compor o capsule.
 * Retorna um novo record (imutável: nunca muta o input).
 */
export function applyTransition(
  record: WaveLifecycleRecord,
  action: Exclude<WaveLifecycleAction, "seal">,
  ctx: TransitionContext,
): TransitionResult {
  const toStatus = LEGAL_TRANSITIONS[record.status][action];
  if (toStatus === undefined) {
    return {
      ok: false,
      rejection: {
        reason: "illegal_transition",
        message: `Transição ilegal: ${action} a partir de "${record.status}". Ações válidas: ${availableActions(record.status).join(", ") || "(nenhuma — status terminal)"}.`,
      },
    };
  }

  const event = buildEvent(action, record.status, toStatus, ctx);
  return {
    ok: true,
    record: { ...record, status: toStatus, events: [...record.events, event] },
  };
}

// ─── Selamento: a transição que produz o capsule ───────────────────────────────

/** Dados de medição para selar — o que o pipeline produziu ao fechar a coleta. */
export interface SealInput {
  /** Tudo que o measurement-capsule-engine precisa, MENOS o que o record já sabe. */
  capsule: CapsuleInput;
}

export type SealResult =
  | { ok: true; record: WaveLifecycleRecord; outcome: SealOutcome }
  | { ok: false; rejection: TransitionRejection };

/**
 * Sela uma onda em coleta: encerra e tenta produzir o MeasurementContextCapsule.
 *
 * O gestor SEMPRE pode encerrar (não há trava para fechar). Mas o capsule só é
 * publicável se n ≥ kMin. Resultados honestos:
 *   - n = 0            → outcome "no_responses",       capsule = null
 *   - 0 < n < kMin     → outcome "insufficient_k_anon", capsule = null
 *   - n ≥ kMin         → outcome "sealed_publishable",  capsule = <selado>
 *
 * Em todos os casos a onda transiciona para "sealed" — encerrar é sempre legítimo;
 * o que varia é se há leitura divulgável.
 */
export function sealWave(
  record: WaveLifecycleRecord,
  input: SealInput,
  ctx: TransitionContext,
): SealResult {
  if (!canTransition(record.status, "seal")) {
    return {
      ok: false,
      rejection: {
        reason: "illegal_transition",
        message: `Não é possível selar a partir de "${record.status}". Selar só é válido em "collecting".`,
      },
    };
  }

  const n = input.capsule.participantCount;
  const kMin = input.capsule.kAnonymityMin;

  let outcome: SealOutcome;
  let capsule: MeasurementContextCapsule | null;

  if (n <= 0) {
    outcome = "no_responses";
    capsule = null;
  } else if (n < kMin) {
    outcome = "insufficient_k_anon";
    capsule = null;
  } else {
    outcome = "sealed_publishable";
    capsule = buildMeasurementCapsule(input.capsule);
  }

  const event = buildEvent("seal", record.status, "sealed", ctx);
  return {
    ok: true,
    outcome,
    record: {
      ...record,
      status: "sealed",
      events: [...record.events, event],
      capsule,
      sealOutcome: outcome,
    },
  };
}

// ─── Fábrica e utilitários ─────────────────────────────────────────────────────

/** Cria um record novo em "draft" — o ponto de partida do ciclo de vida. */
export function createWaveRecord(waveId: string): WaveLifecycleRecord {
  return { waveId, status: "draft", events: [], capsule: null, sealOutcome: null };
}

/** Uma onda selada com capsule publicável está pronta para alimentar a FlorescerIA? */
export function isPublishable(record: WaveLifecycleRecord): boolean {
  return record.status !== "cancelled" && record.sealOutcome === "sealed_publishable" && record.capsule !== null;
}

function buildEvent(
  action: WaveLifecycleAction,
  fromStatus: WaveLifecycleStatus,
  toStatus: WaveLifecycleStatus,
  ctx: TransitionContext,
): WaveLifecycleEvent {
  return {
    action,
    fromStatus,
    toStatus,
    actorRole: ctx.actorRole,
    at: ctx.at,
    reason: ctx.reason ?? null,
  };
}
