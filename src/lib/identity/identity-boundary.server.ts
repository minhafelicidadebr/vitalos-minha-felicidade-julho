import process from "node:process";
import {
  resolveIdentityBoundary,
  type IdentityBoundaryStatus,
  type IdentityMode,
} from "@/engine/identity/authorization-engine";

function hasSupabaseEnv(): boolean {
  // Espelha o padrão de client.ts: import.meta.env.VITE_* é substituído pelo
  // Vite no BUILD (inclusive no bundle SSR); process.env.SUPABASE_* cobre o
  // RUNTIME do servidor publicado, onde o Lovable injeta apenas as variantes
  // sem prefixo VITE_. Checar só process.env.VITE_* fazia o deploy publicado
  // cair silenciosamente em modo demo (link de convite real abria a onda
  // mockada; respostas iam para o no-op) mesmo com o Cloud ativo — em dev
  // passava porque o `vite dev` carrega o .env no process.env.
  const url = import.meta.env?.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key =
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  return Boolean(url && key);
}

function requestedIdentityMode(): IdentityMode {
  // Lovable Cloud fornece as credenciais Supabase ao ativar Cloud. Quando
  // presentes, o modo é cloud sem precisar de flag manual.
  if (hasSupabaseEnv()) return "cloud";
  return process.env.VITALOS_IDENTITY_MODE?.trim().toLowerCase() === "cloud" ? "cloud" : "demo";
}

function hasCloudAdapter(): boolean {
  // Adapter disponível quando SDK Supabase está configurado (env vars presentes).
  return hasSupabaseEnv();
}

export function readIdentityBoundaryStatus(): IdentityBoundaryStatus {
  return resolveIdentityBoundary(requestedIdentityMode(), hasCloudAdapter());
}
