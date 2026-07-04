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