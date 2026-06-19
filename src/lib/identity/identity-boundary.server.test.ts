import { afterEach, describe, expect, test } from "bun:test";
import { readIdentityBoundaryStatus } from "./identity-boundary.server";

const previousMode = process.env.VITALOS_IDENTITY_MODE;

afterEach(() => {
  if (previousMode === undefined) {
    delete process.env.VITALOS_IDENTITY_MODE;
  } else {
    process.env.VITALOS_IDENTITY_MODE = previousMode;
  }
});

describe("server identity boundary", () => {
  test("defaults to an explicitly non-authenticated demo", () => {
    delete process.env.VITALOS_IDENTITY_MODE;

    expect(readIdentityBoundaryStatus()).toMatchObject({
      state: "demo",
      realAuthentication: false,
      serverEnforced: false,
    });
  });

  test("cloud request fails closed while the Lovable adapter is absent", () => {
    process.env.VITALOS_IDENTITY_MODE = "cloud";

    expect(readIdentityBoundaryStatus()).toEqual({
      requestedMode: "cloud",
      state: "blocked",
      realAuthentication: false,
      serverEnforced: false,
      reason: "cloud_adapter_missing",
    });
  });
});
