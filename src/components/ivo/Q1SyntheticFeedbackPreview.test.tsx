import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Q1SyntheticFeedbackPreview } from "./Q1SyntheticFeedbackPreview";

afterEach(cleanup);

test("liga a lacuna à medida e permite comparar execução e ajuste no ensaio", () => {
  render(<Q1SyntheticFeedbackPreview />);
  screen.getByText("Ensaiar a devolutiva Q1").closest("details")!.open = true;
  fireEvent.click(screen.getByRole("radio", { name: /concluir que a medida/i }));
  expect(screen.queryByRole("group", { name: /acompanhar a medida/i })).toBeNull();

  const investigate = () =>
    fireEvent.click(screen.getByRole("radio", { name: /conferir a escala e ouvir/i }));
  investigate();
  const measure = screen.getByRole("region", { name: "Exemplo de medida" });
  expect(measure.textContent).toContain("primeira hora do turno");
  expect(measure.textContent).toContain("Coordenação do turno");

  const followup = within(screen.getByRole("group", { name: /acompanhar a medida/i }));
  const status = followup.getByRole("status");
  expect(status.textContent).toContain("Medida planejada");
  fireEvent.click(followup.getByRole("radio", { name: "Execução observada" }));
  expect(status.textContent).toContain("nova escala");
  expect(status.textContent).toContain("Eficácia ainda não avaliada");
  fireEvent.click(followup.getByRole("radio", { name: "Requer ajuste" }));
  expect(status.textContent).toContain("12/02/2027");

  const scenario = screen.getByRole("combobox", { name: "Cenário de divulgação" });
  for (const [value, label] of [
    ["pending", "Aguardando publicação"],
    ["protected", "Leitura protegida"],
  ]) {
    fireEvent.change(scenario, { target: { value } });
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText(/primeira hora do turno|merece investigação/)).toBeNull();
    expect(screen.queryByRole("group", { name: /acompanhar a medida/i })).toBeNull();
  }
  fireEvent.change(scenario, { target: { value: "available" } });
  investigate();
  expect(screen.getByText(/medida planejada · acompanhamento a registrar/i)).toBeTruthy();
});
