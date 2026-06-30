// Server-only: usa supabaseAdmin (service role) para operações privilegiadas.
// Seguro apenas em .server.ts — não importar em código de cliente.

import { createWaveWithAdmin } from "../cloud/db-adapter";
import type { CreateWaveInput, CreateWaveResult } from "../cloud/db-adapter";

export async function createWaveAsAdmin(
  input: CreateWaveInput,
): Promise<CreateWaveResult | { error: string }> {
  // Import dinâmico garante que o service role nunca vaza para o bundle do cliente.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await createWaveWithAdmin(input, supabaseAdmin);
  if (!result) return { error: "Falha ao criar onda no banco." };
  return result;
}
