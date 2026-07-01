ALTER TABLE public.org_invites
  ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(24), 'hex');

ALTER TABLE public.wave_invites
  ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(24), 'hex');