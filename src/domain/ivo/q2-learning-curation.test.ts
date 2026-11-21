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
import { approvedQ2Fixture, proposedQ2Fixture } from "@/test/fixtures/q2-learning";

describe("Q2 D10 · aprovação por contexto e por artefato", () => {
  test("proposta permanece oculta; par canônico tem revisão explícita com escopo local", () => {
    const unit = getFactorContentById(rawActivity.contentId)!;
    expect(unit.status).toBe("APROVADO");
    expect(unit.curation?.approval).toMatchObject({
      version: "0.1.0",
      scope: "local_descartavel",
      reviewer: "Olga Mariano; Ana Paula Barbalho",
    });
    expect(getFactorLearningActivity(unit.id, unit.version)?.status).toBe("APROVADO");
    const pending = proposedQ2Fixture();
    const contents = validateFactorContent(pending.raw);
    const activities = validateFactorLearningActivities([pending.activity], contents);
    expect(
      getAvailableFactorLearningActivity(
        contents.find((c) => c.id === unit.id)!,
        true,
        activities,
      ),
    ).toBeUndefined();
  });

  test("promover por rótulo não autoriza claim de passaporte na educação", () => {
    const { raw, unit } = proposedQ2Fixture();
    unit.status = "APROVADO";
    unit.owner = "Revisor sintético";
    unit.approved_at = "2026-11-15";
    unit.curation!.approval = {
      version: unit.version,
      responsible: unit.owner,
      reviewer: "Outro revisor sintético",
      approvedOn: unit.approved_at,
      decisionRef: "SINTETICO",
      scope: "local_descartavel",
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

  test("escopo desconhecido e auto-revisão não validam aprovação", () => {
    for (const mutation of ["scope", "reviewer"] as const) {
      const f = approvedQ2Fixture();
      const unit = f.raw.entries.find((c) => c.id === f.unit.id)!;
      if (mutation === "scope") Object.assign(unit.curation!.approval!, { scope: "global" });
      else unit.curation!.approval!.reviewer = unit.curation!.approval!.responsible;
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
