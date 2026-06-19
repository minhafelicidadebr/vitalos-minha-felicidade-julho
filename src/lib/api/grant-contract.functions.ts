import { createServerFn } from "@tanstack/react-start";
import { buildGrantIssuanceContractProof } from "../identity/grant-issuance-proof.server";

export const getGrantIssuanceContractProof = createServerFn({ method: "GET" }).handler(async () =>
  buildGrantIssuanceContractProof(),
);
