import { expect, test } from "bun:test";
import { usesPresentationShell } from "./path";

test("only the presentation page bypasses company/demo providers; its API has a separate server boundary", () => {
  expect(usesPresentationShell("/apresentacao/empresas")).toBe(true);
  expect(usesPresentationShell("/apresentacao/empresas/")).toBe(true);
  for (const path of [
    "/",
    "/entrar",
    "/rh",
    "/plataforma",
    "/ivo-integral/acoes",
    "/api/apresentacao",
    "/apresentacao/empresas/admin",
    "/apresentacao/outra",
  ])
    expect(usesPresentationShell(path)).toBe(false);
});
