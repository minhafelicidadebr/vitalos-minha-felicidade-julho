import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InstitutionalAccessLink } from "./InstitutionalAccessLink";
import { LandingCtaSection } from "./LandingCtaSection";

afterEach(cleanup);

test("entrada compacta e completa são links nativos para o login institucional sem redirect", () => {
  render(
    <>
      <InstitutionalAccessLink compact />
      <InstitutionalAccessLink />
    </>,
  );
  const links = screen.getAllByRole("link", { name: "Entrar na plataforma institucional" });
  expect(links).toHaveLength(2);
  for (const link of links) {
    expect(link.getAttribute("href")).toBe("/entrar");
    expect(link.getAttribute("target")).toBeNull();
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  }
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
});

test("bloco final distingue a conta institucional da demonstração e das ações comerciais", () => {
  const demo = mock(() => {});
  const action = mock(() => {});
  render(<LandingCtaSection onAction={action} onEnterApp={demo} />);
  expect(screen.getByRole("heading", { name: "Já tem acesso à plataforma?" })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Entrar na plataforma institucional" }).getAttribute("href"),
  ).toBe("/entrar");
  expect(demo).not.toHaveBeenCalled();
  expect(action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Explorar demonstração" }));
  expect(demo).toHaveBeenCalledTimes(1);
  expect(action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Agendar demonstração" }));
  expect(action).toHaveBeenCalledTimes(1);
  expect(demo).toHaveBeenCalledTimes(1);
});

test("acesso institucional permanece disponível quando não há callback de demonstração", () => {
  render(<LandingCtaSection onAction={() => {}} />);
  expect(
    screen.getByRole("link", { name: "Entrar na plataforma institucional" }).getAttribute("href"),
  ).toBe("/entrar");
  expect(screen.queryByRole("button", { name: "Explorar demonstração" })).toBeNull();
});
