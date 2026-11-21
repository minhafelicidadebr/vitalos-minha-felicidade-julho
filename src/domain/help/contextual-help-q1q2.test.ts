import { describe, expect, test } from "bun:test";
import { HELP_Q1_PREPARACAO, HELP_Q2_ACOES, HELP_Q2_DEVOLUTIVA } from "./contextual-help";
import { helpRoleFromPersona, validateHelpEntry } from "@/engine/help/contextual-help-engine";

describe("ajuda Q1/Q2 · onda 2", () => {
  test("as três entradas passam no validador", () => {
    for (const e of [HELP_Q1_PREPARACAO, HELP_Q2_DEVOLUTIVA, HELP_Q2_ACOES]) expect(validateHelpEntry(e)).toEqual([]);
  });

  test("Q1: o resumo diz que preparar não abre a coleta e que ela segue bloqueada", () => {
    expect(HELP_Q1_PREPARACAO.summary).toContain("Preparar não abre a coleta");
    expect(HELP_Q1_PREPARACAO.summary).toContain("seguem bloqueados");
    expect(HELP_Q1_PREPARACAO.limits).toContain("Preparar não abre a coleta e não gera resultado.");
  });

  test("Q2 (Domínio A) nunca cita o Manual NR-1 (Domínio B) nem vincula estudo", () => {
    for (const e of [HELP_Q2_DEVOLUTIVA, HELP_Q2_ACOES]) {
      expect(e.sources.every((s) => s.nature === "produto")).toBe(true);
      expect(e.evidence).toBeUndefined();
      expect(JSON.stringify(e)).not.toMatch(/NR-1|PGR|COPSOQ/);
    }
  });

  test("Q2: devolutiva e ações dizem que não há resposta individual nem prova de efeito", () => {
    expect(HELP_Q2_DEVOLUTIVA.limits).toContain("Não mostra respostas individuais.");
    expect(HELP_Q2_ACOES.limits).toContain("Execução registrada não é prova de efeito.");
  });

  test("papéis institucionais reais viram leitura, não autorização", () => {
    expect(helpRoleFromPersona("DGP_RH")).toBe("rh");
    expect(helpRoleFromPersona("DIRETOR")).toBe("direcao");
    expect(helpRoleFromPersona("SESMT_SAUDE")).toBe("sst");
  });
});
