import { createServerFn } from "@tanstack/react-start";
import { buildRetentionAuditProof } from "../trust/retention-audit-proof.server";

export const getRetentionAuditProof = createServerFn({ method: "GET" }).handler(async () =>
  buildRetentionAuditProof(),
);
