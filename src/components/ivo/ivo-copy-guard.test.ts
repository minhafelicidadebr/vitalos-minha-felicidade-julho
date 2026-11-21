/**
 * Guarda de copy do IVO (PI-13 · F3).
 *
 * A interface do IVO não pode afirmar o que o produto não sustenta: nada de laudo, conformidade NR-1
 * automática, blindagem jurídica, "garante", eficácia comprovada nem índice IVO aprovado/oficial. Este teste
 * varre os TEXTOS de interface (literais de string, partes de template e texto JSX; nunca comentários nem
 * caminhos de import) de:
 *   - src/components/ivo (menos testes);
 *   - src/lib/ivo (menos testes): mensagens e rótulos do servidor e das views;
 *   - src/routes/ivo-integral*.tsx.
 *
 * Lista: a base do FIBT (FIBT_FORBIDDEN_CLAIM_PHRASES, que este teste passa a consumir) mais a família do
 * IVO abaixo. A copy precisa dizer o que o IVO NÃO é ("não existe índice IVO composto aprovado", "não
 * comprova melhora"), então negação e ressalva são toleradas, por regra estreita: "não", "nunca", "jamais",
 * "nenhum(a)", "nem" ou "sem" ANTES da frase proibida, na mesma frase (ela termina em . ! ? ou ;), ou
 * "experimental" / "não avaliada" em qualquer ponto dela. Negação de outra frase, ou que só vem depois da
 * afirmação, não vale.
 *
 * Somente leitura (fs), sem rede e sem relógio: o resultado só depende dos arquivos. Violação real se
 * corrige na copy; a lista e a tolerância só se ajustam para um falso positivo demonstrado.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { FIBT_FORBIDDEN_CLAIM_PHRASES } from "@/domain/instruments/fibt/fibt-instrument-types";

const ROOT = join(import.meta.dir, "..", "..", "..");

// ─── Lista de claims e regra de tolerância ───────────────────────────────────

/** Minúsculas, sem acento e com travessões como hífen. Mantém o comprimento: índices valem para o original. */
function fold(text: string): string {
  return text
    .replace(/[\u00c0-\u017f]/g, (c) => c.normalize("NFD")[0]!)
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-");
}

interface Claim {
  label: string;
  pattern: RegExp;
}

/** `body` já dobrado (sem acento, minúsculo). Não casa no meio de palavra nem de token com hífen. */
const claim = (label: string, body: string): Claim => ({ label, pattern: new RegExp(String.raw`(?<![\w-])(?:${body})(?![\w-])`, "g") });
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const BASE_CLAIMS: Claim[] = [];
const seen = new Set<string>();
for (const phrase of FIBT_FORBIDDEN_CLAIM_PHRASES) {
  const key = fold(phrase);
  if (seen.has(key)) continue; // "frágil"/"fragil" e "0-1000"/"0–1000" dobram para a mesma frase
  seen.add(key);
  BASE_CLAIMS.push(claim(phrase, escapeRegExp(key).replace(/ /g, String.raw`\s+`)));
}

const IVO_CLAIMS: Claim[] = [
  claim("conformidade NR-1 automática", String.raw`conformidade\s+(?:com\s+a\s+)?nr-?\s?1\s+automatic[ao]`),
  claim("laudo", String.raw`laudos?`),
  claim("blindagem jurídica", String.raw`blindagem\s+juridica`),
  claim("garante", String.raw`garante|garantem|garantimos`),
  claim("comprovadamente reduz", String.raw`comprovadamente\s+(?:reduz|reduzem|melhora|melhoram|elimina|eliminam|previne|previnem)`),
  claim("índice IVO aprovado/oficial", String.raw`indice\s+ivo(?:\s+\w+){0,2}\s+(?:aprovado|oficial)`),
  claim("eficácia comprovada", String.raw`eficacia\s+comprovada`),
];

const CLAIMS = [...BASE_CLAIMS, ...IVO_CLAIMS];

/** Negação: só vale ANTES da frase proibida, na mesma frase. */
const NEGATION = /(?<![\w-])(?:nao|nunca|jamais|nenhum|nenhuma|nem|sem)(?![\w-])/;
/** Ressalva: vale em qualquer ponto da frase. */
const CAVEAT = /(?<![\w-])(?:experimental|nao\s+avaliad[ao]s?)(?![\w-])/;
const SENTENCE_END = /[.!?;]/;

function isTolerated(text: string, start: number, end: number): boolean {
  let from = start;
  while (from > 0 && !SENTENCE_END.test(text[from - 1]!)) from--;
  let to = end;
  while (to < text.length && !SENTENCE_END.test(text[to]!)) to++;
  return NEGATION.test(text.slice(from, start)) || CAVEAT.test(text.slice(from, to));
}

// ─── Extração dos textos de interface e varredura ────────────────────────────

interface Hit {
  file: string;
  line: number;
  claim: string;
  excerpt: string;
  tolerated: boolean;
}

/** Textos que o usuário lê: strings, partes de template e texto JSX, cada um com a linha em que começa. */
function copyOf(file: string, source: string): Array<{ line: number; text: string }> {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Array<{ line: number; text: string }> = [];
  const add = (pos: number, text: string) => {
    if (text.trim()) found.push({ line: sf.getLineAndCharacterOfPosition(pos).line + 1, text });
  };
  const visit = (node: ts.Node): void => {
    // `import ... from "mod"` e `export ... from "mod"` são caminhos de módulo, não texto de interface.
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      add(node.getStart(sf), node.text);
    } else if (ts.isJsxText(node)) {
      const text = node.text.trimStart();
      add(node.pos + (node.text.length - text.length), text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function scanSource(file: string, source: string): { texts: number; hits: Hit[] } {
  const texts = copyOf(file, source);
  const hits: Hit[] = [];
  for (const { line, text: raw } of texts) {
    const text = raw.normalize("NFC");
    const plain = fold(text);
    for (const { label, pattern } of CLAIMS) {
      for (const m of plain.matchAll(pattern)) {
        const start = m.index;
        const end = start + m[0].length;
        hits.push({
          file,
          line: line + (text.slice(0, start).match(/\n/g)?.length ?? 0),
          claim: label,
          excerpt: text.slice(Math.max(0, start - 40), end + 40).replace(/\s+/g, " ").trim(),
          tolerated: isTolerated(plain, start, end),
        });
      }
    }
  }
  return { texts: texts.length, hits };
}

// ─── Escopo ──────────────────────────────────────────────────────────────────

const isTest = (name: string) => /\.test\.[cm]?[jt]sx?$/.test(name);

function listFiles(dir: string, accept: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...listFiles(`${dir}/${entry.name}`, accept));
    else if (accept(entry.name)) out.push(`${dir}/${entry.name}`);
  }
  return out.sort();
}

const SCOPE = [
  ...listFiles("src/components/ivo", (n) => /\.tsx?$/.test(n) && !isTest(n)),
  ...listFiles("src/lib/ivo", (n) => n.endsWith(".ts") && !isTest(n)),
  ...readdirSync(join(ROOT, "src/routes"))
    .filter((n) => /^ivo-integral.*\.tsx$/.test(n) && !isTest(n))
    .sort()
    .map((n) => `src/routes/${n}`),
];

let scanned: Array<{ file: string; texts: number; hits: Hit[] }> | undefined;
function scanScope() {
  scanned ??= SCOPE.map((file) => ({ file, ...scanSource(file, readFileSync(join(ROOT, file), "utf8")) }));
  return scanned;
}

const describeHit = (h: Hit) => `${h.file}:${h.line}  [${h.claim}]  …${h.excerpt}…`;

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("copy do IVO — claims afirmativos proibidos", () => {
  test("nenhum texto de interface do IVO afirma um claim proibido (negação e ressalva são toleradas)", () => {
    const violations = scanScope().flatMap((s) => s.hits.filter((h) => !h.tolerated)).map(describeHit);
    expect(violations).toEqual([]);
  });

  test("o escopo varrido é o do IVO e não é vazio (um guarda que não lê nada aprovaria tudo)", () => {
    const files = scanScope().map((s) => s.file);
    for (const expected of [
      "src/components/ivo/PlanComposition.tsx",
      "src/components/ivo/IvoLensMatrix.tsx",
      "src/lib/ivo/plan-closure.ts",
      "src/lib/ivo/fibt-plan-composition.server.ts",
      "src/routes/ivo-integral.acoes.tsx",
    ]) {
      expect(files).toContain(expected);
    }
    expect(files.filter((f) => /\.test\./.test(f))).toEqual([]);
    expect(scanScope().reduce((total, s) => total + s.texts, 0)).toBeGreaterThan(1000);
  });
});

describe("guarda de copy — o que reprova, o que tolera e o que não é texto", () => {
  const jsx = (text: string) => scanSource("x.tsx", `export const a = <p>${text}</p>;`);
  const flagged = (text: string) => jsx(text).hits.filter((h) => !h.tolerated).map((h) => h.claim);

  test("reprova cada claim da família do IVO afirmado em texto JSX", () => {
    const affirmative: Array<[label: string, sentence: string]> = [
      ["conformidade NR-1 automática", "O IVO entrega conformidade NR-1 automática."],
      ["laudo", "Este relatório é um laudo."],
      ["blindagem jurídica", "A empresa recebe blindagem jurídica."],
      ["garante", "O IVO garante a redução do risco."],
      ["comprovadamente reduz", "A ação comprovadamente reduz o estresse."],
      ["índice IVO aprovado/oficial", "Este é o índice IVO oficial da organização."],
      ["eficácia comprovada", "Eficácia comprovada na sua equipe."],
    ];
    for (const [label, sentence] of affirmative) expect(flagged(sentence)).toEqual([label]);
  });

  test("reprova cada frase da lista base do FIBT (a lista é consumida de fato)", () => {
    expect(FIBT_FORBIDDEN_CLAIM_PHRASES.length).toBeGreaterThan(0);
    for (const phrase of FIBT_FORBIDDEN_CLAIM_PHRASES) {
      expect(flagged(`Resultado: ${phrase} para todos.`)).toHaveLength(1);
    }
  });

  test("tolera a negação e a ressalva que vêm antes da frase proibida ou na mesma frase", () => {
    for (const sentence of [
      "Não existe índice IVO composto aprovado.",
      "Este relatório não substitui laudo técnico.",
      "O IVO nunca garante resultado.",
      "Não é laudo, diagnóstico clínico nem blindagem jurídica.",
      "Nenhuma nota de 0–1000 é calculada.",
      "Eficácia comprovada: não avaliada.",
      "Índice IVO oficial (experimental).",
    ]) {
      expect(flagged(sentence)).toEqual([]);
      expect(jsx(sentence).hits.length).toBeGreaterThan(0); // a frase foi vista; só a tolerância a liberou
    }
  });

  test("não tolera negação de OUTRA frase, nem negação que só vem depois da afirmação", () => {
    expect(flagged("Isto não é diagnóstico. O IVO garante o resultado.")).toEqual(["garante"]);
    expect(flagged("O IVO garante o resultado, não o processo.")).toEqual(["garante"]);
  });

  test("só conta o que o usuário lê: comentário e caminho de import ficam de fora; atributo, JSX e template entram", () => {
    const source = [
      'import laudo from "./laudo";', //                                1 · caminho de módulo
      "// o servidor garante que o laudo existe", //                    2 · comentário
      "/** garante o laudo */", //                                       3 · comentário
      'export const a = <p aria-label="Resumo do laudo">ok</p>;', //    4 · atributo
      "export const b = <p>O IVO garante.</p>;", //                      5 · texto JSX
      "export const c = `Total: ${n} laudos`;", //                       6 · parte de template
    ].join("\n");
    expect(scanSource("x.tsx", source).hits.map((h) => [h.line, h.claim])).toEqual([
      [4, "laudo"],
      [5, "garante"],
      [6, "laudo"],
    ]);
  });

  test("aponta a linha certa em texto JSX de várias linhas", () => {
    const source = ["export const d = (", "  <p>", "    Primeira linha.", "    O IVO garante.", "  </p>", ");"].join("\n");
    expect(scanSource("x.tsx", source).hits.map((h) => h.line)).toEqual([4]);
  });
});
