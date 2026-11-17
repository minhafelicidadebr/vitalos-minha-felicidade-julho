import { describe, expect, test } from "bun:test";
import { createPresentationHandler, createPresentationVerifier } from "./access.server";

const origin = "http://localhost:8093";
const password = "synthetic-presentation-test-only";
const verifier = await createPresentationVerifier(password);
const deck = { edition: "t", slides: [], contact: { label: "x", href: "https://example.invalid" } } as never;
function req(method: string, o: { cookie?: string; password?: string; origin?: string } = {}) {
  const r = new Request(origin + "/api/apresentacao", {
    method,
    ...(method === "POST" ? { body: JSON.stringify({ password: o.password ?? password }) } : {}),
  });
  if (method !== "GET") { r.headers.set("origin", o.origin ?? origin); r.headers.set("content-type", "application/json"); }
  if (o.cookie) r.headers.set("cookie", o.cookie);
  return r;
}
const mk = (extra = {}) => createPresentationHandler({ config: () => ({ origins: [origin], verifier }), loadDeck: async () => deck, ...extra });
const cookieOf = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;

describe("presentation gate", () => {
  test("locked without session, deck only after correct password", async () => {
    const h = mk();
    expect((await h(req("GET"))).status).toBe(401);
    expect((await h(req("POST", { password: "wrong" }))).status).toBe(401);
    const ok = await h(req("POST"));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toContain("HttpOnly");
    const body = await (await h(req("GET", { cookie: cookieOf(ok) }))).json();
    expect(body.state).toBe("ready");
  });
  test("tampered or expired cookie is rejected", async () => {
    let t = 1_800_000_000_000;
    const h = mk({ now: () => t });
    const c = cookieOf(await h(req("POST")));
    expect((await h(req("GET", { cookie: c.slice(0, -1) + (c.endsWith("0") ? "1" : "0") }))).status).toBe(401);
    t += 31 * 60 * 1000;
    expect((await h(req("GET", { cookie: c }))).status).toBe(401);
  });
  test("cross-origin POST refused; 13th attempt per minute limited", async () => {
    const h = mk();
    expect((await h(req("POST", { origin: "https://evil.example" }))).status).toBe(403);
    let last = 0;
    for (let i = 0; i < 13; i++) last = (await h(req("POST", { password: "nope" }))).status;
    expect(last).toBe(429);
  });
  test("unconfigured server stays unavailable", async () => {
    expect((await createPresentationHandler({ config: () => null })(req("GET"))).status).toBe(503);
  });
});
