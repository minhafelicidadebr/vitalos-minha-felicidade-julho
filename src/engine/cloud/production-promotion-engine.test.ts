import { describe, expect, test } from "bun:test";
import {
  evaluateProductionPromotion,
  REQUIRED_PRODUCTION_CONTROLS,
  type ProductionPromotionInput,
  type RuntimeEvidence,
} from "./production-promotion-engine";

const digest = "a".repeat(64);
const evidence: RuntimeEvidence[] = REQUIRED_PRODUCTION_CONTROLS.map((controlId) => ({
  controlId,
  environment: "production",
  assurance: "runtime_verified",
  status: "verified",
  deploymentId: "deploy-a",
  releaseCommit: "0611508",
  observedAt: "2026-06-19T20:00:00.000Z",
  expiresAt: "2026-06-20T20:00:00.000Z",
  digest,
}));
const base: ProductionPromotionInput = {
  deploymentId: "deploy-a",
  releaseCommit: "0611508",
  evaluatedAt: "2026-06-19T21:00:00.000Z",
  evidence,
};

describe("production promotion engine", () => {
  test("issues a certificate draft only when all five runtime controls pass", () => {
    expect(evaluateProductionPromotion(base)).toMatchObject({
      status: "ready",
      productionClaimsAllowed: true,
      passedControlCount: 5,
      controlCount: 5,
      certificate: {
        schema: "vitalos.production-promotion.v1",
        deploymentId: "deploy-a",
        releaseCommit: "0611508",
      },
    });
  });

  test("one missing control blocks the entire promotion", () => {
    expect(evaluateProductionPromotion({ ...base, evidence: evidence.slice(1) })).toMatchObject({
      status: "blocked",
      productionClaimsAllowed: false,
      passedControlCount: 4,
      certificate: null,
    });
  });

  test("demo and contract-only evidence are rejected", () => {
    expect(
      evaluateProductionPromotion({
        ...base,
        evidence: evidence.map((item, index) =>
          index === 0 ? { ...item, environment: "demo" } : item,
        ),
      }).controls[0]?.reason,
    ).toBe("demo_evidence");
    expect(
      evaluateProductionPromotion({
        ...base,
        evidence: evidence.map((item, index) =>
          index === 0 ? { ...item, assurance: "contract_only" } : item,
        ),
      }).controls[0]?.reason,
    ).toBe("contract_only");
  });

  test("deployment and release drift invalidate the evidence", () => {
    expect(
      evaluateProductionPromotion({
        ...base,
        evidence: evidence.map((item, index) =>
          index === 0 ? { ...item, deploymentId: "deploy-b" } : item,
        ),
      }).controls[0]?.reason,
    ).toBe("deployment_mismatch");
    expect(
      evaluateProductionPromotion({
        ...base,
        evidence: evidence.map((item, index) =>
          index === 0 ? { ...item, releaseCommit: "deadbee" } : item,
        ),
      }).controls[0]?.reason,
    ).toBe("release_mismatch");
  });

  test("expired, future and malformed evidence fail closed", () => {
    expect(
      evaluateProductionPromotion({
        ...base,
        evidence: evidence.map((item, index) =>
          index === 0 ? { ...item, expiresAt: base.evaluatedAt } : item,
        ),
      }).controls[0]?.reason,
    ).toBe("expired");
    expect(
      evaluateProductionPromotion({
        ...base,
        evidence: evidence.map((item, index) =>
          index === 0
            ? {
                ...item,
                observedAt: "2026-06-21T00:00:00.000Z",
                expiresAt: "2026-06-22T00:00:00.000Z",
              }
            : item,
        ),
      }).controls[0]?.reason,
    ).toBe("not_yet_observed");
    expect(
      evaluateProductionPromotion({
        ...base,
        evidence: evidence.map((item, index) =>
          index === 0 ? { ...item, digest: "not-a-digest" } : item,
        ),
      }).controls[0]?.reason,
    ).toBe("invalid_digest");
  });

  test("duplicate evidence blocks ambiguity", () => {
    expect(
      evaluateProductionPromotion({ ...base, evidence: [...evidence, evidence[0]!] }).controls[0]
        ?.reason,
    ).toBe("duplicate");
  });
});
