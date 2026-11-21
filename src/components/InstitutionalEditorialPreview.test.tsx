import { expect, test } from "bun:test";
import { render, within } from "@testing-library/react";
import { InstitutionalEditorialPreview } from "./InstitutionalEditorialPreview";
import { projectEditorialEvidence, type EditorialEvidence, REPORT_STATES } from "@/lib/reports/institutional-editorial";

test("estados retidos não projetam contagem, fonte ou texto extra mesmo em objeto malformado", () => {
  for (const state of ["protected", "absent", "pending", "unavailable", "not_applicable"] as const) {
    const incoming = { state, label: "Estado de teste", text: "SEGREDO", source: "SEGREDO", count: 3, value: 9 } as unknown as EditorialEvidence;
    const projected = projectEditorialEvidence(incoming);
    expect(JSON.stringify(projected)).not.toContain("SEGREDO");
    expect(projected).not.toHaveProperty("count");
    expect(projected).not.toHaveProperty("value");
    expect(projected.state).toBe(REPORT_STATES[state]);
  }
});

test("preview mantém marcação sintética, METE e limitação junto de evidência, sem emissão", () => {
  const { container, unmount } = render(<InstitutionalEditorialPreview />);
  const article = within(container).getByRole("article", { name: "Protótipo editorial institucional METE" });
  for (const axis of ["Mensurar", "Educar", "Transformar", "Evoluir"]) {
    const section = within(article).getByRole("region", { name: `${axis} — análise sintética` });
    expect(section.textContent).toContain("Exemplo sintético");
    expect(section.textContent).toContain("Fonte e limites");
    expect(section.textContent).toContain("Próxima revisão");
  }
  expect(within(article).getByRole("img", { name: "Instituto Felicidade para Todos" })).toBeTruthy();
  expect(within(article).getByRole("table", { name: "Exemplo de acompanhamento, sem compromissos reais registrados." })).toBeTruthy();
  expect(within(article).queryByRole("button")).toBeNull();
  expect(article.textContent).toContain("Compromissos propostos · não assumidos");
  expect(article.textContent).toContain("Não há impacto ESG demonstrado");
  unmount();
});
