// Actual HTTP proof against the owned, database-free localhost sandbox only.
import { mkdirSync, writeFileSync } from "node:fs";
const base = "http://localhost:8093";
const password = process.env.PRESENTATION_PROOF_PASSWORD;
if (!password)
  throw new Error(
    "Provide the password privately via the process environment. It is never recorded.",
  );
const results: Array<{ check: string; passed: boolean }> = [];
function check(label: string, passed: boolean) {
  results.push({ check: label, passed });
  if (!passed) throw new Error(`Presentation HTTP proof failed: ${label}`);
}
const call = (
  method: string,
  options: { cookie?: string; password?: string; origin?: string; host?: string } = {},
) =>
  fetch((options.host ?? base) + "/api/apresentacao", {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: {
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(method !== "GET"
        ? { Origin: options.origin ?? base, "Content-Type": "application/json" }
        : {}),
    },
    ...(method === "POST"
      ? { body: JSON.stringify({ password: options.password ?? password }) }
      : {}),
  });
const anonymous = await call("GET");
check(
  "anonymous API refused with private no-store response",
  anonymous.status === 401 && (anonymous.headers.get("cache-control") ?? "").includes("no-store"),
);
const shell = await fetch(base + "/apresentacao/empresas", {
  redirect: "error",
  signal: AbortSignal.timeout(20000),
});
const html = await shell.text();
check(
  "SSR shell has no protected slide content",
  shell.ok &&
    !html.includes("O próximo passo do bem-estar é fazer parte do trabalho.") &&
    html.includes("noindex"),
);
const wrong = await call("POST", { password: "wrong-synthetic-http-fixture" });
check(
  "wrong password refused without issuing cookie",
  wrong.status === 401 && !wrong.headers.has("set-cookie"),
);
check(
  "cross-origin login refused",
  (await call("POST", { origin: "https://example.invalid" })).status === 403,
);
check(
  "alternative unconfigured origin refused",
  (await call("GET", { host: "http://127.0.0.1:8093" })).status === 403,
);
const login = await call("POST");
const header = login.headers.get("set-cookie") ?? "";
check(
  "normal login issues HttpOnly scoped SameSite cookie",
  login.ok &&
    header.includes("HttpOnly") &&
    header.includes("SameSite=Strict") &&
    header.includes("Path=/api/apresentacao"),
);
const cookie = header.split(";")[0]!;
const content = await call("GET", { cookie });
const payload = (await content.json()) as { state?: string; deck?: { slides?: unknown[] } };
check(
  "authenticated API delivers 18 V2 slides",
  content.ok && payload.state === "ready" && payload.deck?.slides?.length === 18,
);
check("logout is accepted", (await call("DELETE", { cookie })).ok);
check("old cookie cannot read after logout", (await call("GET", { cookie })).status === 401);
check(
  "forged cookie is refused",
  (await call("GET", { cookie: "vitalos_presentation=" + "a".repeat(64) })).status === 401,
);
const attempts = await Promise.all(
  Array.from({ length: 16 }, () => call("POST", { password: "wrong-synthetic-http-fixture" })),
);
check(
  "concurrent guessing is throttled",
  attempts.every((r) => [401, 429].includes(r.status)) &&
    attempts.filter((r) => r.status === 429).length >= 4,
);
mkdirSync("docs/vitalos/artifacts", { recursive: true });
writeFileSync(
  "docs/vitalos/artifacts/PRESENTATION_V2_HTTP_2026-11-16.json",
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      target: base,
      scope: "isolated-local-no-database",
      results,
      secretsRecorded: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `PASS ${results.length} local HTTP checks; no cookies, passwords or personal data recorded.`,
);
