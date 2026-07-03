-- ═══════════════════════════════════════════════════════════════════════════
-- CICLO DE VIDA DA ONDA — k-anonimato publica, fechamento é decisão humana
-- (P0-08, Sprint S4)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: triggerCapsuleAggregation (capsule-aggregator.server.ts) selava a
-- onda (status → 'sealed') automaticamente na PRIMEIRA vez que n≥5. Uma onda
-- planejada para 200 ou 500 pessoas parava de aceitar respostas assim que a
-- 5ª chegasse — k-anonymity (limiar de PUBLICAÇÃO do agregado) e fechamento
-- de coleta (decisão de QUANDO parar) são conceitos diferentes que o código
-- tratava como um só evento.
--
-- SOLUÇÃO: a agregação passa a ser IDEMPOTENTE E REPETÍVEL — cada vez que
-- roda (automaticamente após uma resposta, ou manualmente pelo admin), ela
-- ATUALIZA a cápsula existente (ou cria a primeira) refletindo TODAS as
-- respostas até aquele momento, sem nunca tocar o status da onda. Fechar a
-- onda vira uma ação SEPARADA e explícita (closeWaveAsAdmin, wave-admin.server.ts)
-- — só ela seta status='sealed'. Isso exige capsulas com no máximo 1 registro
-- por onda (upsert por wave_id), daí a constraint abaixo.
--
-- Vocabulário de status preservado (draft/collecting/sealed/...) — não
-- introduzimos estados novos. A mudança é de QUANDO 'sealed' é setado, não
-- do que ele significa nem de quantos estados existem.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  ALTER TABLE public.wave_capsules ADD CONSTRAINT wave_capsules_wave_id_unique UNIQUE (wave_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
