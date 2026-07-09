import {
  issueCaptureReceipt,
  validateBlindSubmission,
  type BlindSurveySubmission,
  type CaptureResult,
} from "@/engine/survey/response-capture-engine";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";
import { saveWaveResponse } from "../cloud/db-adapter";
import { dbInstrumentToSurveyKey } from "./instrument-mapping";
import { emitOpsEvent } from "../telemetry/ops-events.server";

export interface ServerCaptureInput extends BlindSurveySubmission {
  packId: string;
  // Em modo cloud, inviteToken vem da URL (/responder/:token).
  inviteToken?: string;
}

// Trilha de observabilidade (P1-04): além do log estruturado, cada recusa
// cloud vira um evento em ops_events (fire-and-forget — nunca bloqueia nem
// derruba a submissão). O evento carrega só motivo + waveId, nunca conteúdo.
function logCloudRejection(reason: string, context: { waveId?: string; surveyId?: string }): void {
  console.warn("[response-capture] submissão cloud rejeitada", { reason, ...context });
  emitOpsEvent("response_submit_rejected", { waveId: context.waveId, reason });
}

/**
 * Server-only capture boundary.
 * Demo:  valida e descarta (ephemeral_demo — sem persistência, por design).
 * Cloud: valida (MESMO validador puro do demo) e persiste via RPC atômica
 *        (k-anon garantido pelo banco + RLS; atomicidade e vínculo
 *        token↔onda garantidos por submit_wave_response, ver db-adapter.ts).
 */
export async function captureSurveySubmission(
  input: ServerCaptureInput,
  acceptedAt = new Date().toISOString(),
): Promise<CaptureResult> {
  const boundary = readIdentityBoundaryStatus();

  // Cloud mode sem token → recusa explícita (não silencia para demo).
  if (boundary.state === "cloud" && !input.inviteToken) {
    return { accepted: false, reason: "cloud_adapter_missing" };
  }

  if (boundary.state === "cloud" && input.inviteToken) {
    emitOpsEvent("response_submit_attempted", { waveId: input.waveId });
    // ── Modo real: valida e persiste no Supabase ──────────────────────────
    // Resolve o instrumento REAL da onda NO MOMENTO DO ENVIO — nunca assume
    // um instrumento fixo. A resolução feita quando a tela carregou
    // (resolveInviteToken) é só UX: entre o carregamento e o clique em
    // enviar, o token pode ter sido consumido em outra aba ou a onda pode
    // ter sido selada. Refazer a resolução aqui é o que torna esta
    // checagem AUTORITATIVA (P0-07).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: inviteRow } = await admin
      .from("wave_invites")
      .select("wave_id, waves(instrument)")
      .eq("token", input.inviteToken)
      .maybeSingle();

    const dbInstrument = (inviteRow?.waves as { instrument?: string } | null)?.instrument;
    if (!inviteRow || inviteRow.wave_id !== input.waveId || !dbInstrument) {
      logCloudRejection("unknown_wave", { waveId: input.waveId });
      return { accepted: false, reason: "unknown_wave" };
    }

    const survey = getWaveSurvey(input.packId, dbInstrumentToSurveyKey(dbInstrument));
    if (!survey || survey.id !== input.surveyId) {
      logCloudRejection("unknown_survey", { waveId: input.waveId, surveyId: input.surveyId });
      return { accepted: false, reason: "unknown_survey" };
    }

    // MESMA validação pura do caminho demo — zero duplicação de regra entre
    // os dois modos (o risco que este sprint precisava eliminar).
    const validation = validateBlindSubmission(input, survey);
    if (!validation.valid) {
      logCloudRejection(validation.reason, { waveId: input.waveId });
      return { accepted: false, reason: validation.reason };
    }

    const answersMap: Record<string, number> = {};
    for (const a of validation.normalizedAnswers) answersMap[a.itemId] = a.value as number;

    const result = await saveWaveResponse({
      waveId: input.waveId,
      inviteToken: input.inviteToken,
      answers: answersMap,
    });

    if (!result.accepted) {
      logCloudRejection(result.reason ?? "db_error", { waveId: input.waveId });
      const reason =
        result.reason === "wave_not_open" || result.reason === "already_used"
          ? result.reason
          : "cloud_adapter_missing";
      return { accepted: false, reason };
    }

    emitOpsEvent("response_submit_accepted", { waveId: input.waveId });
    return {
      accepted: true,
      receipt: issueCaptureReceipt(
        input,
        survey,
        validation.itemCount,
        acceptedAt,
        "cloud_persisted",
      ),
    };
  }

  // ── Modo demo: valida e descarta (ephemeral_demo) ─────────────────────────
  if (boundary.state === "blocked") {
    return { accepted: false, reason: "cloud_adapter_missing" };
  }

  const wave = getActiveWave(input.packId);
  if (wave.id !== input.waveId) {
    return { accepted: false, reason: "unknown_wave" };
  }

  const survey = getWaveSurvey(input.packId, wave.instrumentShort);
  if (!survey || survey.id !== input.surveyId) {
    return { accepted: false, reason: "unknown_survey" };
  }

  const validation = validateBlindSubmission(input, survey);
  if (!validation.valid) {
    return { accepted: false, reason: validation.reason };
  }

  return {
    accepted: true,
    receipt: issueCaptureReceipt(input, survey, validation.itemCount, acceptedAt, "ephemeral_demo"),
  };
}
