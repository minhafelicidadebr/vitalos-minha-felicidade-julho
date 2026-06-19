import { createServerFn } from "@tanstack/react-start";
import { buildProductionRegistryApprovalProof } from "../cloud/production-registry-approval-proof.server";

export const getProductionRegistryApprovalProof = createServerFn({ method: "GET" }).handler(
  async () => buildProductionRegistryApprovalProof(),
);
