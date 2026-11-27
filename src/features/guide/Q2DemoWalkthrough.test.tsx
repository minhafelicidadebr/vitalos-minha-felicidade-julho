import { expect, test } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { PackProvider } from "@/app/composition/PackProvider";
import { parseQ2DemoSearch, Q2DemoJourney } from "./Q2DemoWalkthrough";

function open(url: string, anonymous = true) {
  const root = createRootRoute();
  const makeStage = (path: string, step: "entrada" | "rh" | "lider" | "equipe" | "q5") => {
    const route = createRoute({
      getParentRoute: () => root,
      path,
      validateSearch: parseQ2DemoSearch,
      component: () => <><span>Rota carregada</span><Q2DemoJourney step={step} search={route.useSearch()} anonymous={anonymous} /></>,
    });
    return route;
  };
  const router = createRouter({
    routeTree: root.addChildren([
      makeStage("/painel", "entrada"),
      makeStage("/rh", "rh"),
      makeStage("/lider", "lider"),
      makeStage("/colaborador", "equipe"),
      makeStage("/relatorio-global", "q5"),
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
      // Previsto, registrado, a observar e avaliado são estados distintos, nomeados no rótulo.
      expect(ui.getByText(status === "realizada" ? "Execução registrada" : "Execução prevista")).toBeTruthy();
      expect(ui.getByText("Aprendizagem a observar")).toBeTruthy();
      expect(ui.getByText(status === "realizada" ? /manter ou ajustar/ : /remover a barreira/)).toBeTruthy();
      fireEvent.click(ui.getByRole("link", { name: "Abrir exemplo no relatório global" }));
      expect(await ui.findByRole("heading", { name: "Decisão para o próximo ciclo" })).toBeTruthy();
      expect(ui.getByText(practice)).toBeTruthy();
      expect(ui.getByText(status === "realizada" ? new RegExp(evidence) : /aguarda execução/)).toBeTruthy();
      expect(ui.getByText(/quando será feita uma nova leitura/)).toBeTruthy();
      // Q5 termina em uma proposta: quatro perguntas respondidas, sugestão marcada em texto, efeito não avaliado.
      for (const q of [/Qual prioridade foi escolhida e por quê/, /O que foi planejado e o que tem execução registrada/, /O que aprendemos e o que ainda precisa ser observado/, /Qual é a proposta para o próximo ciclo, quem a revisa e quando/]) expect(ui.getByText(q)).toBeTruthy();
      expect(ui.getByText(/Efeito ainda não avaliado/)).toBeTruthy();
      const suggested = ui.getByText(/Sugestão para este caso/).closest("li")!;
      expect(suggested.textContent).toContain(status === "realizada" ? "Manter" : "Ajustar");
      expect(ui.getByText(/nenhuma decisão foi registrada/)).toBeTruthy();
      const q1 = ui.getByRole("link", { name: "Ver como o Q1 prepara a próxima escuta" });
      expect(q1.getAttribute("href")).toContain("etapa=Q1");
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

test("Q2 não exibe a jornada fictícia em sessão institucional", async () => {
  const ui = open("/rh?percurso=q2", false);
  await ui.findByText("Rota carregada");
  expect(ui.queryByRole("heading", { name: "Escolha uma prática para a equipe" })).toBeNull();
});

test("Q5: a sugestão é manter com execução registrada e ajustar sem registro; encerrar nunca é sugerido", async () => {
  const { suggestedDecision } = await import("./Q5Synthesis");
  expect(suggestedDecision(true)).toBe("manter");
  expect(suggestedDecision(false)).toBe("ajustar");
});
