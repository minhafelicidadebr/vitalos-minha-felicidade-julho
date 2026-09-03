-- Macro-Onda 3: one distributable shared link per wave/cohort at a time.
--
-- The cohort binding RPC resolves wave_cohorts.key through sector_label. A
-- duplicate active link would make revocation and operational custody
-- ambiguous. Expired rows remain status=active until an administrator revokes
-- them, so renewal is an explicit revoke-then-issue operation.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.sector_links') IS NULL THEN
    RAISE EXCEPTION 'ABORTED: public.sector_links does not exist.';
  END IF;
  IF to_regclass('public.waves') IS NULL OR to_regclass('public.wave_cohorts') IS NULL THEN
    RAISE EXCEPTION 'ABORTED: wave/cohort contract is not available.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.sector_links
     WHERE status = 'active'
     GROUP BY wave_id, sector_label
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'ABORTED: duplicate active sector links must be reconciled first.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sector_links_one_active_per_wave_cohort
  ON public.sector_links (wave_id, sector_label)
  WHERE status = 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sector_links_wave_org_fk'
  ) THEN
    ALTER TABLE public.sector_links
      ADD CONSTRAINT sector_links_wave_org_fk
      FOREIGN KEY (wave_id, org_id)
      REFERENCES public.waves(id, org_id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sector_links_wave_cohort_key_fk'
  ) THEN
    ALTER TABLE public.sector_links
      ADD CONSTRAINT sector_links_wave_cohort_key_fk
      FOREIGN KEY (wave_id, sector_label)
      REFERENCES public.wave_cohorts(wave_id, key)
      NOT VALID;
  END IF;
END $$;

COMMIT;
