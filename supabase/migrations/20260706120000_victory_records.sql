-- ═══════════════════════════════════════════════════════════════════════════
-- ATA DE VITÓRIA — a prova selada da eficácia (I-E2, destrava com o Cofre de
-- Ciclos + a Vigia de Manutenção real, ambos já reais desde S6.75/premium)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO: engine/evolucao/victory-engine.ts (puro, testado) já decide
-- quando um driver do crosswalk NR-1 ganhou uma Ata — exposição caiu de
-- verdade (≥5 pts, o mesmo limiar de "variação relevante" da Reavaliação),
-- a medida de fonte segue mantida (Vigia I-E4, via lib/evolucao/
-- maintenance-bridge.server.ts) e a amostra é reportável (k-anon). Sem
-- QUALQUER uma dessas condições, `buildAtaDeVitoria` devolve null —
-- "atividade não é evidência" é o resultado honesto, nunca um erro a
-- contornar. Esta migration só guarda a Ata JÁ computada, como registro
-- imutável.
--
-- DECISÃO REGISTRADA (Fable5 §8): o blueprint original (Academia Viva 2.0,
-- I4) previa `antagonist_id` como coluna própria — auditado o repositório,
-- a camada de "Expedições"/bestiário que daria sentido a um antagonista
-- nomeado NUNCA foi implementada (só a fatia I1 Sementes Vivas existe). Em
-- vez de gravar um antagonist_id fictício, esta tabela referencia só
-- `driver_id` (o crosswalk NR-1, real) — quando as Expedições existirem de
-- fato, uma coluna `antagonist_id` pode ser adicionada sem quebrar nada
-- (ADD COLUMN é sempre aditivo).
--
-- INSERT-ONLY + UNIQUE(org,cycle,driver): uma Ata por driver por ciclo,
-- nunca duplicada nem reescrita — o hash do payload é o que permite a um
-- terceiro verificar a integridade (mesmo padrão de esg_report_snapshots).
--
-- SEGURANÇA: mesma disciplina das migrations anteriores desta sessão —
-- EXECUTE revogado de PUBLIC/authenticated/anon, só service_role, alcançável
-- via victory.server.ts após requireOrgAdmin(accessToken) resolver a org
-- real do chamador.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.victory_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cycle_key    TEXT NOT NULL,
  driver_id    TEXT NOT NULL,
  payload      JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  issued_by    UUID NOT NULL REFERENCES auth.users(id),
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, cycle_key, driver_id)
);

CREATE INDEX IF NOT EXISTS victory_records_org_idx ON public.victory_records (org_id, issued_at DESC);

-- ─── RLS: leitura para qualquer membro da org; ESCRITA SÓ VIA RPC ───────────

ALTER TABLE public.victory_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "victory_records_org_read" ON public.victory_records;
CREATE POLICY "victory_records_org_read" ON public.victory_records FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

REVOKE ALL ON public.victory_records FROM authenticated, anon;
GRANT SELECT ON public.victory_records TO authenticated;
GRANT ALL ON public.victory_records TO service_role;

-- ─── RPC · Selar uma Ata (INSERT-only) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.seal_victory_record(
  p_org_id       UUID,
  p_cycle_key    TEXT,
  p_driver_id    TEXT,
  p_payload      JSONB,
  p_content_hash TEXT,
  p_issued_by    UUID
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, record_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record_id UUID;
BEGIN
  IF p_payload IS NULL OR p_content_hash IS NULL OR btrim(p_content_hash) = '' THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.victory_records
    WHERE org_id = p_org_id AND cycle_key = p_cycle_key AND driver_id = p_driver_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'victory_already_sealed'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.victory_records (org_id, cycle_key, driver_id, payload, content_hash, issued_by)
  VALUES (p_org_id, p_cycle_key, p_driver_id, p_payload, p_content_hash, p_issued_by)
  RETURNING id INTO v_record_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_record_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seal_victory_record(UUID, TEXT, TEXT, JSONB, TEXT, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.seal_victory_record(UUID, TEXT, TEXT, JSONB, TEXT, UUID) TO service_role;
