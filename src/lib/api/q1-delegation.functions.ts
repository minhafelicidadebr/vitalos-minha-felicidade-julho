import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const result = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    company: z.string(),
    revision: z.number().int().nonnegative(),
    delegated: z.boolean(),
    moduleEnabled: z.boolean(),
  }),
  z.object({ status: z.literal("forbidden") }),
  z.object({ status: z.literal("conflict") }),
]);

export const manageQ1Delegation = createServerFn({ method: "POST" })
  .inputValidator(
    z
      .object({
        accessToken: z.string().min(10),
        org: z.string().uuid(),
        user: z.string().uuid(),
        change: z.object({ enabled: z.boolean(), base: z.number().int().nonnegative() }).optional(),
      })
      .strict(),
  )
  .handler(async ({ data }) => {
    try {
      const { verifyPlatformAdmin } = await import("@/lib/api/org-invite.server");
      const actor = await verifyPlatformAdmin(data.accessToken);
      if (!actor.authorized) return { status: "forbidden" } as const;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const client = supabaseAdmin as unknown as {
        rpc(
          name: "q1_manage_preparation_delegate",
          args: Record<string, string | number | boolean>,
        ): PromiseLike<{ data: unknown; error: unknown }>;
      };
      const { data: raw, error } = await client.rpc("q1_manage_preparation_delegate", {
        p_org: data.org,
        p_user: data.user,
        p_actor: actor.userId,
        ...(data.change && { p_enabled: data.change.enabled, p_base: data.change.base }),
      });
      const parsed = result.safeParse(raw);
      if (!error && parsed.success) return parsed.data;
    } catch {
      return { status: "unavailable" } as const;
    }
    return { status: "unavailable" } as const;
  });
