-- Compensação de linhagem duplicada — REPLAY LOCAL APENAS. Ver README.md.
--
-- 20260703220000_learning_persistence.sql já criou as três policies abaixo.
-- Esta migration (eco gerado pelo Lovable da mesma mudança) as recria com
-- CREATE POLICY sem guarda, o que aborta o replay em ordem lexicográfica.
--
-- Os DROPs são no-op quando a policy não existe, e as definições recriadas pela
-- migration são idênticas às originais, então o estado final do replay é o
-- mesmo com ou sem estas linhas.
DROP POLICY IF EXISTS "own_card_state" ON public.sm2_card_state;
DROP POLICY IF EXISTS "own_events_select" ON public.participation_events;
DROP POLICY IF EXISTS "own_events_insert" ON public.participation_events;
