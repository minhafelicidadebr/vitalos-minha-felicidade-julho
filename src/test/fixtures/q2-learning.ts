// SOMENTE testes: simula decisões e um claim com escopo educativo. Não registra aprovação real.
import rawContent from "@/domain/ivo/factor-content.json";
import rawActivity from "@/domain/ivo/q2-learning-activity-001.json";
import { validateFactorContent } from "@/domain/ivo/factor-content";
import {
  validateFactorLearningActivities,
  type FactorLearningActivity,
} from "@/domain/ivo/factor-learning-activities";
import { Q2_LEARNING_REGISTRIES } from "@/domain/ivo/q2-learning-curation";
import type { GovernanceGateEnv } from "@/lib/ivo/ivo-governance-gate.server";

export const LOCAL_Q2_EDUCATION_ENV: GovernanceGateEnv = {
  VITALOS_RUNTIME_ENV: "local",
  VITALOS_DB_TARGET: "local",
  SUPABASE_URL: "http://127.0.0.1:57621",
  VITE_SUPABASE_URL: "http://127.0.0.1:57621",
};

export function proposedQ2Fixture() {
  const raw = structuredClone(rawContent) as Parameters<typeof validateFactorContent>[0];
  const unit = raw.entries.find((entry) => entry.id === rawActivity.contentId)!;
  const activity = structuredClone(rawActivity) as FactorLearningActivity;
  unit.status = activity.status = "PROPOSTO";
  unit.owner = unit.approved_at = null;
  unit.curation!.approval = activity.curation!.approval = null;
  unit.safe_claim_ids = activity.safeClaimIds = ["CLAIM-EDMONDSON1999-VOICE-001"];
  return { raw, unit, activity };
}

export function approvedQ2Fixture() {
  const registries = structuredClone(Q2_LEARNING_REGISTRIES);
  registries.claims.version = "1.2.0-fixture";
  const claim = structuredClone(
    registries.claims.claims.find((c) => c.claim_id === rawActivity.safeClaimIds[0])!,
  );
  claim.claim_id = "SINTETICO-CLAIM-Q2-001";
  claim.target_context = "q2-educacao";
  registries.claims.claims.push(claim);
  const raw = structuredClone(rawContent) as Parameters<typeof validateFactorContent>[0];
  const unit = raw.entries.find((entry) => entry.id === rawActivity.contentId)!;
  const activity = structuredClone(rawActivity) as FactorLearningActivity;
  unit.status = activity.status = "APROVADO";
  unit.safe_claim_ids = [claim.claim_id];
  activity.safeClaimIds = [claim.claim_id];
  const approval = {
    version: "0.1.0",
    responsible: "Papel responsável SINTÉTICO",
    reviewer: "Papel revisor SINTÉTICO",
    approvedOn: "2026-11-15",
    decisionRef: "SINTETICO-D10-SEM-VALOR-METODOLOGICO",
    scope: "local_descartavel" as const,
  };
  for (const curation of [unit.curation!, activity.curation!]) {
    curation.claimRegistryVersion = registries.claims.version;
    curation.approval = { ...approval };
  }
  unit.owner = approval.responsible;
  unit.approved_at = approval.approvedOn;
  const contents = validateFactorContent(raw, registries);
  const activities = validateFactorLearningActivities([activity], contents, registries);
  return {
    registries,
    raw,
    activity,
    contents,
    activities,
    unit: contents.find((c) => c.id === unit.id)!,
  };
}
