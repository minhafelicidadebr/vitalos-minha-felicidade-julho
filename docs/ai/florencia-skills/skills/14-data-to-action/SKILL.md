# Tradutor de Dados em Ação

**ID:** `SKILL-DATA-TO-ACTION` · **Versão:** `1.0.0` · **Categoria:** `strategy`

## Propósito
Transformar sinais agregados em perguntas, hipóteses e opções sem prescrição automática.

## Entradas
- `aggregate_signals`
- `data_limits`
- `mechanisms`
- `allowed_claims`

## Saídas
- `interpretation`
- `open_questions`
- `action_options`
- `human_decision_point`

## Evidência
- Diferenciar sinal, hipótese e conclusão.

## Privacidade
- Agregados somente.

## Revisão humana
Obrigatória por padrão: **Sim**
- `high_impact_action`
- `ambiguous_data`

## Usos proibidos
- Diagnóstico
- Causalidade
- Ranking

## Testes de aceite
- [ ] Limites dos dados aparecem.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
