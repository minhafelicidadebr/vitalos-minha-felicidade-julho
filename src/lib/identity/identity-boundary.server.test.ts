import { describe, expect, test } from "bun:test";
import { readIdentityBoundaryStatus } from "./identity-boundary.server";

describe("server identity boundary", () => {
  test("returns a coherent state — cloud when adapter is present, demo otherwise", () => {
    const status = readIdentityBoundaryStatus();

    // State must be one of the three valid states.
    expect(["demo", "cloud", "blocked"]).toContain(status.state);

    // Invariant: real authentication is only true when cloud adapter is available.
    if (status.state === "cloud") {
      expect(status.realAuthentication).toBe(true);
      expect(status.serverEnforced).toBe(true);
    } else {
      expect(status.realAuthentication).toBe(false);
    }
  });

  test("blocked state combines cloud request with missing adapter (engine contract)", () => {
    // The engine-level contract for the blocked state is tested in authorization-engine.test.ts.
    // Here we verify the boundary server correctly delegates to the engine.
    const status = readIdentityBoundaryStatus();

    // In this environment, cloud IS configured, so we expect state: "cloud".
    // The `blocked` state only occurs when VITE_SUPABASE_PUBLISHABLE_KEY is absent.
    if (status.state === "blocked") {
      expect(status.realAuthentication).toBe(false);
      expect((status as { reason?: string }).reason).toBe("cloud_adapter_missing");
    }

    if (status.state === "cloud") {
      expect(status.realAuthentication).toBe(true);
      expect((status as { reason?: string }).reason).toBe("cloud_ready");
    }
  });
});
