import { describe, expect, test } from "bun:test";
import { resolveOrgOverviewRoute, invitableRoles } from "./pack-routes";
import { resolvePackBundle } from "./registry";

describe("resolveOrgOverviewRoute — cada setor cai na própria home (P1-06)", () => {
  test("enterprise cai em /rh (sem overviewRoute declarado no pack — fallback correto)", () => {
    expect(resolveOrgOverviewRoute("enterprise")).toBe("/rh");
  });

  test("escola cai em /escola", () => {
    expect(resolveOrgOverviewRoute("school")).toBe("/escola");
  });

  test("governo cai em /governo", () => {
    expect(resolveOrgOverviewRoute("government")).toBe("/governo");
  });

  test("condomínio cai em /condominios", () => {
    expect(resolveOrgOverviewRoute("condominium")).toBe("/condominios");
  });

  test("saúde cai em /saude", () => {
    expect(resolveOrgOverviewRoute("health")).toBe("/saude");
  });

  test("pack desconhecido cai no default do registry (enterprise) → /rh, nunca quebra", () => {
    expect(resolveOrgOverviewRoute("setor-inexistente")).toBe("/rh");
  });
});

describe("invitableRoles — quem pode ser convidado como membro de uma org (P0-06)", () => {
  test("enterprise: 8 papéis de escopo organization/team/self", () => {
    const pack = resolvePackBundle("enterprise").pack;
    const ids = invitableRoles(pack).map((r) => r.id);
    expect(ids).toEqual([
      "CHRO",
      "RH_ADMIN",
      "C_LEVEL",
      "LIDER_EQUIPE",
      "EMBAIXADOR",
      "COLABORADOR",
      "SST_PROFISSIONAL",
      "CIPA_MEMBRO",
    ]);
  });

  test("exclui HOLDING_ADMIN e GESTOR_CARTEIRA — multi-organização, incompatível com 1 pessoa = 1 perfil = 1 org", () => {
    const pack = resolvePackBundle("enterprise").pack;
    const ids = invitableRoles(pack).map((r) => r.id);
    expect(ids).not.toContain("HOLDING_ADMIN");
    expect(ids).not.toContain("GESTOR_CARTEIRA");
  });

  test("exclui PLATFORM_ADMIN e papéis externos/temporários (scoped_reports/opportunities/account_health)", () => {
    const pack = resolvePackBundle("enterprise").pack;
    const ids = invitableRoles(pack).map((r) => r.id);
    expect(ids).not.toContain("PLATFORM_ADMIN");
    expect(ids).not.toContain("CONSULTOR_EXTERNO");
    expect(ids).not.toContain("PARCEIRO_LOCAL");
    expect(ids).not.toContain("CUSTOMER_SUCCESS");
  });

  test("pack sem roles → lista vazia, sem throw", () => {
    expect(invitableRoles({ roles: [] })).toEqual([]);
  });
});
