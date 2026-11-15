import { expect, test } from "bun:test";
import { render, within } from "@testing-library/react";
import { DemoModeNotice } from "./DemoModeNotice";

test("contextualiza a sessão de demonstração e orienta conferir limites por página", () => {
  const { container, unmount } = render(<DemoModeNotice />);
  const notice = within(container).getByRole("note", { name: "Modo demonstração" });
  expect(notice.textContent).toContain("perfis e dados que podem ser exemplos");
  expect(notice.textContent).toContain("origem e os limites indicados em cada página");
  expect(within(notice).getByText("Modo demonstração.", { exact: false })).toBeTruthy();
  unmount();
});
