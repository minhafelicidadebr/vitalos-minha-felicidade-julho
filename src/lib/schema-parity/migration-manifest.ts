// Manifesto verificável das migrations (Q1.1 — GATE 2). Motor puro + I/O de
// leitura; o runner CLI vive em scripts/migration-manifest.ts e o gate de teste
// em migration-manifest.test.ts. Mesma separação já usada por parity-core /
// parity-io / schema-parity-check.ts.
//
// POR QUE ESTE ARQUIVO EXISTE: as migrations deste projeto foram aplicadas no
// staging pelo SQL Editor do painel, não pelo Supabase CLI. O CLI mantém um
// histórico formal em supabase_migrations.schema_migrations; o SQL Editor NÃO
// registra nada lá. Sem histórico formal, "o staging está igual ao repo" seria
// afirmação sem lastro. Este manifesto dá o lastro possível: identidade
// criptográfica de cada arquivo, em ordem, versionada junto do código — de modo
// que alteração silenciosa (edição de migration já aplicada, remoção ou
// reordenação) falhe o gate.
//
// LIMITE HONESTO: prova a integridade do LADO DO REPOSITÓRIO. Não lê o banco.
// A correspondência repo↔staging é provada separadamente, por comparação de
// objetos — ver docs/handoff/Q1.1_PROVA_DINAMICA_STAGING_2026-07-25.md.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

export interface MigrationEntry {
  order: number;
  name: string;
  sha256: string;
  bytes: number;
}

export interface MigrationManifest {
  generatedFor: string;
  migrationCount: number;
  /** Hash de todos os hashes, em ordem — muda se qualquer arquivo mudar, sumir ou trocar de posição. */
  rollupSha256: string;
  migrations: MigrationEntry[];
}

export function migrationsDir(root = process.cwd()): string {
  return join(root, "supabase", "migrations");
}

export function manifestPath(root = process.cwd()): string {
  return join(root, "supabase", "migrations.manifest.json");
}

/** Normaliza CRLF→LF para o hash ser idêntico em Windows e Linux (o repo tem arquivos CRLF). */
function normalize(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

export function buildManifest(dir = migrationsDir()): MigrationManifest {
  const glob = new Glob("*.sql");
  // Ordem lexicográfica = ordem cronológica, porque todo arquivo é prefixado
  // com timestamp YYYYMMDDHHMMSS. É a MESMA ordem que o Supabase CLI aplicaria.
  const names = [...glob.scanSync({ cwd: dir })].sort();

  const migrations: MigrationEntry[] = names.map((name, i) => {
    const normalized = normalize(readFileSync(join(dir, name), "utf8"));
    return {
      order: i + 1,
      name,
      sha256: createHash("sha256").update(normalized, "utf8").digest("hex"),
      bytes: Buffer.byteLength(normalized, "utf8"),
    };
  });

  return {
    generatedFor: "supabase/migrations",
    migrationCount: migrations.length,
    rollupSha256: createHash("sha256")
      .update(migrations.map((m) => `${m.order}:${m.name}:${m.sha256}`).join("\n"), "utf8")
      .digest("hex"),
    migrations,
  };
}

export function readStoredManifest(path = manifestPath()): MigrationManifest {
  return JSON.parse(readFileSync(path, "utf8")) as MigrationManifest;
}

export type ManifestDrift =
  | { kind: "added"; name: string }
  | { kind: "removed"; name: string }
  | { kind: "modified"; name: string }
  | { kind: "reordered"; name: string; from: number; to: number };

/** Pura: compara dois manifestos e devolve a lista de divergências (vazia = íntegro). */
export function diffManifests(
  stored: MigrationManifest,
  current: MigrationManifest,
): ManifestDrift[] {
  const drift: ManifestDrift[] = [];
  const storedByName = new Map(stored.migrations.map((m) => [m.name, m]));
  const currentByName = new Map(current.migrations.map((m) => [m.name, m]));

  for (const m of current.migrations) {
    const before = storedByName.get(m.name);
    if (!before) drift.push({ kind: "added", name: m.name });
    else if (before.sha256 !== m.sha256) drift.push({ kind: "modified", name: m.name });
    else if (before.order !== m.order)
      drift.push({ kind: "reordered", name: m.name, from: before.order, to: m.order });
  }
  for (const m of stored.migrations) {
    if (!currentByName.has(m.name)) drift.push({ kind: "removed", name: m.name });
  }
  return drift;
}

export function describeDrift(drift: ManifestDrift[]): string {
  return drift
    .map((d) => {
      switch (d.kind) {
        case "added":
          return `  + NOVA:       ${d.name}`;
        case "removed":
          return `  - REMOVIDA:   ${d.name}`;
        case "modified":
          return `  ~ ALTERADA:   ${d.name}`;
        case "reordered":
          return `  ↕ REORDENADA: ${d.name} (${d.from} → ${d.to})`;
      }
    })
    .join("\n");
}
