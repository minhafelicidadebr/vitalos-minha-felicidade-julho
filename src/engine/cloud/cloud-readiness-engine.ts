export interface CloudReadinessInput {
  identityContractKnown: boolean;
  persistenceContractVerified: boolean;
  isolationOracleVerified: boolean;
  consentContractVerified: boolean;
  pipelineContractVerified: boolean;
  signedSessionActive: boolean;
  persistenceAdapterAvailable: boolean;
  rlsDeployed: boolean;
  durableConsentLedger: boolean;
  productionAttestationVerified: boolean;
}

export type CloudReadinessLayer = "foundation" | "runtime";

export interface CloudReadinessControl {
  id: string;
  layer: CloudReadinessLayer;
  label: string;
  passed: boolean;
  evidence: string;
  order: number;
}

export interface CloudReadinessSummary {
  passed: number;
  total: number;
}

export interface CloudReadinessResult {
  status: "ready" | "blocked";
  productionClaimsAllowed: boolean;
  foundation: CloudReadinessSummary;
  runtime: CloudReadinessSummary;
  controls: CloudReadinessControl[];
  blockers: CloudReadinessControl[];
  nextControlId: string | null;
}

function control(
  id: string,
  layer: CloudReadinessLayer,
  label: string,
  passed: boolean,
  evidence: string,
  order: number,
): CloudReadinessControl {
  return { id, layer, label, passed, evidence, order };
}

/**
 * Composes existing proofs into a fail-closed promotion gate. It does not
 * provision infrastructure or infer readiness from environment flags.
 */
export function evaluateCloudReadiness(input: CloudReadinessInput): CloudReadinessResult {
  const controls: CloudReadinessControl[] = [
    control(
      "foundation.identity_boundary",
      "foundation",
      "Fronteira de identidade especificada",
      input.identityContractKnown,
      "Identidade, tenant, grants, domínio e escopo possuem contrato fail-closed.",
      1,
    ),
    control(
      "foundation.persistence_protocol",
      "foundation",
      "Protocolo transacional verificado",
      input.persistenceContractVerified,
      "Idempotência, conflito, rollback e recibo pós-commit foram provados.",
      2,
    ),
    control(
      "foundation.isolation_oracle",
      "foundation",
      "Oracle adversarial verificado",
      input.isolationOracleVerified,
      "Ataques sintéticos de tenant, escopo, domínio e escrita foram executados.",
      3,
    ),
    control(
      "foundation.consent_ledger",
      "foundation",
      "Consent Ledger especificado",
      input.consentContractVerified,
      "Finalidade, versão, revisão, revogação e concorrência possuem contrato.",
      4,
    ),
    control(
      "foundation.pipeline_attestation",
      "foundation",
      "Pipeline demonstrativo atestado",
      input.pipelineContractVerified,
      "Captura, agregação e índice têm manifesto público sanitizado.",
      5,
    ),
    control(
      "runtime.signed_session",
      "runtime",
      "Sessão assinada e tenant resolvido",
      input.signedSessionActive,
      "Lovable Cloud deve resolver sujeito e membership somente no servidor.",
      10,
    ),
    control(
      "runtime.persistence_adapter",
      "runtime",
      "Adapter transacional conectado",
      input.persistenceAdapterAvailable,
      "Respostas e consentimentos exigem commit real e receipts confirmados.",
      20,
    ),
    control(
      "runtime.rls",
      "runtime",
      "RLS implantada e atacada",
      input.rlsDeployed,
      "Policies devem passar o oracle contra ao menos dois tenants reais.",
      30,
    ),
    control(
      "runtime.consent_durable",
      "runtime",
      "Consent Ledger durável",
      input.durableConsentLedger,
      "Eventos precisam de tenant, timestamp confiável, retenção e audit log.",
      40,
    ),
    control(
      "runtime.production_attestation",
      "runtime",
      "Atestação de produção verificada",
      input.productionAttestationVerified,
      "O nível production_runtime só nasce após todos os controles anteriores.",
      50,
    ),
  ];

  const foundationControls = controls.filter((item) => item.layer === "foundation");
  const runtimeControls = controls.filter((item) => item.layer === "runtime");
  const blockers = controls.filter((item) => !item.passed).sort((a, b) => a.order - b.order);
  const ready = blockers.length === 0;

  return {
    status: ready ? "ready" : "blocked",
    productionClaimsAllowed: ready,
    foundation: {
      passed: foundationControls.filter((item) => item.passed).length,
      total: foundationControls.length,
    },
    runtime: {
      passed: runtimeControls.filter((item) => item.passed).length,
      total: runtimeControls.length,
    },
    controls,
    blockers,
    nextControlId: blockers[0]?.id ?? null,
  };
}
