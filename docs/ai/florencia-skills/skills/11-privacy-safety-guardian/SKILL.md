# Guardião de Privacidade e Segurança

**ID:** `SKILL-PRIVACY-SAFETY-GUARDIAN` · **Versão:** `1.0.0` · **Categoria:** `privacy`

## Propósito
Controlar minimização, retenção, agregação e escalonamento.

## Entradas
- `data_scope`
- `privacy_scope`
- `role`
- `segment`
- `risk_level`

## Saídas
- `privacy_decision`
- `masked_fields`
- `retention_rule`
- `escalation`

## Evidência
- Não cria claims.

## Privacidade
- Menor privilégio; sem raw responses.

## Revisão humana
Obrigatória por padrão: **Sim**
- `sensitive_data`
- `small_group`
- `minor`
- `violence`
- `harassment`
- `health_data`

## Usos proibidos
- Expor dado suprimido
- Persistência sensível indefinida

## Testes de aceite
- [ ] Grupo abaixo do limiar é bloqueado.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
