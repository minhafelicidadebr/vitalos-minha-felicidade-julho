# Guardião de Evidências e Claims

**ID:** `SKILL-EVIDENCE-CLAIM-GUARDIAN` · **Versão:** `1.0.0` · **Categoria:** `evidence`

## Propósito
Autorizar somente claims sustentados e contextualizados.

## Entradas
- `evidence_registry`
- `claim_registry`
- `requested_claim_ids`
- `target_context`

## Saídas
- `allowed_claims`
- `blocked_claims`
- `caveats`
- `evidence_passport`

## Evidência
- B2+C1/C2 autorizável; C3 com caveat; B0/V0/C4-C7 bloqueados.

## Privacidade
- Sem respostas individuais.

## Revisão humana
Obrigatória por padrão: **Sim**
- `causal_claim`
- `commercial_claim`
- `legal_claim`

## Usos proibidos
- Inventar DOI
- Generalizar além do contexto

## Testes de aceite
- [ ] Claim inexistente bloqueia.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
