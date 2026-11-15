import { test, expect } from "bun:test";
import { render, within } from "@testing-library/react";
import { DemonstrationContext } from "./DemonstrationContext";

test("avisos distinguem prioridade, eficácia e projeção sem apresentar dados reais", () => {
  const cases = [
    ["priorities", "Não são um diagnóstico da sua empresa"],
    ["experiments", "não comprova eficácia na sua organização"],
    ["trajectory", "Não representam impacto observado"],
  ] as const;
  for (const [kind, limit] of cases) {
    const { container, unmount } = render(<DemonstrationContext kind={kind} />);
    const region = within(container).getByRole("region", { name: "Origem e limites da demonstração" });
    expect(within(region).getByRole("heading", { name: "Demonstração · como interpretar" })).toBeTruthy();
    expect(region.textContent).toContain(limit);
    expect(region.textContent).toContain("Origem dos dados");
    unmount();
  }
});
