// Build inerte em cópia isolada. Não lê .env, não copia credenciais/.q e
// não escreve na .output preservada nem instala dependências.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
const root = process.cwd();
function footprint(path: string): unknown[] {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const file = join(path, entry.name);
      if (entry.isDirectory()) return [entry.name, footprint(file)];
      const stat = statSync(file);
      return [entry.name, stat.size, stat.mtimeMs];
    });
}
const previousOutput = JSON.stringify(footprint(join(root, ".output")));
const destination = resolve(root, ".institutional-admin.local", `module-build-${Date.now()}`);
if (!destination.startsWith(resolve(root, ".institutional-admin.local") + "\\"))
  throw new Error("Destino fora do harness.");
mkdirSync(destination, { recursive: true });
for (const name of [
  "src",
  "public",
  "vite.config.ts",
  "tsconfig.json",
  "package.json",
  "bun.lock",
  "index.html",
]) {
  if (existsSync(join(root, name)))
    cpSync(join(root, name), join(destination, name), { recursive: true });
}
mkdirSync(join(destination, "scripts"));
for (const name of ["environment-preflight.ts", "build-secret-scan.ts"])
  cpSync(join(root, "scripts", name), join(destination, "scripts", name));
// O Vite resolve as dependências pelo ancestral; cache também fica isolado.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([k]) =>
    /^(PATH|SystemRoot|WINDIR|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|TEMP|TMP|BUN_INSTALL|NUMBER_OF_PROCESSORS)$/i.test(
      k,
    ),
  ),
) as Record<string, string>;
Object.assign(env, {
  VITALOS_RUNTIME_ENV: "ci",
  VITALOS_DB_TARGET: "test",
  SUPABASE_URL: "https://ci.invalid",
  VITE_SUPABASE_URL: "https://ci.invalid",
  SUPABASE_PUBLISHABLE_KEY: "ci-placeholder-key",
  VITE_SUPABASE_PUBLISHABLE_KEY: "ci-placeholder-key",
  VITE_APP_URL: "https://app.ci.invalid",
  VITE_FIBT_PILOT_ENABLED: "false",
});
async function run(args: string[]) {
  const child = Bun.spawn(args, { cwd: destination, env, stdout: "inherit", stderr: "inherit" });
  if (await child.exited) throw new Error("Build/verificação isolada falhou.");
}
await run(["bun", "run", "scripts/environment-preflight.ts", "--runtime=ci", "--db=test"]);
await run(["bun", join(root, "node_modules/vite/bin/vite.js"), "build"]);
await run(["bun", "run", "scripts/build-secret-scan.ts", "--require-artifact"]);
if (previousOutput !== JSON.stringify(footprint(join(root, ".output"))))
  throw new Error("Metadados da .output preservada mudaram.");
writeFileSync(
  join(root, ".institutional-admin.local", "module-build-proof.json"),
  JSON.stringify(
    { recordedAt: new Date().toISOString(), destination, inert: true, preservedRootOutput: true },
    null,
    2,
  ),
);
console.log("PASS build inerte isolado: " + destination);
