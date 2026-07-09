// Server-only: compõe o Customer Health Score de cada conta a partir de
// CONTAGENS reais (S8 fatia 2, E4). Chamador já autorizado como admin da
// PLATAFORMA (verifyPlatformAdmin) antes de chegar aqui — esta é a visão de
// customer success do founder, nunca exposta a uma org cliente sobre outra.
//
// Privacidade: só COUNT de tabelas de operação — nenhum conteúdo de
// resposta, plano ou evidência sai daqui; nem nomes de membros. O único
// dado nominal é o nome da própria organização (dado de contrato).

import {
  computeCustomerHealth,
  type AccountSignals,
  type CustomerHealth,
} from "@/engine/growth/customer-health-engine";

export interface AccountHealthRow {
  orgId: string;
  orgName: string;
  packId: string;
  plan: string;
  health: CustomerHealth;
}

async function countWhere(
  admin: any,
  table: string,
  filters: (q: any) => any,
): Promise<number> {
  const { count } = await filters(
    admin.from(table).select("*", { count: "exact", head: true }),
  );
  return count ?? 0;
}

/** Saúde de todas as contas — founder/plataforma apenas. */
export async function listAccountHealth(): Promise<AccountHealthRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, pack_id, plan")
    .order("created_at", { ascending: true });

  const rows: AccountHealthRow[] = [];
  for (const org of (orgs ?? []) as Array<Record<string, unknown>>) {
    const orgId = String(org.id);

    // Membros da org — participation_events é por usuário (S5, sem org_id);
    // o vínculo é via profiles, a mesma fonte que o RBAC real usa.
    const { data: members } = await admin.from("profiles").select("id").eq("org_id", orgId);
    const memberIds = ((members ?? []) as Array<{ id: string }>).map((m) => m.id);

    const [
      wavesCreated,
      capsulesPublished,
      learningEvents,
      actionPlans,
      actionsWithOwner,
      evidenceRecords,
      cyclesRegistered,
    ] = await Promise.all([
      countWhere(admin, "waves", (q) => q.eq("org_id", orgId)),
      countWhere(admin, "wave_capsules", (q) => q.eq("org_id", orgId)),
      memberIds.length === 0
        ? Promise.resolve(0)
        : countWhere(admin, "participation_events", (q) => q.in("user_id", memberIds)),
      countWhere(admin, "action_plans", (q) => q.eq("org_id", orgId)),
      countWhere(admin, "action_items", (q) =>
        q.eq("org_id", orgId).not("owner_user_id", "is", null).not("due_on", "is", null),
      ),
      countWhere(admin, "evidence_records", (q) => q.eq("org_id", orgId)),
      countWhere(admin, "org_cycle_registry", (q) => q.eq("org_id", orgId)),
    ]);

    const signals: AccountSignals = {
      wavesCreated,
      capsulesPublished,
      learningEvents,
      actionPlans,
      actionsWithOwner,
      evidenceRecords,
      cyclesRegistered,
    };

    rows.push({
      orgId,
      orgName: String(org.name ?? "—"),
      packId: String(org.pack_id ?? "enterprise"),
      plan: String(org.plan ?? "pilot"),
      health: computeCustomerHealth(signals),
    });
  }

  return rows;
}
