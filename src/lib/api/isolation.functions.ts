import { createServerFn } from "@tanstack/react-start";
import { buildIsolationAuditProof } from "../identity/isolation-audit-proof.server";

export const getIsolationAuditProof = createServerFn({ method: "GET" }).handler(async () =>
  buildIsolationAuditProof(),
);
