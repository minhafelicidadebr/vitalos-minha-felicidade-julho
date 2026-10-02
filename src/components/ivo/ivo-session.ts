import { supabase } from "@/integrations/supabase/client";
import { isCloudReady } from "@/lib/cloud/supabase-client";

/**
 * Token da sessão Supabase do navegador, enviado no corpo (POST) às server
 * functions IVO. É só a credencial: quem decide organização e papel é o
 * servidor (authorizeIvoSession). Sem backend configurado, não há token.
 */
export async function currentIvoAccessToken(): Promise<string | undefined> {
  if (!isCloudReady()) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
