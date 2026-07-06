// Fronteira server-only da Ata de Vitória selada (I-E2, §F4-like snapshot).
// Calcula o hash do payload NO SERVIDOR (mesmo padrão de esg-snapshot.server.ts
// — nunca confia em hash vindo do cliente) e grava via RPC INSERT-only
// (migration 20260706120000_victory_records.sql).
//
// Seguro apenas em .server.ts — não importar em código de cliente.

export interface VictoryRecordSummary {
  id: string;
  cycleKey: string;
  driverId: string;
  contentHash: string;
  issuedAt: string;
}

async function computeContentHash(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface SealVictoryResult {
  accepted: boolean;
  reason: string | null;
  recordId: string | null;
  contentHash: string | null;
}

export async function sealVictoryRecordAsAdmin(
  orgId: string,
  cycleKey: string,
  driverId: string,
  payload: unknown,
  issuedBy: string,
): Promise<SealVictoryResult> {
  const contentHash = await computeContentHash(payload);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data, error } = await admin.rpc("seal_victory_record", {
    p_org_id: orgId,
    p_cycle_key: cycleKey,
    p_driver_id: driverId,
    p_payload: payload,
    p_content_hash: contentHash,
    p_issued_by: issuedBy,
  });

  if (error) return { accepted: false, reason: "db_error", recordId: null, contentHash: null };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.accepted) {
    return { accepted: false, reason: row?.reason ?? "db_error", recordId: null, contentHash: null };
  }
  return { accepted: true, reason: null, recordId: row.record_id ?? null, contentHash };
}

export async function listVictoryRecordsForOrg(orgId: string): Promise<VictoryRecordSummary[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data } = await admin
    .from("victory_records")
    .select("id, cycle_key, driver_id, content_hash, issued_at")
    .eq("org_id", orgId)
    .order("issued_at", { ascending: false });

  return ((data ?? []) as Array<{
    id: string;
    cycle_key: string;
    driver_id: string;
    content_hash: string;
    issued_at: string;
  }>).map((r) => ({
    id: r.id,
    cycleKey: r.cycle_key,
    driverId: r.driver_id,
    contentHash: r.content_hash,
    issuedAt: r.issued_at,
  }));
}
