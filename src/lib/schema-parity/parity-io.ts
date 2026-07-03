// Camada de I/O da paridade de schema — lê os arquivos reais do repo e liga o
// motor puro (parity-core) ao manifesto (schema-manifest). Roda em bun (teste e
// runner). NÃO é importada por nenhum código de aplicação, então nunca entra no
// bundle do cliente — pode usar fs/Glob à vontade.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import {
  parseDefinedSchema,
  findRpcUsages,
  checkParity,
  type ParityReport,
  type SqlSource,
  type TsSource,
} from "./parity-core";
import { COLUMN_DEPENDENCIES } from "./schema-manifest";

/** Raiz do repositório — os dois consumidores (teste e runner) rodam a partir dela. */
export function repoRoot(): string {
  return process.cwd();
}

export function collectSqlSources(root = repoRoot()): SqlSource[] {
  const dir = join(root, "supabase", "migrations");
  const glob = new Glob("*.sql");
  const out: SqlSource[] = [];
  for (const name of glob.scanSync({ cwd: dir })) {
    out.push({ name, content: readFileSync(join(dir, name), "utf8") });
  }
  return out;
}

export function collectTsSources(root = repoRoot()): TsSource[] {
  const dir = join(root, "src");
  const glob = new Glob("**/*.{ts,tsx}");
  const out: TsSource[] = [];
  for (const rel of glob.scanSync({ cwd: dir })) {
    const norm = rel.replace(/\\/g, "/");
    // Ignora testes (fixtures citam .rpc("f1") como dado, não como uso real) e o
    // PRÓPRIO módulo de paridade — que é denso em aspas e regex sobre .rpc()/SQL
    // por definição, e nunca faz chamada .rpc() de verdade (é parsing puro).
    if (norm.includes(".test.")) continue;
    if (norm.startsWith("lib/schema-parity/")) continue;
    out.push({ name: `src/${norm}`, content: readFileSync(join(dir, rel), "utf8") });
  }
  return out;
}

/** Executa a checagem completa contra os arquivos reais do repositório. */
export function runParity(root = repoRoot()): ParityReport {
  const defined = parseDefinedSchema(collectSqlSources(root));
  const rpcUsages = findRpcUsages(collectTsSources(root));
  return checkParity(defined, rpcUsages, COLUMN_DEPENDENCIES);
}
