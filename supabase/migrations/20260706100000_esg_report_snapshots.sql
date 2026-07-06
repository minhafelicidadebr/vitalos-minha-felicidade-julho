-- ═══════════════════════════════════════════════════════════════════════════
-- DOSSIÊ ESG AUDITÁVEL — snapshot imutável (I-E1 §F4, Sprint premium pós-S6.75)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO: engine/esg-report/assurance-annex-engine.ts (puro, testado) já
-- decide o que pode ser PUBLICADO com integridade (linhagem completa, ciclo
-- medido, omissão documentada, equilíbrio GRI — as 5 regras F3) e valida a
-- completude das declarações de materialidade dupla (F2). Faltava só onde
-- guardar o resultado: um snapshot IMUTÁVEL do que foi gerado, com hash, para
-- que um terceiro possa um dia verificar que o PDF que recebeu é íntegro
-- (o gancho do futuro portal de auditoria — não construído agora, só o dado).
--
-- REGERAR = NOVA LINHA (F4, verbatim do blueprint): esta tabela NUNCA é
-- atualizada, só recebe INSERT. Não há UNIQUE(org_id, year) de propósito —
-- gerar um novo snapshot no mesmo ano é uma nova versão auditável, nunca uma
-- substituição silenciosa da anterior.
--
-- O QUE VAI NO PAYLOAD: o relatório completo (AnnualEsgReport) MAIS o Anexo
-- de Asseguração (AssuranceAnnex — KPIs publicados, lacunas, materialidade,
-- os 5 checks F3) — a declaração de materialidade "entra no snapshot" (F2)
-- porque não existe uma tabela viva de materialidade; ela é parte do
-- artefato gerado, não um registro à parte que muda por fora.
--
-- MODELO DE CONFIANÇA: mesma disciplina S1-S6.75 — nenhuma função aceita
-- org_id do payload para fins de autorização; a RPC recebe org_id só para o
-- INSERT em si, e o server (.functions.ts) sempre resolve via
-- requireOrgAdmin(accessToken) antes de chamar. EXECUTE revogado de
-- PUBLIC/authenticated/anon, só service_role.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.esg_report_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  payload       JSONB NOT NULL,
  content_hash  TEXT NOT NULL,
  generated_by  UUID NOT NULL REFERENCES auth.users(id),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS esg_report_snapshots_org_year_idx
  ON public.esg_report_snapshots (org_id, year, generated_at DESC);

-- ─── RLS: leitura para qualquer membro da org; ESCRITA SÓ VIA RPC ───────────

ALTER TABLE public.esg_report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esg_report_snapshots_org_read" ON public.esg_report_snapshots;
CREATE POLICY "esg_report_snapshots_org_read" ON public.esg_report_snapshots FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

REVOKE ALL ON public.esg_report_snapshots FROM authenticated, anon;
GRANT SELECT ON public.esg_report_snapshots TO authenticated;
GRANT ALL ON public.esg_report_snapshots TO service_role;

-- ─── RPC · Selar um snapshot (INSERT-only, nunca UPDATE) ────────────────────

CREATE OR REPLACE FUNCTION public.create_esg_snapshot(
  p_org_id       UUID,
  p_year         INTEGER,
  p_payload      JSONB,
  p_content_hash TEXT,
  p_generated_by UUID
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, snapshot_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_snapshot_id UUID;
BEGIN
  IF p_payload IS NULL OR p_content_hash IS NULL OR btrim(p_content_hash) = '' THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.esg_report_snapshots (org_id, year, payload, content_hash, generated_by)
  VALUES (p_org_id, p_year, p_payload, p_content_hash, p_generated_by)
  RETURNING id INTO v_snapshot_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_snapshot_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_esg_snapshot(UUID, INTEGER, JSONB, TEXT, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_esg_snapshot(UUID, INTEGER, JSONB, TEXT, UUID) TO service_role;
