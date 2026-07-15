# UX Premium e Acessibilidade

**ID:** `SKILL-PREMIUM-UX-ACCESSIBILITY` · **Versão:** `1.0.0` · **Categoria:** `ux`

## Propósito
Garantir interação contextual, clara, acessível e sem poluição visual.

## Entradas
- `surface`
- `cta_definition`
- `response_contract`
- `a11y_preferences`

## Saídas
- `cta_hierarchy`
- `drawer_state`
- `copy`
- `a11y_checks`

## Evidência
- Não altera claims.

## Privacidade
- Transparência de dados e limites.

## Revisão humana
Obrigatória por padrão: **Não**
- Sem gatilho adicional.

## Usos proibidos
- Dark patterns
- Capacidade simulada como real

## Testes de aceite
- [ ] Teclado, foco, ARIA, mobile e reduced motion.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
