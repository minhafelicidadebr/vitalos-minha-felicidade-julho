import { createStart, createMiddleware } from "@tanstack/react-start";
import { getServerFnById } from "#tanstack-start-server-fn-resolver";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import {
  resolveHmlServerFnMetaForRequest,
  runHmlDeploymentBoundary,
  type HmlDeploymentEnvLike,
} from "@/lib/fibt-hml/hml-deployment-boundary.server";
import {
  verifyCloudflareAccessRequest,
  type CloudflareAccessEnvLike,
} from "@/lib/fibt-hml/cloudflare-access-jwt.server";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// FIBT-HML-2D/3E — contenção de rotas + autenticação Cloudflare Access do
// deployment isolado HML. Primeiro middleware da cadeia (roda antes até do
// errorMiddleware): request middleware executa em TODA requisição
// server-side — SSR, rotas de API e server functions (não só páginas, ver
// hml-deployment-boundary.server.ts). Inativo por construção em qualquer
// deployment que não declare FIBT_HML_DEPLOYMENT_ENABLED — produção comum
// nunca passa por nenhuma lógica nova aqui, nem exige JWT.
const hmlDeploymentBoundaryMiddleware = createMiddleware().server(
  async ({ next, request, pathname, serverFnMeta }) => {
    const env = process.env as HmlDeploymentEnvLike;
    const resolvedServerFnMeta = await resolveHmlServerFnMetaForRequest({
      pathname,
      env,
      serverFnMeta,
      lookupServerFn: (id) => getServerFnById(id, { origin: "client" }),
    });

    return runHmlDeploymentBoundary({
      pathname,
      method: request.method,
      serverFnMeta: resolvedServerFnMeta,
      env,
      next,
      verifyAccess: () =>
        verifyCloudflareAccessRequest(request, process.env as CloudflareAccessEnvLike),
    });
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [hmlDeploymentBoundaryMiddleware, errorMiddleware],
}));
