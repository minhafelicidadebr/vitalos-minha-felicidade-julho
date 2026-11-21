import { describe, expect, test } from "bun:test";
import { parseAppPort, parseTenantCommand, sanitizeLine, syntheticEmails, tenantSlug } from "./institutional-tenant-guards";

describe("guards do harness de personas", () => {
  test("provision exige tenant válido e recusa fixtures preservadas", () => {
    expect(parseTenantCommand(["provision", "--tenant", "gama"])).toEqual({ kind: "provision", tenant: "gama", origin: "http://localhost:8092" });
    for (const tenant of ["alfa", "beta"]) expect(() => parseTenantCommand(["provision", "--tenant", tenant])).toThrow(/fixture preservada/);
    for (const tenant of ["", "Ga", "gama1", "gama;drop", "a".repeat(13)]) expect(() => parseTenantCommand(["provision", "--tenant", tenant])).toThrow();
    expect(() => parseTenantCommand(["provision"])).toThrow();
  });

  test("comandos desconhecidos e reset não existem", () => {
    for (const cmd of ["reset", "delete", "", "--tenant"]) expect(() => parseTenantCommand([cmd])).toThrow(/Use:/);
    expect(parseTenantCommand(["readback"])).toEqual({ kind: "readback" });
  });

  test("porta do checkout principal e portas privilegiadas são recusadas", () => {
    expect(parseAppPort([])).toBe(8092);
    expect(parseAppPort(["--port", "8093"])).toBe(8093);
    for (const port of ["8091", "80", "abc", "99999"]) expect(() => parseAppPort(["--port", port])).toThrow();
  });

  test("identidades e slug são sempre sintéticos e derivados do tenant", () => {
    expect(tenantSlug("gama")).toBe("institutional-gama");
    expect(syntheticEmails("gama")).toEqual({ rh: "gama@institutional.test", leader: "lider.gama@institutional.test" });
  });

  test("saída sanitizada não carrega JWT nem token hex", () => {
    const line = sanitizeLine("token=eyJhbGciOi.abc.def link=" + "a1".repeat(24));
    expect(line).not.toContain("eyJ");
    expect(line).not.toMatch(/[a-f0-9]{40,}/);
  });
});
