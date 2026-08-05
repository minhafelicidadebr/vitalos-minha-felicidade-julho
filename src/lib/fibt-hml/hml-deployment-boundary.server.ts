// Contenção de rotas do deployment isolado HML (FIBT-HML-2C) — decide, para
// uma requisição chegando ao Worker Cloudflare vitalos-fibt-hml-isg, se o
// caminho pertence à allowlist mínima necessária para a homologação
// sintética, ou se deve ser recusado ANTES de qualquer loader, server
// function, consulta ao banco ou renderização de dashboard.
//
// Puro: recebe env + pathname como dados, nunca lê process.env nem a
// Request diretamente — testável sem simular HTTP. Ativo SOMENTE quando
// VITE_FIBT_HML_ENABLED="true" — um deployment comum (produção real) nunca
// tem nenhuma requisição afetada por este módulo.
//
// ESCOPO HONESTO DESTA PROTEÇÃO (registrado, não escondido):
//
// Cobre com certeza toda NAVEGAÇÃO DE PÁGINA — toda rota do TanStack Router
// desce da rota raiz, e um `beforeLoad` nela intercepta 100% dos caminhos
// de página antes de qualquer loader/componente rodar. Isso fecha o risco
// principal desta fase: dashboard, admin, relatórios e qualquer outra tela
// do app NUNCA renderizam nesta instância.
//
// NÃO distingue, por si só, uma chamada direta a `/_serverFn/<hash>` que
// pertence a checkInviteToken/submitSurveyResponses de uma chamada direta
// ao hash de OUTRA função do app. O id de cada server function é
// `sha256(arquivo--nomeDaFunção)` — determinístico, mas opaco fora do
// compilador do TanStack Start; hardcodar um mapa de hashes aqui seria um
// valor mágico frágil que quebra em silêncio a cada mudança de arquivo/nome
// em QUALQUER lugar do app, não uma allowlist de verdade. Por isso
// `/_serverFn/` é liberado por prefixo, não por hash individual — a
// contenção completa desse caminho específico é o Cloudflare Access na
// frente do Worker inteiro (ver docs/fibt-hml/CLOUDFLARE_HML_DEPLOYMENT.md),
// não este módulo sozinho.

export interface HmlDeploymentEnvLike {
  VITE_FIBT_HML_ENABLED?: string;
}

/** Caminhos exatos permitidos — comparação estrita, sem prefixo. */
const HML_ALLOWED_EXACT_PATHS = ["/api/fibt-hml/attestation", "/favicon.ico"] as const;

/**
 * Prefixos permitidos:
 * - /convite/  → a única página de homologação sintética;
 * - /assets/   → JS/CSS/ícones content-hashed, sem dado de aplicação;
 * - /_serverFn/ → ver nota de escopo acima — liberado por prefixo, não por hash;
 * - /_build/   → chunks internos que o próprio TanStack Start/Vite pode servir
 *   em runtime SSR (mesma natureza de /assets/ — sem dado de aplicação).
 */
const HML_ALLOWED_PREFIXES = ["/convite/", "/assets/", "/_serverFn/", "/_build/"] as const;

export type HmlDeploymentRouteDecision =
  | { allowed: true }
  | { allowed: false; reason: "HML_ROUTE_NOT_ALLOWLISTED" };

/** Ativo somente quando o deployment declara HML — nunca em produção comum. */
export function isHmlDeploymentActive(env: HmlDeploymentEnvLike): boolean {
  return env.VITE_FIBT_HML_ENABLED === "true";
}

/**
 * Decide se `pathname` pode prosseguir. Quando HML não está ativo, sempre
 * permite (comportamento de produção normal, inalterado). Quando ativo,
 * fail-closed: qualquer caminho fora da allowlist é recusado.
 */
export function assertHmlDeploymentRouteAllowed(
  pathname: string,
  env: HmlDeploymentEnvLike,
): HmlDeploymentRouteDecision {
  if (!isHmlDeploymentActive(env)) return { allowed: true };

  // Nunca confia em query string/fragment para a decisão — só o path.
  const normalized = pathname.split("?")[0]?.split("#")[0] ?? pathname;

  if ((HML_ALLOWED_EXACT_PATHS as readonly string[]).includes(normalized)) {
    return { allowed: true };
  }
  if (HML_ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return { allowed: true };
  }

  return { allowed: false, reason: "HML_ROUTE_NOT_ALLOWLISTED" };
}

/** Resposta sanitizada — nunca revela metadados da aplicação (nome de rota, stack, etc). */
export function hmlDeploymentBlockedResponseBody(): { status: 404; body: string } {
  return { status: 404, body: "Not found." };
}
