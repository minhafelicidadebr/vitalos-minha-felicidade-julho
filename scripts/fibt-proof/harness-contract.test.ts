import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { buildTerminalFailureEvidence, HARNESS_VERSION } from "./run-tier1";

/**
 * Testes estáticos de contrato do harness — separados de extract-block.test.ts
 * porque testam propriedades de arquivos/funções diferentes (o schema
 * sintético SQL e o construtor de evidência terminal de run-tier1.ts), não a
 * lógica de extração multibloco. Nenhum inicia PostgreSQL, Docker ou
 * subprocesso — importar run-tier1.ts aqui não dispara nada porque toda a
 * validação de CLI/env e o próprio harness vivem atrás de `import.meta.main`.
 */

describe("harness/00-base-schema.sql — dependência de pgcrypto declarada", () => {
  const schema = readFileSync("scripts/fibt-proof/harness/00-base-schema.sql", "utf8");

  test("gen_random_bytes aparece no harness (usado no DEFAULT de wave_invites.token)", () => {
    expect(schema).toContain("gen_random_bytes(24)");
  });

  test("CREATE EXTENSION IF NOT EXISTS pgcrypto aparece explicitamente", () => {
    expect(schema).toContain("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
  });

  test("a criação da extensão antecede a primeira referência a gen_random_bytes", () => {
    const extIdx = schema.indexOf("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    const useIdx = schema.indexOf("gen_random_bytes(24)");
    expect(extIdx).toBeGreaterThanOrEqual(0);
    expect(useIdx).toBeGreaterThan(extIdx);
  });

  test("nenhuma outra extensão inesperada é introduzida", () => {
    const extensions = [...schema.matchAll(/CREATE EXTENSION IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
    expect(extensions).toEqual(["pgcrypto"]);
  });

  test("gen_random_uuid (built-in desde PG13, não depende de pgcrypto) continua em uso sem extensão própria", () => {
    // Confirma que a única extensão declarada é mesmo necessária -- não
    // existe uma segunda dependência silenciosa (ex.: se alguém confundisse
    // gen_random_uuid com algo que precisasse de extensão).
    expect(schema).toContain("gen_random_uuid()");
    const extensions = [...schema.matchAll(/CREATE EXTENSION IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
    expect(extensions).not.toContain("uuid-ossp");
  });
});

describe("run-tier1.ts — evidência terminal sanitizada (exceção não tratada)", () => {
  test("importar o módulo não dispara nenhum efeito colateral (sem PG_CONTAINER_ID/RUNNER_TEMP no ambiente de teste)", () => {
    // Se este teste sequer rodar sem o processo abortar, já prova que a
    // importação é segura -- toda a validação de CLI/env está atrás de
    // `import.meta.main`.
    expect(typeof buildTerminalFailureEvidence).toBe("function");
    expect(typeof HARNESS_VERSION).toBe("string");
    expect(HARNESS_VERSION.length).toBeGreaterThan(0);
  });

  test("constrói evidência com os campos exigidos", () => {
    const ev = buildTerminalFailureEvidence({
      phase: "TIER1_SCENARIOS",
      failureCode: "UNCAUGHT_EXCEPTION",
      sourceSha: "a".repeat(40),
    });
    expect(ev.status).toBe("FAIL");
    expect(ev.phase).toBe("TIER1_SCENARIOS");
    expect(ev.failure_code).toBe("UNCAUGHT_EXCEPTION");
    expect(ev.source_sha).toBe("a".repeat(40));
    expect(ev.harness_version).toBe(HARNESS_VERSION);
    expect(typeof ev.generated_at).toBe("string");
    expect(() => new Date(ev.generated_at).toISOString()).not.toThrow();
  });

  test("source_sha ausente vira null, não undefined nem string vazia disfarçada", () => {
    const ev = buildTerminalFailureEvidence({ phase: "STARTUP", failureCode: "UNCAUGHT_EXCEPTION" });
    expect(ev.source_sha).toBeNull();
  });

  test("status aceita override para INCONCLUSIVE quando a fase não permite concluir FAIL com certeza", () => {
    const ev = buildTerminalFailureEvidence({ phase: "STARTUP", failureCode: "UNCAUGHT_EXCEPTION", status: "INCONCLUSIVE" });
    expect(ev.status).toBe("INCONCLUSIVE");
  });

  test("a função só aceita um failure_code textual -- não há parâmetro para passar o objeto Error inteiro", () => {
    // Prova estrutural, não de runtime: a assinatura de buildTerminalFailureEvidence
    // não tem um campo `error`/`stack`/`raw` -- só phase/failureCode/sourceSha/status.
    const ev = buildTerminalFailureEvidence({ phase: "X", failureCode: "Y" });
    const keys = Object.keys(ev).sort();
    expect(keys).toEqual(["failure_code", "generated_at", "harness_version", "phase", "source_sha", "status"]);
  });

  test("evidência nunca contém as strings 'password', 'secret', 'token=' ou 'postgres://' em nenhum campo", () => {
    const ev = buildTerminalFailureEvidence({
      phase: "TIER1_SCENARIOS",
      failureCode: "UNCAUGHT_EXCEPTION",
      sourceSha: "deadbeef",
    });
    const serialized = JSON.stringify(ev).toLowerCase();
    for (const forbidden of ["password", "secret", "token=", "postgres://", "connectionstring"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
