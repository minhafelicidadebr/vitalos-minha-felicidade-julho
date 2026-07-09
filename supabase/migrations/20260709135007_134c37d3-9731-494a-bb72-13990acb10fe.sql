-- ═══════════════════════════════════════════════════════════════════════════
-- SECTOR LINKS — persistência real do link setorial (P0-01 followup, Plano §I)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: o canal de coleta por link de setor (/respond/s/:token) era 100%
-- mock. Após a correção de honestidade do S4, o modo Cloud RECUSA a submissão
-- explicitamente (nunca finge sucesso) — mas o canal continua inoperante em
-- produção. Esta migration cria a modalidade real.
--
-- MODALIDADE DECLARADA (ToT-C do Plano Mestre): `shared_sector` — UM link
-- compartilhado por setor, MULTI-USO por design (diferente de wave_invites,
-- que é uso único). O link não identifica o respondente: só token_hash,
-- nunca o token bruto (SHA-256 no servidor), e a resposta entra em
-- wave_responses com invite_token NULL — anônima por schema.
-- `credential_mode` (credencial anônima de elegibilidade) fica declarado
-- como Fase 3 no engine e NÃO é implementado aqui.
--
-- Dois modelos de confiança coexistem de propósito (mesmo desenho do S3):
-- "eu sou fulano" (accessToken, RPCs admin) vs "eu tenho ESTE link"
-- (token compartilhado, esta RPC anon).
--
-- k-ANONIMATO: as respostas caem no pool da onda e passam pelo MESMO
-- pipeline de agregação (capsule, n≥5). Agregado POR SETOR é v2 explícita —
-- exigiria coluna de recorte em wave_responses + k-anon por recorte no
-- aggregator; nunca improvisar isso por fora.

-- ── 1. Tabela (padrão wave_invites: zero SELECT policy, tudo via service role)
CREATE TABLE IF NOT EXISTS public.sector_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.organizations(id),
  wave_id      UUID NOT NULL REFERENCES public.waves(id),
  token_hash   TEXT NOT NULL UNIQUE,          -- SHA-256(token); o bruto NUNCA persiste
  sector_label TEXT NOT NULL,                 -- texto amigável; nunca ID interno de setor
  access_mode  TEXT NOT NULL DEFAULT 'shared_sector',
  status       TEXT NOT NULL DEFAULT 'active', -- active | revoked
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sector_links ENABLE ROW LEVEL SECURITY;
-- Zero policies: nenhum cliente lê ou escreve direto — service role e a RPC
-- abaixo são os únicos caminhos.

-- Lição do S5 (ALTER DEFAULT PRIVILEGES desta conta concede ALL em tabela
-- nova): o REVOKE explícito é obrigatório, o GRANT da migration não basta.
REVOKE ALL ON public.sector_links FROM PUBLIC, authenticated, anon;
GRANT ALL ON public.sector_links TO service_role;

CREATE INDEX IF NOT EXISTS sector_links_wave_id ON public.sector_links(wave_id);

-- ── 2. RPC de submissão (SECURITY DEFINER, chamável por anon) ────────────────
-- Validação de instrumento/itens/escala continua em TypeScript
-- (validateBlindSubmission, engine puro) — sector-link.server.ts valida ANTES
-- de invocar. Esta RPC garante VÍNCULO (link→onda), VALIDADE (status/expiração/
-- onda aberta) e INSERT anônimo na mesma transação.
CREATE OR REPLACE FUNCTION public.submit_sector_response(
  p_token_hash TEXT,
  p_answers    JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link        public.sector_links%ROWTYPE;
  v_wave_status TEXT;
  v_count       INTEGER;
BEGIN
  SELECT * INTO v_link FROM public.sector_links WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.status <> 'active' THEN
    RETURN QUERY SELECT FALSE, 'link_revoked'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE, 'link_expired'::TEXT, 0;
    RETURN;
  END IF;

  SELECT status INTO v_wave_status FROM public.waves WHERE id = v_link.wave_id;
  IF v_wave_status IS NULL OR v_wave_status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;

  -- invite_token NULL: anônimo por schema — não há elo de auditoria individual
  -- num link compartilhado, e é exatamente essa a modalidade declarada.
  INSERT INTO public.wave_responses (wave_id, invite_token, answers)
  VALUES (v_link.wave_id, NULL, p_answers);

  SELECT COUNT(*) INTO v_count FROM public.wave_responses WHERE wave_id = v_link.wave_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$$;

-- Trava de EXECUTE (padrão S6): anon e service_role chamam; mais ninguém.
REVOKE EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB)
  FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB)
  TO anon, service_role;
