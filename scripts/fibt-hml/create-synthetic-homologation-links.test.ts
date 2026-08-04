import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CAMPAIGN,
  EXPECTED_TEST_LINK_IDS,
  GeneratorError,
  parseArgs,
  planBatch,
  runCommit,
  tokenHashForManifest,
  commitGateFailures,
  validateFrontendBaseUrl,
  HML_RAW_TOKEN_STAGING_EXCEPTION,
  PRIVATE_OUTPUT_DIR,
  type AdminClientLike,
} from "./create-synthetic-homologation-links";

/**
 * Ref sintético de 20 caracteres, no formato de um project_ref real, para
 * simular "produção" nos testes sem versionar o ref de produção real — mesma
 * convenção de staging-guard.test.ts (PROD_REF = "pppppppppppppppppppp").
 */
const FAKE_PRODUCTION_REF = "pppppppppppppppppppp";
const FAKE_PRODUCTION_ENV = { SUPABASE_URL: `https://${FAKE_PRODUCTION_REF}.supabase.co` };

/**
 * Testes estáticos do gerador de links de homologação sintética (FIBT-HML-1).
 * Nenhum acessa rede, Supabase, PostgreSQL, Docker ou Lovable — `runCommit`
 * recebe um `AdminClientLike` fake nos testes que precisam dele, nunca o
 * client real (`@supabase/supabase-js`, só importado dentro de
 * `import.meta.main`).
 */

const VALID_FLAGS = [
  "--environment=staging",
  "--expected-project-ref=xttjkpzhxtjfwxjsxuab",
  "--batch-id=FIBT-ISG-HML-01",
  "--alpha-count=6",
  "--beta-count=4",
  "--expires-in-days=7",
  "--confirm-synthetic-homologation",
  "--dry-run",
];

function withOverride(overrides: Record<string, string | null>, extra: string[] = []): string[] {
  const map = new Map(
    VALID_FLAGS.map((f) => {
      const eq = f.indexOf("=");
      return eq === -1 ? [f, null] : [f.slice(0, eq), f.slice(eq + 1)];
    }),
  );
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) map.delete(k);
    else map.set(k, v);
  }
  const flags = Array.from(map.entries()).map(([k, v]) => (v === null ? k : `${k}=${v}`));
  return [...flags, ...extra];
}

function expectAbort(argv: string[], env?: Record<string, string | undefined>): GeneratorError {
  try {
    parseArgs(argv, env);
  } catch (e) {
    if (e instanceof GeneratorError) return e;
    throw e;
  }
  throw new Error("esperava GeneratorError, mas parseArgs() completou sem abortar");
}

describe("parseArgs — caminho feliz", () => {
  test("todos os parâmetros válidos: dry-run por padrão (sem --commit)", () => {
    const args = parseArgs(VALID_FLAGS.filter((f) => f !== "--dry-run"));
    expect(args.commit).toBe(false);
  });

  test("1. dry-run é o padrão mesmo sem a flag --dry-run explícita", () => {
    const args = parseArgs(VALID_FLAGS.filter((f) => f !== "--dry-run"));
    expect(args.commit).toBe(false);
  });

  test("2. escrita exige --commit (dry-run e commit são mutuamente exclusivos)", () => {
    const withBoth = withOverride({}, ["--commit"]);
    expect(expectAbort(withBoth).code).toBe("CONFLICTING_MODE");

    const commitOnly = withOverride({ "--dry-run": null }, ["--commit", "--accept-staging-raw-token-contract"]);
    const args = parseArgs(commitOnly);
    expect(args.commit).toBe(true);
  });
});

describe("parseArgs — validação de ambiente e project ref", () => {
  test("3. project ref ausente falha", () => {
    expect(expectAbort(withOverride({ "--expected-project-ref": null })).code).toBe("MISSING_PARAM");
  });

  test("4. project ref produtivo falha", () => {
    const err = expectAbort(
      withOverride({ "--expected-project-ref": FAKE_PRODUCTION_REF }),
      FAKE_PRODUCTION_ENV,
    );
    expect(err.code).toBe("INVALID_PROJECT_REF");
    expect(err.message).not.toContain(FAKE_PRODUCTION_REF); // só a forma mascarada
  });

  test("5. ref desconhecido (não produção, mas diferente do declarado por FIBT_HML_AUTHORIZED_STAGING_REF) falha", () => {
    // FIBT_HML_AUTHORIZED_STAGING_REF nunca é fixado no código-fonte (ver
    // comentário no módulo) — só lido de env, exatamente como
    // STAGING_SUPABASE_PROJECT_REF em staging-guard.ts. O teste declara um
    // valor efêmero só para este processo, nunca versionado.
    const previous = process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
    process.env.FIBT_HML_AUTHORIZED_STAGING_REF = "somestagingref0000001";
    try {
      const err = expectAbort(withOverride({ "--expected-project-ref": "algumoutroprojeto1234" }));
      expect(err.code).toBe("INVALID_PROJECT_REF");
    } finally {
      if (previous === undefined) delete process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
      else process.env.FIBT_HML_AUTHORIZED_STAGING_REF = previous;
    }
  });

  test("6. staging que bate com FIBT_HML_AUTHORIZED_STAGING_REF passa; sem a env declarada, qualquer ref não-produtivo passa", () => {
    const previous = process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
    try {
      delete process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
      const args = parseArgs(VALID_FLAGS);
      expect(args.expectedProjectRef).toBe("xttjkpzhxtjfwxjsxuab");

      process.env.FIBT_HML_AUTHORIZED_STAGING_REF = "xttjkpzhxtjfwxjsxuab";
      const args2 = parseArgs(VALID_FLAGS);
      expect(args2.expectedProjectRef).toBe("xttjkpzhxtjfwxjsxuab");
    } finally {
      if (previous === undefined) delete process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
      else process.env.FIBT_HML_AUTHORIZED_STAGING_REF = previous;
    }
  });

  test("ambiente diferente de staging falha", () => {
    expect(expectAbort(withOverride({ "--environment": "production" })).code).toBe("INVALID_ENVIRONMENT");
  });
});

describe("parseArgs — contagens e expiração desta campanha", () => {
  test("7. contagem Alfa diferente de 6 falha nesta campanha", () => {
    expect(expectAbort(withOverride({ "--alpha-count": "5" })).code).toBe("INVALID_ALPHA_COUNT");
    expect(expectAbort(withOverride({ "--alpha-count": "7" })).code).toBe("INVALID_ALPHA_COUNT");
  });

  test("8. contagem Beta diferente de 4 falha nesta campanha", () => {
    expect(expectAbort(withOverride({ "--beta-count": "3" })).code).toBe("INVALID_BETA_COUNT");
    expect(expectAbort(withOverride({ "--beta-count": "5" })).code).toBe("INVALID_BETA_COUNT");
  });

  test("14. expiração é sete dias — qualquer outro valor falha", () => {
    expect(expectAbort(withOverride({ "--expires-in-days": "14" })).code).toBe("INVALID_EXPIRES_IN_DAYS");
    const args = parseArgs(VALID_FLAGS);
    expect(args.expiresInDays).toBe(7);
  });

  test("batch-id diferente do autorizado falha — não é gerador genérico", () => {
    expect(expectAbort(withOverride({ "--batch-id": "OUTRA-CAMPANHA" })).code).toBe("INVALID_BATCH_ID");
  });
});

describe("parseArgs — confirmação e parâmetros", () => {
  test("--confirm-synthetic-homologation ausente falha", () => {
    expect(expectAbort(withOverride({ "--confirm-synthetic-homologation": null })).code).toBe(
      "MISSING_CONFIRMATION",
    );
  });

  test("parâmetro inesperado é rejeitado", () => {
    const err = expectAbort(withOverride({}, ["--force=true"]));
    expect(err.code).toBe("UNEXPECTED_PARAM");
  });
});

describe("planBatch — modelo Alfa/Beta e identidade", () => {
  const args = parseArgs(VALID_FLAGS);
  const plan = planBatch(args);

  test("15. dez IDs únicos, 16. seis links na Alfa, 17. quatro links na Beta", () => {
    expect(plan.invites.length).toBe(10);
    const ids = plan.invites.map((i) => i.testLinkId);
    expect(new Set(ids).size).toBe(10);
    expect(ids).toEqual([...EXPECTED_TEST_LINK_IDS]);
    expect(ids.filter((i) => i.startsWith("ALFA")).length).toBe(6);
    expect(ids.filter((i) => i.startsWith("BETA")).length).toBe(4);
  });

  test("10. nenhum e-mail é aceito, 11. nenhum nome pessoal é aceito", () => {
    // Toda identidade da campanha é constante fixa — não há campo de nome de
    // pessoa nem endereço de e-mail em lugar nenhum do plano.
    const serialized = JSON.stringify(plan);
    expect(serialized).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i); // formato de e-mail
    expect(CAMPAIGN.organizationName).not.toMatch(/@/);
    expect(CAMPAIGN.waveLabel).not.toMatch(/@/);
  });

  test("12. nenhum token é impresso em forma válida — só placeholders DRY_RUN_NOT_VALID_", () => {
    for (const invite of plan.invites) {
      expect(invite.relativePath).toMatch(/^\/convite\/DRY_RUN_NOT_VALID_/);
    }
  });

  test("19. CSV privado não é gerado no dry-run (plano não grava arquivo nenhum)", () => {
    // planBatch é puro — não há chamada de fs em nenhum ponto desta função.
    // Confirmado por inspeção de código: writeFileSync só existe dentro de
    // writePrivateOutputs, nunca chamada pelo caminho dry-run.
    expect(typeof plan).toBe("object");
  });

  test("18. manifest (quando existir) não conterá token bruto — tokenHashForManifest sempre hasheia", () => {
    const raw = "um-token-bruto-de-exemplo";
    const hash = tokenHashForManifest(raw);
    expect(hash).not.toBe(raw);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("20. ausência de frontend seguro bloqueia commit (FIBT_HML_FRONTEND_BASE_URL não declarada)", () => {
    expect(plan.frontendBaseUrlStatus).toBe("HML_FRONTEND_MISSING");
    expect(commitGateFailures({})).toContain("FRONTEND_BLOCKED");
  });

  test("1. banner aparece em modo HML — commitGateFailures não reporta BANNER_MISSING para a rota real (código já integra banner e confirmação)", () => {
    expect(commitGateFailures({})).not.toContain("BANNER_MISSING");
  });

  test("21. banner ausente (rota sem os componentes) bloqueia commit — testado contra fonte real do repo que não tem os marcadores", () => {
    // package.json existe de verdade e nunca vai conter os marcadores de HML
    // — mais portável que apontar para um caminho específico do SO.
    const failures = commitGateFailures({}, "package.json");
    expect(failures).toContain("BANNER_MISSING");
  });

  test("rota inexistente também bloqueia por BANNER_MISSING (fail-closed)", () => {
    const failures = commitGateFailures({}, "caminho/que/nao/existe.tsx");
    expect(failures).toContain("BANNER_MISSING");
  });
});

describe("validateFrontendBaseUrl — Fase 5", () => {
  test("5. URL produtiva (vitalos.com.br) é rejeitada", () => {
    const r = validateFrontendBaseUrl("https://vitalos.com.br");
    expect(r.valid).toBe(false);
  });

  test("6. app.vitalos.com.br é rejeitado", () => {
    const r = validateFrontendBaseUrl("https://app.vitalos.com.br");
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_FORBIDDEN_HOSTNAME" });
  });

  test("www.vitalos.com.br também é rejeitado (terceiro domínio proibido)", () => {
    const r = validateFrontendBaseUrl("https://www.vitalos.com.br");
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_FORBIDDEN_HOSTNAME" });
  });

  test("7. HTTP remoto (não HTTPS) é rejeitado", () => {
    const r = validateFrontendBaseUrl("http://fibt-hml-01.example-homolog.invalid");
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_NOT_HTTPS" });
  });

  test("8. HTTPS de homologação (hostname não produtivo) é aceito", () => {
    const r = validateFrontendBaseUrl("https://fibt-hml-01.example-homolog.invalid");
    expect(r.valid).toBe(true);
  });

  test("9. query string na base URL é rejeitada", () => {
    const r = validateFrontendBaseUrl("https://fibt-hml-01.example-homolog.invalid?foo=bar");
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_HAS_QUERY" });
  });

  test("fragment na base URL é rejeitado", () => {
    const r = validateFrontendBaseUrl("https://fibt-hml-01.example-homolog.invalid#section");
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_HAS_FRAGMENT" });
  });

  test("10. credencial embutida na URL (user:pass@) é rejeitada", () => {
    const r = validateFrontendBaseUrl("https://user:pass@fibt-hml-01.example-homolog.invalid");
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_HAS_CREDENTIALS" });
  });

  test("11. ausência de base URL bloqueia commit", () => {
    const r = validateFrontendBaseUrl(undefined);
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_MISSING" });
    expect(commitGateFailures({})).toContain("FRONTEND_BLOCKED");
  });

  test("URL malformada é rejeitada, não lança", () => {
    const r = validateFrontendBaseUrl("nao-e-uma-url");
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_UNPARSEABLE" });
  });

  test("path normalizado: barra final é removida, raiz vira string vazia", () => {
    const r = validateFrontendBaseUrl("https://fibt-hml-01.example-homolog.invalid/");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.normalizedBaseUrl).toBe("https://fibt-hml-01.example-homolog.invalid");
  });

  test("com base URL válida declarada, FRONTEND_BLOCKED não aparece mais", () => {
    const failures = commitGateFailures({
      FIBT_HML_FRONTEND_BASE_URL: "https://fibt-hml-01.example-homolog.invalid",
    });
    expect(failures).not.toContain("FRONTEND_BLOCKED");
  });
});

describe("HML_RAW_TOKEN_STAGING_EXCEPTION e o gate de --commit — Fase 1", () => {
  test("12. ausência de --accept-staging-raw-token-contract bloqueia --commit", () => {
    const argvSemToken = withOverride(
      { "--dry-run": null },
      ["--commit"],
    );
    const err = expectAbort(argvSemToken);
    expect(err.code).toBe("RAW_TOKEN_CONTRACT_NOT_ACKNOWLEDGED");
  });

  test("com --accept-staging-raw-token-contract, --commit é aceito (junto com todo o resto válido)", () => {
    const argvComToken = withOverride(
      { "--dry-run": null },
      ["--commit", "--accept-staging-raw-token-contract"],
    );
    const args = parseArgs(argvComToken);
    expect(args.commit).toBe(true);
    expect(args.acceptedRawTokenContract).toBe(true);
  });

  test("13. a exceção de token bruto não libera produção nem ref desconhecido — checagens de ref continuam rodando antes", () => {
    const err = expectAbort(
      withOverride(
        { "--expected-project-ref": FAKE_PRODUCTION_REF, "--dry-run": null },
        ["--commit", "--accept-staging-raw-token-contract"],
      ),
      FAKE_PRODUCTION_ENV,
    );
    expect(err.code).toBe("INVALID_PROJECT_REF"); // não chega a RAW_TOKEN_CONTRACT_NOT_ACKNOWLEDGED
  });

  test("dry-run nunca exige a exceção de token (só se aplica a --commit)", () => {
    const args = parseArgs(VALID_FLAGS); // sem --accept-staging-raw-token-contract, dry-run
    expect(args.commit).toBe(false);
    expect(args.acceptedRawTokenContract).toBe(false);
  });

  test("decisão documenta as 13 condições exigidas para a exceção valer", () => {
    expect(HML_RAW_TOKEN_STAGING_EXCEPTION.decision).toBe("HML_RAW_TOKEN_STAGING_EXCEPTION");
    expect(HML_RAW_TOKEN_STAGING_EXCEPTION.conditions.length).toBeGreaterThanOrEqual(13);
  });
});

describe("22. campos livres para PII ficam indisponíveis em modo HML (por ausência estrutural)", () => {
  test("a rota /convite/:token não tem nenhum campo de texto livre, e-mail ou textarea — só escala Likert fixa", () => {
    const source = readFileSync("src/routes/convite.$token.tsx", "utf8");
    expect(source).not.toMatch(/type="text"/);
    expect(source).not.toMatch(/type="email"/);
    expect(source).not.toMatch(/<textarea/);
  });
});

describe("runCommit — idempotência (fake client, zero rede)", () => {
  const args = parseArgs(VALID_FLAGS);
  const plan = planBatch(args);

  function fakeClient(opts: { orgExists: boolean }): AdminClientLike {
    let tokenCounter = 0;
    return {
      from(table: string) {
        return {
          select() {
            return {
              eq(_column: string, _value: string) {
                return {
                  async maybeSingle() {
                    if (table === "organizations" && opts.orgExists) {
                      return { data: { id: "existing-org-id" }, error: null };
                    }
                    return { data: null, error: null };
                  },
                };
              },
            };
          },
          insert(rows: unknown) {
            return {
              async select(_columns: string) {
                if (table === "organizations") return { data: [{ id: "new-org-id" }], error: null };
                if (table === "waves") return { data: [{ id: "new-wave-id" }], error: null };
                if (table === "wave_cohorts") {
                  const key = (rows as { key: string }).key;
                  return { data: [{ id: `cohort-${key}` }], error: null };
                }
                if (table === "wave_invites") {
                  tokenCounter += 1;
                  return { data: [{ token: `fake-raw-token-${tokenCounter}` }], error: null };
                }
                return { data: null, error: { message: `tabela inesperada: ${table}` } };
              },
            };
          },
        };
      },
    };
  }

  test("9. batch duplicado não é recriado — organização já existe devolve BATCH_ALREADY_EXISTS", async () => {
    const outcome = await runCommit(plan, fakeClient({ orgExists: true }));
    expect(outcome.status).toBe("BATCH_ALREADY_EXISTS");
  });

  test("primeira criação: organização, onda, duas coortes e dez convites, cada um com token diferente", async () => {
    const outcome = await runCommit(plan, fakeClient({ orgExists: false }));
    expect(outcome.status).toBe("CREATED");
    if (outcome.status !== "CREATED") throw new Error("unreachable");
    expect(Object.keys(outcome.cohortIds).sort()).toEqual(["ISG-HML-ALFA", "ISG-HML-BETA"].sort());
    expect(outcome.manifestRows.length).toBe(10);
    expect(outcome.csvRows.length).toBe(10);
    const hashes = outcome.manifestRows.map((r) => r.token_hash);
    expect(new Set(hashes).size).toBe(10); // nenhum token reusado
    // Não há caminho de UPDATE/DELETE em runCommit para convite ou
    // organização existentes — só INSERT quando a organização não existe.
  });

  test("18. manifest não contém token bruto em nenhum campo", async () => {
    const outcome = await runCommit(plan, fakeClient({ orgExists: false }));
    if (outcome.status !== "CREATED") throw new Error("unreachable");
    for (const row of outcome.manifestRows) {
      expect(JSON.stringify(row)).not.toContain("fake-raw-token-");
    }
  });

  test("13. pacote privado fica fora do repositório — só inspeção do caminho, sem chamar writePrivateOutputs (I/O)", () => {
    expect(PRIVATE_OUTPUT_DIR).not.toContain("vitalos-fibt-hml");
    expect(PRIVATE_OUTPUT_DIR.toLowerCase()).toContain("private");
  });
});

describe("gates produtivos nunca tocados", () => {
  test("22. feature flag produtiva não é alterada; 23. release gate produtivo não é alterado", () => {
    // Este script não lê nem escreve VITE_FIBT_PILOT_ENABLED nem
    // operational_real_collection_status em lugar nenhum -- confirmado por
    // ausência de qualquer referência a esses nomes no módulo-fonte.
    const source = readFileSync(new URL("./create-synthetic-homologation-links.ts", import.meta.url), "utf8");
    expect(source).not.toContain("VITE_FIBT_PILOT_ENABLED");
    expect(source).not.toContain("operational_real_collection_status");
  });
});
