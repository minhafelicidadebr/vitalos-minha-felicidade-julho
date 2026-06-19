import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Demo-only persona switching. This is intentionally outside engine/ because
 * it is client state, not authentication or authorization infrastructure.
 */
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
