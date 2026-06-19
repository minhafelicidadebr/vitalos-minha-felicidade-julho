import {
  evaluateProductionPromotion,
  REQUIRED_PRODUCTION_CONTROLS,
  type ProductionPromotionInput,
  type RuntimeEvidence,
} from "@/engine/cloud/production-promotion-engine";

export interface ProductionPromotionProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  promotionStatus: "blocked";
  promotionCertificateIssued: false;
  productionClaimsAllowed: false;
  passedControlCount: 0;
  controlCount: 5;
  controls: Array<{ id: string; label: string; reason: "missing"; passed: false }>;
  checks: Array<{ id: string; label: string; passed: boolean; note: string }>;
  passedCheckCount: number;
  checkCount: number;
  sensitivePayloadReturned: false;
}

const labels: Record<(typeof REQUIRED_PRODUCTION_CONTROLS)[number], string> = {
  signed_session: "Sessão assinada",
  persistence_adapter: "Adapter transacional",
  rls: "RLS implantada",
  consent_durable: "Consent Ledger durável",
  production_attestation: "Atestação production_runtime",
};

function validEvidence(): RuntimeEvidence[] {
  return REQUIRED_PRODUCTION_CONTROLS.map((controlId, index) => ({
    controlId,
    environment: "production",
    assurance: "runtime_verified",
    status: "verified",
    deploymentId: "fixture-deployment",
    releaseCommit: "abcdef1",
    observedAt: `2026-06-19T20:0${index}:00.000Z`,
    expiresAt: "2026-06-20T20:00:00.000Z",
    digest: String(index + 1).repeat(64),
  }));
}

function input(evidence: RuntimeEvidence[]): ProductionPromotionInput {
  return {
    deploymentId: "fixture-deployment",
    releaseCommit: "abcdef1",
    evaluatedAt: "2026-06-19T21:00:00.000Z",
    evidence,
  };
}

export function buildProductionPromotionProof(
  generatedAt = new Date().toISOString(),
): ProductionPromotionProof {
  const valid = validEvidence();
  const allGreen = evaluateProductionPromotion(input(valid));
  const missing = evaluateProductionPromotion(input(valid.slice(1)));
  const demo = evaluateProductionPromotion(
    input(valid.map((item, index) => (index === 0 ? { ...item, environment: "demo" } : item))),
  );
  const drift = evaluateProductionPromotion(
    input(
      valid.map((item, index) => (index === 0 ? { ...item, deploymentId: "fixture-other" } : item)),
    ),
  );
  const expired = evaluateProductionPromotion(
    input(
      valid.map((item, index) =>
        index === 0 ? { ...item, expiresAt: "2026-06-19T21:00:00.000Z" } : item,
      ),
    ),
  );
  const duplicate = evaluateProductionPromotion(input([...valid, valid[0]!]));
  const current = evaluateProductionPromotion({
    deploymentId: "not-provisioned",
    releaseCommit: "0000000",
    evaluatedAt: generatedAt,
    evidence: [],
  });

  const checks = [
    {
      id: "all_green_certificate",
      label: "Cinco evidências reais emitem um draft",
      passed: allGreen.productionClaimsAllowed && allGreen.certificate !== null,
      note: "O caminho feliz existe e exige 5/5.",
    },
    {
      id: "missing_blocks",
      label: "Um controle ausente bloqueia tudo",
      passed: !missing.productionClaimsAllowed && missing.certificate === null,
      note: "Não existe promoção parcial.",
    },
    {
      id: "demo_rejected",
      label: "Evidência demo é recusada",
      passed: demo.controls[0]?.reason === "demo_evidence",
      note: "Contrato ou mock não recebem peso de runtime.",
    },
    {
      id: "deployment_bound",
      label: "Evidência pertence ao mesmo deployment",
      passed: drift.controls[0]?.reason === "deployment_mismatch",
      note: "Prova de outro ambiente não pode ser reciclada.",
    },
    {
      id: "freshness_required",
      label: "Evidência vencida é recusada",
      passed: expired.controls[0]?.reason === "expired",
      note: "Promoção depende de observação fresca.",
    },
    {
      id: "duplicates_rejected",
      label: "Evidência duplicada é ambígua",
      passed: duplicate.controls[0]?.reason === "duplicate",
      note: "Cada controle possui exatamente uma prova.",
    },
    {
      id: "current_runtime_blocked",
      label: "Runtime atual não recebe certificado",
      passed: current.status === "blocked" && current.certificate === null,
      note: "Lovable Cloud ainda não foi provisionado.",
    },
  ];
  const passedCheckCount = checks.filter((item) => item.passed).length;

  return {
    generatedAt,
    status: passedCheckCount === checks.length ? "contract_verified" : "contract_failed",
    promotionStatus: "blocked",
    promotionCertificateIssued: false,
    productionClaimsAllowed: false,
    passedControlCount: 0,
    controlCount: 5,
    controls: REQUIRED_PRODUCTION_CONTROLS.map((id) => ({
      id,
      label: labels[id],
      reason: "missing",
      passed: false,
    })),
    checks,
    passedCheckCount,
    checkCount: checks.length,
    sensitivePayloadReturned: false,
  };
}
