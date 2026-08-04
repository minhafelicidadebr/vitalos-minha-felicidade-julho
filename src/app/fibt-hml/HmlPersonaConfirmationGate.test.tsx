import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { HmlPersonaConfirmationGate } from "./HmlPersonaConfirmationGate";
import { HML_PERSONA_CONFIRMATION_TEXT } from "@/lib/fibt-hml/hml-frontend-guard";

describe("HmlPersonaConfirmationGate", () => {
  test("3. sem confirmação, children não são renderizados — formulário não inicia", () => {
    render(
      <HmlPersonaConfirmationGate>
        <div data-testid="formulario-real">Formulário</div>
      </HmlPersonaConfirmationGate>,
    );
    expect(screen.queryByTestId("formulario-real")).toBeNull();
    expect(screen.getByText(HML_PERSONA_CONFIRMATION_TEXT)).toBeDefined();
  });

  test("botão de confirmar começa desabilitado", () => {
    render(
      <HmlPersonaConfirmationGate>
        <div>Formulário</div>
      </HmlPersonaConfirmationGate>,
    );
    expect(screen.getByRole("button", { name: /confirmar e iniciar/i }).hasAttribute("disabled")).toBe(true);
  });

  test("marcar a caixa sem clicar em confirmar ainda não libera o formulário", () => {
    render(
      <HmlPersonaConfirmationGate>
        <div data-testid="formulario-real">Formulário</div>
      </HmlPersonaConfirmationGate>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.queryByTestId("formulario-real")).toBeNull();
  });

  test("4. marcar a caixa e clicar em confirmar libera o formulário (children renderizam)", () => {
    render(
      <HmlPersonaConfirmationGate>
        <div data-testid="formulario-real">Formulário</div>
      </HmlPersonaConfirmationGate>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /confirmar e iniciar/i }));
    expect(screen.getByTestId("formulario-real")).toBeDefined();
    expect(screen.queryByText(HML_PERSONA_CONFIRMATION_TEXT)).toBeNull();
  });

  test("clicar em confirmar sem marcar a caixa não faz nada (botão desabilitado)", () => {
    render(
      <HmlPersonaConfirmationGate>
        <div data-testid="formulario-real">Formulário</div>
      </HmlPersonaConfirmationGate>,
    );
    fireEvent.click(screen.getByRole("button", { name: /confirmar e iniciar/i }));
    expect(screen.queryByTestId("formulario-real")).toBeNull();
  });
});
