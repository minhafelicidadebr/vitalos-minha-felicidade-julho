import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ivoActionLoopSchemas } from "./ivo-action-loop.functions";
export const learningApplicationSchema = ivoActionLoopSchemas.addAction
  .extend({
    contentId: z.string().regex(/^[A-Za-z0-9_.-]{1,80}$/),
    contentVersion: z.string().regex(/^[A-Za-z0-9_.-]{1,40}$/),
    activityVersion: z.string().regex(/^[A-Za-z0-9_.-]{1,40}$/),
    reviewOfItemId: z.string().uuid().optional(),
  })
  .strict();
export const createLearningApplicationFn = createServerFn({ method: "POST" })
  .inputValidator(learningApplicationSchema)
  .handler(async ({ data }) =>
    (await import("@/lib/ivo/learning-application.server")).createLearningApplication(data),
  );
