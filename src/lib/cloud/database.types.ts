// FIBT-1: o bloco `Database` manual foi removido daqui. Ele nunca era
// consumido (nenhum arquivo do repositório referenciava
// Database["public"]["Tables"][...] a partir deste arquivo) e estava
// desatualizado — ainda listava wave_responses.invite_token, removido pela
// Migration B. `WaveStatus` é o único export deste arquivo com consumidor
// real (src/lib/cloud/db-adapter.ts) e não depende do schema de tabelas.
//
// A fonte de verdade do schema é src/integrations/supabase/types.ts, gerada
// oficialmente pelo Supabase a partir do banco real.

export type WaveStatus =
  | "draft"
  | "scheduled"
  | "collecting"
  | "sealed"
  | "archived"
  | "cancelled";
