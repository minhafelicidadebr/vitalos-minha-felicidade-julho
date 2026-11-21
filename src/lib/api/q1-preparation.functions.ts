import { createServerFn } from "@tanstack/react-start";
import { prepReadSchema, prepSaveSchema } from "@/domain/survey/q1-preparation";

export const checkQ1PreparationAccess = createServerFn({ method: "POST" })
  .inputValidator(prepReadSchema)
  .handler(async ({ data }) => {
    const result = await (await import("@/lib/ivo/q1-preparation.server")).operatePreparation(data);
    return result.ok ? { scope: result.view.scope } : { scope: null };
  });

export const readQ1Preparation = createServerFn({ method: "POST" })
  .inputValidator(prepReadSchema)
  .handler(async ({ data }) =>
    (await import("@/lib/ivo/q1-preparation.server")).operatePreparation(data),
  );
export const saveQ1Preparation = createServerFn({ method: "POST" })
  .inputValidator(prepSaveSchema)
  .handler(async ({ data }) =>
    (await import("@/lib/ivo/q1-preparation.server")).operatePreparation(data),
  );
