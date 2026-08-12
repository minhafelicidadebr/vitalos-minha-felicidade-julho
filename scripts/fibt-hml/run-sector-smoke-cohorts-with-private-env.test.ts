import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireStagingTarget } from "../../src/lib/staging/staging-guard";
import {
  CHILD_ENV_APPLICATION_ALLOWLIST,
  CHILD_ENV_RUNTIME_ALLOWLIST,
  createPrivateFixtureInvocation,
  loadPrivateStagingFixtureEnvironment,
  parsePrivateFixtureRunnerArgs,
} from "./run-sector-smoke-cohorts-with-private-env";

const STAGING_REF = "stagingfixture12345";
const PRODUCTION_REF = "productionfixture12";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const PRODUCTION_URL = `https://${PRODUCTION_REF}.supabase.co`;

interface PrivatePackageParts {
  vars: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

function createPrivatePackage(mutate?: (parts: PrivatePackageParts) => void): {
  root: string;
  remove: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), "vitalos-private-fixture-"));
  const activeDir = join(root, "frozen-package-active");
  mkdirSync(activeDir);

  const parts: PrivatePackageParts = {
    vars: {
      SUPABASE_URL: STAGING_URL,
      SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      FIBT_HML_AUTHORIZED_STAGING_REF: STAGING_REF,
      VITALOS_STAGING_PROJECT_REF: STAGING_REF,
      VITALOS_PRODUCTION_PROJECT_REF: PRODUCTION_REF,
      VITALOS_RUNTIME_ENV: "preview",
      VITALOS_DB_TARGET: "staging",
    },
    secrets: {
      SUPABASE_SERVICE_ROLE_KEY: "test-secret-key",
    },
  };
  mutate?.(parts);

  writeFileSync(
    join(root, "README-PRIVATE-CONFIG-POINTER.txt"),
    [
      "Configuracao ATIVA do deployment HML:",
      "  frozen-package-active\\wrangler.hml.private.jsonc",
      "",
      "Configuracao HISTORICA (nao usar):",
      "  frozen-package-old\\wrangler.hml.private.jsonc",
    ].join("\n"),
  );
  writeFileSync(
    join(activeDir, "wrangler.hml.private.jsonc"),
    JSON.stringify({ vars: parts.vars }, null, 2),
  );
  writeFileSync(join(root, "secrets.hml.private.json"), JSON.stringify(parts.secrets));

  return { root, remove: () => rmSync(root, { recursive: true, force: true }) };
}

describe("private HML fixture environment loader", () => {
  test("maps only allowlisted application and runtime names to the child", () => {
    const privatePackage = createPrivatePackage();
    try {
      const loaded = loadPrivateStagingFixtureEnvironment(privatePackage.root, {
        Path: "test-runtime-path",
        SystemRoot: "test-system-root",
        TEMP: "test-temp",
        SUPABASE_URL: PRODUCTION_URL,
        FIBT_DO_NOT_FORWARD_SENTINEL: "dummy-test-value",
        UNRELATED_SECRET_SENTINEL: "dummy-test-value",
      });

      expect(loaded.stagingProjectRef).toBe(STAGING_REF);
      expect(loaded.environment.STAGING_SUPABASE_URL).toBe(STAGING_URL);
      expect(loaded.environment.STAGING_SUPABASE_PUBLISHABLE_KEY).toBe("test-publishable-key");
      expect(loaded.environment.STAGING_SUPABASE_SECRET_KEY).toBe("test-secret-key");
      expect(loaded.environment.STAGING_SUPABASE_PROJECT_REF).toBe(STAGING_REF);
      expect(loaded.environment.FIBT_HML_AUTHORIZED_STAGING_REF).toBe(STAGING_REF);
      expect(loaded.environment.Path).toBe("test-runtime-path");
      expect(loaded.environment.SystemRoot).toBe("test-system-root");
      expect(loaded.environment.TEMP).toBe("test-temp");
      expect(loaded.environment.SUPABASE_URL).toBeUndefined();
      expect(loaded.environment.FIBT_DO_NOT_FORWARD_SENTINEL).toBeUndefined();
      expect(loaded.environment.UNRELATED_SECRET_SENTINEL).toBeUndefined();
      expect(Object.keys(loaded.environment).sort()).toEqual(
        [...CHILD_ENV_APPLICATION_ALLOWLIST, "Path", "SystemRoot", "TEMP"].sort(),
      );

      expect(requireStagingTarget(loaded.environment).projectRef).toBe(STAGING_REF);
    } finally {
      privatePackage.remove();
    }
  });

  test("forwards the mapped environment to the fixture child without operator target overrides", () => {
    const privatePackage = createPrivatePackage();
    try {
      const invocation = createPrivateFixtureInvocation(
        ["--private-root", privatePackage.root, "--guard-preflight"],
        {
          Path: "test-runtime-path",
          FIBT_DO_NOT_FORWARD_SENTINEL: "dummy-test-value",
          UNRELATED_SECRET_SENTINEL: "dummy-test-value",
        },
        "bun-test",
        "repo-root",
      );

      expect(invocation.executable).toBe("bun-test");
      expect(invocation.args).toContain("--environment=staging");
      expect(invocation.args).toContain(`--expected-project-ref=${STAGING_REF}`);
      expect(invocation.args).toContain("--guard-preflight");
      expect(invocation.options.env.STAGING_SUPABASE_URL).toBe(STAGING_URL);
      expect(invocation.options.env.STAGING_SUPABASE_SECRET_KEY).toBe("test-secret-key");
      expect(invocation.options.env.FIBT_DO_NOT_FORWARD_SENTINEL).toBeUndefined();
      expect(invocation.options.env.UNRELATED_SECRET_SENTINEL).toBeUndefined();
      expect(invocation.options.stdio).toBe("inherit");

      expect(() =>
        createPrivateFixtureInvocation(
          ["--private-root", privatePackage.root, "--environment=production"],
          {},
        ),
      ).toThrow(/runner owns environment/);
    } finally {
      privatePackage.remove();
    }
  });

  test("runtime allowlist is closed and contains only named OS bootstrap variables", () => {
    expect(CHILD_ENV_APPLICATION_ALLOWLIST).toEqual([
      "STAGING_SUPABASE_URL",
      "STAGING_SUPABASE_PUBLISHABLE_KEY",
      "STAGING_SUPABASE_SECRET_KEY",
      "STAGING_SUPABASE_PROJECT_REF",
      "FIBT_HML_AUTHORIZED_STAGING_REF",
    ]);
    expect(CHILD_ENV_RUNTIME_ALLOWLIST).toEqual([
      "PATH",
      "Path",
      "SystemRoot",
      "WINDIR",
      "TEMP",
      "TMP",
      "HOME",
      "USERPROFILE",
    ]);
  });

  test("defaults to dry-run and APPLY requires an explicit confirmation", () => {
    expect(parsePrivateFixtureRunnerArgs(["--private-root=private"])).toEqual({
      privateRoot: "private",
      mode: "dry-run",
    });
    expect(() => parsePrivateFixtureRunnerArgs(["--private-root=private", "--apply"])).toThrow(
      /confirm-sector-smoke-cohorts/,
    );
    expect(
      parsePrivateFixtureRunnerArgs([
        "--private-root=private",
        "--apply",
        "--confirm-sector-smoke-cohorts",
      ]),
    ).toEqual({ privateRoot: "private", mode: "apply" });
    expect(() =>
      parsePrivateFixtureRunnerArgs([
        "--private-root=private",
        "--dry-run",
        "--apply",
        "--confirm-sector-smoke-cohorts",
      ]),
    ).toThrow(/mutually exclusive/);
    expect(() =>
      parsePrivateFixtureRunnerArgs(["--private-root=private-a", "--private-root=private-b"]),
    ).toThrow(/duplicate/);
  });

  test("fails closed when the private environment is absent or partial", () => {
    const missingPublishable = createPrivatePackage(({ vars }) => {
      delete vars.SUPABASE_PUBLISHABLE_KEY;
    });
    const missingSecret = createPrivatePackage(({ secrets }) => {
      delete secrets.SUPABASE_SERVICE_ROLE_KEY;
    });

    try {
      expect(() => loadPrivateStagingFixtureEnvironment("missing-private-root", {})).toThrow(
        /root is missing/,
      );
      expect(() => loadPrivateStagingFixtureEnvironment(missingPublishable.root, {})).toThrow(
        /SUPABASE_PUBLISHABLE_KEY/,
      );
      expect(() => loadPrivateStagingFixtureEnvironment(missingSecret.root, {})).toThrow(
        /SUPABASE_SERVICE_ROLE_KEY/,
      );
    } finally {
      missingPublishable.remove();
      missingSecret.remove();
    }
  });

  test("rejects a private package whose staging target equals production", () => {
    const privatePackage = createPrivatePackage(({ vars }) => {
      vars.SUPABASE_URL = PRODUCTION_URL;
      vars.FIBT_HML_AUTHORIZED_STAGING_REF = PRODUCTION_REF;
      vars.VITALOS_STAGING_PROJECT_REF = PRODUCTION_REF;
    });

    try {
      expect(() => loadPrivateStagingFixtureEnvironment(privatePackage.root, {})).toThrow(
        /matches the denied production project/,
      );
    } finally {
      privatePackage.remove();
    }
  });
});
