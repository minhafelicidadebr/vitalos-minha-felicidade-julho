// Cliente isolado por chamada: a chave publicável identifica o projeto;
// o token validado pelo chamador dá a identidade usada por RLS.
interface OrgReadClientDeps {
  env?: { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string };
  fetch?: typeof globalThis.fetch;
}

export async function createOrgReadClient(accessToken: string, deps: OrgReadClientDeps = {}) {
  const env = deps.env ?? process.env;
  const url = env.SUPABASE_URL;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY;
  if (!accessToken.trim() || !url || !publishableKey) return null;

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, publishableKey, {
    global: {
      headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
      ...(deps.fetch ? { fetch: deps.fetch } : {}),
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
