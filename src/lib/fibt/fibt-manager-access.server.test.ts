import { describe, expect, test } from "bun:test";
import { authorizeFibtManagerRequest } from "./fibt-manager-access.server";
import type { FibtManagerStore } from "./fibt-manager-control-center.server";

const HML_WAVE = {
  id: "wave-hml",
  orgId: "org-hml",
  organizationName: "ISG Sintetica",
  label: "Onda sintetica",
  instrument: "FIB_T",
  instrumentVersion: "1.0.0",
  status: "collecting",
  createdAt: "2026-08-01T00:00:00.000Z",
  closesAt: null,
};

const hmlStore = {
  findCanonicalHmlWave: async () => HML_WAVE,
} as unknown as FibtManagerStore;

describe("FIB-T manager request authorization", () => {
  test("requires a verified Access identity in an attested HML deployment", async () => {
    const denied = await authorizeFibtManagerRequest(
      {},
      {},
      {},
      {
        store: hmlStore,
        boundary: () => ({
          hmlDeclared: true,
          attested: true,
          batchId: "batch",
          serverProjectRefMasked: "masked",
        }),
      },
    );
    expect(denied).toMatchObject({ ok: false, category: "hml_boundary" });
  });

  test("rejects an empty Access identity", async () => {
    const denied = await authorizeFibtManagerRequest(
      {},
      { hmlAccessIdentity: { email: " ", subject: "" } },
      {},
      {
        store: hmlStore,
        boundary: () => ({
          hmlDeclared: true,
          attested: true,
          batchId: "batch",
          serverProjectRefMasked: "masked",
        }),
      },
    );
    expect(denied).toMatchObject({ ok: false, category: "hml_boundary" });
  });

  test("resolves only the canonical HML campaign and never returns identity", async () => {
    const granted = await authorizeFibtManagerRequest(
      {},
      { hmlAccessIdentity: { email: "not-returned@example.test", subject: "not-returned" } },
      {},
      {
        store: hmlStore,
        boundary: () => ({
          hmlDeclared: true,
          attested: true,
          batchId: "batch",
          serverProjectRefMasked: "masked",
        }),
      },
    );
    expect(granted).toEqual({
      ok: true,
      orgId: "org-hml",
      waveId: "wave-hml",
      mode: "hml_access",
      hmlAttested: true,
    });
    expect(JSON.stringify(granted)).not.toContain("example.test");
  });

  test("rejects a caller-selected wave in HML", async () => {
    const denied = await authorizeFibtManagerRequest(
      { waveId: "other-wave" },
      { hmlAccessIdentity: { email: "tester@example.test", subject: "subject" } },
      {},
      {
        store: hmlStore,
        boundary: () => ({
          hmlDeclared: true,
          attested: true,
          batchId: "batch",
          serverProjectRefMasked: "masked",
        }),
      },
    );
    expect(denied).toMatchObject({ ok: false, category: "validation" });
  });

  test("requires Supabase admin authorization outside HML", async () => {
    const denied = await authorizeFibtManagerRequest(
      { accessToken: "valid-looking-token", waveId: "wave-a" },
      {},
      {},
      {
        boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
        requireAdmin: async () => ({ ok: false, reason: "not_admin" }),
      },
    );
    expect(denied).toMatchObject({ ok: false, category: "authorization" });
  });

  test("derives the organization from the authenticated admin, never input", async () => {
    const granted = await authorizeFibtManagerRequest(
      { accessToken: "valid-looking-token", waveId: "wave-a" },
      {},
      {},
      {
        boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
        requireAdmin: async () => ({
          ok: true,
          membership: { userId: "user-a", orgId: "org-from-session", role: "RH_ADMIN" },
        }),
      },
    );
    expect(granted).toMatchObject({
      ok: true,
      orgId: "org-from-session",
      waveId: "wave-a",
      mode: "supabase_admin",
    });
  });
});
