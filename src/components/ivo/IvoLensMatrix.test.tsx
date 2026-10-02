/** @jsxImportSource react */
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { buildIvoMatrix } from "@/engine/ivo/ivo-matrix";
import { IVO_LENS_READING_CONTRACT, type NormalizedLensReading } from "@/engine/ivo/lens-contract";
import { ivoDimensionsForPack, ivoLensCatalog } from "@/domain/ivo/lens-catalog";
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
  privacyStatus: "published",
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

  test("lentes futuras aparecem como planejadas, sem dados", () => {
    render(<IvoLensMatrix matrix={matrix([])} />);
    expect(screen.getAllByText("Lente ainda não disponível")).toHaveLength(12);
    expect(screen.getAllByText("Preparada")).toHaveLength(4);
  });

  test("FIB-T publicada mostra estado e versão, nunca valor de construto", () => {
    const { container } = render(<IvoLensMatrix matrix={matrix([published])} />);
    expect(screen.getAllByText("Publicada")).toHaveLength(4);
    expect(screen.getAllByText("Versão 1.0.0").length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText("Sem mapeamento aprovado para esta dimensão")).toHaveLength(4);
    expect(container.textContent).not.toContain("3.1");
    expect(container.textContent).not.toContain("3,1");
  });

  test("link de detalhe só existe para a lente funcional", () => {
    render(<IvoLensMatrix matrix={matrix([published])} />);
    const links = screen.getAllByRole("link", { name: "Abrir análise da lente" });
    expect(links).toHaveLength(4);
    expect(links.every((link) => link.getAttribute("href") === "/fibt-piloto")).toBe(true);
  });

  test("leitura de outra organização vira aviso acessível", () => {
    render(<IvoLensMatrix matrix={matrix([{ ...published, organizationId: "org-alheia" }])} />);
    expect(screen.getByRole("status").textContent).toContain("outra organização");
  });

  test("sem organização selecionada mostra o catálogo com explicação", () => {
    render(<IvoLensMatrix matrix={matrix([], null)} />);
    expect(screen.getByText(/Nenhuma organização selecionada/)).toBeTruthy();
  });
});
