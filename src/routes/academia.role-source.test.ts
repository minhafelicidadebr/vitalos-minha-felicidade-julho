// Guarda: a curadoria da Academia segue o papel institucional da sessão,
// como o menu do AppShell. A persona de demonstração não pode governá-la
// para uma conta real, nem sinais fictícios podem orientar essa curadoria.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "academia.tsx"), "utf8");

describe("/academia · origem do papel", () => {
  test("lê o papel por useEffectiveRole, nunca direto da persona", () => {
    expect(source).toContain("useEffectiveRole()");
    expect(source).not.toContain("usePersona(");
  });

  test("sessão institucional não usa ciclo fictício nem VIA-T da persona demo", () => {
    expect(source).toMatch(
      /institutional\s*\n?\s*\?\s*\[\]\s*\n?\s*:\s*calculateIVO\(getSectorData/,
    );
    expect(source).toContain('!institutional && packId === "enterprise"');
  });

  test("sessão pendente mostra carregamento em vez de presumir um papel", () => {
    expect(source).toContain('roleContext.source === "pending"');
  });
});
