import { createServerFn } from "@tanstack/react-start";
import { buildSignedSessionContractProof } from "../identity/session-contract-proof.server";

export const getSignedSessionContractProof = createServerFn({ method: "GET" }).handler(async () =>
  buildSignedSessionContractProof(),
);
