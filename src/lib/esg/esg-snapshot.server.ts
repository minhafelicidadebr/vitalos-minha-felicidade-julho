// Fronteira server-only do snapshot imutável do Dossiê ESG (I-E1 §F4).
// Calcula o hash do payload NO SERVIDOR (nunca confia em hash vindo do
// cliente — um hash auto-declarado não prova integridade de nada) e grava
// via RPC INSERT-only (migration 20260706100000_esg_report_snapshots.sql).
//
// Seguro apenas em .server.ts — não importar em código de cliente.

export interface EsgSnapshotSummary {
  id: string;
  year: number;
  contentHash: string;
  generatedAt: string;
}

async function computeContentHash(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface CreateEsgSnapshotResult {
  accepted: boolean;
  reason: string | null;
  snapshotId: string | null;
  contentHash: string | null;
}

export async function createEsgSnapshotAsAdmin(
  orgId: string,
  year: number,
  payload: unknown,
  generatedBy: string,
): Promise<CreateEsgSnapshotResult> {
  const contentHash = await computeContentHash(payload);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data, error } = await admin.rpc("create_esg_snapshot", {
    p_org_id: orgId,
    p_year: year,
    p_payload: payload,
    p_content_hash: contentHash,
    p_generated_by: generatedBy,
  });

  if (error) return { accepted: false, reason: "db_error", snapshotId: null, contentHash: null };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.accepted) {
    return { accepted: false, reason: row?.reason ?? "db_error", snapshotId: null, contentHash: null };
  }
  return { accepted: true, reason: null, snapshotId: row.snapshot_id ?? null, contentHash };
}

export async function listEsgSnapshotsForOrg(
  orgId: string,
  year?: number,
): Promise<EsgSnapshotSummary[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  let query = admin
    .from("esg_report_snapshots")
    .select("id, year, content_hash, generated_at")
    .eq("org_id", orgId)
    .order("generated_at", { ascending: false });

  if (year !== undefined) query = query.eq("year", year);

  const { data } = await query;
  return ((data ?? []) as Array<{ id: string; year: number; content_hash: string; generated_at: string }>).map(
    (r) => ({ id: r.id, year: r.year, contentHash: r.content_hash, generatedAt: r.generated_at }),
  );
}
