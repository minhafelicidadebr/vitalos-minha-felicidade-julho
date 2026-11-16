import { describe, expect, test } from "bun:test";
import rawContent from "./factor-content.json";
import rawActivity from "./q2-learning-activity-001.json";
import { getFactorContentById, validateFactorContent } from "./factor-content";
import {
  getAvailableFactorLearningActivity,
  getFactorLearningActivity,
  validateFactorLearningActivities,
  type FactorLearningActivity,
} from "./factor-learning-activities";
import { approvedQ2Fixture } from "@/test/fixtures/q2-learning";

describe("Q2 D10 · aprovação por contexto e por artefato", () => {
  test("proposta original permanece oculta mesmo no runtime TESTE", () => {
    const unit = getFactorContentById(rawActivity.contentId)!;
    expect(unit.status).toBe("PROPOSTO");
    expect(unit.curation?.approval).toBeNull();
    expect(getFactorLearningActivity(unit.id, unit.version)?.status).toBe("PROPOSTO");
    expect(getAvailableFactorLearningActivity(unit, true)).toBeUndefined();
  });

  test("promover por rótulo não autoriza claim de passaporte na educação", () => {
    const raw = structuredClone(rawContent) as Parameters<typeof validateFactorContent>[0];
    const unit = raw.entries.find((c) => c.id === rawActivity.contentId)!;
    unit.status = "APROVADO";
    unit.owner = "Revisor sintético";
    unit.approved_at = "2026-11-15";
    unit.curation!.approval = {
      version: unit.version,
      reviewer: unit.owner,
      approvedOn: unit.approved_at,
      decisionRef: "SINTETICO",
    };
    expect(() => validateFactorContent(raw)).toThrow(/não autorizado para este contexto/);
  });

  test("rejeita claim inexistente, associação a outro estudo e registros divergentes", () => {
    for (const mutation of ["id", "study", "registry", "role", "context"] as const) {
      const f = approvedQ2Fixture();
      const unit = f.raw.entries.find((c) => c.id === f.unit.id)!;
      if (mutation === "id") unit.safe_claim_ids = ["CLAIM-INEXISTENTE"];
      if (mutation === "study") unit.evidence_codes = ["JOB-035"];
      if (mutation === "registry") unit.curation!.claimRegistryVersion = "antiga";
      if (mutation === "role") f.registries.claims.claims.at(-1)!.role = ["lider"];
      if (mutation === "context")
        f.registries.claims.claims.at(-1)!.target_context = "evidencia-passaporte";
      expect(() => validateFactorContent(f.raw, f.registries)).toThrow();
    }
  });

  test("aprovação não acompanha mudança de versão nem data impossível", () => {
    for (const change of ["version", "date", "missing", "claim-text"] as const) {
      const f = approvedQ2Fixture();
      const unit = f.raw.entries.find((c) => c.id === f.unit.id)!;
      if (change === "version") unit.version = "0.2.0";
      if (change === "date") unit.curation!.approval!.approvedOn = "2026-02-31";
      if (change === "missing") unit.curation!.approval = null;
      if (change === "claim-text") unit.body = ["Uma garantia não autorizada de bem-estar."];
      expect(() => validateFactorContent(f.raw, f.registries)).toThrow();
    }
  });

  test("unidade aprovada não libera atividade proposta, antiga ou TESTE", () => {
    const f = approvedQ2Fixture();
    expect(getAvailableFactorLearningActivity(f.unit, false, f.activities)?.id).toBe(f.activity.id);
    const proposed = {
      ...f.activity,
      status: "PROPOSTO" as const,
      curation: { ...f.activity.curation!, approval: null },
    };
    const entries = validateFactorLearningActivities([proposed], f.contents, f.registries);
    expect(getAvailableFactorLearningActivity(f.unit, true, entries)).toBeUndefined();
    for (const change of [
      { contentVersion: "antiga" },
      { status: "TESTE" as const },
      { version: "0.2.0" },
    ]) {
      expect(() =>
        validateFactorLearningActivities([{ ...f.activity, ...change }], f.contents, f.registries),
      ).toThrow();
    }
    expect(() =>
      validateFactorLearningActivities([f.activity, f.activity], f.contents, f.registries),
    ).toThrow(/duplicado/);
  });

  test("questão inválida e proposta com assinatura recusadas; validação não muta entrada", () => {
    const initial = JSON.stringify(rawActivity);
    const a = structuredClone(rawActivity) as FactorLearningActivity;
    a.checks[0]!.correctOptionId = "nao-existe";
    expect(() => validateFactorLearningActivities([a])).toThrow(/inválidas/);
    const f = approvedQ2Fixture();
    expect(() =>
      validateFactorLearningActivities(
        [{ ...f.activity, status: "PROPOSTO" }],
        f.contents,
        f.registries,
      ),
    ).toThrow(/proposta não carrega aprovação/);
    expect(JSON.stringify(rawActivity)).toBe(initial);
    expect(Object.isFrozen(f.activities[0]!.checks[0]!.options)).toBe(true);
  });
});
