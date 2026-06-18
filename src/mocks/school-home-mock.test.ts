import { describe, expect, test } from "bun:test";
import schoolPack from "@/domain/packs/school/school.pack.json";
import { auditAudiencePolicies, hasAudienceCapability } from "@/engine/audience/audience-engine";
import {
  SCHOOL_AUDIENCE_POLICIES,
  canViewSchoolAggregate,
  resolveSchoolAudience,
} from "./school-home-mock";

const DEMO_PERSONAS = schoolPack.demoPersonas as string[];

describe("school home — políticas de audiência", () => {
  test("o pack escolar aponta a visão geral para a home adaptativa", () => {
    expect(schoolPack.overviewRoute).toBe("/escola");
  });

  test("toda persona de demonstração possui uma única política", () => {
    const audit = auditAudiencePolicies(SCHOOL_AUDIENCE_POLICIES, DEMO_PERSONAS);

    expect(audit.valid).toBe(true);
    expect(audit.duplicateRoleIds).toEqual([]);
    expect(audit.missingRoleIds).toEqual([]);
  });

  test("somente gestão recebe índice, lentes, tendência e onda agregada", () => {
    for (const roleId of ["DIRETOR", "COORDENADOR", "SECRETARIA_EDU"]) {
      const policy = resolveSchoolAudience(roleId).policy;
      expect(hasAudienceCapability(policy, "collective_index")).toBe(true);
      expect(hasAudienceCapability(policy, "collective_lenses")).toBe(true);
      expect(hasAudienceCapability(policy, "collective_trend")).toBe(true);
      expect(canViewSchoolAggregate(roleId)).toBe(true);
    }
  });

  test("estudante, família e educador não recebem capacidades de gestão", () => {
    for (const roleId of ["ESTUDANTE", "FAMILIA", "EDUCADOR"]) {
      const policy = resolveSchoolAudience(roleId).policy;

      expect(policy.capabilities).toEqual([]);
      expect(canViewSchoolAggregate(roleId)).toBe(false);
      expect(policy.actions.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("papel desconhecido falha para o perfil de menor privilégio", () => {
    const result = resolveSchoolAudience("PAPEL_NAO_CONFIGURADO");

    expect(result.reason).toBe("missing_role");
    expect(result.policy.id).toBe("safe_fallback");
    expect(result.policy.capabilities).toEqual([]);
  });

  test("ações participantes não apontam para painéis coletivos", () => {
    for (const roleId of ["ESTUDANTE", "FAMILIA", "EDUCADOR"]) {
      const routes = resolveSchoolAudience(roleId).policy.actions.map((action) => action.to);

      expect(routes).not.toContain("/ivo");
      expect(routes).not.toContain("/evolucao");
      expect(routes).not.toContain("/prioridades");
    }
  });
});
