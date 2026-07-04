-- ═══════════════════════════════════════════════════════════════════════════
-- PERSISTÊNCIA DA ACADEMIA — progresso e repetição espaçada sobrevivem ao
-- reload (Sprint S5)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO: academia-engine, sm2-engine e flashcard-session já são motores
-- puros, testados e prontos — o que faltava era só onde guardar o estado
-- entre sessões. Hoje tudo vive em Zustand+localStorage (participation-store)
-- ou em useReducer local (FlashcardDeck): reseta ao trocar de navegador, ao
-- limpar cache, ou a cada novo deploy do Lovable. Para um cliente REAL (não
-- explorador de demo), isso quebra o propósito da repetição espaçada — o
-- algoritmo só funciona se o agendamento sobreviver entre dias.
--
-- MODELO DE CONFIANÇA (mais simples que waves/capsules de propósito): cada
-- linha pertence à PRÓPRIA pessoa (auth.uid()), não a uma organização. Não há
-- k-anonimato a proteger aqui — é dado de estudo pessoal, não resposta de
-- pesquisa. Por isso não precisa de service role nem de server function: o
-- cliente autenticado lê/escreve direto, com RLS fazendo a única fronteira
-- necessária (linha própria, nunca a de outra pessoa).
--
-- ASSIMETRIA DELIBERADA DE PRIVILÉGIO:
--   sm2_card_state:      SELECT+INSERT+UPDATE — reagendar o próprio cartão é
--                         uso legítimo (só prejudica a própria aprendizagem).
--   participation_events: SELECT+INSERT, NUNCA UPDATE/DELETE — o teto diário
--                         de XP (anti-gaming) ainda é calculado no cliente
--                         (mesmo modelo de hoje, motivacional/sem consequência
--                         real — ver invariante "XP nunca liga a remuneração"),
--                         mas impedir edição/remoção do próprio histórico
--                         fecha o caminho mais óbvio de burlar o teto
--                         apagando eventos antigos.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sm2_card_state (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id       TEXT NOT NULL,
  repetition    INTEGER NOT NULL DEFAULT 0,
  easiness      REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  lapses        INTEGER NOT NULL DEFAULT 0,
  reviewed_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, card_id)
);
GRANT SELECT, INSERT, UPDATE ON public.sm2_card_state TO authenticated;
GRANT ALL ON public.sm2_card_state TO service_role;
ALTER TABLE public.sm2_card_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_card_state" ON public.sm2_card_state
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.participation_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id     TEXT NOT NULL,
  kind         TEXT NOT NULL,
  category     TEXT NOT NULL,
  source_id    TEXT NOT NULL,
  occurred_on  TEXT NOT NULL,
  xp_awarded   INTEGER NOT NULL DEFAULT 0,
  capped       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id)
);
GRANT SELECT, INSERT ON public.participation_events TO authenticated;
GRANT ALL ON public.participation_events TO service_role;
ALTER TABLE public.participation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_events_select" ON public.participation_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_events_insert" ON public.participation_events
  FOR INSERT WITH CHECK (user_id = auth.uid());
