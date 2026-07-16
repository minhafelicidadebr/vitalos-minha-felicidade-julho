// Teste demonstrativo da fundação de testes DOM (happy-dom + Testing
// Library) — prova que render, consulta por role/nome, interação e cleanup
// entre casos funcionam via bun:test, sem nenhuma dependência de Jest.
// Candidato a remoção quando FlorenciaDrawer.test.tsx já cobrir integralmente
// esse papel demonstrativo.

import { describe, expect, test } from "bun:test";
import { createElement, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

function Counter() {
  const [count, setCount] = useState(0);
  return createElement(
    "button",
    { onClick: () => setCount((c) => c + 1) },
    `Contagem: ${count}`,
  );
}

describe("fundação DOM — smoke", () => {
  test("document e window estão disponíveis globalmente", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });

  test("renderiza e consulta por role e nome acessível", () => {
    render(createElement(Counter));
    expect(screen.getByRole("button", { name: "Contagem: 0" })).toBeDefined();
  });

  test("interação simples atualiza o DOM", () => {
    render(createElement(Counter));
    const button = screen.getByRole("button", { name: "Contagem: 0" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Contagem: 1" })).toBeDefined();
  });

  test("cleanup entre casos — o botão do teste anterior não sobrevive", () => {
    expect(screen.queryByRole("button", { name: "Contagem: 1" })).toBeNull();
    expect(document.body.innerHTML).toBe("");
  });
});
