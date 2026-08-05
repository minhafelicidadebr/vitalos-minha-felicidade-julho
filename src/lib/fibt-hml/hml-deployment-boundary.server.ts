// Contenção de rotas do deployment isolado HML (FIBT-HML-2D) — decide, para
// TODA requisição chegando ao Worker Cloudflare vitalos-fibt-hml-isg
// (páginas, API routes E server functions), se ela pertence à allowlist
// mínima necessária para a homologação sintética, ou se deve ser recusada
// ANTES de qualquer loader, server function, consulta ao banco ou
// renderização de dashboard.
//
// Puro: recebe pathname/método/serverFnMeta/env como dados — nunca lê
// process.env, Request nem window diretamente. Conectado ao request path
// real via requestMiddleware em src/start.ts (roda em TODOS os requests:
// SSR, rotas de API, server functions — confirmado pela documentação do
// TanStack Start, não presumido: "Request Middleware... Runs on ALL server
// requests (SSR, server routes, server functions)").
//
// ATIVAÇÃO: gatilho é FIBT_HML_DEPLOYMENT_ENABLED (server-side, nunca
// VITE_*) — deliberadamente independente de VITE_FIBT_HML_ENABLED (que só
// controla o banner no cliente). Um deployment de produção normal nunca
// declara esta variável, então nunca tem nenhuma requisição afetada.
//
// SERVER FUNCTIONS (/_serverFn/*) — Caminho A confirmado, não Caminho B:
// o id de cada server function na URL é sha256(arquivo--nomeDaFunção),
// determinístico e ESTÁVEL entre rebuilds (função pura de dois fatos de
// código-fonte, sem timestamp/salt — confirmado por build sintético
// repetido: o mesmo hash de checkInviteToken apareceu idêntico em builds
// distintos). O TanStack Start expõe essa identidade já RESOLVIDA ao
// middleware via `serverFnMeta: { name, filename }` (RequestServerOptions,
// @tanstack/start-client-core) — resolvida pelo framework A PARTIR do hash
// da URL, ANTES do handler rodar; o cliente não pode forjar esse valor
// (ele reflete a função que o dispatch já determinou, não o contrário).
// Por isso o allowlist é por {filename, name} exatos, nunca por hash cru
// nem por prefixo genérico.
//
// ASSETS/FAVICON — não precisam de entrada aqui: confirmado por inspeção
// do artefato Cloudflare (nitro) que arquivos estáticos são resolvidos por
// isPublicAssetURL() (lookup exato contra o manifesto de arquivos REAIS
// gerados pelo build) ANTES de qualquer requisição alcançar o handler do
// TanStack Start — um caminho como /assets/../admin não é um arquivo real
// gerado, então nunca casa nesse lookup e cai (corretamente) neste boundary,
// que o rejeita por não estar na allowlist de página/API/server-fn.

export interface HmlDeploymentEnvLike {
  FIBT_HML_DEPLOYMENT_ENABLED?: string;
}

export interface HmlServerFnMetaLike {
  name: string;
  filename: string;
}

export interface HmlDeploymentRequestInput {
  pathname: string;
  method: string;
  serverFnMeta?: HmlServerFnMetaLike | undefined;
  env: HmlDeploymentEnvLike;
}

export type HmlDeploymentBlockReason = "HML_DEPLOYMENT_CONFIG_INVALID" | "HML_ROUTE_NOT_ALLOWLISTED";

export type HmlDeploymentRouteDecision =
  | { allowed: true }
  | { allowed: false; status: 404; reason: HmlDeploymentBlockReason };

/** As únicas 5 server functions que o fluxo real de /convite/:token usa —
 *  identidade por arquivo+nome, resolvida pelo framework, nunca por hash. */
const HML_ALLOWED_SERVER_FUNCTIONS: readonly HmlServerFnMetaLike[] = [
  { filename: "src/lib/api/invite-resolve.functions.ts", name: "checkInviteToken" },
  { filename: "src/lib/api/survey.functions.ts", name: "submitSurveyResponses" },
  { filename: "src/lib/api/capsule-aggregator.functions.ts", name: "checkAndAggregateByToken" },
  { filename: "src/lib/api/survey-telemetry.functions.ts", name: "recordSurveyFunnelSnapshot" },
  { filename: "src/lib/api/survey-telemetry.functions.ts", name: "loadSurveyFunnelResult" },
];

const SAFE_METHODS = new Set(["GET", "HEAD"]);

export type HmlDeploymentDeclaration = "not_declared" | "declared_valid" | "declared_invalid";

/** Ausente = modo comum. Exatamente "true" = HML. Qualquer outra coisa
 *  presente (vazio, "false", "1", " true", etc.) = configuração inválida,
 *  que bloqueia tudo — nunca cai de volta ao modo comum em silêncio. */
export function classifyHmlDeploymentDeclaration(raw: string | undefined): HmlDeploymentDeclaration {
  if (raw === undefined) return "not_declared";
  if (raw === "true") return "declared_valid";
  return "declared_invalid";
}

/**
 * Normaliza um pathname bruto e rejeita formas perigosas ou ambíguas:
 * segmentos "..", barra invertida, URL absoluta embutida, codificação dupla
 * (sobra "%XX" depois de UMA decodificação — inclusive quando o valor
 * decodificado introduz uma barra "/" que tentaria escapar de um segmento).
 * Retorna null quando a forma é rejeitada — chamador trata como bloqueado.
 */
function normalizePathname(raw: string): string | null {
  if (raw.includes("\\")) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return null; // URL absoluta no pathname

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  // Sobrou um "%XX" depois de UMA decodificação e o valor mudou => o
  // pathname já chegou codificado; uma segunda decodificação implícita em
  // qualquer parser posterior revelaria outro caminho — tratamos como
  // codificação dupla e recusamos.
  if (decoded !== raw && /%[0-9a-f]{2}/i.test(decoded)) return null;
  if (decoded.includes("\\")) return null;
  if (decoded.includes("..")) return null;

  const collapsed = decoded.replace(/\/{2,}/g, "/");
  return collapsed;
}

function isExactConviteRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[0] === "convite" && segments[1]!.length > 0;
}

function serverFnMetaAllowed(meta: HmlServerFnMetaLike | undefined): boolean {
  if (!meta) return false;
  return HML_ALLOWED_SERVER_FUNCTIONS.some((f) => f.filename === meta.filename && f.name === meta.name);
}

/**
 * Decisão principal — chamada do requestMiddleware global (src/start.ts).
 * Nunca decide com base em query string, headers ou estado do cliente:
 * recebe só pathname (já sem query/fragment, ver chamador), método, e a
 * identidade de server function já resolvida pelo framework.
 */
export function assertHmlDeploymentRequestAllowed(input: HmlDeploymentRequestInput): HmlDeploymentRouteDecision {
  const declaration = classifyHmlDeploymentDeclaration(input.env.FIBT_HML_DEPLOYMENT_ENABLED);

  if (declaration === "not_declared") return { allowed: true };

  if (declaration === "declared_invalid") {
    return { allowed: false, status: 404, reason: "HML_DEPLOYMENT_CONFIG_INVALID" };
  }

  // declared_valid a partir daqui — aplica a allowlist completa, fail-closed.
  const method = input.method.toUpperCase();
  const normalized = normalizePathname(input.pathname);
  if (normalized === null) {
    return { allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" };
  }

  if (normalized.startsWith("/_serverFn/")) {
    return serverFnMetaAllowed(input.serverFnMeta)
      ? { allowed: true }
      : { allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" };
  }

  if (!SAFE_METHODS.has(method)) {
    return { allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" };
  }

  if (normalized === "/api/fibt-hml/attestation") return { allowed: true };
  if (isExactConviteRoute(normalized)) return { allowed: true };

  return { allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" };
}

/** Resposta sanitizada — nunca revela pathname, nome de rota, stack ou motivo detalhado ao cliente. */
export function hmlDeploymentBlockedResponse(): Response {
  return new Response("Not found.", { status: 404 });
}

/**
 * Composição testável do middleware inteiro — o mesmo corpo que
 * src/start.ts liga ao requestMiddleware global, mas com `next` injetado
 * como parâmetro em vez de vir da máquina de middleware do TanStack Start.
 * Existe para que os testes provem, com um espião real em `next`, que uma
 * requisição bloqueada NUNCA invoca o restante da cadeia (router, loader,
 * server function, client Supabase) — não apenas que a função de decisão
 * pura devolve `allowed: false`.
 */
export async function runHmlDeploymentBoundary<TNextResult>(
  input: HmlDeploymentRequestInput & { next: () => TNextResult | Promise<TNextResult> },
): Promise<TNextResult | Response> {
  const decision = assertHmlDeploymentRequestAllowed(input);
  if (!decision.allowed) return hmlDeploymentBlockedResponse();
  return input.next();
}
