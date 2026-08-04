import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { HmlHomologationBanner } from "./HmlHomologationBanner";
import { HML_BANNER_TEXT } from "@/lib/fibt-hml/hml-frontend-guard";

describe("HmlHomologationBanner", () => {
  test("mostra as cinco linhas obrigatórias do aviso", () => {
    render(<HmlHomologationBanner batchId="FIBT-ISG-HML-01" />);
    expect(screen.getByText(HML_BANNER_TEXT.line1)).toBeDefined();
    expect(screen.getByText(HML_BANNER_TEXT.line2)).toBeDefined();
    expect(screen.getByText(HML_BANNER_TEXT.line3)).toBeDefined();
    expect(screen.getByText(HML_BANNER_TEXT.line4)).toBeDefined();
    expect(screen.getByText(HML_BANNER_TEXT.line5)).toBeDefined();
  });

  test("anuncia o lote, sem expor project ref (o componente não recebe ref algum)", () => {
    render(<HmlHomologationBanner batchId="FIBT-ISG-HML-01" />);
    expect(screen.getByText(/FIBT-ISG-HML-01/)).toBeDefined();
  });

  test("role=alert e aria-live=polite — anunciado por leitor de tela sem precisar de foco", () => {
    render(<HmlHomologationBanner batchId="FIBT-ISG-HML-01" />);
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-live")).toBe("polite");
  });

  test("não tem nenhum botão de fechar — não pode ser dispensado", () => {
    render(<HmlHomologationBanner batchId="FIBT-ISG-HML-01" />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  test("é fixo no topo (sticky) — não depende de scroll para continuar visível", () => {
    render(<HmlHomologationBanner batchId="FIBT-ISG-HML-01" />);
    expect(screen.getByRole("alert").className).toContain("sticky");
  });

  test("renderização é determinística para o mesmo batchId", () => {
    const a = render(<HmlHomologationBanner batchId="FIBT-ISG-HML-01" />);
    const textA = a.container.textContent;
    a.unmount();
    const b = render(<HmlHomologationBanner batchId="FIBT-ISG-HML-01" />);
    expect(b.container.textContent).toBe(textA);
  });
});
