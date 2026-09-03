import { randomBytes } from "node:crypto";
import { emitOpsEvent } from "@/lib/telemetry/ops-events.server";
import { FIBT_PILOT_DISABLED_REASON, isFibtPilotEnabled } from "@/lib/fibt/fibt-pilot-flag";
import { hashSectorToken } from "./sector-link.server";
import {
  classifySectorLink,
  isValidSectorKey,
  normalizeSectorKey,
  protectSectorParticipation,
  type SectorLinkState,
} from "./sector-operations";

interface WaveRow {
  id: string;
  orgId: string;
  instrument: string;
  label: string | null;
  status: string;
}

interface CohortRow {
  id: string;
  orgId: string;
  waveId: string;
  key: string;
  label: string;
  createdAt: string;
}

interface LinkRow {
  id: string;
  orgId: string;
  waveId: string;
  sectorKey: string;
  status: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

type InsertResult = "created" | "conflict" | "failed";

export interface SectorOperationsStore {
  findWave(orgId: string, waveId: string): Promise<WaveRow | null>;
  listCohorts(orgId: string, waveId: string): Promise<CohortRow[]>;
  insertCohort(input: {
    orgId: string;
    waveId: string;
    key: string;
    label: string;
  }): Promise<InsertResult>;
  listLinks(orgId: string, waveId: string): Promise<LinkRow[]>;
  countResponses(waveId: string, cohortId: string): Promise<number>;
  insertLink(input: {
    orgId: string;
    waveId: string;
    sectorKey: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<InsertResult>;
  findLink(orgId: string, waveId: string, linkId: string): Promise<LinkRow | null>;
  revokeLink(orgId: string, waveId: string, linkId: string, revokedAt: string): Promise<boolean>;
}

export interface SectorLinkSummary {
  id: string;
  state: SectorLinkState;
  expiresAt: string;
  createdAt: string;
}

export interface SectorOperationalSummary {
  cohortId: string;
  key: string;
  label: string;
  reportable: boolean;
  responseCountLabel: string;
  links: SectorLinkSummary[];
}

export interface UnboundSectorLinkSummary extends SectorLinkSummary {
  sectorKey: string;
}

export type WaveSectorOperationsOutcome =
  | {
      ok: true;
      wave: Pick<WaveRow, "id" | "instrument" | "label" | "status">;
      sectors: SectorOperationalSummary[];
      unboundLinks: UnboundSectorLinkSummary[];
    }
  | { ok: false; error: string };

export interface SectorOperationsDeps {
  store?: SectorOperationsStore;
  now?: () => Date;
  tokenFactory?: () => string;
  emitEvent?: typeof emitOpsEvent;
  pilotEnabled?: () => boolean;
}

function pilotDisabled(deps: SectorOperationsDeps): string | null {
  return (deps.pilotEnabled ?? isFibtPilotEnabled)() ? null : FIBT_PILOT_DISABLED_REASON;
}

function createSupabaseStore(): SectorOperationsStore {
  async function adminClient() {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Generated schema types are not available in this repository yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabaseAdmin as any;
  }

  return {
    async findWave(orgId, waveId) {
      const admin = await adminClient();
      const { data } = await admin
        .from("waves")
        .select("id,org_id,instrument,label,status")
        .eq("id", waveId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!data) return null;
      return {
        id: String(data.id),
        orgId: String(data.org_id),
        instrument: String(data.instrument),
        label: (data.label as string | null) ?? null,
        status: String(data.status),
      };
    },

    async listCohorts(orgId, waveId) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("wave_cohorts")
        .select("id,org_id,wave_id,key,label,created_at")
        .eq("org_id", orgId)
        .eq("wave_id", waveId)
        .order("key");
      if (error) throw new Error("SECTOR_COHORT_READ_FAILED");
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        orgId: String(row.org_id),
        waveId: String(row.wave_id),
        key: String(row.key),
        label: String(row.label),
        createdAt: String(row.created_at),
      }));
    },

    async insertCohort(input) {
      const admin = await adminClient();
      const { error } = await admin.from("wave_cohorts").insert({
        org_id: input.orgId,
        wave_id: input.waveId,
        key: input.key,
        label: input.label,
      });
      if (!error) return "created";
      return error.code === "23505" ? "conflict" : "failed";
    },

    async listLinks(orgId, waveId) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("sector_links")
        .select("id,org_id,wave_id,sector_label,status,expires_at,revoked_at,created_at")
        .eq("org_id", orgId)
        .eq("wave_id", waveId)
        .order("created_at", { ascending: false });
      if (error) throw new Error("SECTOR_LINK_READ_FAILED");
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        orgId: String(row.org_id),
        waveId: String(row.wave_id),
        sectorKey: String(row.sector_label),
        status: String(row.status),
        expiresAt: String(row.expires_at),
        revokedAt: (row.revoked_at as string | null) ?? null,
        createdAt: String(row.created_at),
      }));
    },

    async countResponses(waveId, cohortId) {
      const admin = await adminClient();
      const { count, error } = await admin
        .from("wave_responses")
        .select("id", { count: "exact", head: true })
        .eq("wave_id", waveId)
        .eq("cohort_id", cohortId);
      if (error) throw new Error("SECTOR_RESPONSE_COUNT_FAILED");
      return count ?? 0;
    },

    async insertLink(input) {
      const admin = await adminClient();
      const { error } = await admin.from("sector_links").insert({
        org_id: input.orgId,
        wave_id: input.waveId,
        token_hash: input.tokenHash,
        sector_label: input.sectorKey,
        access_mode: "shared_sector",
        status: "active",
        expires_at: input.expiresAt,
      });
      if (!error) return "created";
      return error.code === "23505" ? "conflict" : "failed";
    },

    async findLink(orgId, waveId, linkId) {
      const links = await this.listLinks(orgId, waveId);
      return links.find((link) => link.id === linkId) ?? null;
    },

    async revokeLink(orgId, waveId, linkId, revokedAt) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("sector_links")
        .update({ status: "revoked", revoked_at: revokedAt })
        .eq("id", linkId)
        .eq("org_id", orgId)
        .eq("wave_id", waveId)
        .eq("status", "active")
        .select("id");
      return !error && (data?.length ?? 0) === 1;
    },
  };
}

function storeFrom(deps: SectorOperationsDeps): SectorOperationsStore {
  return deps.store ?? createSupabaseStore();
}

async function findCollectingWave(
  orgId: string,
  waveId: string,
  store: SectorOperationsStore,
): Promise<{ ok: true; wave: WaveRow } | { ok: false; error: string }> {
  const wave = await store.findWave(orgId, waveId);
  if (!wave) return { ok: false, error: "Onda nao encontrada nesta organizacao." };
  if (wave.status !== "collecting") {
    return { ok: false, error: "A onda nao esta aberta para coleta." };
  }
  return { ok: true, wave };
}

export async function listWaveSectorOperationsAsAdmin(
  orgId: string,
  waveId: string,
  deps: SectorOperationsDeps = {},
): Promise<WaveSectorOperationsOutcome> {
  const disabledReason = pilotDisabled(deps);
  if (disabledReason) return { ok: false, error: disabledReason };

  const store = storeFrom(deps);
  const wave = await store.findWave(orgId, waveId);
  if (!wave) return { ok: false, error: "Onda nao encontrada nesta organizacao." };

  try {
    const [cohorts, links] = await Promise.all([
      store.listCohorts(orgId, waveId),
      store.listLinks(orgId, waveId),
    ]);
    const now = (deps.now ?? (() => new Date()))();
    const cohortKeys = new Set(cohorts.map((cohort) => cohort.key));
    const sectors = await Promise.all(
      cohorts.map(async (cohort) => {
        const participation = protectSectorParticipation(
          await store.countResponses(waveId, cohort.id),
        );
        return {
          cohortId: cohort.id,
          key: cohort.key,
          label: cohort.label,
          reportable: participation.reportable,
          responseCountLabel: participation.countLabel,
          links: links
            .filter((link) => link.sectorKey === cohort.key)
            .map((link) => ({
              id: link.id,
              state: classifySectorLink(link, now),
              expiresAt: link.expiresAt,
              createdAt: link.createdAt,
            })),
        } satisfies SectorOperationalSummary;
      }),
    );

    return {
      ok: true,
      wave: {
        id: wave.id,
        instrument: wave.instrument,
        label: wave.label,
        status: wave.status,
      },
      sectors,
      unboundLinks: links
        .filter((link) => !cohortKeys.has(link.sectorKey))
        .map((link) => ({
          id: link.id,
          sectorKey: link.sectorKey,
          state: classifySectorLink(link, now),
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
        })),
    };
  } catch {
    return { ok: false, error: "Nao foi possivel carregar os setores desta onda." };
  }
}

export async function createWaveSectorAsAdmin(
  orgId: string,
  waveId: string,
  input: { key: string; label: string },
  deps: SectorOperationsDeps = {},
): Promise<{ created: true; key: string; label: string } | { created: false; error: string }> {
  const disabledReason = pilotDisabled(deps);
  if (disabledReason) return { created: false, error: disabledReason };

  const store = storeFrom(deps);
  const waveResult = await findCollectingWave(orgId, waveId, store);
  if (!waveResult.ok) return { created: false, error: waveResult.error };

  const label = input.label.trim();
  const key = normalizeSectorKey(input.key || label);
  if (label.length < 2 || label.length > 80) {
    return { created: false, error: "Informe um nome de setor entre 2 e 80 caracteres." };
  }
  if (!isValidSectorKey(key)) {
    return { created: false, error: "A chave do setor nao e valida." };
  }

  const result = await store.insertCohort({ orgId, waveId, key, label });
  if (result === "conflict") {
    return { created: false, error: "Ja existe um setor com esta chave na onda." };
  }
  if (result !== "created") {
    return { created: false, error: "Nao foi possivel cadastrar o setor." };
  }

  (deps.emitEvent ?? emitOpsEvent)("wave_cohort_created", { orgId, waveId });
  return { created: true, key, label };
}

export async function issueWaveSectorLinkAsAdmin(
  orgId: string,
  waveId: string,
  input: { cohortKey: string; expiresInDays?: number },
  deps: SectorOperationsDeps = {},
): Promise<
  | { created: true; token: string; expiresAt: string; sectorKey: string }
  | { created: false; error: string }
> {
  const disabledReason = pilotDisabled(deps);
  if (disabledReason) return { created: false, error: disabledReason };

  const store = storeFrom(deps);
  const waveResult = await findCollectingWave(orgId, waveId, store);
  if (!waveResult.ok) return { created: false, error: waveResult.error };

  const cohortKey = normalizeSectorKey(input.cohortKey);
  const cohorts = await store.listCohorts(orgId, waveId);
  const matches = cohorts.filter((cohort) => cohort.key === cohortKey);
  if (matches.length !== 1) {
    return { created: false, error: "Cadastre um unico setor valido antes de emitir o link." };
  }

  const links = await store.listLinks(orgId, waveId);
  if (links.some((link) => link.sectorKey === cohortKey && link.status === "active")) {
    return {
      created: false,
      error: "Este setor ja possui um link ativo. Revogue-o antes de emitir outro.",
    };
  }

  const expiresInDays = input.expiresInDays ?? 14;
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 90) {
    return { created: false, error: "A validade deve ficar entre 1 e 90 dias." };
  }

  const now = (deps.now ?? (() => new Date()))();
  const token = (deps.tokenFactory ?? (() => randomBytes(24).toString("hex")))();
  const expiresAt = new Date(now.getTime() + expiresInDays * 86_400_000).toISOString();
  const result = await store.insertLink({
    orgId,
    waveId,
    sectorKey: cohortKey,
    tokenHash: hashSectorToken(token),
    expiresAt,
  });
  if (result === "conflict") {
    return { created: false, error: "Este setor ja possui um link ativo." };
  }
  if (result !== "created") {
    return { created: false, error: "Nao foi possivel registrar o link." };
  }

  (deps.emitEvent ?? emitOpsEvent)("sector_link_created", { orgId, waveId });
  return { created: true, token, expiresAt, sectorKey: cohortKey };
}

export async function revokeWaveSectorLinkAsAdmin(
  orgId: string,
  waveId: string,
  linkId: string,
  deps: SectorOperationsDeps = {},
): Promise<{ revoked: true } | { revoked: false; error: string }> {
  const disabledReason = pilotDisabled(deps);
  if (disabledReason) return { revoked: false, error: disabledReason };

  const store = storeFrom(deps);
  const wave = await store.findWave(orgId, waveId);
  if (!wave) return { revoked: false, error: "Link nao encontrado nesta organizacao." };

  const link = await store.findLink(orgId, waveId, linkId);
  if (!link || link.status !== "active") {
    return { revoked: false, error: "Link ativo nao encontrado nesta onda." };
  }

  const revokedAt = (deps.now ?? (() => new Date()))().toISOString();
  const revoked = await store.revokeLink(orgId, waveId, linkId, revokedAt);
  if (!revoked) return { revoked: false, error: "Nao foi possivel revogar o link." };

  (deps.emitEvent ?? emitOpsEvent)("sector_link_revoked", { orgId, waveId });
  return { revoked: true };
}
