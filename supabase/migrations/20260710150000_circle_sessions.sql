-- ═══════════════════════════════════════════════════════════════════════════
-- CIRCLE SESSIONS — Círculos Vivos reais (I5, Academia Viva 2.0)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Fecha a I5: a roda de conversa que a embaixadora facilita, registrada de
-- verdade. A privacidade aqui é POR SCHEMA, não por política — o núcleo do
-- design (mesma filosofia do CircleSession no engine, construído antes desta
-- migration existir): a tabela NÃO TEM coluna de conteúdo nem lista de
-- participantes. Só metadados: quem facilitou, qual driver, quando, e um
-- NÚMERO de presença. O que é dito na roda não tem onde ser guardado — é
-- impossibilidade estrutural, não promessa.
--
-- O micro-compromisso de fechamento de CADA pessoa vai para o PRÓPRIO Diário
-- dela (practice_entries, já real) via a UI — nunca para o registro da roda.
-- Isso resolve a tensão "privacidade por schema (sem lista de participantes)"
-- vs "cada pessoa registra seu compromisso" (que exige identidade): são dois
-- registros separados, em tabelas separadas, com donos diferentes.
--
-- MODELO DE CONFIANÇA: o facilitador (autenticado) registra a própria roda;
-- qualquer membro da MESMA org vê que a roda aconteceu (é um ritual coletivo,
-- não um segredo) — mas nunca quem participou, porque essa informação não
-- existe na linha. INSERT do facilitador, SELECT org-scoped, sem UPDATE/DELETE
-- (o registro de que uma roda ocorreu é um fato histórico, não editável).

CREATE TABLE IF NOT EXISTS public.circle_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  facilitator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  embassy_id     TEXT NOT NULL,
  driver_id      TEXT NOT NULL,
  occurred_on    DATE NOT NULL,
  presence_count INTEGER NOT NULL CHECK (presence_count >= 2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.circle_sessions ENABLE ROW LEVEL SECURITY;

-- Qualquer membro da org vê as rodas da própria org (ritual coletivo) —
-- nunca cross-tenant, e a linha não carrega identidade de participante.
CREATE POLICY circle_sessions_select_org ON public.circle_sessions
  FOR SELECT USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Só o facilitador registra a própria roda, sempre na própria org.
CREATE POLICY circle_sessions_insert_own ON public.circle_sessions
  FOR INSERT WITH CHECK (
    facilitator_id = auth.uid()
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Sem UPDATE/DELETE (nem policy nem GRANT): uma roda que aconteceu é fato.
-- Lição do S5 (default privileges): REVOKE explícito primeiro.
REVOKE ALL ON public.circle_sessions FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT ON public.circle_sessions TO authenticated;
GRANT ALL ON public.circle_sessions TO service_role;

CREATE INDEX IF NOT EXISTS circle_sessions_org ON public.circle_sessions(org_id, occurred_on DESC);

-- ── Verificação pós-aplicação (colar no Lovable depois de aplicar) ───────────
-- SELECT has_table_privilege('authenticated', 'public.circle_sessions', 'UPDATE'); -- false
-- SELECT has_table_privilege('authenticated', 'public.circle_sessions', 'DELETE'); -- false
-- SELECT has_table_privilege('anon', 'public.circle_sessions', 'SELECT');          -- false
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'circle_sessions';            -- 2
