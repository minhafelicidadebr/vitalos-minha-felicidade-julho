# Pack Empresa

**ID:** `SKILL-ENTERPRISE-PACK` · **Versão:** `1.0.0` · **Categoria:** `segment`

## Propósito
Adaptar linguagem, papéis, métodos e saídas ao contexto empresarial.

## Entradas
- `resolved_context`
- `enterprise_role`

## Saídas
- `enterprise_vocabulary`
- `role_constraints`
- `eligible_methods`

## Evidência
- Riscos psicossociais separados de florescimento.

## Privacidade
- Gestores não recebem respostas individuais.

## Revisão humana
Obrigatória por padrão: **Não**
- Sem gatilho adicional.

## Usos proibidos
- Decisão automática de RH
- Garantia de conformidade

## Testes de aceite
- [ ] Líder não recebe dado individual.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
