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

interface AccountIdentity {
  orgId: string;
  orgName: string;
  packId: string;
  plan: string;
}

export type AccountHealthRow = AccountIdentity &
  ({ state: "available"; health: CustomerHealth } | { state: "unavailable"; health: null });

interface QueryResult {
  data?: unknown;
  count?: number | null;
  error?: unknown;
}
interface HealthQuery extends PromiseLike<QueryResult> {
  eq(column: string, value: string): HealthQuery;
  in(column: string, values: string[]): HealthQuery;
  not(column: string, operator: "is", value: null): HealthQuery;
  order(column: string, options: { ascending: boolean }): HealthQuery;
}
interface AccountHealthClient {
  from(table: string): {
    select(columns: string, options?: { count: "exact"; head: true }): HealthQuery;
  };
}

async function countWhere(
  admin: AccountHealthClient,
  table: string,
  filters: (q: HealthQuery) => HealthQuery,
): Promise<number> {
  const { count, error } = await filters(
    admin.from(table).select("*", { count: "exact", head: true }),
  );
  if (error || typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
    throw new Error("Contagem operacional indisponível.");
  }
  return count;
}

/** Saúde de todas as contas — founder/plataforma apenas. */
export async function listAccountHealth(): Promise<AccountHealthRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return collectAccountHealth(supabaseAdmin as unknown as AccountHealthClient);
}

/** Composição testável; o chamador mantém a autorização de plataforma existente. */
export async function collectAccountHealth(
  admin: AccountHealthClient,
): Promise<AccountHealthRow[]> {
  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, name, pack_id, plan")
    .order("created_at", { ascending: true });
  if (error || !Array.isArray(orgs)) throw new Error("Inventário operacional indisponível.");

  const rows: AccountHealthRow[] = [];
  for (const org of (orgs ?? []) as Array<Record<string, unknown>>) {
    const orgId = String(org.id);
    const identity: AccountIdentity = {
      orgId,
      orgName: String(org.name ?? "—"),
      packId: String(org.pack_id ?? "enterprise"),
      plan: String(org.plan ?? "pilot"),
    };

    try {
      // Membros da org — participation_events é por usuário (S5, sem org_id);
      // o vínculo é via profiles, a mesma fonte que o RBAC real usa.
      const { data: members, error: memberError } = await admin
        .from("profiles")
        .select("id")
        .eq("org_id", orgId);
      if (memberError || !Array.isArray(members))
        throw new Error("Vínculos operacionais indisponíveis.");
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
        ...identity,
        state: "available",
        health: computeCustomerHealth(signals),
      });
    } catch {
      // Falha de consulta não equivale a ausência de atividade. Não produzir score parcial.
      rows.push({ ...identity, state: "unavailable", health: null });
    }
  }

  return rows;
}
