// O `.env` deste projeto é VERSIONADO de propósito — requisito do Lovable: as
// variáveis VITE_* são lidas em build time e embutidas no bundle, e o Secrets
// manager não as substitui (ele guarda secret de servidor, e VITE_* não é
// secret). Ignorar o arquivo quebra preview e publicação.
//
// Então a proteção não pode ser "esconder o .env". Ela é composta por três
// invariantes que estes testes fixam:
//
// 1. O `.env` só carrega nomes de uma ALLOWLIST estrita, e cada valor precisa
//    ter natureza pública comprovada — a publishable key é aceita porque é um
//    JWT com role "anon"; a mesma variável com role "service_role" reprova.
// 2. VITALOS_RUNTIME_ENV e VITALOS_DB_TARGET NÃO têm default versionado. Esta
//    é a invariante que de fato impede o incidente original: sem default para
//    "onde roda" e "que banco toca", nenhum comando resolve produção por
//    omissão.
// 3. Credencial privilegiada nunca entra, em nenhuma forma.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const raiz = process.cwd();
const lerEnv = (nome: string) => readFileSync(join(raiz, nome), "utf8");

/** Pares nome=valor de um arquivo .env, ignorando comentário e linha vazia. */
function variaveis(conteudo: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of conteudo.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l);
    if (m) out.set(m[1]!, m[2]!.replace(/^["']|["']$/g, ""));
  }
  return out;
}

/**
 * Allowlist do `.env` versionado: nome → natureza pública exigida.
 *
 * `publishable-jwt` não é "qualquer JWT": o payload é decodificado e a claim
 * `role` precisa ser `anon`. Uma service role key também é um JWT, e a
 * diferença entre publicar uma e publicar a outra é a diferença entre
 * configuração e incidente.
 */
type Natureza =
  | "url-publica"
  | "publishable-jwt"
  | "publishable-opaca"
  | "flag-booleana"
  | "project-ref-publico";

const ALLOWLIST_ENV: Record<string, Natureza> = {
  SUPABASE_URL: "url-publica",
  SUPABASE_PUBLISHABLE_KEY: "publishable-jwt",
  VITE_SUPABASE_URL: "url-publica",
  VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-jwt",
  VITE_APP_URL: "url-publica",
  VITE_FIBT_PILOT_ENABLED: "flag-booleana",
  // Identidade de produção: público por natureza (é o subdomínio da URL da
  // API), sem prefixo VITE_ — não vai para o bundle, só serve ao preflight e
  // aos guards. O par staging (VITALOS_STAGING_PROJECT_REF) NUNCA entra aqui
  // — ver os testes de "7. não contém variável de staging" abaixo.
  VITALOS_PRODUCTION_PROJECT_REF: "project-ref-publico",
  // Gerados pelo Lovable Cloud no .env: o mesmo identificador público do projeto
  // (subdomínio da URL da API). O teste 4b confere o formato do valor.
  SUPABASE_PROJECT_ID: "project-ref-publico",
  VITE_SUPABASE_PROJECT_ID: "project-ref-publico",
};

/** Claim `role` de um JWT, sem verificar assinatura (só classificação). */
function papelDoJwt(valor: string): string | null {
  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(partes[1]!, "base64").toString("utf8")) as {
      role?: unknown;
    };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function conformeNatureza(valor: string, natureza: Natureza): boolean {
  switch (natureza) {
    case "url-publica":
      return /^https?:\/\/[^\s]+$/.test(valor);
    case "publishable-jwt":
      // Aceita o formato novo (opaco) OU um JWT cuja role seja exatamente anon.
      return valor.startsWith("sb_publishable_") || papelDoJwt(valor) === "anon";
    case "publishable-opaca":
      return valor.startsWith("sb_publishable_");
    case "flag-booleana":
      return valor === "true" || valor === "false";
    case "project-ref-publico":
      // Mesmo formato que projectRefFromUrl extrai: 20 caracteres minúsculos.
      return /^[a-z0-9]{20}$/.test(valor);
  }
}

/** Nomes que jamais podem aparecer num arquivo .env versionado. */
const NOMES_PROIBIDOS = [
  /SERVICE_ROLE/i,
  /SECRET/i,
  /^STAGING_/i,
  /PASSWORD/i,
  /PRIVATE_KEY/i,
  /_TOKEN$/i,
];

describe("1-3. rastreamento dos arquivos de ambiente", () => {
  const rastreados = (): string[] => {
    const r = spawnSync("git", ["ls-files"], { cwd: raiz, encoding: "utf8" });
    if (r.status !== 0) throw new Error("git ls-files falhou");
    return r.stdout.split(/\r?\n/).filter(Boolean);
  };

  const ignorado = (caminho: string): boolean =>
    spawnSync("git", ["check-ignore", caminho], { cwd: raiz, encoding: "utf8" }).status === 0;

  test("1. .env ESTÁ rastreado — o Lovable precisa dele no repositório", () => {
    expect(rastreados()).toContain(".env");
  });

  test("2. .env NÃO está ignorado — ignorá-lo quebra preview e publicação", () => {
    expect({ arquivo: ".env", ignorado: ignorado(".env") }).toEqual({
      arquivo: ".env",
      ignorado: false,
    });
  });

  test("3. .env.local está ignorado — é nele que vive a credencial real", () => {
    expect({ arquivo: ".env.local", ignorado: ignorado(".env.local") }).toEqual({
      arquivo: ".env.local",
      ignorado: true,
    });
    expect(ignorado(".env.producao.local")).toBe(true);
  });

  test(".env.example continua versionado — é o modelo", () => {
    expect(rastreados()).toContain(".env.example");
  });

  test("nenhum .env de ambiente real foi versionado por engano", () => {
    const envs = rastreados().filter((f) => /(^|\/)\.env($|\.)/.test(f));
    expect(envs.sort()).toEqual([".env", ".env.example"]);
  });
});

describe("4-7. conteúdo do .env versionado", () => {
  const env = () => variaveis(lerEnv(".env"));

  test("4. só contém nomes da allowlist", () => {
    const fora = [...env().keys()].filter((k) => !(k in ALLOWLIST_ENV));
    expect({ fora }).toEqual({ fora: [] });
  });

  test("4b. cada valor tem a natureza pública que a allowlist exige", () => {
    const violacoes: string[] = [];
    for (const [nome, valor] of env()) {
      const natureza = ALLOWLIST_ENV[nome];
      if (!natureza) continue; // coberto pelo teste anterior
      if (!conformeNatureza(valor, natureza)) violacoes.push(`${nome} (esperado: ${natureza})`);
    }
    expect({ violacoes }).toEqual({ violacoes: [] });
  });

  test("5. não contém nome de variável privilegiada", () => {
    const suspeitos = [...env().keys()].filter((k) => NOMES_PROIBIDOS.some((re) => re.test(k)));
    expect({ suspeitos }).toEqual({ suspeitos: [] });
  });

  test("6. nenhum JWT com role diferente de anon — service role reprova", () => {
    const papeis = [...env().values()]
      .map(papelDoJwt)
      .filter((p): p is string => p !== null);
    const indevidos = papeis.filter((p) => p !== "anon");
    expect({ indevidos }).toEqual({ indevidos: [] });
  });

  test("6b. nenhuma chave no formato secreto novo (sb_secret_)", () => {
    expect(lerEnv(".env")).not.toMatch(/\bsb_secret_/);
  });

  test("7. não contém variável de staging", () => {
    const src = lerEnv(".env");
    // Fora de comentário: o cabeçalho do arquivo CITA os nomes proibidos.
    const semComentario = src
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("#"))
      .join("\n");
    expect(semComentario).not.toMatch(/STAGING_/);
  });

  test("VITALOS_STAGING_PROJECT_REF nunca entra no .env versionado", () => {
    // O ref de produção é público E versionado; o de staging é público mas
    // NUNCA versionado — a diferença não é sensibilidade do dado, é que só
    // produção tem um valor único e estável que todo clone deve conhecer.
    // Staging varia por pessoa/ambiente, então mora só em .env.local.
    expect(env().has("VITALOS_STAGING_PROJECT_REF")).toBe(false);
  });

  test("nenhuma variável VITE_ carrega dado privilegiado", () => {
    const vazadas = [...env().keys()].filter((k) => /^VITE_.*(SECRET|SERVICE_ROLE|PASSWORD)/i.test(k));
    expect({ vazadas }).toEqual({ vazadas: [] });
  });
});

describe("8-10. defaults que não podem existir", () => {
  const env = () => variaveis(lerEnv(".env"));

  test("8. VITE_FIBT_PILOT_ENABLED=false é o padrão produtivo", () => {
    expect(env().get("VITE_FIBT_PILOT_ENABLED")).toBe("false");
  });

  test("9. VITALOS_RUNTIME_ENV não tem default versionado", () => {
    // Esta é a invariante que substitui "esconder o .env": sem default para
    // onde o código roda, nenhum comando assume produção por omissão.
    expect(env().has("VITALOS_RUNTIME_ENV")).toBe(false);
  });

  test("10. VITALOS_DB_TARGET não tem default versionado", () => {
    expect(env().has("VITALOS_DB_TARGET")).toBe(false);
  });

  test("nem o .env.example fixa essas duas como se fossem default global", () => {
    // No .env.example elas aparecem como MODELO a copiar para .env.local —
    // aceitável, porque .env.example nunca é lido em runtime. O que não pode
    // é estarem no .env, que é lido.
    expect(existsSync(join(raiz, ".env.example"))).toBe(true);
    expect(variaveis(lerEnv(".env")).has("VITALOS_RUNTIME_ENV")).toBe(false);
  });
});

describe("outros arquivos de configuração versionados", () => {
  // O `.env` está fora desta lista porque legitimamente contém o ref público
  // de produção — a proteção dele é a allowlist acima, mais estrita que uma
  // varredura por formato. `.env.example` fica fora pelo mesmo motivo do lado
  // oposto: é DOCUMENTAÇÃO do contrato, cita os NOMES das variáveis de
  // identidade (não valores reais) e é coberto por seu próprio describe
  // abaixo, que verifica ausência de valor real por outro caminho.
  const ARQUIVOS = [
    ".gitignore",
    ".lovable/project.json",
    ".github/workflows/gate.yml",
    "package.json",
    "vite.config.ts",
  ];

  const PADROES = [
    { label: "URL de projeto Supabase real", re: /https:\/\/[a-z0-9]{20}\.supabase\.co/i },
    { label: "project_ref de 20 caracteres", re: /\b[a-z]{20}\b/ },
    { label: "JWT real", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
    { label: "chave Supabase com corpo real", re: /\bsb_(publishable|secret)_[A-Za-z0-9_-]{10,}/ },
  ];

  for (const rel of ARQUIVOS) {
    test(`${rel} não contém credencial nem identificador de projeto`, () => {
      const caminho = join(raiz, rel);
      if (!existsSync(caminho)) return;
      const conteudo = readFileSync(caminho, "utf8");
      const achados = PADROES.filter((p) => p.re.test(conteudo)).map((p) => p.label);
      expect({ arquivo: rel, achados }).toEqual({ arquivo: rel, achados: [] });
    });
  }
});

describe(".env.example descreve o contrato de ambiente", () => {
  const exemplo = () => lerEnv(".env.example");

  test("declara as duas dimensões obrigatórias", () => {
    const src = exemplo();
    expect(src).toContain("VITALOS_RUNTIME_ENV");
    expect(src).toContain("VITALOS_DB_TARGET");
  });

  test("declara o feature gate da FIB-T como desabilitado", () => {
    expect(exemplo()).toMatch(/VITE_FIBT_PILOT_ENABLED\s*=\s*"?false"?/);
  });

  test("usa domínio inerte .invalid, nunca um host real", () => {
    const src = exemplo();
    expect(src).toContain(".invalid");
    expect(src).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
  });

  test("instrui copiar para .env.local, não para .env", () => {
    expect(exemplo()).toContain(".env.local");
  });
});
