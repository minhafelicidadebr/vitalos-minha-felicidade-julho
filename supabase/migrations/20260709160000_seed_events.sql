-- ═══════════════════════════════════════════════════════════════════════════
-- SEED EVENTS — Sementes Vivas reais (Academia Viva 2.0 I1, rollout S6.5)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Carteira pró-social real: o ledger PESSOAL de sementes (ganhos e doações),
-- mesmo modelo de confiança do practice_entries/participation_events (S5):
-- cada linha pertence à própria pessoa, cliente autenticado via RLS.
--
-- INSERT-ONLY DE PROPÓSITO (nem UPDATE nem DELETE para o dono): o teto
-- semanal de ganho e o orçamento de doação são FOLDS do histórico — permitir
-- apagar eventos abriria o caminho óbvio de burlar os limites (mesma
-- rationale de participation_events no S5). LGPD: sementes são metadado de
-- gamificação pró-social (nunca conteúdo reflexivo); a exclusão da conta
-- remove tudo via ON DELETE CASCADE.
--
-- PRIVACIDADE DOS POOLS: o agregado coletivo (Pomar/Bosque) só é computado
-- via service role contando contribuintes ÚNICOS por pool com k-anon ≥5 —
-- a MESMA função pura do demo (buildSeedPools). Total individual de doação
-- NUNCA é público (constante ética do pack: no_individual_totals_public).
--
-- recipient_id é TEXT sem FK de propósito: no canal person o presente pode
-- referenciar identidades de escopos diferentes (demo/mock vs real); o
-- ledger é do DOADOR — o destinatário nunca lê esta tabela.

CREATE TABLE IF NOT EXISTS public.seed_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('earned', 'donated_person', 'donated_team', 'donated_cause')),
  amount       INTEGER NOT NULL CHECK (amount > 0),
  source_kind  TEXT,
  item_id      TEXT,
  recipient_id TEXT,
  pool_id      TEXT,
  occurred_on  DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.seed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY seed_events_select_own ON public.seed_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY seed_events_insert_own ON public.seed_events
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Lição do S5 (default privileges desta conta): REVOKE explícito primeiro.
-- Sem UPDATE/DELETE nem por policy nem por GRANT — dupla camada.
REVOKE ALL ON public.seed_events FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT ON public.seed_events TO authenticated;
GRANT ALL ON public.seed_events TO service_role;

CREATE INDEX IF NOT EXISTS seed_events_user ON public.seed_events(user_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS seed_events_org_pool ON public.seed_events(org_id, pool_id) WHERE pool_id IS NOT NULL;

-- ── Verificação pós-aplicação (colar no Lovable depois de aplicar) ───────────
-- SELECT has_table_privilege('authenticated', 'public.seed_events', 'UPDATE'); -- false
-- SELECT has_table_privilege('authenticated', 'public.seed_events', 'DELETE'); -- false
-- SELECT has_table_privilege('anon', 'public.seed_events', 'SELECT');          -- false
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'seed_events';            -- 2
