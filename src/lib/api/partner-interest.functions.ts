import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

function enabled() {
  return (
    import.meta.env.DEV &&
    process.env.VITALOS_PARTNER_INTEREST_LOCAL === "1" &&
    process.env.SUPABASE_URL === "http://127.0.0.1:57621"
  );
}

const track = z.enum(["sst", "development"]);
const submission = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(200).endsWith(".test"),
    track,
    region: z.string().trim().min(2).max(100),
    contact: z.literal(true),
  })
  .strict();
const entry = submission.omit({ contact: true }).extend({ created_at: z.string() });
type Entry = z.infer<typeof entry>;

async function interestTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  type InterestDatabase = {
    public: {
      Tables: {
        partner_interest: {
          Row: Entry;
          Insert: Omit<Entry, "created_at">;
          Update: never;
          Relationships: [];
        };
      };
      Views: Record<never, never>;
      Functions: Record<never, never>;
    };
  };
  return (supabaseAdmin as unknown as SupabaseClient<InterestDatabase>).from("partner_interest");
}

export const partnerInterestAvailable = createServerFn({ method: "GET" }).handler(() => enabled());

export const submitPartnerInterest = createServerFn({ method: "POST" })
  .inputValidator(submission)
  .handler(async ({ data }) => {
    if (!enabled()) return { status: "disabled" } as const;
    const table = await interestTable();
    const { id, name, email, track, region } = data;
    const { error } = await table.insert({ id, name, email, track, region });
    if (!error) return { status: "received" } as const;
    if (error.code !== "23505") return { status: "unavailable" } as const;
    const { data: prior, error: lookupError } = await table
      .select("id")
      .eq("id", id)
      .eq("name", name)
      .eq("email", email)
      .filter("track", "eq", track)
      .filter("region", "eq", region)
      .maybeSingle();
    if (lookupError) return { status: "unavailable" } as const;
    return { status: prior ? "received" : "conflict" } as const;
  });

export const listPartnerInterest = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accessToken: z.string().min(10) }).strict())
  .handler(async ({ data }) => {
    if (!enabled()) return { status: "disabled" } as const;
    const { verifyPlatformAdmin } = await import("@/lib/api/org-invite.server");
    if (!(await verifyPlatformAdmin(data.accessToken)).authorized) {
      return { status: "forbidden" } as const;
    }
    const { data: rows, error } = await (
      await interestTable()
    )
      .select("id,name,email,track,region,created_at")
      .order("created_at", { ascending: false })
      .order("id")
      .limit(50);
    const parsed = entry.array().safeParse(rows);
    if (error || !parsed.success) return { status: "unavailable" } as const;
    return { status: "ready", entries: parsed.data } as const;
  });
