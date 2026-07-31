// Regressao: o fluxo FIB-T REAL nao pode cair para mock, e a coluna de
// vinculo nao pode voltar. Testes estaticos sobre os arquivos do repo --
// mesma filosofia do schema-parity: invariante que se auto-verifica.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const raiz = process.cwd();
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

/**
 * Codigo sem comentarios. Necessario porque estes arquivos EXPLICAM, em
 * comentario, que nao usam mock -- procurar o identificador no texto cru
 * acusaria justamente a documentacao da regra que se quer verificar.
 */
const codigo = (p: string) =>
  ler(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");

const ROTA_REAL = "src/routes/fibt-piloto.tsx";
const DATA_REAL = "src/lib/api/fibt-cohort.functions.ts";
const PONTE = "src/lib/fibt/fibt-cohort-report.ts";

/** SQL sem comentarios de linha -- pelo mesmo motivo de `codigo()` acima. */
const semComentarios = (sql: string) =>
  sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");

function migrations(): { nome: string; sql: string }[] {
  const dir = join(raiz, "supabase", "migrations");
  return [...new Glob("*.sql").scanSync({ cwd: dir })]
    .sort()
    .map((nome) => ({ nome, sql: readFileSync(join(dir, nome), "utf8") }));
}

describe("o painel real nunca cai para mock", () => {
  test("a rota de dados reais nao importa nada de @/mocks", () => {
    expect(codigo(ROTA_REAL)).not.toMatch(/from\s+["']@\/mocks/);
  });

  test("a camada de dados nao importa nada de @/mocks", () => {
    expect(codigo(DATA_REAL)).not.toMatch(/from\s+["']@\/mocks/);
  });

  test("a ponte de agregacao nao importa nada de @/mocks", () => {
    expect(codigo(PONTE)).not.toMatch(/from\s+["']@\/mocks/);
  });

  test("FIBT_ORG_RESULT (agregado ficticio) nao aparece no CODIGO do caminho real", () => {
    for (const f of [ROTA_REAL, DATA_REAL, PONTE]) {
      expect(codigo(f)).not.toContain("FIBT_ORG_RESULT");
    }
  });

  test("a rota real trata erro como erro, com papel de alerta", () => {
    const src = ler(ROTA_REAL);
    expect(src).toContain('role="alert"');
    expect(src).toMatch(/estado\.t === "erro"/);
  });

  test("os quatro estados de tela existem", () => {
    const src = ler(ROTA_REAL);
    for (const estado of ["carregando", "vazio", "erro", "ok"]) {
      expect(src).toContain(`"${estado}"`);
    }
  });
});

describe("claims bloqueados nao voltam pelo caminho real", () => {
  test("nem indice 0-1000 nem faixa interpretativa na rota real", () => {
    const src = codigo(ROTA_REAL).toLowerCase();
    expect(src).not.toContain("0–1000");
    expect(src).not.toContain("0-1000");
    expect(src).not.toContain("florescente");
    expect(src).not.toContain("em desenvolvimento");
  });
});

describe("vinculo resposta -> convite", () => {
  test("a Migration A e aditiva: nao remove invite_token", () => {
    const a = migrations().find((m) => m.nome.includes("generic_anonymous_submissions_expand"))!;
    expect(a).toBeDefined();
    expect(a.sql).not.toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS\s+invite_token/i);
  });

  test("a submissao nova nao nomeia invite_token no INSERT", () => {
    const a = migrations().find((m) => m.nome.includes("generic_anonymous_submissions_expand"))!;
    const insert = /INSERT INTO public\.wave_responses \(([^)]*)\)/g;
    const colunas = [...a.sql.matchAll(insert)].map((m) => m[1]!);
    expect(colunas.length).toBeGreaterThan(0);
    for (const c of colunas) expect(c).not.toContain("invite_token");
  });

  test("a Migration B remove a coluna E a FK", () => {
    const b = migrations().find((m) => m.nome.includes("drop_response_invite_link_contract"))!;
    expect(b).toBeDefined();
    expect(b.sql).toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS\s+invite_token/i);
    expect(b.sql).toMatch(/DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+wave_responses_invite_token_fkey/i);
  });

  test("a Migration B corrige submit_sector_response antes do DROP", () => {
    const b = migrations().find((m) => m.nome.includes("drop_response_invite_link_contract"))!;
    const posFuncao = b.sql.indexOf("FUNCTION public.submit_sector_response");
    const posDrop = b.sql.search(/DROP\s+COLUMN\s+IF\s+EXISTS\s+invite_token/i);
    expect(posFuncao).toBeGreaterThan(-1);
    expect(posFuncao).toBeLessThan(posDrop);
  });

  test("a Migration B tem preconditions fail-closed antes de destruir", () => {
    const b = migrations().find((m) => m.nome.includes("drop_response_invite_link_contract"))!;
    const posPrecond = b.sql.indexOf("PRECONDITIONS FAIL-CLOSED");
    const posDrop = b.sql.search(/DROP\s+COLUMN\s+IF\s+EXISTS\s+invite_token/i);
    expect(posPrecond).toBeGreaterThan(-1);
    expect(posPrecond).toBeLessThan(posDrop);
    expect(b.sql).toContain("RAISE EXCEPTION");
  });

  test("a precondition usa UUID exato, nunca padrao de texto com curinga", () => {
    const b = migrations().find((m) => m.nome.includes("drop_response_invite_link_contract"))!;
    expect(b.sql).toContain("a0000000-0000-0000-0000-000000000001");
    expect(b.sql).toContain("a0000000-0000-0000-0000-000000000002");
    expect(b.sql).toContain("example.invalid");
    // '_' e curinga no LIKE: casaria "sintXtico". Nao pode decidir destruicao.
    // Comentarios sao removidos: o arquivo EXPLICA por que o padrao saiu.
    expect(semComentarios(b.sql)).not.toContain("sint_tico");
    // organization.name nao pode participar da decisao destrutiva.
    expect(semComentarios(b.sql)).not.toMatch(/o\.name\s+LIKE/);
  });

  test("a precondition exige quantidade afetada exata", () => {
    const b = migrations().find((m) => m.nome.includes("drop_response_invite_link_contract"))!;
    expect(b.sql).toContain("AFETADAS_ESPERADAS");
    expect(b.sql).toMatch(/v_afetadas\s*<>\s*AFETADAS_ESPERADAS/);
  });

  test("a precondition exige o privacy hardening aplicado", () => {
    const b = migrations().find((m) => m.nome.includes("drop_response_invite_link_contract"))!;
    expect(b.sql).toContain("response_count_label");
    expect(b.sql).toContain("count_cohort_participation");
  });

  test("a precondition varre funcoes SQL dependentes da coluna", () => {
    const b = migrations().find((m) => m.nome.includes("drop_response_invite_link_contract"))!;
    expect(b.sql).toContain("p.prosrc ILIKE");
  });
});

describe("privacy hardening -- contagem exata nao sai abaixo do limiar", () => {
  const ph = () => migrations().find((m) => m.nome.includes("cohort_aggregate_privacy_hardening"))!;

  test("a migration de hardening existe e e anterior a Migration B", () => {
    const nomes = migrations().map((m) => m.nome);
    const iPh = nomes.findIndex((n) => n.includes("cohort_aggregate_privacy_hardening"));
    const iB = nomes.findIndex((n) => n.includes("drop_response_invite_link_contract"));
    expect(iPh).toBeGreaterThan(-1);
    expect(iB).toBeGreaterThan(-1);
    // As migrations rodam em ordem de nome; o hardening tem que vir antes.
    expect(nomes[iPh]! < nomes[iB]!).toBe(true);
  });

  test("o contrato devolve rotulo de faixa e motivo de supressao", () => {
    expect(ph().sql).toContain("response_count_label");
    expect(ph().sql).toContain("privacy_threshold");
  });

  test("abaixo do limiar devolve NULL no lugar da contagem exata", () => {
    expect(ph().sql).toMatch(/RETURN QUERY SELECT FALSE, NULL::INTEGER, \('<' \|\| v_k\)/);
  });

  test("a contagem exata vive em funcao separada, com papel restrito", () => {
    const sql = ph().sql;
    expect(sql).toContain("count_cohort_participation");
    expect(sql).toMatch(/RH_ADMIN/);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.count_cohort_participation[\s\S]*?anon/);
  });

  test("a Migration A congelada nao foi alterada", () => {
    const a = migrations().find((m) => m.nome.includes("generic_anonymous_submissions_expand"))!;
    // O hardening substitui a funcao numa migration propria, posterior.
    expect(a.sql).toContain("RETURNS TABLE(n INTEGER, k_min INTEGER, visible BOOLEAN, item_means JSONB)");
  });
});

describe("migrations sao ASCII puro", () => {
  test("nenhuma migration da FIBT-1 tem byte nao-ASCII", () => {
    // O incidente do P0: substituicao tipografica no transporte quebrou o SQL.
    for (const m of migrations().filter((x) => x.nome.startsWith("202607301"))) {
      const bytes = Buffer.from(m.sql, "utf8");
      const naoAscii = [...bytes].filter((b) => b > 127).length;
      expect({ arquivo: m.nome, naoAscii }).toEqual({ arquivo: m.nome, naoAscii: 0 });
    }
  });
});

describe("guarda de ambiente", () => {
  test("nenhum script da FIBT-1 le SUPABASE_URL (producao)", () => {
    for (const f of ["scripts/fibt1-staging-proof.ts", "scripts/staging-fibt1-inventory.ts"]) {
      const src = ler(f);
      expect(src).not.toMatch(/env\.SUPABASE_URL|env\.VITE_SUPABASE_URL/);
    }
  });

  test("o guard exige STAGING_* e recusa o ref padrao do ambiente", () => {
    const src = ler("src/lib/staging/staging-guard.ts");
    expect(src).toContain("STAGING_SUPABASE_URL");
    expect(src).toContain("forbiddenRefs");
    expect(src).toContain("RECUSADO");
  });

  test("nenhum ref, URL ou chave fica fixado no guard", () => {
    const src = ler("src/lib/staging/staging-guard.ts");
    expect(src).not.toMatch(/https:\/\/[a-z0-9]{20}\.supabase\.co/);
    expect(src).not.toMatch(/\b[a-z]{20}\b/); // ref de projeto tem 20 chars
  });
});
