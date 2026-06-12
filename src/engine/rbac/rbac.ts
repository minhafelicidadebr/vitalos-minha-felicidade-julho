// RBAC engine — pure helpers driven by the pack. No domain/ imports.
import { create } from "zustand";
import { persist } from "zustand/middleware";
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

/** Persona store — demo-only role switching (mock auth, Bloco 1). */
interface PersonaState {
  roleId: string;
  setRole: (roleId: string) => void;
}

export const usePersona = create<PersonaState>()(
  persist(
    (set) => ({
      roleId: "COLABORADOR",
      setRole: (roleId) => set({ roleId }),
    }),
    { name: "vita-persona" },
  ),
);
