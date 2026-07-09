// Server-only: captura real de leads da landing pública (S7, fecha P1-05).
// Fronteira pública — chamada por visitante ANÔNIMO, sem sessão. Não confiar
// em nenhum campo do payload além do que o próprio formulário pergunta;
// nada de orgId/userId aqui, porque não existe sessão para forjar.
//
// Demo: valida e descarta (mesmo idioma honesto de "esta é uma demonstração"
// já usado no modal). Cloud: valida (MESMO validador puro) e persiste.

import {
  validateLeadSubmission,
  type LeadSubmission,
} from "@/engine/growth/lead-capture-engine";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";
import { emitOpsEvent } from "../telemetry/ops-events.server";

export type SubmitLeadReason =
  | "accepted"
  | "invalid_request"
  | "missing_consent"
  | "invalid_email"
  | "field_too_long"
  | "cloud_adapter_missing";

export interface SubmitLeadResult {
  accepted: boolean;
  reason: SubmitLeadReason;
  /** true só em modo cloud — a UI usa isso para nunca prometer "enviado" sem ter enviado. */
  persisted: boolean;
}

export interface LeadUtm {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
}

export async function submitLead(
  submission: LeadSubmission,
  utm: LeadUtm,
): Promise<SubmitLeadResult> {
  const validation = validateLeadSubmission(submission);
  if (validation.reason !== "ok") {
    emitOpsEvent("lead_rejected", { reason: validation.reason });
    return { accepted: false, reason: validation.reason, persisted: false };
  }

  const boundary = readIdentityBoundaryStatus();

  if (boundary.state === "blocked") {
    return { accepted: false, reason: "cloud_adapter_missing", persisted: false };
  }

  if (boundary.state === "demo") {
    // Mesma honestidade do modal: valida de ponta a ponta, mas não persiste.
    return { accepted: true, reason: "accepted", persisted: false };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { error } = await admin.from("leads").insert({
    name: submission.name.trim(),
    company: submission.company.trim(),
    role: submission.role.trim() || null,
    email: submission.email.trim().toLowerCase(),
    whatsapp: submission.whatsapp.trim() || null,
    interest: submission.interest,
    source_page: submission.sourcePage,
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
    utm_term: utm.term,
    utm_content: utm.content,
    consent: submission.consent,
    consent_version: submission.consentVersion,
  });

  if (error) {
    emitOpsEvent("lead_rejected", { reason: "db_error" });
    return { accepted: false, reason: "cloud_adapter_missing", persisted: false };
  }

  emitOpsEvent("lead_submitted", {
    reason: submission.interest,
    context: { sourcePage: submission.sourcePage, utmSource: utm.source ?? "direct" },
  });
  return { accepted: true, reason: "accepted", persisted: true };
}

export interface LeadRow {
  id: string;
  name: string;
  company: string;
  role: string | null;
  email: string;
  whatsapp: string | null;
  interest: string;
  sourcePage: string;
  utmSource: string | null;
  utmCampaign: string | null;
  createdAt: string;
}

/** Últimos leads — chamador já autorizado (verifyPlatformAdmin) antes de chegar aqui. */
export async function listLeads(limit = 50): Promise<LeadRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data } = await admin
    .from("leads")
    .select("id, name, company, role, email, whatsapp, interest, source_page, utm_source, utm_campaign, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    company: String(r.company),
    role: (r.role as string | null) ?? null,
    email: String(r.email),
    whatsapp: (r.whatsapp as string | null) ?? null,
    interest: String(r.interest),
    sourcePage: String(r.source_page),
    utmSource: (r.utm_source as string | null) ?? null,
    utmCampaign: (r.utm_campaign as string | null) ?? null,
    createdAt: String(r.created_at),
  }));
}
