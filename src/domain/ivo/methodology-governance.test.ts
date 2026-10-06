import { describe, expect, test } from "bun:test";
import rawRegistry from "./methodology-governance.json";
import { getDimensionMappings } from "./dimension-mappings";
import {
  MethodologyGovernanceError,
  getGovernanceEntries,
  getGovernanceEntry,
  governanceStateOf,
  validateGovernanceRegistry,
} from "./methodology-governance";

type Registry = Parameters<typeof validateGovernanceRegistry>[0];
const clone = () => JSON.parse(JSON.stringify(rawRegistry)) as Registry;

describe("registro canônico de governança", () => {
  test("transcreve o dossiê: D1–D10 e M1–M6, todos em proposta", () => {
    const entries = getGovernanceEntries();
    expect(entries.filter((e) => e.kind === "decision").map((e) => e.id)).toEqual(["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"]);
    expect(entries.filter((e) => e.kind === "mapping").map((e) => e.id)).toEqual(["M1", "M2", "M3", "M4", "M5", "M6"]);
    expect(entries.every((e) => e.state === "proposta" && e.approval === null && e.owner === null)).toBe(true);
    expect(entries.every((e) => e.approvalCriteria.length > 0 && e.effects.length > 0 && e.sources.length > 0)).toBe(true);
  });

  test("ausência nunca vira aprovação", () => {
    expect(governanceStateOf("D9")).toBe("proposta");
    expect(governanceStateOf("D-inexistente")).toBe("proposta");
    expect(getGovernanceEntry("D9")?.effects.map((e) => e.feature).join(" ")).toContain("parecer conclusivo");
  });

  test("nenhum mapeamento APROVADO no registro de mapeamentos sem aprovação correspondente na governança", () => {
    for (const mapping of getDimensionMappings().filter((m) => m.status === "APROVADO")) {
      const gov = getGovernanceEntries().find(
        (e) => e.kind === "mapping" && e.mapping?.sourceConstructId === mapping.sourceConstructId && e.mapping?.dimension === mapping.dimension,
      );
      expect(gov?.state === "aprovado_para_piloto" || gov?.state === "validado_para_uso_definido").toBe(true);
    }
    expect(getDimensionMappings().length).toBe(0);
  });

  test("cada mapeamento proposto aponta construto e dimensão reais", () => {
    for (const e of getGovernanceEntries().filter((x) => x.kind === "mapping")) {
      expect(e.mapping).toBeTruthy();
    }
    expect(getGovernanceEntry("M3")?.mapping).toMatchObject({ sourceConstructId: "satisfacao_empresa", dimension: "lideranca", nature: "complementar" });
    expect(getGovernanceEntry("M4")?.mapping?.dimension).toBeNull();
    expect(getGovernanceEntry("M5")?.mapping?.sourceConstructId).toBeNull();
  });

  test("fail-closed: id duplicado, estado inválido, dependência inexistente, construto inexistente", () => {
    const dup = clone();
    dup.entries.push({ ...dup.entries[0]! });
    expect(() => validateGovernanceRegistry(dup)).toThrow(MethodologyGovernanceError);
    const badState = clone();
    badState.entries[0]!.state = "aprovada";
    expect(() => validateGovernanceRegistry(badState)).toThrow(/estado inválido/);
    const badDep = clone();
    badDep.entries[0]!.depends_on = ["D99"];
    expect(() => validateGovernanceRegistry(badDep)).toThrow(/dependência inexistente/);
    const badConstruct = clone();
    const m = badConstruct.entries.find((e) => e.id === "M1")!;
    m.mapping = { ...m.mapping!, sourceConstructId: "fator_inexistente" };
    expect(() => validateGovernanceRegistry(badConstruct)).toThrow(/não existe na lente/);
  });

  test("fail-closed: aprovação sem responsável, revisor, evidência ou uso definido; proposta com aprovação", () => {
    const noOwner = clone();
    noOwner.entries[0]!.state = "aprovado_para_piloto";
    expect(() => validateGovernanceRegistry(noOwner)).toThrow(/responsável e revisor/);
    const sameRole = clone();
    Object.assign(sameRole.entries[0]!, { state: "aprovado_para_piloto", owner: "Papel", reviewer: "papel" });
    expect(() => validateGovernanceRegistry(sameRole)).toThrow(/revisor igual/);
    const noEvidence = clone();
    Object.assign(noEvidence.entries[0]!, {
      state: "aprovado_para_piloto", owner: "A", reviewer: "B",
      approval: { decided_by: "u", decided_at: "2026-10-05", evidence: [], intended_use: null },
    });
    expect(() => validateGovernanceRegistry(noEvidence)).toThrow(/decisor, data e evidência/);
    const noUse = clone();
    Object.assign(noUse.entries[0]!, {
      state: "validado_para_uso_definido", owner: "A", reviewer: "B",
      approval: { decided_by: "u", decided_at: "2026-10-05", evidence: ["e"], intended_use: null },
    });
    expect(() => validateGovernanceRegistry(noUse)).toThrow(/uso definido/);
    const ghost = clone();
    ghost.entries[0]!.approval = { decided_by: "u", decided_at: "2026-10-05", evidence: ["e"], intended_use: null };
    expect(() => validateGovernanceRegistry(ghost)).toThrow(/não pode carregar aprovação/);
    const ok = clone();
    Object.assign(ok.entries[0]!, {
      state: "aprovado_para_piloto", owner: "A", reviewer: "B",
      approval: { decided_by: "u", decided_at: "2026-10-05", evidence: ["e"], intended_use: null, test: true },
    });
    expect(validateGovernanceRegistry(ok)[0]!.approval?.test).toBe(true);
  });
});
