#!/usr/bin/env bun
/**
 * HML/STAGING ONLY: reconciles the two canonical sector-smoke cohorts.
 *
 * Dry-run is the default and opens no remote connection. A real mutation
 * requires --apply, the explicit confirmation flag and the shared staging
 * target guard. Rollback is separately gated and removes only unreferenced,
 * exact cohort rows. No command prints database IDs or credentials.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { HML_SECTOR_SMOKE } from "../../src/lib/fibt-hml/hml-contract";
import { forbiddenRefs, maskRef } from "../../src/lib/staging/staging-guard";

const CONFIRM_ENSURE = "--confirm-sector-smoke-cohorts";
const CONFIRM_ROLLBACK = "--confirm-sector-smoke-cohort-rollback";

export const SECTOR_SMOKE_COHORT_FIXTURE = {
  environment: "staging",
  organizationName: HML_SECTOR_SMOKE.organizationName,
  waveLabel: HML_SECTOR_SMOKE.waveLabel,
  instrument: HML_SECTOR_SMOKE.instrument,
  instrumentVersion: HML_SECTOR_SMOKE.instrumentVersion,
  waveStatus: "collecting",
  cohorts: HML_SECTOR_SMOKE.sectorLabels.map((key) => ({ key, label: key })),
} as const;

export class CohortFixtureError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CohortFixtureError";
  }
}

function fail(code: string, message: string): never {
  throw new CohortFixtureError(code, message);
}

export type FixtureOperation = "dry-run" | "guard-preflight" | "apply" | "rollback";

export interface FixtureArgs {
  environment: "staging";
  expectedProjectRef: string;
  operation: FixtureOperation;
}

const RECOGNIZED_FLAGS = new Set([
  "--environment",
  "--expected-project-ref",
  "--dry-run",
  "--guard-preflight",
  "--apply",
  "--rollback",
  CONFIRM_ENSURE,
  CONFIRM_ROLLBACK,
]);

export function parseFixtureArgs(
  argv: string[],
  env: Record<string, string | undefined> = process.env,
): FixtureArgs {
  const flags = new Map<string, string | true>();

  for (const raw of argv) {
    if (!raw.startsWith("--")) fail("UNEXPECTED_ARGUMENT", "only named flags are accepted");
    const separator = raw.indexOf("=");
    const name = separator === -1 ? raw : raw.slice(0, separator);
    const value = separator === -1 ? true : raw.slice(separator + 1);
    if (!RECOGNIZED_FLAGS.has(name)) fail("UNEXPECTED_ARGUMENT", `unrecognized flag: ${name}`);
    if (flags.has(name)) fail("DUPLICATE_ARGUMENT", `duplicate flag: ${name}`);
    flags.set(name, value);
  }

  const requiredValue = (name: string): string => {
    const value = flags.get(name);
    if (typeof value !== "string" || value.trim() === "") {
      fail("MISSING_ARGUMENT", `${name} requires a value`);
    }
    return value.trim();
  };

  const environment = requiredValue("--environment");
  if (environment !== "staging") {
    fail("PRODUCTION_DENIED", "--environment must be exactly staging");
  }

  const expectedProjectRef = requiredValue("--expected-project-ref");
  if (forbiddenRefs(env).has(expectedProjectRef)) {
    fail("PRODUCTION_DENIED", "the expected project ref is forbidden");
  }

  const authorizedStagingRef = env.FIBT_HML_AUTHORIZED_STAGING_REF?.trim();
  if (authorizedStagingRef && expectedProjectRef !== authorizedStagingRef) {
    fail("STAGING_REF_MISMATCH", "the expected project ref is not the authorized HML staging ref");
  }

  const apply = flags.get("--apply") === true;
  const rollback = flags.get("--rollback") === true;
  const dryRun = flags.get("--dry-run") === true;
  const guardPreflight = flags.get("--guard-preflight") === true;
  if ([apply, rollback, dryRun, guardPreflight].filter(Boolean).length > 1) {
    fail(
      "CONFLICTING_MODE",
      "--dry-run, --guard-preflight, --apply and --rollback are mutually exclusive",
    );
  }

  if (apply && flags.get(CONFIRM_ENSURE) !== true) {
    fail("APPLY_NOT_CONFIRMED", `${CONFIRM_ENSURE} is required with --apply`);
  }
  if (rollback && (flags.get(CONFIRM_ENSURE) !== true || flags.get(CONFIRM_ROLLBACK) !== true)) {
    fail(
      "ROLLBACK_NOT_CONFIRMED",
      `${CONFIRM_ENSURE} and ${CONFIRM_ROLLBACK} are required with --rollback`,
    );
  }
  if (!apply && !rollback && flags.has(CONFIRM_ENSURE)) {
    fail("UNEXPECTED_CONFIRMATION", `${CONFIRM_ENSURE} is accepted only with a mutation mode`);
  }
  if (!rollback && flags.has(CONFIRM_ROLLBACK)) {
    fail("UNEXPECTED_CONFIRMATION", `${CONFIRM_ROLLBACK} is accepted only with --rollback`);
  }

  return {
    environment: "staging",
    expectedProjectRef,
    operation: rollback
      ? "rollback"
      : apply
        ? "apply"
        : guardPreflight
          ? "guard-preflight"
          : "dry-run",
  };
}

export interface OrganizationRow {
  id: string;
  name: string;
}

export interface WaveRow {
  id: string;
  org_id: string;
  label: string;
  instrument: string;
  instrument_version: string;
  status: string;
}

export interface CohortRow {
  id: string;
  org_id: string;
  wave_id: string;
  key: string;
  label: string;
}

export interface CohortInsert {
  org_id: string;
  wave_id: string;
  key: string;
  label: string;
}

export interface ReferenceCounts {
  waveResponses: number;
  waveInvites: number;
}

export interface CohortFixtureStore {
  findOrganizationsByName(name: string): Promise<OrganizationRow[]>;
  findWavesByIdentity(identity: {
    label: string;
    instrument: string;
    instrumentVersion: string;
  }): Promise<WaveRow[]>;
  findCohorts(waveId: string, keys: readonly string[]): Promise<CohortRow[]>;
  findAllCohorts(waveId: string): Promise<CohortRow[]>;
  insertCohorts(rows: readonly CohortInsert[]): Promise<void>;
  countReferences(waveId: string, cohortIds: readonly string[]): Promise<ReferenceCounts>;
  deleteCohorts(waveId: string, cohortIds: readonly string[]): Promise<void>;
}

interface CanonicalContext {
  organization: OrganizationRow;
  wave: WaveRow;
}

async function resolveCanonicalContext(store: CohortFixtureStore): Promise<CanonicalContext> {
  const organizations = await store.findOrganizationsByName(
    SECTOR_SMOKE_COHORT_FIXTURE.organizationName,
  );
  if (organizations.length === 0) fail("ORGANIZATION_MISSING", "canonical organization is missing");
  if (organizations.length !== 1) {
    fail("ORGANIZATION_AMBIGUOUS", "canonical organization is ambiguous");
  }

  const waves = await store.findWavesByIdentity({
    label: SECTOR_SMOKE_COHORT_FIXTURE.waveLabel,
    instrument: SECTOR_SMOKE_COHORT_FIXTURE.instrument,
    instrumentVersion: SECTOR_SMOKE_COHORT_FIXTURE.instrumentVersion,
  });
  if (waves.length === 0) fail("WAVE_MISSING", "canonical wave is missing");
  if (waves.length !== 1) fail("WAVE_AMBIGUOUS", "canonical wave is ambiguous");

  const organization = organizations[0]!;
  const wave = waves[0]!;
  if (wave.org_id !== organization.id) {
    fail("WAVE_ORGANIZATION_MISMATCH", "canonical wave belongs to another organization");
  }
  if (wave.status !== SECTOR_SMOKE_COHORT_FIXTURE.waveStatus) {
    fail("WAVE_NOT_COLLECTING", "canonical wave is not collecting");
  }

  return { organization, wave };
}

function validateCohortRows(
  rows: readonly CohortRow[],
  context: CanonicalContext,
  requireAll: boolean,
): Map<string, CohortRow> {
  const validated = new Map<string, CohortRow>();

  for (const expected of SECTOR_SMOKE_COHORT_FIXTURE.cohorts) {
    const matches = rows.filter((row) => row.key === expected.key);
    if (matches.length > 1) fail("COHORT_AMBIGUOUS", `cohort ${expected.key} is ambiguous`);
    if (matches.length === 0) {
      if (requireAll) fail("COHORT_POSTCONDITION_FAILED", `cohort ${expected.key} is missing`);
      continue;
    }

    const row = matches[0]!;
    if (
      row.org_id !== context.organization.id ||
      row.wave_id !== context.wave.id ||
      row.label !== expected.label
    ) {
      fail("COHORT_CONFLICT", `cohort ${expected.key} conflicts with the canonical fixture`);
    }
    validated.set(expected.key, row);
  }

  return validated;
}

export interface EnsureFixtureOutcome {
  status: "RECONCILED";
  createdKeys: string[];
  preservedKeys: string[];
}

export async function ensureSectorSmokeCohorts(
  store: CohortFixtureStore,
): Promise<EnsureFixtureOutcome> {
  const context = await resolveCanonicalContext(store);
  const keys = SECTOR_SMOKE_COHORT_FIXTURE.cohorts.map((cohort) => cohort.key);
  const before = validateCohortRows(await store.findCohorts(context.wave.id, keys), context, false);
  const missing = SECTOR_SMOKE_COHORT_FIXTURE.cohorts.filter((cohort) => !before.has(cohort.key));

  if (missing.length > 0) {
    await store.insertCohorts(
      missing.map((cohort) => ({
        org_id: context.organization.id,
        wave_id: context.wave.id,
        key: cohort.key,
        label: cohort.label,
      })),
    );
  }

  const after = validateCohortRows(await store.findCohorts(context.wave.id, keys), context, true);
  if (after.size !== SECTOR_SMOKE_COHORT_FIXTURE.cohorts.length) {
    fail("COHORT_POSTCONDITION_FAILED", "canonical cohort cardinality is not exact");
  }

  return {
    status: "RECONCILED",
    createdKeys: missing.map((cohort) => cohort.key),
    preservedKeys: keys.filter((key) => before.has(key)),
  };
}

export interface ControlledApplyBaseline {
  testeIsgACount: 0;
  testeIsgBCount: 0;
  waveCohortCount: 0;
}

export interface ControlledApplyOutcome {
  status: "APPLIED";
  createdCount: 2;
  testeIsgACount: 1;
  testeIsgBCount: 1;
  waveCohortCount: 2;
  aWaveMatch: true;
  bWaveMatch: true;
  aKeyMatch: true;
  bKeyMatch: true;
  aLabelMatch: true;
  bLabelMatch: true;
  unexpectedSyntheticCohortsCreated: false;
}

/**
 * Campaign-specific APPLY gate. Unlike the reusable reconciler above, this
 * path accepts only the audited empty baseline and inserts A/B in one request.
 */
export async function applySectorSmokeCohortsFromEmptyBaseline(
  store: CohortFixtureStore,
  onBaselineValidated: (baseline: ControlledApplyBaseline) => void = () => undefined,
): Promise<ControlledApplyOutcome> {
  const context = await resolveCanonicalContext(store);
  const before = await store.findAllCohorts(context.wave.id);
  const keyA = SECTOR_SMOKE_COHORT_FIXTURE.cohorts[0].key;
  const keyB = SECTOR_SMOKE_COHORT_FIXTURE.cohorts[1].key;
  const testeIsgACount = before.filter((row) => row.key === keyA).length;
  const testeIsgBCount = before.filter((row) => row.key === keyB).length;

  if (testeIsgACount !== 0 || testeIsgBCount !== 0) {
    fail(
      "CONTROLLED_BASELINE_COUNT_MISMATCH",
      "controlled APPLY requires TESTE-ISG-A=0 and TESTE-ISG-B=0",
    );
  }
  if (before.length !== 0) {
    fail("CONTROLLED_WAVE_NOT_EMPTY", "controlled APPLY requires an empty canonical wave");
  }

  onBaselineValidated({ testeIsgACount: 0, testeIsgBCount: 0, waveCohortCount: 0 });

  await store.insertCohorts(
    SECTOR_SMOKE_COHORT_FIXTURE.cohorts.map((cohort) => ({
      org_id: context.organization.id,
      wave_id: context.wave.id,
      key: cohort.key,
      label: cohort.label,
    })),
  );

  const after = await store.findAllCohorts(context.wave.id);
  const validated = validateCohortRows(after, context, true);
  if (after.length !== 2 || validated.size !== 2) {
    fail("COHORT_POSTCONDITION_FAILED", "controlled APPLY did not produce exactly A and B");
  }

  return {
    status: "APPLIED",
    createdCount: 2,
    testeIsgACount: 1,
    testeIsgBCount: 1,
    waveCohortCount: 2,
    aWaveMatch: true,
    bWaveMatch: true,
    aKeyMatch: true,
    bKeyMatch: true,
    aLabelMatch: true,
    bLabelMatch: true,
    unexpectedSyntheticCohortsCreated: false,
  };
}

export interface RollbackFixtureOutcome {
  status: "ROLLED_BACK";
  removedCount: number;
}

export async function rollbackSectorSmokeCohorts(
  store: CohortFixtureStore,
): Promise<RollbackFixtureOutcome> {
  const context = await resolveCanonicalContext(store);
  const keys = SECTOR_SMOKE_COHORT_FIXTURE.cohorts.map((cohort) => cohort.key);
  const existing = validateCohortRows(
    await store.findCohorts(context.wave.id, keys),
    context,
    false,
  );
  const cohortIds = [...existing.values()].map((row) => row.id);

  if (cohortIds.length === 0) return { status: "ROLLED_BACK", removedCount: 0 };

  const references = await store.countReferences(context.wave.id, cohortIds);
  if (references.waveResponses > 0 || references.waveInvites > 0) {
    fail("COHORT_REFERENCED", "rollback denied because a canonical cohort is referenced");
  }

  await store.deleteCohorts(context.wave.id, cohortIds);

  const remaining = await store.findCohorts(context.wave.id, keys);
  if (remaining.length !== 0) {
    fail("ROLLBACK_POSTCONDITION_FAILED", "canonical cohort rows remain after rollback");
  }

  return { status: "ROLLED_BACK", removedCount: cohortIds.length };
}

function databaseOperationFailed(operation: string): never {
  fail("STAGING_DATABASE_OPERATION_FAILED", `staging database operation failed: ${operation}`);
}

export function createSupabaseFixtureStore(admin: SupabaseClient): CohortFixtureStore {
  return {
    async findOrganizationsByName(name) {
      const { data, error } = await admin.from("organizations").select("id,name").eq("name", name);
      if (error) databaseOperationFailed("read organizations");
      return (data ?? []) as OrganizationRow[];
    },

    async findWavesByIdentity(identity) {
      const { data, error } = await admin
        .from("waves")
        .select("id,org_id,label,instrument,instrument_version,status")
        .eq("label", identity.label)
        .eq("instrument", identity.instrument)
        .eq("instrument_version", identity.instrumentVersion);
      if (error) databaseOperationFailed("read waves");
      return (data ?? []) as WaveRow[];
    },

    async findCohorts(waveId, keys) {
      const { data, error } = await admin
        .from("wave_cohorts")
        .select("id,org_id,wave_id,key,label")
        .eq("wave_id", waveId)
        .in("key", [...keys]);
      if (error) databaseOperationFailed("read wave cohorts");
      return (data ?? []) as CohortRow[];
    },

    async findAllCohorts(waveId) {
      const { data, error } = await admin
        .from("wave_cohorts")
        .select("id,org_id,wave_id,key,label")
        .eq("wave_id", waveId);
      if (error) databaseOperationFailed("read all wave cohorts");
      return (data ?? []) as CohortRow[];
    },

    async insertCohorts(rows) {
      const { error } = await admin.from("wave_cohorts").insert([...rows]);
      if (error) databaseOperationFailed("insert wave cohorts");
    },

    async countReferences(waveId, cohortIds) {
      const responses = await admin
        .from("wave_responses")
        .select("id", { count: "exact", head: true })
        .eq("wave_id", waveId)
        .in("cohort_id", [...cohortIds]);
      if (responses.error) databaseOperationFailed("count wave response references");

      const invites = await admin
        .from("wave_invites")
        .select("id", { count: "exact", head: true })
        .eq("wave_id", waveId)
        .in("cohort_id", [...cohortIds]);
      if (invites.error) databaseOperationFailed("count wave invite references");

      return { waveResponses: responses.count ?? 0, waveInvites: invites.count ?? 0 };
    },

    async deleteCohorts(waveId, cohortIds) {
      const { data, error } = await admin
        .from("wave_cohorts")
        .delete()
        .eq("wave_id", waveId)
        .in("id", [...cohortIds])
        .select("id");
      if (error || (data?.length ?? 0) !== cohortIds.length) {
        databaseOperationFailed("delete unreferenced wave cohorts");
      }
    },
  };
}

if (import.meta.main) {
  try {
    const args = parseFixtureArgs(process.argv.slice(2));

    console.log("VITALOS_FIBT_SECTOR_SMOKE_COHORT_FIXTURE");
    console.log(`ENVIRONMENT=${args.environment}`);
    console.log(`OPERATION=${args.operation.toUpperCase()}`);
    console.log(`COHORT_KEYS=${SECTOR_SMOKE_COHORT_FIXTURE.cohorts.map((c) => c.key).join("|")}`);

    if (args.operation === "dry-run") {
      console.log("DRY_RUN=true");
      console.log("REMOTE_CONNECTION_OPENED=false");
      process.exit(0);
    }

    const { requireStagingTarget } = await import("../../src/lib/staging/staging-guard");
    const target = requireStagingTarget();
    if (target.projectRef !== args.expectedProjectRef) {
      fail(
        "STAGING_REF_MISMATCH",
        `resolved staging target ${target.maskedRef} differs from expected ${maskRef(args.expectedProjectRef)}`,
      );
    }

    if (args.operation === "guard-preflight") {
      console.log("DRY_RUN=true");
      console.log("STAGING_GUARD=PASS");
      console.log("TARGET_ENVIRONMENT=HML/STAGING");
      console.log("PRODUCTION_TARGET=false");
      console.log("REMOTE_CONNECTION_OPENED=false");
      process.exit(0);
    }

    console.log("STAGING_GUARD=PASS");
    console.log("TARGET_ENVIRONMENT=HML/STAGING");
    console.log("PRODUCTION_TARGET=false");

    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(target.url, target.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const store = createSupabaseFixtureStore(admin);

    if (args.operation === "apply") {
      const outcome = await applySectorSmokeCohortsFromEmptyBaseline(store, (baseline) => {
        console.log(`TESTE_ISG_A_COUNT_BEFORE=${baseline.testeIsgACount}`);
        console.log(`TESTE_ISG_B_COUNT_BEFORE=${baseline.testeIsgBCount}`);
        console.log(`WAVE_COHORT_COUNT_BEFORE=${baseline.waveCohortCount}`);
        console.log("CONTROLLED_BASELINE=PASS");
      });
      console.log(`FIXTURE_STATUS=${outcome.status}`);
      console.log(`CREATED_COUNT=${outcome.createdCount}`);
      console.log(`TESTE_ISG_A_COUNT=${outcome.testeIsgACount}`);
      console.log(`TESTE_ISG_B_COUNT=${outcome.testeIsgBCount}`);
      console.log(`WAVE_COHORT_COUNT=${outcome.waveCohortCount}`);
      console.log(`A_WAVE_MATCH=${outcome.aWaveMatch}`);
      console.log(`B_WAVE_MATCH=${outcome.bWaveMatch}`);
      console.log(`A_KEY_MATCH=${outcome.aKeyMatch}`);
      console.log(`B_KEY_MATCH=${outcome.bKeyMatch}`);
      console.log(`A_LABEL_MATCH=${outcome.aLabelMatch}`);
      console.log(`B_LABEL_MATCH=${outcome.bLabelMatch}`);
      console.log(
        `UNEXPECTED_SYNTHETIC_COHORTS_CREATED=${outcome.unexpectedSyntheticCohortsCreated}`,
      );
      console.log("FIXTURE_RESULT=PASS");
    } else {
      const outcome = await rollbackSectorSmokeCohorts(store);
      console.log(`FIXTURE_STATUS=${outcome.status}`);
      console.log(`REMOVED_COUNT=${outcome.removedCount}`);
    }
  } catch (error) {
    if (error instanceof CohortFixtureError) {
      console.error(`FIXTURE_ABORTED=${error.code}`);
      if (error.code === "COHORT_POSTCONDITION_FAILED") {
        console.error("FIXTURE_RESULT=STOP_POSTCONDITION_FAILED");
      }
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}
