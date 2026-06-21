import { describe, expect, test } from "bun:test";
import healthPack from "@/domain/packs/health/health.pack.json";
import { auditAudiencePolicies, hasAudienceCapability } from "@/engine/audience/audience-engine";
import {
  HEALTH_AUDIENCE_POLICIES,
  canViewHealthAggregate,
  resolveHealthAudience,
} from "./health-home-mock";

const DEMO_PERSONAS = healthPack.demoPersonas as string[];

describe("health home — políticas de audiência", () => {
  test("o pack de saúde aponta a visão geral para a home adaptativa", () => {
    expect(healthPack.overviewRoute).toBe("/saude");
  });

  test("toda persona de demonstração possui uma única política", () => {
    const audit = auditAudiencePolicies(HEALTH_AUDIENCE_POLICIES, DEMO_PERSONAS);

    expect(audit.valid).toBe(true);
    expect(audit.duplicateRoleIds).toEqual([]);
    expect(audit.missingRoleIds).toEqual([]);
  });

  test("somente gestão recebe índice, lentes, tendência e onda agregada", () => {
    for (const roleId of ["DIRETOR_CLINICO", "GERENTE_ENFERMAGEM", "SESMT_SAUDE"]) {
      const policy = resolveHealthAudience(roleId).policy;
      expect(hasAudienceCapability(policy, "collective_index")).toBe(true);
      expect(hasAudienceCapability(policy, "collective_lenses")).toBe(true);
      expect(hasAudienceCapability(policy, "collective_trend")).toBe(true);
      expect(canViewHealthAggregate(roleId)).toBe(true);
    }
  });

  test("profissional, residente e coordenador não recebem capacidades de gestão", () => {
    for (const roleId of ["PROFISSIONAL_SAUDE", "RESIDENTE", "COORDENADOR_EQUIPE"]) {
      const policy = resolveHealthAudience(roleId).policy;

      expect(policy.capabilities).toEqual([]);
      expect(canViewHealthAggregate(roleId)).toBe(false);
      expect(policy.actions.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("papel desconhecido falha para o perfil de menor privilégio", () => {
    const result = resolveHealthAudience("PAPEL_NAO_CONFIGURADO");

    expect(result.reason).toBe("missing_role");
    expect(result.policy.id).toBe("safe_fallback");
    expect(result.policy.capabilities).toEqual([]);
  });

  test("ações participantes não apontam para painéis coletivos", () => {
    for (const roleId of ["PROFISSIONAL_SAUDE", "RESIDENTE", "COORDENADOR_EQUIPE"]) {
      const routes = resolveHealthAudience(roleId).policy.actions.map((action) => action.to);

      expect(routes).not.toContain("/ivo");
      expect(routes).not.toContain("/evolucao");
      expect(routes).not.toContain("/prioridades");
    }
  });
});
