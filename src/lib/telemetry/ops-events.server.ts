// Telemetria operacional mínima (P1-04) — emissor server-only.
// Ver migration 20260708130000_ops_events.sql para o desenho da tabela.
//
// TRÊS LEIS deste módulo:
// 1. NUNCA lança e NUNCA bloqueia: fire-and-forget com catch interno —
//    telemetria jamais derruba ou atrasa o fluxo que observa.
// 2. NUNCA grava dado sensível: o tipo OpsEventInput não tem campo para
//    resposta, token ou e-mail — se não há onde colocar, não vaza (privacidade
//    por schema, o mesmo princípio de CircleSession).
// 3. Whitelist de eventos: o union OpsEventName é o catálogo canônico do
//    P1-04 — evento fora da lista não compila.
//
// Demo: no-op silencioso (não há operação real para observar).

import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";

export type OpsEventName =
  | "response_submit_attempted"
  | "response_submit_accepted"
  | "response_submit_rejected"
  | "sector_response_accepted"
  | "sector_response_rejected"
  | "sector_link_created"
  | "wave_created"
  | "wave_closed"
  | "capsule_published"
  | "authorization_denied";

export interface OpsEventInput {
  orgId?: string;
  waveId?: string;
  /** Motivo curto (ex.: "below_k_anonymity") — nunca conteúdo. */
  reason?: string;
  /** Contexto mínimo adicional (contagens, instrumento) — nunca identidade. */
  context?: Record<string, string | number | boolean>;
}

/**
 * Emite um evento operacional. Fire-and-forget: retorna imediatamente; a
 * escrita acontece em background e qualquer falha vira um console.warn
 * (a falha da telemetria é a única que aceita ser só-log).
 */
export function emitOpsEvent(event: OpsEventName, input: OpsEventInput = {}): void {
  const boundary = readIdentityBoundaryStatus();
  if (boundary.state !== "cloud") return; // demo/blocked: nada real para observar

  void (async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const admin = supabaseAdmin as any;
      const { error } = await admin.from("ops_events").insert({
        event,
        org_id: input.orgId ?? null,
        wave_id: input.waveId ?? null,
        reason: input.reason ?? null,
        context: input.context ?? {},
      });
      if (error) console.warn("[ops-events] falha ao gravar evento", event, error.message);
    } catch (e) {
      console.warn("[ops-events] falha ao gravar evento", event, (e as Error).message);
    }
  })();
}

export interface OpsEventRow {
  event: string;
  waveId: string | null;
  reason: string | null;
  occurredAt: string;
}

/** Últimos eventos DA ORG (org já autorizada pela camada de cima via requireOrgAdmin). */
export async function listOpsEventsForOrg(orgId: string, limit = 20): Promise<OpsEventRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data } = await admin
    .from("ops_events")
    .select("event, wave_id, reason, occurred_at")
    .eq("org_id", orgId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    event: String(r.event),
    waveId: (r.wave_id as string | null) ?? null,
    reason: (r.reason as string | null) ?? null,
    occurredAt: String(r.occurred_at),
  }));
}
