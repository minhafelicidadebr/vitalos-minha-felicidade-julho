import { describe, expect, test } from "bun:test";
import { resolveOrgOverviewRoute } from "./pack-routes";

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
