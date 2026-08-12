import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  applySectorSmokeCohortsFromEmptyBaseline,
  CohortFixtureError,
  ensureSectorSmokeCohorts,
  parseFixtureArgs,
  rollbackSectorSmokeCohorts,
  SECTOR_SMOKE_COHORT_FIXTURE,
  type CohortFixtureStore,
  type CohortInsert,
  type CohortRow,
  type OrganizationRow,
  type ReferenceCounts,
  type WaveRow,
} from "./ensure-sector-smoke-cohorts";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const WAVE_ID = "00000000-0000-0000-0000-000000000002";

function canonicalOrganization(overrides: Partial<OrganizationRow> = {}): OrganizationRow {
  return { id: ORG_ID, name: SECTOR_SMOKE_COHORT_FIXTURE.organizationName, ...overrides };
}

function canonicalWave(overrides: Partial<WaveRow> = {}): WaveRow {
  return {
    id: WAVE_ID,
    org_id: ORG_ID,
    label: SECTOR_SMOKE_COHORT_FIXTURE.waveLabel,
    instrument: SECTOR_SMOKE_COHORT_FIXTURE.instrument,
    instrument_version: SECTOR_SMOKE_COHORT_FIXTURE.instrumentVersion,
    status: SECTOR_SMOKE_COHORT_FIXTURE.waveStatus,
    ...overrides,
  };
}

function cohort(key: string, overrides: Partial<CohortRow> = {}): CohortRow {
  return {
    id: `cohort-${key}`,
    org_id: ORG_ID,
    wave_id: WAVE_ID,
    key,
    label: key,
    ...overrides,
  };
}

interface MemoryOptions {
  organizations?: OrganizationRow[];
  waves?: WaveRow[];
  cohorts?: CohortRow[];
  references?: ReferenceCounts;
}

function memoryStore(options: MemoryOptions = {}) {
  const state = {
    organizations: options.organizations ?? [canonicalOrganization()],
    waves: options.waves ?? [canonicalWave()],
    cohorts: [...(options.cohorts ?? [])],
    references: options.references ?? { waveResponses: 0, waveInvites: 0 },
    insertCalls: [] as CohortInsert[][],
    deleteCalls: [] as string[][],
    operationLog: [] as string[],
  };

  const store: CohortFixtureStore = {
    async findOrganizationsByName(name) {
      return state.organizations.filter((row) => row.name === name);
    },
    async findWavesByIdentity(identity) {
      return state.waves.filter(
        (row) =>
          row.label === identity.label &&
          row.instrument === identity.instrument &&
          row.instrument_version === identity.instrumentVersion,
      );
    },
    async findCohorts(waveId, keys) {
      return state.cohorts.filter((row) => row.wave_id === waveId && keys.includes(row.key));
    },
    async findAllCohorts(waveId) {
      state.operationLog.push("read-all-cohorts");
      return state.cohorts.filter((row) => row.wave_id === waveId);
    },
    async insertCohorts(rows) {
      state.operationLog.push("insert-cohorts");
      state.insertCalls.push([...rows]);
      state.cohorts.push(
        ...rows.map((row) => ({
          id: `created-${row.key}`,
          ...row,
        })),
      );
    },
    async countReferences() {
      return state.references;
    },
    async deleteCohorts(waveId, cohortIds) {
      state.deleteCalls.push([...cohortIds]);
      state.cohorts = state.cohorts.filter(
        (row) => row.wave_id !== waveId || !cohortIds.includes(row.id),
      );
    },
  };

  return { store, state };
}

async function expectFixtureError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error("expected fixture error");
  } catch (error) {
    expect(error).toBeInstanceOf(CohortFixtureError);
    expect((error as CohortFixtureError).code).toBe(code);
  }
}

describe("sector-smoke cohort fixture CLI guard", () => {
  const stagingEnv = {
    FORBIDDEN_PROJECT_REFS: "production-ref",
    FIBT_HML_AUTHORIZED_STAGING_REF: "staging-ref",
  };

  test("dry-run is the default and requires an exact staging declaration", () => {
    expect(
      parseFixtureArgs(["--environment=staging", "--expected-project-ref=staging-ref"], stagingEnv),
    ).toEqual({ environment: "staging", expectedProjectRef: "staging-ref", operation: "dry-run" });
  });

  test("production environment and production project ref are denied before I/O", () => {
    expect(() =>
      parseFixtureArgs(
        ["--environment=production", "--expected-project-ref=staging-ref"],
        stagingEnv,
      ),
    ).toThrow(/exactly staging/);
    expect(() =>
      parseFixtureArgs(
        ["--environment=staging", "--expected-project-ref=production-ref"],
        stagingEnv,
      ),
    ).toThrow(/forbidden/);
  });

  test("guard preflight validates staging and exits before the database client import", () => {
    expect(
      parseFixtureArgs(
        ["--environment=staging", "--expected-project-ref=staging-ref", "--guard-preflight"],
        stagingEnv,
      ),
    ).toEqual({
      environment: "staging",
      expectedProjectRef: "staging-ref",
      operation: "guard-preflight",
    });

    const source = readFileSync(
      fileURLToPath(new URL("./ensure-sector-smoke-cohorts.ts", import.meta.url)),
      "utf8",
    );
    const mainStart = source.indexOf("if (import.meta.main)");
    const dryRunExit = source.indexOf('args.operation === "dry-run"', mainStart);
    const stagingGuard = source.indexOf("requireStagingTarget()", mainStart);
    const preflightExit = source.indexOf('args.operation === "guard-preflight"', mainStart);
    const clientImport = source.indexOf('await import("@supabase/supabase-js")', mainStart);
    const controlledApply = source.indexOf(
      "applySectorSmokeCohortsFromEmptyBaseline(store",
      mainStart,
    );

    expect(dryRunExit).toBeGreaterThan(mainStart);
    expect(stagingGuard).toBeGreaterThan(dryRunExit);
    expect(preflightExit).toBeGreaterThan(mainStart);
    expect(clientImport).toBeGreaterThan(stagingGuard);
    expect(clientImport).toBeGreaterThan(preflightExit);
    expect(controlledApply).toBeGreaterThan(clientImport);
    expect(source.slice(dryRunExit, stagingGuard)).toContain("process.exit(0)");
    expect(source.slice(preflightExit, clientImport)).toContain("process.exit(0)");
  });

  test("APPLY and rollback modes require separate explicit confirmations", () => {
    expect(() =>
      parseFixtureArgs(
        ["--environment=staging", "--expected-project-ref=staging-ref", "--apply"],
        stagingEnv,
      ),
    ).toThrow(/confirm-sector-smoke-cohorts/);
    expect(
      parseFixtureArgs(
        [
          "--environment=staging",
          "--expected-project-ref=staging-ref",
          "--apply",
          "--confirm-sector-smoke-cohorts",
        ],
        stagingEnv,
      ),
    ).toEqual({ environment: "staging", expectedProjectRef: "staging-ref", operation: "apply" });
    expect(() =>
      parseFixtureArgs(
        [
          "--environment=staging",
          "--expected-project-ref=staging-ref",
          "--rollback",
          "--confirm-sector-smoke-cohorts",
        ],
        stagingEnv,
      ),
    ).toThrow(/confirm-sector-smoke-cohort-rollback/);
    expect(() =>
      parseFixtureArgs(
        [
          "--environment=staging",
          "--expected-project-ref=staging-ref",
          "--confirm-sector-smoke-cohorts",
        ],
        stagingEnv,
      ),
    ).toThrow(/accepted only with a mutation mode/);
  });
});

describe("controlled sector-smoke cohort APPLY", () => {
  test("0/0 permits one logical A/B mutation after the audited baseline", async () => {
    const { store, state } = memoryStore();
    const outcome = await applySectorSmokeCohortsFromEmptyBaseline(store, (baseline) => {
      state.operationLog.push("baseline-proven");
      expect(baseline).toEqual({ testeIsgACount: 0, testeIsgBCount: 0, waveCohortCount: 0 });
    });

    expect(state.operationLog).toEqual([
      "read-all-cohorts",
      "baseline-proven",
      "insert-cohorts",
      "read-all-cohorts",
    ]);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls[0]).toEqual([
      { org_id: ORG_ID, wave_id: WAVE_ID, key: "TESTE-ISG-A", label: "TESTE-ISG-A" },
      { org_id: ORG_ID, wave_id: WAVE_ID, key: "TESTE-ISG-B", label: "TESTE-ISG-B" },
    ]);
    expect(outcome).toEqual({
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
    });
  });

  test.each([
    ["1/0", [cohort("TESTE-ISG-A")]],
    ["0/1", [cohort("TESTE-ISG-B")]],
    ["1/1", [cohort("TESTE-ISG-A"), cohort("TESTE-ISG-B")]],
  ] as const)("%s aborts before mutation in controlled APPLY", async (_label, cohorts) => {
    const { store, state } = memoryStore({ cohorts: [...cohorts] });

    await expectFixtureError(
      applySectorSmokeCohortsFromEmptyBaseline(store),
      "CONTROLLED_BASELINE_COUNT_MISMATCH",
    );
    expect(state.insertCalls).toEqual([]);
    expect(state.operationLog).toEqual(["read-all-cohorts"]);
  });

  test("an unrelated wave cohort also aborts before mutation", async () => {
    const { store, state } = memoryStore({ cohorts: [cohort("UNEXPECTED")] });

    await expectFixtureError(
      applySectorSmokeCohortsFromEmptyBaseline(store),
      "CONTROLLED_WAVE_NOT_EMPTY",
    );
    expect(state.insertCalls).toEqual([]);
  });

  test("failed 1/1 postconditions are reported after the single insert", async () => {
    const { store, state } = memoryStore();
    store.insertCohorts = async (rows) => {
      state.operationLog.push("insert-cohorts");
      state.insertCalls.push([...rows]);
      state.cohorts.push(cohort("TESTE-ISG-A"));
    };

    await expectFixtureError(
      applySectorSmokeCohortsFromEmptyBaseline(store),
      "COHORT_POSTCONDITION_FAILED",
    );
    expect(state.insertCalls).toHaveLength(1);
  });
});

describe("sector-smoke cohort fixture reconciliation", () => {
  test("first execution creates exactly A and B with explicit canonical columns", async () => {
    const { store, state } = memoryStore();
    const outcome = await ensureSectorSmokeCohorts(store);

    expect(outcome.createdKeys).toEqual(["TESTE-ISG-A", "TESTE-ISG-B"]);
    expect(state.insertCalls).toEqual([
      [
        { org_id: ORG_ID, wave_id: WAVE_ID, key: "TESTE-ISG-A", label: "TESTE-ISG-A" },
        { org_id: ORG_ID, wave_id: WAVE_ID, key: "TESTE-ISG-B", label: "TESTE-ISG-B" },
      ],
    ]);
  });

  test("second execution is idempotent and preserves A and B", async () => {
    const { store, state } = memoryStore({
      cohorts: [cohort("TESTE-ISG-A"), cohort("TESTE-ISG-B")],
    });
    const outcome = await ensureSectorSmokeCohorts(store);

    expect(outcome.createdKeys).toEqual([]);
    expect(outcome.preservedKeys).toEqual(["TESTE-ISG-A", "TESTE-ISG-B"]);
    expect(state.insertCalls).toEqual([]);
  });

  test("one valid existing cohort is preserved and only the missing one is created", async () => {
    const { store, state } = memoryStore({ cohorts: [cohort("TESTE-ISG-A")] });
    const outcome = await ensureSectorSmokeCohorts(store);

    expect(outcome.createdKeys).toEqual(["TESTE-ISG-B"]);
    expect(outcome.preservedKeys).toEqual(["TESTE-ISG-A"]);
    expect(state.insertCalls[0]).toEqual([
      { org_id: ORG_ID, wave_id: WAVE_ID, key: "TESTE-ISG-B", label: "TESTE-ISG-B" },
    ]);
  });

  test("missing or ambiguous organization aborts before mutation", async () => {
    const missing = memoryStore({ organizations: [] });
    await expectFixtureError(ensureSectorSmokeCohorts(missing.store), "ORGANIZATION_MISSING");
    expect(missing.state.insertCalls).toEqual([]);

    const ambiguous = memoryStore({
      organizations: [canonicalOrganization(), canonicalOrganization({ id: "another-org" })],
    });
    await expectFixtureError(ensureSectorSmokeCohorts(ambiguous.store), "ORGANIZATION_AMBIGUOUS");
    expect(ambiguous.state.insertCalls).toEqual([]);
  });

  test("missing, ambiguous or wrong-organization wave aborts before mutation", async () => {
    const missing = memoryStore({ waves: [] });
    await expectFixtureError(ensureSectorSmokeCohorts(missing.store), "WAVE_MISSING");

    const ambiguous = memoryStore({
      waves: [canonicalWave(), canonicalWave({ id: "another-wave" })],
    });
    await expectFixtureError(ensureSectorSmokeCohorts(ambiguous.store), "WAVE_AMBIGUOUS");

    const wrongOrg = memoryStore({ waves: [canonicalWave({ org_id: "another-org" })] });
    await expectFixtureError(
      ensureSectorSmokeCohorts(wrongOrg.store),
      "WAVE_ORGANIZATION_MISMATCH",
    );

    expect(missing.state.insertCalls).toEqual([]);
    expect(ambiguous.state.insertCalls).toEqual([]);
    expect(wrongOrg.state.insertCalls).toEqual([]);
  });

  test("conflicting or duplicate cohort aborts instead of updating it", async () => {
    const conflicting = memoryStore({
      cohorts: [cohort("TESTE-ISG-A", { label: "unexpected" })],
    });
    await expectFixtureError(ensureSectorSmokeCohorts(conflicting.store), "COHORT_CONFLICT");
    expect(conflicting.state.insertCalls).toEqual([]);

    const duplicate = memoryStore({
      cohorts: [cohort("TESTE-ISG-A"), cohort("TESTE-ISG-A", { id: "duplicate" })],
    });
    await expectFixtureError(ensureSectorSmokeCohorts(duplicate.store), "COHORT_AMBIGUOUS");
    expect(duplicate.state.insertCalls).toEqual([]);
  });

  test("same keys outside the canonical wave are never read or altered", async () => {
    const outside = cohort("TESTE-ISG-A", {
      id: "outside-a",
      org_id: "outside-org",
      wave_id: "outside-wave",
    });
    const { store, state } = memoryStore({ cohorts: [outside] });
    await ensureSectorSmokeCohorts(store);

    expect(state.cohorts).toContainEqual(outside);
    expect(state.cohorts.filter((row) => row.wave_id === WAVE_ID)).toHaveLength(2);
  });
});

describe("sector-smoke cohort fixture rollback", () => {
  test("removes only exact unreferenced A/B rows", async () => {
    const outside = cohort("TESTE-ISG-A", {
      id: "outside-a",
      org_id: "outside-org",
      wave_id: "outside-wave",
    });
    const { store, state } = memoryStore({
      cohorts: [cohort("TESTE-ISG-A"), cohort("TESTE-ISG-B"), outside],
    });
    const outcome = await rollbackSectorSmokeCohorts(store);

    expect(outcome.removedCount).toBe(2);
    expect(state.cohorts).toEqual([outside]);
    expect(state.deleteCalls).toHaveLength(1);
  });

  test("aborts without delete when a response or invite references a cohort", async () => {
    for (const references of [
      { waveResponses: 1, waveInvites: 0 },
      { waveResponses: 0, waveInvites: 1 },
    ]) {
      const { store, state } = memoryStore({
        cohorts: [cohort("TESTE-ISG-A"), cohort("TESTE-ISG-B")],
        references,
      });
      await expectFixtureError(rollbackSectorSmokeCohorts(store), "COHORT_REFERENCED");
      expect(state.deleteCalls).toEqual([]);
    }
  });
});
