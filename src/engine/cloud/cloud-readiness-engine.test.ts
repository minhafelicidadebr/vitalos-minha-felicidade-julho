import { describe, expect, test } from "bun:test";
import { evaluateCloudReadiness, type CloudReadinessInput } from "./cloud-readiness-engine";

function input(overrides: Partial<CloudReadinessInput> = {}): CloudReadinessInput {
  return {
    identityContractKnown: true,
    persistenceContractVerified: true,
    isolationOracleVerified: true,
    consentContractVerified: true,
    pipelineContractVerified: true,
    signedSessionActive: false,
    persistenceAdapterAvailable: false,
    rlsDeployed: false,
    durableConsentLedger: false,
    productionAttestationVerified: false,
    ...overrides,
  };
}

describe("cloud readiness engine", () => {
  test("keeps production blocked when contracts are green but runtime is absent", () => {
    const result = evaluateCloudReadiness(input());

    expect(result).toMatchObject({
      status: "blocked",
      productionClaimsAllowed: false,
      foundation: { passed: 5, total: 5 },
      runtime: { passed: 0, total: 5 },
      nextControlId: "runtime.signed_session",
    });
    expect(result.blockers).toHaveLength(5);
  });

  test("orders blockers by the safe cutover sequence", () => {
    const result = evaluateCloudReadiness(
      input({ signedSessionActive: true, persistenceAdapterAvailable: true }),
    );

    expect(result.blockers.map((item) => item.id)).toEqual([
      "runtime.rls",
      "runtime.consent_durable",
      "runtime.production_attestation",
    ]);
  });

  test("a missing foundation blocks before runtime work", () => {
    const result = evaluateCloudReadiness(input({ identityContractKnown: false }));

    expect(result.nextControlId).toBe("foundation.identity_boundary");
    expect(result.foundation.passed).toBe(4);
  });

  test("only a fully verified runtime may enable production claims", () => {
    const result = evaluateCloudReadiness(
      input({
        signedSessionActive: true,
        persistenceAdapterAvailable: true,
        rlsDeployed: true,
        durableConsentLedger: true,
        productionAttestationVerified: true,
      }),
    );

    expect(result).toMatchObject({
      status: "ready",
      productionClaimsAllowed: true,
      runtime: { passed: 5, total: 5 },
      nextControlId: null,
    });
  });
});
