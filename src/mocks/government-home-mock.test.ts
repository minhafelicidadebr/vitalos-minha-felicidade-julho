import { describe, expect, test } from "bun:test";
import governmentPack from "@/domain/packs/government/government.pack.json";
import { auditAudiencePolicies, hasAudienceCapability } from "@/engine/audience/audience-engine";
import {
  GOVERNMENT_AUDIENCE_POLICIES,
  canViewGovernmentAggregate,
  resolveGovernmentAudience,
} from "./government-home-mock";

const DEMO_PERSONAS = governmentPack.demoPersonas as string[];

describe("government home — políticas de audiência", () => {
  test("o pack governamental aponta a visão geral para a home adaptativa", () => {
    expect(governmentPack.overviewRoute).toBe("/governo");
  });

  test("toda persona de demonstração possui uma única política", () => {
    const audit = auditAudiencePolicies(GOVERNMENT_AUDIENCE_POLICIES, DEMO_PERSONAS);

    expect(audit.valid).toBe(true);
    expect(audit.duplicateRoleIds).toEqual([]);
    expect(audit.missingRoleIds).toEqual([]);
  });

  test("somente gestão recebe índice, lentes, tendência e onda agregada", () => {
    for (const roleId of ["DIRIGENTE", "SECRETARIO", "DGP_RH", "CONTROLE_INTERNO"]) {
      const policy = resolveGovernmentAudience(roleId).policy;
      expect(hasAudienceCapability(policy, "collective_index")).toBe(true);
      expect(hasAudienceCapability(policy, "collective_lenses")).toBe(true);
      expect(hasAudienceCapability(policy, "collective_trend")).toBe(true);
      expect(canViewGovernmentAggregate(roleId)).toBe(true);
    }
  });

  test("servidor, gestor de equipe e embaixador não recebem capacidades de gestão", () => {
    for (const roleId of ["SERVIDOR", "GESTOR_EQUIPE", "EMBAIXADOR_GOV"]) {
      const policy = resolveGovernmentAudience(roleId).policy;

      expect(policy.capabilities).toEqual([]);
      expect(canViewGovernmentAggregate(roleId)).toBe(false);
      expect(policy.actions.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("papel desconhecido falha para o perfil de menor privilégio", () => {
    const result = resolveGovernmentAudience("PAPEL_NAO_CONFIGURADO");

    expect(result.reason).toBe("missing_role");
    expect(result.policy.id).toBe("safe_fallback");
    expect(result.policy.capabilities).toEqual([]);
  });

  test("ações participantes não apontam para painéis coletivos", () => {
    for (const roleId of ["SERVIDOR", "GESTOR_EQUIPE", "EMBAIXADOR_GOV"]) {
      const routes = resolveGovernmentAudience(roleId).policy.actions.map((action) => action.to);

      expect(routes).not.toContain("/ivo");
      expect(routes).not.toContain("/evolucao");
      expect(routes).not.toContain("/prioridades");
    }
  });
});
