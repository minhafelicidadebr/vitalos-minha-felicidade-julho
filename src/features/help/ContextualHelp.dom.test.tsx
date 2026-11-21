// DOM: o acionador ⓘ tem nome acessível específico, abre o diálogo com a resposta curta,
// Escape fecha e devolve o foco, e abrir/fechar a ajuda não altera a ação ao lado.
import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContextualHelp } from "./ContextualHelp";
import { HELP_EMBAIXADORIAS } from "@/domain/help/contextual-help";

function Harness() {
  const [joined, setJoined] = useState(false);
  return (
    <div>
      <ContextualHelp entry={HELP_EMBAIXADORIAS} />
      <button type="button" aria-pressed={joined} onClick={() => setJoined((v) => !v)}>
        Participar
      </button>
    </div>
  );
}

describe("ContextualHelp", () => {
  test("abre por nome acessível, mostra camadas e fecha por Escape sem tocar a participação", async () => {
    render(<Harness />);
    const join = screen.getByRole("button", { name: "Participar" });
    fireEvent.click(join);
    expect(join.getAttribute("aria-pressed")).toBe("true");

    const trigger = screen.getByRole("button", { name: HELP_EMBAIXADORIAS.question });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain(HELP_EMBAIXADORIAS.summary);
    expect(dialog.textContent).toContain("Na sua função");
    const sourcesToggle = screen.getByRole("button", { name: /Fonte e alcance/ });
    expect(sourcesToggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(sourcesToggle);
    expect(sourcesToggle.getAttribute("aria-expanded")).toBe("true");
    expect(dialog.textContent).toContain("Como funciona no VitalOS");

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    // Foco volta ao acionador (Radix devolve o foco no fechamento).
    await waitFor(() => expect(document.activeElement === trigger).toBe(true));
    expect(screen.getByRole("button", { name: "Participar" }).getAttribute("aria-pressed")).toBe("true");
  });

  test("troca de perspectiva é só leitura: muda o exemplo, não o acesso", async () => {
    render(<ContextualHelp entry={HELP_EMBAIXADORIAS} />);
    fireEvent.click(screen.getByRole("button", { name: HELP_EMBAIXADORIAS.question }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /^Liderança/ }));
    expect(screen.getByRole("dialog").textContent).toContain(HELP_EMBAIXADORIAS.roles.lideranca!.example);
  });
});
