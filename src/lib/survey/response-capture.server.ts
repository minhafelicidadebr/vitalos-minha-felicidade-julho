import {
  issueCaptureReceipt,
  validateBlindSubmission,
  type BlindSurveySubmission,
  type CaptureResult,
} from "@/engine/survey/response-capture-engine";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";
import { saveWaveResponse as saveWaveResponseReal } from "../cloud/db-adapter";
import type { SubmitResponseInput, SubmitResponseResult } from "../cloud/db-adapter";
import { dbInstrumentToSurveyKey } from "./instrument-mapping";
import { emitOpsEvent } from "../telemetry/ops-events.server";
import {
  assertHmlBackendBoundary,
  type HmlBackendBoundaryEnv,
} from "../fibt-hml/hml-backend-boundary.server";
import { assertInviteWithinAuthorizedHmlBatch } from "../fibt-hml/hml-contract";

export interface ServerCaptureInput extends BlindSurveySubmission {
  packId: string;
  // Em modo cloud, inviteToken vem da URL (/responder/:token).
  inviteToken?: string;
}

export interface CaptureSurveySubmissionDeps {
  moduleAccess?: (waveId: string) => Promise<boolean>;
  /**
   * Injeção de teste — nunca fornecida em produção. Ausente, usa a
   * implementação real de saveWaveResponse (db-adapter.ts), mesmo caminho
   * de sempre. Existe para que response-capture.server.test.ts passe um
   * fake diretamente, sem mock.module("@/lib/cloud/db-adapter", ...) — que
   * troca a resolução do especificador para TODO o processo `bun test` e já
   * contaminou wave-admin.server.ts (que importa createWaveWithAdmin do
   * mesmo módulo) em CI, quebrando wave-admin.server.test.ts inteiro com
   * "Export named 'createWaveWithAdmin' not found".
   */
  saveWaveResponse?: (input: SubmitResponseInput) => Promise<SubmitResponseResult>;
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
  deps: CaptureSurveySubmissionDeps = {},
): Promise<CaptureResult> {
  const saveWaveResponse = deps.saveWaveResponse ?? saveWaveResponseReal;
  const boundary = readIdentityBoundaryStatus();

  // Cloud mode sem token → recusa explícita (não silencia para demo).
  if (boundary.state === "cloud" && !input.inviteToken) {
    return { accepted: false, reason: "cloud_adapter_missing" };
  }

  if (boundary.state === "cloud" && input.inviteToken) {
    // FIBT-HML-1D (Fase 5): reexecutada no servidor, imediatamente antes de
    // qualquer query real — nunca confia em estado React, confirmação do
    // cliente, query string ou resultado anterior do loader. Mesmo que o
    // cliente burle toda a UI, a submissão HML falha aqui, antes de tocar o
    // banco, quando a fronteira não estiver atestada.
    const hmlBoundary = assertHmlBackendBoundary(process.env as HmlBackendBoundaryEnv);
    if (hmlBoundary.hmlDeclared && !hmlBoundary.attested) {
      logCloudRejection("hml_submission_backend_not_attested", { waveId: input.waveId });
      return { accepted: false, reason: "cloud_adapter_missing" };
    }

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
    // Fase 6: em modo HML atestado, a mesma checagem de vínculo ao lote
    // sintético roda de novo aqui — a resolução de tela (Fase 4) só cobre o
    // carregamento; a submissão é um caminho de servidor independente.
    const selectColumns = hmlBoundary.hmlDeclared
      ? "wave_id, expires_at, waves(instrument, label, organizations(slug)), wave_cohorts(key)"
      : "wave_id, waves(instrument)";
    const { data: inviteRow } = await admin
      .from("wave_invites")
      .select(selectColumns)
      .eq("token", input.inviteToken)
      .maybeSingle();

    const dbInstrument = (inviteRow?.waves as { instrument?: string } | null)?.instrument;
    if (!inviteRow || inviteRow.wave_id !== input.waveId || !dbInstrument) {
      logCloudRejection("unknown_wave", { waveId: input.waveId });
      return { accepted: false, reason: "unknown_wave" };
    }
    const allowed = await (deps.moduleAccess ?? (async waveId => {
      const { data } = await admin.from("waves").select("org_id").eq("id", waveId).maybeSingle();
      return !!data && (await (await import("@/lib/identity/module-access.server")).checkWave(data.org_id, waveId)).ok;
    }))(input.waveId);
    if (!allowed) return { accepted: false, reason: "unknown_wave" };

    if (hmlBoundary.hmlDeclared) {
      const waveJoin = inviteRow.waves as { organizations?: { slug?: string } | null; label?: string } | null;
      const cohortJoin = inviteRow.wave_cohorts as { key?: string } | null;
      const binding = assertInviteWithinAuthorizedHmlBatch({
        organizationSlug: waveJoin?.organizations?.slug,
        waveLabel: waveJoin?.label,
        cohortKey: cohortJoin?.key,
        expiresAt: inviteRow.expires_at as string | null,
      });
      if (!binding.ok) {
        logCloudRejection("hml_invite_outside_authorized_batch", { waveId: input.waveId });
        return { accepted: false, reason: "unknown_wave" };
      }
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
