export interface TrustChainAttestationInput {
  sessionContractVerified: boolean;
  rawTokenAccepted: boolean;
  clientPersonaTrusted: boolean;
  grantContractVerified: boolean;
  atomicGrantBatch: boolean;
  leastPrivilege: boolean;
  tenantBoundGrants: boolean;
  rlsParityVerified: boolean;
  rlsDefaultDeny: boolean;
  rawResponseReadDenied: boolean;
  isolationOracleVerified: boolean;
  sensitivePayloadReturned: boolean;
  signedSessionActive: boolean;
  grantsServerIssued: boolean;
  rlsDeployed: boolean;
}

export interface TrustChainCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface TrustChainRuntimeBlocker {
  id: "signed_session" | "server_grants" | "rls_deployment";
  label: string;
}

export interface TrustChainAttestationResult {
  status: "verified" | "failed";
  assuranceLevel: "cutover_blueprint";
  productionClaimsAllowed: boolean;
  passedCheckCount: number;
  checkCount: number;
  checks: TrustChainCheck[];
  runtime: {
    passed: number;
    total: 3;
    blockers: TrustChainRuntimeBlocker[];
  };
}

function check(id: string, label: string, passed: boolean): TrustChainCheck {
  return { id, label, passed };
}

/**
 * Composes independent identity and isolation proofs into one promotion
 * artifact. Contract checks and runtime activation remain separate by design.
 */
export function attestIdentityTrustChain(
  input: TrustChainAttestationInput,
): TrustChainAttestationResult {
  const checks = [
    check(
      "session.contract_verified",
      "Contrato de sessão assinado foi verificado",
      input.sessionContractVerified,
    ),
    check("session.no_raw_token", "Token bruto nunca integra a prova", !input.rawTokenAccepted),
    check(
      "session.no_client_persona",
      "Persona do cliente não recebe confiança",
      !input.clientPersonaTrusted,
    ),
    check(
      "grants.contract_verified",
      "Emissão de grants possui contrato verificado",
      input.grantContractVerified,
    ),
    check("grants.atomic_batch", "Lote de grants é atômico", input.atomicGrantBatch),
    check("grants.least_privilege", "Least privilege é obrigatório", input.leastPrivilege),
    check("grants.tenant_bound", "Grants permanecem vinculados ao tenant", input.tenantBoundGrants),
    check("rls.parity_verified", "Aplicação e manifesto RLS têm paridade", input.rlsParityVerified),
    check("rls.default_deny", "Manifesto RLS nega por padrão", input.rlsDefaultDeny),
    check(
      "privacy.raw_response_denied",
      "Leitura de resposta individual é negada",
      input.rawResponseReadDenied,
    ),
    check(
      "isolation.oracle_verified",
      "Oracle adversarial de isolamento foi verificado",
      input.isolationOracleVerified,
    ),
    check(
      "privacy.no_sensitive_payload",
      "A prova pública não retorna payload sensível",
      !input.sensitivePayloadReturned,
    ),
  ];

  const blockers: TrustChainRuntimeBlocker[] = [
    ...(!input.signedSessionActive
      ? [{ id: "signed_session", label: "Sessão assinada ativa" } as const]
      : []),
    ...(!input.grantsServerIssued
      ? [{ id: "server_grants", label: "Grants emitidos no servidor" } as const]
      : []),
    ...(!input.rlsDeployed
      ? [{ id: "rls_deployment", label: "RLS implantada e atacada" } as const]
      : []),
  ];
  const passedCheckCount = checks.filter((item) => item.passed).length;
  const verified = passedCheckCount === checks.length;

  return {
    status: verified ? "verified" : "failed",
    assuranceLevel: "cutover_blueprint",
    productionClaimsAllowed: verified && blockers.length === 0,
    passedCheckCount,
    checkCount: checks.length,
    checks,
    runtime: {
      passed: 3 - blockers.length,
      total: 3,
      blockers,
    },
  };
}

export function canonicalizeTrustChainAttestation(result: TrustChainAttestationResult): string {
  return JSON.stringify({
    schema: "vitalos.identity-trust-chain.v1",
    assuranceLevel: result.assuranceLevel,
    productionClaimsAllowed: result.productionClaimsAllowed,
    checks: result.checks.map((item) => ({
      id: item.id,
      passed: item.passed,
    })),
    runtime: {
      passed: result.runtime.passed,
      total: result.runtime.total,
      blockerIds: result.runtime.blockers.map((item) => item.id),
    },
  });
}
