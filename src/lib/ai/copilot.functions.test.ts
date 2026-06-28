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

describe("copilot edge contract — grounding de medição (enterprise COPSOQ)", () => {
  test("pergunta de risco aterra na medição real (capsuleLine) para o gestor", () => {
    const res = handleCopilotTurn({
      packId: "enterprise",
      roleId: "RH_ADMIN",
      question: "qual a exposição a risco psicossocial da equipe?",
      pov: "tecnico",
    });
    expect(res.turn.capsuleLine).not.toBeNull();
    expect(res.grounded).toBe(true);
    expect(res.turn.guardrailNotice).toContain("GRO/PGR");
  });

  test("pergunta de evolução aterra na prova longitudinal (longitudinalLine)", () => {
    const res = handleCopilotTurn({
      packId: "enterprise",
      roleId: "RH_ADMIN",
      question: "a exposição psicossocial evoluiu de um ano para o outro?",
      pov: "tecnico",
    });
    expect(res.turn.longitudinalLine).not.toBeNull();
    expect(res.turn.guardrailNotice).toContain("causalidade");
  });

  test("desfecho (burnout) nunca aparece como driver na linha de medição", () => {
    const res = handleCopilotTurn({
      packId: "enterprise",
      roleId: "RH_ADMIN",
      question: "onde está o maior risco psicossocial e como evoluiu?",
      pov: "tecnico",
    });
    const lines = `${res.turn.capsuleLine ?? ""} ${res.turn.longitudinalLine ?? ""}`;
    // demands_quant (driver) aparece; burnout (desfecho) não como "em foco/maior melhora".
    expect(lines).toContain("Demandas quantitativas");
    expect(lines).not.toContain("Burnout (desfecho)");
  });

  test("pack sem histórico (government) não muda de comportamento — sem linha de medição", () => {
    const res = handleCopilotTurn({
      packId: "government",
      roleId: "DIRIGENTE",
      question: "qual o risco psicossocial?",
      pov: "tecnico",
    });
    expect(res.turn.capsuleLine ?? null).toBeNull();
    expect(res.turn.longitudinalLine ?? null).toBeNull();
  });

  test("participante (não vê coletivo) não recebe linha de medição mesmo com histórico", () => {
    const res = handleCopilotTurn({
      packId: "enterprise",
      roleId: "COLABORADOR",
      question: "qual o risco psicossocial e como evoluiu?",
      pov: "tecnico",
    });
    expect(res.turn.capsuleLine ?? null).toBeNull();
    expect(res.turn.longitudinalLine ?? null).toBeNull();
  });
});
