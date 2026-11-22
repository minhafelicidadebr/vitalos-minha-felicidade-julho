import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// O lançador do concierge não pode cobrir a barra inferior fixa do AppShell (abaixo de xl),
// e o painel aberto ocupa a tela inteira onde essa barra existe (WCAG 2.4.11).
const widget = readFileSync("src/components/concierge/ConciergeWidget.tsx", "utf8");
const shell = readFileSync("src/app/shell/AppShell.tsx", "utf8");

describe("concierge × barra inferior", () => {
  test("a barra inferior continua só abaixo de xl", () => {
    expect(shell).toMatch(/fixed inset-x-3 bottom-3 z-40[^"]*xl:hidden/);
  });
  test("abaixo de xl o lançador fica acima da barra; em xl volta ao canto", () => {
    expect(widget).toContain("bottom-[calc(5.75rem+env(safe-area-inset-bottom))]");
    expect(widget).toContain("xl:bottom-[max(1.25rem,env(safe-area-inset-bottom))]");
  });
  test("abaixo de xl o painel aberto é tela cheia (sem flutuar sobre a barra)", () => {
    expect(widget).toContain('open ? "hidden xl:flex" : "flex"');
    expect(widget).toContain("xl:inset-auto xl:bottom-28 xl:right-5");
    expect(widget).not.toMatch(/\bsm:inset-auto\b/);
  });
});
