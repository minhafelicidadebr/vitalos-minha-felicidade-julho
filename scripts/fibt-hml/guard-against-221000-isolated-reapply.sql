-- GUARDA DE PROCEDIMENTO — leitura somente, nunca escreve nada.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ESTE SCRIPT EXISTE (macro-onda 10.2-B fechamento, achado D8)
-- ═══════════════════════════════════════════════════════════════════════════
-- `20260909221000_cohort_differential_suppression.sql` e
-- `20260909222000_cohort_batched_release_temporal_privacy.sql` substituem a
-- MESMA função (`aggregate_cohort_responses`) por `CREATE OR REPLACE`, e a
-- 222000 é a definição final (supressão diferencial + release em lote).
-- Reaplicar SOMENTE a 221000 depois de a 222000 já estar ativa não é
-- idempotência — é REGRESSÃO: o corpo volta ao que só tem supressão
-- diferencial, e o release em lote desaparece silenciosamente. O SQL da
-- 221000 passa sem erro nenhum, e é exatamente por isso que o risco é
-- silencioso.
--
-- Este script NÃO altera nenhuma migration histórica. As três migrations da
-- Task 10.1 permanecem byte a byte como estavam, com os mesmos hashes
-- SHA-256 já citados nos relatórios FIBT_HML_10_2_ROLLOUT_READINESS e
-- FIBT_HML_10_2_B_CONVERGENCIA. Este é um PASSO DE PROCEDIMENTO adicional, a
-- ser executado pelo operador humano ANTES de colar o corpo de
-- `20260909221000` em qualquer sessão — seja no SQL Editor do painel, seja em
-- qualquer outro cliente SQL.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ALCANCE EXATO DO CONTROLE — leia antes de confiar nele
-- ═══════════════════════════════════════════════════════════════════════════
-- Este script detecta a condição de regressão SE E SOMENTE SE for executado
-- e o operador respeitar o veredito. Ele:
--   • NÃO impede execução SQL manual arbitrária de nenhum cliente com
--     credencial suficiente — qualquer pessoa com acesso ao SQL Editor pode
--     colar o corpo de 221000 diretamente, sem rodar este guard antes;
--   • NÃO é um trigger, constraint nem policy do banco — não há enforcement
--     em nível de schema, só um passo de procedimento documentado;
--   • NÃO impede a aplicação da 221000 na ORDEM CORRETA (220000→221000→222000),
--     que é comportamento normal, não regressão;
--   • DETECTA apenas o caso específico "a definição ativa já é a de 222000, e
--     estou prestes a substituí-la pela de 221000" — não cobre qualquer outra
--     forma de drift de schema.
-- Se este script não for executado, ou se seu veredito for ignorado, nenhuma
-- proteção existe. A garantia real contra este risco é operacional
-- (seguir o runbook), não técnica.

DO $guard$
DECLARE
  v_oid  OID := to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)');
  v_def  TEXT;
  v_tem_lote       BOOLEAN;
  v_tem_diferencial BOOLEAN;
BEGIN
  IF v_oid IS NULL THEN
    RAISE NOTICE 'GUARD_VERDICT=OK_APLICAR — aggregate_cohort_responses ainda não existe (banco anterior à Task 10.1). Aplicar 220000 → 221000 → 222000 na ordem é seguro.';
    RETURN;
  END IF;

  v_def := pg_get_functiondef(v_oid);
  v_tem_lote        := v_def ~* 'cohort_capsules';
  v_tem_diferencial := v_def ~* 'v_hidden_segments';

  IF v_tem_lote THEN
    RAISE EXCEPTION E'GUARD_VERDICT=BLOQUEAR_REAPLICACAO_ISOLADA_221000\n'
      'A definição ATIVA de aggregate_cohort_responses já é a de 20260909222000 '
      '(release em lote protegido presente: referencia cohort_capsules). '
      'Reaplicar SOMENTE 20260909221000 agora REGRIDE a função e reabre a '
      'diferenciação temporal (achado D8, macro-onda 10.2-B). '
      'Se a intenção é reconstituir o estado a partir do zero, aplique a '
      'cadeia completa na ordem 220000 -> 221000 -> 222000, nunca 221000 isolada.';
  END IF;

  IF v_tem_diferencial THEN
    RAISE NOTICE 'GUARD_VERDICT=OK_JA_APLICADA_221000 — a definição ativa já inclui a supressão diferencial de 221000 e ainda não avançou para 222000. Aplicar 222000 a seguir é a ordem correta.';
    RETURN;
  END IF;

  RAISE NOTICE 'GUARD_VERDICT=OK_APLICAR — a definição ativa não contém nem a supressão diferencial (221000) nem o release em lote (222000). Aplicar 220000 -> 221000 -> 222000 na ordem é seguro.';
END
$guard$;
