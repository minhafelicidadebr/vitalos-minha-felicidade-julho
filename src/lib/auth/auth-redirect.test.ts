import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveAuthCallbackRedirect,
  resolveAuthFlowType,
  sanitizeAuthReturnTo,
} from "./auth-redirect";

const HML_ORIGIN = "https://vitalos-fibt-hml-isg.pesquisafib.workers.dev";
const HML_ENV = {
  VITE_FIBT_HML_ENABLED: "true",
  VITE_FIBT_HML_FRONTEND_BASE_URL: HML_ORIGIN,
};
const ROOT = process.cwd();

describe("HML magic-link redirect contract", () => {
  test("uses same-origin HML callback, PKCE and preserves /fibt-piloto", () => {
    const result = resolveAuthCallbackRedirect(HML_ORIGIN, "/fibt-piloto", HML_ENV);

    expect(result).toEqual({
      ok: true,
      callbackUrl: `${HML_ORIGIN}/auth/callback?redirect=%2Ffibt-piloto`,
      existingAccountOnly: true,
    });
    expect(result.ok && result.callbackUrl).not.toContain("localhost");
    expect(resolveAuthFlowType(HML_ENV)).toBe("pkce");
  });

  test("fails closed instead of falling back to localhost or another HML origin", () => {
    expect(resolveAuthCallbackRedirect("http://localhost:3000", "/fibt-piloto", HML_ENV)).toEqual({
      ok: false,
      error: "HML_AUTH_ORIGIN_INVALID",
    });
    expect(
      resolveAuthCallbackRedirect("https://other-hml.invalid", "/fibt-piloto", HML_ENV),
    ).toEqual({ ok: false, error: "HML_AUTH_ORIGIN_INVALID" });
  });

  test("denies open and ambiguous redirects", () => {
    for (const unsafe of [
      "https://evil.invalid",
      "//evil.invalid/path",
      "/\\evil.invalid/path",
      "/%2f%2fevil.invalid/path",
      "/%5cevil.invalid/path",
      "/fibt-piloto#https://evil.invalid",
      "/fibt-piloto\u0000",
    ]) {
      expect(sanitizeAuthReturnTo(unsafe)).toBeUndefined();
    }
  });

  test("keeps safe local path and query without granting account creation to the manager route", () => {
    expect(sanitizeAuthReturnTo("/fibt-piloto?view=overview")).toBe("/fibt-piloto?view=overview");
    const result = resolveAuthCallbackRedirect(HML_ORIGIN, "/fibt-piloto?view=overview", HML_ENV);
    expect(result.ok && result.existingAccountOnly).toBe(true);
  });

  test("preserves the existing implicit same-origin behavior outside HML", () => {
    const result = resolveAuthCallbackRedirect("https://app.vitalos.com.br", "/rh", {});
    expect(result).toEqual({
      ok: true,
      callbackUrl: "https://app.vitalos.com.br/auth/callback?redirect=%2Frh",
      existingAccountOnly: false,
    });
    expect(resolveAuthFlowType({})).toBe("implicit");
  });

  test("the manager login is existing-account only and authorization remains server-side", () => {
    const loginRoute = readFileSync(join(ROOT, "src/routes/entrar.tsx"), "utf8");
    const managerAccess = readFileSync(
      join(ROOT, "src/lib/fibt/fibt-manager-access.server.ts"),
      "utf8",
    );

    expect(loginRoute).toContain("shouldCreateUser: !authRedirect.existingAccountOnly");
    expect(managerAccess).toContain("requireOrgAdmin");
    expect(managerAccess).toContain("verifiedHmlIdentity");
  });

  test("auth callback and login do not emit session or token telemetry", () => {
    const authSources = [
      "src/routes/entrar.tsx",
      "src/routes/auth.callback.tsx",
      "src/lib/auth/auth-redirect.ts",
      "src/integrations/supabase/client.ts",
    ]
      .map((path) => readFileSync(join(ROOT, path), "utf8"))
      .join("\n");

    expect(authSources).not.toMatch(/from ["'][^"']*telemetry[^"']*["']/i);
    expect(authSources).not.toMatch(
      /console\.(?:log|info|warn|error)\([^\n]*(?:access_token|refresh_token|session\.access_token)/i,
    );
  });
});
