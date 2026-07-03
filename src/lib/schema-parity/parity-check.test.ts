// TESTE-KEYSTONE do Sprint S0: confronta as migrations REAIS com o uso REAL de
// schema no código. Enquanto houver RPC/coluna usada sem migration que a defina,
// ESTE teste falha — é o drift (P0-02) convertido em gate de build.
//
// Fica verde quando a migration de reconciliação cobre tudo que o código usa.
// (Alinhar a PRODUÇÃO com o repo é o passo humano de docs/RUNBOOK_MIGRACOES_LOVABLE.md.)

import { describe, expect, test } from "bun:test";
import { runParity } from "./parity-io";
import { formatParityReport } from "./parity-core";

describe("paridade de schema · repo real (P0-02)", () => {
  const report = runParity();

  test("toda RPC, tabela e coluna usadas pelo código têm definição versionada", () => {
    if (!report.ok) {
      // Mensagem legível no output do teste — nomeia exatamente o que falta.
      throw new Error("\n" + formatParityReport(report));
    }
    expect(report.ok).toBe(true);
  });

  test("nenhuma RPC órfã (usada sem CREATE FUNCTION nas migrations)", () => {
    expect(report.missingFunctions.map((f) => f.name)).toEqual([]);
  });

  test("nenhuma coluna do manifesto ausente das migrations", () => {
    expect(report.missingColumns.map((c) => `${c.table}.${c.column}`)).toEqual([]);
  });
});
