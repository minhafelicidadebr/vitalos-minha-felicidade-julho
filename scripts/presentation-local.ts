// Isolated, database-free local presentation. Reads only its own ignored verifier.
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const sandbox = resolve(root, ".presentation.local");
const app = join(sandbox, "app");
const configPath = join(sandbox, "access.json");
if (!existsSync(configPath))
  throw new Error(
    "Configure the private local verifier in .presentation.local/access.json before starting. Never put a password in source.",
  );
const config = JSON.parse(readFileSync(configPath, "utf8")) as { verifier: string };
if (!/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.verifier))
  throw new Error("Invalid private verifier.");
mkdirSync(app, { recursive: true });
for (const name of [
  "src",
  "public",
  "scripts/environment-preflight.ts",
  "vite.config.ts",
  "tsconfig.json",
  "package.json",
  "bun.lock",
  "index.html",
]) {
  if (!existsSync(join(root, name))) continue;
  mkdirSync(resolve(app, name, ".."), { recursive: true });
  cpSync(join(root, name), join(app, name), { recursive: true });
}
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    /^(PATH|SystemRoot|WINDIR|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|TEMP|TMP|BUN_INSTALL|NUMBER_OF_PROCESSORS)$/i.test(
      key,
    ),
  ),
) as Record<string, string>;
Object.assign(env, {
  VITALOS_RUNTIME_ENV: "ci",
  VITALOS_DB_TARGET: "test",
  SUPABASE_URL: "https://ci.invalid",
  VITE_SUPABASE_URL: "https://ci.invalid",
  SUPABASE_PUBLISHABLE_KEY: "presentation-inert-placeholder",
  VITE_SUPABASE_PUBLISHABLE_KEY: "presentation-inert-placeholder",
  VITE_APP_URL: "http://localhost:8093",
  VITE_FIBT_PILOT_ENABLED: "false",
  VITALOS_PRESENTATION_ORIGIN: "http://localhost:8093",
  VITALOS_PRESENTATION_VERIFIER: config.verifier,
  VITALOS_PRESENTATION_STORE: "single-process",
});
const preflight = Bun.spawn(
  ["bun", "--no-env-file", "scripts/environment-preflight.ts", "--runtime=ci", "--db=test"],
  { cwd: app, env, stdout: "inherit", stderr: "inherit" },
);
if (await preflight.exited) throw new Error("Inert environment preflight failed.");
console.log(
  "Presentation-only local sandbox: http://localhost:8093/apresentacao/empresas · no database, no inherited credentials.",
);
const child = Bun.spawn(
  [
    "bun",
    "--no-env-file",
    join(root, "node_modules/vite/bin/vite.js"),
    "--host",
    "127.0.0.1",
    "--port",
    "8093",
    "--strictPort",
  ],
  { cwd: app, env, stdout: "inherit", stderr: "inherit" },
);
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
process.exitCode = await child.exited;
