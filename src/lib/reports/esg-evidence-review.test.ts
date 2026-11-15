import { expect, test } from "bun:test";
import { reviewEsgEvidence, type EsgEvidenceReview } from "./esg-evidence-review";

// IDs são fixtures de teste; não representam aprovação ou referências resolvidas.
const fixture = (): EsgEvidenceReview => ({
  relation: { id: "TEST-REL", version: "1", axis: "S", use: "pratica" },
  decision: { relationId: "TEST-REL", version: "1", axis: "S", use: "pratica", status: "approved", reviewerRef: "TEST-REVIEWER", decidedAt: "2026-11-15T12:00:00Z" },
  evidence: { state: "available", projectRef: "TEST-PROJECT", mechanismRef: "MECH-TEST-001", studyIds: ["TST-001"], executionRefs: ["TEST-EVENT"], limitations: ["Sem inferência causal"], nextCycle: "Revisar", valueKind: "contagem_agregada", language: "mudanca_observada" },
});

test("completude permite revisão, nunca autoriza emissão", () => {
  expect(reviewEsgEvidence(fixture())).toEqual({ status: "ready_for_review", reasons: [] });
});
test("decisão ausente, proposta, rejeitada ou revogada bloqueia", () => {
  const missing = fixture(); delete missing.decision;
  expect(reviewEsgEvidence(missing).status).toBe("blocked");
  for (const status of ["proposed", "rejected", "revoked"] as const) {
    const input = fixture(); input.decision!.status = status;
    expect(reviewEsgEvidence(input).status).toBe("blocked");
  }
});
test("aprovação de outro vínculo, versão, eixo ou uso não se transfere", () => {
  for (const patch of [{ relationId: "OTHER" }, { version: "2" }, { axis: "G" as const }, { use: "impacto" }, { reviewerRef: " " }, { decidedAt: "invalid" }]) {
    const input = fixture(); Object.assign(input.decision!, patch);
    expect(reviewEsgEvidence(input).status).toBe("blocked");
  }
});
test("proteção retém detalhes inclusive diante de aprovação e dados maliciosos", () => {
  const input = fixture(); input.evidence.state = "protected"; input.evidence.projectRef = "SECRET";
  const result = reviewEsgEvidence(input);
  expect(result.status).toBe("protected"); expect(JSON.stringify(result)).not.toContain("SECRET");
});
test("ausência, unidade incompatível, causalidade e falta de rastros bloqueiam", () => {
  for (const patch of [{ state: "absent" as const }, { valueKind: "horas" }, { language: "impacto_garantido" }, { studyIds: [] }, { executionRefs: [] }, { limitations: [] }, { nextCycle: " " }]) {
    const input = fixture(); Object.assign(input.evidence, patch);
    expect(reviewEsgEvidence(input).status).toBe("blocked");
  }
});
