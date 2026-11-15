import { getFactorContentById } from "@/domain/ivo/factor-content";
import { getFactorLearningActivity } from "@/domain/ivo/factor-learning-activities";
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
export async function createLearningApplication(
  input: LearningApplicationRequest,
  deps: PlanCompositionDeps = {},
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  const content = getFactorContentById(input.contentId);
  const visible =
    content &&
    (content.status === "APROVADO" ||
      (content.status === "TESTE" &&
        (deps.testContent ?? isDisposableLocalRuntime(process.env as GovernanceGateEnv))));
  if (!visible || !content || content.factorId !== input.factorId)
    return {
      ok: true,
      accepted: false,
      reason: "content_not_available",
      message: "Conteúdo indisponível para esta aplicação. Atualize a jornada.",
    };
  const activity = getFactorLearningActivity(content.id, content.version);
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
  return addFibtActionToPlan(
    { ...application, description: `Atividade ${activity.version}. ${application.description}` },
    deps,
    { id: content.id, version: content.version },
  );
}
