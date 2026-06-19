import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildAggregationProof } from "../aggregation/aggregation-proof.server";

export const getAggregationProof = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      packId: z
        .string()
        .regex(/^[a-z][a-z0-9_-]+$/)
        .max(80),
    }),
  )
  .handler(async ({ data }) => buildAggregationProof(data.packId));
