import { describe, expect, test } from "bun:test";
import { createWaveWithAdmin } from "./db-adapter";

interface InsertCall {
  table: string;
  payload: unknown;
}

function fakeAdmin() {
  const inserts: InsertCall[] = [];
  const admin = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          inserts.push({ table, payload });
          return {
            select() {
              if (table === "waves") {
                return {
                  single: async () => ({ data: { id: "wave-sector" }, error: null }),
                };
              }
              const rows = Array.isArray(payload)
                ? payload.map((_, index) => ({ token: `token-${index + 1}` }))
                : [];
              return Promise.resolve({ data: rows, error: null });
            },
          };
        },
      };
    },
  };
  return { admin, inserts };
}

describe("createWaveWithAdmin sector distribution", () => {
  test("creates the FIB-T campaign target without individual invitations", async () => {
    const { admin, inserts } = fakeAdmin();
    const result = await createWaveWithAdmin(
      {
        orgId: "org-a",
        instrument: "FIB_T",
        label: "Piloto ISG",
        inviteCount: 30,
        distributionMode: "sector",
      },
      admin,
    );

    expect(result).toEqual({
      waveId: "wave-sector",
      inviteTokens: [],
      inviteLinks: [],
      inviteEmails: [],
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toEqual({
      table: "waves",
      payload: {
        org_id: "org-a",
        instrument: "FIB_T",
        label: "Piloto ISG",
        status: "collecting",
        invited_count: 30,
        closes_at: null,
        // A onda FIB-T nasce com a versão do manifesto — sem ela o leitor
        // protegido devolve methodology_error.
        instrument_version: "1.0.0",
      },
    });
  });

  test("preserves individual invitation generation for existing instruments", async () => {
    const { admin, inserts } = fakeAdmin();
    const result = await createWaveWithAdmin(
      {
        orgId: "org-a",
        instrument: "COPSOQ",
        inviteCount: 5,
        distributionMode: "individual",
      },
      admin,
    );

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.inviteTokens).toHaveLength(5);
    }
    expect(inserts.map((call) => call.table)).toEqual(["waves", "wave_invites"]);
  });
});
