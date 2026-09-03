import { FIBT_K_MIN } from "@/engine/fibt/fibt-engine";
import { HML_SECTOR_SMOKE } from "@/lib/fibt-hml/hml-contract";
import { listOpsEventsForOrg, type OpsEventRow } from "@/lib/telemetry/ops-events.server";
import { classifySectorLink, type SectorLinkState } from "@/lib/survey/sector-operations";
import { FIBT_PILOT_DISABLED_REASON, isFibtPilotEnabled } from "./fibt-pilot-flag";
import {
  buildFactorComparison,
  buildManagerAnalytics,
  type ManagerAggregateResponse,
  type ManagerAnalytics,
  type ManagerFactorComparison,
} from "./fibt-manager-control-center";

const MANAGER_TELEMETRY_EVENTS = new Set([
  "response_submit_attempted",
  "response_submit_accepted",
  "response_submit_rejected",
  "sector_response_accepted",
  "sector_response_rejected",
  "sector_link_created",
  "sector_link_revoked",
  "wave_closed",
]);

export interface FibtManagerWaveRow {
  id: string;
  orgId: string;
  organizationName: string;
  label: string;
  instrument: string;
  instrumentVersion: string | null;
  status: string;
  createdAt: string;
  closesAt: string | null;
}

export interface FibtManagerCohortRow {
  id: string;
  orgId: string;
  waveId: string;
  key: string;
  label: string;
}

export interface FibtManagerLinkRow {
  id: string;
  orgId: string;
  waveId: string;
  sectorKey: string;
  status: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface FibtManagerResponseRow extends ManagerAggregateResponse {
  cohortId: string | null;
}

export interface FibtManagerStore {
  findWave(orgId: string, waveId: string): Promise<FibtManagerWaveRow | null>;
  findCanonicalHmlWave(): Promise<FibtManagerWaveRow | null>;
  listCohorts(orgId: string, waveId: string): Promise<FibtManagerCohortRow[]>;
  listLinks(orgId: string, waveId: string): Promise<FibtManagerLinkRow[]>;
  listResponses(waveId: string): Promise<FibtManagerResponseRow[]>;
  listEvents(orgId: string): Promise<OpsEventRow[]>;
}

export interface FibtManagerLinkSummary {
  id: string;
  state: SectorLinkState;
  expiresAt: string;
  createdAt: string;
}

export interface FibtManagerSectorSummary {
  id: string;
  key: string;
  label: string;
  operationalState: "collecting" | "no_active_link" | "closed" | "error";
  participationState: ManagerAnalytics["state"];
  participationLabel: string;
  publicationEligible: boolean;
  analytics: ManagerAnalytics;
  links: FibtManagerLinkSummary[];
}

export interface FibtManagerSnapshot {
  campaign: {
    waveId: string;
    organizationName: string;
    label: string;
    instrument: "FIB_T";
    instrumentVersion: string;
    status: string;
    createdAt: string;
    closesAt: string | null;
    environment: "hml_staging" | "application";
    hmlAttested: boolean;
  };
  participation: {
    state: ManagerAnalytics["state"];
    countLabel: string;
    publishableCohorts: number;
    totalCohorts: number;
  };
  waveAnalytics: ManagerAnalytics;
  sectors: FibtManagerSectorSummary[];
  factorComparison: ManagerFactorComparison[];
  readiness: {
    state: "ready" | "attention" | "blocked";
    operational: boolean;
    blockers: string[];
    nextAction: string;
  };
  telemetry: OpsEventRow[];
  privacy: {
    kMin: number;
    individualResponsesExposed: false;
    rawTokensExposed: false;
  };
}

export type FibtManagerLoadOutcome =
  | { ok: true; snapshot: FibtManagerSnapshot }
  | { ok: false; category: "feature_gate" | "validation" | "backend"; error: string };

export interface FibtManagerServiceDeps {
  store?: FibtManagerStore;
  now?: () => Date;
  pilotEnabled?: () => boolean;
}

function createSupabaseStore(): FibtManagerStore {
  async function adminClient() {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Generated types lag the latest staging-only foreign keys.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabaseAdmin as any;
  }

  const mapWave = (row: Record<string, unknown>, organizationName: string): FibtManagerWaveRow => ({
    id: String(row.id),
    orgId: String(row.org_id),
    organizationName,
    label: String(row.label ?? "Onda FIB-T"),
    instrument: String(row.instrument),
    instrumentVersion: (row.instrument_version as string | null) ?? null,
    status: String(row.status),
    createdAt: String(row.created_at ?? ""),
    closesAt: (row.closes_at as string | null) ?? null,
  });

  return {
    async findWave(orgId, waveId) {
      const admin = await adminClient();
      const { data: wave, error } = await admin
        .from("waves")
        .select("id,org_id,label,instrument,instrument_version,status,created_at,closes_at")
        .eq("id", waveId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (error || !wave) return null;

      const { data: organization } = await admin
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .maybeSingle();
      return mapWave(wave as Record<string, unknown>, String(organization?.name ?? "Organização"));
    },

    async findCanonicalHmlWave() {
      const admin = await adminClient();
      const { data: organizations, error: orgError } = await admin
        .from("organizations")
        .select("id,name")
        .eq("name", HML_SECTOR_SMOKE.organizationName)
        .limit(2);
      if (orgError || organizations?.length !== 1) return null;

      const organization = organizations[0] as { id: string; name: string };
      const { data: waves, error: waveError } = await admin
        .from("waves")
        .select("id,org_id,label,instrument,instrument_version,status,created_at,closes_at")
        .eq("org_id", organization.id)
        .eq("label", HML_SECTOR_SMOKE.waveLabel)
        .eq("instrument", HML_SECTOR_SMOKE.instrument)
        .eq("instrument_version", HML_SECTOR_SMOKE.instrumentVersion)
        .limit(2);
      if (waveError || waves?.length !== 1) return null;
      return mapWave(waves[0] as Record<string, unknown>, organization.name);
    },

    async listCohorts(orgId, waveId) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("wave_cohorts")
        .select("id,org_id,wave_id,key,label")
        .eq("org_id", orgId)
        .eq("wave_id", waveId)
        .order("key");
      if (error) throw new Error("FIBT_MANAGER_COHORT_READ_FAILED");
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        orgId: String(row.org_id),
        waveId: String(row.wave_id),
        key: String(row.key),
        label: String(row.label),
      }));
    },

    async listLinks(orgId, waveId) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("sector_links")
        .select("id,org_id,wave_id,sector_label,status,expires_at,revoked_at,created_at")
        .eq("org_id", orgId)
        .eq("wave_id", waveId)
        .order("created_at", { ascending: false });
      if (error) throw new Error("FIBT_MANAGER_LINK_READ_FAILED");
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

    async listResponses(waveId) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("wave_responses")
        .select("cohort_id,instrument_version,answers")
        .eq("wave_id", waveId);
      if (error) throw new Error("FIBT_MANAGER_AGGREGATE_READ_FAILED");
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        cohortId: (row.cohort_id as string | null) ?? null,
        instrumentVersion: (row.instrument_version as string | null) ?? null,
        answers: (row.answers as Record<string, unknown>) ?? {},
      }));
    },

    listEvents: (orgId) => listOpsEventsForOrg(orgId, 30),
  };
}

function managerStore(deps: FibtManagerServiceDeps): FibtManagerStore {
  return deps.store ?? createSupabaseStore();
}

export async function resolveCanonicalHmlManagerWave(
  deps: FibtManagerServiceDeps = {},
): Promise<FibtManagerWaveRow | null> {
  return managerStore(deps).findCanonicalHmlWave();
}

export async function managerLinkBelongsToExpectedCohort(
  orgId: string,
  waveId: string,
  linkId: string,
  expectedCohortKeys: readonly string[],
  deps: FibtManagerServiceDeps = {},
): Promise<boolean> {
  try {
    const links = await managerStore(deps).listLinks(orgId, waveId);
    const matches = links.filter(
      (link) =>
        link.id === linkId &&
        link.orgId === orgId &&
        link.waveId === waveId &&
        expectedCohortKeys.includes(link.sectorKey),
    );
    return matches.length === 1;
  } catch {
    return false;
  }
}

function exactKeySet(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every((key) => actual.includes(key));
}

export async function loadFibtManagerControlCenterAsAdmin(
  orgId: string,
  waveId: string,
  options: {
    environment?: "hml_staging" | "application";
    hmlAttested?: boolean;
    expectedCohortKeys?: readonly string[];
  } = {},
  deps: FibtManagerServiceDeps = {},
): Promise<FibtManagerLoadOutcome> {
  if (!(deps.pilotEnabled ?? isFibtPilotEnabled)()) {
    return { ok: false, category: "feature_gate", error: FIBT_PILOT_DISABLED_REASON };
  }

  const store = managerStore(deps);
  const wave = await store.findWave(orgId, waveId);
  if (!wave || wave.instrument !== "FIB_T") {
    return {
      ok: false,
      category: "validation",
      error: "Onda FIB-T não encontrada nesta organização.",
    };
  }

  try {
    const [cohorts, links, events] = await Promise.all([
      store.listCohorts(orgId, waveId),
      store.listLinks(orgId, waveId),
      store.listEvents(orgId),
    ]);

    if (
      cohorts.some((cohort) => cohort.orgId !== orgId || cohort.waveId !== waveId) ||
      links.some((link) => link.orgId !== orgId || link.waveId !== waveId)
    ) {
      return {
        ok: false,
        category: "validation",
        error: "A fronteira de organização ou onda divergiu. A leitura foi bloqueada.",
      };
    }

    if (
      options.expectedCohortKeys &&
      !exactKeySet(
        cohorts.map((cohort) => cohort.key),
        options.expectedCohortKeys,
      )
    ) {
      return {
        ok: false,
        category: "validation",
        error: "As coortes da campanha sintética não correspondem ao contrato HML.",
      };
    }

    // Raw answers are read only after tenant, wave and optional HML cohort binding pass.
    const responses = await store.listResponses(waveId);
    const cohortIds = new Set(cohorts.map((cohort) => cohort.id));
    const scopeDrift = responses.some(
      (response) => !response.cohortId || !cohortIds.has(response.cohortId),
    );
    const now = (deps.now ?? (() => new Date()))();

    const sectors = cohorts.map((cohort): FibtManagerSectorSummary => {
      const cohortResponses = responses.filter((response) => response.cohortId === cohort.id);
      const analytics = buildManagerAnalytics(cohortResponses, wave.instrumentVersion);
      const cohortLinks = links
        .filter((link) => link.sectorKey === cohort.key)
        .map((link) => ({
          id: link.id,
          state: classifySectorLink(link, now),
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
        }));
      const activeLinks = cohortLinks.filter((link) => link.state === "active").length;

      return {
        id: cohort.id,
        key: cohort.key,
        label: cohort.label,
        operationalState:
          activeLinks > 1
            ? "error"
            : wave.status !== "collecting"
              ? "closed"
              : activeLinks === 1
                ? "collecting"
                : "no_active_link",
        participationState: analytics.state,
        participationLabel: analytics.countLabel,
        publicationEligible: analytics.state === "available",
        analytics,
        links: cohortLinks,
      };
    });

    const unboundLinks = links.filter(
      (link) => !cohorts.some((cohort) => cohort.key === link.sectorKey),
    );
    const blockers: string[] = [];
    if (cohorts.length === 0) blockers.push("Nenhum setor foi cadastrado para esta onda.");
    if (scopeDrift) blockers.push("Há respostas sem vínculo a uma coorte autorizada.");
    if (unboundLinks.length > 0) blockers.push("Ha link sem setor correspondente.");
    if (sectors.some((sector) => sector.operationalState === "error")) {
      blockers.push("Foi detectado mais de um link ativo para o mesmo setor.");
    }
    if (sectors.some((sector) => sector.analytics.state === "error")) {
      blockers.push("Um ou mais agregados falharam na validação metodológica.");
    }

    const waveAnalytics = scopeDrift
      ? ({
          state: "error",
          countLabel: "Indisponível",
          message: "A leitura agregada foi bloqueada por divergência de coorte.",
        } satisfies ManagerAnalytics)
      : buildManagerAnalytics(responses, wave.instrumentVersion);
    const publishableCohorts = sectors.filter((sector) => sector.publicationEligible).length;
    const missingLinks = sectors.filter((sector) => sector.operationalState === "no_active_link");
    const operational =
      wave.status === "collecting" &&
      cohorts.length > 0 &&
      blockers.length === 0 &&
      missingLinks.length === 0;
    const readinessState = blockers.length > 0 ? "blocked" : operational ? "ready" : "attention";

    let nextAction = "Revisar os resultados agregados ja publicaveis.";
    if (blockers.length > 0)
      nextAction = "Resolver o primeiro bloqueio operacional antes de prosseguir.";
    else if (wave.status !== "collecting")
      nextAction = "A onda esta fechada; revisar a leitura agregada final.";
    else if (missingLinks.length > 0) nextAction = `Emitir um link para ${missingLinks[0]!.label}.`;
    else if (publishableCohorts === 0) {
      nextAction = "Manter a coleta controlada e acompanhar o limiar de privacidade.";
    }

    return {
      ok: true,
      snapshot: {
        campaign: {
          waveId: wave.id,
          organizationName: wave.organizationName,
          label: wave.label,
          instrument: "FIB_T",
          instrumentVersion: wave.instrumentVersion ?? "não confirmada",
          status: wave.status,
          createdAt: wave.createdAt,
          closesAt: wave.closesAt,
          environment: options.environment ?? "application",
          hmlAttested: options.hmlAttested ?? false,
        },
        participation: {
          state: waveAnalytics.state,
          countLabel: waveAnalytics.countLabel,
          publishableCohorts,
          totalCohorts: sectors.length,
        },
        waveAnalytics,
        sectors,
        factorComparison: buildFactorComparison(sectors),
        readiness: {
          state: readinessState,
          operational,
          blockers,
          nextAction,
        },
        telemetry: events
          .filter((event) => event.waveId === waveId && MANAGER_TELEMETRY_EVENTS.has(event.event))
          .slice(0, 12)
          .map((event) => ({ ...event, reason: null })),
        privacy: {
          kMin: FIBT_K_MIN,
          individualResponsesExposed: false,
          rawTokensExposed: false,
        },
      },
    };
  } catch {
    return {
      ok: false,
      category: "backend",
      error: "Não foi possível carregar o centro de controle. Tente novamente.",
    };
  }
}
