# Governança Central

**ID:** `SKILL-CORE-GOVERNANCE` · **Versão:** `1.0.0` · **Categoria:** `governance`

## Propósito
Aplicar Constituição, Policy Gate, status e revisão humana.

## Entradas
- `context_envelope`
- `intent`
- `role`
- `segment`

## Saídas
- `policy_decision`
- `allowed_skills`
- `limits`

## Evidência
- Não cria claims.

## Privacidade
- Bloqueia cross-tenant e dados individuais.

## Revisão humana
Obrigatória por padrão: **Sim**
- `legal_risk`
- `clinical_risk`
- `people_decision`

## Usos proibidos
- Bypass de gates
- Aprovação automática

## Testes de aceite
- [ ] Toda execução retorna limites.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
