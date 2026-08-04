// Endpoint público de atestação HML (FIBT-HML-1D, Fase 9.3).
//
// Único propósito: confirmar, para o CLIENTE (resolveHmlMode) e para o
// gerador (--commit futuro, Fase 10), que este deployment está de fato
// vinculado ao backend de staging autorizado — sem expor ref, URL, chave ou
// qualquer detalhe interno. Não consulta o banco: assertHmlBackendBoundary()
// é puramente derivado de variáveis de ambiente server-side.
//
// A lógica de decisão (buildHmlAttestationPayload) é uma função pura,
// exportada separadamente do handler HTTP — testável sem instanciar
// Request/Response do TanStack Start, mesmo padrão de testabilidade já
// usado em todo o resto deste módulo (assertHmlBackendBoundary, etc).

import { createFileRoute } from "@tanstack/react-router";
import {
  assertHmlBackendBoundary,
  type HmlBackendBoundaryEnv,
} from "@/lib/fibt-hml/hml-backend-boundary.server";
import { HML_CONTRACT_VERSION, HML_ENVIRONMENT } from "@/lib/fibt-hml/hml-contract";

export interface HmlAttestationReadyPayload {
  status: "READY";
  contract_version: string;
  environment: string;
  batch_id: string;
  backend_attested: true;
  frontend_origin_attested: true;
}

export interface HmlAttestationBlockedPayload {
  status: "BLOCKED";
  failure_code: string;
}

export type HmlAttestationPayloadResult = {
  httpStatus: 200 | 503;
  body: HmlAttestationReadyPayload | HmlAttestationBlockedPayload;
};

/** Puro: recebe o ambiente como dado — nunca lê process.env diretamente. */
export function buildHmlAttestationPayload(env: HmlBackendBoundaryEnv): HmlAttestationPayloadResult {
  const boundary = assertHmlBackendBoundary(env);

  if (!boundary.hmlDeclared) {
    return { httpStatus: 503, body: { status: "BLOCKED", failure_code: "HML_NOT_ENABLED" } };
  }

  if (!boundary.attested) {
    return { httpStatus: 503, body: { status: "BLOCKED", failure_code: boundary.code } };
  }

  return {
    httpStatus: 200,
    body: {
      status: "READY",
      contract_version: HML_CONTRACT_VERSION,
      environment: HML_ENVIRONMENT,
      batch_id: boundary.batchId,
      backend_attested: true,
      frontend_origin_attested: true,
    },
  };
}

export const Route = createFileRoute("/api/fibt-hml/attestation")({
  server: {
    handlers: {
      GET: async () => {
        const result = buildHmlAttestationPayload(process.env as HmlBackendBoundaryEnv);
        return Response.json(result.body, { status: result.httpStatus });
      },
    },
  },
});
