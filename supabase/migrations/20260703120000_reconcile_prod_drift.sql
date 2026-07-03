-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION DE RECONCILIAÇÃO — fecha o drift repo ↔ produção (P0-02, Sprint S0)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO: RPCs e colunas abaixo são USADAS pelo código mas nunca foram
-- versionadas em supabase/migrations/ — foram aplicadas só via chat do Lovable.
-- Esta migration recupera essas definições para o repositório, tornando-o
-- novamente uma descrição fiel da produção.
--
-- ⚠️  VERIFICAR NO LOVABLE ANTES DE APLICAR (docs/RUNBOOK_MIGRACOES_LOVABLE.md):
--   Toda instrução é IDEMPOTENTE (CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS).
--   Se a produção já tem esses objetos com o MESMO corpo, colar isto é no-op —
--   e essa ausência de mudança É a prova de paridade. Se a produção tiver um
--   corpo DIFERENTE para as funções, o founder deve conferir a divergência
--   antes de aplicar (o Lovable mostra o diff).
--
-- ESCOPO: apenas RECONCILIAÇÃO (definir o que o código já assume). NÃO corrige
-- os P0 de segurança/atomicidade — isso é dos sprints S1–S4:
--   · vínculo token↔onda na policy de INSERT de wave_responses  → S3 (P0-06)
--   · submissão atômica em RPC única                            → S3
--   · máquina de estados da onda (k publica ≠ fechamento)       → S4 (P0-08)
-- Aqui, is_invite_valid_for_wave é escrita para refletir o CONTRATO que o call
-- site já espera (token válido E pertencente à onda) — é a única implementação
-- honesta da assinatura `(p_wave_id, p_token)`, não uma mudança de comportamento.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Colunas de cadastro completo da organização (onboarding setorial) ─────
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS team_size_band TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS segment TEXT;

-- ── 2. Plano comercial no convite (decidido pelo admin da plataforma) ────────
ALTER TABLE public.org_invites ADD COLUMN IF NOT EXISTS plan TEXT;

-- ── 3. Marca de disparo de e-mail do convite de onda ─────────────────────────
ALTER TABLE public.wave_invites ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

-- ── 4. RPC: valida convite E vínculo com a onda ──────────────────────────────
-- Chamada em src/lib/cloud/db-adapter.ts (saveWaveResponse). SECURITY DEFINER
-- porque wave_invites não é legível pelo cliente anônimo. Verifica: o token
-- existe, pertence à onda informada e ainda não foi usado.
CREATE OR REPLACE FUNCTION public.is_invite_valid_for_wave(p_wave_id UUID, p_token TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wave_invites
    WHERE token = p_token
      AND wave_id = p_wave_id
      AND used_at IS NULL
  );
$$;

-- ── 5. RPC: consome o token (marca usado) ────────────────────────────────────
-- Chamada em src/lib/cloud/db-adapter.ts. SECURITY DEFINER porque wave_invites
-- não tem policy de UPDATE para o cliente anônimo. Idempotente: só marca quem
-- ainda não foi marcado.
CREATE OR REPLACE FUNCTION public.mark_invite_used(p_token TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.wave_invites
  SET used_at = NOW()
  WHERE token = p_token AND used_at IS NULL;
$$;
