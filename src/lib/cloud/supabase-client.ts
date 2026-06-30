// Supabase client — lazy, env-aware, safe.
// Returns null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset
// (demo mode: app falls back to mocks without throwing).
// After Lovable Cloud activation, env vars are injected automatically.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let _client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (_client) return _client;

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return null;

  _client = createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
    global: {
      headers: { "x-vitalos-version": "2.0.0-fase2" },
    },
  });

  return _client;
}

/** True when Lovable Cloud is active and env vars are configured. */
export function isCloudReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}
