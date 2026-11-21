import { describe, expect, test } from "bun:test";
import { createPresentationVerifier } from "@/lib/presentation/access.server";
import { createGuideHandler, readGuideConfig } from "./guide-access.server";

// happy-dom remove Origin no construtor; pedidos reais de servidor o mantêm.
function serverRequest(url: string, init: RequestInit = {}): Request {
  const request = new Request(url, init);
  for (const [key, value] of Object.entries(init.headers ?? {})) request.headers.set(key, String(value));
  return request;
}
const origin = "http://localhost:8098";
const post = (password: string, cookie = "") =>
  serverRequest(`${origin}/api/guia`, { method: "POST", headers: { "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ password }) });
const get = (cookie = "") => serverRequest(`${origin}/api/guia`, { headers: cookie ? { cookie } : {} });

describe("Guia · porta editorial (AC-03)", () => {
  test("configuração ausente recusa (503) e nada é servido", async () => {
    const h = createGuideHandler({ config: () => null });
    expect((await h(get())).status).toBe(503);
    expect((await h(post("x"))).status).toBe(503);
    const old = process.env.VITALOS_GUIDE_STORE;
    delete process.env.VITALOS_GUIDE_STORE;
    expect(readGuideConfig()).toBeNull();
    if (old !== undefined) process.env.VITALOS_GUIDE_STORE = old;
  });

  test("sem sessão: bloqueado; senha incorreta: bloqueado; senha de teste: libera o conteúdo com cookie próprio", async () => {
    const verifier = await createPresentationVerifier("senha-de-teste-guia");
    let now = 1_000;
    const h = createGuideHandler({ config: () => ({ origin, verifier }), now: () => now, ttlMs: 60_000 });
    expect((await h(get())).status).toBe(401);
    expect((await h(post("errada"))).status).toBe(401);
    const ok = await h(post("senha-de-teste-guia"));
    expect(ok.status).toBe(200);
    const setCookie = ok.headers.get("set-cookie")!;
    expect(setCookie).toContain("vitalos_guide=");
    expect(setCookie).toContain("Path=/api/guia");
    expect(setCookie).toContain("HttpOnly");
    expect(ok.headers.get("cache-control")).toContain("no-store");
    const cookie = setCookie.split(";")[0]!;
    const ready = await h(get(cookie));
    expect(ready.status).toBe(200);
    const body = (await ready.json()) as { state: string; deck: { content: { caseLabel: string }; environment: string } };
    expect(body.state).toBe("ready");
    expect(body.deck.content.caseLabel).toContain("fictício");
    // expiração
    now += 61_000;
    expect((await h(get(cookie))).status).toBe(401);
  });

  test("cookie da apresentação não abre o guia", async () => {
    const verifier = await createPresentationVerifier("senha-de-teste-guia");
    const h = createGuideHandler({ config: () => ({ origin, verifier }) });
    expect((await h(get("vitalos_presentation=" + "a".repeat(64)))).status).toBe(401);
  });
});
