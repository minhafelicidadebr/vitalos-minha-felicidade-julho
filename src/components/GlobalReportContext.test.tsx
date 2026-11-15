import { test, expect } from "bun:test";
import { render, within } from "@testing-library/react";
import { GlobalReportContext } from "./GlobalReportContext";

test("consulta habilitada não transforma corpo demonstrativo em resultado institucional", () => {
  const { container, rerender, unmount } = render(<GlobalReportContext institutionalEnabled={false} />);
  const region = within(container).getByRole("region", { name: "Origem e operações do relatório global" });
  expect(region.textContent).toContain("Consulta institucional não habilitada");
  rerender(<GlobalReportContext institutionalEnabled />);
  expect(region.textContent).toContain("Consulta institucional habilitada");
  expect(region.textContent).toContain("Não são resultados ou certificação da sua organização");
  expect(region.textContent).toContain("não cria um snapshot no servidor");
  expect(region.textContent).toContain("não confirma essa gravação");
  unmount();
});
