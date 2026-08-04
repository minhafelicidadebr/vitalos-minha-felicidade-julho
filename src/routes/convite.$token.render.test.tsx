// Prova de RENDERIZAÇÃO da decisão HML na rota /convite/:token (FIBT-HML-1D,
// Fase 9.2) — substitui o antigo portão textual (commitGateFailures'
// BANNER_MISSING, removido) por um teste que renderiza o componente real e
// observa comportamento, não texto-fonte.

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { HmlGatedSurveyContent } from "./convite.$token";
import { HML_PERSONA_CONFIRMATION_TEXT } from "@/lib/fibt-hml/hml-frontend-guard";

const ATTESTED_HML_MODE = {
  active: true as const,
  blocked: false as const,
  batchId: "FIBT-ISG-HML-01",
  projectRefMasked: "abcd...wxyz",
};

const NORMAL_MODE = { active: false as const, blocked: false as const, reason: "HML_NOT_ENABLED" as const };

describe("HmlGatedSurveyContent — a rota realmente renderizada satisfaz o teste funcional (Fase 14, itens 24-26)", () => {
  test("24-25. modo normal (HML não declarado) renderiza os children direto, sem gate nenhum", () => {
    render(
      <HmlGatedSurveyContent hmlMode={NORMAL_MODE} token="tok-normal">
        <div data-testid="formulario-real">Formulário</div>
      </HmlGatedSurveyContent>,
    );
    expect(screen.getByTestId("formulario-real")).toBeDefined();
    expect(screen.queryByText(HML_PERSONA_CONFIRMATION_TEXT)).toBeNull();
  });

  test("26. modo HML atestado bloqueia os children atrás da confirmação de persona até confirmar", () => {
    render(
      <HmlGatedSurveyContent hmlMode={ATTESTED_HML_MODE} token="tok-hml-1">
        <div data-testid="formulario-real">Formulário</div>
      </HmlGatedSurveyContent>,
    );
    expect(screen.queryByTestId("formulario-real")).toBeNull();
    expect(screen.getByText(HML_PERSONA_CONFIRMATION_TEXT)).toBeDefined();

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /confirmar e iniciar/i }));
    expect(screen.getByTestId("formulario-real")).toBeDefined();
  });

  test("trocar de token (mesma árvore, key muda) volta a bloquear — prova em componente real da rota, não isolado", () => {
    const { rerender } = render(
      <HmlGatedSurveyContent hmlMode={ATTESTED_HML_MODE} token="tok-A">
        <div data-testid="formulario-real">Formulário</div>
      </HmlGatedSurveyContent>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /confirmar e iniciar/i }));
    expect(screen.getByTestId("formulario-real")).toBeDefined();

    rerender(
      <HmlGatedSurveyContent hmlMode={ATTESTED_HML_MODE} token="tok-B">
        <div data-testid="formulario-real">Formulário</div>
      </HmlGatedSurveyContent>,
    );
    expect(screen.queryByTestId("formulario-real")).toBeNull();
  });
});
