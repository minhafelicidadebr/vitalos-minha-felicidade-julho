// Guarda dura de ambiente para qualquer harness que toque um Supabase remoto.
//
// Por que isto existe: o `.env` VERSIONADO deste repositório aponta para o
// projeto de PRODUÇÃO e está presente em toda worktree. Um script que leia
// SUPABASE_URL acerta produção por padrão, em silêncio. As variáveis de
// staging são deliberadamente namespaced (STAGING_*) para que isso não possa
// acontecer por acidente — este módulo torna a proteção explícita e testável,
// em vez de deixá-la dependendo de disciplina.
//
// O ref de produção NÃO é fixado aqui: ele é derivado, em tempo de execução,
// das variáveis padrão do próprio ambiente (SUPABASE_URL / VITE_SUPABASE_URL).
// Se o alvo de staging coincidir com o alvo padrão, o processo aborta antes de
// qualquer I/O. Assim a guarda continua correta se o projeto mudar, e nenhum
// identificador de produção entra no código versionado.

export interface StagingTarget {
  url: string;
  projectRef: string;
  /** Ref mascarado, seguro para relatório (`abcd...wxyz`). */
  maskedRef: string;
  publishableKey: string;
  secretKey: string;
}

export function maskRef(ref: string): string {
  if (ref.length <= 8) return "****";
  return `${ref.slice(0, 4)}...${ref.slice(-4)}`;
}

export function projectRefFromUrl(url: string): string {
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(url.trim());
  if (!m) throw new Error(`URL Supabase irreconhecível: ${url.trim().slice(0, 24)}...`);
  return m[1]!;
}

/** Refs que este harness nunca pode tocar: os apontados pelas variáveis padrão (produção). */
export function forbiddenRefs(env: Record<string, string | undefined>): Set<string> {
  const out = new Set<string>();
  for (const key of ["SUPABASE_URL", "VITE_SUPABASE_URL"]) {
    const url = env[key];
    if (!url) continue;
    try {
      out.add(projectRefFromUrl(url));
    } catch {
      // URL malformada na env padrão não é problema deste guard.
    }
  }
  for (const extra of (env.FORBIDDEN_PROJECT_REFS ?? "").split(",")) {
    const ref = extra.trim();
    if (ref) out.add(ref);
  }
  return out;
}

/**
 * Resolve o alvo de staging a partir das variáveis STAGING_*, recusando
 * qualquer ref que o ambiente padrão aponte. Nunca lê SUPABASE_URL como
 * fonte de alvo — só como fonte de recusa.
 */
export function requireStagingTarget(
  env: Record<string, string | undefined> = process.env,
): StagingTarget {
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
