import { describe, expect, test } from "bun:test";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import {
  loadFibtManagerControlCenterAsAdmin,
  type FibtManagerStore,
} from "./fibt-manager-control-center.server";

const manifest = getFibtManifest();
const NOW = new Date("2026-08-12T15:00:00.000Z");
const completeAnswers = Object.fromEntries(manifest.items.map((item) => [item.id, 3]));

function fakeStore(overrides: Partial<FibtManagerStore> = {}): FibtManagerStore {
  return {
    findWave: async (orgId, waveId) =>
      orgId === "org-a" && waveId === "wave-a"
        ? {
            id: "wave-a",
            orgId: "org-a",
            organizationName: "ISG Sintetica",
            label: "Piloto controlado",
            instrument: "FIB_T",
            instrumentVersion: manifest.instrument_version,
            status: "collecting",
            createdAt: "2026-08-01T00:00:00.000Z",
            closesAt: null,
          }
        : null,
    findCanonicalHmlWave: async () => null,
    listCohorts: async () => [
      { id: "cohort-a", orgId: "org-a", waveId: "wave-a", key: "A", label: "Setor A" },
    ],
    listLinks: async () => [
      {
        id: "link-a",
        orgId: "org-a",
        waveId: "wave-a",
        sectorKey: "A",
        status: "active",
        expiresAt: "2026-08-20T00:00:00.000Z",
        revokedAt: null,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    listResponses: async () => [],
    listEvents: async () => [],
    ...overrides,
  };
}

const deps = (store: FibtManagerStore) => ({
  store,
  now: () => NOW,
  pilotEnabled: () => true,
});

describe("FIB-T manager control center service", () => {
  test("denies cross-tenant wave before reading responses", async () => {
    let responseReads = 0;
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-b",
      "wave-a",
      {},
      deps(
        fakeStore({
          listResponses: async () => {
            responseReads += 1;
            return [];
          },
        }),
      ),
    );
    expect(result).toMatchObject({ ok: false, category: "validation" });
    expect(responseReads).toBe(0);
  });

  test("checks the exact HML cohort contract before reading answers", async () => {
    let responseReads = 0;
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      { expectedCohortKeys: ["A", "B"], environment: "hml_staging", hmlAttested: true },
      deps(
        fakeStore({
          listResponses: async () => {
            responseReads += 1;
            return [];
          },
        }),
      ),
    );
    expect(result).toMatchObject({ ok: false, category: "validation" });
    expect(responseReads).toBe(0);
  });

  test("suppresses a small cohort without serializing count, answers or tokens", async () => {
    const responses = Array.from({ length: 4 }, () => ({
      cohortId: "cohort-a",
      instrumentVersion: manifest.instrument_version,
      answers: completeAnswers,
    }));
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      deps(fakeStore({ listResponses: async () => responses })),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.sectors[0]).toMatchObject({
        participationState: "suppressed",
        participationLabel: "<5",
        publicationEligible: false,
      });
      const serialized = JSON.stringify(result.snapshot);
      expect(serialized).not.toContain('"n":4');
      expect(serialized).not.toContain('"answers"');
      expect(serialized).not.toContain("token_hash");
    }
  });

  test("publishes canonical factors at k=5 and marks the campaign operational", async () => {
    const responses = Array.from({ length: 5 }, () => ({
      cohortId: "cohort-a",
      instrumentVersion: manifest.instrument_version,
      answers: completeAnswers,
    }));
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      deps(fakeStore({ listResponses: async () => responses })),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.waveAnalytics.state).toBe("available");
      expect(result.snapshot.factorComparison[0]?.factors).toHaveLength(3);
      expect(result.snapshot.readiness).toMatchObject({ state: "ready", operational: true });
      expect(result.snapshot.privacy).toEqual({
        kMin: 5,
        individualResponsesExposed: false,
        rawTokensExposed: false,
      });
    }
  });

  test("blocks analytics on an unknown cohort binding", async () => {
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      deps(
        fakeStore({
          listResponses: async () => [
            {
              cohortId: "cohort-outside-scope",
              instrumentVersion: manifest.instrument_version,
              answers: completeAnswers,
            },
          ],
        }),
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.waveAnalytics.state).toBe("error");
      expect(result.snapshot.readiness.state).toBe("blocked");
      expect(result.snapshot.readiness.blockers.join(" ")).toContain("sem vínculo");
    }
  });

  test("detects duplicate active links even if database protection drifts", async () => {
    const duplicate = {
      id: "link-b",
      orgId: "org-a",
      waveId: "wave-a",
      sectorKey: "A",
      status: "active",
      expiresAt: "2026-08-21T00:00:00.000Z",
      revokedAt: null,
      createdAt: "2026-08-02T00:00:00.000Z",
    };
    const store = fakeStore();
    const first = await store.listLinks("org-a", "wave-a");
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      deps(fakeStore({ listLinks: async () => [...first, duplicate] })),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.sectors[0]?.operationalState).toBe("error");
      expect(result.snapshot.readiness.state).toBe("blocked");
    }
  });

  test("keeps manager telemetry scoped to the wave and strips free-form reasons", async () => {
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      deps(
        fakeStore({
          listEvents: async () => [
            {
              event: "authorization_denied",
              waveId: null,
              reason: "contains-unrelated-detail",
              occurredAt: "2026-08-12T14:00:00.000Z",
            },
            {
              event: "sector_link_created",
              waveId: "wave-a",
              reason: "free-form-detail",
              occurredAt: "2026-08-12T13:00:00.000Z",
            },
            {
              event: "sector_link_created",
              waveId: "wave-other",
              reason: "other-wave-detail",
              occurredAt: "2026-08-12T12:00:00.000Z",
            },
          ],
        }),
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.telemetry).toEqual([
        {
          event: "sector_link_created",
          waveId: "wave-a",
          reason: null,
          occurredAt: "2026-08-12T13:00:00.000Z",
        },
      ]);
    }
  });

  test("feature gate fails before database access", async () => {
    let reads = 0;
    const store = fakeStore({
      findWave: async () => {
        reads += 1;
        return null;
      },
    });
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      { store, pilotEnabled: () => false },
    );
    expect(result).toMatchObject({ ok: false, category: "feature_gate" });
    expect(reads).toBe(0);
  });
});
