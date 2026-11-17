import { expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { PresentationVisual } from "./PresentationVisual";
import type { PresentationCard, PresentationSlide } from "./types";

const scene = {
  id: "trimestre",
  kind: "onboarding",
  cards: [
    { label: "Escutar", title: "Uma prioridade", body: "Leitura contextualizada", icon: "chart" },
    {
      label: "Desenvolver",
      title: "Uma aplicação",
      body: "Repertório para preparar a prática",
      icon: "book",
    },
    {
      label: "Acompanhar",
      title: "Uma revisão",
      body: "Retomar condições e decisões",
      icon: "compass",
    },
  ],
} as PresentationSlide;

test("quarter selection replaces its explanation and retains one selected step", () => {
  render(<PresentationVisual slide={scene} />);
  expect(screen.getByRole("heading", { name: "Uma prioridade" })).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "03 Acompanhar" }));
  expect(screen.queryByRole("heading", { name: "Uma prioridade" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Uma revisão" })).toBeDefined();
  expect(
    screen.getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true"),
  ).toHaveLength(1);
});

test("learning sample requires a choice, gives contextual feedback and can restart", () => {
  render(<PresentationVisual slide={{ ...scene, id: "aprendizagem", kind: "learning" }} />);
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Quem da equipe está com dificuldade?" }));
  expect(screen.getByRole("status").textContent).toContain("Retome o contexto coletivo");
  fireEvent.click(screen.getByRole("button", { name: "Explorar novamente" }));
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Que condições ajudariam a equipe a pedir apoio?" }),
  );
  expect(screen.getByRole("status").textContent).toContain("Uma pergunta para a gestão");
});

test("lens exploration identifies both the requested content and its focus return target", () => {
  let card: PresentationCard | undefined;
  let trigger: HTMLButtonElement | undefined;
  render(
    <PresentationVisual
      slide={{ ...scene, id: "lentes", kind: "lenses" }}
      onExplore={(value, element) => {
        card = value;
        trigger = element;
      }}
    />,
  );
  const button = screen.getByRole("button", { name: "Explorar Desenvolver" });
  fireEvent.click(button);
  expect(card?.title).toBe("Uma aplicação");
  expect(trigger === button).toBe(true);
});
