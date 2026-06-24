// Fronteira server-only para resolução de tokens de setor.
// Esta camada é o único lugar onde token → sector_id é resolvido.
// O cliente recebe somente o SectorAccessGrant (sem IDs internos).
//
// Em produção: substituir getSectorLinkRecord() pela RPC Supabase
// get_public_sector_survey_access(token). A interface permanece idêntica.

import {
  resolveSectorLink,
  type SectorAccessGrant,
} from "@/engine/survey/sector-link-engine";
import type { CaptureResult } from "@/engine/survey/response-capture-engine";
import {
  issueCaptureReceipt,
  validateBlindSubmission,
  type BlindAnswer,
} from "@/engine/survey/response-capture-engine";
import { getSectorLinkRecord } from "@/mocks/sector-link-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";

/** Resultado da resolução de um token — seguro para enviar ao cliente. */
export type SectorTokenResolution =
  | ({ valid: true } & SectorAccessGrant)
  | { valid: false; reason: "not_found" | "expired" | "revoked" | "rotated" };

/**
 * Resolve um token opaco em dados de acesso seguros para o cliente.
 * Nunca retorna: sector_id, organization_id, token_hash ou qualquer ID interno.
 * `nowIso` é injetável para testes determinísticos.
 */
export function resolveToken(
  token: string,
  nowIso = new Date().toISOString(),
): SectorTokenResolution {
  const record = getSectorLinkRecord(token);
  const resolution = resolveSectorLink(record?.link ?? null, nowIso);

  if (!resolution.valid) {
    return { valid: false, reason: resolution.reason ?? "not_found" };
  }

  if (!record) return { valid: false, reason: "not_found" };

  return {
    valid: true,
    sectorLabel: record.sectorLabel,
    campaignTitle: record.campaignTitle,
    instrumentShort: record.instrumentShort,
    opensAt: record.opensAt,
    closesAt: record.closesAt,
    meteAnchor: record.link.meteAnchor,
    accessMode: record.link.accessMode,
    waveId: record.waveId,
    surveyId: record.surveyId,
  };
}

/** Input de submissão anônima via sector link. */
export interface SectorLinkSubmitInput {
  token: string;
  answers: readonly BlindAnswer[];
  consentVersion: string;
}

/**
 * Captura uma resposta anônima de sector link.
 * O submissionId é gerado SERVER-SIDE (corrige a vulnerabilidade de correlação
 * que existia em responder.tsx onde era crypto.randomUUID() no cliente).
 * O conteúdo das respostas é validado e descartado (ephemeral_demo).
 */
export function captureSectorLinkResponse(
  input: SectorLinkSubmitInput,
  nowIso = new Date().toISOString(),
): CaptureResult {
  const record = getSectorLinkRecord(input.token);
  const resolution = resolveSectorLink(record?.link ?? null, nowIso);

  if (!resolution.valid || !record) {
    return { accepted: false, reason: "unknown_wave" };
  }

  const survey = getWaveSurvey(record.packId, record.instrumentShort);
  if (!survey) {
    return { accepted: false, reason: "unknown_survey" };
  }

  // submissionId SERVER-SIDE: nunca rastreável ao respondente (não vem do cliente)
  const submission = {
    submissionId: crypto.randomUUID(),
    waveId: record.waveId,
    surveyId: record.surveyId,
    answers: input.answers,
  };

  const validation = validateBlindSubmission(submission, survey);
  if (!validation.valid) {
    return { accepted: false, reason: validation.reason };
  }

  // Demo: valida e descarta — nenhuma resposta individual persiste
  return {
    accepted: true,
    receipt: issueCaptureReceipt(
      submission,
      survey,
      validation.itemCount,
      nowIso,
      "ephemeral_demo",
    ),
  };
}
