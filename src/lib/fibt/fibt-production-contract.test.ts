// Contrato da Migration B PRODUTIVA (FIBT-D2B).
//
// A Migration B de staging (20260730160000) permanece imutável: suas
// preconditions codificam o inventário do piloto sintético (16 respostas
// afetadas, duas organizações 'a0000000-…') e não valem em produção. Este
// arquivo prova que a migration produtiva é uma coisa diferente, com o
// baseline correto, e que nada no código de runtime ainda depende da coluna
// removida.
//
// Prova estática de contrato — não executa SQL, não abre conexão.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const raiz = join(import.meta.dir, "..", "..", "..");
const dirMigrations = join(raiz, "supabase", "migrations");

const PRODUCAO = "20260806210000_drop_response_invite_link_contract_production.sql";
const STAGING = "20260730160000_drop_response_invite_link_contract.sql";

const ler = (p: string) => readFileSync(join(raiz, p), "utf8");
const migration = (nome: string) => readFileSync(join(dirMigrations, nome), "utf8");

/**
 * Só o SQL que o PostgreSQL executa: sem linhas de comentário e sem o
 * CONTEÚDO de literais entre aspas simples.
 *
 * Sem remover os literais, uma checagem de palavra-chave acusa falso positivo:
 * o texto do `COMMENT ON TABLE` desta migration contém "sem GRANT de SELECT" e
 * os comentários explicam por que não há CASCADE. Nenhum dos dois é statement.
 */
const executavel = (sql: string) =>
  sql
    .split("\n")
    .filter((l) => !/^\s*--/.test(l))
    .join("\n")
    .replace(/'(?:[^']|'')*'/g, "''");

describe("Migration B produtiva — identidade e não-reuso do staging", () => {
  test("o arquivo produtivo existe e é distinto do de staging", () => {
    const nomes = [...new Glob("*.sql").scanSync({ cwd: dirMigrations })];
    expect(nomes).toContain(PRODUCAO);
    expect(nomes).toContain(STAGING);
    expect(migration(PRODUCAO)).not.toBe(migration(STAGING));
  });

  test("a migration de staging NÃO foi modificada: mantém seus valores fixos", () => {
    const sql = migration(STAGING);
    expect(sql).toContain("AFETADAS_ESPERADAS CONSTANT INTEGER := 16");
    expect(sql).toContain("a0000000-0000-0000-0000-000000000001");
  });

  test("a produtiva não herda nenhum valor fixo do dataset de staging", () => {
    // No CÓDIGO executável. O cabeçalho cita `AFETADAS_ESPERADAS = 16` de
    // propósito, para registrar por que este arquivo existe — citar não é herdar.
    const sql = executavel(migration(PRODUCAO));
    expect(sql).not.toContain("AFETADAS_ESPERADAS");
    expect(sql).not.toContain("a0000000-0000-0000-0000-000000000001");
    expect(sql).not.toContain("a0000000-0000-0000-0000-000000000002");
    expect(sql).not.toContain("example.invalid");
    expect(migration(PRODUCAO)).toMatch(/--.*AFETADAS_ESPERADAS = 16/);
  });

  test("a produtiva usa exatamente as três ondas legadas do inventário produtivo", () => {
    const sql = migration(PRODUCAO);
    for (const id of [
      "83c204a5-686c-4b0e-ad2b-405e12c67ae9",
      "dbd534fe-ab7c-4f75-aa65-0f768195e4bb",
      "851c9aa3-8556-4a02-ac23-ce68ceca7d14",
    ]) {
      expect(sql).toContain(id);
    }
  });
});

describe("Migration B produtiva — DDL mínimo e fail-closed", () => {
  const sql = executavel(migration(PRODUCAO));

  test("exatamente um DROP COLUMN, e é o da coluna alvo", () => {
    const drops = sql.match(/DROP\s+COLUMN/gi) ?? [];
    expect(drops.length).toBe(1);
    expect(sql).toMatch(/ALTER TABLE public\.wave_responses DROP COLUMN invite_token;/);
  });

  test("sem CASCADE executável (a palavra só aparece explicando por que não há)", () => {
    expect(sql).not.toMatch(/\bCASCADE\b/i);
    expect(migration(PRODUCAO)).toMatch(/--.*CASCADE/i);
  });

  test("sem IF EXISTS no DROP COLUMN — coluna ausente não pode virar no-op", () => {
    expect(sql).not.toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS/i);
  });

  test("não remove tabela, resposta, convite nem onda", () => {
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/\bDELETE\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
  });

  test("nenhuma escrita de dado: sem INSERT e sem UPDATE", () => {
    expect(sql).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(sql).not.toMatch(/\bUPDATE\s+public\./i);
  });

  test("não altera ACL: sem GRANT e sem REVOKE", () => {
    expect(sql).not.toMatch(/\bGRANT\b/i);
    expect(sql).not.toMatch(/\bREVOKE\b/i);
  });

  test("é transacional: nenhum statement não-transacional", () => {
    for (const proibido of [/CONCURRENTLY/i, /\bVACUUM\b/i, /\bREINDEX\b/i, /ALTER\s+SYSTEM/i, /\bCLUSTER\b/i]) {
      expect(sql).not.toMatch(proibido);
    }
  });

  test("não embute BEGIN/COMMIT próprios — o envelope é externo", () => {
    expect(sql).not.toMatch(/^\s*BEGIN;/m);
    expect(sql).not.toMatch(/^\s*COMMIT;/m);
  });
});

describe("Migration B produtiva — preconditions exigidas", () => {
  const sql = migration(PRODUCAO);

  test.each([
    ["tabela existe", /to_regclass\('public\.wave_responses'\) IS NULL/],
    ["coluna existe antes da remoção", /column_name='invite_token'/],
    ["wave_responses = 0", /wave_responses tem % linha\(s\)/],
    ["cohort_id", /column_name='cohort_id'/],
    ["instrument", /column_name='instrument'/],
    ["instrument_version", /column_name='instrument_version'/],
    ["wave_cohorts", /to_regclass\('public\.wave_cohorts'\) IS NULL/],
    ["count_cohort_participation", /count_cohort_participation\(uuid,uuid\)/],
    ["contrato de 8 colunas", /response_count_label text/],
    ["submit_wave_response existe", /submit_wave_response\(uuid,text,jsonb\)/],
    ["submit_wave_response não grava a coluna", /ainda nomeia invite_token no INSERT/],
    ["nenhuma função referencia a coluna", /funcao\(oes\) ainda referenciam wave_responses\.invite_token/],
    ["dependência estrutural", /dependencia estrutural sobre a coluna/],
    ["3 ondas seladas", /onda\(s\) legada\(s\) selada\(s\)/],
    ["30 convites expirados", /convite\(s\) com expires_at preenchido/],
    ["0 convites usados", /convite\(s\) legado\(s\) utilizados/],
  ])("precondition presente: %s", (_rotulo, padrao) => {
    expect(sql).toMatch(padrao as RegExp);
  });

  test("nome de parâmetro nunca conta como referência à coluna", () => {
    // \minvite_token\M não casa p_invite_token — é o que evita o falso
    // positivo que abortaria 100% das execuções.
    expect(sql).toContain("\\minvite_token\\M");
  });

  test("toda recusa é RAISE EXCEPTION, antes ou dentro da transação", () => {
    const excecoes = sql.match(/RAISE EXCEPTION/g) ?? [];
    expect(excecoes.length).toBeGreaterThanOrEqual(20);
  });
});

describe("Migration B produtiva — pós-checks internos", () => {
  const sql = migration(PRODUCAO);

  test.each([
    ["tabela sobrevive", /wave_responses deixou de existir/],
    ["coluna removida", /wave_responses\.invite_token ainda existe/],
    ["nenhuma FK residual para wave_invites", /FK de wave_responses para wave_invites/],
    ["respostas continuam 0", /wave_responses deixou de ser 0/],
    ["colunas da Migration A sobrevivem", /wave_responses\.% sumiu/],
    ["submit_wave_response permanece", /submit_wave_response desapareceu/],
    ["count_cohort_participation permanece", /count_cohort_participation desapareceu/],
    ["contrato de agregação preservado", /contrato de aggregate_cohort_responses mudou/],
    ["30 convites preservados", /convite\(s\) preservado\(s\), esperado\(s\) 30/],
    ["30 continuam expirados", /convite\(s\) expirado\(s\)/],
    ["0 usados", /convite\(s\) passaram a usados/],
    ["3 ondas continuam seladas", /onda\(s\) legada\(s\) selada\(s\), esperado 3/],
  ])("pós-check presente: %s", (_rotulo, padrao) => {
    expect(sql).toMatch(padrao as RegExp);
  });
});

describe("nenhuma referência de runtime à coluna removida", () => {
  const ARQUIVOS_DE_RUNTIME = [
    "src/lib/cloud/db-adapter.ts",
    "src/lib/survey/response-capture.server.ts",
    "src/lib/survey/sector-link.server.ts",
    "src/lib/api/survey.functions.ts",
    "src/lib/api/fibt-cohort.functions.ts",
    "src/routes/convite.$token.tsx",
  ];

  /** Referência à COLUNA, nunca ao parâmetro `p_invite_token` da RPC. */
  const referenciaColuna = /(?<!p_)\binvite_token\b/;

  test.each(ARQUIVOS_DE_RUNTIME)("%s não referencia a coluna (fora de comentário)", (arquivo) => {
    const semComentario = ler(arquivo)
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join("\n");
    expect(semComentario).not.toMatch(referenciaColuna);
  });

  test("os tipos gerados já não declaram a coluna em wave_responses", () => {
    const tipos = ler("src/integrations/supabase/types.ts");
    const bloco = tipos.slice(tipos.indexOf("wave_responses: {"));
    const row = bloco.slice(0, bloco.indexOf("Relationships"));
    expect(row).not.toMatch(/\binvite_token\b/);
    expect(row).toContain("cohort_id");
    expect(row).toContain("instrument_version");
  });

  test("o único uso de p_invite_token é como argumento de RPC", () => {
    const adapter = ler("src/lib/cloud/db-adapter.ts");
    expect(adapter).toContain("p_invite_token: input.inviteToken");
    expect(adapter).not.toMatch(/from\(["']wave_responses["']\)[\s\S]{0,200}invite_token/);
  });
});
