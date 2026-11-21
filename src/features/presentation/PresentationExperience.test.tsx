import { expect, test } from "bun:test";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { getPresentationDeck } from "@/lib/presentation/content.server";
import { PresentationVisual } from "./PresentationVisual";
import type { PresentationCard } from "./types";

const deck = getPresentationDeck();
const scene = (id: string) => deck.slides.find((s) => s.id === id)!;

test("role explorer distinguishes the demonstrated coordination journey from illustrative roles", () => {
  let explored: PresentationCard | undefined;
  let returnTarget: HTMLButtonElement | undefined;
  render(
    <PresentationVisual
      slide={scene("perfis")}
      onExplore={(card, button) => {
        explored = card;
        returnTarget = button;
      }}
    />,
  );
  expect(screen.getByText("Papel no serviço · visão ilustrativa")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Coordenação / RH" }));
  expect(screen.getByText("Jornada Q2 demonstrada localmente")).toBeDefined();
  expect(screen.getByText(/empresa vinculada/)).toBeDefined();
  const button = screen.getByRole("button", { name: "Explorar este perfil" });
  fireEvent.click(button);
  expect(explored?.detail?.title).toBe("Coordenação / RH na jornada Q2");
  expect(returnTarget === button).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Pessoas participantes" }));
  expect(screen.queryByText("Jornada Q2 demonstrada localmente")).toBeNull();
  expect(screen.getByText("Academia implementada · ciclo Q2 a validar")).toBeDefined();
  expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
});

test("dashboard follows the same fictitious action across Medir, Agir and Provar without persistence", () => {
  render(<PresentationVisual slide={scene("jornada")} />);
  const areas = screen.getByLabelText("Área da etapa selecionada");
  expect(areas.textContent).toContain("Medir · área atual");
  fireEvent.click(screen.getByRole("button", { name: "Combinar a prática" }));
  expect(areas.textContent).toContain("Agir · área atual");
  expect(screen.getByText(/20 minutos/)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Registrar e revisar" }));
  expect(screen.getByText("Ocorrência / origem")).toBeDefined();
  expect(screen.getByText(/registro fictício da coordenação/)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Organizar o percurso" }));
  expect(areas.textContent).toContain("Provar · área atual");
  expect(screen.getByText(/mudança no bem-estar depende de nova avaliação/)).toBeDefined();
  expect(screen.getByText(/nenhum dado é enviado ou salvo/)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Ler o contexto" }));
  expect(screen.getByText(/nenhum escore real/)).toBeDefined();
  expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
});

test("IVO distinguishes the prospective comparison from action completion", () => {
  render(<PresentationVisual slide={scene("ivo")} />);
  expect(screen.getByText("Nova leitura comparável")).toBeDefined();
  expect(screen.getByText("Índice composto em desenvolvimento metodológico")).toBeDefined();
  expect(screen.queryByRole("meter")).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test("action record retains origin, conditions and an unassessed outcome", () => {
  render(<PresentationVisual slide={scene("transformacao")} />);
  expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(4);
  expect(screen.getByText(/Origem: registro fictício/)).toBeDefined();
  expect(screen.getByText(/resultado de bem-estar ainda não avaliado/)).toBeDefined();
});

test("chapter imagery has accessible descriptions, intrinsic sizing and deferred loading", () => {
  for (const id of ["compreender", "movimento", "percurso"]) {
    const view = render(<PresentationVisual slide={scene(id)} />);
    const image = view.getByRole("img");
    expect(image.getAttribute("width")).toBe("1672");
    expect(image.getAttribute("height")).toBe("941");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("alt")!.length).toBeGreaterThan(30);
    view.unmount();
  }
});
