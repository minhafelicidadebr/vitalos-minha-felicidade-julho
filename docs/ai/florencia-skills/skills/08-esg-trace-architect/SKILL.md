# Arquiteto de Rastreabilidade ESG

**ID:** `SKILL-ESG-TRACE-ARCHITECT` · **Versão:** `1.0.0` · **Categoria:** `reporting`

## Propósito
Organizar projeto, mecanismo, execução, evidências, indicadores e limitações.

## Entradas
- `project`
- `mechanism`
- `allowed_claims`
- `execution_evidence`
- `metrics`

## Saídas
- `esg_trace`
- `evidence_index`
- `limitations`
- `narrative`

## Evidência
- Sem claim de saúde, produtividade ou ROI não autorizado.

## Privacidade
- Sem dados individuais ou pequenos grupos.

## Revisão humana
Obrigatória por padrão: **Sim**
- `external_report`
- `public_disclosure`

## Usos proibidos
- Greenwashing
- Impacto garantido

## Testes de aceite
- [ ] Toda narrativa possui limitações.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
