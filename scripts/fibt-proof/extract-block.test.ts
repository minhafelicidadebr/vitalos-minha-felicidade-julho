import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  ExtractionError,
  runExtraction,
  SOURCE_FILE,
  EXPECTED_B007_SHA256,
  EXPECTED_TRANSACTION_SHA256,
  EXPECTED_ALL_BLOCKS_SHA256,
} from "./extract-block";

/**
 * Testes estáticos do extrator multibloco (PROD-0.6C). Nenhum inicia
 * PostgreSQL, Docker ou executa SQL — `runExtraction` só lê texto e valida.
 *
 * O corpo de B007 usado nas fixtures sintéticas é o texto público e já
 * incorporado à main (SPEC §J / bloco B007 do draft canônico) — byte a byte
 * idêntico, por isso os testes que usam a fixture "válida" inteira sem
 * mutação batem no hash congelado de B007 mas NÃO no hash agregado da
 * transação (os demais blocos são sintéticos, menores que os reais).
 */

const B007_CANONICAL_BODY = `CREATE OR REPLACE FUNCTION public.submit_sector_response(
  p_token_hash TEXT,
  p_answers    JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link      public.sector_links%ROWTYPE;
  v_wave      public.waves%ROWTYPE;
  v_cohort_id UUID;
  v_count     INTEGER;
BEGIN
  SELECT * INTO v_link FROM public.sector_links WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.status <> 'active' OR v_link.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'revoked'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE, 'expired'::TEXT, 0;
    RETURN;
  END IF;

  SELECT * INTO v_wave FROM public.waves WHERE id = v_link.wave_id;
  IF v_wave.id IS NULL OR v_wave.status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;

  SELECT c.id INTO v_cohort_id
    FROM public.wave_cohorts c
   WHERE c.wave_id = v_link.wave_id AND c.key = v_link.sector_label;

  INSERT INTO public.wave_responses (wave_id, cohort_id, instrument, instrument_version, answers)
  VALUES (v_link.wave_id, v_cohort_id, v_wave.instrument, v_wave.instrument_version, p_answers);

  SELECT COUNT(*) INTO v_count FROM public.wave_responses WHERE wave_id = v_link.wave_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$$;`;

/** Prefixa cada linha com "-- " (ou "--" solto se em branco), como o draft real. */
function comment(sql: string): string {
  return sql
    .split("\n")
    .map((l) => (l === "" ? "--" : `-- ${l}`))
    .join("\n");
}

function block(id: string, sql: string): string {
  return [
    `-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:${id}`,
    comment(sql),
    `-- FIBT_PROD_B_EXEC_BLOCK_END:${id}`,
  ].join("\n");
}

/** Fixture sintética com os 13 blocos estruturalmente válidos. B007 é o
 * corpo canônico real; os demais são versões mínimas, mas com o mesmo papel
 * transacional (BEGIN/SET LOCAL/locks/preconditions/DDL/postcheck/COMMIT). */
function buildValidFixture(): string {
  const parts = [
    "-- Cabecalho de documentacao do draft, so prosa comentada.",
    "--",
    block("B001", "BEGIN;"),
    block("B002", "SET LOCAL lock_timeout = '5s';\nSET LOCAL statement_timeout = '2min';"),
    block("B003", "SELECT pg_advisory_xact_lock(1);\nLOCK TABLE public.wave_responses IN ACCESS EXCLUSIVE MODE;"),
    block("B004", "DO $$\nBEGIN\n  RAISE NOTICE 'precondition A';\nEND $$;"),
    block("B005", "DO $$\nBEGIN\n  RAISE NOTICE 'precondition H';\nEND $$;"),
    block("B006", "DO $$\nBEGIN\n  RAISE NOTICE 'preconditions 3';\nEND $$;"),
    block("B007", B007_CANONICAL_BODY),
    block(
      "B008",
      "ALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;\n\nALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;",
    ),
    block("B009", "COMMENT ON TABLE public.wave_responses IS 'sem invite_token';"),
    block("B010", "DO $$\nBEGIN\n  RAISE NOTICE 'postcheck';\nEND $$;"),
    block("B011", "COMMIT;"),
    block("B012", "SELECT 1 AS linhas_normalizadas;"),
    block("B013", "SELECT encode(sha256('x'::bytea), 'hex') AS acl_fingerprint_sha256;"),
  ];
  return parts.join("\n\n") + "\n";
}

const VALID_FIXTURE = buildValidFixture();

/** Roda a extração e devolve o ExtractionError, ou falha o teste se passar. */
function expectAbort(source: string): ExtractionError {
  try {
    runExtraction(source);
  } catch (e) {
    if (e instanceof ExtractionError) return e;
    throw e;
  }
  throw new Error("esperava ExtractionError, mas runExtraction() completou sem abortar");
}

describe("runExtraction — caminho feliz", () => {
  test("13 blocos válidos, estrutura e invariantes corretos: só diverge no hash congelado (blocos sintéticos, não o draft real)", () => {
    const err = expectAbort(VALID_FIXTURE);
    // A fixture é estruturalmente válida (13 blocos, sequência, invariantes
    // todos verdadeiros) — todas as checagens anteriores passam. Ela só
    // aborta na comparação final contra os hashes congelados, porque é uma
    // fixture sintética menor que o draft real, não uma cópia byte a byte.
    // Prova que o extrator chega ate o fim da validação estrutural sem falso
    // positivo antes de comparar contra o congelado.
    expect(err.code).toBe("E18_HASH_DIVERGENT");
  });

  test("arquivo real do draft canônico: 13 blocos, E18 PASS, hashes congelados batem", () => {
    const real = readFileSync(SOURCE_FILE, "utf8");
    const result = runExtraction(real);
    expect(result.observedBlockCount).toBe(13);
    expect(result.observedBlockIds).toEqual([
      "B001", "B002", "B003", "B004", "B005", "B006", "B007",
      "B008", "B009", "B010", "B011", "B012", "B013",
    ]);
    expect(result.b007FunctionSha256).toBe(EXPECTED_B007_SHA256);
    expect(result.aggregateTransactionSha256).toBe(EXPECTED_TRANSACTION_SHA256);
    expect(result.aggregateAllBlocksSha256).toBe(EXPECTED_ALL_BLOCKS_SHA256);
    expect(result.e18.result).toBe("PASS");
    expect(result.rejectedLines).toBe(0);
    expect(Object.values(result.invariants).every(Boolean)).toBe(true);
  });
});

describe("runExtraction — estrutura de marcadores", () => {
  test("marcador BEGIN ausente", () => {
    const mutated = VALID_FIXTURE.replace("-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:B005\n", "");
    expect(expectAbort(mutated).code).toBe("MISSING_BEGIN");
  });

  test("marcador END ausente", () => {
    const mutated = VALID_FIXTURE.replace("-- FIBT_PROD_B_EXEC_BLOCK_END:B009\n", "");
    expect(expectAbort(mutated).code).toBe("MISSING_END");
  });

  test("ID duplicado (dois B004)", () => {
    const dup = block("B004", "DO $$\nBEGIN\n  RAISE NOTICE 'duplicado';\nEND $$;");
    const mutated = VALID_FIXTURE + "\n\n" + dup + "\n";
    expect(expectAbort(mutated).code).toBe("DUPLICATE_BEGIN");
  });

  test("lacuna na sequência (B006 renomeado para B014, fora do contrato)", () => {
    const mutated = VALID_FIXTURE
      .replace("FIBT_PROD_B_EXEC_BLOCK_BEGIN:B006", "FIBT_PROD_B_EXEC_BLOCK_BEGIN:B014")
      .replace("FIBT_PROD_B_EXEC_BLOCK_END:B006", "FIBT_PROD_B_EXEC_BLOCK_END:B014");
    const err = expectAbort(mutated);
    expect(["BLOCK_COUNT", "MISSING_BEGIN", "UNEXPECTED_BLOCK_ID"]).toContain(err.code);
  });

  test("ordem invertida (BEGIN depois do END do mesmo bloco)", () => {
    const beginLine = "-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:B002";
    const endLine = "-- FIBT_PROD_B_EXEC_BLOCK_END:B002";
    const mutated = VALID_FIXTURE.replace(beginLine, "__TMP_END__").replace(endLine, beginLine).replace("__TMP_END__", endLine);
    expect(expectAbort(mutated).code).toBe("INVERTED_ORDER");
  });

  test("aninhamento (B005 começa antes do fim de B004)", () => {
    const mutated = VALID_FIXTURE.replace(
      "-- FIBT_PROD_B_EXEC_BLOCK_END:B004",
      "-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:B005\n--\n-- FIBT_PROD_B_EXEC_BLOCK_END:B004",
    );
    // Isso introduz um BEGIN:B005 extra antes do END:B004 original — resulta
    // em marcador duplicado, que também é uma forma de contrato quebrado.
    const err = expectAbort(mutated);
    expect(["NESTED_OR_OUT_OF_ORDER", "DUPLICATE_BEGIN"]).toContain(err.code);
  });

  test("bloco vazio (B012 sem conteúdo entre os marcadores)", () => {
    const mutated = VALID_FIXTURE.replace(
      block("B012", "SELECT 1 AS linhas_normalizadas;"),
      "-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:B012\n-- FIBT_PROD_B_EXEC_BLOCK_END:B012",
    );
    expect(expectAbort(mutated).code).toBe("EMPTY_BLOCK");
  });

  test("marcador excedente (14º bloco declarado)", () => {
    const mutated = VALID_FIXTURE + "\n\n" + block("B014", "SELECT 1;") + "\n";
    expect(expectAbort(mutated).code).toBe("BLOCK_COUNT");
  });

  test("marcador do contrato legado (par único) presente", () => {
    const mutated = VALID_FIXTURE + "\n\n-- FIBT_PROD_B_SQL_BLOCK_BEGIN\n--\n-- FIBT_PROD_B_SQL_BLOCK_END\n";
    expect(expectAbort(mutated).code).toBe("LEGACY_MARKER_PRESENT");
  });
});

describe("runExtraction — formato do arquivo-fonte", () => {
  test("linha fora de bloco sem prefixo de comentário (SQL fora de bloco)", () => {
    const mutated = VALID_FIXTURE.replace(
      "-- Cabecalho de documentacao do draft, so prosa comentada.",
      "-- Cabecalho de documentacao do draft, so prosa comentada.\nSELECT 1; -- linha nua fora de qualquer bloco",
    );
    expect(expectAbort(mutated).code).toBe("UNCOMMENTED_SOURCE_LINE");
  });

  test("linha com prefixo malformado (\"---- \" em vez de \"-- \") é rejeitada já na varredura do arquivo inteiro", () => {
    // A checagem de arquivo inteiro (UNCOMMENTED_SOURCE_LINE) usa o mesmo
    // critério de formato que a checagem por bloco — por isso uma linha
    // malformada é sempre pega na varredura inicial, nunca sobra para
    // MALFORMED_LINE (defesa em profundidade, não morta: MALFORMED_LINE
    // continua sendo o que protegeria se a varredura inicial um dia mudasse).
    const mutated = VALID_FIXTURE.replace("-- BEGIN;", "---- BEGIN;");
    expect(expectAbort(mutated).code).toBe("UNCOMMENTED_SOURCE_LINE");
  });

  test("diferença CRLF vs LF não quebra a extração (normalização explícita)", () => {
    const crlf = VALID_FIXTURE.replace(/\n/g, "\r\n");
    const lfResult = expectAbort(VALID_FIXTURE);
    const crlfResult = expectAbort(crlf);
    expect(crlfResult.code).toBe(lfResult.code);
  });
});

describe("runExtraction — E18 REQUIRED_FUNCTION_BODY_PRESENT", () => {
  test("B007 ausente (removido do contrato de 13 blocos): falha antes mesmo de chegar a E18", () => {
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), "");
    const err = expectAbort(mutated);
    expect(["MISSING_BEGIN", "BLOCK_COUNT"]).toContain(err.code);
  });

  test("B007 com corpo incompleto (assinatura ausente)", () => {
    const incomplete = "-- placeholder: copiar o corpo da SPEC secao J aqui";
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", incomplete));
    expect(expectAbort(mutated).code).toBe("E18_FUNCTION_BODY_MISSING");
  });

  test("B007 com hash divergente (corpo presente, mas reescrito)", () => {
    const rewritten = B007_CANONICAL_BODY.replace("v_count     INTEGER;", "v_count     INT;");
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", rewritten));
    expect(expectAbort(mutated).code).toBe("E18_HASH_DIVERGENT");
  });

  test("B007 com INSERT ainda nomeando wave_responses.invite_token", () => {
    const withToken = B007_CANONICAL_BODY.replace(
      "INSERT INTO public.wave_responses (wave_id, cohort_id, instrument, instrument_version, answers)",
      "INSERT INTO public.wave_responses (wave_id, cohort_id, invite_token, instrument, instrument_version, answers)",
    );
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", withToken));
    expect(expectAbort(mutated).code).toBe("E18_INVITE_TOKEN_RESIDUAL");
  });

  test("B007 com GRANT/REVOKE executável dentro do bloco", () => {
    const withGrant = `${B007_CANONICAL_BODY}\n\nGRANT EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB) TO anon;`;
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", withGrant));
    expect(expectAbort(mutated).code).toBe("E18_GRANT_OR_REVOKE_PRESENT");
  });

  test("orientação textual no lugar da função (nunca chega a conter CREATE OR REPLACE)", () => {
    const textOnly = "-- Corpo integral reproduzido na SPEC secao J. Copiar APENAS o corpo.";
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", textOnly));
    expect(expectAbort(mutated).code).toBe("E18_FUNCTION_BODY_MISSING");
  });

  test("dois CREATE OR REPLACE dentro do mesmo B007", () => {
    const doubled = `${B007_CANONICAL_BODY}\n\n${B007_CANONICAL_BODY}`;
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", doubled));
    expect(expectAbort(mutated).code).toBe("E18_NOT_EXACTLY_ONE");
  });
});

describe("runExtraction — invariantes transacionais", () => {
  test("primeiro statement diferente de BEGIN (B001 alterado)", () => {
    const mutated = VALID_FIXTURE.replace(block("B001", "BEGIN;"), block("B001", "SELECT 1;"));
    // "BEGIN;" deixa de existir → exactly_one_begin também falha, mas o
    // primeiro invariante avaliado (na ordem de inserção) é first_statement_is_begin.
    expect(expectAbort(mutated).code).toBe("INVARIANT_FAILED");
  });

  test("último statement diferente de COMMIT (B011 alterado)", () => {
    const mutated = VALID_FIXTURE.replace(block("B011", "COMMIT;"), block("B011", "SELECT 1;"));
    expect(expectAbort(mutated).code).toBe("INVARIANT_FAILED");
  });

  test("COMMIT intermediário (B008 ganha um COMMIT extra)", () => {
    const mutated = VALID_FIXTURE.replace(
      block("B008", "ALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;\n\nALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;"),
      block("B008", "ALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;\nCOMMIT;\nALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;"),
    );
    expect(expectAbort(mutated).code).toBe("INVARIANT_FAILED");
  });

  test("DROP CONSTRAINT depois do DROP COLUMN dentro de B008 (ordem interna invertida)", () => {
    const mutated = VALID_FIXTURE.replace(
      block("B008", "ALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;\n\nALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;"),
      block("B008", "ALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;\n\nALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;"),
    );
    expect(expectAbort(mutated).code).toBe("INVARIANT_FAILED");
  });

  test("B007 posicionado depois dos DROPs (B007 e B008 trocados de lugar no arquivo)", () => {
    const b007Block = block("B007", B007_CANONICAL_BODY);
    const b008Block = block(
      "B008",
      "ALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;\n\nALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;",
    );
    // Troca as posições textuais de B007 e B008 no arquivo — os IDs dos
    // marcadores continuam corretos, mas B007 passa a aparecer DEPOIS de
    // B008 na ordem do arquivo, violando a sequência B001..B013.
    const mutated = VALID_FIXTURE.replace(b007Block, "__B007_PLACEHOLDER__").replace(b008Block, b007Block).replace("__B007_PLACEHOLDER__", b008Block);
    const err = expectAbort(mutated);
    expect(["NESTED_OR_OUT_OF_ORDER", "INVARIANT_FAILED"]).toContain(err.code);
  });
});

describe("runExtraction — divergência de hash congelado (draft real, mutação mínima)", () => {
  const REAL_DRAFT = readFileSync(SOURCE_FILE, "utf8");

  test("hash da transação diverge quando um bloco B001–B011 muda (fora de B007)", () => {
    // Muda um valor dentro de B002 (SET LOCAL) — não afeta estrutura,
    // invariantes nem E18, só o conteúdo (e portanto o hash) da transação.
    const mutated = REAL_DRAFT.replace("SET LOCAL lock_timeout = '5s';", "SET LOCAL lock_timeout = '6s';");
    expect(expectAbort(mutated).code).toBe("TRANSACTION_HASH_DIVERGENT");
  });

  test("hash agregado diverge quando só B012/B013 mudam (fora da transação)", () => {
    // Muda um alias dentro do SELECT de B012 (entre os marcadores reais do
    // bloco) — fora da transação (B001–B011), então o hash da transação
    // continua batendo; só o agregado B001–B013 diverge.
    const marker = "pg_get_function_identity_arguments(p.oid)      AS assinatura,";
    expect(REAL_DRAFT).toContain(marker);
    const mutated = REAL_DRAFT.replace(marker, "pg_get_function_identity_arguments(p.oid)      AS assinatura_da_funcao,");
    const result = expectAbort(mutated);
    expect(result.code).toBe("AGGREGATE_HASH_DIVERGENT");
  });
});
