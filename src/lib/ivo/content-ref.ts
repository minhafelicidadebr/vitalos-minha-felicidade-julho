// Referência estruturada ao conteúdo educativo, gravada no início do texto da
// aprendizagem no ledger existente: `[conteudo:ID@versão] texto`.
// Módulo PURO e mínimo (seguro para o cliente): não importa o catálogo nem o
// registro de evidências. O ledger continua sendo o ÚNICO armazenamento.
const REF = /^\[conteudo:([A-Za-z0-9_.-]+)@([A-Za-z0-9_.-]+)\]\s*/;

export function encodeContentRef(content: { id: string; version: string }, text: string): string {
  return `[conteudo:${content.id}@${content.version}] ${text}`;
}

/** Conteúdo de TESTE é identificável pelo id (invariante validada pelo catálogo curatorial). */
export const isTestContentId = (contentId: string): boolean => contentId.startsWith("TESTE-");
export function parseContentRef(contentRef: string): { contentId: string; version: string; text: string } | null {
  const m = REF.exec(contentRef);
  return m ? { contentId: m[1]!, version: m[2]!, text: contentRef.slice(m[0].length) } : null;
}
