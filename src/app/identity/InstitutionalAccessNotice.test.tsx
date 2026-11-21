import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InstitutionalAccessNotice } from "./InstitutionalAccessNotice";
afterEach(cleanup);
test("sem vínculo orienta usar convite e oferece nova consulta", () => {
  const retry = mock(() => {});
  render(<InstitutionalAccessNotice status="unlinked" onRetry={retry} />);
  expect(screen.getByRole("status").textContent).toContain("convite recebido");
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Verificar novamente" }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("link", { name: "Voltar ao acesso" }).getAttribute("href")).toBe("/entrar");
});
test("falha de consulta é anunciada sem afirmar falta de vínculo", () => {
  render(<InstitutionalAccessNotice status="unavailable" onRetry={() => {}} />);
  expect(screen.getByRole("alert").textContent).toContain("consulta da sua organização falhou");
  expect(screen.queryByText(/não encontramos um vínculo/)).toBeNull();
});
