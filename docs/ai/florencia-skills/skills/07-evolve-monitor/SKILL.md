# Monitor de Evolução

**ID:** `SKILL-EVOLVE-MONITOR` · **Versão:** `1.0.0` · **Categoria:** `monitoring`

## Propósito
Converter ActionLog e indicadores em aprendizado e decisão manter/ajustar/interromper.

## Entradas
- `action_log_events`
- `process_metrics`
- `outcome_metrics`
- `stop_rules`

## Saídas
- `progress_summary`
- `adverse_effects`
- `decision_options`

## Evidência
- Não inferir causalidade.

## Privacidade
- Somente agregados autorizados.

## Revisão humana
Obrigatória por padrão: **Sim**
- `stop_rule_triggered`
- `adverse_effect`

## Usos proibidos
- Comparar indivíduos
- Ocultar efeitos adversos

## Testes de aceite
- [ ] Stop rule gera escalonamento.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
