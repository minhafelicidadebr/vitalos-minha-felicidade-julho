// Fronteira server-only para resolução de tokens de setor.
// Esta camada é o único lugar onde token → sector_id é resolvido.
// O cliente recebe somente o SectorAccessGrant (sem IDs internos).
//
// MODO CLOUD (fecha o followup P0-01 do S4): tabela real `sector_links`
// (token_hash SHA-256, nunca o token bruto; zero SELECT policy) + RPC
// `submit_sector_response` (SECURITY DEFINER, anon) — migration
// 20260708120000. Modalidade declarada: `shared_sector`, link MULTI-USO por
// setor; a resposta entra em wave_responses com invite_token NULL (anônima
// por schema) e passa pelo MESMO pipeline de agregação k-anon da onda.
// A validação de instrumento/itens/escala roda AQUI em TypeScript
// (validateBlindSubmission — a MESMA função pura do modo demo, zero
// duplicação de regra), ANTES de invocar a RPC (mesmo desenho do S3).
//
// MODO DEMO: getSectorLinkRecord() mock, valida e descarta (ephemeral_demo,
// declarado na UI). Agregado POR SETOR continua sendo v2 explícita (exigiria
// coluna de recorte em wave_responses + k-anon por recorte no aggregator).

import { createHash } from "node:crypto";
import {
  resolveSectorLink,
  type SectorAccessGrant,
  type SectorLinkAccessMode,
} from "@/engine/survey/sector-link-engine";
import type { CaptureResult } from "@/engine/survey/response-capture-engine";
import {
  issueCaptureReceipt,
  validateBlindSubmission,
  type BlindAnswer,
} from "@/engine/survey/response-capture-engine";
import { getSectorLinkRecord } from "@/mocks/sector-link-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { dbInstrumentToSurveyKey } from "./instrument-mapping";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";

/** SHA-256 hex do token bruto — a ÚNICA forma que toca o banco. */
export function hashSectorToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Resultado da resolução de um token — seguro para enviar ao cliente. */
export type SectorTokenResolution =
  | ({ valid: true } & SectorAccessGrant)
  | { valid: false; reason: "not_found" | "expired" | "revoked" | "rotated" };

/** Linha de sector_links + onda + pack da org, via service role (nunca via cliente). */
interface CloudLinkRow {
  wave_id: string;
  sector_label: string;
  access_mode: string;
  status: string;
  expires_at: string;
  waves: {
    instrument: string;
    status: string;
    label: string | null;
    created_at: string;
    closes_at: string | null;
    organizations: { pack_id: string | null } | null;
  } | null;
}

async function loadCloudLink(token: string): Promise<CloudLinkRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data } = await admin
    .from("sector_links")
    .select(
      "wave_id, sector_label, access_mode, status, expires_at, " +
        "waves(instrument, status, label, created_at, closes_at, organizations(pack_id))",
    )
    .eq("token_hash", hashSectorToken(token))
    .maybeSingle();
  return (data as CloudLinkRow | null) ?? null;
}

/**
 * Resolve um token opaco em dados de acesso seguros para o cliente.
 * Nunca retorna: sector_id, organization_id, token_hash ou qualquer ID interno.
 * `nowIso` é injetável para testes determinísticos.
 */
export async function resolveToken(
  token: string,
  nowIso = new Date().toISOString(),
): Promise<SectorTokenResolution> {
  const boundary = readIdentityBoundaryStatus();

  if (boundary.state === "cloud") {
    const row = await loadCloudLink(token);
    if (!row || !row.waves) return { valid: false, reason: "not_found" };
    if (row.status === "revoked") return { valid: false, reason: "revoked" };
    if (row.status !== "active") return { valid: false, reason: "not_found" };
    if (row.expires_at <= nowIso) return { valid: false, reason: "expired" };

    const instrumentShort = dbInstrumentToSurveyKey(row.waves.instrument);
    const packId = row.waves.organizations?.pack_id ?? "enterprise";
    const survey = getWaveSurvey(packId, instrumentShort);

    return {
      valid: true,
      sectorLabel: row.sector_label,
      campaignTitle: row.waves.label ?? instrumentShort,
      instrumentShort,
      opensAt: row.waves.created_at.slice(0, 10),
      closesAt: (row.waves.closes_at ?? row.expires_at).slice(0, 10),
      accessMode: (row.access_mode === "credential_mode"
        ? "credential_mode"
        : "shared_sector") as SectorLinkAccessMode,
      waveId: row.wave_id,
      surveyId: survey?.id ?? instrumentShort,
    };
  }

  if (boundary.state === "blocked") {
    return { valid: false, reason: "not_found" };
  }

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
 *
 * Demo:  valida e descarta (ephemeral_demo — declarado na UI, honesto por design).
 * Cloud: valida com a MESMA função pura e persiste via RPC atômica
 *        `submit_sector_response` (anônima por schema: invite_token NULL).
 */
export async function captureSectorLinkResponse(
  input: SectorLinkSubmitInput,
  nowIso = new Date().toISOString(),
): Promise<CaptureResult> {
  const boundary = readIdentityBoundaryStatus();

  if (boundary.state === "blocked") {
    return { accepted: false, reason: "cloud_adapter_missing" };
  }

  if (boundary.state === "cloud") {
    const row = await loadCloudLink(input.token);
    if (!row || !row.waves || row.status !== "active" || row.expires_at <= nowIso) {
      return { accepted: false, reason: "unknown_wave" };
    }

    // Instrumento REAL da onda + pack REAL da org — nunca presumidos (S3/S4).
    const instrumentShort = dbInstrumentToSurveyKey(row.waves.instrument);
    const packId = row.waves.organizations?.pack_id ?? "enterprise";
    const survey = getWaveSurvey(packId, instrumentShort);
    if (!survey) {
      return { accepted: false, reason: "unknown_survey" };
    }

    const submission = {
      submissionId: crypto.randomUUID(),
      waveId: row.wave_id,
      surveyId: survey.id,
      answers: input.answers,
    };

    // A mesma validação pura do modo demo — item inventado nunca chega ao banco.
    const validation = validateBlindSubmission(submission, survey);
    if (!validation.valid) {
      return { accepted: false, reason: validation.reason };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data, error } = await admin.rpc("submit_sector_response", {
      p_token_hash: hashSectorToken(input.token),
      p_answers: Object.fromEntries(input.answers.map((a) => [a.itemId, a.value])),
    });

    const outcome = (Array.isArray(data) ? data[0] : data) as
      | { accepted: boolean; reason: string | null }
      | null;
    if (error || !outcome?.accepted) {
      return { accepted: false, reason: "unknown_wave" };
    }

    return {
      accepted: true,
      receipt: issueCaptureReceipt(
        submission,
        survey,
        validation.itemCount,
        nowIso,
        "cloud_persisted",
      ),
    };
  }

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
