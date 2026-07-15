# Pack Escola

**ID:** `SKILL-SCHOOL-PACK` · **Versão:** `1.0.0` · **Categoria:** `segment`

## Propósito
Adaptar linguagem, papéis, atividades e governança ao contexto escolar.

## Entradas
- `resolved_context`
- `school_role`

## Saídas
- `school_vocabulary`
- `role_constraints`
- `eligible_methods`
- `safeguards`

## Evidência
- Conteúdo adequado ao papel.

## Privacidade
- Proteção reforçada para crianças e adolescentes.

## Revisão humana
Obrigatória por padrão: **Sim**
- `minor_safety`
- `disciplinary_use`

## Usos proibidos
- Diagnóstico de estudante
- Ranking de turma
- Predição de comportamento

## Testes de aceite
- [ ] Reflexão privada não é exposta.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
