import { expect, test } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { PackProvider } from "@/app/composition/PackProvider";
import { parseQ2DemoSearch, Q2DemoWalkthrough } from "./Q2DemoWalkthrough";

function open(url: string) {
  const root = createRootRoute();
  const makeStage = (path: string, step: "entrada" | "rh" | "lider" | "equipe") => {
    const route = createRoute({
      getParentRoute: () => root,
      path,
      validateSearch: parseQ2DemoSearch,
      component: () => <Q2DemoWalkthrough step={step} search={route.useSearch()} />,
    });
    return route;
  };
  const router = createRouter({
    routeTree: root.addChildren([
      makeStage("/painel", "entrada"),
      makeStage("/rh", "rh"),
      makeStage("/lider", "lider"),
      makeStage("/colaborador", "equipe"),
    ]),
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  const view = render(<PackProvider><RouterProvider router={router} /></PackProvider>);
  return within(view.container);
}

for (const [practice, evidence] of [
  ["Compartilhar decisões", "O resumo foi compartilhado"],
  ["Reservar tempo para escuta", "A rodada de escuta aconteceu"],
] as const) {
  for (const status of ["realizada", "pendente"] as const) {
    test(`Q2 entrega devolutiva e orientação Q5 para ${practice} / ${status}`, async () => {
      const ui = open("/painel");
      fireEvent.click(await ui.findByRole("link", { name: "Começar pelo RH" }));
      fireEvent.click(await ui.findByRole("link", { name: practice }));
      fireEvent.click(await ui.findByRole("link", { name: `Simular prática ${status}` }));
      const heading = await ui.findByRole("heading", { name: "Veja a devolutiva da equipe" });
      expect(document.activeElement).toBe(heading);
      expect(ui.getByText(practice)).toBeTruthy();
      expect(ui.getByText(status === "realizada" ? new RegExp(evidence) : /aguarda execução/)).toBeTruthy();
      expect(ui.getByText(/Ainda sem avaliação/)).toBeTruthy();
      expect(ui.getByText(status === "realizada" ? /manter ou ajustar/ : /remover a barreira/)).toBeTruthy();
    });
  }
}

test("Q2 aguarda leitura publicada antes de oferecer práticas", async () => {
  const ui = open("/rh?percurso=q2");
  fireEvent.change(await ui.findByRole("combobox", { name: "Cenário da leitura" }), { target: { value: "pendente" } });
  expect(ui.getByRole("status").textContent).toContain("aguarda a leitura agregada");
  expect(ui.queryByRole("link", { name: "Compartilhar decisões" })).toBeNull();
  expect(ui.queryByRole("link", { name: "Reservar tempo para escuta" })).toBeNull();
});

test("Q2 oferece retomada pelo RH ao receber um registro inválido", async () => {
  const ui = open("/colaborador?percurso=q2&pratica=escuta&registro=invalido");
  expect(await ui.findByRole("link", { name: "Começar pelo RH" })).toBeTruthy();
  expect(ui.queryByText("Execução")).toBeNull();
});
