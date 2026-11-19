// Sobe o app DESTE checkout/worktree numa porta própria contra o stack institucional
// local já existente (nunca o inicia, reinicia ou reseta).
//
//   bun --no-env-file run scripts/institutional-app-port.ts --stack-root <checkout com .institutional-admin.local> [--port 8092]
//
// A validação do alvo (API 57621, DB 57622, container, project_id) é a de
// `institutionalEnv()`; o launcher deriva a raiz de process.cwd(), por isso o
// processo entra no stack-root só para validar e volta ao checkout atual.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseAppPort } from "./institutional-tenant-guards";

const here = process.cwd();
const argv = process.argv.slice(2);
const port = parseAppPort(argv);
const stackFlag = argv.indexOf("--stack-root");
const stackRoot = resolve(stackFlag >= 0 ? argv[stackFlag + 1]! : here);
if (!existsSync(join(stackRoot, ".institutional-admin.local", "supabase", "config.toml"))) {
  throw new Error("--stack-root não contém .institutional-admin.local; nada foi iniciado.");
}

process.chdir(stackRoot);
const { institutionalEnv } = await import(join(stackRoot, "scripts/institutional-local.ts"));
const env: Record<string, string> = await institutionalEnv();
process.chdir(here);

const childEnv = Object.fromEntries(
  Object.entries({ ...process.env, ...env, VITE_APP_URL: `http://localhost:${port}` }).filter(
    ([key]) => !/^(VITALOS_IVO_|FIBT_HML_|VITE_FIBT_HML_|STAGING_)/.test(key),
  ),
) as Record<string, string>;
// Equivalente a `institutional-local.ts dev --learning`: o ciclo de ação fica disponível.
childEnv.VITALOS_LOCAL_FIXTURE_CAPABILITIES = "ACTION_PLAN";

const preflight = Bun.spawn(["bun", "--no-env-file", "run", "scripts/environment-preflight.ts", "--runtime=local", "--db=local"], {
  cwd: here, env: childEnv, stdout: "inherit", stderr: "inherit",
});
if (await preflight.exited) throw new Error("Preflight local recusou o harness.");
console.log(`Alvo validado: API 127.0.0.1:57621 · DB 57622 · app ${port} (${here})`);
const child = Bun.spawn(["node", join(here, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: here, env: childEnv, stdout: "inherit", stderr: "inherit",
});
process.exit(await child.exited);
