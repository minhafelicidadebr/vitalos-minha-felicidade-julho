import { describe, expect, test } from "bun:test";
import unit from "./q3-vitality-unit-001.json";
import { getApprovedVitalityUnit, isPublishableVitalityUnit } from "./q3-vitality-units";

describe("Q3 · acesso à unidade de Vitalidade aprovada", () => {
  test("unidade 001 aprovada na versão do conteúdo é entregue", () => {
    expect(getApprovedVitalityUnit()?.id).toBe("Q3-pratica-vitalidade-pausas-001");
  });

  test("recusa proposta, versão divergente e unidade com evidência ou claim", () => {
    expect(isPublishableVitalityUnit({ ...unit, status: "PROPOSTO" })).toBe(false);
    expect(isPublishableVitalityUnit({ ...unit, curation: { ...unit.curation, approval: null } })).toBe(false);
    expect(isPublishableVitalityUnit({ ...unit, contentVersion: "0.3.0" })).toBe(false);
    expect(isPublishableVitalityUnit({ ...unit, evidenceCodes: ["X"] })).toBe(false);
    expect(isPublishableVitalityUnit({ ...unit, safeClaimIds: ["Y"] })).toBe(false);
  });
});
