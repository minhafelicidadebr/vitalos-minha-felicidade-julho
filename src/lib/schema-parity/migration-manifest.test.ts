// Gate de integridade das migrations (Q1.1 — GATE 2). Falha o build se uma
// migration já aplicada for editada, removida ou reordenada silenciosamente.
//
// Isso importa neste repo especificamente porque as migrations foram aplicadas
// no staging pelo SQL Editor do painel (sem histórico formal em
// supabase_migrations.schema_migrations, que só o CLI mantém). Sem o manifesto,
// editar uma migration já aplicada não deixaria nenhum rastro detectável.

import { describe, expect, test } from "bun:test";
import {
  buildManifest,
  readStoredManifest,
  diffManifests,
  describeDrift,
  type MigrationManifest,
} from "./migration-manifest";

describe("manifesto de migrations — integridade do repositório", () => {
  const stored = readStoredManifest();
  const current = buildManifest();

  test("o manifesto versionado corresponde exatamente aos arquivos em disco", () => {
    const drift = diffManifests(stored, current);
    if (drift.length > 0) {
      throw new Error(
        `Migrations divergem do manifesto:\n${describeDrift(drift)}\n\n` +
          "Se a mudança é intencional, rode: bun run manifest:write",
      );
    }
    expect(drift).toEqual([]);
  });

  test("rollup bate (uma única comparação cobre conteúdo, ordem e presença)", () => {
    expect(current.rollupSha256).toBe(stored.rollupSha256);
  });

  test("toda migration tem prefixo de timestamp — ordem lexicográfica = ordem cronológica", () => {
    const semTimestamp = current.migrations
      .map((m) => m.name)
      .filter((name) => !/^\d{14}_/.test(name));
    expect(semTimestamp).toEqual([]);
  });

  test("nenhum nome de migration duplicado", () => {
    const names = current.migrations.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("ordem é densa e começa em 1 (sem buraco na numeração)", () => {
    const orders = current.migrations.map((m) => m.order);
    expect(orders).toEqual(orders.map((_, i) => i + 1));
  });

  // Truncamento real = arquivo sem nenhum statement. Um no-op explícito
  // ("SELECT 1;") não é truncamento: existe pelo menos um no repo
  // (20260710121521_ac98d677-…, 9 bytes), gerado por commit automático do
  // Lovable quando nada mudou de fato. É inofensivo e já está aplicado —
  // o que precisa falhar é arquivo VAZIO, que indicaria perda de conteúdo.
  test("nenhuma migration vazia (arquivo truncado passaria despercebido)", () => {
    const vazias = current.migrations.filter((m) => m.bytes === 0).map((m) => m.name);
    expect(vazias).toEqual([]);
  });

  test("sanity do próprio gate: o manifesto não está vazio", () => {
    expect(current.migrationCount).toBeGreaterThan(30);
  });
});

describe("diffManifests — motor puro detecta cada classe de drift", () => {
  const base: MigrationManifest = {
    generatedFor: "supabase/migrations",
    migrationCount: 2,
    rollupSha256: "irrelevante-para-o-diff",
    migrations: [
      { order: 1, name: "20260101000000_a.sql", sha256: "aaa", bytes: 100 },
      { order: 2, name: "20260102000000_b.sql", sha256: "bbb", bytes: 200 },
    ],
  };

  function withMigrations(migrations: MigrationManifest["migrations"]): MigrationManifest {
    return { ...base, migrations, migrationCount: migrations.length };
  }

  test("detecta migration nova", () => {
    const current = withMigrations([
      ...base.migrations,
      { order: 3, name: "20260103000000_c.sql", sha256: "ccc", bytes: 300 },
    ]);
    expect(diffManifests(base, current)).toEqual([
      { kind: "added", name: "20260103000000_c.sql" },
    ]);
  });

  test("detecta migration alterada (mesmo nome, hash diferente)", () => {
    const current = withMigrations([
      base.migrations[0]!,
      { ...base.migrations[1]!, sha256: "MUDOU" },
    ]);
    expect(diffManifests(base, current)).toEqual([
      { kind: "modified", name: "20260102000000_b.sql" },
    ]);
  });

  test("detecta migration removida", () => {
    const current = withMigrations([base.migrations[0]!]);
    expect(diffManifests(base, current)).toEqual([
      { kind: "removed", name: "20260102000000_b.sql" },
    ]);
  });

  // Trocar duas migrations de posição move AS DUAS — o motor acusa drift em
  // ambas, não só na que "subiu". É o comportamento correto: as duas mudaram
  // de posição, e as duas passariam a rodar em ordem diferente da aplicada.
  test("detecta reordenação (mesmo conteúdo, posição trocada) nas duas migrations afetadas", () => {
    const current = withMigrations([
      { ...base.migrations[1]!, order: 1 },
      { ...base.migrations[0]!, order: 2 },
    ]);
    expect(diffManifests(base, current)).toEqual([
      { kind: "reordered", name: "20260102000000_b.sql", from: 2, to: 1 },
      { kind: "reordered", name: "20260101000000_a.sql", from: 1, to: 2 },
    ]);
  });

  test("manifesto idêntico não acusa drift", () => {
    expect(diffManifests(base, base)).toEqual([]);
  });
});
