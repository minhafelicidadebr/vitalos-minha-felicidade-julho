import { z } from "zod";
import {
  applyPreparation,
  prepCommandSchema,
  type PrepSave,
  type PrepState,
  type PrepResult,
} from "@/domain/survey/q1-preparation";
import { authorizeIvoSession } from "./ivo-q2-reading.server";

const journalSchema = z
  .object({
    status: z.literal("ready"),
    organization: z.string().min(1),
    events: z.array(z.object({ id: z.string().uuid(), command: prepCommandSchema }).strict()),
  })
  .strict();
type Actor = { orgId: string; userId: string };
// A migration local precede a próxima geração dos tipos do backend.
type PreparationRpc = {
  rpc(
    name: "q1_preparation_journal",
    args: {
      p_org: string;
      p_actor: string;
      p_cycle: string;
      p_base?: number;
      p_request?: string;
      p_command?: PrepSave["command"];
    },
  ): PromiseLike<{ data: unknown; error: unknown }>;
};
async function journal(actor: Actor, cycle: string, append?: PrepSave): Promise<unknown> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const client = supabaseAdmin as unknown as PreparationRpc;
  const { data, error } = await client.rpc("q1_preparation_journal", {
    p_org: actor.orgId,
    p_actor: actor.userId,
    p_cycle: cycle,
    ...(append && { p_base: append.base, p_request: append.requestId, p_command: append.command }),
  });
  if (error) throw new Error("preparation_unavailable");
  return data;
}
function project(raw: unknown, scope: string, cycle: string) {
  const denied = z.object({ status: z.enum(["forbidden", "conflict", "invalid"]) }).safeParse(raw);
  if (denied.success) return { ok: false as const, reason: denied.data.status };
  const data = journalSchema.parse(raw);
  let state: PrepState = { controls: [] };
  for (const event of data.events) {
    const next = applyPreparation(state, event);
    if ("ok" in next) throw new Error("invalid_preparation_history");
    state = next;
  }
  return {
    ok: true as const,
    view: { scope, organization: data.organization, cycle, revision: data.events.length, state },
    events: data.events,
  };
}

export async function operatePreparation(
  input: { accessToken?: string; cycle: string } | PrepSave,
  deps = { authorize: authorizeIvoSession, journal },
): Promise<PrepResult> {
  try {
    const actor = await deps.authorize(input.accessToken);
    if (!actor.ok)
      return {
        ok: false,
        reason:
          actor.category === "backend" || actor.category === "unavailable"
            ? "unavailable"
            : "forbidden",
      };
    // The journal checks the current membership, Q1 entitlement and delegation atomically.
    if ("command" in input && input.expectedScope !== actor.orgId)
      return { ok: false, reason: "scope" };
    const current = project(await deps.journal(actor, input.cycle), actor.orgId, input.cycle);
    if (!current.ok) return current;
    if (!("command" in input)) return { ok: true, view: current.view };
    if (!current.events.some((e) => e.id === input.requestId)) {
      if (current.view.revision !== input.base) return { ok: false, reason: "conflict" };
      const next = applyPreparation(current.view.state, {
        id: input.requestId,
        command: input.command,
      });
      if ("ok" in next) return next;
    }
    const saved = project(await deps.journal(actor, input.cycle, input), actor.orgId, input.cycle);
    return saved.ok ? { ok: true, view: saved.view } : saved;
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
