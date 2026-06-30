import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { InviteResolution } from "./invite-resolve.server";

export const checkInviteToken = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: z.string().min(1).max(200), packId: z.string().default("enterprise") }))
  .handler(async ({ data }): Promise<InviteResolution> => {
    const { resolveInviteToken } = await import("./invite-resolve.server");
    return resolveInviteToken(data.token, data.packId);
  });
