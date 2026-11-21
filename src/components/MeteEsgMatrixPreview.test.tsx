import { expect, test } from "bun:test";
import { render, within } from "@testing-library/react";
import { MeteEsgMatrixPreview } from "./MeteEsgMatrixPreview";
import { SYNTHETIC_MATRIX_CASES, countVisibleExecutionEvents, describeObservedChange, projectMatrixCase, type DescriptiveComparison } from "@/lib/reports/mete-esg-matrix";

const base: DescriptiveComparison = { before: 10, after: 12, beforeVersion: "v1", afterVersion: "v1", unitBefore: "horas", unitAfter: "horas", desiredDirection: "decrease" };

test("mais perfis, vínculos e linhas não duplicam o evento de execução", () => {
  const row = SYNTHETIC_MATRIX_CASES[0]!;
  const duplicate = { ...row, id: "outra-linha", events: row.events.map(e => ({...e, roles: [...e.roles, "CHRO"]})) };
  expect(countVisibleExecutionEvents([row, duplicate])).toBe(1);
  expect(countVisibleExecutionEvents(SYNTHETIC_MATRIX_CASES)).toBe(2);
  expect(countVisibleExecutionEvents([{...row, state: "protected"}])).toBe(0);
});

test("projeção protegida retém todos os detalhes mesmo com campos extras", () => {
  const row = { ...SYNTHETIC_MATRIX_CASES[0]!, state: "protected" as const, id: "SEGREDO", title: "SEGREDO", driver: "SEGREDO", observation: "SEGREDO", comparison: base };
  const value = JSON.stringify(projectMatrixCase(row));
  expect(value).not.toContain("SEGREDO");
  expect(value).not.toContain("LIDER_EQUIPE");
  expect(value).not.toContain("horas");
  expect(value).not.toContain("SYN-EVENTO");
  expect(projectMatrixCase(row).change.text).toBe("Mudança não exibida por proteção.");
});

test("mudança desfavorável preserva unidade e explicita ausência de efeito e precisão", () => {
  const change = describeObservedChange(base);
  expect(change.status).toBe("descriptive");
  expect(change.text).toContain("+2 horas");
  expect(change.text).toContain("contrário ao desejado");
  expect(change.attribution).toContain("intervalo de confiança não estimáveis");
  expect(change.text).not.toContain("%");
  expect(describeObservedChange({...base, before: 0, after: 0}).text).toContain("sem variação");
  expect(describeObservedChange({...base, before: 0, after: 0.001}).text).toContain("+0,001");
});

test("comparações incompatíveis e valores não finitos não produzem estimativa", () => {
  for (const patch of [{afterVersion: "v2"}, {unitAfter: "dias"}, {before: NaN}, {after: Infinity}, {beforeVersion: ""}, {before: -Number.MAX_VALUE, after: Number.MAX_VALUE}]) {
    expect(describeObservedChange({...base, ...patch}).status).toBe("incompatible");
  }
  expect(describeObservedChange().status).toBe("not_estimable");
});

test("cinco casos exibem limites locais sem nota ESG ou comando de emissão", () => {
  const {container,unmount} = render(<MeteEsgMatrixPreview />);
  const region = within(container).getByRole("region", { name: "Matriz sintética METE e contribuição ESG" });
  expect(within(region).getAllByRole("row").length).toBe(6);
  expect(region.textContent).toContain("E — sem sustentação");
  expect(region.textContent).toContain("Protegido");
  expect(region.textContent).toContain("vínculo proposto");
  expect(region.textContent).toContain("sem atribuição causal");
  expect(region.textContent).toContain("Revisão bloqueada");
  expect(region.textContent).toContain("Unidade fora do contrato canônico");
  expect(region.textContent).not.toContain("Pronto para emissão");
  expect(within(region).queryByRole("button")).toBeNull();
  unmount();
});
