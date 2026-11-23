import { describe, expect, test } from "bun:test";
import { createPresentationVerifier } from "@/lib/presentation/access.server";
import { createProposalHandler } from "./proposal-access.server";

const origin = "http://localhost:8094";
const password = "synthetic-proposal-test-only";
const verifier = await createPresentationVerifier(password);

function req(method: string, o: { cookie?: string; password?: string } = {}) {
  const r = new Request(origin + "/api/proposta", {
    method,
    ...(method === "POST" ? { body: JSON.stringify({ password: o.password ?? password }) } : {}),
  });
  if (method !== "GET") {
    r.headers.set("origin", origin);
    r.headers.set("content-type", "application/json");
  }
  if (o.cookie) r.headers.set("cookie", o.cookie);
  return r;
}

describe("porta da proposta", () => {
  test("sem configuração: indisponível, sem conteúdo", async () => {
    const h = createProposalHandler({ config: () => null });
    const res = await h(req("GET"));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("60");
  });

  test("preço só depois da senha; cookie próprio, restrito à API, HttpOnly e no-store", async () => {
    const h = createProposalHandler({ config: () => ({ origins: [origin], verifier }) });
    const locked = await h(req("GET"));
    expect(locked.status).toBe(401);
    expect(await locked.text()).not.toMatch(/60|ISG/);
    expect((await h(req("POST", { password: "errada" }))).status).toBe(401);
    const ok = await h(req("POST"));
    const setCookie = ok.headers.get("set-cookie")!;
    expect(setCookie).toContain("vitalos_proposal=");
    expect(setCookie).toContain("Path=/api/proposta");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    const res = await h(req("GET", { cookie: setCookie.split(";")[0]! }));
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body.state).toBe("ready");
    expect(body.deck.investment.total).toBe(60_000);
  });

  test("sessão da apresentação empresarial não abre a proposta (escopo de assinatura próprio)", async () => {
    const { createPresentationHandler } = await import("@/lib/presentation/access.server");
    const deck = createPresentationHandler({
      config: () => ({ origins: [origin], verifier }),
      loadDeck: async () => ({}),
    });
    const other = (await deck(req("POST"))).headers
      .get("set-cookie")!
      .split(";")[0]!
      .replace("vitalos_presentation", "vitalos_proposal");
    const h = createProposalHandler({ config: () => ({ origins: [origin], verifier }) });
    expect((await h(req("GET", { cookie: other }))).status).toBe(401);
  });
});
