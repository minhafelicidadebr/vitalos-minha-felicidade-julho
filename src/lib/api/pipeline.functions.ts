import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildDataPipelineSnapshot } from "../pipeline/data-pipeline-snapshot.server";

export const getDataPipelineSnapshot = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      packId: z
        .string()
        .regex(/^[a-z][a-z0-9_-]+$/)
        .max(80),
    }),
  )
  .handler(async ({ data }) => buildDataPipelineSnapshot(data.packId));
