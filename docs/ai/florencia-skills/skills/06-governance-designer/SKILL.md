# Designer de Governança

**ID:** `SKILL-GOVERNANCE-DESIGNER` · **Versão:** `1.0.0` · **Categoria:** `governance`

## Propósito
Estruturar papéis, alçadas, fóruns, decisões e prestação de contas.

## Entradas
- `program_scope`
- `stakeholders`
- `decision_types`

## Saídas
- `raci`
- `decision_matrix`
- `governance_calendar`
- `escalation_path`

## Evidência
- Método vem do Method Registry.

## Privacidade
- Menor privilégio.

## Revisão humana
Obrigatória por padrão: **Sim**
- `formal_governance_change`

## Usos proibidos
- Criar autoridade inexistente

## Testes de aceite
- [ ] Cada decisão tem responsável e aprovador.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
