import { verifyPlatformAdmin } from "@/lib/api/org-invite.server";
import { requireOrgAdmin } from "@/lib/auth/authorize.server";
import { MODULE_MESSAGES, type EnterpriseModule, type ModuleState } from "./module-contract";

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
}
export const moduleForInstrument = (instrument: string): EnterpriseModule | null =>
  instrument === "COPSOQ" ? "Q1" : instrument === "FIB_T" ? "Q2" : null;
export async function readModules(orgId: string): Promise<ModuleState[] | null> {
  try {
    const { data, error } = await (
      await db()
    )
      .from("org_module_entitlements")
      .select("module,enabled,revision,updated_at,updated_by")
      .eq("org_id", orgId);
    if (error || !data) return null;
    return (["Q1", "Q2"] as const).map(
      (module) =>
        data.find((r: ModuleState) => r.module === module) ?? {
          module,
          enabled: false,
          revision: 0,
        },
    );
  } catch {
    return null;
  }
}
export async function checkModule(orgId: string, module: EnterpriseModule, read = readModules) {
  const states = await read(orgId).catch(() => null);
  if (!states)
    return {
      ok: false as const,
      reason: "unavailable" as const,
      error: MODULE_MESSAGES.unavailable,
    };
  if (!states.find((r) => r.module === module)?.enabled)
    return { ok: false as const, reason: "disabled" as const, error: MODULE_MESSAGES.disabled };
  if (module === "Q1")
    return {
      ok: false as const,
      reason: "method_pending" as const,
      error: MODULE_MESSAGES.method_pending,
    };
  return { ok: true as const };
}
export async function checkInstrument(orgId: string, instrument: string) {
  const module = moduleForInstrument(instrument);
  if (!module) return { ok: true as const }; // Os gates anteriores de outras lentes continuam responsáveis.
  // Esta habilitação é empresarial. Os outros packs mantêm seus contratos.
  try {
    const organization = await (
      await db()
    )
      .from("organizations")
      .select("pack_id")
      .eq("id", orgId)
      .maybeSingle();
    if (organization.error || !organization.data)
      return {
        ok: false as const,
        reason: "unavailable" as const,
        error: MODULE_MESSAGES.unavailable,
      };
    if (organization.data.pack_id !== "enterprise") return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      reason: "unavailable" as const,
      error: MODULE_MESSAGES.unavailable,
    };
  }
  return checkModule(orgId, module);
}
export async function checkWave(orgId: string, waveId: string) {
  try {
    const { data, error } = await (
      await db()
    )
      .from("waves")
      .select("instrument")
      .eq("id", waveId)
      .eq("org_id", orgId)
      .maybeSingle();
    return error || !data
      ? {
          ok: false as const,
          reason: "unavailable" as const,
          error: "Onda indisponível nesta empresa.",
        }
      : checkInstrument(orgId, data.instrument);
  } catch {
    return {
      ok: false as const,
      reason: "unavailable" as const,
      error: MODULE_MESSAGES.unavailable,
    };
  }
}
export async function listPlatformModules(token: string) {
  try {
    if (!(await verifyPlatformAdmin(token)).authorized)
      return { ok: false as const, error: MODULE_MESSAGES.forbidden };
    const { data, error } = await (
      await db()
    )
      .from("organizations")
      .select("id,name,slug")
      .eq("pack_id", "enterprise")
      .order("name")
      .limit(200);
    if (error || !data) return { ok: false as const, error: MODULE_MESSAGES.unavailable };
    const organizations = await Promise.all(
      data.map(async (org: { id: string; name: string; slug: string }) => ({
        ...org,
        modules: await readModules(org.id),
      })),
    );
    return { ok: true as const, organizations };
  } catch {
    return { ok: false as const, error: MODULE_MESSAGES.unavailable };
  }
}
export async function changeModule(input: {
  accessToken: string;
  organizationId: string;
  module: EnterpriseModule;
  enabled: boolean;
  expectedRevision: number;
  requestId: string;
}) {
  try {
    const actor = await verifyPlatformAdmin(input.accessToken);
    if (!actor.authorized) return { ok: false as const, error: MODULE_MESSAGES.forbidden };
    const client = await db();
    const row = {
      actor_id: actor.userId,
      request_id: input.requestId,
      org_id: input.organizationId,
      module: input.module,
      enabled: input.enabled,
      expected_revision: input.expectedRevision,
    };
    const replay = (old: typeof row) =>
      Object.keys(row).every((k) => old[k as keyof typeof row] === row[k as keyof typeof row]);
    const previous = await client
      .from("org_module_changes")
      .select("*")
      .eq("actor_id", actor.userId)
      .eq("request_id", input.requestId)
      .maybeSingle();
    if (previous.error) return { ok: false as const, error: MODULE_MESSAGES.unavailable };
    if (previous.data)
      return replay(previous.data)
        ? { ok: true as const }
        : { ok: false as const, error: MODULE_MESSAGES.request_conflict };
    const result = await client.from("org_module_changes").insert(row);
    if (!result.error) return { ok: true as const };
    // Concorrência do mesmo request pode ter encontrado revisão já avançada.
    const concurrent = await client
      .from("org_module_changes")
      .select("*")
      .eq("actor_id", actor.userId)
      .eq("request_id", input.requestId)
      .maybeSingle();
    if (!concurrent.error && concurrent.data)
      return replay(concurrent.data)
        ? { ok: true as const }
        : { ok: false as const, error: MODULE_MESSAGES.request_conflict };
    return {
      ok: false as const,
      error: /revision_conflict/.test(result.error.message)
        ? MODULE_MESSAGES.revision_conflict
        : MODULE_MESSAGES.unavailable,
    };
  } catch {
    return { ok: false as const, error: MODULE_MESSAGES.unavailable };
  }
}
export async function institutionalModules(token: string) {
  const auth = await requireOrgAdmin(token);
  if (!auth.ok) return { ok: false as const, error: "Sessão ou vínculo administrativo inválido." };
  const modules = await readModules(auth.membership.orgId);
  return modules
    ? { ok: true as const, modules }
    : { ok: false as const, error: MODULE_MESSAGES.unavailable };
}
