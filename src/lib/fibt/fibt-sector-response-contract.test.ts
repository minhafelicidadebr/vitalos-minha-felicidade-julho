// Contrato do Pacote 3A: submit_sector_response reescrita sem a coluna legada.
//
// A reescrita precisa ser cirúrgica. A Migration B de staging também reescreve
// esta função, mas lá ela TROCA os códigos de motivo `link_revoked`/
// `link_expired` por `revoked`/`expired`. Como `sector-link.server.ts` repassa
// `outcome?.reason` adiante sem traduzir, adotar a versão de staging mudaria,
// em silêncio, o que chega à interface. Estes testes existem para travar isso.
//
// Prova estática de contrato — não executa SQL, não abre conexão.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = join(import.meta.dir, "..", "..", "..");
const dirMigrations = join(raiz, "supabase", "migrations");

const ORIGINAL = "20260708120000_sector_links.sql";
const REESCRITA = "20260806205000_rewrite_submit_sector_response_without_invite_link.sql";
const CONTRACT = "20260806210000_drop_response_invite_link_contract_production.sql";
const STAGING_B = "20260730160000_drop_response_invite_link_contract.sql";

const migration = (nome: string) => readFileSync(join(dirMigrations, nome), "utf8");

/** SQL executável: sem linhas de comentário e sem o conteúdo de literais. */
const executavel = (sql: string) =>
  sql
    .split("\n")
    .filter((l) => !/^\s*--/.test(l))
    .join("\n");

/** Corpo da função, entre o cabeçalho e o fechamento do dollar-quote. */
function corpoDaFuncao(sql: string): string {
  const inicio = sql.indexOf("CREATE OR REPLACE FUNCTION public.submit_sector_response");
  expect(inicio).toBeGreaterThan(-1);
  const fim = sql.indexOf("$$;", inicio);
  expect(fim).toBeGreaterThan(inicio);
  return sql.slice(inicio, fim);
}

describe("Pacote 3A — ordenação e escopo", () => {
  test("ordena imediatamente antes do CONTRACT produtivo", () => {
    expect(REESCRITA < CONTRACT).toBe(true);
  });

  test("não altera wave_invites, waves, policies, grants nem tabelas", () => {
    const sql = executavel(migration(REESCRITA));
    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(sql).not.toMatch(/\bCREATE\s+TABLE\b/i);
    expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(sql).not.toMatch(/\bCREATE\s+POLICY\b/i);
    expect(sql).not.toMatch(/\bDROP\s+POLICY\b/i);
    expect(sql).not.toMatch(/^\s*GRANT\b/im);
    expect(sql).not.toMatch(/^\s*REVOKE\b/im);
  });

  test("nenhuma escrita de dado existente", () => {
    // O único INSERT é o do corpo da função, executado sob demanda.
    const foraDaFuncao = executavel(migration(REESCRITA)).replace(
      /CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;/,
      "",
    );
    expect(foraDaFuncao).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(foraDaFuncao).not.toMatch(/\bUPDATE\s+public\./i);
    expect(foraDaFuncao).not.toMatch(/\bDELETE\b/i);
    expect(foraDaFuncao).not.toMatch(/\bTRUNCATE\b/i);
  });

  test("usa CREATE OR REPLACE, nunca DROP FUNCTION", () => {
    const sql = executavel(migration(REESCRITA));
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.submit_sector_response/);
    expect(sql).not.toMatch(/DROP\s+FUNCTION/i);
  });
});

describe("Pacote 3A — assinatura e contrato preservados", () => {
  const nova = corpoDaFuncao(migration(REESCRITA));
  const antiga = corpoDaFuncao(migration(ORIGINAL));

  test("mesma assinatura", () => {
    for (const c of [nova, antiga]) {
      expect(c).toMatch(/p_token_hash TEXT/);
      expect(c).toMatch(/p_answers\s+JSONB/);
    }
  });

  test("mesmo tipo de retorno", () => {
    const retorno = /RETURNS TABLE\(accepted BOOLEAN, reason TEXT, response_count INTEGER\)/;
    expect(nova).toMatch(retorno);
    expect(antiga).toMatch(retorno);
  });

  test("mesmo SECURITY DEFINER e search_path", () => {
    const cabecalho = /LANGUAGE plpgsql SECURITY DEFINER SET search_path = public/;
    expect(nova).toMatch(cabecalho);
    expect(antiga).toMatch(cabecalho);
  });

  test("os QUATRO códigos de motivo são idênticos aos originais", () => {
    for (const motivo of ["invalid_token", "link_revoked", "link_expired", "wave_not_open"]) {
      expect(antiga).toContain(motivo);
      expect(nova).toContain(motivo);
    }
  });

  test("NÃO adota os motivos trocados da Migration B de staging", () => {
    const staging = corpoDaFuncao(migration(STAGING_B));
    // Prova que a divergência existe de verdade, e que não foi herdada.
    expect(staging).toContain("'revoked'");
    expect(staging).toContain("'expired'");
    expect(nova).not.toContain("'revoked'::TEXT");
    expect(nova).not.toContain("'expired'::TEXT");
  });

  test("mesma ordem de validação: token, revogado, expirado, onda", () => {
    const ordem = ["invalid_token", "link_revoked", "link_expired", "wave_not_open"];
    let anterior = -1;
    for (const motivo of ordem) {
      const pos = nova.indexOf(motivo);
      expect(pos).toBeGreaterThan(anterior);
      anterior = pos;
    }
  });

  test("continua fail-closed quando a onda não é encontrada", () => {
    expect(nova).toMatch(/v_wave_status IS NULL OR v_wave_status IN \('sealed', 'cancelled', 'archived'\)/);
  });
});

describe("Pacote 3A — a mudança funcional é exatamente uma", () => {
  const nova = corpoDaFuncao(migration(REESCRITA));
  const antiga = corpoDaFuncao(migration(ORIGINAL));

  test("a versão ANTIGA nomeia a coluna legada no INSERT", () => {
    expect(antiga).toMatch(/INSERT INTO public\.wave_responses \(wave_id, invite_token, answers\)/);
  });

  test("a versão NOVA não referencia a coluna em lugar nenhum", () => {
    // Nome de parâmetro não conta — esta função nem tem p_invite_token.
    expect(nova).not.toMatch(/\binvite_token\b/);
  });

  test("o INSERT novo usa só colunas canônicas pós-Pacote-2", () => {
    expect(nova).toMatch(
      /INSERT INTO public\.wave_responses \(wave_id, cohort_id, instrument, instrument_version, answers\)/,
    );
  });

  test("instrumento e versão vêm da ONDA, nunca do cliente", () => {
    expect(nova).toMatch(/SELECT status, instrument, instrument_version[\s\S]*FROM public\.waves WHERE id = v_link\.wave_id/);
    expect(nova).not.toMatch(/p_instrument/);
  });

  test("coorte é derivada por wave_cohorts.key = sector_label, e NULL é aceitável", () => {
    expect(nova).toMatch(/FROM public\.wave_cohorts c[\s\S]*c\.wave_id = v_link\.wave_id AND c\.key = v_link\.sector_label/);
    expect(nova).toContain("v_cohort_id");
  });

  test("a resolução de coorte é ESCOPADA à onda do próprio link, nunca global", () => {
    // Duas ondas podem declarar a MESMA key (ex.: 'Comercial'). Sem o filtro
    // por wave_id, o link de uma onda resolveria para a coorte de outra —
    // associação cross-wave silenciosa, e cross-tenant se as ondas forem de
    // organizações diferentes.
    const bloco = nova.slice(nova.indexOf("SELECT c.id INTO v_cohort_id"));
    const consulta = bloco.slice(0, bloco.indexOf(";") + 1);

    expect(consulta).toMatch(/c\.wave_id\s*=\s*v_link\.wave_id/);
    expect(consulta).toMatch(/c\.key\s*=\s*v_link\.sector_label/);

    // O filtro por onda precisa estar no MESMO WHERE, unido por AND — não
    // num OR, que tornaria a busca global de novo.
    const where = consulta.slice(consulta.indexOf("WHERE"));
    expect(where).toMatch(/c\.wave_id = v_link\.wave_id AND c\.key = v_link\.sector_label/);
    expect(where).not.toMatch(/\bOR\b/i);
  });

  test("o schema também garante o escopo: UNIQUE (wave_id, key) em wave_cohorts", () => {
    // Defesa independente da consulta: a chave é única POR ONDA, então a
    // mesma key em duas ondas é legítima e a query escopada devolve no máximo
    // uma linha. Se a unicidade fosse só (key), o modelo estaria errado antes
    // da função.
    const migrationA = migration("20260730150000_generic_anonymous_submissions_expand.sql");
    expect(migrationA).toMatch(/CONSTRAINT wave_cohorts_wave_key_uk UNIQUE \(wave_id, key\)/);
    expect(migrationA).not.toMatch(/UNIQUE \(key\)/);
  });

  test("a coorte também é amarrada à organização da onda por FK composta", () => {
    const migrationA = migration("20260730150000_generic_anonymous_submissions_expand.sql");
    expect(migrationA).toMatch(
      /CONSTRAINT wave_cohorts_wave_org_fk FOREIGN KEY \(wave_id, org_id\)[\s\S]*REFERENCES public\.waves\(id, org_id\)/,
    );
  });

  test("nenhum valor inventado: sem literal de instrumento ou de coorte", () => {
    expect(nova).not.toMatch(/'FIB_T'|'COPSOQ'|'fibt-1\.0\.0'|ISG-HML/);
  });
});

describe("Pacote 3A — pós-checks fail-closed", () => {
  const sql = migration(REESCRITA);

  test.each([
    ["função existe", /submit_sector_response\(text,jsonb\) desapareceu/],
    ["tipo de retorno idêntico", /tipo de retorno mudou/],
    ["número de argumentos", /numero de argumentos de entrada = %, esperado 2/],
    ["tipos dos argumentos", /tipos dos argumentos mudaram/],
    ["nomes dos argumentos", /nomes dos argumentos mudaram/],
    ["SECURITY DEFINER", /SECURITY DEFINER deixou de valer/],
    ["search_path", /search_path nao e mais public/],
    ["INSERT sem a coluna", /o INSERT ainda nomeia invite_token/],
    ["corpo sem referência à coluna", /o corpo ainda referencia invite_token/],
    ["ACL preservada", /a ACL da funcao mudou/],
    ["owner preservado", /o owner da funcao mudou/],
  ])("pós-check presente: %s", (_rotulo, padrao) => {
    expect(sql).toMatch(padrao as RegExp);
  });

  test.each(["invalid_token", "link_revoked", "link_expired", "wave_not_open"])(
    "pós-check trava o motivo %s",
    (motivo) => {
      expect(sql).toContain(`motivo ${motivo} sumiu`);
    },
  );

  test("o guard de assinatura é ESTRUTURAL — nome/contagem por catálogo", () => {
    // Regressão real #1: a primeira versão comparava
    // pg_get_function_identity_arguments() contra a string 'text, jsonb' e
    // abortou a execução atômica com
    //   FALHA: assinatura mudou. Observado: p_token_hash text, p_answers jsonb
    // — uma assinatura CORRETA reprovada, porque a representação do catálogo
    // traz os nomes junto dos tipos. Falso bloqueio, não defeito da função.
    expect(sql).toMatch(/pronargs/);
    expect(sql).toMatch(/v_argnames\[1\]/);
    expect(sql).toMatch(/'p_token_hash'/);
    expect(sql).toMatch(/'p_answers'/);

    const exec = executavel(sql);
    expect(exec).not.toMatch(/pg_get_function_identity_arguments/);
    expect(exec).not.toMatch(/pg_get_function_arguments/);
    expect(exec).not.toMatch(/IS DISTINCT FROM 'text, jsonb'/);
    // O cabeçalho cita a função antiga de propósito, para registrar a causa
    // raiz; citar em comentário não é usar no SQL executável.
    expect(sql).toMatch(/--.*pg_get_function_identity_arguments/);
  });

  test("o guard de TIPOS indexa o oidvector diretamente, nunca via array derivado", () => {
    // Regressão real #2: a segunda versão substituiu a comparação textual
    // por `proargtypes::OID[] = ARRAY[...]` — e ainda assim abortou tipos
    // corretos com "FALHA: tipos dos argumentos mudaram. Observado: text,
    // jsonb". Causa: proargtypes é OIDVECTOR, indexado a partir de ZERO;
    // convertido para oid[], o array resultante tem lower bound 0, enquanto
    // um ARRAY[...] literal tem lower bound 1. A igualdade de arrays no
    // PostgreSQL compara dimensões — dois arrays com os MESMOS elementos na
    // MESMA ordem, mas lower bounds diferentes, nunca são iguais. Provado
    // empiricamente contra PostgreSQL 17 real (função descartável, mesma
    // assinatura): `proargtypes::oid[] = ARRAY[...]` devolveu `false`.
    const exec = executavel(sql);
    expect(exec).not.toMatch(/proargtypes::OID\[\]/i);
    expect(exec).not.toMatch(/proargtypes::oid\[\]\s*=\s*ARRAY/i);

    // A forma robusta: index direto no oidvector, sem cast, sem array
    // intermediário — comparado ao OID do tipo, nunca a texto.
    expect(sql).toMatch(/proargtypes\[0\]\s*=\s*'text'::regtype::OID/);
    expect(sql).toMatch(/proargtypes\[1\]\s*=\s*'jsonb'::regtype::OID/);
    // O cabeçalho registra a causa raiz da segunda falha também.
    expect(sql).toMatch(/--.*[Ll]ower bound/);
  });

  test("o guard de RETORNO é estrutural (nome+tipo+ordem via catálogo)", () => {
    const exec = executavel(sql);
    // Nenhuma comparação de string formatada contra o retorno.
    expect(exec).not.toMatch(/lower\(regexp_replace\(v_retorno/);
    expect(sql).toMatch(/proallargtypes, p\.proargmodes, p\.proargnames/);
    expect(sql).toMatch(/ARRAY\['accepted', 'reason', 'response_count'\]/);
    expect(sql).toMatch(/ARRAY\['boolean', 'text', 'integer'\]/);
  });

  test("o guard de search_path aceita variação de formatação, não só o literal exato", () => {
    // proconfig guarda pares "nome=valor" em texto; um SET search_path pode
    // ser normalizado com espaço ou aspas ao redor do valor. Igualdade
    // exata contra 'search_path=public' reprovaria configuração correta só
    // por formatação — mesma classe de fragilidade das duas falhas reais.
    expect(sql).toMatch(/search_path\\s\*=\\s\*"\?public"\?/);
    expect(sql).not.toMatch(/=\s*ANY\s*\(COALESCE\(v_config.*'search_path=public'/);
  });

  test("a captura de ACL é local à transação e não cria objeto", () => {
    expect(sql).toMatch(/set_config\(\s*'fibt\.sector_acl_before'/);
    expect(sql).toMatch(/current_setting\('fibt\.sector_acl_before', true\)/);
    expect(sql).not.toMatch(/CREATE\s+(TEMP|TEMPORARY)\s+TABLE/i);
  });
});

describe("o CONTRACT produtivo passa a ter a precondição satisfeita", () => {
  test("nenhuma migration posterior à 3A reintroduz a referência", () => {
    // A 3A é a última a tocar submit_sector_response antes do CONTRACT.
    const nova = corpoDaFuncao(migration(REESCRITA));
    expect(nova).not.toMatch(/\binvite_token\b/);
  });

  test("o CONTRACT continua exigindo que nenhuma função referencie a coluna", () => {
    expect(migration(CONTRACT)).toMatch(/funcao\(oes\) ainda referenciam wave_responses\.invite_token/);
  });

  test("a Migration B de staging segue intocada", () => {
    const sql = migration(STAGING_B);
    expect(sql).toContain("AFETADAS_ESPERADAS CONSTANT INTEGER := 16");
    expect(sql).toContain("a0000000-0000-0000-0000-000000000001");
  });
});
