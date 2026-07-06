// Fronteira server-only do Cofre de Ciclos (I-P1, S6.75). Resolve o histórico
// REAL de uma organização — capsules seladas (S4) que um humano registrou como
// ciclo da série (migration 20260705130000_org_cycle_registry.sql) — e devolve
// o MESMO tipo que capsule-history-mock.ts entrega hoje
// (MeasurementContextCapsule[]), para que cycle-proof.server.ts
// (buildCycleProofFromHistory) funcione idêntico em cima de dado real ou mock.
//
// Nenhuma função aqui aceita orgId do cliente para fins de autorização — quem
// chama por trás (.functions.ts) sempre resolve a org real via
// resolveOrgMembership/requireOrgAdmin(accessToken), nunca do payload.
//
// Labels de dimensão vêm de NR1_CROSSWALK.dimensions — o mesmo registro
// canônico já usado pelo pipeline real de exposição (exposure-derivation) e
// pela Reavaliação NR-1 — nunca inventadas aqui.
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import { buildRegisteredHistory, type DimensionMeta, type RegisteredCycleRow } from "@/engine/evolucao/cycle-history-engine";
import type { MeasurementContextCapsule } from "@/engine/ai/measurement-capsule-engine";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";

export const K_ANONYMITY_MIN = 5;

// Único instrumento de Domínio B hoje no pipeline real (ver capsule-aggregator.server.ts
// OUTCOME_PILLARS / COPSOQ_POLARITIES) — os demais (PERMA, VIA_T) são Domínio A.
function domainForInstrument(instrument: string): "A" | "B" {
  return instrument === "COPSOQ" ? "B" : "A";
}

function dimensionMetaFor(instrument: string): DimensionMeta[] {
  const key = instrument === "COPSOQ" ? "copsoq" : null;
  if (!key) return [];
  return NR1_CROSSWALK.dimensions
    .filter((d) => d.instrument === key)
    .map((d) => ({ id: d.id, label: d.label, isOutcome: d.isOutcome ?? false }));
}

interface WaveCapsuleRow {
  id: string;
  wave_id: string;
  instrument: string;
  participant_count: number;
  closed_on: string | null;
  dimensions: Record<string, { mean: number; high_risk_pct: number; n: number }>;
  outcomes: Record<string, { mean: number; high_risk_pct: number; n: number }> | null;
}

interface RegistryRow {
  cycle_key: string;
  capsule_id: string;
  wave_capsules: WaveCapsuleRow | WaveCapsuleRow[] | null;
}

function normalizeCapsuleJoin(row: RegistryRow): WaveCapsuleRow | null {
  const raw = row.wave_capsules;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

/** Histórico REAL registrado de uma org+instrumento — [] se nada foi registrado ainda. */
export async function loadOrgCycleHistory(
  orgId: string,
  instrument: string,
): Promise<MeasurementContextCapsule[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: org } = await admin.from("organizations").select("pack_id").eq("id", orgId).maybeSingle();
  const packId = (org?.pack_id as string | undefined) ?? "enterprise";

  const { data } = await admin
    .from("org_cycle_registry")
    .select(
      "cycle_key, capsule_id, wave_capsules(id, wave_id, instrument, participant_count, closed_on, dimensions, outcomes)",
    )
    .eq("org_id", orgId)
    .eq("instrument", instrument);

  const rows: RegisteredCycleRow[] = ((data ?? []) as RegistryRow[])
    .map((r) => {
      const capsule = normalizeCapsuleJoin(r);
      if (!capsule) return null;
      const row: RegisteredCycleRow = {
        cycleKey: r.cycle_key,
        capsuleId: r.capsule_id,
        waveId: capsule.wave_id,
        instrument: capsule.instrument,
        domain: domainForInstrument(capsule.instrument),
        closedOn: capsule.closed_on ?? new Date().toISOString().slice(0, 10),
        participantCount: capsule.participant_count,
        kAnonymityMin: K_ANONYMITY_MIN,
        dimensions: capsule.dimensions ?? {},
        outcomes: capsule.outcomes,
      };
      return row;
    })
    .filter((r): r is RegisteredCycleRow => r !== null);

  return buildRegisteredHistory(rows, dimensionMetaFor(instrument), packId);
}

// ─── Cápsulas seladas elegíveis para registro (para a UI de admin) ──────────

export interface RegisterableCapsule {
  capsuleId: string;
  waveId: string;
  closedOn: string;
  participantCount: number;
  /** cycle_key já usado para esta cápsula, se já registrada. */
  alreadyRegisteredAs: string | null;
}

/** Cápsulas de ondas SELADAS desta org+instrumento — só estas podem virar ciclo. */
export async function listRegisterableCapsulesForOrg(
  orgId: string,
  instrument: string,
): Promise<RegisterableCapsule[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: capsules } = await admin
    .from("wave_capsules")
    .select("id, wave_id, participant_count, closed_on, waves!inner(status)")
    .eq("org_id", orgId)
    .eq("instrument", instrument)
    .eq("waves.status", "sealed")
    .order("closed_on", { ascending: false });

  const { data: registered } = await admin
    .from("org_cycle_registry")
    .select("capsule_id, cycle_key")
    .eq("org_id", orgId)
    .eq("instrument", instrument);

  const registeredByCapsuleId = new Map(
    ((registered ?? []) as Array<{ capsule_id: string; cycle_key: string }>).map((r) => [
      r.capsule_id,
      r.cycle_key,
    ]),
  );

  return ((capsules ?? []) as Array<{
    id: string;
    wave_id: string;
    participant_count: number;
    closed_on: string | null;
  }>).map((c) => ({
    capsuleId: c.id,
    waveId: c.wave_id,
    closedOn: c.closed_on ?? "—",
    participantCount: c.participant_count,
    alreadyRegisteredAs: registeredByCapsuleId.get(c.id) ?? null,
  }));
}

// ─── Registrar um capsule como ciclo ─────────────────────────────────────────

export interface RegisterCycleResult {
  accepted: boolean;
  reason: string | null;
  registryId: string | null;
}

export async function registerOrgCycleAsAdmin(
  orgId: string,
  instrument: string,
  cycleKey: string,
  capsuleId: string,
  registeredBy: string,
): Promise<RegisterCycleResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data, error } = await admin.rpc("register_org_cycle", {
    p_org_id: orgId,
    p_instrument: instrument,
    p_cycle_key: cycleKey,
    p_capsule_id: capsuleId,
    p_registered_by: registeredBy,
  });

  if (error) return { accepted: false, reason: "db_error", registryId: null };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.accepted) return { accepted: false, reason: row?.reason ?? "db_error", registryId: null };
  return { accepted: true, reason: null, registryId: row.registry_id ?? null };
}
