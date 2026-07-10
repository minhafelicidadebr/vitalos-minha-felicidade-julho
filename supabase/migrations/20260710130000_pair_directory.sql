-- ═══════════════════════════════════════════════════════════════════════════
-- PAIR DIRECTORY — diretório consentido de colegas (destrava I6 Duplas reais
-- e o plantio pessoal de Sementes reais)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- DECISÃO DE DESIGN (2026-07-10, ancorada na doutrina já estabelecida do
-- projeto, não uma correspondência nova): a pergunta em aberto era "quem pode
-- aparecer como par/destinatário? opt-in individual? qual consentimento?".
-- Resposta pelos invariantes já vigentes do produto:
--   1. Opt-in explícito e por pessoa — NUNCA import automático de roster/org
--      chart. Entrar no diretório É o ato de consentir ser visto pela
--      própria organização (mesmo princípio de shareConsent no Diário/I7 e
--      namedVisibility nas Sementes/I1).
--   2. Mínimo dado exposto: nome de exibição + driver em foco + até 3 forças
--      VIA-T ESCOLHIDAS (nunca o perfil completo) — já é exatamente o shape
--      de PairProfile do practice-pair-engine.ts (I6), construído e testado
--      antes desta migration existir. Esta tabela é a persistência REAL
--      desse shape, não um redesenho.
--   3. Sair é sempre possível e imediato: UPDATE visible=false ou DELETE —
--      ambos removem a pessoa de toda sugestão/listagem na mesma hora
--      (RLS na leitura filtra por visible=true, então não depende de
--      nenhum cache).
--   4. Escopo por org: só colegas da MESMA organização se veem — nunca
--      cross-tenant (P0-04, mesma disciplina do resto do produto).
--
-- MODELO DE CONFIANÇA: pessoal, padrão S5 — cada linha é da PRÓPRIA pessoa
-- para escrever, mas de LEITURA COMPARTILHADA dentro da org (diferente de
-- practice_entries/seed_events, que são estritamente own-only): o propósito
-- da tabela é ser vista por colegas da mesma org, então SELECT precisa
-- alcançar todo mundo do mesmo org_id, não só o dono — mas só quando
-- visible=true (op-out imediato).

CREATE TABLE IF NOT EXISTS public.pair_directory_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name        TEXT NOT NULL,
  focus_driver_id      TEXT NOT NULL,
  shared_strength_ids  TEXT[] NOT NULL DEFAULT '{}',
  visible             BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id),
  CONSTRAINT pair_directory_max_3_strengths CHECK (array_length(shared_strength_ids, 1) IS NULL OR array_length(shared_strength_ids, 1) <= 3)
);

ALTER TABLE public.pair_directory_entries ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer MEMBRO da mesma org vê os colegas visíveis (o propósito
-- da tabela é ser um diretório) — nunca cross-tenant, nunca linha invisível.
CREATE POLICY pair_directory_select_org ON public.pair_directory_entries
  FOR SELECT USING (
    visible = TRUE
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Escrita: só o próprio dono, e org_id sempre amarrado ao profile real da
-- sessão (nunca do payload — P0-04).
CREATE POLICY pair_directory_insert_own ON public.pair_directory_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY pair_directory_update_own ON public.pair_directory_entries
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY pair_directory_delete_own ON public.pair_directory_entries
  FOR DELETE USING (user_id = auth.uid());

-- Lição do S5 (default privileges desta conta concedem ALL em tabela nova):
-- REVOKE explícito primeiro.
REVOKE ALL ON public.pair_directory_entries FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pair_directory_entries TO authenticated;
GRANT ALL ON public.pair_directory_entries TO service_role;

CREATE INDEX IF NOT EXISTS pair_directory_org_visible ON public.pair_directory_entries(org_id, visible);

-- ── Verificação pós-aplicação (colar no Lovable depois de aplicar) ───────────
-- SELECT has_table_privilege('anon', 'public.pair_directory_entries', 'SELECT'); -- false
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'pair_directory_entries';   -- 4
