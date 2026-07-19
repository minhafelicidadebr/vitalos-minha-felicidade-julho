import { describe, expect, test } from "bun:test";
import {
  resolveSkillStatusMap,
  SKILL_STATUS_PROJECTION,
  validateLoadedProjection,
} from "./skill-status-projection";
import { isSkillAvailable } from "@/engine/florencia/skill-status";

describe("SKILL_STATUS_PROJECTION — estrutura readonly/deep-frozen", () => {
  test("o objeto raiz está congelado", () => {
    expect(Object.isFrozen(SKILL_STATUS_PROJECTION)).toBe(true);
  });

  test("o array skills está congelado", () => {
    expect(Object.isFrozen(SKILL_STATUS_PROJECTION.skills)).toBe(true);
  });

  test("cada entrada individual está congelada", () => {
    for (const entry of SKILL_STATUS_PROJECTION.skills) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });

  test("mutação em runtime é ignorada silenciosamente (strict mode do teste não é assumido) ou lança — nunca muda o valor observável", () => {
    const before = SKILL_STATUS_PROJECTION.skills.length;
    try {
      // @ts-expect-error — teste propositalmente tenta violar o readonly.
      SKILL_STATUS_PROJECTION.skills.push({ skill_id: "SKILL-INTRUSA", status: "REAL" });
    } catch {
      // Object.freeze em modo estrito lança — esperado, ignorado aqui.
    }
    expect(SKILL_STATUS_PROJECTION.skills.length).toBe(before);
  });

  test("não é o objeto vazio — carga real aconteceu", () => {
    expect(SKILL_STATUS_PROJECTION.skills.length).toBeGreaterThan(0);
  });
});

describe("SKILL_STATUS_PROJECTION — auto-checagem estrutural (id único, status conhecido)", () => {
  test("a projeção carregada passa na validação estrutural", () => {
    expect(validateLoadedProjection()).toEqual({ valid: true, errors: [] });
  });

  test("todo skill_id é único (sanity direta, sem depender do helper)", () => {
    const ids = SKILL_STATUS_PROJECTION.skills.map((s) => s.skill_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("todo status é REAL ou PARCIAL ou ROADMAP — nunca outra string", () => {
    for (const entry of SKILL_STATUS_PROJECTION.skills) {
      expect(["REAL", "PARCIAL", "ROADMAP"]).toContain(entry.status);
    }
  });
});

describe("resolveSkillStatusMap — fail-closed em runtime", () => {
  test("mapa retornado está congelado", () => {
    expect(Object.isFrozen(resolveSkillStatusMap())).toBe(true);
  });

  test("todo skill_id da projeção aparece no mapa com o MESMO status (projeção real é limpa)", () => {
    const map = resolveSkillStatusMap();
    for (const entry of SKILL_STATUS_PROJECTION.skills) {
      expect(map[entry.skill_id] as string).toBe(entry.status);
    }
  });

  test("todo valor do mapa passa isSkillAvailable() coerentemente com o próprio status", () => {
    const map = resolveSkillStatusMap();
    for (const [id, status] of Object.entries(map)) {
      expect(isSkillAvailable(status)).toBe(status === "REAL" || status === "PARCIAL");
      void id;
    }
  });
});
