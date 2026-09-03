import { validateHmlOrigin } from "@/lib/fibt-hml/hml-contract";

export interface AuthRedirectEnvLike {
  VITE_FIBT_HML_ENABLED?: string;
  VITE_FIBT_HML_FRONTEND_BASE_URL?: string;
}

export type AuthFlowType = "implicit" | "pkce";

export type AuthCallbackRedirectResult =
  | {
      ok: true;
      callbackUrl: string;
      existingAccountOnly: boolean;
    }
  | {
      ok: false;
      error: "AUTH_ORIGIN_INVALID" | "HML_AUTH_ORIGIN_INVALID";
    };

const RETURN_TO_BASE = "https://auth-return.invalid";
const ENCODED_PATH_SEPARATOR = /%(?:2f|5c)/i;

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

export function sanitizeAuthReturnTo(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const candidate = value.trim();
  if (
    candidate === "" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    containsControlCharacter(candidate)
  ) {
    return undefined;
  }

  const [pathAndSearch, fragment] = candidate.split("#", 2);
  if (fragment !== undefined) return undefined;

  const rawPathname = pathAndSearch!.split("?", 1)[0]!;
  if (ENCODED_PATH_SEPARATOR.test(rawPathname)) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(candidate, RETURN_TO_BASE);
  } catch {
    return undefined;
  }

  if (parsed.origin !== RETURN_TO_BASE || parsed.username || parsed.password) return undefined;
  return `${parsed.pathname}${parsed.search}`;
}

export function resolveAuthFlowType(env: AuthRedirectEnvLike): AuthFlowType {
  return env.VITE_FIBT_HML_ENABLED === "true" ? "pkce" : "implicit";
}

export function resolveAuthCallbackRedirect(
  currentOrigin: string,
  requestedReturnTo: string | undefined,
  env: AuthRedirectEnvLike,
): AuthCallbackRedirectResult {
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(currentOrigin);
  } catch {
    return { ok: false, error: "AUTH_ORIGIN_INVALID" };
  }

  if (parsedOrigin.origin !== currentOrigin || parsedOrigin.pathname !== "/") {
    return { ok: false, error: "AUTH_ORIGIN_INVALID" };
  }

  if (env.VITE_FIBT_HML_ENABLED === "true") {
    const hmlOrigin = validateHmlOrigin(parsedOrigin.origin, env.VITE_FIBT_HML_FRONTEND_BASE_URL);
    if (!hmlOrigin.valid) return { ok: false, error: "HML_AUTH_ORIGIN_INVALID" };
  }

  const returnTo = sanitizeAuthReturnTo(requestedReturnTo);
  const callback = new URL("/auth/callback", parsedOrigin.origin);
  if (returnTo) callback.searchParams.set("redirect", returnTo);

  return {
    ok: true,
    callbackUrl: callback.toString(),
    existingAccountOnly: returnTo
      ? new URL(returnTo, RETURN_TO_BASE).pathname === "/fibt-piloto"
      : false,
  };
}
