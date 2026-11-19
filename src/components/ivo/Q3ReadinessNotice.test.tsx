import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Q3_PRECONDITIONS } from "@/domain/ivo/q3-readiness";
import { Q3ReadinessNotice } from "./Q3ReadinessNotice";

describe("Q3ReadinessNotice", () => {
  test("informa que nada é medido e lista as decisões pendentes do contrato", () => {
    render(<Q3ReadinessNotice />);
    expect(screen.getByRole("heading", { name: /Q3 · PERMA\+V — em preparação metodológica/ })).toBeTruthy();
    expect(screen.getByText(/Nada é medido, pontuado ou publicado nesta lente/)).toBeTruthy();
    expect(screen.getByText(`0 de ${Q3_PRECONDITIONS.length} decisões registradas`)).toBeTruthy();
    expect(screen.getAllByText(/^Pendente:$/).length).toBe(Q3_PRECONDITIONS.length);
  });

  test("não oferece ação, link, formulário nem valor que pareça mensuração", () => {
    const { container } = render(<Q3ReadinessNotice />);
    expect(container.querySelectorAll("a, button, form, input").length).toBe(0);
    // Nenhum valor decimal, pontuação obtida ou rótulo de resultado (a menção a "escores" é só a
    // frase de independência das lentes).
    expect(container.textContent).not.toMatch(/\d+[,.]\d+|pontua[çc][ãa]o obtida|resultado:/i);
  });
});
