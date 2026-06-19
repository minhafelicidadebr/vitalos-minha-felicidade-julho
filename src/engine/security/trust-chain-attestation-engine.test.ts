import { describe, expect, test } from "bun:test";
import {
  attestIdentityTrustChain,
  canonicalizeTrustChainAttestation,
  type TrustChainAttestationInput,
} from "./trust-chain-attestation-engine";

const base: TrustChainAttestationInput = {
  sessionContractVerified: true,
  rawTokenAccepted: false,
  clientPersonaTrusted: false,
  grantContractVerified: true,
  atomicGrantBatch: true,
  leastPrivilege: true,
  tenantBoundGrants: true,
  rlsParityVerified: true,
  rlsDefaultDeny: true,
  rawResponseReadDenied: true,
  isolationOracleVerified: true,
  sensitivePayloadReturned: false,
  signedSessionActive: false,
  grantsServerIssued: false,
  rlsDeployed: false,
};

describe("identity trust-chain attestation", () => {
  test("verifies the blueprint while keeping production blocked", () => {
    expect(attestIdentityTrustChain(base)).toMatchObject({
      status: "verified",
      assuranceLevel: "cutover_blueprint",
      productionClaimsAllowed: false,
      passedCheckCount: 12,
      checkCount: 12,
      runtime: {
        passed: 0,
        total: 3,
        blockers: [{ id: "signed_session" }, { id: "server_grants" }, { id: "rls_deployment" }],
      },
    });
  });

  test("one failed contract check invalidates the attestation", () => {
    const result = attestIdentityTrustChain({ ...base, rawResponseReadDenied: false });
    expect(result.status).toBe("failed");
    expect(result.passedCheckCount).toBe(11);
    expect(result.productionClaimsAllowed).toBe(false);
  });

  test("production claims require both verified contract and all runtime controls", () => {
    expect(
      attestIdentityTrustChain({
        ...base,
        signedSessionActive: true,
        grantsServerIssued: true,
        rlsDeployed: true,
      }),
    ).toMatchObject({
      status: "verified",
      productionClaimsAllowed: true,
      runtime: { passed: 3, total: 3, blockers: [] },
    });
  });

  test("canonical payload is deterministic and excludes labels", () => {
    const result = attestIdentityTrustChain(base);
    const canonical = canonicalizeTrustChainAttestation(result);
    expect(canonical).toBe(canonicalizeTrustChainAttestation(result));
    expect(canonical).toContain("vitalos.identity-trust-chain.v1");
    expect(canonical).not.toContain("Token bruto");
  });
});
