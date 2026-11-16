import { getFactorContentCatalog } from "@/domain/ivo/factor-content";
import { getAvailableFactorLearningActivity } from "@/domain/ivo/factor-learning-activities";
import type { EducationDeps } from "./ivo-education.server";
import { authorizeLedger } from "./fibt-action-loop.server";
import {
  addFibtActionToPlan,
  type AddActionToPlanRequest,
  type PlanCompositionDeps,
} from "./fibt-plan-composition.server";
import { isDisposableLocalRuntime, type GovernanceGateEnv } from "./ivo-governance-gate.server";
import type { LedgerWriteOutcome } from "./ivo-views";
export type LearningApplicationRequest = AddActionToPlanRequest & {
  contentId: string;
  contentVersion: string;
  activityVersion: string;
};
export type LearningApplicationDeps = PlanCompositionDeps & Pick<EducationDeps, "contentCatalog" | "activityCatalog">;
export async function createLearningApplication(
  input: LearningApplicationRequest,
  deps: LearningApplicationDeps = {},
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  const content = (deps.contentCatalog ?? getFactorContentCatalog)().find((c) => c.id === input.contentId);
  const testVisible = deps.testContent ?? isDisposableLocalRuntime(process.env as GovernanceGateEnv);
  const visible =
    content &&
    (content.status === "APROVADO" ||
      (content.status === "TESTE" && testVisible));
  if (!visible || !content || content.factorId !== input.factorId)
    return {
      ok: true,
      accepted: false,
      reason: "content_not_available",
      message: "Conteúdo indisponível para esta aplicação. Atualize a jornada.",
    };
  const activity = getAvailableFactorLearningActivity(content, testVisible, deps.activityCatalog);
  if (
    content.version !== input.contentVersion ||
    !activity ||
    activity.version !== input.activityVersion
  )
    return {
      ok: true,
      accepted: false,
      reason: "content_version_changed",
      message:
        "A versão da atividade mudou ou não está disponível. Atualize e revise antes de confirmar.",
    };
  const {
    contentId: _contentId,
    contentVersion: _contentVersion,
    activityVersion: _activityVersion,
    ...application
  } = input;
  // Sem respostas/nota/atestado de conclusão. Só a aplicação confirmada pelo gestor.
  // TESTE mantém a descrição histórica para não invalidar retries anteriores.
  const activityRef = activity.status === "APROVADO" ? `Referência da atividade: ${activity.id}. ` : "";
  return addFibtActionToPlan(
    { ...application, description: `Atividade ${activity.version}. ${activityRef}${application.description}` },
    deps,
    { id: content.id, version: content.version },
  );
}
