// Prévia local isolada da proposta comercial (/proposta), sem banco e sem credenciais herdadas.
// Mesmo desenho de scripts/presentation-local.ts. Lê só o verificador privado e ignorado
// em .proposal.local/access.json ({ "verifier": "scrypt-v1:..." }). Nunca ponha senha no código.
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PORT = "8094";
const root = process.cwd();
const sandbox = resolve(root, ".proposal.local");
const app = join(sandbox, "app");
const configPath = join(sandbox, "access.json");
if (!existsSync(configPath))
  throw new Error("Configure o verificador local em .proposal.local/access.json antes de iniciar.");
const config = JSON.parse(readFileSync(configPath, "utf8")) as { verifier: string };
if (!/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.verifier))
  throw new Error("Verificador inválido.");
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
  SUPABASE_PUBLISHABLE_KEY: "proposal-inert-placeholder",
  VITE_SUPABASE_PUBLISHABLE_KEY: "proposal-inert-placeholder",
  VITE_APP_URL: `http://localhost:${PORT}`,
  VITE_FIBT_PILOT_ENABLED: "false",
  VITALOS_PROPOSAL_ORIGIN: `http://localhost:${PORT},http://127.0.0.1:${PORT}`,
  VITALOS_PROPOSAL_VERIFIER: config.verifier,
});
const preflight = Bun.spawn(
  ["bun", "--no-env-file", "scripts/environment-preflight.ts", "--runtime=ci", "--db=test"],
  {
    cwd: app,
    env,
    stdout: "inherit",
    stderr: "inherit",
  },
);
if (await preflight.exited) throw new Error("Preflight do ambiente inerte falhou.");
console.log(
  `Prévia isolada da proposta: http://localhost:${PORT}/proposta · sem banco, sem credenciais herdadas.`,
);
const child = Bun.spawn(
  [
    "bun",
    "--no-env-file",
    join(root, "node_modules/vite/bin/vite.js"),
    "--host",
    "127.0.0.1",
    "--port",
    PORT,
    "--strictPort",
  ],
  { cwd: app, env, stdout: "inherit", stderr: "inherit" },
);
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
process.exitCode = await child.exited;
