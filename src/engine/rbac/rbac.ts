// RBAC engine — pure helpers driven by the pack. No domain/ imports.
import type { DomainPack } from "../pack/pack-types";

export interface NavItemDef {
  id: string;
  label: string;
  roles: string[] | "all";
  domain?: string;
}

/** True when the nav item from the pack is visible to the given role. */
export function canSeeNavItem(item: NavItemDef, roleId: string): boolean {
  if (item.roles === "all") return true;
  return item.roles.includes(roleId);
}

/** Nav items from the pack filtered for a role, preserving pack order. */
export function navForRole(pack: DomainPack, roleId: string): NavItemDef[] {
  const items = (pack.navigation ?? []) as unknown as NavItemDef[];
  return items.filter((item) => canSeeNavItem(item, roleId));
}

/**
 * O papel real de uma sessão logada sempre vence o papel de demonstração —
 * uma pessoa real nunca deve navegar pela persona que por acaso estava salva
 * no localStorage daquele navegador.
 */
export function resolveEffectiveRoleId(
  realRoleId: string | null | undefined,
  demoRoleId: string,
): string {
  return realRoleId ?? demoRoleId;
}

/** Origem do papel que governa uma tela. */
export type RoleSource = "session" | "demo" | "pending";

export interface RoleContext {
  /** `null` enquanto a sessão ainda não respondeu: nenhuma curadoria é calculada. */
  roleId: string | null;
  source: RoleSource;
}

/**
 * Versão explícita de `resolveEffectiveRoleId` para telas que recomendam,
 * curam ou calculam algo a partir do papel. Diferente do menu, essas telas
 * não podem usar a persona de demonstração enquanto a sessão carrega, nem
 * misturar sinais fictícios com uma conta institucional.
 *
 * - `ready` com papel → `session` (papel institucional vence sempre)
 * - `loading` → `pending` (aguarda; não usa a persona salva no navegador)
 * - qualquer outro estado → `demo` (visitante ou sessão sem vínculo; o shell
 *   já mostra o aviso correspondente para `unlinked`/`unavailable`)
 */
export function resolveRoleContext(
  sessionStatus: string,
  realRoleId: string | null | undefined,
  demoRoleId: string,
): RoleContext {
  if (sessionStatus === "loading") return { roleId: null, source: "pending" };
  if (sessionStatus === "ready" && realRoleId) return { roleId: realRoleId, source: "session" };
  return { roleId: demoRoleId, source: "demo" };
}
