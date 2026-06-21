import { describe, expect, test } from "bun:test";
import { exportConversationText, type CopilotMessage } from "./copilot-conversation";
import type { CopilotTurn } from "./copilot-engine";

const turn: CopilotTurn = {
  pov: "tecnico",
  headline: "Leitura técnica do IVS",
  groundedLine: "IVS em 531 (Instituição Saudável)",
  body: "O índice lê a vitalidade em quatro lentes.",
  sources: [{ label: "Framework IVS", chunkId: "indice" }],
  nextStep: "Aprofunde no foco.",
  confidence: "alta",
  refusal: null,
  guardrailNotice: "Só falo de agregados (k≥5).",
};

describe("copilot conversation — exportação", () => {
  const messages: CopilotMessage[] = [
    { id: 0, author: "user", text: "o que é o índice?" },
    { id: 1, author: "copilot", turn },
  ];

  test("a transcrição inclui a persona, a pergunta e a resposta", () => {
    const text = exportConversationText("Cora", messages);
    expect(text).toContain("Cora");
    expect(text).toContain("Você: o que é o índice?");
    expect(text).toContain("Leitura técnica do IVS");
  });

  test("a transcrição cita as FONTES (honestidade)", () => {
    const text = exportConversationText("Cora", messages);
    expect(text).toContain("Fontes: Framework IVS");
  });

  test("conversa vazia gera só o cabeçalho, sem quebrar", () => {
    const text = exportConversationText("Cora", []);
    expect(text).toContain("Copiloto VitalOS");
    expect(text.length).toBeGreaterThan(0);
  });
});
