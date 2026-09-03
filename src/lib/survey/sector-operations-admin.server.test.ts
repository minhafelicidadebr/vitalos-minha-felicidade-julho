import { describe, expect, test } from "bun:test";
import {
  createWaveSectorAsAdmin,
  issueWaveSectorLinkAsAdmin,
  listWaveSectorOperationsAsAdmin,
  revokeWaveSectorLinkAsAdmin,
  type SectorOperationsStore,
} from "./sector-operations-admin.server";

const NOW = new Date("2026-08-12T12:00:00.000Z");
const TEST_DEPS = {
  emitEvent: () => undefined,
  pilotEnabled: () => true,
} as const;

function fakeStore(overrides: Partial<SectorOperationsStore> = {}): SectorOperationsStore {
  return {
    findWave: async (orgId, waveId) =>
      orgId === "org-a" && waveId === "wave-a"
        ? {
            id: "wave-a",
            orgId: "org-a",
            instrument: "FIB_T",
            label: "Piloto ISG",
            status: "collecting",
          }
        : null,
    listCohorts: async () => [
      {
        id: "cohort-a",
        orgId: "org-a",
        waveId: "wave-a",
        key: "OPERACOES",
        label: "Operacoes",
        createdAt: NOW.toISOString(),
      },
    ],
    insertCohort: async () => "created",
    listLinks: async () => [],
    countResponses: async () => 0,
    insertLink: async () => "created",
    findLink: async () => null,
    revokeLink: async () => true,
    ...overrides,
  };
}

describe("sector operations admin service", () => {
  test("denies a wave outside the authenticated organization before mutation", async () => {
    let insertCalls = 0;
    const store = fakeStore({
      insertCohort: async () => {
        insertCalls += 1;
        return "created";
      },
    });

    const result = await createWaveSectorAsAdmin(
      "org-b",
      "wave-a",
      { key: "OPERACOES", label: "Operacoes" },
      { store, ...TEST_DEPS },
    );

    expect(result.created).toBe(false);
    expect(insertCalls).toBe(0);
  });

  test("creates one canonical cohort key", async () => {
    const inserted: Array<Parameters<SectorOperationsStore["insertCohort"]>[0]> = [];
    const store = fakeStore({
      insertCohort: async (input) => {
        inserted.push(input);
        return "created";
      },
    });

    const result = await createWaveSectorAsAdmin(
      "org-a",
      "wave-a",
      { key: "operacoes sao paulo", label: "Operacoes Sao Paulo" },
      { store, ...TEST_DEPS },
    );

    expect(result).toEqual({
      created: true,
      key: "OPERACOES-SAO-PAULO",
      label: "Operacoes Sao Paulo",
    });
    expect(inserted[0]).toEqual({
      orgId: "org-a",
      waveId: "wave-a",
      key: "OPERACOES-SAO-PAULO",
      label: "Operacoes Sao Paulo",
    });
  });

  test("fails closed when the cohort binding does not exist", async () => {
    let linkInserts = 0;
    const store = fakeStore({
      listCohorts: async () => [],
      insertLink: async () => {
        linkInserts += 1;
        return "created";
      },
    });

    const result = await issueWaveSectorLinkAsAdmin(
      "org-a",
      "wave-a",
      { cohortKey: "OPERACOES" },
      { store, ...TEST_DEPS },
    );

    expect(result.created).toBe(false);
    expect(linkInserts).toBe(0);
  });

  test("does not issue a second active link for the same sector", async () => {
    const store = fakeStore({
      listLinks: async () => [
        {
          id: "link-a",
          orgId: "org-a",
          waveId: "wave-a",
          sectorKey: "OPERACOES",
          status: "active",
          expiresAt: "2026-08-01T00:00:00.000Z",
          revokedAt: null,
          createdAt: "2026-07-01T00:00:00.000Z",
        },
      ],
    });

    const result = await issueWaveSectorLinkAsAdmin(
      "org-a",
      "wave-a",
      { cohortKey: "OPERACOES" },
      { store, now: () => NOW, ...TEST_DEPS },
    );

    expect(result).toEqual({
      created: false,
      error: "Este setor ja possui um link ativo. Revogue-o antes de emitir outro.",
    });
  });

  test("persists only the token hash and returns the raw token once", async () => {
    const inserted: Array<Parameters<SectorOperationsStore["insertLink"]>[0]> = [];
    const store = fakeStore({
      insertLink: async (input) => {
        inserted.push(input);
        return "created";
      },
    });

    const result = await issueWaveSectorLinkAsAdmin(
      "org-a",
      "wave-a",
      { cohortKey: "OPERACOES", expiresInDays: 14 },
      {
        store,
        now: () => NOW,
        tokenFactory: () => "raw-secret-token-for-test",
        ...TEST_DEPS,
      },
    );

    expect(result.created).toBe(true);
    expect(inserted[0]?.tokenHash).not.toBe("raw-secret-token-for-test");
    expect(inserted[0]?.tokenHash).toHaveLength(64);
    expect(inserted[0]?.expiresAt).toBe("2026-08-26T12:00:00.000Z");
  });

  test("returns protected participation metadata and never response rows", async () => {
    const low = await listWaveSectorOperationsAsAdmin("org-a", "wave-a", {
      store: fakeStore({ countResponses: async () => 4 }),
      now: () => NOW,
      ...TEST_DEPS,
    });
    expect(low.ok).toBe(true);
    if (low.ok) {
      expect(low.sectors[0]?.responseCountLabel).toBe("<5");
      expect(low.sectors[0]?.reportable).toBe(false);
      expect(JSON.stringify(low)).not.toContain('"answers"');
      expect(JSON.stringify(low)).not.toContain('"tokenHash"');
    }
  });

  test("surfaces an unbound historical link as metadata-only anomaly", async () => {
    const result = await listWaveSectorOperationsAsAdmin("org-a", "wave-a", {
      store: fakeStore({
        listLinks: async () => [
          {
            id: "link-orphan",
            orgId: "org-a",
            waveId: "wave-a",
            sectorKey: "TEXTO-LIVRE-LEGADO",
            status: "active",
            expiresAt: "2026-08-20T00:00:00.000Z",
            revokedAt: null,
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        ],
      }),
      now: () => NOW,
      ...TEST_DEPS,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.unboundLinks).toEqual([
        {
          id: "link-orphan",
          sectorKey: "TEXTO-LIVRE-LEGADO",
          state: "active",
          expiresAt: "2026-08-20T00:00:00.000Z",
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      ]);
      expect(JSON.stringify(result.unboundLinks)).not.toContain("token");
    }
  });

  test("revocation is scoped to organization, wave and active link", async () => {
    let revoked = false;
    const link = {
      id: "link-a",
      orgId: "org-a",
      waveId: "wave-a",
      sectorKey: "OPERACOES",
      status: "active",
      expiresAt: "2026-08-20T00:00:00.000Z",
      revokedAt: null,
      createdAt: "2026-08-01T00:00:00.000Z",
    };
    const store = fakeStore({
      findLink: async (orgId, waveId, linkId) =>
        orgId === "org-a" && waveId === "wave-a" && linkId === "link-a" ? link : null,
      revokeLink: async () => {
        revoked = true;
        return true;
      },
    });

    const denied = await revokeWaveSectorLinkAsAdmin("org-b", "wave-a", "link-a", {
      store,
      ...TEST_DEPS,
    });
    expect(denied.revoked).toBe(false);
    expect(revoked).toBe(false);

    const accepted = await revokeWaveSectorLinkAsAdmin("org-a", "wave-a", "link-a", {
      store,
      now: () => NOW,
      ...TEST_DEPS,
    });
    expect(accepted).toEqual({ revoked: true });
    expect(revoked).toBe(true);
  });

  test("feature gate denies every operation before database I/O", async () => {
    let reads = 0;
    const store = fakeStore({
      findWave: async () => {
        reads += 1;
        return null;
      },
    });
    const deps = { store, pilotEnabled: () => false, emitEvent: () => undefined };

    const listed = await listWaveSectorOperationsAsAdmin("org-a", "wave-a", deps);
    const created = await createWaveSectorAsAdmin(
      "org-a",
      "wave-a",
      { key: "OPERACOES", label: "Operacoes" },
      deps,
    );
    const issued = await issueWaveSectorLinkAsAdmin(
      "org-a",
      "wave-a",
      { cohortKey: "OPERACOES" },
      deps,
    );
    const revoked = await revokeWaveSectorLinkAsAdmin("org-a", "wave-a", "link-a", deps);

    expect(listed.ok).toBe(false);
    expect(created.created).toBe(false);
    expect(issued.created).toBe(false);
    expect(revoked.revoked).toBe(false);
    expect(reads).toBe(0);
  });
});
