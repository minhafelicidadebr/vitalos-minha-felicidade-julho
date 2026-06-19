import { createServerFn } from "@tanstack/react-start";
import { buildConsentLedgerContractProof } from "../trust/consent-ledger-proof.server";

export const getConsentLedgerContractProof = createServerFn({ method: "GET" }).handler(async () =>
  buildConsentLedgerContractProof(),
);
