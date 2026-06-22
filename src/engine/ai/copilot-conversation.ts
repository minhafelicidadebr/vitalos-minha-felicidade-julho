/**
 * Conversa do copiloto — tipos compartilhados e exportação de transcrição (pura).
 *
 * A transcrição inclui as FONTES de cada resposta — coerente com a honestidade do
 * copiloto (toda afirmação é citável). Função pura: sem I/O, testável.
 */

import type { CopilotTurn } from "./copilot-engine";

export interface CopilotMessage {
  id: number;
  author: "user" | "copilot";
  text?: string;
  turn?: CopilotTurn;
}

/** Monta uma transcrição em texto plano, com cabeçalho, turnos e fontes citadas. */
export function exportConversationText(personaName: string, messages: CopilotMessage[]): string {
  const lines: string[] = [
    `Conversa com ${personaName} — Copiloto VitalOS™`,
    "Respostas ancoradas nos dados e no método do app; cada afirmação cita a fonte.",
    "",
  ];

  for (const m of messages) {
    if (m.author === "user") {
      lines.push(`Você: ${m.text ?? ""}`, "");
      continue;
    }
    const t = m.turn;
    if (!t) continue;
    lines.push(`${personaName} [${t.pov}]: ${t.headline}`);
    if (t.groundedLine) lines.push(`  📊 ${t.groundedLine}`);
    lines.push(`  ${t.body}`);
    if (t.nextStep) lines.push(`  → ${t.nextStep}`);
    if (t.sources.length) lines.push(`  Fontes: ${t.sources.map((s) => s.label).join("; ")}`);
    lines.push(`  (${t.guardrailNotice})`, "");
  }

  return lines.join("\n").trim();
}
