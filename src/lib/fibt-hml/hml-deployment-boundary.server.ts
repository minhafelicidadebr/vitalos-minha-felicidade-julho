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
// distintos). O request middleware global do runtime atual não recebe essa
// identidade. O adaptador em src/start.ts consulta o resolvedor virtual do
// próprio TanStack pelo id exato da URL e entrega a identidade resolvida à
// boundary antes do dispatch; headers ou metadata do cliente nunca entram
// nessa decisão. Por isso a allowlist é por {filename, name} exatos, nunca
// por hash cru nem por prefixo genérico.
//
// ASSETS/FAVICON — não precisam de entrada aqui: confirmado por inspeção
// do artefato Cloudflare (nitro) que arquivos estáticos são resolvidos por
// isPublicAssetURL() (lookup exato contra o manifesto de arquivos REAIS
// gerados pelo build) ANTES de qualquer requisição alcançar o handler do
// TanStack Start — um caminho como /assets/../admin não é um arquivo real
// gerado, então nunca casa nesse lookup e cai (corretamente) neste boundary,
// que o rejeita por não estar na allowlist de página/API/server-fn.

import { accessDeniedResponse } from "./cloudflare-access-jwt.server";

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

export interface HmlServerFnMetaResolutionInput {
  pathname: string;
  env: HmlDeploymentEnvLike;
  serverFnMeta?: HmlServerFnMetaLike | undefined;
  lookupServerFn: (id: string) => Promise<unknown>;
}

export type HmlDeploymentBlockReason =
  | "HML_DEPLOYMENT_CONFIG_INVALID"
  | "HML_ROUTE_NOT_ALLOWLISTED";

export type HmlDeploymentRouteDecision =
  | { allowed: true }
  | { allowed: false; status: 404; reason: HmlDeploymentBlockReason };

/** As únicas server functions usadas pelos fluxos sintéticos autorizados —
 *  identidade por arquivo+nome, resolvida pelo framework, nunca por hash. */
const HML_ALLOWED_SERVER_FUNCTIONS: readonly HmlServerFnMetaLike[] = [
  { filename: "src/lib/api/invite-resolve.functions.ts", name: "checkInviteToken" },
  { filename: "src/lib/api/survey.functions.ts", name: "submitSurveyResponses" },
  { filename: "src/lib/api/capsule-aggregator.functions.ts", name: "checkAndAggregateByToken" },
  { filename: "src/lib/api/survey-telemetry.functions.ts", name: "recordSurveyFunnelSnapshot" },
  { filename: "src/lib/api/survey-telemetry.functions.ts", name: "loadSurveyFunnelResult" },
  { filename: "src/lib/api/sector-link.functions.ts", name: "resolveSectorToken" },
  { filename: "src/lib/api/sector-link.functions.ts", name: "submitSectorLinkResponse" },
];

const SAFE_METHODS = new Set(["GET", "HEAD"]);

export type HmlDeploymentDeclaration = "not_declared" | "declared_valid" | "declared_invalid";

/** Ausente = modo comum. Exatamente "true" = HML. Qualquer outra coisa
 *  presente (vazio, "false", "1", " true", etc.) = configuração inválida,
 *  que bloqueia tudo — nunca cai de volta ao modo comum em silêncio. */
export function classifyHmlDeploymentDeclaration(
  raw: string | undefined,
): HmlDeploymentDeclaration {
  if (raw === undefined) return "not_declared";
  if (raw === "true") return "declared_valid";
  return "declared_invalid";
}

/**
 * Decodifica UM segmento de path e rejeita formas perigosas ou ambíguas
 * NESSE segmento: barra invertida (crua ou codificada — aparece após a
 * decodificação), segmento igual a "." ou ".." (cru ou codificado — mesma
 * checagem, feita DEPOIS de decodificar), e codificação dupla (sobra um
 * "%XX" depois de UMA decodificação deste segmento). Retorna null quando a
 * forma é rejeitada.
 */
function decodeSegment(rawSegment: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawSegment);
  } catch {
    return null;
  }
  if (decoded !== rawSegment && /%[0-9a-f]{2}/i.test(decoded)) return null;
  if (decoded.includes("\\")) return null;
  if (decoded === "." || decoded === "..") return null;
  return decoded;
}

/**
 * Divide o pathname em segmentos pela BARRA LITERAL do pathname BRUTO,
 * decodificando cada segmento DEPOIS de dividir — a mesma ordem que o
 * próprio TanStack Router usa internamente (confirmado por leitura de
 * new-process-route-tree.js: `parts = path.split('/')` primeiro,
 * `decodeURIComponent(part)` depois, por segmento).
 *
 * FIBT-HML-2E (Risco 2, P1 corrigido): a versão anterior decodificava o
 * pathname INTEIRO antes de dividir por "/" — um token Base64 legítimo
 * contendo "/" (ex.: "abc+/def==", codificado como
 * "/convite/abc%2B%2Fdef%3D%3D") tinha sua barra decodificada ANTES da
 * divisão, virando um separador de rota falso e quebrando o token em dois
 * "segmentos" — o convite era rejeitado por engano. Dividir primeiro (na
 * barra crua, nunca presente dentro de um %2F) e decodificar depois,
 * por segmento, resolve isso: "%2F" nunca vira separador, só um caractere
 * "/" dentro do VALOR de um segmento — exatamente como o próprio router
 * trata. Retorna null quando qualquer segmento é rejeitado ou o pathname
 * não começa com "/".
 */
function splitAndDecodePathname(raw: string): string[] | null {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return null; // URL absoluta embutida no pathname

  const rawSegments = raw.split("/");
  if (rawSegments[0] !== "") return null; // pathname sempre começa com "/"

  const segments: string[] = [];
  for (const rawSegment of rawSegments.slice(1)) {
    if (rawSegment === "") continue; // colapsa barras múltiplas/barra final
    const decoded = decodeSegment(rawSegment);
    if (decoded === null) return null;
    segments.push(decoded);
  }
  return segments;
}

const SERVER_FN_ID_PATTERN = /^[a-f0-9]{64}$/;

function extractHmlServerFnId(pathname: string): string | null {
  const segments = splitAndDecodePathname(pathname);
  if (segments === null || segments.length !== 2 || segments[0] !== "_serverFn") return null;

  const id = segments[1]!;
  return SERVER_FN_ID_PATTERN.test(id) ? id : null;
}

/**
 * Resolve a identidade de uma server function somente no deployment HML.
 * O lookup injetado deve ser o resolvedor virtual do TanStack; qualquer id
 * desconhecido, metadata incompleta ou divergencia entre URL e manifesto
 * retorna undefined e deixa a boundary existente negar a requisicao.
 */
export async function resolveHmlServerFnMetaForRequest(
  input: HmlServerFnMetaResolutionInput,
): Promise<HmlServerFnMetaLike | undefined> {
  if (
    classifyHmlDeploymentDeclaration(input.env.FIBT_HML_DEPLOYMENT_ENABLED) !== "declared_valid"
  ) {
    return input.serverFnMeta;
  }

  if (input.serverFnMeta) return input.serverFnMeta;

  const id = extractHmlServerFnId(input.pathname);
  if (id === null) return undefined;

  try {
    const resolved = await input.lookupServerFn(id);
    if ((typeof resolved !== "object" && typeof resolved !== "function") || resolved === null) {
      return undefined;
    }

    const meta = (resolved as { serverFnMeta?: unknown }).serverFnMeta;
    if (typeof meta !== "object" || meta === null) return undefined;

    const { id: resolvedId, name, filename } = meta as Record<string, unknown>;
    if (
      resolvedId !== id ||
      typeof name !== "string" ||
      name.length === 0 ||
      typeof filename !== "string" ||
      filename.length === 0
    ) {
      return undefined;
    }

    return { name, filename };
  } catch {
    return undefined;
  }
}

function isExactConviteRoute(segments: readonly string[]): boolean {
  return segments.length === 2 && segments[0] === "convite" && segments[1]!.length > 0;
}

function isExactSectorResponseRoute(segments: readonly string[]): boolean {
  return (
    segments.length === 3 &&
    segments[0] === "respond" &&
    segments[1] === "s" &&
    segments[2]!.length > 0
  );
}

/**
 * Extrai o valor decodificado do parâmetro $token de um pathname
 * /convite/:token já confirmado pela allowlist — usa a MESMA decodificação
 * por segmento do resto deste módulo. Existe para que testes confirmem que
 * o token entregue ao app é idêntico ao valor bruto original (Risco 2,
 * FIBT-HML-2E) — não é usada pela decisão de allow/block em si.
 */
export function extractConviteTokenForTesting(pathname: string): string | null {
  const segments = splitAndDecodePathname(pathname);
  if (segments === null || !isExactConviteRoute(segments)) return null;
  return segments[1]!;
}

function serverFnMetaAllowed(meta: HmlServerFnMetaLike | undefined): boolean {
  if (!meta) return false;
  return HML_ALLOWED_SERVER_FUNCTIONS.some(
    (f) => f.filename === meta.filename && f.name === meta.name,
  );
}

/**
 * Decisão principal — chamada do requestMiddleware global (src/start.ts).
 * Nunca decide com base em query string, headers ou estado do cliente:
 * recebe só pathname (já sem query/fragment, ver chamador), método, e a
 * identidade de server function já resolvida pelo framework.
 */
export function assertHmlDeploymentRequestAllowed(
  input: HmlDeploymentRequestInput,
): HmlDeploymentRouteDecision {
  const declaration = classifyHmlDeploymentDeclaration(input.env.FIBT_HML_DEPLOYMENT_ENABLED);

  if (declaration === "not_declared") return { allowed: true };

  if (declaration === "declared_invalid") {
    return { allowed: false, status: 404, reason: "HML_DEPLOYMENT_CONFIG_INVALID" };
  }

  // declared_valid a partir daqui — aplica a allowlist completa, fail-closed.
  const method = input.method.toUpperCase();
  const segments = splitAndDecodePathname(input.pathname);
  if (segments === null) {
    return { allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" };
  }

  if (segments[0] === "_serverFn") {
    return serverFnMetaAllowed(input.serverFnMeta)
      ? { allowed: true }
      : { allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" };
  }

  if (!SAFE_METHODS.has(method)) {
    return { allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" };
  }

  if (
    segments.length === 3 &&
    segments[0] === "api" &&
    segments[1] === "fibt-hml" &&
    segments[2] === "attestation"
  ) {
    return { allowed: true };
  }
  if (isExactConviteRoute(segments)) return { allowed: true };
  if (isExactSectorResponseRoute(segments)) return { allowed: true };

  return { allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" };
}

/** Resposta sanitizada — nunca revela pathname, nome de rota, stack ou motivo detalhado ao cliente. */
export function hmlDeploymentBlockedResponse(): Response {
  return new Response("Not found.", { status: 404 });
}

/** Identidade autenticada pelo Access, transportada só no servidor. */
export interface HmlAccessIdentityLike {
  email: string;
  subject: string;
}

export type HmlAccessVerification =
  | { valid: true; identity: HmlAccessIdentityLike }
  | { valid: false };

export interface HmlNextOptions {
  context?: { hmlAccessIdentity: HmlAccessIdentityLike };
}

/**
 * Composição testável do middleware inteiro — o mesmo corpo que
 * src/start.ts liga ao requestMiddleware global, mas com `next` e o
 * verificador de Access injetados como parâmetros em vez de virem da máquina
 * de middleware do TanStack Start e do `jose`. Existe para que os testes
 * provem, com espiões reais, que uma requisição bloqueada NUNCA invoca o
 * restante da cadeia (router, loader, server function, client Supabase) — não
 * apenas que a função de decisão pura devolve `allowed: false`.
 *
 * ORDEM (FIBT-HML-3E), deliberada:
 *
 *   1. HML não declarado  → next() direto, sem exigir JWT algum. Um
 *      deployment de produção comum não ganha nenhum requisito novo.
 *   2. Rota/método/server function fora da allowlist → 404 ANTES de qualquer
 *      JWT ou JWKS. Requisição proibida não deve provocar I/O nenhum, nem
 *      sequer um fetch de chaves públicas — isso seria um amplificador de
 *      tráfego trivial de acionar por quem já está barrado.
 *   3. Só então o Access JWT é verificado criptograficamente.
 *   4. next() só roda com JWT válido.
 *
 * `verifyAccess` é OBRIGATÓRIO no tipo, não opcional: um chamador que
 * esquecesse de passá-lo desligaria a autenticação inteira em silêncio.
 * Fail-closed por construção de tipo, não por convenção.
 */
export async function runHmlDeploymentBoundary<TNextResult>(
  input: HmlDeploymentRequestInput & {
    next: (options?: HmlNextOptions) => TNextResult | Promise<TNextResult>;
    verifyAccess: () => Promise<HmlAccessVerification>;
  },
): Promise<TNextResult | Response> {
  const declaration = classifyHmlDeploymentDeclaration(input.env.FIBT_HML_DEPLOYMENT_ENABLED);

  if (declaration === "not_declared") return input.next();

  const decision = assertHmlDeploymentRequestAllowed(input);
  if (!decision.allowed) return hmlDeploymentBlockedResponse();

  const access = await input.verifyAccess();
  if (!access.valid) return accessDeniedResponse();

  return input.next({ context: { hmlAccessIdentity: access.identity } });
}
