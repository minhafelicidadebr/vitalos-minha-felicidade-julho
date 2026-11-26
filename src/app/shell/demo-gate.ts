import { create } from "zustand";

type DemoUnlockResult = "authenticated" | "invalid" | "limited" | "unavailable";

interface DemoGateState {
  unlocked: boolean;
  /** True once the HttpOnly server session has been checked. */
  hasHydrated: boolean;
  restore: () => Promise<void>;
  unlock: (password: string) => Promise<DemoUnlockResult>;
  lock: () => Promise<void>;
}

const DEMO_ACCESS_URL = "/api/apresentacao?scope=demo";

async function readState(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === "object" && "state" in body && typeof body.state === "string"
      ? body.state
      : "unavailable";
  } catch {
    return "unavailable";
  }
}

export const useDemoGate = create<DemoGateState>((set) => {
  let generation = 0;
  return {
    unlocked: false,
    hasHydrated: false,
    restore: async () => {
      const requestGeneration = ++generation;
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem("vita-demo-gate");
      } catch {
        // Storage may be unavailable in strict browser privacy modes.
      }
      try {
        const response = await fetch(DEMO_ACCESS_URL, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const unlocked = response.ok && (await readState(response)) === "ready";
        if (requestGeneration === generation) set({ unlocked });
      } catch {
        if (requestGeneration === generation) set({ unlocked: false });
      } finally {
        if (requestGeneration === generation) set({ hasHydrated: true });
      }
    },
    unlock: async (password) => {
      const requestGeneration = ++generation;
      try {
        const response = await fetch(DEMO_ACCESS_URL, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ password }),
        });
        const state = await readState(response);
        if (response.ok && state === "authenticated") {
          if (requestGeneration === generation) {
            set({ unlocked: true, hasHydrated: true });
            return "authenticated";
          }
          return "unavailable";
        }
        if (requestGeneration === generation) set({ unlocked: false, hasHydrated: true });
        if (response.status === 429 || state === "limited") return "limited";
        if (response.status === 401 && state === "locked") return "invalid";
        return "unavailable";
      } catch {
        if (requestGeneration === generation) set({ unlocked: false, hasHydrated: true });
        return "unavailable";
      }
    },
    lock: async () => {
      generation += 1;
      set({ unlocked: false });
      try {
        await fetch(DEMO_ACCESS_URL, {
          method: "DELETE",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
      } catch {
        // The local view is locked immediately; the server cookie expires naturally if offline.
      }
    },
  };
});
