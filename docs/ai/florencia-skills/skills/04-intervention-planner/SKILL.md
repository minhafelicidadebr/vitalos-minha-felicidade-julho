# Planejador de Intervenções

**ID:** `SKILL-INTERVENTION-PLANNER` · **Versão:** `1.0.0` · **Categoria:** `intervention`

## Propósito
Converter prioridade em alternativas e projeto supervisionado.

## Entradas
- `priority`
- `mechanism_id`
- `allowed_claims`
- `context`

## Saídas
- `options`
- `project_draft`
- `metrics`
- `risks`
- `stop_rules`

## Evidência
- Toda intervenção declara hipótese e limites.

## Privacidade
- Somente contexto agregado ou institucional.

## Revisão humana
Obrigatória por padrão: **Sim**
- `project_approval`
- `resource_commitment`

## Usos proibidos
- Prescrição automática
- Promessa de impacto

## Testes de aceite
- [ ] Toda opção inclui stop rule.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
