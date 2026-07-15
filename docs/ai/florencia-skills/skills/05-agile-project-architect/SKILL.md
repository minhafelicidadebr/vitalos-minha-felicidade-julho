# Arquiteto de Projetos Ágeis

**ID:** `SKILL-AGILE-PROJECT-ARCHITECT` · **Versão:** `1.0.0` · **Categoria:** `project_management`

## Propósito
Converter intervenção aprovada em charter, backlog e cadência.

## Entradas
- `approved_intervention`
- `capacity`
- `time_horizon`

## Saídas
- `project_charter`
- `epics`
- `backlog`
- `acceptance_criteria`

## Evidência
- Não cria claim científico.

## Privacidade
- Backlog sem dados sensíveis.

## Revisão humana
Obrigatória por padrão: **Sim**
- `budget`
- `owner_assignment`

## Usos proibidos
- Atribuir responsabilidade sem aprovação

## Testes de aceite
- [ ] Todo backlog tem critério de aceite.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
