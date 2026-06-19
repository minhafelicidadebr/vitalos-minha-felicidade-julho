import { describe, expect, test } from "bun:test";
import { buildProductionPromotionProof } from "./production-promotion-proof.server";

describe("production promotion proof", () => {
  test("verifies the validator while current production remains blocked", () => {
    expect(buildProductionPromotionProof("2026-06-19T23:30:00.000Z")).toMatchObject({
      status: "contract_verified",
      promotionStatus: "blocked",
      promotionCertificateIssued: false,
      productionClaimsAllowed: false,
      passedControlCount: 0,
      controlCount: 5,
      passedCheckCount: 7,
      checkCount: 7,
      sensitivePayloadReturned: false,
    });
  });

  test("reports every runtime control as missing", () => {
    const proof = buildProductionPromotionProof();
    expect(proof.controls).toHaveLength(5);
    expect(proof.controls.every((item) => !item.passed && item.reason === "missing")).toBe(true);
  });

  test("public proof strips synthetic deployment and evidence digests", () => {
    const serialized = JSON.stringify(buildProductionPromotionProof());
    expect(serialized).not.toContain("fixture-deployment");
    expect(serialized).not.toContain("abcdef1");
    expect(serialized).not.toContain("1111111111");
  });
});
