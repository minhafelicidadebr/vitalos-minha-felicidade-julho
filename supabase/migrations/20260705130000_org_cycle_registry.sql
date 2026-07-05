-- ═══════════════════════════════════════════════════════════════════════════
-- COFRE DE CICLOS — o registro humano de ciclo (I-P1, Sprint S6.75)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO: cycle-proof.server.ts, earned-seal.server.ts e board-brief.server.ts
-- já compõem `buildLongitudinalReading`/`evaluateInterventionBatch` sobre um
-- HISTÓRICO de MeasurementContextCapsule — hoje só via capsule-history-mock.ts
-- (dado de demonstração, compartilhado por setor). O que faltava era o
-- pipeline real: cápsulas seladas (S4, `wave_capsules`) já existem por
-- organização, mas nada as promove a "ciclo" da série longitudinal.
--
-- A PEÇA CENTRAL: publicar um agregado é automático (k-anon ≥5, S4); mas
-- REGISTRAR um agregado como "o ciclo 2026-T1 do COPSOQ desta organização" é
-- uma DECISÃO HUMANA, nunca automática — mesmo princípio já usado no arco
-- (agregação é output do pipeline; fechar a onda é ação humana separada,
-- ver wave-admin.server.ts/closeWaveAsAdmin). Sem essa distinção, qualquer
-- leitura parcial protegida durante a coleta viraria "ciclo" prematuramente.
--
-- GUARDA: só se registra um capsule cuja ONDA já está SELADA (waves.status =
-- 'sealed') — uma cápsula ainda em coleta é uma leitura parcial protegida,
-- não um retrato definitivo do ciclo. Registrar um capsule ainda em coleta
-- comprometeria a série (o número mudaria sob os pés do ciclo já registrado).
--
-- MODELO DE CONFIANÇA: mesma disciplina S1-S6 — nenhuma função aceita org_id
-- do payload para fins de autorização; a RPC recebe org_id só para o INSERT
-- em si, e o `cycle-history.server.ts` (TS) sempre resolve o org_id REAL via
-- requireOrgAdmin(accessToken) antes de chamar esta função. EXECUTE revogado
-- de PUBLIC/authenticated/anon, só service_role — mesmo padrão das duas
-- migrations anteriores desta sessão (Ledger de Transformação + Cerimônia).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_cycle_registry (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  instrument    TEXT NOT NULL,
  cycle_key     TEXT NOT NULL,
  capsule_id    UUID NOT NULL REFERENCES public.wave_capsules(id),
  registered_by UUID NOT NULL REFERENCES auth.users(id),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, instrument, cycle_key),
  UNIQUE (capsule_id) -- uma cápsula é o retrato de UM ciclo, nunca dois
);

CREATE INDEX IF NOT EXISTS org_cycle_registry_org_instrument_idx
  ON public.org_cycle_registry (org_id, instrument);

-- ─── RLS: leitura para qualquer membro da org; ESCRITA SÓ VIA RPC ───────────

ALTER TABLE public.org_cycle_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_cycle_registry_org_read" ON public.org_cycle_registry;
CREATE POLICY "org_cycle_registry_org_read" ON public.org_cycle_registry FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

REVOKE ALL ON public.org_cycle_registry FROM authenticated, anon;
GRANT SELECT ON public.org_cycle_registry TO authenticated;
GRANT ALL ON public.org_cycle_registry TO service_role;

-- ─── RPC · Registrar um capsule selado como o ciclo X da série ──────────────

CREATE OR REPLACE FUNCTION public.register_org_cycle(
  p_org_id        UUID,
  p_instrument    TEXT,
  p_cycle_key     TEXT,
  p_capsule_id    UUID,
  p_registered_by UUID
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, registry_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_capsule_org_id     UUID;
  v_capsule_instrument TEXT;
  v_wave_id            UUID;
  v_wave_status        TEXT;
  v_registry_id        UUID;
BEGIN
  SELECT org_id, instrument, wave_id INTO v_capsule_org_id, v_capsule_instrument, v_wave_id
  FROM public.wave_capsules WHERE id = p_capsule_id;

  IF v_capsule_org_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'capsule_not_found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF v_capsule_org_id <> p_org_id THEN
    RETURN QUERY SELECT FALSE, 'cross_tenant_denied'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF v_capsule_instrument <> p_instrument THEN
    RETURN QUERY SELECT FALSE, 'instrument_mismatch'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT status INTO v_wave_status FROM public.waves WHERE id = v_wave_id;
  IF v_wave_status IS DISTINCT FROM 'sealed' THEN
    RETURN QUERY SELECT FALSE, 'wave_not_sealed'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.org_cycle_registry
    WHERE org_id = p_org_id AND instrument = p_instrument AND cycle_key = p_cycle_key
  ) THEN
    RETURN QUERY SELECT FALSE, 'cycle_already_registered'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.org_cycle_registry WHERE capsule_id = p_capsule_id) THEN
    RETURN QUERY SELECT FALSE, 'capsule_already_registered'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.org_cycle_registry (org_id, instrument, cycle_key, capsule_id, registered_by)
  VALUES (p_org_id, p_instrument, p_cycle_key, p_capsule_id, p_registered_by)
  RETURNING id INTO v_registry_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_registry_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_org_cycle(UUID, TEXT, TEXT, UUID, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.register_org_cycle(UUID, TEXT, TEXT, UUID, UUID) TO service_role;
