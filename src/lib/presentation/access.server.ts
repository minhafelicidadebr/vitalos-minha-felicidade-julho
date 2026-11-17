import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PresentationDeck } from "@/features/presentation/types";

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
  origin: string;
  verifier: string;
}

export async function createPresentationVerifier(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt-v1:${salt}:${key.toString("hex")}`;
}

function validConfig(value: PresentationAccessConfig | null): value is PresentationAccessConfig {
  if (!value || !/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(value.verifier)) return false;
  try {
    const url = new URL(value.origin);
    return (
      url.origin === value.origin &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

function readConfig(): PresentationAccessConfig | null {
  const origin = process.env.VITALOS_PRESENTATION_ORIGIN;
  const verifier = process.env.VITALOS_PRESENTATION_VERIFIER;
  // In-memory sessions and throttling are deliberately limited to one instance.
  if (process.env.VITALOS_PRESENTATION_STORE !== "single-process" || !origin || !verifier)
    return null;
  return { origin, verifier };
}

async function verify(password: string, verifier: string) {
  const [, salt, expected] = verifier.split(":");
  const key = (await scrypt(password, salt!, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(expected!, "hex"));
}

function tokenFrom(request: Request): string | null {
  const values = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(COOKIE + "="));
  if (values.length !== 1) return null;
  const token = values[0]!.slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

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
  const sessions = new Map<string, { expires: number; configKey: string }>();
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
    if (new URL(request.url).origin !== config.origin) return reply({ state: "invalid" }, 403);
    const time = now();
    for (const [id, session] of sessions) if (session.expires <= time) sessions.delete(id);
    const configKey = digest(config.origin + config.verifier);
    const token = tokenFrom(request);
    const key = token ? digest(token) : "";
    const session = sessions.get(key);
    const authorized = session && session.expires > time && session.configKey === configKey;
    const cookie = (value: string, seconds: number) =>
      `${COOKIE}=${value}; Path=/api/apresentacao; HttpOnly; SameSite=Strict; Max-Age=${seconds}${config.origin.startsWith("https:") ? "; Secure" : ""}`;
    if (request.method === "GET") {
      if (!authorized) return reply({ state: "locked" }, 401);
      const deck = await (
        deps.loadDeck ?? (async () => (await import("./content.server")).getPresentationDeck())
      )();
      // Expiry can pass while a dependency is loading.
      if (!sessions.has(key) || session.expires <= now()) return reply({ state: "locked" }, 401);
      return reply({ state: "ready", deck, ttlMs: session.expires - now() });
    }
    if (!["POST", "DELETE"].includes(request.method))
      return reply({ state: "invalid" }, 405, { Allow: "GET, POST, DELETE" });
    if (
      request.headers.get("origin") !== config.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return reply({ state: "invalid" }, 403);
    if (request.method === "DELETE") {
      sessions.delete(key);
      return reply({ state: "locked" }, 200, { "Set-Cookie": cookie("", 0) });
    }
    // Global, bounded budget is not keyed by attacker-controlled forwarded headers/cookies.
    // Reserve synchronously, before expensive KDF work: parallel attempts share the cap.
    attempts = attempts.filter((at) => at > time - LIMIT_WINDOW);
    if (attempts.length >= 12 || sessions.size >= 1000)
      return reply({ state: "limited" }, 429, { "Retry-After": "60" });
    attempts.push(time);
    const password = await readPassword(request);
    if (!password || !(await verify(password, config.verifier)))
      return reply({ state: "locked" }, 401);
    const latestConfig = (deps.config ?? readConfig)();
    if (
      !validConfig(latestConfig) ||
      digest(latestConfig.origin + latestConfig.verifier) !== configKey
    )
      return reply({ state: "unavailable" }, 503);
    if (token) sessions.delete(key);
    const newToken = randomBytes(32).toString("hex");
    sessions.set(digest(newToken), { expires: now() + ttl, configKey });
    return reply({ state: "authenticated" }, 200, {
      "Set-Cookie": cookie(newToken, Math.ceil(ttl / 1000)),
    });
  };
}

export const handlePresentationRequest = createPresentationHandler();
