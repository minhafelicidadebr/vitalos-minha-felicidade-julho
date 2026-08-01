// Guarda dura de ambiente para qualquer harness que toque um Supabase remoto.
//
// Por que isto existe: antes da onda de desacoplamento, o `.env` VERSIONADO
// apontava para o projeto de PRODUÇÃO e estava presente em toda worktree. Um
// script que lesse SUPABASE_URL acertava produção por padrão, em silêncio. As
// variáveis de staging são deliberadamente namespaced (STAGING_*) para que isso
// não possa acontecer por acidente — este módulo torna a proteção explícita e
// testável, em vez de deixá-la dependendo de disciplina.
//
// O `.env` VOLTOU a ser versionado (é requisito do build público do Lovable:
// as variáveis VITE_* precisam estar no repositório para o Vite embuti-las no
// bundle) — mas isso não reabre o incidente original, porque `.env` carrega
// só configuração PÚBLICA allowlisted (URL do projeto, publishable key com
// role anon), nunca `VITALOS_DB_TARGET` nem nada privilegiado. `.env.local`
// continua ignorado, e é dele que vêm as credenciais reais de staging usadas
// por este guard. Qualquer script de staging precisa validar o `project_ref`
// exato do alvo (não basta "é uma URL remota" — ver identidade exata em
// environment-contract.ts), e nenhuma variável privilegiada pode ser exposta
// sob prefixo VITE_ — ver `recusarSecretExposta()` abaixo.
//
// O ref de produção NÃO é fixado aqui: ele é derivado, em tempo de execução, de
// SUPABASE_URL (sem prefixo VITE_). Se o alvo de staging coincidir com esse
// alvo padrão, o processo aborta antes de qualquer I/O. Assim a guarda continua
// correta se o projeto mudar, e nenhum identificador de produção entra no
// código versionado.
//
// Por que SOMENTE SUPABASE_URL, e não VITE_SUPABASE_URL também: a validação
// visual da FIBT-1 precisou apontar VITE_SUPABASE_URL para staging de propósito
// (é a variável que o CLIENTE REAL do navegador lê) via .env.local, gitignored.
// Nesse momento, checar VITE_SUPABASE_URL como "sempre produção" vira falso
// positivo — recusaria o próprio staging que acabou de ser apontado ali
// intencionalmente. SUPABASE_URL (sem VITE_) é lido só no server/SSR e nunca é
// sobrescrito por .env.local, então continua sendo o indicador confiável.
//
// As primitivas de ref (extração e mascaramento) vêm de environment-contract:
// são a mesma regra que o preflight de build aplica, e duas cópias divergiriam.

import { maskRef, projectRefFromUrl as refDaUrl } from "../env/environment-contract";

export { maskRef };

export interface StagingTarget {
  url: string;
  projectRef: string;
  /** Ref mascarado, seguro para relatório (`abcd...wxyz`). */
  maskedRef: string;
  publishableKey: string;
  secretKey: string;
}

/** Variante que lança — dentro do harness, URL irreconhecível é sempre erro. */
export function projectRefFromUrl(url: string): string {
  const ref = refDaUrl(url);
  if (!ref) throw new Error(`URL Supabase irreconhecível: ${url.trim().slice(0, 24)}...`);
  return ref;
}

/**
 * Refs que este harness nunca pode tocar: o apontado por SUPABASE_URL (sem
 * prefixo VITE_). Deliberadamente NÃO inclui VITE_SUPABASE_URL — ver o
 * comentário no topo do arquivo sobre por quê.
 */
export function forbiddenRefs(env: Record<string, string | undefined>): Set<string> {
  const out = new Set<string>();
  const url = env.SUPABASE_URL;
  if (url) {
    const ref = refDaUrl(url);
    // URL malformada na env padrão não é problema deste guard.
    if (ref) out.add(ref);
  }
  for (const extra of (env.FORBIDDEN_PROJECT_REFS ?? "").split(",")) {
    const ref = extra.trim();
    if (ref) out.add(ref);
  }
  return out;
}

/**
 * Nenhuma chave privilegiada pode existir sob prefixo VITE_: tudo que começa
 * com VITE_ é injetado no bundle do navegador em build time. Uma secret key
 * assim exposta não vaza "se alguém errar" — ela já está publicada.
 */
function recusarSecretExposta(env: Record<string, string | undefined>): void {
  const expostas = Object.keys(env).filter((k) => /^VITE_.*(SECRET|SERVICE_ROLE)/i.test(k));
  if (expostas.length > 0) {
    throw new Error(
      `RECUSADO: variável privilegiada sob prefixo VITE_ (${expostas.join(", ")}). ` +
        "Tudo que começa com VITE_ é embutido no bundle do navegador.",
    );
  }
}

/**
 * Resolve o alvo de staging a partir das variáveis STAGING_*, recusando
 * qualquer ref que o ambiente padrão aponte. Nunca lê SUPABASE_URL como fonte
 * de alvo — só como fonte de recusa.
 *
 * Se STAGING_SUPABASE_PROJECT_REF estiver declarado, ele precisa bater com o
 * ref real extraído da URL. Declarar um projeto e apontar para outro é o tipo
 * de divergência que passa despercebida numa revisão de diff.
 */
export function requireStagingTarget(
  env: Record<string, string | undefined> = process.env,
): StagingTarget {
  recusarSecretExposta(env);

  const url = env.STAGING_SUPABASE_URL;
  const publishableKey = env.STAGING_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = env.STAGING_SUPABASE_SECRET_KEY;

  if (!url) {
    throw new Error(
      "STAGING_SUPABASE_URL ausente — este harness não lê SUPABASE_URL, que aponta para produção.",
    );
  }
  if (!publishableKey) throw new Error("STAGING_SUPABASE_PUBLISHABLE_KEY ausente.");
  if (!secretKey) throw new Error("STAGING_SUPABASE_SECRET_KEY ausente.");

  const projectRef = projectRefFromUrl(url);

  const declarado = env.STAGING_SUPABASE_PROJECT_REF?.trim();
  if (declarado && declarado !== projectRef) {
    throw new Error(
      `RECUSADO: STAGING_SUPABASE_PROJECT_REF declara ${maskRef(declarado)}, ` +
        `mas STAGING_SUPABASE_URL aponta para ${maskRef(projectRef)}.`,
    );
  }

  const forbidden = forbiddenRefs(env);
  if (forbidden.has(projectRef)) {
    throw new Error(
      `RECUSADO: o alvo de staging (${maskRef(projectRef)}) coincide com o projeto apontado ` +
        "pelas variáveis padrão do ambiente (produção). Nenhuma operação permitida.",
    );
  }

  return { url: url.trim(), projectRef, maskedRef: maskRef(projectRef), publishableKey, secretKey };
}

/** Prefixo de todo dado sintético desta onda — torna a limpeza determinística. */
export const SYNTHETIC_PREFIX = "fibt1-synth-";

/** Recusa qualquer identificador que não seja reconhecidamente sintético. */
export function assertSynthetic(label: string, value: string): void {
  if (!value.includes(SYNTHETIC_PREFIX)) {
    throw new Error(
      `RECUSADO: ${label} não é sintético ("${value}"). Esperado conter "${SYNTHETIC_PREFIX}".`,
    );
  }
}
