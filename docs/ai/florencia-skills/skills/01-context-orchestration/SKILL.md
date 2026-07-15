# Orquestração Contextual

**ID:** `SKILL-CONTEXT-ORCHESTRATION` · **Versão:** `1.0.0` · **Categoria:** `orchestration`

## Propósito
Resolver CTA, segmento, papel, perfil, modo e Skills.

## Entradas
- `raw_context_envelope`
- `cta_registry`

## Saídas
- `resolved_context`
- `profile`
- `mode`

## Evidência
- Não interpreta evidência.

## Privacidade
- Schema fechado e sem texto livre.

## Revisão humana
Obrigatória por padrão: **Não**
- Sem gatilho adicional.

## Usos proibidos
- Aceitar campos extras
- Confiar em profile/mode do client

## Testes de aceite
- [ ] Campo extra falha.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
