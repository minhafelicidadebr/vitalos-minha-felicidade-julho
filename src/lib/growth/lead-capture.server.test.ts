import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { IdentityBoundaryStatus } from "@/engine/identity/authorization-engine";
import type { LeadSubmission } from "@/engine/growth/lead-capture-engine";

const mockBoundary = mock<() => IdentityBoundaryStatus>(() => ({
  requestedMode: "demo",
  state: "demo",
  realAuthentication: false,
  serverEnforced: false,
  reason: "demo_isolated",
}));

mock.module("@/lib/identity/identity-boundary.server", () => ({
  readIdentityBoundaryStatus: mockBoundary,
}));

let insertRows: Array<Record<string, unknown>> = [];
let insertShouldError = false;
let listRows: Array<Record<string, unknown>> = [];

const fakeAdmin = {
  from: (_table: string) => ({
    insert: async (row: Record<string, unknown>) => {
      if (insertShouldError) return { error: { message: "boom" } };
      insertRows.push(row);
      return { error: null };
    },
    select: (_c: string) => ({
      order: (_o: string, _opts: unknown) => ({
        limit: async (_n: number) => ({ data: listRows }),
      }),
    }),
  }),
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { submitLead, listLeads } = await import("./lead-capture.server");

function setBoundary(state: "demo" | "cloud" | "blocked") {
  mockBoundary.mockImplementation(() => ({
    requestedMode: state === "demo" ? "demo" : "cloud",
    state,
    realAuthentication: state === "cloud",
    serverEnforced: state !== "demo",
    reason:
      state === "demo" ? "demo_isolated" : state === "cloud" ? "cloud_ready" : "cloud_adapter_missing",
  }));
}

const VALID: LeadSubmission = {
  name: "Marina Santos",
  company: "Instituto Felicidade",
  role: "CHRO",
  email: "marina@empresa.com",
  whatsapp: "(11) 90000-0000",
  interest: "Riscos psicossociais (NR-1)",
  sourcePage: "/nr1",
  consent: true,
  consentVersion: "2026.1",
};

const NO_UTM = { source: null, medium: null, campaign: null, term: null, content: null };

beforeEach(() => {
  setBoundary("demo");
  insertRows = [];
  insertShouldError = false;
  listRows = [];
});

describe("submitLead — validação roda ANTES de qualquer boundary", () => {
  test("sem consentimento → recusado mesmo em demo, nunca chega a persistir", async () => {
    const result = await submitLead({ ...VALID, consent: false }, NO_UTM);
    expect(result).toEqual({ accepted: false, reason: "missing_consent", persisted: false });
    expect(insertRows).toHaveLength(0);
  });

  test("e-mail inválido → recusado", async () => {
    const result = await submitLead({ ...VALID, email: "nao-e-email" }, NO_UTM);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("invalid_email");
  });
});

describe("submitLead — modo demo (honestidade preservada)", () => {
  test("válido em demo: aceito mas NUNCA persistido", async () => {
    const result = await submitLead(VALID, NO_UTM);
    expect(result).toEqual({ accepted: true, reason: "accepted", persisted: false });
    expect(insertRows).toHaveLength(0);
  });
});

describe("submitLead — modo blocked", () => {
  test("recusa explícita — nunca finge sucesso", async () => {
    setBoundary("blocked");
    const result = await submitLead(VALID, NO_UTM);
    expect(result).toEqual({ accepted: false, reason: "cloud_adapter_missing", persisted: false });
  });
});

describe("submitLead — modo cloud (persistência real)", () => {
  test("válido em cloud: aceito E persistido, com UTM e origem", async () => {
    setBoundary("cloud");
    const utm = { source: "linkedin", medium: "social", campaign: "nr1-julho", term: null, content: null };
    const result = await submitLead(VALID, utm);
    expect(result).toEqual({ accepted: true, reason: "accepted", persisted: true });
    expect(insertRows).toHaveLength(1);
    expect(insertRows[0]).toMatchObject({
      name: "Marina Santos",
      email: "marina@empresa.com",
      source_page: "/nr1",
      utm_source: "linkedin",
      utm_campaign: "nr1-julho",
      consent: true,
      consent_version: "2026.1",
    });
  });

  test("e-mail é normalizado para minúsculas antes de persistir", async () => {
    setBoundary("cloud");
    await submitLead({ ...VALID, email: "Marina@EMPRESA.com" }, NO_UTM);
    expect(insertRows[0]!.email).toBe("marina@empresa.com");
  });

  test("campos opcionais vazios viram null, nunca string vazia no banco", async () => {
    setBoundary("cloud");
    await submitLead({ ...VALID, role: "", whatsapp: "" }, NO_UTM);
    expect(insertRows[0]).toMatchObject({ role: null, whatsapp: null });
  });

  test("erro do banco → recusa honesta, nunca finge sucesso", async () => {
    setBoundary("cloud");
    insertShouldError = true;
    const result = await submitLead(VALID, NO_UTM);
    expect(result.accepted).toBe(false);
    expect(result.persisted).toBe(false);
  });
});

describe("listLeads — leitor do painel admin", () => {
  test("mapeia linhas do banco para o shape do cliente", async () => {
    listRows = [
      {
        id: "lead-1",
        name: "Marina",
        company: "Instituto",
        role: "CHRO",
        email: "marina@empresa.com",
        whatsapp: "119...",
        interest: "NR-1",
        source_page: "/nr1",
        utm_source: "linkedin",
        utm_campaign: "julho",
        created_at: "2026-07-09T10:00:00Z",
      },
    ];
    const leads = await listLeads();
    expect(leads).toEqual([
      {
        id: "lead-1",
        name: "Marina",
        company: "Instituto",
        role: "CHRO",
        email: "marina@empresa.com",
        whatsapp: "119...",
        interest: "NR-1",
        sourcePage: "/nr1",
        utmSource: "linkedin",
        utmCampaign: "julho",
        createdAt: "2026-07-09T10:00:00Z",
      },
    ]);
  });

  test("banco vazio → lista vazia", async () => {
    expect(await listLeads()).toEqual([]);
  });
});
