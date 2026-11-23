// Páginas com porta própria no servidor: não iniciam os provedores da empresa nem da demo.
const STANDALONE = new Set(["/apresentacao/empresas", "/proposta"]);
export function usesPresentationShell(pathname: string): boolean {
  return STANDALONE.has(pathname.replace(/\/$/, ""));
}
