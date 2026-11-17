import { createHash, createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PresentationDeck } from "@/features/presentation/types";

// Stateless sessions: the HttpOnly cookie carries `expiry.nonce.hmac`, signed with a
// key derived from the server-only verifier. Works across Worker isolates (no shared
// memory needed) and rotating the verifier revokes every session at once.
// Attempt throttling is per isolate (best effort) — durable limits need shared infra.
const scrypt = promisify(nodeScrypt);
const COOKIE = "vitalos_presentation";
const TTL = 30 * 60 * 1000;
const LIMIT_WINDOW = 60_000;
const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie, Origin",
};
export interface PresentationAccessConfig {
  origins: string[];
  verifier: string;
}

export async function createPresentationVerifier(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt-v1:${salt}:${key.toString("hex")}`;
}

function validOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      url.origin === value &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}
function validConfig(value: PresentationAccessConfig | null): value is PresentationAccessConfig {
  return (
    !!value &&
    /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(value.verifier) &&
    value.origins.length > 0 &&
    value.origins.every(validOrigin)
  );
}

function readConfig(): PresentationAccessConfig | null {
  const origins = (process.env.VITALOS_PRESENTATION_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const verifier = process.env.VITALOS_PRESENTATION_VERIFIER;
  if (!origins.length || !verifier) return null;
  return { origins, verifier };
}

async function verify(password: string, verifier: string) {
  const [, salt, expected] = verifier.split(":");
  const key = (await scrypt(password, salt!, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(expected!, "hex"));
}

const sign = (verifier: string, payload: string) =>
  createHmac("sha256", createHash("sha256").update("presentation-session:" + verifier).digest())
    .update(payload)
    .digest("hex");

function issue(verifier: string, expires: number) {
  const payload = `${expires}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(verifier, payload)}`;
}

function sessionExpiry(request: Request, verifier: string, time: number): number | null {
  const values = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(COOKIE + "="));
  if (values.length !== 1) return null;
  const m = /^(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(values[0]!.slice(COOKIE.length + 1));
  if (!m) return null;
  const expected = Buffer.from(sign(verifier, `${m[1]}.${m[2]}`), "hex");
  if (!timingSafeEqual(expected, Buffer.from(m[3]!, "hex"))) return null;
  const expires = Number(m[1]);
  return expires > time ? expires : null;
}

async function readPassword(request: Request): Promise<string | null> {
  if (!request.headers.get("content-type")?.startsWith("application/json") || !request.body)
    return null;
  const reader = request.body.getReader();
  let body = "";
  let size = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    const parsed: unknown = JSON.parse(body);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("password" in parsed) ||
      typeof parsed.password !== "string"
    )
      return null;
    return parsed.password.length > 0 && parsed.password.length <= 256 ? parsed.password : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export function createPresentationHandler(
  deps: {
    config?: () => PresentationAccessConfig | null;
    now?: () => number;
    loadDeck?: () => Promise<PresentationDeck>;
    ttlMs?: number;
  } = {},
) {
  const now = deps.now ?? Date.now;
  let attempts: number[] = [];
  const ttl = deps.ttlMs ?? TTL;
  const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) => {
    const response = Response.json(body, { status, headers: NO_STORE });
    for (const [name, value] of Object.entries(extra)) response.headers.set(name, value);
    return response;
  };
  return async (request: Request): Promise<Response> => {
    const config = (deps.config ?? readConfig)();
    if (!validConfig(config)) return reply({ state: "unavailable" }, 503);
    const origin = new URL(request.url).origin;
    if (!config.origins.includes(origin)) return reply({ state: "invalid" }, 403);
    const time = now();
    const expires = sessionExpiry(request, config.verifier, time);
    const cookie = (value: string, seconds: number) =>
      `${COOKIE}=${value}; Path=/api/apresentacao; HttpOnly; SameSite=Strict; Max-Age=${seconds}${origin.startsWith("https:") ? "; Secure" : ""}`;
    if (request.method === "GET") {
      if (!expires) return reply({ state: "locked" }, 401);
      const deck = await (
        deps.loadDeck ?? (async () => (await import("./content.server")).getPresentationDeck())
      )();
      if (expires <= now()) return reply({ state: "locked" }, 401);
      return reply({ state: "ready", deck, ttlMs: expires - now() });
    }
    if (!["POST", "DELETE"].includes(request.method))
      return reply({ state: "invalid" }, 405, { Allow: "GET, POST, DELETE" });
    if (
      request.headers.get("origin") !== origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return reply({ state: "invalid" }, 403);
    if (request.method === "DELETE")
      return reply({ state: "locked" }, 200, { "Set-Cookie": cookie("", 0) });
    attempts = attempts.filter((at) => at > time - LIMIT_WINDOW);
    if (attempts.length >= 12) return reply({ state: "limited" }, 429, { "Retry-After": "60" });
    attempts.push(time);
    const password = await readPassword(request);
    if (!password || !(await verify(password, config.verifier)))
      return reply({ state: "locked" }, 401);
    return reply({ state: "authenticated" }, 200, {
      "Set-Cookie": cookie(issue(config.verifier, now() + ttl), Math.ceil(ttl / 1000)),
    });
  };
}

export const handlePresentationRequest = createPresentationHandler();
