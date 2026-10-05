/** @jsxImportSource react */
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { buildIvoMatrix } from "@/engine/ivo/ivo-matrix";
import { buildIvoCoverage } from "@/engine/ivo/ivo-coverage";
import { getDimensionMappings } from "@/domain/ivo/dimension-mappings";
import { ivoDimensionsForPack, ivoLensCatalog } from "@/domain/ivo/lens-catalog";
import { IvoCoveragePanel } from "./IvoCoveragePanel";
afterEach(cleanup);

describe("IvoCoveragePanel", () => {
  test("com o registro real (vazio) mostra 4 dimensões sem valor e o índice sem número", () => {
    const matrix = buildIvoMatrix({
      organizationId: null,
      dimensions: ivoDimensionsForPack("enterprise"),
      lenses: ivoLensCatalog(),
      readings: [],
      mappings: getDimensionMappings(),
    });
    render(<IvoCoveragePanel coverage={buildIvoCoverage(matrix)} />);
    const section = screen.getByRole("region", { name: "Cobertura por dimensão" });
    expect(within(section).getAllByRole("listitem").filter((li) => li.textContent?.includes("Situação:")).length).toBe(4);
    expect(within(section).getAllByText("Sem medição").length).toBe(4);
    expect(within(section).getByText("Índice IVO: sem número")).toBeTruthy();
    expect(within(section).getByText(/não há método do índice aprovado/)).toBeTruthy();
    expect(within(section).getByText(/janela de validade das leituras ainda não foi definida/)).toBeTruthy();
    // Nenhum dígito de pontuação: só rótulos de estado.
    expect(/\b\d{1,4}\s*\/\s*(100|1000)\b/.test(section.textContent ?? "")).toBe(false);
  });
});
