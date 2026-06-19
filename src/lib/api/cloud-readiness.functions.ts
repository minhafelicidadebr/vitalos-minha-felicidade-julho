import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildCloudReadinessProof } from "../cloud/cloud-readiness-proof.server";

export const getCloudReadinessProof = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      packId: z
        .string()
        .regex(/^[a-z][a-z0-9_-]+$/)
        .max(80),
    }),
  )
  .handler(async ({ data }) => buildCloudReadinessProof(data.packId));
