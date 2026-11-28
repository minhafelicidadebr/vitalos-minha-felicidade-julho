// Papel que governa curadoria e recomendação. Não concede autorização:
// o servidor e o RLS continuam sendo a fronteira de acesso.
import { usePersona } from "./persona-store";
import { useRealOrgSession } from "./useRealOrgSession";
import { resolveRoleContext, type RoleContext } from "@/engine/rbac/rbac";

export function useEffectiveRole(): RoleContext {
  const { roleId: demoRoleId } = usePersona();
  const { status, org } = useRealOrgSession();
  return resolveRoleContext(status, org?.role, demoRoleId);
}
