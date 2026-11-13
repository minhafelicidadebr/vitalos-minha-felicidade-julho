// Estado de navegação; autorização continua no servidor e no RLS.
export interface RealOrgSession {
  userId: string;
  orgId: string;
  orgName: string;
  orgPlan: string;
  orgPackId: string;
  role: string;
  displayName: string | null;
}
export type OrgSessionStatus = "loading" | "anonymous" | "unlinked" | "unavailable" | "ready";
export interface OrgSessionState { loading: boolean; status: OrgSessionStatus; org: RealOrgSession | null }
export const ORG_LOADING: OrgSessionState = { loading: true, status: "loading", org: null };
export const ORG_ANONYMOUS: OrgSessionState = { loading: false, status: "anonymous", org: null };
interface ReadResult<T> { data: T | null; error: unknown }
export interface OrgSessionReader {
  userId(): Promise<string | null>;
  profile(id: string): Promise<ReadResult<{ org_id: string | null; role: string; display_name: string | null }>>;
  organization(id: string): Promise<ReadResult<{ name: string; plan: string; pack_id: string }>>;
}
export async function resolveOrgSession(reader: OrgSessionReader): Promise<OrgSessionState> {
  const unavailable: OrgSessionState = { loading: false, status: "unavailable", org: null };
  try {
    const userId = await reader.userId();
    if (!userId) return ORG_ANONYMOUS;
    const profile = await reader.profile(userId);
    if (profile.error) return unavailable;
    if (!profile.data?.org_id) return { loading: false, status: "unlinked", org: null };
    const organization = await reader.organization(profile.data.org_id);
    if (organization.error || !organization.data) return unavailable;
    return { loading: false, status: "ready", org: {
      userId, orgId: profile.data.org_id, role: profile.data.role, displayName: profile.data.display_name,
      orgName: organization.data.name, orgPlan: organization.data.plan, orgPackId: organization.data.pack_id,
    } };
  } catch { return unavailable; }
}
// A consulta começa fora do callback síncrono de onAuthStateChange. Respostas
// antigas não podem restaurar a organização de uma sessão anterior.
export function observeOrgSession(resolve: () => Promise<OrgSessionState>, publish: (s: OrgSessionState) => void) {
  let revision = 0;
  let active = true;
  return {
    async refresh() {
      const current = ++revision;
      if (!active) return;
      publish(ORG_LOADING);
      const state = await Promise.resolve().then(resolve);
      if (active && current === revision) publish(state);
    },
    dispose() { active = false; revision++; },
  };
}
export function institutionalEntry(status: OrgSessionStatus, path: string): "loading" | "notice" | "demo" | "app" {
  if (status === "loading") return "loading";
  if (status === "unavailable") return "notice";
  if (status === "anonymous") return "demo";
  const setup = ["/plataforma", "/ativar", "/aceitar-convite"].some((p) => path === p || path.startsWith(p + "/"));
  return status === "unlinked" && !setup ? "notice" : "app";
}
