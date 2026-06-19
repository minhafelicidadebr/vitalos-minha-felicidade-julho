import { createServerFn } from "@tanstack/react-start";
import { buildConsentPersistenceContractProof } from "../trust/consent-persistence-proof.server";

export const getConsentPersistenceContractProof = createServerFn({ method: "GET" }).handler(
  async () => buildConsentPersistenceContractProof(),
);
