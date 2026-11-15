import { createServerFn } from "@tanstack/react-start";
import { moduleSchemas } from "@/lib/identity/module-contract";
export const listPlatformModulesFn = createServerFn({ method: "POST" })
  .inputValidator(moduleSchemas.list)
  .handler(async ({ data }) =>
    (await import("@/lib/identity/module-access.server")).listPlatformModules(data.accessToken),
  );
export const changeModuleFn = createServerFn({ method: "POST" })
  .inputValidator(moduleSchemas.change)
  .handler(async ({ data }) =>
    (await import("@/lib/identity/module-access.server")).changeModule(data),
  );
export const institutionalModulesFn = createServerFn({ method: "POST" })
  .inputValidator(moduleSchemas.list)
  .handler(async ({ data }) =>
    (await import("@/lib/identity/module-access.server")).institutionalModules(data.accessToken),
  );
