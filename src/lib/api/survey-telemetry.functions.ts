// Server functions da Lupa da Escuta (I-M7, Mensurar Vivo).
//
// AMBAS abertas de propósito — nem leitura nem escrita exigem sessão:
//   - loadSurveyFunnel: o dado já é k-anon-safe por construção (o engine
//     nunca expõe um corte com n < 5); é telemetria de PRODUTO cross-tenant,
//     não um dado de organização (mesmo modelo de confiança de /benchmark).
//   - recordSurveyFunnelSnapshot: o respondente de /convite/$token nunca tem
//     sessão — é o mesmo modelo de confiança de submitSurveyResponses.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loadSurveyFunnel, recordFunnelSnapshot } from "../survey/survey-telemetry.server";
import { isCloudReady } from "../cloud/supabase-client";
import type { SurveyTelemetryResult } from "@/engine/survey/survey-telemetry-engine";
import { isCapabilityEnabled } from "@/lib/capabilities/registry";

const packIdSchema = z.string().min(2).max(40);
const instrumentSchema = z.string().min(2).max(20);

export type LoadSurveyFunnelResult =
  | { cloudReady: false }
  | { cloudReady: true; funnel: SurveyTelemetryResult };

export const loadSurveyFunnelResult = createServerFn({ method: "GET" })
  .inputValidator(z.object({ packId: packIdSchema, instrument: instrumentSchema }))
  .handler(async ({ data }): Promise<LoadSurveyFunnelResult> => {
    if (!isCapabilityEnabled("SURVEY_TELEMETRY")) return { cloudReady: false };
    if (!isCloudReady()) return { cloudReady: false };
    const funnel = await loadSurveyFunnel(data.packId, data.instrument);
    return { cloudReady: true, funnel };
  });

const snapshotSchema = z.object({
  packId: packIdSchema,
  instrument: instrumentSchema,
  totalItems: z.number().int().min(1).max(200),
  completed: z.boolean(),
  elapsedMs: z.number().min(0).max(3_600_000),
  itemTimingsMs: z.record(z.string(), z.number().min(0).max(3_600_000)),
});

export const recordSurveyFunnelSnapshot = createServerFn({ method: "POST" })
  .inputValidator(snapshotSchema)
  .handler(async ({ data }) => {
    if (!isCapabilityEnabled("SURVEY_TELEMETRY")) return { accepted: false as const, reason: "capability_disabled" };
    if (!isCloudReady()) return { accepted: false as const, reason: "cloud_not_ready" };
    return recordFunnelSnapshot(data);
  });
