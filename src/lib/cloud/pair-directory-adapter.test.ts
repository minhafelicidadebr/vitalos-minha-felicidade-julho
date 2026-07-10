import { describe, expect, test, mock, beforeEach } from "bun:test";
import { fakeSupabase, fakeSupabaseState } from "./learning-adapter.fake-client";

// MESMO fake compartilhado do S5/I7 (lição documentada: nunca registrar um
// segundo mock.module para o mesmo módulo singleton).
mock.module("@/integrations/supabase/client", () => ({ supabase: fakeSupabase }));

const { loadOrgDirectory, loadOwnDirectoryEntry, upsertOwnDirectoryEntry, leaveDirectory } =
  await import("./pair-directory-adapter");

beforeEach(() => {
  fakeSupabaseState.directoryRows = {};
  fakeSupabaseState.lastUpsert = null;
  fakeSupabaseState.lastUpdate = null;
});

const PROFILE = {
  personId: "u-marina",
  displayName: "Marina",
  focusDriverId: "energia",
  sharedStrengthIds: ["curiosidade", "gratidao"],
};

describe("pair-directory-adapter — opt-in explícito", () => {
  test("join grava o shape do banco via upsert (onConflict user_id)", async () => {
    const ok = await upsertOwnDirectoryEntry("u-marina", "org-1", PROFILE);
    expect(ok).toBe(true);
    expect(fakeSupabaseState.lastUpsert).toMatchObject({
      user_id: "u-marina",
      org_id: "org-1",
      display_name: "Marina",
      focus_driver_id: "energia",
      shared_strength_ids: ["curiosidade", "gratidao"],
      visible: true,
    });
  });

  test("leave faz UPDATE visible=false (nunca DELETE — histórico auditável)", async () => {
    const ok = await leaveDirectory("u-marina");
    expect(ok).toBe(true);
    expect(fakeSupabaseState.lastUpdate).toMatchObject({ visible: false });
  });

  test("loadOwnDirectoryEntry mapeia a própria linha", async () => {
    fakeSupabaseState.directoryRows["u-marina"] = [
      {
        user_id: "u-marina",
        display_name: "Marina",
        focus_driver_id: "energia",
        shared_strength_ids: ["curiosidade"],
      },
    ];
    const entry = await loadOwnDirectoryEntry("u-marina");
    expect(entry).toEqual({
      personId: "u-marina",
      displayName: "Marina",
      focusDriverId: "energia",
      sharedStrengthIds: ["curiosidade"],
    });
  });

  test("loadOwnDirectoryEntry sem linha → null (ainda não entrou)", async () => {
    expect(await loadOwnDirectoryEntry("u-desconhecido")).toBeNull();
  });

  test("loadOrgDirectory nunca inclui a própria pessoa (exclusão por neq)", async () => {
    fakeSupabaseState.directoryRows["__org__"] = [
      { user_id: "u-caio", display_name: "Caio", focus_driver_id: "energia", shared_strength_ids: ["perseveranca"] },
    ];
    const directory = await loadOrgDirectory("u-marina");
    expect(directory).toEqual([
      { personId: "u-caio", displayName: "Caio", focusDriverId: "energia", sharedStrengthIds: ["perseveranca"] },
    ]);
  });
});
