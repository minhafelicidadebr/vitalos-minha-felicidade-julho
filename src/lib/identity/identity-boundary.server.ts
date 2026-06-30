import process from "node:process";
import {
  resolveIdentityBoundary,
  type IdentityBoundaryStatus,
  type IdentityMode,
} from "@/engine/identity/authorization-engine";

function requestedIdentityMode(): IdentityMode {
  // Lovable Cloud injeta VITE_SUPABASE_URL automaticamente ao ativar Cloud.
  // Quando presente, o modo é cloud sem precisar de flag manual.
  const hasSupabaseEnv = Boolean(
    process.env.VITE_SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
  if (hasSupabaseEnv) return "cloud";
  return process.env.VITALOS_IDENTITY_MODE?.trim().toLowerCase() === "cloud" ? "cloud" : "demo";
}

function hasCloudAdapter(): boolean {
  // Adapter disponível quando SDK Supabase está configurado (env vars presentes).
  return Boolean(
    process.env.VITE_SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

export function readIdentityBoundaryStatus(): IdentityBoundaryStatus {
  return resolveIdentityBoundary(requestedIdentityMode(), hasCloudAdapter());
}
