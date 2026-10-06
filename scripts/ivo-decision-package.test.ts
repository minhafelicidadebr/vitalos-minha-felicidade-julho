import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { getGovernanceEntries } from "../src/domain/ivo/methodology-governance";
import { DECISION_PACKAGE_PATH, renderDecisionPackage } from "./ivo-decision-package";

describe("pacote único de decisões", () => {
  test("o arquivo versionado corresponde ao registro canônico (sem divergência silenciosa)", () => {
    const committed = readFileSync(DECISION_PACKAGE_PATH, "utf8").replace(/\r\n/g, "\n");
    expect(committed).toBe(renderDecisionPackage());
  });

  test("cobre todas as entradas do registro e não afirma nenhuma aprovação", () => {
    const text = renderDecisionPackage();
    for (const e of getGovernanceEntries()) expect(text).toContain(`### ${e.id} — ${e.title}`);
    expect(text).toContain("**Nada está aprovado.**");
    expect(text).not.toMatch(/Estado: \*\*(Aprovado|Validado)/);
  });

  test("D4 e D5 só listam perguntas e dizem que nenhuma mensagem é enviada a terceiros", () => {
    const text = renderDecisionPackage();
    expect(text).toContain("não envia mensagens a terceiros");
    expect(text).toContain("Confirmacao do item 5 no Fator 3");
    expect(text).toContain("externa — a verificar");
  });
});