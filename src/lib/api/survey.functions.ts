import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { captureSurveySubmission } from "../survey/response-capture.server";

const captureInput = z.object({
  submissionId: z.string().uuid(),
  packId: z
    .string()
    .regex(/^[a-z][a-z0-9_-]+$/)
    .max(80),
  waveId: z.string().min(1).max(120),
  surveyId: z.string().min(1).max(120),
  answers: z
    .array(
      z.object({
        itemId: z.string().min(1).max(120),
        value: z.number().finite(),
      }),
    )
    .min(1)
    .max(200),
});

export const submitSurveyResponses = createServerFn({ method: "POST" })
  .inputValidator(captureInput)
  .handler(async ({ data }) => captureSurveySubmission(data));
