import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Contrato D2 (MO2): toda leitura do Cofre de Ciclos que alimenta uma tela pede failClosed,
// e o servidor transforma a falha em erro recuperável — nunca em "nenhum ciclo".
const read = (p: string) => readFileSync(p, "utf8");
const FAIL_CLOSED = /loadOrgCycleHistory\([^)]*\{ failClosed: true \}\)/;

describe("D2 · leituras de ciclo com falha fechada", () => {
  test.each([
    "src/lib/api/board-brief.functions.ts",
    "src/lib/api/cycle-history.functions.ts",
    "src/lib/evolucao/reavaliacao-real.server.ts",
    "src/lib/nr1/pgr-document-real.server.ts",
    "src/lib/nr1/expedition-real.server.ts",
  ])("%s pede failClosed", (file) => {
    expect(read(file)).toMatch(FAIL_CLOSED);
  });

  test("Board Brief devolve read_failed, não insufficient_cycles", () => {
    const s = read("src/lib/api/board-brief.functions.ts");
    expect(s).toContain('return { available: false, reason: "read_failed" }');
  });

  test.each([
    "src/lib/api/cycle-history.functions.ts",
    "src/lib/api/victory.functions.ts",
    "src/lib/api/pgr-document.functions.ts",
  ])("%s devolve a mensagem recuperável", (file) => {
    expect(read(file)).toContain("error: CYCLE_HISTORY_UNAVAILABLE");
  });

  test("a mensagem diz que falha não é ausência de ciclos", async () => {
    const { CYCLE_HISTORY_UNAVAILABLE } = await import("./cycle-history.server");
    expect(CYCLE_HISTORY_UNAVAILABLE).toContain("não significa ausência de ciclos");
  });
});
