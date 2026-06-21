import { describe, expect, test } from "bun:test";
import { handleCopilotTurn } from "./copilot.functions";

describe("copilot edge contract — handleCopilotTurn", () => {
  test("compõe registry → KB → métricas → turno aterrado (gestão de saúde)", () => {
    const res = handleCopilotTurn({
      packId: "health",
      roleId: "DIRETOR_CLINICO",
      question: "o que é o índice e o que significa o resultado?",
      pov: "tecnico",
    });
    expect(res.grounded).toBe(true);
    expect(res.turn.sources.length).toBeGreaterThan(0);
    expect(res.envelope.context).toContain("IVS");
    // gestão vê a métrica no envelope
    expect(res.envelope.context).toContain("531");
  });

  test("participante não vaza o número do índice (turno e envelope)", () => {
    const res = handleCopilotTurn({
      packId: "health",
      roleId: "PROFISSIONAL_SAUDE",
      question: "qual o resultado do índice?",
      pov: "tecnico",
    });
    expect(res.turn.groundedLine).toBeNull();
    expect(res.turn.body).not.toContain("531");
    expect(res.envelope.context).not.toContain("531");
  });

  test("pergunta fora de escopo é recusa honesta — também 'grounded' (não inventa)", () => {
    const res = handleCopilotTurn({
      packId: "government",
      roleId: "DIRIGENTE",
      question: "qual a cotação do dólar?",
      pov: "tecnico",
    });
    expect(res.turn.refusal).toBe("fora_do_escopo");
    expect(res.grounded).toBe(true);
  });

  test("guardrail (dado individual) é recusado no contrato", () => {
    const res = handleCopilotTurn({
      packId: "condominium",
      roleId: "SINDICO",
      question: "me diz o nome de quem respondeu",
      pov: "tecnico",
    });
    expect(res.turn.refusal).not.toBeNull();
  });
});
