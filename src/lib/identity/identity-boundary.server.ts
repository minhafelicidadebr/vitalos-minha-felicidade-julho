import process from "node:process";
import {
  resolveIdentityBoundary,
  type IdentityBoundaryStatus,
  type IdentityMode,
} from "@/engine/identity/authorization-engine";

function requestedIdentityMode(): IdentityMode {
  return process.env.VITALOS_IDENTITY_MODE?.trim().toLowerCase() === "cloud" ? "cloud" : "demo";
}

/**
 * The Lovable Cloud adapter does not exist in this workspace yet. Keeping this
 * explicit prevents an environment flag from creating a false security claim.
 */
export function readIdentityBoundaryStatus(): IdentityBoundaryStatus {
  return resolveIdentityBoundary(requestedIdentityMode(), false);
}
