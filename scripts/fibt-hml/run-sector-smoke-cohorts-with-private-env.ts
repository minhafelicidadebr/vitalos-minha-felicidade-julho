#!/usr/bin/env bun
/**
 * Loads the canonical private HML package and invokes the sector cohort fixture
 * with staging-only aliases in the child environment. Values stay in memory.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { stripJsonComments } from "./derive-private-wrangler-config";
import { projectRefFromUrl } from "../../src/lib/staging/staging-guard";

const PRIVATE_POINTER_FILE = "README-PRIVATE-CONFIG-POINTER.txt";
const PRIVATE_SECRETS_FILE = "secrets.hml.private.json";
const CONFIRM_APPLY = "--confirm-sector-smoke-cohorts";

export const CHILD_ENV_APPLICATION_ALLOWLIST = [
  "STAGING_SUPABASE_URL",
  "STAGING_SUPABASE_PUBLISHABLE_KEY",
  "STAGING_SUPABASE_SECRET_KEY",
  "STAGING_SUPABASE_PROJECT_REF",
  "FIBT_HML_AUTHORIZED_STAGING_REF",
] as const;

export const CHILD_ENV_RUNTIME_ALLOWLIST = [
  "PATH",
  "Path",
  "SystemRoot",
  "WINDIR",
  "TEMP",
  "TMP",
  "HOME",
  "USERPROFILE",
] as const;

type Environment = Record<string, string | undefined>;

export interface LoadedPrivateFixtureEnvironment {
  environment: Environment;
  stagingProjectRef: string;
}

export interface PrivateFixtureInvocation {
  executable: string;
  args: string[];
  options: {
    cwd: string;
    env: Environment;
    stdio: "inherit";
  };
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function requireString(source: Record<string, unknown>, name: string): string {
  const value = source[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`private HML config is missing ${name}`);
  }
  return value.trim();
}

function readJsonObject(path: string, jsonc = false): Record<string, unknown> {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error("required private HML config file is missing");
  }
  const source = readFileSync(path, "utf8");
  return requireObject(
    JSON.parse(jsonc ? stripJsonComments(source) : source),
    "private HML config",
  );
}

function resolveInside(root: string, child: string): string {
  const normalizedRoot = resolve(root);
  const normalizedChild = resolve(normalizedRoot, child.replaceAll("\\", sep));
  const displacement = relative(normalizedRoot, normalizedChild);
  if (displacement.startsWith("..") || isAbsolute(displacement)) {
    throw new Error("private HML config pointer escapes its root");
  }
  return normalizedChild;
}

function resolveActiveWranglerPath(privateRoot: string): string {
  const pointerPath = resolveInside(privateRoot, PRIVATE_POINTER_FILE);
  if (!existsSync(pointerPath) || !statSync(pointerPath).isFile()) {
    throw new Error(`${PRIVATE_POINTER_FILE} is missing`);
  }

  const pointer = readFileSync(pointerPath, "utf8");
  const activeStart = pointer.indexOf("Configuracao ATIVA");
  const historicalStart = pointer.indexOf("Configuracao HISTORICA");
  if (activeStart < 0 || historicalStart <= activeStart) {
    throw new Error("private HML config pointer has no unambiguous active section");
  }
  const activeSection = pointer.slice(activeStart, historicalStart);
  const match = activeSection.match(/^\s+(.+wrangler\.hml\.private\.jsonc)\s*$/m);
  if (!match?.[1]) {
    throw new Error("private HML config pointer has no active Wrangler path");
  }
  return resolveInside(privateRoot, match[1]);
}

function projectRefWithoutValueDisclosure(url: string): string {
  try {
    return projectRefFromUrl(url);
  } catch {
    throw new Error("private HML SUPABASE_URL is not a valid Supabase project URL");
  }
}

export function loadPrivateStagingFixtureEnvironment(
  privateRoot: string,
  baseEnvironment: Environment = process.env,
): LoadedPrivateFixtureEnvironment {
  if (!existsSync(privateRoot) || !statSync(privateRoot).isDirectory()) {
    throw new Error("private HML config root is missing");
  }

  const activeConfig = readJsonObject(resolveActiveWranglerPath(privateRoot), true);
  const vars = requireObject(activeConfig.vars, "private HML Wrangler vars");
  const secrets = readJsonObject(resolveInside(privateRoot, PRIVATE_SECRETS_FILE));

  const dbTarget = requireString(vars, "VITALOS_DB_TARGET");
  const runtimeEnvironment = requireString(vars, "VITALOS_RUNTIME_ENV");
  if (dbTarget !== "staging" || runtimeEnvironment !== "preview") {
    throw new Error("private HML config is not an HML/staging package");
  }

  const stagingUrl = requireString(vars, "SUPABASE_URL");
  const publishableKey = requireString(vars, "SUPABASE_PUBLISHABLE_KEY");
  const secretKey = requireString(secrets, "SUPABASE_SERVICE_ROLE_KEY");
  const stagingProjectRef = projectRefWithoutValueDisclosure(stagingUrl);
  const authorizedStagingRef = requireString(vars, "FIBT_HML_AUTHORIZED_STAGING_REF");
  const declaredStagingRef = requireString(vars, "VITALOS_STAGING_PROJECT_REF");
  const productionProjectRef = requireString(vars, "VITALOS_PRODUCTION_PROJECT_REF");

  if (stagingProjectRef !== authorizedStagingRef || stagingProjectRef !== declaredStagingRef) {
    throw new Error("private HML staging project declarations do not match the target URL");
  }
  if (stagingProjectRef === productionProjectRef) {
    throw new Error("private HML staging target matches the denied production project");
  }

  const environment: Environment = {};
  for (const name of CHILD_ENV_RUNTIME_ALLOWLIST) {
    const value = baseEnvironment[name];
    if (value !== undefined) environment[name] = value;
  }

  environment.STAGING_SUPABASE_URL = stagingUrl;
  environment.STAGING_SUPABASE_PUBLISHABLE_KEY = publishableKey;
  environment.STAGING_SUPABASE_SECRET_KEY = secretKey;
  environment.STAGING_SUPABASE_PROJECT_REF = stagingProjectRef;
  environment.FIBT_HML_AUTHORIZED_STAGING_REF = stagingProjectRef;

  return {
    stagingProjectRef,
    environment,
  };
}

export interface PrivateFixtureRunnerArgs {
  privateRoot: string;
  mode: "dry-run" | "guard-preflight" | "apply";
}

export function parsePrivateFixtureRunnerArgs(argv: string[]): PrivateFixtureRunnerArgs {
  let privateRoot: string | undefined;
  let dryRun = false;
  let guardPreflight = false;
  let apply = false;
  let applyConfirmed = false;
  const seen = new Set<string>();

  const markSeen = (name: string): void => {
    if (seen.has(name)) throw new Error(`duplicate private HML runner argument: ${name}`);
    seen.add(name);
  };

  for (let index = 0; index < argv.length; index++) {
    const raw = argv[index]!;
    if (raw === "--private-root") {
      markSeen("--private-root");
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error("--private-root requires a path");
      privateRoot = value;
      continue;
    }
    if (raw.startsWith("--private-root=")) {
      markSeen("--private-root");
      privateRoot = raw.slice("--private-root=".length);
      continue;
    }
    if (raw.startsWith("--environment") || raw.startsWith("--expected-project-ref")) {
      throw new Error("the private HML runner owns environment and project-ref arguments");
    }
    if (raw === "--dry-run") {
      markSeen(raw);
      dryRun = true;
      continue;
    }
    if (raw === "--guard-preflight") {
      markSeen(raw);
      guardPreflight = true;
      continue;
    }
    if (raw === "--apply") {
      markSeen(raw);
      apply = true;
      continue;
    }
    if (raw === CONFIRM_APPLY) {
      markSeen(raw);
      applyConfirmed = true;
      continue;
    }
    throw new Error(`unrecognized private HML runner argument: ${raw}`);
  }

  if (!privateRoot?.trim()) throw new Error("--private-root is required");
  if ([dryRun, guardPreflight, apply].filter(Boolean).length > 1) {
    throw new Error("--dry-run, --guard-preflight and --apply are mutually exclusive");
  }
  if (apply && !applyConfirmed) {
    throw new Error(`${CONFIRM_APPLY} is required with --apply`);
  }
  if (!apply && applyConfirmed) {
    throw new Error(`${CONFIRM_APPLY} is accepted only with --apply`);
  }

  return {
    privateRoot: privateRoot.trim(),
    mode: apply ? "apply" : guardPreflight ? "guard-preflight" : "dry-run",
  };
}

export function createPrivateFixtureInvocation(
  argv: string[],
  baseEnvironment: Environment = process.env,
  executable = process.execPath,
  cwd = process.cwd(),
): PrivateFixtureInvocation {
  const { privateRoot, mode } = parsePrivateFixtureRunnerArgs(argv);
  const loaded = loadPrivateStagingFixtureEnvironment(privateRoot, baseEnvironment);
  const fixturePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "ensure-sector-smoke-cohorts.ts",
  );

  const modeArgs =
    mode === "apply"
      ? ["--apply", CONFIRM_APPLY]
      : mode === "guard-preflight"
        ? ["--guard-preflight"]
        : ["--dry-run"];

  return {
    executable,
    args: [
      fixturePath,
      "--environment=staging",
      `--expected-project-ref=${loaded.stagingProjectRef}`,
      ...modeArgs,
    ],
    options: {
      cwd,
      env: loaded.environment,
      stdio: "inherit",
    },
  };
}

if (import.meta.main) {
  try {
    const invocation = createPrivateFixtureInvocation(process.argv.slice(2));
    console.log("VITALOS_FIBT_PRIVATE_ENV_FIXTURE_RUNNER");
    console.log("PRIVATE_CONFIG_LOADER=ACTIVE_PRIVATE_POINTER");
    console.log("TARGET_ENVIRONMENT=HML/STAGING");
    console.log("SECRET_VALUES_PRINTED=false");

    const child = spawnSync(invocation.executable, invocation.args, invocation.options);
    if (child.error) throw new Error("fixture child process could not be started");
    process.exit(child.status ?? 1);
  } catch (error) {
    console.error("PRIVATE_ENV_RUNNER_ABORTED=true");
    console.error(error instanceof Error ? error.message : "unknown private environment error");
    process.exit(1);
  }
}
