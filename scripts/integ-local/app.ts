// Sobe o app deste checkout em 127.0.0.1:8094 contra a pilha descartável vitalos-q1q2-integ.
// O guard e o preflight local rodam antes; nenhum valor sensível é impresso.
// Uso: bun --no-env-file scripts/integ-local/app.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
const here = import.meta.dir;
const repo = join(here, "..", "..");
const guard = Bun.spawnSync(["sh", join(here, "guard.sh")]);
if (guard.exitCode !== 0) throw new Error(guard.stdout.toString() + guard.stderr.toString());
console.log(guard.stdout.toString().trim());
const keys = Object.fromEntries(
  readFileSync(join(here, ".env.integ"), "utf8").trim().split(/\r?\n/).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const API = "http://127.0.0.1:57921";
const env: Record<string, string> = {
  ...(Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^(VITE_|SUPABASE_|VITALOS_|FIBT_|STAGING_)/.test(k)),
  ) as Record<string, string>),
  VITALOS_RUNTIME_ENV: "local",
  VITALOS_DB_TARGET: "local",
  SUPABASE_URL: API,
  VITE_SUPABASE_URL: API,
  SUPABASE_PUBLISHABLE_KEY: keys.ANON_KEY!,
  VITE_SUPABASE_PUBLISHABLE_KEY: keys.ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: keys.SERVICE_ROLE_KEY!,
  VITE_APP_URL: "http://localhost:8094",
  PLATFORM_ADMIN_EMAILS: "platform@integ.test",
  VITE_FIBT_PILOT_ENABLED: "true",
  VITALOS_LOCAL_FIXTURE_CAPABILITIES: "ACTION_PLAN",
};
const pre = Bun.spawn(["bun", "--no-env-file", "run", "scripts/environment-preflight.ts", "--runtime=local", "--db=local"], {
  cwd: repo,
  env,
  stdout: "inherit",
  stderr: "inherit",
});
if (await pre.exited) throw new Error("Preflight local recusou.");
const child = Bun.spawn(["node", join(repo, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "8094", "--strictPort"], {
  cwd: repo,
  env,
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(await child.exited);
