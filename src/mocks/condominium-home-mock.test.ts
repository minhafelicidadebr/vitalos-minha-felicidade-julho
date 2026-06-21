import { describe, expect, test } from "bun:test";
import condominiumPack from "@/domain/packs/condominium/condominium.pack.json";
import { auditAudiencePolicies, hasAudienceCapability } from "@/engine/audience/audience-engine";
import {
  CONDOMINIUM_AUDIENCE_POLICIES,
  canViewCondominiumAggregate,
  resolveCondominiumAudience,
} from "./condominium-home-mock";

const DEMO_PERSONAS = condominiumPack.demoPersonas as string[];

describe("condominium home — políticas de audiência", () => {
  test("o pack condominial aponta a visão geral para a home adaptativa", () => {
    expect(condominiumPack.overviewRoute).toBe("/condominios");
  });

  test("toda persona de demonstração possui uma única política", () => {
    const audit = auditAudiencePolicies(CONDOMINIUM_AUDIENCE_POLICIES, DEMO_PERSONAS);

    expect(audit.valid).toBe(true);
    expect(audit.duplicateRoleIds).toEqual([]);
    expect(audit.missingRoleIds).toEqual([]);
  });

  test("somente gestão recebe índice, lentes, tendência e onda agregada", () => {
    for (const roleId of ["SINDICO", "CONSELHO", "ADMINISTRADORA", "GESTOR_CARTEIRA"]) {
      const policy = resolveCondominiumAudience(roleId).policy;
      expect(hasAudienceCapability(policy, "collective_index")).toBe(true);
      expect(hasAudienceCapability(policy, "collective_lenses")).toBe(true);
      expect(hasAudienceCapability(policy, "collective_trend")).toBe(true);
      expect(canViewCondominiumAggregate(roleId)).toBe(true);
    }
  });

  test("morador, equipe e embaixador não recebem capacidades de gestão", () => {
    for (const roleId of ["MORADOR", "ZELADOR", "FUNCIONARIO_COND", "EMBAIXADOR_COND"]) {
      const policy = resolveCondominiumAudience(roleId).policy;

      expect(policy.capabilities).toEqual([]);
      expect(canViewCondominiumAggregate(roleId)).toBe(false);
      expect(policy.actions.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("papel desconhecido falha para o perfil de menor privilégio", () => {
    const result = resolveCondominiumAudience("PAPEL_NAO_CONFIGURADO");

    expect(result.reason).toBe("missing_role");
    expect(result.policy.id).toBe("safe_fallback");
    expect(result.policy.capabilities).toEqual([]);
  });

  test("ações participantes não apontam para painéis coletivos", () => {
    for (const roleId of ["MORADOR", "ZELADOR", "EMBAIXADOR_COND"]) {
      const routes = resolveCondominiumAudience(roleId).policy.actions.map((action) => action.to);

      expect(routes).not.toContain("/ivo");
      expect(routes).not.toContain("/evolucao");
      expect(routes).not.toContain("/prioridades");
    }
  });
});
