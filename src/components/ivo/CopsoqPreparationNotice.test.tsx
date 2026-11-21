import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { getCopsoqManifest } from "@/domain/survey/copsoq-instrument-manifest";
import { CopsoqPreparationNotice } from "./CopsoqPreparationNotice";
afterEach(cleanup);
test("Q1 expõe a versão realmente servida, pré-requisito e continuidade independente de Q2", () => {
  render(<CopsoqPreparationNotice />);
  const panel = screen.getByRole("region", { name: "Q1 · COPSOQ — preparação da aplicação" });
  expect(within(panel).getByText(getCopsoqManifest().version)).toBeTruthy();
  expect(within(panel).getByText(getCopsoqManifest().served_name)).toBeTruthy();
  expect(within(panel).getByText(/aprovada por João Paulo Brandão Barboza/)).toBeTruthy();
  expect(within(panel).getByRole("note").textContent).toContain("independentemente de Q1");
  expect(within(panel).getByRole("note").textContent).toContain("permanecem indisponíveis");
  expect(within(panel).queryByRole("button", { name: /abrir coleta|publicar|criar plano/i })).toBeNull();
  expect(within(panel).getByRole("link").getAttribute("href")).toBe("/ivo-integral/governanca");
});

test("Q1 permite praticar a leitura de um caso sem abrir coleta nem plano", () => {
  render(<CopsoqPreparationNotice />);
  const toggle = screen.getByText("Praticar antes da coleta: prioridades concorrentes");
  (toggle.closest("details") as HTMLDetailsElement).open = true;
  fireEvent.click(screen.getByRole("button", { name: "Ver o novo caso" }));
  fireEvent.click(screen.getByRole("radio", { name: /Acordar uma regra de prioridade/ }));
  expect(screen.getByText(/Combine quem pode decidir/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /incluir|gravar|abrir coleta/i })).toBeNull();
});
