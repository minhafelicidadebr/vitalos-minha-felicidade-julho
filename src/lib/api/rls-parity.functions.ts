import { createServerFn } from "@tanstack/react-start";
import { buildRlsParityProof } from "../security/rls-parity-proof.server";

export const getRlsParityProof = createServerFn({ method: "GET" }).handler(async () =>
  buildRlsParityProof(),
);
