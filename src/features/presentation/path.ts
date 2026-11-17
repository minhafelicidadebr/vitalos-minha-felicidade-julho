export function usesPresentationShell(pathname: string): boolean {
  return pathname.replace(/\/$/, "") === "/apresentacao/empresas";
}
