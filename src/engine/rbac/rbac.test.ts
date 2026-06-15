import { describe, expect, test } from "bun:test";
import { canSeeNavItem, navForRole, type NavItemDef } from "./rbac";
import type { DomainPack } from "../pack/pack-types";

// ─── canSeeNavItem (invariante de visibilidade) ───────────────────────────────

describe("canSeeNavItem", () => {
  test('roles "all" → visível para qualquer papel', () => {
    const item: NavItemDef = { id: "ivo", label: "IVO", roles: "all" };
    expect(canSeeNavItem(item, "COLABORADOR")).toBe(true);
    expect(canSeeNavItem(item, "PLATFORM_ADMIN")).toBe(true);
  });

  test("lista de papéis: visível só para quem está na lista", () => {
    const item: NavItemDef = { id: "rh", label: "RH", roles: ["RH_ADMIN", "CHRO"] };
    expect(canSeeNavItem(item, "RH_ADMIN")).toBe(true);
    expect(canSeeNavItem(item, "COLABORADOR")).toBe(false);
  });

  test("lista vazia → ninguém vê", () => {
    expect(canSeeNavItem({ id: "x", label: "X", roles: [] }, "RH_ADMIN")).toBe(false);
  });
});

// ─── navForRole (filtro + ordem do pack) ──────────────────────────────────────

describe("navForRole", () => {
  const pack = {
    navigation: [
      { id: "overview", label: "Visão", roles: "all" },
      { id: "domain_b", label: "SST", roles: ["SST_PROFISSIONAL", "RH_ADMIN"], domain: "B" },
      { id: "admin", label: "Admin", roles: ["RH_ADMIN"] },
      { id: "ivo", label: "IVO", roles: "all" },
    ],
  } as unknown as DomainPack;

  test("RH_ADMIN vê os itens permitidos + os 'all'", () => {
    const ids = navForRole(pack, "RH_ADMIN").map((i) => i.id);
    expect(ids).toEqual(["overview", "domain_b", "admin", "ivo"]);
  });

  test("COLABORADOR vê só os 'all' (separação de domínio respeitada)", () => {
    const ids = navForRole(pack, "COLABORADOR").map((i) => i.id);
    expect(ids).toEqual(["overview", "ivo"]);
    expect(ids).not.toContain("domain_b");
    expect(ids).not.toContain("admin");
  });

  test("preserva a ordem declarada no pack", () => {
    const ids = navForRole(pack, "RH_ADMIN").map((i) => i.id);
    expect(ids.indexOf("overview")).toBeLessThan(ids.indexOf("ivo"));
  });

  test("pack sem navegação → lista vazia (sem throw)", () => {
    expect(navForRole({} as DomainPack, "RH_ADMIN")).toEqual([]);
  });
});
