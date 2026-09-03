-- Compensação de linhagem duplicada — REPLAY LOCAL APENAS. Ver README.md.
--
-- 20260703160000_wave_lifecycle_and_capsule_upsert.sql já criou
-- wave_capsules_wave_id_unique. Esta migration (eco gerado pelo Lovable da
-- mesma mudança) recria a MESMA constraint com um ALTER TABLE ADD CONSTRAINT
-- sem guarda, o que aborta o replay em ordem lexicográfica.
--
-- O DROP abaixo é no-op quando a constraint não existe, e a definição recriada
-- pela migration é idêntica (UNIQUE (wave_id) em public.wave_capsules), então o
-- estado final do replay é o mesmo com ou sem esta linha.
ALTER TABLE public.wave_capsules
  DROP CONSTRAINT IF EXISTS wave_capsules_wave_id_unique;
