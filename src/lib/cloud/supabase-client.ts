// Re-exports the Lovable-generated Supabase client as the canonical source.
// Lovable Cloud usa VITE_SUPABASE_PUBLISHABLE_KEY (não VITE_SUPABASE_ANON_KEY).
// Não criar outro cliente — usar sempre @/integrations/supabase/client.

export { supabase as getSupabaseClient } from "@/integrations/supabase/client";

/** True when Lovable Cloud está ativo (env vars presentes). */
export function isCloudReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  return Boolean(url && key);
}
