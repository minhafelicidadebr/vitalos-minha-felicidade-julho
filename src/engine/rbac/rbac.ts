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
