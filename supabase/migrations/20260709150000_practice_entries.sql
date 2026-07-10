-- ═══════════════════════════════════════════════════════════════════════════
-- PRACTICE ENTRIES — Diário de Prática real (Academia Viva 2.0 I7, rollout S6.5+)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Primeira persistência real das fatias da Academia Viva 2.0. Modelo de
-- confiança PESSOAL (padrão S5/learning_persistence): cada linha pertence à
-- PRÓPRIA pessoa (auth.uid()), cliente autenticado lê/escreve direto via RLS
-- — sem service role, sem server function no caminho pessoal.
--
-- POR QUE ESTA FATIA PRIMEIRO: o Diário alimenta a 3ª prova do Diploma Vivo
-- (I2) e o passo Evidenciar do Loop Vivo (I3) — persistir UM sinal torna
-- TRÊS features reais (composição, não acumulação).
--
-- PRIVACIDADE:
-- - `summary` é conteúdo reflexivo PESSOAL — RLS garante que só o dono lê.
--   Agregados coletivos (k-anon ≥5, só contagens de registros CONSENTIDOS,
--   nunca conteúdo) ficam para a próxima fatia, via service role — esta
--   migration deliberadamente NÃO cria esse caminho.
-- - DELETE do próprio registro é PERMITIDO (LGPD art. 18 — reflexão pessoal
--   apagável pelo titular). UPDATE não: registro é snapshot do que foi
--   praticado; corrigir = apagar e registrar de novo (mesma honestidade do
--   action_log INSERT-only, adaptada a dado pessoal).
-- - `share_consent` é POR REGISTRO (doutrina do I7): false = nunca entra em
--   nenhuma contagem coletiva futura.

CREATE TABLE IF NOT EXISTS public.practice_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id     TEXT NOT NULL,
  kind          TEXT NOT NULL,          -- texto | foto | checklist | reflexao (validado no engine)
  summary       TEXT NOT NULL,          -- conteúdo reflexivo pessoal — só o dono lê
  share_consent BOOLEAN NOT NULL DEFAULT FALSE,
  occurred_on   DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.practice_entries ENABLE ROW LEVEL SECURITY;

-- Dono lê/escreve/apaga SÓ as próprias linhas. O WITH CHECK do INSERT também
-- amarra org_id ao profile REAL da sessão (defesa em profundidade: ninguém
-- semeia registro em org alheia para poluir agregados futuros).
CREATE POLICY practice_entries_select_own ON public.practice_entries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY practice_entries_insert_own ON public.practice_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY practice_entries_delete_own ON public.practice_entries
  FOR DELETE USING (user_id = auth.uid());

-- Lição do S5 (ALTER DEFAULT PRIVILEGES desta conta concede ALL em tabela
-- nova): REVOKE explícito primeiro, depois só o necessário. Sem UPDATE de
-- propósito — registro é snapshot.
REVOKE ALL ON public.practice_entries FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT, DELETE ON public.practice_entries TO authenticated;
GRANT ALL ON public.practice_entries TO service_role;

CREATE INDEX IF NOT EXISTS practice_entries_user ON public.practice_entries(user_id, occurred_on DESC);

-- ── Verificação pós-aplicação (colar no Lovable depois de aplicar) ───────────
-- SELECT has_table_privilege('authenticated', 'public.practice_entries', 'UPDATE'); -- false
-- SELECT has_table_privilege('anon', 'public.practice_entries', 'SELECT');          -- false
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'practice_entries';            -- 3
