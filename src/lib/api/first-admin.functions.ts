import { createServerFn } from "@tanstack/react-start";
import { firstAdminSchemas } from "@/lib/identity/first-admin-contract";

export const listFirstAdminFn = createServerFn({ method: "POST" }).inputValidator(firstAdminSchemas.list)
  .handler(async ({ data }) => (await import("@/lib/identity/first-admin.server")).listFirstAdmin(data.accessToken));
export const issueFirstAdminFn = createServerFn({ method: "POST" }).inputValidator(firstAdminSchemas.issue)
  .handler(async ({ data }) => (await import("@/lib/identity/first-admin.server")).issueFirstAdmin(data));
export const revokeFirstAdminFn = createServerFn({ method: "POST" }).inputValidator(firstAdminSchemas.revoke)
  .handler(async ({ data }) => (await import("@/lib/identity/first-admin.server")).revokeFirstAdmin(data));
export const inspectFirstAdminFn = createServerFn({ method: "POST" }).inputValidator(firstAdminSchemas.accept)
  .handler(async ({ data }) => (await import("@/lib/identity/first-admin.server")).acceptFirstAdmin(data, false));
export const acceptFirstAdminFn = createServerFn({ method: "POST" }).inputValidator(firstAdminSchemas.accept)
  .handler(async ({ data }) => (await import("@/lib/identity/first-admin.server")).acceptFirstAdmin(data, true));
