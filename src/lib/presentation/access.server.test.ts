import { describe, expect, test } from "bun:test";
import { createPresentationHandler, createPresentationVerifier } from "./access.server";
import type { PresentationDeck } from "@/features/presentation/types";

// happy-dom strips Origin in the constructor; incoming server requests retain it.
function serverRequest(url: string, init: RequestInit = {}): Request {
  const request = new Request(url, init);
  for (const [key, value] of Object.entries(init.headers ?? {}))
    request.headers.set(key, String(value));
  return request;
}
const origin = "http://localhost:8093";
const password = "synthetic-presentation-test-only";
const verifier = await createPresentationVerifier(password);
const deck = {
  edition: "synthetic",
  slides: [],
  contact: { label: "Fixture", href: "https://example.invalid" },
} satisfies PresentationDeck;
const req = (
  method = "GET",
  options: { cookie?: string; password?: string; origin?: string } = {},
) =>
  serverRequest(origin + "/api/apresentacao", {
    method,
    headers: {
      ...(method !== "GET"
        ? { origin: options.origin ?? origin, "content-type": "application/json" }
        : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    ...(method === "POST"
      ? { body: JSON.stringify({ password: options.password ?? password }) }
      : {}),
  });
const handler = (extra: Parameters<typeof createPresentationHandler>[0] = {}) =>
  createPresentationHandler({
    config: () => ({ origin, verifier }),
    loadDeck: async () => deck,
    ...extra,
  });
const cookieOf = (response: Response) => response.headers.get("set-cookie")!.split(";")[0]!;

describe("presentation server access", () => {
  test("missing or malformed configuration closes access without loading content", async () => {
    for (const config of [
      null,
      { origin, verifier: "invalid" },
      { origin: "http://remote.invalid", verifier },
    ]) {
      let loads = 0;
      const result = await createPresentationHandler({
        config: () => config,
        loadDeck: async () => {
          loads++;
          return deck;
        },
      })(req());
      expect(result.status).toBe(503);
      expect(loads).toBe(0);
      expect(await result.text()).not.toContain(verifier);
    }
  });
  test("direct anonymous GET and forged cookie never load the protected deck", async () => {
    let loads = 0;
    const serve = handler({
      loadDeck: async () => {
        loads++;
        return deck;
      },
    });
    for (const cookie of [
      undefined,
      "vitalos_presentation=forged",
      "vitalos_presentation=" + "a".repeat(64),
    ])
      expect((await serve(req("GET", { cookie }))).status).toBe(401);
    expect(loads).toBe(0);
  });
  test("legitimate login, protected read and logout invalidate the old cookie", async () => {
    const serve = handler();
    const login = await serve(req("POST"));
    expect(login.status).toBe(200);
    expect(login.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Strict");
    expect(login.headers.get("set-cookie")).toContain("Path=/api/apresentacao");
    const cookie = cookieOf(login);
    const read = await serve(req("GET", { cookie }));
    expect(await read.json()).toEqual({ state: "ready", deck, ttlMs: expect.any(Number) });
    expect(read.headers.get("cache-control")).toContain("no-store");
    expect(read.headers.get("vary")).toContain("Cookie");
    const logout = await serve(req("DELETE", { cookie }));
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await serve(req("GET", { cookie }))).status).toBe(401);
  });
  test("incorrect password has generic refusal and no session", async () => {
    const response = await handler()(req("POST", { password: "wrong-fixture" }));
    expect(response.status).toBe(401);
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(await response.json()).toEqual({ state: "locked" });
  });
  test("origin, cross-site and unconfigured hostname cannot acquire or revoke a session", async () => {
    const serve = handler();
    expect((await serve(req("POST", { origin: "https://evil.invalid" }))).status).toBe(403);
    expect((await serve(serverRequest("http://127.0.0.1:8093/api/apresentacao"))).status).toBe(403);
    expect(
      (await serve(serverRequest(origin + "/api/apresentacao", { method: "DELETE" }))).status,
    ).toBe(403);
    const cross = req("POST");
    cross.headers.set("sec-fetch-site", "cross-site");
    expect((await serve(cross)).status).toBe(403);
  });
  test("expiry, process restart and verifier rotation invalidate sessions", async () => {
    let time = 1000;
    let current = verifier;
    const serve = handler({
      now: () => time,
      ttlMs: 2000,
      config: () => ({ origin, verifier: current }),
    });
    const cookie = cookieOf(await serve(req("POST")));
    expect((await handler()(req("GET", { cookie }))).status).toBe(401);
    time = 3000;
    expect((await serve(req("GET", { cookie }))).status).toBe(401);
    time = 1000;
    const newCookie = cookieOf(await serve(req("POST")));
    current = await createPresentationVerifier(password);
    expect((await serve(req("GET", { cookie: newCookie }))).status).toBe(401);
  });
  test("concurrent attempts share the budget; new cookies and forwarded headers do not bypass it", async () => {
    let time = 1000;
    const serve = handler({ now: () => time });
    const responses = await Promise.all(
      Array.from({ length: 16 }, (_, i) => {
        const attempt = req("POST", { password: "wrong-fixture", cookie: `arbitrary=${i}` });
        attempt.headers.set("x-forwarded-for", `198.51.100.${i}`);
        return serve(attempt);
      }),
    );
    expect(responses.filter((r) => r.status === 401)).toHaveLength(12);
    expect(responses.filter((r) => r.status === 429)).toHaveLength(4);
    expect((await serve(req("POST"))).headers.get("retry-after")).toBe("60");
    time += 60_001;
    expect((await serve(req("POST"))).status).toBe(200);
  });
  test("oversized/malformed payloads, duplicate session cookies and unsupported methods are refused", async () => {
    const serve = handler();
    for (const body of [
      "{",
      JSON.stringify({ password: "a".repeat(1500) }),
      JSON.stringify({ password: 9 }),
    ]) {
      expect(
        (
          await serve(
            serverRequest(origin + "/api/apresentacao", {
              method: "POST",
              headers: { origin, "content-type": "application/json" },
              body,
            }),
          )
        ).status,
      ).toBe(401);
    }
    const cookie = cookieOf(await serve(req("POST")));
    expect((await serve(req("GET", { cookie: `${cookie}; ${cookie}` }))).status).toBe(401);
    expect(
      (await serve(serverRequest(origin + "/api/apresentacao", { method: "PUT" }))).status,
    ).toBe(405);
  });
  test("HTTPS session uses Secure, server expiry checked again after loading content", async () => {
    const https = "https://presentation.example.invalid";
    const serve = handler({ config: () => ({ origin: https, verifier }) });
    const response = await serve(
      serverRequest(https + "/api/apresentacao", {
        method: "POST",
        headers: { origin: https, "content-type": "application/json" },
        body: JSON.stringify({ password }),
      }),
    );
    expect(response.headers.get("set-cookie")).toContain("; Secure");
    let time = 1000;
    const expiresWhileLoading = handler({
      now: () => time,
      ttlMs: 1000,
      loadDeck: async () => {
        time = 2000;
        return deck;
      },
    });
    const cookie = cookieOf(await expiresWhileLoading(req("POST")));
    expect((await expiresWhileLoading(req("GET", { cookie }))).status).toBe(401);
  });
});
