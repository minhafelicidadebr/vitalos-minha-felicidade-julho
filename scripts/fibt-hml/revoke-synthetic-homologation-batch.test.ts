import { describe, expect, test } from "bun:test";
import {
  RevokeError,
  parseRevokeArgs,
  planRevocation,
  runRevoke,
  type RevokeAdminClientLike,
} from "./revoke-synthetic-homologation-batch";

const FAKE_PRODUCTION_REF = "pppppppppppppppppppp";
const FAKE_PRODUCTION_ENV = { SUPABASE_URL: `https://${FAKE_PRODUCTION_REF}.supabase.co` };

const VALID_FLAGS = [
  "--environment=staging",
  "--expected-project-ref=xttjkpzhxtjfwxjsxuab",
  "--batch-id=FIBT-ISG-HML-01",
  "--confirm-revocation",
  "--dry-run",
];

describe("parseRevokeArgs — Fase 13: mesmos guardrails do gerador", () => {
  test("caminho feliz: dry-run, dados válidos", () => {
    const args = parseRevokeArgs(VALID_FLAGS, {});
    expect(args.commit).toBe(false);
    expect(args.batchId).toBe("FIBT-ISG-HML-01");
  });

  test("nunca produção — ref igual a SUPABASE_URL é recusado", () => {
    expect(() => parseRevokeArgs(VALID_FLAGS, FAKE_PRODUCTION_ENV)).not.toThrow();
    // ref usado no teste (xttjkpzhxtjfwxjsxuab) difere do de produção fake —
    // então o caminho feliz acima já prova que produção real não é tocada;
    // aqui confirmamos que o MESMO ref de produção é recusado se usado.
    const flags = VALID_FLAGS.map((f) =>
      f.startsWith("--expected-project-ref") ? `--expected-project-ref=${FAKE_PRODUCTION_REF}` : f,
    );
    expect(() => parseRevokeArgs(flags, FAKE_PRODUCTION_ENV)).toThrow(RevokeError);
    try {
      parseRevokeArgs(flags, FAKE_PRODUCTION_ENV);
    } catch (e) {
      expect((e as RevokeError).code).toBe("INVALID_PROJECT_REF");
    }
  });

  test("batch_id diferente do canônico é recusado — não é um script genérico multi-lote", () => {
    const flags = VALID_FLAGS.map((f) => (f.startsWith("--batch-id") ? "--batch-id=OUTRO-LOTE" : f));
    expect(() => parseRevokeArgs(flags, {})).toThrow(RevokeError);
  });

  test("sem --confirm-revocation, recusa", () => {
    const flags = VALID_FLAGS.filter((f) => f !== "--confirm-revocation");
    expect(() => parseRevokeArgs(flags, {})).toThrow(RevokeError);
  });

  test("--dry-run e --commit juntos são conflitantes", () => {
    expect(() => parseRevokeArgs([...VALID_FLAGS, "--commit"], {})).toThrow(RevokeError);
  });

  test("ambiente diferente de staging é recusado", () => {
    const flags = VALID_FLAGS.map((f) => (f.startsWith("--environment") ? "--environment=production" : f));
    expect(() => parseRevokeArgs(flags, {})).toThrow(RevokeError);
  });

  test("ausência de --commit é sempre dry-run", () => {
    const args = parseRevokeArgs(VALID_FLAGS.filter((f) => f !== "--dry-run"), {});
    expect(args.commit).toBe(false);
  });
});

describe("planRevocation — puro, determinístico", () => {
  test("descreve a organização/onda do lote sintético, nunca calcula contagem real (dry-run não lê o banco)", () => {
    const args = parseRevokeArgs(VALID_FLAGS, {});
    const plan = planRevocation(args);
    expect(plan.organizationSlug).toBe("isg-homologacao-assistida-fibt-hml-01");
    expect(plan.waveLabel).toBe("FIB-T Pré-Teste Sintético 01");
  });
});

describe("runRevoke — fake client, zero rede", () => {
  const args = parseRevokeArgs(VALID_FLAGS, {});
  const plan = planRevocation(args);

  function fakeClient(opts: { orgExists: boolean; unusedCount: number }): RevokeAdminClientLike {
    return {
      from(table: string) {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    if (table === "organizations") {
                      return opts.orgExists ? { data: { id: "org-1" }, error: null } : { data: null, error: null };
                    }
                    if (table === "waves") return { data: { id: "wave-1" }, error: null };
                    return { data: null, error: null };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq() {
                return {
                  async is() {
                    return {
                      data: Array.from({ length: opts.unusedCount }, (_, i) => ({ token: `t${i}` })),
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  test("organização inexistente → ORGANIZATION_NOT_FOUND, nada alterado", async () => {
    const outcome = await runRevoke(plan, fakeClient({ orgExists: false, unusedCount: 0 }));
    expect(outcome.status).toBe("ORGANIZATION_NOT_FOUND");
  });

  test("revoga só os convites não usados — manifest sem token, com contagem", async () => {
    const outcome = await runRevoke(plan, fakeClient({ orgExists: true, unusedCount: 3 }));
    expect(outcome.status).toBe("REVOKED");
    if (outcome.status !== "REVOKED") throw new Error("unreachable");
    expect(outcome.revokedCount).toBe(3);
    expect(JSON.stringify(outcome.manifestRow)).not.toContain("token");
    expect(outcome.manifestRow.batch_id).toBe("FIBT-ISG-HML-01");
  });

  test("zero convites não usados ainda retorna REVOKED com contagem zero (idempotente)", async () => {
    const outcome = await runRevoke(plan, fakeClient({ orgExists: true, unusedCount: 0 }));
    expect(outcome.status).toBe("REVOKED");
    if (outcome.status !== "REVOKED") throw new Error("unreachable");
    expect(outcome.revokedCount).toBe(0);
  });
});

describe("garantias estruturais de escopo — nunca DELETE, nunca produção, nunca --commit nesta rodada", () => {
  test("o módulo-fonte não contém nenhuma chamada .delete( em lugar nenhum", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./revoke-synthetic-homologation-batch.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\.delete\(/);
  });

  test("checkDeploymentAttestation/createClient só são alcançáveis depois do exit de dry-run", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./revoke-synthetic-homologation-batch.ts", import.meta.url), "utf8");
    const mainBlockStart = source.indexOf("if (import.meta.main)");
    const dryRunExit = source.indexOf("process.exit(0)", mainBlockStart);
    const createClientCall = source.indexOf("createClient(", mainBlockStart);
    expect(dryRunExit).toBeGreaterThan(mainBlockStart);
    expect(createClientCall).toBeGreaterThan(dryRunExit);
  });
});
