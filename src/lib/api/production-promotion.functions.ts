import { createServerFn } from "@tanstack/react-start";
import { buildProductionPromotionProof } from "../cloud/production-promotion-proof.server";

export const getProductionPromotionProof = createServerFn({ method: "GET" }).handler(async () =>
  buildProductionPromotionProof(),
);
