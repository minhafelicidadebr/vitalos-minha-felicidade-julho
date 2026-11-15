import { describe, expect, test } from "bun:test";
import { createOrgReadClient } from "./org-read-client.server";

const env = {
  SUPABASE_URL: "https://org-read.invalid",
  SUPABASE_PUBLISHABLE_KEY: "synthetic-public-project-key",
};

describe("cliente de leitura com a identidade do chamador", () => {
  test("envia o token da sessão ao PostgREST e mantém chamadas concorrentes isoladas", async () => {
    const requests: Array<{ url: string; authorization: string | null; apikey: string | null }> =
      [];
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      requests.push({
        url: String(input),
        authorization: headers.get("Authorization"),
        apikey: headers.get("apikey"),
      });
      return new Response(JSON.stringify([{ id: "synthetic-wave" }]), {
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;
    const alfa = await createOrgReadClient("synthetic-caller-alfa", { env, fetch: fetcher });
    const beta = await createOrgReadClient("synthetic-caller-beta", { env, fetch: fetcher });
    if (!alfa || !beta) throw new Error("Cliente de teste ausente");
    const results = await Promise.all([
      alfa.from("waves").select("id").eq("org_id", "alfa"),
      beta.from("waves").select("id").eq("org_id", "beta"),
    ]);
    expect(results.every((result) => !result.error)).toBe(true);
    expect(requests).toHaveLength(2);
    expect(
      requests.find((request) => new URL(request.url).searchParams.get("org_id") === "eq.alfa"),
    ).toMatchObject({
      authorization: "Bearer synthetic-caller-alfa",
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
    });
    expect(
      requests.find((request) => new URL(request.url).searchParams.get("org_id") === "eq.beta"),
    ).toMatchObject({
      authorization: "Bearer synthetic-caller-beta",
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
    });
    expect(requests.every((request) => !request.url.includes("synthetic-caller"))).toBe(true);
  });

  test("não usa credencial administrativa como substituta de chave publicável ou sessão", async () => {
    const serviceOnly = {
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: "synthetic-server-only-key",
    };
    expect(await createOrgReadClient("synthetic-caller", { env: serviceOnly })).toBeNull();
    expect(await createOrgReadClient("", { env })).toBeNull();
    expect(
      await createOrgReadClient("synthetic-caller", {
        env: { SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY },
      }),
    ).toBeNull();
  });
});
