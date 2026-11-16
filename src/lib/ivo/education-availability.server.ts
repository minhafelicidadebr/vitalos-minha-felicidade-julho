// Uma aprovação editorial local não concede disponibilidade em staging/produção.
import type { FactorContent } from "@/domain/ivo/factor-content";
import { isDisposableLocalRuntime, type GovernanceGateEnv } from "./ivo-governance-gate.server";

export interface EducationRuntimeDeps {
  testContent?: boolean;
  /** Injeção interna para testes; nunca recebida no payload das funções públicas. */
  educationEnv?: GovernanceGateEnv;
}

export function resolveEducationAvailability(deps: EducationRuntimeDeps = {}) {
  const local = isDisposableLocalRuntime(deps.educationEnv ?? (process.env as GovernanceGateEnv));
  return { local, testVisible: deps.testContent ?? local };
}

export function isEducationContentAvailable(
  content: FactorContent | undefined,
  availability: ReturnType<typeof resolveEducationAvailability>,
): boolean {
  if (!content) return false;
  if (content.status === "TESTE") return availability.testVisible;
  return (
    content.status === "APROVADO" &&
    content.curation?.approval?.version === content.version &&
    content.curation.approval.scope === "local_descartavel" &&
    availability.local
  );
}
