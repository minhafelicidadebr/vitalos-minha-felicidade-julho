// Paridade de schema — motor PURO (sem I/O, sem React, determinístico).
//
// PROBLEMA (P0-02 da auditoria Fable 5): o código chama RPCs e usa colunas que
// não existem nas migrations versionadas — foram aplicadas só via chat do Lovable.
// Isso torna o repositório uma descrição FALSA da produção: um clone limpo não
// reproduz o banco real, e a próxima quebra chega sem aviso.
//
// SOLUÇÃO: transformar o drift num TESTE. Este motor lê (1) o que as migrations
// DEFINEM e (2) o que o código USA, e reporta a diferença. Enquanto houver RPC,
// tabela ou coluna usada sem definição versionada, a paridade falha.
//
// HONESTIDADE (Fable 5 §8): paridade estática prova que o REPO é coerente consigo
// mesmo — que toda dependência de schema do código tem uma migration que a cria.
// NÃO prova que a produção Lovable já aplicou essas migrations; isso é o passo
// humano do runbook (docs/RUNBOOK_MIGRACOES_LOVABLE.md). Cobertura de coluna é
// dirigida por manifesto declarado (schema-manifest.ts), não por adivinhação de
// AST: honesto sobre o que verifica, em vez de falsa confiança abrangente.
//
// LIMITE CONHECIDO: este motor não verifica a INTERAÇÃO entre privilégios
// GRANT/REVOKE — só existência de RPC/tabela/coluna. Um REVOKE column-level
// pode ser neutralizado por um GRANT table-level pré-existente (achado real
// em 20260703170000_fix_profile_revoke_table_level_grant.sql) sem que esta
// checagem acuse nada, porque ambas as instruções SQL "existem" normalmente.
// Verificação de efeito de privilégio exige consulta ao banco vivo
// (has_column_privilege), não análise estática do texto da migration.

export interface SqlSource {
  /** Nome do arquivo (para mensagens de erro). */
  name: string;
  /** Conteúdo SQL bruto. */
  content: string;
}

export interface TsSource {
  name: string;
  content: string;
}

/** O que as migrations versionadas DEFINEM. */
export interface DefinedSchema {
  tables: Set<string>;
  /** tabela → conjunto de colunas declaradas (CREATE TABLE + ALTER ADD COLUMN). */
  columns: Map<string, Set<string>>;
  functions: Set<string>;
}

/** Uma chamada `.rpc("nome")` encontrada no código. */
export interface RpcUsage {
  name: string;
  file: string;
  line: number;
}

/** Dependência de coluna declarada no manifesto: "o código X precisa da coluna Y". */
export interface ColumnDependency {
  table: string;
  column: string;
  /** Onde essa dependência nasce (arquivo/símbolo) — aparece na mensagem de erro. */
  usedBy: string;
}

export interface ParityReport {
  ok: boolean;
  missingFunctions: { name: string; usages: RpcUsage[] }[];
  missingTables: { table: string; dependency: ColumnDependency }[];
  missingColumns: ColumnDependency[];
}

// Palavras que iniciam uma cláusula de constraint dentro de um CREATE TABLE —
// nunca são nomes de coluna. Filtra o extrator para não capturar lixo.
const CONSTRAINT_KEYWORDS = new Set([
  "primary",
  "foreign",
  "unique",
  "check",
  "constraint",
  "grant",
]);

// Tipos Postgres que ancoram uma DECLARAÇÃO de coluna (`nome TIPO ...`). Anchorar
// no tipo evita capturar palavras soltas e é robusto para o SQL controlado deste
// projeto (todo o schema é escrito à mão, sem geradores).
const COLUMN_TYPE_ANCHOR =
  /^\s*"?([a-z_][a-z0-9_]*)"?\s+(uuid|text|timestamptz|timestamp|integer|int|bigint|boolean|bool|jsonb|json|numeric|date|serial|text\[\]|uuid\[\])\b/i;

/** Remove comentários de linha (`-- …`) para não confundir o parser. */
function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");
}

/** Normaliza `public.foo` / `"foo"` → `foo`. */
function bareName(raw: string): string {
  return raw.replace(/^public\./i, "").replace(/"/g, "").trim().toLowerCase();
}

/**
 * Extrai o corpo entre parênteses balanceados a partir do índice da abertura.
 * Retorna o conteúdo interno (sem os parênteses externos) ou null.
 */
function extractParenBody(text: string, openParenIndex: number): string | null {
  let depth = 0;
  for (let i = openParenIndex; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return text.slice(openParenIndex + 1, i);
    }
  }
  return null;
}

/** Divide o corpo de um CREATE TABLE em declarações de topo (respeita parênteses aninhados). */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** Parseia todas as migrations e consolida tabelas, colunas e funções definidas. */
export function parseDefinedSchema(sources: SqlSource[]): DefinedSchema {
  const tables = new Set<string>();
  const columns = new Map<string, Set<string>>();
  const functions = new Set<string>();

  const ensureTable = (t: string): Set<string> => {
    tables.add(t);
    let set = columns.get(t);
    if (!set) {
      set = new Set<string>();
      columns.set(t, set);
    }
    return set;
  };

  for (const src of sources) {
    const sql = stripSqlComments(src.content);

    // Funções: CREATE [OR REPLACE] FUNCTION [public.]nome
    const fnRe = /create\s+(?:or\s+replace\s+)?function\s+(public\.)?("?[a-z_][a-z0-9_]*"?)/gi;
    for (const m of sql.matchAll(fnRe)) functions.add(bareName(m[2]!));

    // CREATE TABLE [IF NOT EXISTS] [public.]nome ( … )
    const tableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(public\.)?("?[a-z_][a-z0-9_]*"?)\s*\(/gi;
    for (const m of sql.matchAll(tableRe)) {
      const table = bareName(m[2]!);
      const cols = ensureTable(table);
      const openParen = m.index! + m[0].length - 1;
      const body = extractParenBody(sql, openParen);
      if (body) {
        for (const decl of splitTopLevel(body)) {
          const first = decl.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
          if (CONSTRAINT_KEYWORDS.has(first)) continue;
          const colMatch = decl.match(COLUMN_TYPE_ANCHOR);
          if (colMatch) cols.add(bareName(colMatch[1]!));
        }
      }
    }

    // ALTER TABLE [public.]nome ADD COLUMN [IF NOT EXISTS] coluna
    const addColRe =
      /alter\s+table\s+(public\.)?("?[a-z_][a-z0-9_]*"?)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?("?[a-z_][a-z0-9_]*"?)/gi;
    for (const m of sql.matchAll(addColRe)) {
      const table = bareName(m[2]!);
      ensureTable(table).add(bareName(m[3]!));
    }
  }

  return { tables, columns, functions };
}

/**
 * Neutraliza comentários de TS/JS (linha `//` e bloco `/​* *​/`) preservando
 * strings, template literals e a numeração de linhas (comentário vira espaço,
 * quebras mantidas). Necessário porque o scanner de `.rpc()` não pode confundir
 * um exemplo em docstring (ex.: este próprio módulo) com uma chamada real.
 */
export function blankComments(src: string): string {
  let out = "";
  let i = 0;
  type State = "code" | "line" | "block" | "sq" | "dq" | "tpl";
  let state: State = "code";
  while (i < src.length) {
    const ch = src[i]!;
    const next = src[i + 1];
    if (state === "code") {
      if (ch === "/" && next === "/") {
        state = "line";
        out += "  ";
        i += 2;
      } else if (ch === "/" && next === "*") {
        state = "block";
        out += "  ";
        i += 2;
      } else {
        if (ch === "'") state = "sq";
        else if (ch === '"') state = "dq";
        else if (ch === "`") state = "tpl";
        out += ch;
        i++;
      }
    } else if (state === "line") {
      if (ch === "\n") {
        state = "code";
        out += ch;
      } else {
        out += ch === "\t" ? "\t" : " ";
      }
      i++;
    } else if (state === "block") {
      if (ch === "*" && next === "/") {
        state = "code";
        out += "  ";
        i += 2;
      } else {
        out += ch === "\n" ? "\n" : ch === "\t" ? "\t" : " ";
        i++;
      }
    } else {
      // dentro de string/template: copia literal, respeita escape e o fim do delimitador
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (
        (state === "sq" && ch === "'") ||
        (state === "dq" && ch === '"') ||
        (state === "tpl" && ch === "`")
      ) {
        state = "code";
      }
      i++;
    }
  }
  return out;
}

/** Encontra toda chamada real `.rpc("nome"` no código (ignora comentários), com arquivo e linha. */
export function findRpcUsages(sources: TsSource[]): RpcUsage[] {
  const usages: RpcUsage[] = [];
  const rpcRe = /\.rpc\(\s*["'`]([a-z_][a-z0-9_]*)["'`]/gi;
  for (const src of sources) {
    const lines = blankComments(src.content).split("\n");
    lines.forEach((line, i) => {
      for (const m of line.matchAll(rpcRe)) {
        usages.push({ name: m[1]!.toLowerCase(), file: src.name, line: i + 1 });
      }
    });
  }
  return usages;
}

/**
 * Confronta o que o código USA com o que as migrations DEFINEM.
 * Funções: derivadas automaticamente das chamadas `.rpc()`.
 * Colunas: dirigidas pelo manifesto declarado (dependências explícitas).
 */
export function checkParity(
  defined: DefinedSchema,
  rpcUsages: RpcUsage[],
  columnDeps: ColumnDependency[],
): ParityReport {
  // Agrupa usos de RPC por nome para reportar todos os call sites de uma função ausente.
  const byName = new Map<string, RpcUsage[]>();
  for (const u of rpcUsages) {
    const arr = byName.get(u.name) ?? [];
    arr.push(u);
    byName.set(u.name, arr);
  }

  const missingFunctions: ParityReport["missingFunctions"] = [];
  for (const [name, usages] of byName) {
    if (!defined.functions.has(name)) missingFunctions.push({ name, usages });
  }

  const missingTables: ParityReport["missingTables"] = [];
  const missingColumns: ColumnDependency[] = [];
  for (const dep of columnDeps) {
    const table = dep.table.toLowerCase();
    const column = dep.column.toLowerCase();
    if (!defined.tables.has(table)) {
      missingTables.push({ table, dependency: dep });
      continue;
    }
    if (!defined.columns.get(table)?.has(column)) missingColumns.push(dep);
  }

  const ok =
    missingFunctions.length === 0 && missingTables.length === 0 && missingColumns.length === 0;

  return { ok, missingFunctions, missingTables, missingColumns };
}

/** Formata o relatório para humanos (usado pelo runner e pela mensagem de teste). */
export function formatParityReport(report: ParityReport): string {
  if (report.ok) return "Paridade de schema OK — todo uso do código tem definição versionada.";

  const lines: string[] = ["DRIFT DE SCHEMA detectado (P0-02):", ""];

  for (const fn of report.missingFunctions) {
    lines.push(`  ✗ RPC ausente nas migrations: ${fn.name}()`);
    for (const u of fn.usages) lines.push(`      usada em ${u.file}:${u.line}`);
  }
  for (const t of report.missingTables) {
    lines.push(`  ✗ Tabela ausente nas migrations: ${t.table} (dependência de ${t.dependency.usedBy})`);
  }
  for (const c of report.missingColumns) {
    lines.push(`  ✗ Coluna ausente nas migrations: ${c.table}.${c.column} (usada por ${c.usedBy})`);
  }

  lines.push("");
  lines.push("  → Escreva/atualize a migration de reconciliação e siga docs/RUNBOOK_MIGRACOES_LOVABLE.md");
  return lines.join("\n");
}
