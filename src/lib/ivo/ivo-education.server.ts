// R7 — catálogo curatorial fator FIB-T → conteúdo educativo. Server-only.
//
// Mostra apenas o que a curadoria permite:
//   · APROVADO (responsável, data, evidência, safe_claim) — nenhum hoje;
//   · TESTE identificado — somente em runtime local descartável;
//   · PROPOSTO nunca é mostrado como recomendação.
// O vínculo educativo NÃO cria mapeamento dimensional e NÃO altera escore.
// Conteúdo mock da Academia não é usado aqui como recomendação real.
import { authorizeLedger, type FibtActionLoopDeps } from "./fibt-action-loop.server";
import { isDisposableLocalRuntime, type GovernanceGateEnv } from "./ivo-governance-gate.server";
import { getFactorContentCatalog, getFactorContentMeta } from "@/domain/ivo/factor-content";
import type { EducationContentView, LoadEducationOutcome } from "./ivo-views";

export async function loadEducationForSession(input: { accessToken?: string }, deps: FibtActionLoopDeps = {}): Promise<LoadEducationOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  const testVisible = deps.testContent ?? isDisposableLocalRuntime(process.env as GovernanceGateEnv);
  const visible = getFactorContentCatalog().filter((c) => c.status === "APROVADO" || (c.status === "TESTE" && testVisible));
  const byFactor: Record<string, EducationContentView[]> = {};
  for (const c of visible) {
    (byFactor[c.factorId] ??= []).push({
      contentId: c.id,
      factorId: c.factorId,
      status: c.status as "APROVADO" | "TESTE",
      version: c.version,
      title: c.title,
      objective: c.objective,
      audience: c.audience,
      format: c.format,
      estimatedMinutes: c.estimatedMinutes,
      body: [...c.body],
      evidenceCodes: [...c.evidenceCodes],
      safeClaimIds: [...c.safeClaimIds],
    });
  }
  const meta = getFactorContentMeta();
  return {
    ok: true,
    catalog: {
      curationStatus: meta.curationStatus,
      curationDecision: meta.curationDecision,
      approvedCount: getFactorContentCatalog().filter((c) => c.status === "APROVADO").length,
      testVisible,
    },
    byFactor,
  };
}
