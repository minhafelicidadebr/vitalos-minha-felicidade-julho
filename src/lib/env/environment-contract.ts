// Contrato de ambiente — duas dimensões independentes, nunca uma só.
//
// Por que duas e não um único APP_ENV: "onde o código roda" e "qual banco ele
// toca" são decisões separadas que falham de formas separadas. Um só valor
// obriga a escolher entre `local` (e perder a informação de qual banco) ou
// `staging` (e perder a informação de que é a máquina de alguém). A combinação
// perigosa — rodar local contra o banco de produção — fica indistinguível de
// desenvolvimento normal. Com duas dimensões, ela é um estado nomeado e
// recusável.
//
// Este módulo é PURO: não lê process.env, não faz I/O, não imprime. Quem lê o
// ambiente é `scripts/environment-preflight.ts`. Assim o contrato inteiro é
// testável sem simular ambiente.

/** Onde o processo está rodando. */
export const RUNTIME_ENVS = ["local", "preview", "ci", "production"] as const;
export type RuntimeEnv = (typeof RUNTIME_ENVS)[number];

/** Qual banco o processo pode tocar. */
export const DB_TARGETS = ["local", "test", "staging", "production"] as const;
export type DbTarget = (typeof DB_TARGETS)[number];

/**
 * Matriz permitida. Tudo que não está aqui é proibido — inclusive combinações
 * que "fariam sentido": a lista é fechada de propósito, para que adicionar uma
 * combinação nova seja uma decisão explícita e revisável, nunca um efeito
 * colateral.
 */
const MATRIZ_PERMITIDA: Readonly<Record<RuntimeEnv, readonly DbTarget[]>> = {
  ci: ["test"],
  preview: ["staging"],
  production: ["production"],
  local: ["local", "staging"],
};

export function isRuntimeEnv(v: string | undefined): v is RuntimeEnv {
  return typeof v === "string" && (RUNTIME_ENVS as readonly string[]).includes(v);
}

export function isDbTarget(v: string | undefined): v is DbTarget {
  return typeof v === "string" && (DB_TARGETS as readonly string[]).includes(v);
}

export function isCombinationAllowed(runtime: RuntimeEnv, target: DbTarget): boolean {
  return MATRIZ_PERMITIDA[runtime].includes(target);
}

/** Combinações aceitas, para mensagem de erro legível. */
export function allowedTargetsFor(runtime: RuntimeEnv): readonly DbTarget[] {
  return MATRIZ_PERMITIDA[runtime];
}

/**
 * Mascaramento de ref. Um project_ref não é segredo (aparece na URL pública da
 * API), mas imprimir o valor inteiro em log de CI o espalha para lugares que
 * ninguém audita. A forma mascarada basta para o operador confirmar "é o
 * projeto que eu esperava" sem produzir esse rastro.
 */
export function maskRef(ref: string): string {
  if (ref.length <= 8) return "****";
  return `${ref.slice(0, 4)}...${ref.slice(-4)}`;
}

/** URL inerte reservada para CI: o domínio .invalid não resolve, por RFC 2606. */
export function isInertUrl(url: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.invalid(\/|$)/i.test(url.trim());
}

/** Supabase rodando na própria máquina (CLI local, container). */
export function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(url.trim());
}

/**
 * Extrai o project_ref de uma URL Supabase real. Devolve null (em vez de
 * lançar) porque a decisão sobre o que fazer com uma URL irreconhecível
 * depende do modo — em ci/test uma URL inerte é esperada, não um erro.
 */
export function projectRefFromUrl(url: string): string | null {
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.co(\/|$)/i.exec(url.trim());
  return m ? m[1]!.toLowerCase() : null;
}

export interface EnvInput {
  VITALOS_RUNTIME_ENV?: string | undefined;
  VITALOS_DB_TARGET?: string | undefined;
  SUPABASE_URL?: string | undefined;
  VITE_SUPABASE_URL?: string | undefined;
  /** Ref público de produção. Versionado em `.env` — não é segredo. */
  VITALOS_PRODUCTION_PROJECT_REF?: string | undefined;
  /** Ref público de staging. NUNCA versionado — vive só em `.env.local`. */
  VITALOS_STAGING_PROJECT_REF?: string | undefined;
}

export type EnvVerdict =
  | {
      ok: true;
      runtime: RuntimeEnv;
      dbTarget: DbTarget;
      /** null quando o alvo é inerte (ci/test) — não há projeto real. */
      projectRef: string | null;
      maskedRef: string;
    }
  | { ok: false; erros: string[] };

/**
 * Valida o ambiente inteiro. Fail-closed: qualquer ausência, valor
 * desconhecido, combinação fora da matriz ou divergência cliente↔servidor
 * reprova.
 *
 * Nenhuma mensagem de erro carrega URL completa ou chave — só o nome da
 * variável e, quando útil, o ref mascarado. Erro de ambiente costuma ir parar
 * em log de CI, que é bem menos protegido que o ambiente que ele descreve.
 */
export function validateEnvironment(env: EnvInput): EnvVerdict {
  const erros: string[] = [];

  const runtimeBruto = env.VITALOS_RUNTIME_ENV?.trim();
  const targetBruto = env.VITALOS_DB_TARGET?.trim();

  if (!runtimeBruto) {
    erros.push(`VITALOS_RUNTIME_ENV ausente. Valores aceitos: ${RUNTIME_ENVS.join(", ")}.`);
  } else if (!isRuntimeEnv(runtimeBruto)) {
    erros.push(
      `VITALOS_RUNTIME_ENV desconhecido. Valores aceitos: ${RUNTIME_ENVS.join(", ")}.`,
    );
  }

  if (!targetBruto) {
    erros.push(`VITALOS_DB_TARGET ausente. Valores aceitos: ${DB_TARGETS.join(", ")}.`);
  } else if (!isDbTarget(targetBruto)) {
    erros.push(`VITALOS_DB_TARGET desconhecido. Valores aceitos: ${DB_TARGETS.join(", ")}.`);
  }

  // Sem as duas dimensões válidas não há o que validar adiante: seguir
  // produziria erros derivados que escondem a causa real.
  if (erros.length > 0) return { ok: false, erros };

  const runtime = runtimeBruto as RuntimeEnv;
  const dbTarget = targetBruto as DbTarget;

  if (!isCombinationAllowed(runtime, dbTarget)) {
    return {
      ok: false,
      erros: [
        `Combinação proibida: VITALOS_RUNTIME_ENV=${runtime} com VITALOS_DB_TARGET=${dbTarget}. ` +
          `Para ${runtime}, os alvos aceitos são: ${allowedTargetsFor(runtime).join(", ")}.`,
      ],
    };
  }

  const serverUrl = env.SUPABASE_URL?.trim();
  const clientUrl = env.VITE_SUPABASE_URL?.trim();

  if (!serverUrl) erros.push("SUPABASE_URL ausente (lado servidor/SSR).");
  if (!clientUrl) erros.push("VITE_SUPABASE_URL ausente (lado navegador).");
  if (erros.length > 0) return { ok: false, erros };

  // Cada alvo aceita uma NATUREZA de URL, e só ela. Assim declarar `test` e
  // apontar para um projeto real (ou o contrário) é impossível, não apenas
  // desaconselhado.
  const natureza = (u: string): "inerte" | "local" | "remota" =>
    isInertUrl(u) ? "inerte" : isLocalUrl(u) ? "local" : "remota";

  const natServidor = natureza(serverUrl!);
  const natCliente = natureza(clientUrl!);

  if (natServidor !== natCliente) {
    return {
      ok: false,
      erros: [
        `SUPABASE_URL (${natServidor}) e VITE_SUPABASE_URL (${natCliente}) divergem em ` +
          "natureza. Servidor e navegador nunca podem falar com bancos diferentes.",
      ],
    };
  }

  const naturezaExigida: Record<DbTarget, "inerte" | "local" | "remota"> = {
    test: "inerte",
    local: "local",
    staging: "remota",
    production: "remota",
  };

  if (natServidor !== naturezaExigida[dbTarget]) {
    return {
      ok: false,
      erros: [
        `VITALOS_DB_TARGET=${dbTarget} exige URL ${naturezaExigida[dbTarget]}, ` +
          `mas as variáveis apontam para uma URL ${natServidor}.`,
      ],
    };
  }

  if (natServidor !== "remota") {
    // Inerte (.invalid) ou local (localhost): não há projeto remoto a conferir,
    // e é exatamente o que se quer nesses modos.
    return {
      ok: true,
      runtime,
      dbTarget,
      projectRef: null,
      maskedRef: `(${natServidor})`,
    };
  }

  const refServidor = projectRefFromUrl(serverUrl!);
  const refCliente = projectRefFromUrl(clientUrl!);

  if (!refServidor) erros.push("SUPABASE_URL não é uma URL Supabase reconhecível.");
  if (!refCliente) erros.push("VITE_SUPABASE_URL não é uma URL Supabase reconhecível.");
  if (erros.length > 0) return { ok: false, erros };

  if (refServidor !== refCliente) {
    return {
      ok: false,
      erros: [
        `Servidor e navegador apontam para projetos DIFERENTES: ` +
          `SUPABASE_URL=${maskRef(refServidor!)} vs VITE_SUPABASE_URL=${maskRef(refCliente!)}. ` +
          "Essa divergência produz um app que lê de um banco e escreve em outro.",
      ],
    };
  }

  // A partir daqui, dbTarget só pode ser "staging" ou "production": são os
  // dois únicos alvos cuja natureza exigida é "remota" (local exige loopback,
  // test exige .invalid). "É uma URL remota" nunca foi evidência suficiente
  // de QUAL ambiente é — staging e produção são igualmente remotos. A
  // identidade exige o ref declarado explicitamente para aquele alvo.
  const prodRefDeclarado = env.VITALOS_PRODUCTION_PROJECT_REF?.trim().toLowerCase() || undefined;
  const stagingRefDeclarado = env.VITALOS_STAGING_PROJECT_REF?.trim().toLowerCase() || undefined;

  // Sanidade de configuração, independente de qual alvo está sendo validado
  // agora: os dois refs, quando ambos declarados, nunca podem ser o mesmo
  // projeto — senão "produção" e "staging" deixam de ser distinguíveis.
  if (prodRefDeclarado && stagingRefDeclarado && prodRefDeclarado === stagingRefDeclarado) {
    return {
      ok: false,
      erros: [
        `VITALOS_PRODUCTION_PROJECT_REF e VITALOS_STAGING_PROJECT_REF declaram o mesmo ` +
          `projeto (${maskRef(prodRefDeclarado)}). Produção e staging nunca podem ser o mesmo ref.`,
      ],
    };
  }

  const nomeVarEsperada =
    dbTarget === "production" ? "VITALOS_PRODUCTION_PROJECT_REF" : "VITALOS_STAGING_PROJECT_REF";
  const refDeclarado = dbTarget === "production" ? prodRefDeclarado : stagingRefDeclarado;

  if (!refDeclarado) {
    return {
      ok: false,
      erros: [
        `VITALOS_DB_TARGET=${dbTarget} exige ${nomeVarEsperada} declarado — uma URL remota ` +
          "sozinha não é evidência de qual ambiente é.",
      ],
    };
  }

  if (refDeclarado !== refServidor) {
    return {
      ok: false,
      erros: [
        `${nomeVarEsperada} declara ${maskRef(refDeclarado)}, mas SUPABASE_URL/VITE_SUPABASE_URL ` +
          `apontam para ${maskRef(refServidor!)}.`,
      ],
    };
  }

  return {
    ok: true,
    runtime,
    dbTarget,
    projectRef: refServidor!,
    maskedRef: maskRef(refServidor!),
  };
}
