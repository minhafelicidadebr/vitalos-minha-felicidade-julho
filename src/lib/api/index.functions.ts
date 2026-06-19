import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildServerIndexProof } from "../index/server-index-proof.server";

export const getServerIndexProof = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      packId: z
        .string()
        .regex(/^[a-z][a-z0-9_-]+$/)
        .max(80),
    }),
  )
  .handler(async ({ data }) => buildServerIndexProof(data.packId));
