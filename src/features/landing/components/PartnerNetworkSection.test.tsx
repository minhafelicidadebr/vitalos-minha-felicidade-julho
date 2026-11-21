import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PartnerNetworkSection } from "./PartnerNetworkSection";

afterEach(cleanup);

test("a prévia distingue formação de apoio técnico e exige as duas pontas para conferir", () => {
  render(<PartnerNetworkSection />);
  screen.getByText("Experimentar uma indicação fictícia").closest("details")!.open = true;
  const review = screen.getByRole("button", { name: "Conferir escopo" }) as HTMLButtonElement;
  expect(review.disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Simular pedido" }));
  expect(review.disabled).toBe(true);
  const track = screen.getByRole("combobox", { name: "Área de atuação fictícia" });
  const apply = screen.getByRole("button", { name: "Simular candidatura" });
  fireEvent.change(track, { target: { value: "development" } });
  fireEvent.click(apply);
  fireEvent.click(review);
  expect(screen.getByText(/A Alfa ainda precisa de apoio/)).toBeTruthy();
  fireEvent.change(track, { target: { value: "sst" } });
  fireEvent.click(apply);
  expect(screen.queryByText(/A Alfa ainda precisa de apoio/)).toBeNull();
  fireEvent.click(review);
  expect(screen.getByText(/Escopo compatível/)).toBeTruthy();
});
