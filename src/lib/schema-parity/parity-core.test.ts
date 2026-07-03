import { describe, expect, test } from "bun:test";
import {
  parseDefinedSchema,
  findRpcUsages,
  checkParity,
  formatParityReport,
  blankComments,
  type ColumnDependency,
} from "./parity-core";

const MIGRATION_A = {
  name: "001_base.sql",
  content: `
    -- tabela de organizações
    CREATE TABLE IF NOT EXISTS public.organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'pilot',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE OR REPLACE FUNCTION public.count_wave_responses(p_wave_id UUID)
    RETURNS INTEGER LANGUAGE sql AS $$ SELECT 0 $$;
  `,
};

const MIGRATION_B = {
  name: "002_add.sql",
  content: `
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cnpj TEXT;
    CREATE FUNCTION mark_invite_used(p_token TEXT) RETURNS void LANGUAGE sql AS $$ $$;
  `,
};

describe("parseDefinedSchema", () => {
  test("extrai tabelas, colunas tipadas e funções (create + create or replace)", () => {
    const s = parseDefinedSchema([MIGRATION_A, MIGRATION_B]);
    expect(s.tables.has("organizations")).toBe(true);
    expect(s.functions.has("count_wave_responses")).toBe(true);
    expect(s.functions.has("mark_invite_used")).toBe(true);
  });

  test("captura colunas do CREATE TABLE ancoradas por tipo, ignorando constraints", () => {
    const s = parseDefinedSchema([MIGRATION_A]);
    const cols = s.columns.get("organizations")!;
    expect(cols.has("id")).toBe(true);
    expect(cols.has("slug")).toBe(true);
    expect(cols.has("plan")).toBe(true);
    expect(cols.has("created_at")).toBe(true);
    // "PRIMARY KEY" e "UNIQUE" não podem virar colunas
    expect(cols.has("primary")).toBe(false);
    expect(cols.has("unique")).toBe(false);
  });

  test("mescla colunas de ALTER ADD COLUMN à tabela existente", () => {
    const s = parseDefinedSchema([MIGRATION_A, MIGRATION_B]);
    expect(s.columns.get("organizations")!.has("cnpj")).toBe(true);
  });

  test("normaliza public.x e ignora comentários", () => {
    const s = parseDefinedSchema([
      { name: "c.sql", content: "-- CREATE TABLE public.fake (x TEXT);\nCREATE TABLE public.real (x TEXT);" },
    ]);
    expect(s.tables.has("real")).toBe(true);
    expect(s.tables.has("fake")).toBe(false);
  });
});

describe("blankComments", () => {
  test("ignora .rpc() em comentário de linha e de bloco, mas mantém em código real", () => {
    const src = [
      `// exemplo: db.rpc("comentada_linha", {})`,
      `/* bloco db.rpc("comentada_bloco", {}) */`,
      `const r = db.rpc("real", {});`,
    ].join("\n");
    const usages = findRpcUsages([{ name: "x.ts", content: src }]);
    expect(usages.map((u) => u.name)).toEqual(["real"]);
    expect(usages[0]!.line).toBe(3);
  });

  test("preserva números de linha (comentário de bloco multilinha)", () => {
    const src = `line1\n/* c1\nc2 */\ndb.rpc("real", {})`;
    const usages = findRpcUsages([{ name: "y.ts", content: src }]);
    expect(usages[0]!.line).toBe(4);
  });

  test("não confunde // dentro de string com comentário", () => {
    const src = `const url = "https://x"; db.rpc("real", {})`;
    expect(blankComments(src)).toContain('"https://x"');
    expect(findRpcUsages([{ name: "z.ts", content: src }]).map((u) => u.name)).toEqual(["real"]);
  });
});

describe("findRpcUsages", () => {
  test("acha .rpc('nome') com arquivo e linha, aspas simples/duplas/crase", () => {
    const usages = findRpcUsages([
      { name: "a.ts", content: `line1\nconst x = await db.rpc("is_invite_valid_for_wave", {});` },
      { name: "b.ts", content: `await db.rpc('mark_invite_used', {})` },
    ]);
    expect(usages).toContainEqual({ name: "is_invite_valid_for_wave", file: "a.ts", line: 2 });
    expect(usages).toContainEqual({ name: "mark_invite_used", file: "b.ts", line: 1 });
  });

  test("acha múltiplas RPCs na mesma linha", () => {
    const usages = findRpcUsages([{ name: "c.ts", content: `x.rpc("f1",{}); y.rpc("f2",{})` }]);
    expect(usages.map((u) => u.name).sort()).toEqual(["f1", "f2"]);
  });
});

describe("checkParity", () => {
  const defined = parseDefinedSchema([MIGRATION_A, MIGRATION_B]);

  test("passa quando toda RPC e coluna usadas estão definidas", () => {
    const deps: ColumnDependency[] = [{ table: "organizations", column: "cnpj", usedBy: "x" }];
    const rpc = findRpcUsages([{ name: "s.ts", content: `db.rpc("count_wave_responses",{})` }]);
    const r = checkParity(defined, rpc, deps);
    expect(r.ok).toBe(true);
  });

  test("detecta RPC ausente e lista todos os call sites", () => {
    const rpc = findRpcUsages([
      { name: "s.ts", content: `db.rpc("is_invite_valid_for_wave",{})\ndb.rpc("is_invite_valid_for_wave",{})` },
    ]);
    const r = checkParity(defined, rpc, []);
    expect(r.ok).toBe(false);
    expect(r.missingFunctions).toHaveLength(1);
    expect(r.missingFunctions[0]!.name).toBe("is_invite_valid_for_wave");
    expect(r.missingFunctions[0]!.usages).toHaveLength(2);
  });

  test("detecta coluna ausente", () => {
    const deps: ColumnDependency[] = [
      { table: "organizations", column: "segment", usedBy: "onboarding" },
    ];
    const r = checkParity(defined, [], deps);
    expect(r.ok).toBe(false);
    expect(r.missingColumns).toHaveLength(1);
    expect(r.missingColumns[0]!.column).toBe("segment");
  });

  test("detecta tabela inteira ausente (distinta de coluna ausente)", () => {
    const deps: ColumnDependency[] = [
      { table: "nao_existe", column: "x", usedBy: "y" },
    ];
    const r = checkParity(defined, [], deps);
    expect(r.missingTables).toHaveLength(1);
    expect(r.missingColumns).toHaveLength(0);
  });
});

describe("formatParityReport", () => {
  test("mensagem de OK quando tudo bate", () => {
    expect(formatParityReport({ ok: true, missingFunctions: [], missingTables: [], missingColumns: [] })).toContain(
      "OK",
    );
  });

  test("mensagem de falha nomeia RPC, arquivo e linha", () => {
    const msg = formatParityReport({
      ok: false,
      missingFunctions: [{ name: "mark_invite_used", usages: [{ name: "mark_invite_used", file: "db.ts", line: 87 }] }],
      missingTables: [],
      missingColumns: [],
    });
    expect(msg).toContain("mark_invite_used");
    expect(msg).toContain("db.ts:87");
  });
});
