import { createServerFn } from "@tanstack/react-start";
import { buildProductionEvidenceIntakeProof } from "../cloud/production-evidence-intake-proof.server";

export const getProductionEvidenceIntakeProof = createServerFn({ method: "GET" }).handler(
  async () => buildProductionEvidenceIntakeProof(),
);
