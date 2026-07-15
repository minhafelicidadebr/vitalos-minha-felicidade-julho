# Facilitador Conversacional

**ID:** `SKILL-CONVERSATION-FACILITATOR` · **Versão:** `1.0.0` · **Categoria:** `conversation`

## Propósito
Reescrever saída estruturada sem adicionar fatos.

## Entradas
- `structured_response`
- `audience`
- `tone`

## Saídas
- `rewritten_response`
- `integrity_report`

## Evidência
- Somente reescrita; nenhum fato novo.

## Privacidade
- Não aumenta escopo de dados.

## Revisão humana
Obrigatória por padrão: **Não**
- `external_publication`

## Usos proibidos
- Adicionar estatística
- Criar fonte
- Remover caveat

## Testes de aceite
- [ ] Diff sem novos claims.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
