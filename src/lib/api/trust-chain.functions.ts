import { createServerFn } from "@tanstack/react-start";
import { buildIdentityTrustChainProof } from "../security/trust-chain-attestation.server";

export const getIdentityTrustChainProof = createServerFn({ method: "GET" }).handler(async () =>
  buildIdentityTrustChainProof(),
);
