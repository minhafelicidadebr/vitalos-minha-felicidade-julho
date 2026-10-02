# Spec — Dashboards IVO

## Componente da matriz (`src/components/ivo/IvoLensMatrix.tsx`)

- Tabela semântica: `<caption>`, `<th scope="col">` por lente, `<th scope="row">` por dimensão.
- Cada célula mostra rótulo textual de estado (não só cor) e versão quando houver.
- Nenhum número de pontuação é renderizado.
- Avisos (`warnings`) aparecem em região `role="status"`.
- Estado vazio: sem organização selecionada → texto explicativo, matriz de catálogo.

## Visão executiva (R5)

Ciclo anual, estado das 4 lentes, prioridades, ações e evidências — reutiliza
`season-engine` e o ledger quando habilitados. Ainda não implementada.

## Dashboard da lente FIB-T

Reutiliza `FibtManagerControlCenter` sem alteração de apresentação.
