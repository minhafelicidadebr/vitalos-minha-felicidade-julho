import { createServerFn } from "@tanstack/react-start";
import { buildProductionKeyRegistryProof } from "../cloud/production-key-registry-proof.server";

export const getProductionKeyRegistryProof = createServerFn({ method: "GET" }).handler(async () =>
  buildProductionKeyRegistryProof(),
);
