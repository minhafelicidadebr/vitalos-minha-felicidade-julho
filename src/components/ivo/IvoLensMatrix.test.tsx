/** @jsxImportSource react */
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { buildIvoMatrix } from "@/engine/ivo/ivo-matrix";
import { IVO_LENS_READING_CONTRACT, type NormalizedLensReading } from "@/engine/ivo/lens-contract";
import { FIBT_LENS_ROUTE, ivoDimensionsForPack, ivoLensCatalog } from "@/domain/ivo/lens-catalog";
import { IvoLensMatrix } from "./IvoLensMatrix";

afterEach(cleanup);

const published: NormalizedLensReading = {
  contractVersion: IVO_LENS_READING_CONTRACT,
  organizationId: "org-demo",
  cycleKey: "2026-T2",
  quarter: "Q2",
  lens: "fibt",
  instrumentVersion: "1.0.0",
  calculationVersion: "fibt-manifest/1.0.0",
  cohortScope: "cohort",
  privacyStatus: "protected",
  kMin: 5,
  publicationStatus: "published",
  cohorts: [
    {
      cohortKey: "A",
      cohortLabel: "Setor A",
      publication: "published",
      countLabel: "7",
      constructs: [{ id: "bem_estar", label: "Bem-Estar", value: 3.1, scaleMin: 0, scaleMax: 4 }],
      protectionReason: null,
    },
    {
      cohortKey: "B",
      cohortLabel: "Setor B",
      publication: "protected",
      countLabel: "<5",
      constructs: null,
      protectionReason: "Abaixo do limiar.",
    },
  ],
  evidenceReferences: ["wave:demo"],
  generatedAt: "2026-06-30T12:00:00.000Z",
};

function matrix(readings: NormalizedLensReading[], organizationId: string | null = "org-demo") {
  return buildIvoMatrix({
    organizationId,
    dimensions: ivoDimensionsForPack("enterprise"),
    lenses: ivoLensCatalog(),
    readings,
    mappings: [],
  });
}

describe("IvoLensMatrix", () => {
  test("tabela semântica 4 × 4 com cabeçalhos de lente e de dimensão", () => {
    render(<IvoLensMatrix matrix={matrix([])} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(4);
    expect(within(table).getAllByRole("rowheader")).toHaveLength(4);
    expect(screen.getByText("FIB-T")).toBeTruthy();
  });

  test("lentes futuras aparecem como planejadas, sem resultado", () => {
    render(<IvoLensMatrix matrix={matrix([])} />);
    expect(screen.getAllByText("Lente planejada")).toHaveLength(12);
    expect(screen.getAllByText("Não se aplica")).toHaveLength(12);
    expect(screen.getAllByText("Sem leitura carregada")).toHaveLength(4);
  });

  test("distingue resultado disponível, protegido e mapeamento pendente — nunca valor", () => {
    const { container } = render(<IvoLensMatrix matrix={matrix([published])} />);
    expect(screen.getAllByText("Disponível em 1 de 2 setores; 1 protegido(s)")).toHaveLength(4);
    expect(screen.getAllByText("Mapeamento dimensional pendente")).toHaveLength(4);
    expect(screen.getAllByText("Versão 1.0.0").length).toBeGreaterThanOrEqual(4);
    expect(container.textContent).not.toContain("3.1");
    expect(container.textContent).not.toContain("3,1");
  });

  test("resultado inteiramente protegido aparece como protegido, sem zero", () => {
    const allProtected: NormalizedLensReading = {
      ...published,
      publicationStatus: "protected",
      cohorts: [published.cohorts[1]!],
    };
    const { container } = render(<IvoLensMatrix matrix={matrix([allProtected])} />);
    expect(screen.getAllByText("Protegido em 1 setor — nenhum valor exibido")).toHaveLength(4);
    expect(container.textContent).not.toMatch(/\b0 de\b|em 0\b|: 0\b|0,0/);
    expect(container.textContent).not.toContain("Disponível em");
  });

  test("link de detalhe só existe para a lente funcional e leva à leitura Q2", () => {
    render(<IvoLensMatrix matrix={matrix([published])} />);
    const links = screen.getAllByRole("link", { name: "Abrir análise da lente" });
    expect(links).toHaveLength(4);
    expect(links.every((link) => link.getAttribute("href") === FIBT_LENS_ROUTE)).toBe(true);
  });

  test("leitura de outra organização vira aviso acessível", () => {
    render(<IvoLensMatrix matrix={matrix([{ ...published, organizationId: "org-alheia" }])} />);
    expect(screen.getByRole("status").textContent).toContain("outra organização");
  });

  test("sem organização selecionada mostra o catálogo com explicação", () => {
    render(<IvoLensMatrix matrix={matrix([], null)} />);
    expect(screen.getByText(/Nenhuma organização selecionada/)).toBeTruthy();
  });

  test("região rolável da matriz é alcançável por teclado", () => {
    render(<IvoLensMatrix matrix={matrix([])} />);
    const region = screen.getByLabelText(/Matriz IVO, role horizontalmente/);
    expect(region.getAttribute("tabindex")).toBe("0");
  });
});
