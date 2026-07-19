import { describe, expect, test } from "bun:test";
import {
  computeSkillStatusParity,
  isKnownSkillStatus,
  isSkillAvailable,
  validateSkillStatusEntries,
  type SkillStatusEntry,
} from "./skill-status";

describe("isKnownSkillStatus", () => {
  test("REAL/PARCIAL/ROADMAP são conhecidos", () => {
    expect(isKnownSkillStatus("REAL")).toBe(true);
    expect(isKnownSkillStatus("PARCIAL")).toBe(true);
    expect(isKnownSkillStatus("ROADMAP")).toBe(true);
  });

  test("qualquer outra string é desconhecida", () => {
    expect(isKnownSkillStatus("BETA")).toBe(false);
    expect(isKnownSkillStatus("")).toBe(false);
    expect(isKnownSkillStatus("real")).toBe(false); // case-sensitive, nunca normaliza
  });
});

describe("isSkillAvailable — único predicado de disponibilidade, fail-closed", () => {
  test("REAL e PARCIAL disponíveis", () => {
    expect(isSkillAvailable("REAL")).toBe(true);
    expect(isSkillAvailable("PARCIAL")).toBe(true);
  });

  test("ROADMAP nunca disponível", () => {
    expect(isSkillAvailable("ROADMAP")).toBe(false);
  });

  test("undefined (ausente do mapa) nunca disponível — omissão não é autorização", () => {
    expect(isSkillAvailable(undefined)).toBe(false);
  });

  test("status desconhecido nunca disponível", () => {
    expect(isSkillAvailable("BETA")).toBe(false);
  });
});

describe("validateSkillStatusEntries — auto-checagem estrutural", () => {
  test("lista válida sem duplicatas e status conhecidos → válida", () => {
    const entries: SkillStatusEntry[] = [
      { skill_id: "SKILL-A", status: "REAL" },
      { skill_id: "SKILL-B", status: "PARCIAL" },
    ];
    expect(validateSkillStatusEntries(entries)).toEqual({ valid: true, errors: [] });
  });

  test("id duplicado é reportado nominalmente", () => {
    const entries: SkillStatusEntry[] = [
      { skill_id: "SKILL-A", status: "REAL" },
      { skill_id: "SKILL-A", status: "PARCIAL" },
    ];
    const result = validateSkillStatusEntries(entries);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("SKILL-A");
    expect(result.errors.join(" ")).toContain("duplicado");
  });

  test("status desconhecido é reportado nominalmente", () => {
    const entries: SkillStatusEntry[] = [{ skill_id: "SKILL-A", status: "BETA" }];
    const result = validateSkillStatusEntries(entries);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("SKILL-A");
    expect(result.errors.join(" ")).toContain("desconhecido");
  });

  test("skill_id vazio é reportado", () => {
    const entries: SkillStatusEntry[] = [{ skill_id: "  ", status: "REAL" }];
    expect(validateSkillStatusEntries(entries).valid).toBe(false);
  });
});

describe("computeSkillStatusParity — os 6 modos de falha, cada um isolado", () => {
  const CANON: SkillStatusEntry[] = [
    { skill_id: "SKILL-A", status: "REAL" },
    { skill_id: "SKILL-B", status: "PARCIAL" },
  ];
  const PROJ_OK: SkillStatusEntry[] = [
    { skill_id: "SKILL-A", status: "REAL" },
    { skill_id: "SKILL-B", status: "PARCIAL" },
  ];

  test("projeção idêntica ao canônico, mesma versão → ok, zero erros", () => {
    const result = computeSkillStatusParity(CANON, "1.0.0", PROJ_OK, "1.0.0");
    expect(result).toEqual({ ok: true, errors: [] });
  });

  test("skill ausente da projeção é detectado nominalmente", () => {
    const proj = PROJ_OK.filter((e) => e.skill_id !== "SKILL-B");
    const result = computeSkillStatusParity(CANON, "1.0.0", proj, "1.0.0");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("ausente") && e.includes("SKILL-B"))).toBe(true);
  });

  test("skill órfã na projeção (não existe mais no canônico) é detectada", () => {
    const proj = [...PROJ_OK, { skill_id: "SKILL-Z", status: "REAL" }];
    const result = computeSkillStatusParity(CANON, "1.0.0", proj, "1.0.0");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("órfã") && e.includes("SKILL-Z"))).toBe(true);
  });

  test("status divergente entre canônico e projeção é detectado", () => {
    const proj = [{ skill_id: "SKILL-A", status: "PARCIAL" }, PROJ_OK[1]!];
    const result = computeSkillStatusParity(CANON, "1.0.0", proj, "1.0.0");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("divergente") && e.includes("SKILL-A"))).toBe(true);
  });

  test("id duplicado (na projeção) é detectado via a auto-checagem embutida", () => {
    const proj = [...PROJ_OK, { skill_id: "SKILL-A", status: "REAL" }];
    const result = computeSkillStatusParity(CANON, "1.0.0", proj, "1.0.0");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("duplicado") && e.includes("SKILL-A"))).toBe(true);
  });

  test("status desconhecido (na projeção) é detectado via a auto-checagem embutida", () => {
    const proj = [{ skill_id: "SKILL-A", status: "BETA" }, PROJ_OK[1]!];
    const result = computeSkillStatusParity(CANON, "1.0.0", proj, "1.0.0");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("desconhecido"))).toBe(true);
  });

  test("versão da fonte incompatível é detectada mesmo com conteúdo idêntico", () => {
    const result = computeSkillStatusParity(CANON, "1.1.0", PROJ_OK, "1.0.0");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("versão incompatível"))).toBe(true);
  });

  test("múltiplas falhas simultâneas são todas reportadas, não só a primeira", () => {
    const proj = [{ skill_id: "SKILL-A", status: "PARCIAL" }]; // diverge + SKILL-B ausente
    const result = computeSkillStatusParity(CANON, "2.0.0", proj, "1.0.0");
    expect(result.errors.length).toBeGreaterThanOrEqual(3); // versão + divergência + ausência
  });
});
