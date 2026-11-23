import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  ExtractionError,
  runExtraction,
  SOURCE_FILE,
  EXPECTED_B007_SHA256,
  EXPECTED_TRANSACTION_SHA256,
  EXPECTED_ALL_BLOCKS_SHA256,
  TRANSACTION_BLOCK_IDS,
  ACL_EVIDENCE_BLOCK_IDS,
  ALL_BLOCK_IDS,
  type RunExtractionOptions,
} from "./extract-block";

/**
 * Testes estáticos do extrator multibloco (PROD-0.6C). Nenhum inicia
 * PostgreSQL, Docker ou executa SQL — `runExtraction` só lê texto e valida.
 *
 * MODO DE GARANTIA: o extrator não classifica linguisticamente SQL versus
 * prosa. A defesa real contra qualquer conteúdo não canônico dentro de um
 * bloco — inclusive prosa — é EXPECTED_BLOCK_SHA256: cada um dos 13 blocos é
 * comparado, individualmente, contra o hash do conteúdo canônico congelado.
 * Essa checagem roda PRIMEIRO, antes de E18 e dos invariantes. Por isso, testar
 * E18/invariantes por mutação exige `{ skipBlockHashPin: true }` — sem isso,
 * qualquer mutação de teste dispararia BLOCK_HASH_DIVERGENT antes de alcançar
 * o comportamento que o teste quer isolar. A defesa por hash-pin em si é
 * testada à parte, sempre com a opção default (produção nunca usa o escape).
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
 * transacional (BEGIN/SET LOCAL/locks/preconditions/DDL/postcheck/COMMIT).
 * Nenhum bloco além de B007 bate com EXPECTED_BLOCK_SHA256 -- é sintética,
 * não uma cópia byte a byte do draft real. */
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
const REAL_DRAFT = readFileSync(SOURCE_FILE, "utf8");
const SKIP_PIN: RunExtractionOptions = { skipBlockHashPin: true };

/** Roda a extração e devolve o ExtractionError, ou falha o teste se passar. */
function expectAbort(source: string, opts?: RunExtractionOptions): ExtractionError {
  try {
    runExtraction(source, opts);
  } catch (e) {
    if (e instanceof ExtractionError) return e;
    throw e;
  }
  throw new Error("esperava ExtractionError, mas runExtraction() completou sem abortar");
}

describe("runExtraction — caminho feliz", () => {
  test("13 blocos sintéticos válidos, sem escape: aborta no bloco mais cedo que não bate o hash congelado (B003)", () => {
    // Confirma que o pin por bloco realmente roda primeiro, antes de
    // qualquer outra checagem — nenhum "falso PASS" por acaso.
    const err = expectAbort(VALID_FIXTURE);
    expect(err.code).toBe("BLOCK_HASH_DIVERGENT:B003");
  });

  test("arquivo real do draft canônico: 13 blocos, E18 PASS, hashes congelados batem", () => {
    const result = runExtraction(REAL_DRAFT);
    expect(result.observedBlockCount).toBe(13);
    expect(result.observedBlockIds).toEqual(ALL_BLOCK_IDS);
    expect(result.b007FunctionSha256).toBe(EXPECTED_B007_SHA256);
    expect(result.aggregateTransactionSha256).toBe(EXPECTED_TRANSACTION_SHA256);
    expect(result.aggregateAllBlocksSha256).toBe(EXPECTED_ALL_BLOCKS_SHA256);
    expect(result.e18.result).toBe("PASS");
    expect(result.rejectedLines).toBe(0);
    expect(Object.values(result.invariants).every(Boolean)).toBe(true);
  });
});

describe("runExtraction — estrutura de marcadores", () => {
  // Todos os testes desta seção quebram no estágio de validação de
  // marcadores/sequência, que roda ANTES da extração de bloco — não
  // precisam de skipBlockHashPin.

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
});

describe("runExtraction — marcadores do contrato legado (par único)", () => {
  test("marcador legado real (linha inteira) é rejeitado", () => {
    const mutated = VALID_FIXTURE + "\n\n-- FIBT_PROD_B_SQL_BLOCK_BEGIN\n--\n-- FIBT_PROD_B_SQL_BLOCK_END\n";
    expect(expectAbort(mutated).code).toBe("LEGACY_MARKER_PRESENT");
  });

  test("marcador legado com espaço em volta (trim) ainda é rejeitado", () => {
    const mutated = VALID_FIXTURE + "\n\n--  FIBT_PROD_B_ACL_BLOCK_BEGIN  \n--\n-- FIBT_PROD_B_ACL_BLOCK_END\n";
    // A linha extra tem espaços ao redor do texto do marcador -- o trim()
    // aplicado antes do teste deve normalizar isso.
    const err = expectAbort(mutated.replace("--  FIBT_PROD_B_ACL_BLOCK_BEGIN  ", "-- FIBT_PROD_B_ACL_BLOCK_BEGIN "));
    expect(err.code).toBe("LEGACY_MARKER_PRESENT");
  });

  test("menção histórica em frase NÃO é confundida com marcador ativo", () => {
    const mutated = VALID_FIXTURE.replace(
      "-- Cabecalho de documentacao do draft, so prosa comentada.",
      "-- Cabecalho de documentacao do draft, so prosa comentada.\n-- Isto substituiu o antigo FIBT_PROD_B_SQL_BLOCK_BEGIN por marcadores B001-B013.",
    );
    const err = expectAbort(mutated);
    expect(err.code).not.toBe("LEGACY_MARKER_PRESENT");
  });

  test("substring dentro de palavra maior NÃO é confundida com marcador ativo", () => {
    const mutated = VALID_FIXTURE.replace(
      "-- Cabecalho de documentacao do draft, so prosa comentada.",
      "-- Cabecalho de documentacao do draft, so prosa comentada.\n-- FIBT_PROD_B_SQL_BLOCK_BEGINNING_OF_SOMETHING_ELSE",
    );
    const err = expectAbort(mutated);
    expect(err.code).not.toBe("LEGACY_MARKER_PRESENT");
  });

  test("marcador legado real inserido DENTRO de um bloco também é rejeitado", () => {
    const mutated = VALID_FIXTURE.replace(
      "SELECT pg_advisory_xact_lock(1);",
      "SELECT pg_advisory_xact_lock(1);\n-- FIBT_PROD_B_ACL_BLOCK_END",
    );
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
    const mutated = VALID_FIXTURE.replace("-- BEGIN;", "---- BEGIN;");
    expect(expectAbort(mutated).code).toBe("UNCOMMENTED_SOURCE_LINE");
  });

  test("diferença CRLF vs LF não muda o resultado (normalização explícita)", () => {
    const crlf = VALID_FIXTURE.replace(/\n/g, "\r\n");
    const lfResult = expectAbort(VALID_FIXTURE);
    const crlfResult = expectAbort(crlf);
    expect(crlfResult.code).toBe(lfResult.code);
  });
});

describe("runExtraction — hash-pin por bloco (defesa contra prosa/qualquer alteração)", () => {
  test("prosa bem formatada injetada em B002 é rejeitada em BLOCK_HASH_DIVERGENT:B002, antes de qualquer checagem agregada", () => {
    // Usa o draft REAL, sem skip -- é exatamente o modo de produção. A
    // prosa é sintaticamente um comentário válido (\"-- ...\"), então só o
    // hash pego a diferença -- não há classificador de prosa.
    const injected = REAL_DRAFT.replace(
      "-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:B002",
      "-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:B002\n-- Esta linha e pura prosa explicativa, nao e SQL de verdade.",
    );
    expect(expectAbort(injected).code).toBe("BLOCK_HASH_DIVERGENT:B002");
  });

  test("todos os 13 hashes individuais do draft real batem com EXPECTED_BLOCK_SHA256", () => {
    // Não deve lançar -- confirma que o mapa congelado está correto para
    // cada um dos 13 blocos, não só para B007.
    expect(() => runExtraction(REAL_DRAFT)).not.toThrow();
  });

  test("com o pin desativado (cenário hipotético de bug no extrator), o hash agregado da transação ainda captura a mesma divergência", () => {
    const mutated = REAL_DRAFT.replace("SET LOCAL lock_timeout = '5s';", "SET LOCAL lock_timeout = '6s';");
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("TRANSACTION_HASH_DIVERGENT");
  });

  test("com o pin desativado, o hash agregado de todos os blocos captura divergência isolada em B012/B013 (fora da transação)", () => {
    const marker = "pg_get_function_identity_arguments(p.oid)      AS assinatura,";
    expect(REAL_DRAFT).toContain(marker);
    const mutated = REAL_DRAFT.replace(marker, "pg_get_function_identity_arguments(p.oid)      AS assinatura_da_funcao,");
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("AGGREGATE_HASH_DIVERGENT");
  });
});

describe("runExtraction — E18 REQUIRED_FUNCTION_BODY_PRESENT", () => {
  // Todos os testes usam skipBlockHashPin: o pin por bloco rodaria primeiro
  // e mascararia o código de E18 que o teste quer isolar (ver cabeçalho).

  test("B007 ausente (removido do contrato de 13 blocos): falha antes mesmo de chegar a E18", () => {
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), "");
    const err = expectAbort(mutated, SKIP_PIN);
    expect(["MISSING_BEGIN", "BLOCK_COUNT"]).toContain(err.code);
  });

  test("B007 com corpo incompleto (assinatura ausente)", () => {
    const incomplete = "-- placeholder: copiar o corpo da SPEC secao J aqui";
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", incomplete));
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("E18_FUNCTION_BODY_MISSING");
  });

  test("B007 com hash divergente (corpo presente, mas reescrito) -- E18_HASH_DIVERGENT ao final, depois de E18 semântico e invariantes passarem", () => {
    const rewritten = B007_CANONICAL_BODY.replace("v_count     INTEGER;", "v_count     INT;");
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", rewritten));
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("E18_HASH_DIVERGENT");
  });

  test("orientação textual no lugar da função (nunca chega a conter CREATE OR REPLACE)", () => {
    const textOnly = "-- Corpo integral reproduzido na SPEC secao J. Copiar APENAS o corpo.";
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", textOnly));
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("E18_FUNCTION_BODY_MISSING");
  });

  test("dois CREATE OR REPLACE dentro do mesmo B007", () => {
    const doubled = `${B007_CANONICAL_BODY}\n\n${B007_CANONICAL_BODY}`;
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", doubled));
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("E18_NOT_EXACTLY_ONE");
  });

  test("B007 com GRANT executável dentro do bloco", () => {
    const withGrant = `${B007_CANONICAL_BODY}\n\nGRANT EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB) TO anon;`;
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", withGrant));
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("E18_GRANT_OR_REVOKE_PRESENT");
  });

  test("B007 com REVOKE executável dentro do bloco", () => {
    const withRevoke = `${B007_CANONICAL_BODY}\n\nREVOKE EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB) FROM PUBLIC;`;
    const mutated = VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", withRevoke));
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("E18_GRANT_OR_REVOKE_PRESENT");
  });

  test("posição depois dos DROPs (B007 e B008 trocados de lugar no arquivo)", () => {
    const b007Block = block("B007", B007_CANONICAL_BODY);
    const b008Block = block(
      "B008",
      "ALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;\n\nALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;",
    );
    const mutated = VALID_FIXTURE.replace(b007Block, "__B007_PLACEHOLDER__").replace(b008Block, b007Block).replace("__B007_PLACEHOLDER__", b008Block);
    const err = expectAbort(mutated, SKIP_PIN);
    expect(["NESTED_OR_OUT_OF_ORDER", "INVARIANT_FAILED"]).toContain(err.code);
  });

  describe("invite_token — qualquer ocorrência lexical (fronteira de palavra, sem substring)", () => {
    const withBody = (body: string) => VALID_FIXTURE.replace(block("B007", B007_CANONICAL_BODY), block("B007", body));

    test("1. INSERT em wave_responses.invite_token", () => {
      const body = B007_CANONICAL_BODY.replace(
        "INSERT INTO public.wave_responses (wave_id, cohort_id, instrument, instrument_version, answers)",
        "INSERT INTO public.wave_responses (wave_id, cohort_id, invite_token, instrument, instrument_version, answers)",
      );
      expect(expectAbort(withBody(body), SKIP_PIN).code).toBe("E18_INVITE_TOKEN_RESIDUAL");
    });

    test("2. UPDATE SET invite_token", () => {
      const body = `${B007_CANONICAL_BODY}\n  UPDATE public.wave_responses SET invite_token = NULL WHERE wave_id = v_link.wave_id;`;
      expect(expectAbort(withBody(body), SKIP_PIN).code).toBe("E18_INVITE_TOKEN_RESIDUAL");
    });

    test("3. SELECT invite_token", () => {
      const body = `${B007_CANONICAL_BODY}\n  PERFORM invite_token FROM public.wave_responses LIMIT 1;`;
      expect(expectAbort(withBody(body), SKIP_PIN).code).toBe("E18_INVITE_TOKEN_RESIDUAL");
    });

    test("4. RETURNING invite_token", () => {
      const body = `${B007_CANONICAL_BODY}\n  -- ... RETURNING invite_token;`;
      expect(expectAbort(withBody(body), SKIP_PIN).code).toBe("E18_INVITE_TOKEN_RESIDUAL");
    });

    test("5. referência qualificada wave_responses.invite_token", () => {
      const body = `${B007_CANONICAL_BODY}\n  -- nota: wave_responses.invite_token nao deveria mais existir`;
      expect(expectAbort(withBody(body), SKIP_PIN).code).toBe("E18_INVITE_TOKEN_RESIDUAL");
    });

    test("6. referência por alias wr.invite_token", () => {
      const body = `${B007_CANONICAL_BODY}\n  -- nota: wr.invite_token era o antigo padrao`;
      expect(expectAbort(withBody(body), SKIP_PIN).code).toBe("E18_INVITE_TOKEN_RESIDUAL");
    });

    test("7. ocorrência apenas em comentário", () => {
      const body = `${B007_CANONICAL_BODY}\n  -- TODO: revisar se invite_token precisa voltar (nao precisa)`;
      expect(expectAbort(withBody(body), SKIP_PIN).code).toBe("E18_INVITE_TOKEN_RESIDUAL");
    });

    test("8. ocorrência dentro de string literal", () => {
      const body = B007_CANONICAL_BODY.replace("'invalid_token'::TEXT", "'invite_token'::TEXT");
      expect(expectAbort(withBody(body), SKIP_PIN).code).toBe("E18_INVITE_TOKEN_RESIDUAL");
    });

    test("fronteira de palavra: identificador maior que CONTÉM a substring mas não é a palavra isolada não dispara por si só (a checagem ainda vale por hash/estrutura)", () => {
      // "convite_tokenizado" contém "invite_token"? Não -- escolhido de
      // propósito para não conter a substring; o objetivo deste teste é
      // documentar que \binvite_token\b não casa parcialmente dentro de um
      // identificador MAIOR que apenas comece igual, ex.: "invite_token_id"
      // MAS SEM underscore antes (fronteira à esquerda também importa).
      const body = `${B007_CANONICAL_BODY}\n  -- nota: outroinvite_tokenoutro nao deveria casar isoladamente`;
      // "outroinvite_tokenoutro" não tem fronteira de palavra em nenhum dos
      // lados de "invite_token" (letras coladas antes e depois) -- \b exige
      // transição entre caractere de palavra e não-palavra, então aqui NÃO
      // deveria casar. Confirma que a regex é \b ancorada, não substring nu.
      const result = (() => {
        try {
          runExtraction(withBody(body), SKIP_PIN);
          return "PASS";
        } catch (e) {
          return (e as ExtractionError).code;
        }
      })();
      expect(result).not.toBe("E18_INVITE_TOKEN_RESIDUAL");
    });
  });
});

describe("runExtraction — invariantes transacionais", () => {
  test("primeiro statement diferente de BEGIN (B001 alterado)", () => {
    const mutated = VALID_FIXTURE.replace(block("B001", "BEGIN;"), block("B001", "SELECT 1;"));
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("INVARIANT_FAILED");
  });

  test("último statement diferente de COMMIT (B011 alterado)", () => {
    const mutated = VALID_FIXTURE.replace(block("B011", "COMMIT;"), block("B011", "SELECT 1;"));
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("INVARIANT_FAILED");
  });

  test("COMMIT intermediário (B008 ganha um COMMIT extra)", () => {
    const mutated = VALID_FIXTURE.replace(
      block("B008", "ALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;\n\nALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;"),
      block("B008", "ALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;\nCOMMIT;\nALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;"),
    );
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("INVARIANT_FAILED");
  });

  test("ROLLBACK presente no caminho feliz", () => {
    const mutated = VALID_FIXTURE.replace(block("B011", "COMMIT;"), block("B011", "ROLLBACK;"));
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("INVARIANT_FAILED");
  });

  test("DROP CONSTRAINT depois do DROP COLUMN dentro de B008 (ordem interna invertida)", () => {
    const mutated = VALID_FIXTURE.replace(
      block("B008", "ALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;\n\nALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;"),
      block("B008", "ALTER TABLE public.wave_responses\n  DROP COLUMN invite_token;\n\nALTER TABLE public.wave_responses\n  DROP CONSTRAINT wave_responses_invite_token_fkey;"),
    );
    expect(expectAbort(mutated, SKIP_PIN).code).toBe("INVARIANT_FAILED");
  });
});

describe("runExtraction — separação real dos grupos B001–B011 / B012–B013", () => {
  test("as constantes de grupo são exatamente B001–B011 e B012–B013, disjuntas, e cobrem os 13 blocos", () => {
    expect(TRANSACTION_BLOCK_IDS).toEqual(["B001", "B002", "B003", "B004", "B005", "B006", "B007", "B008", "B009", "B010", "B011"]);
    expect(ACL_EVIDENCE_BLOCK_IDS).toEqual(["B012", "B013"]);
    const intersection = TRANSACTION_BLOCK_IDS.filter((id) => ACL_EVIDENCE_BLOCK_IDS.includes(id));
    expect(intersection).toEqual([]);
    const union = [...TRANSACTION_BLOCK_IDS, ...ACL_EVIDENCE_BLOCK_IDS].sort();
    expect(union).toEqual([...ALL_BLOCK_IDS].sort());
  });

  test("TRANSACTION_SQL do draft real não contém o conteúdo de B012 nem B013; ACL_EVIDENCE_SQL não contém o conteúdo de B001–B011", () => {
    const result = runExtraction(REAL_DRAFT);
    // Marcador exclusivo de B013 (fingerprint ACL) não deve aparecer na
    // transação; marcador exclusivo de B001 (BEGIN;) não deve aparecer na
    // evidência ACL.
    expect(result.transactionSql).not.toContain("acl_fingerprint_sha256");
    expect(result.transactionSql.trim().startsWith("BEGIN;")).toBe(true);
    expect(result.transactionSql.trim().endsWith("COMMIT;")).toBe(true);
    expect(result.aclEvidenceSql).not.toContain("BEGIN;");
    expect(result.aclEvidenceSql).not.toContain("CREATE OR REPLACE FUNCTION public.submit_sector_response");
  });

  test("B012 antecede B013 na saída de evidência/ACL", () => {
    const result = runExtraction(REAL_DRAFT);
    const idxB012Marker = result.aclEvidenceSql.indexOf("p.oid,");
    const idxB013Marker = result.aclEvidenceSql.indexOf("acl_fingerprint_sha256");
    expect(idxB012Marker).toBeGreaterThanOrEqual(0);
    expect(idxB013Marker).toBeGreaterThan(idxB012Marker);
  });
});
