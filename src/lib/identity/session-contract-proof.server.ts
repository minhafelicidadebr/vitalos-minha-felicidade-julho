import {
  resolveTrustedSession,
  type ResolveTrustedSessionInput,
  type SessionTrustReason,
} from "@/engine/identity/session-contract-engine";

export interface SessionContractCaseProof {
  id: string;
  label: string;
  category: "adapter" | "claims" | "time" | "membership" | "tenant";
  expectedReason: SessionTrustReason;
  actualReason: SessionTrustReason;
  passed: boolean;
}

export interface SignedSessionContractProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  runtime: "adapter_missing";
  signedSessionActive: false;
  productionClaimsAllowed: false;
  passedCaseCount: number;
  caseCount: number;
  cases: SessionContractCaseProof[];
  invariants: {
    rawTokenAccepted: false;
    clientPersonaTrusted: false;
    tenantDerivedFromMembership: true;
    explicitTenantSelectionForMultipleMemberships: true;
    temporalValidationRequired: true;
    suspendedMembershipDenied: true;
    ambiguousMembershipDenied: true;
    sensitivePayloadReturned: false;
  };
}

const base: ResolveTrustedSessionInput = {
  claims: {
    adapter: "lovable-cloud",
    verificationPerformed: true,
    signatureVerified: true,
    issuer: "https://identity.vitalos.invalid",
    audience: "vitalos-app",
    subjectId: "fixture-subject-a",
    sessionId: "fixture-session-a",
    authMethod: "magic_link",
    issuedAt: "2026-06-19T12:00:00.000Z",
    expiresAt: "2026-06-19T14:00:00.000Z",
  },
  memberships: [
    {
      subjectId: "fixture-subject-a",
      tenantId: "fixture-tenant-a",
      organizationId: "fixture-org-a",
      roleIds: ["participant"],
      status: "active",
      validFrom: "2026-01-01T00:00:00.000Z",
    },
  ],
  requestedTenantId: "fixture-tenant-a",
  policy: {
    expectedAdapter: "lovable-cloud",
    expectedIssuer: "https://identity.vitalos.invalid",
    expectedAudience: "vitalos-app",
    evaluatedAt: "2026-06-19T13:00:00.000Z",
    maxSessionAgeSeconds: 7_200,
  },
};

interface ContractScenario {
  id: string;
  label: string;
  category: SessionContractCaseProof["category"];
  expectedReason: SessionTrustReason;
  input: ResolveTrustedSessionInput;
}

function input(overrides: Partial<ResolveTrustedSessionInput>): ResolveTrustedSessionInput {
  return {
    ...base,
    ...overrides,
    claims: { ...base.claims, ...overrides.claims },
    policy: { ...base.policy, ...overrides.policy },
  };
}

function scenarios(): ContractScenario[] {
  return [
    {
      id: "verified-session",
      label: "Claims verificados + membership ativa resolvem o tenant",
      category: "adapter",
      expectedReason: "trusted",
      input: base,
    },
    {
      id: "wrong-adapter",
      label: "Fonte não configurada não atravessa a fronteira",
      category: "adapter",
      expectedReason: "adapter_mismatch",
      input: input({ claims: { ...base.claims, adapter: "browser-cookie" } }),
    },
    {
      id: "verification-missing",
      label: "Claims sem verificação server-side são recusados",
      category: "adapter",
      expectedReason: "verification_missing",
      input: input({ claims: { ...base.claims, verificationPerformed: false } }),
    },
    {
      id: "invalid-signature",
      label: "Assinatura inválida encerra a decisão",
      category: "adapter",
      expectedReason: "signature_invalid",
      input: input({ claims: { ...base.claims, signatureVerified: false } }),
    },
    {
      id: "wrong-issuer",
      label: "Issuer divergente não recebe confiança",
      category: "claims",
      expectedReason: "issuer_mismatch",
      input: input({ claims: { ...base.claims, issuer: "https://untrusted.invalid" } }),
    },
    {
      id: "wrong-audience",
      label: "Audience de outro sistema é recusada",
      category: "claims",
      expectedReason: "audience_mismatch",
      input: input({ claims: { ...base.claims, audience: "another-app" } }),
    },
    {
      id: "expired-session",
      label: "Sessão expirada não resolve identidade",
      category: "time",
      expectedReason: "session_expired",
      input: input({ claims: { ...base.claims, expiresAt: "2026-06-19T13:00:00.000Z" } }),
    },
    {
      id: "stale-session",
      label: "Sessão além da idade máxima exige nova autenticação",
      category: "time",
      expectedReason: "session_too_old",
      input: input({
        claims: { ...base.claims, issuedAt: "2026-06-19T10:00:00.000Z" },
        policy: { ...base.policy, maxSessionAgeSeconds: 3_000 },
      }),
    },
    {
      id: "tenant-not-member",
      label: "Tenant solicitado sem membership é negado",
      category: "tenant",
      expectedReason: "membership_missing",
      input: input({ requestedTenantId: "fixture-tenant-b" }),
    },
    {
      id: "suspended-membership",
      label: "Membership suspensa não emite contexto confiável",
      category: "membership",
      expectedReason: "membership_inactive",
      input: input({
        memberships: [{ ...base.memberships[0]!, status: "suspended" }],
      }),
    },
    {
      id: "tenant-choice-required",
      label: "Duas memberships exigem seleção explícita",
      category: "tenant",
      expectedReason: "tenant_selection_required",
      input: input({
        requestedTenantId: undefined,
        memberships: [
          base.memberships[0]!,
          {
            ...base.memberships[0]!,
            tenantId: "fixture-tenant-b",
            organizationId: "fixture-org-b",
          },
        ],
      }),
    },
    {
      id: "ambiguous-membership",
      label: "Tenant ligado a organizações divergentes falha fechado",
      category: "membership",
      expectedReason: "membership_ambiguous",
      input: input({
        memberships: [
          base.memberships[0]!,
          { ...base.memberships[0]!, organizationId: "fixture-org-shadow" },
        ],
      }),
    },
  ];
}

export function buildSignedSessionContractProof(
  generatedAt = new Date().toISOString(),
): SignedSessionContractProof {
  const cases = scenarios().map((scenario): SessionContractCaseProof => {
    const decision = resolveTrustedSession(scenario.input);
    return {
      id: scenario.id,
      label: scenario.label,
      category: scenario.category,
      expectedReason: scenario.expectedReason,
      actualReason: decision.reason,
      passed: decision.reason === scenario.expectedReason,
    };
  });
  const passedCaseCount = cases.filter((item) => item.passed).length;

  return {
    generatedAt,
    status: passedCaseCount === cases.length ? "contract_verified" : "contract_failed",
    runtime: "adapter_missing",
    signedSessionActive: false,
    productionClaimsAllowed: false,
    passedCaseCount,
    caseCount: cases.length,
    cases,
    invariants: {
      rawTokenAccepted: false,
      clientPersonaTrusted: false,
      tenantDerivedFromMembership: true,
      explicitTenantSelectionForMultipleMemberships: true,
      temporalValidationRequired: true,
      suspendedMembershipDenied: true,
      ambiguousMembershipDenied: true,
      sensitivePayloadReturned: false,
    },
  };
}
