import { expect, test } from "bun:test";
import { usesPresentationShell } from "./path";

test("only the presentation and proposal pages bypass company/demo providers; their APIs have a separate server boundary", () => {
  expect(usesPresentationShell("/apresentacao/empresas")).toBe(true);
  expect(usesPresentationShell("/apresentacao/empresas/")).toBe(true);
  expect(usesPresentationShell("/proposta")).toBe(true);
  expect(usesPresentationShell("/proposta/")).toBe(true);
  for (const path of [
    "/",
    "/entrar",
    "/rh",
    "/plataforma",
    "/ivo-integral/acoes",
    "/api/apresentacao",
    "/apresentacao/empresas/admin",
    "/apresentacao/outra",
    "/api/proposta",
    "/proposta/outra",
  ])
    expect(usesPresentationShell(path)).toBe(false);
});
