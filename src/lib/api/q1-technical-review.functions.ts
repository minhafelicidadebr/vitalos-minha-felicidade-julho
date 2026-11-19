import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  applyPreparation,
  cycleSchema,
  prepCommandSchema,
  type PrepState,
} from "@/domain/survey/q1-preparation";
import { technicalReviewCommand } from "@/domain/survey/q1-technical-review";

const commandSchema = z.union([
  technicalReviewCommand,
  z.object({ kind: z.literal("read") }).strict(),
  z.object({ kind: z.literal("inspect"), org: z.string().uuid() }).strict(),
  z
    .object({
      kind: z.literal("assign"),
      org: z.string().uuid(),
      reviewerId: z.string().uuid().nullable(),
      base: z.number().int().nonnegative(),
    })
    .strict(),
]);
const reply = z.object({
  status: z.enum(["ready", "forbidden", "stale", "conflict", "invalid"]),
  sequence: z.number().int().nonnegative().optional(),
  preparationRevision: z.number().int().nonnegative().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  submitted: z.boolean().optional(),
  canSubmit: z.boolean().optional(),
  snapshot: z.array(z.object({ id: z.string().uuid(), command: prepCommandSchema })).nullish(),
  feedback: z
    .object({
      decision: z.enum(["changes_requested", "review_recorded"]),
      rationale: z.string(),
      recordedAt: z.string(),
    })
    .nullish(),
});

export const operateQ1TechnicalReview = createServerFn({ method: "POST" })
  .inputValidator(
    z
      .object({
        accessToken: z.string().min(10),
        cycle: cycleSchema,
        command: commandSchema,
        expectedScope: z.string().uuid().optional(),
      })
      .strict(),
  )
  .handler(async ({ data: { accessToken, cycle, command, expectedScope } }) => {
    try {
      let identity: { org: string; user: string };
      if (command.kind === "assign" || command.kind === "inspect") {
        const { verifyPlatformAdmin } = await import("@/lib/api/org-invite.server");
        const actor = await verifyPlatformAdmin(accessToken);
        if (!actor.authorized) return { status: "forbidden" } as const;
        identity = { org: command.org, user: actor.userId };
      } else {
        const { authorizeIvoSession } = await import("@/lib/ivo/ivo-q2-reading.server");
        // Vínculo real de qualquer membro (org da sessão). O papel é decidido pela RPC
        // q1_technical_review: RH/delegado para ler e encaminhar; só o SST designado para
        // ler como revisor e devolver. Sem esta opção o SST designado era recusado aqui.
        const actor = await authorizeIvoSession(accessToken, undefined, { allowMember: true });
        if (!actor.ok || actor.orgId !== expectedScope) return { status: "forbidden" } as const;
        identity = { org: actor.orgId, user: actor.userId };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const client = supabaseAdmin as unknown as {
        rpc(
          name: "q1_technical_review",
          payload: {
            p_org: string;
            p_actor: string;
            p_cycle: string;
            p_command: z.infer<typeof commandSchema>;
          },
        ): PromiseLike<{ data: unknown; error: unknown }>;
      };
      const { data, error } = await client.rpc("q1_technical_review", {
        p_org: identity.org,
        p_actor: identity.user,
        p_cycle: cycle,
        p_command: command,
      });
      const parsed = reply.safeParse(data);
      if (!error && parsed.success) {
        const { snapshot, ...result } = parsed.data;
        let memory: PrepState | null = null;
        if (snapshot) {
          memory = { controls: [] };
          for (const event of snapshot) {
            const next = applyPreparation(memory, event);
            if ("ok" in next) return { status: "unavailable" } as const;
            memory = next;
          }
        }
        return { ...result, memory };
      }
    } catch {
      return { status: "unavailable" } as const;
    }
    return { status: "unavailable" } as const;
  });
