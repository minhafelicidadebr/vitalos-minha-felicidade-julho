# Spec — Dashboards IVO

## Componente da matriz (`src/components/ivo/IvoLensMatrix.tsx`)

- Tabela semântica: `<caption>`, `<th scope="col">` por lente, `<th scope="row">` por dimensão.
- Cada célula mostra rótulo textual de estado (não só cor) e versão quando houver.
- Nenhum número de pontuação é renderizado.
- Avisos (`warnings`) aparecem em região `role="status"`.
- Estado vazio: sem organização selecionada → texto explicativo, matriz de catálogo.

## Rota de catálogo (`src/routes/ivo-integral.tsx`) — R5 parcial

- Monta `buildIvoMatrix` com `organizationId: null`, `readings: []`, dimensões do
  pack ativo e o registro de mapeamentos (vazio). Sem mock, sem dado de organização.
- Mostra o estado de cada lente (FIB-T funcional; demais planejadas) e nenhuma pontuação.
- Pendente: leitura Q2 real via `toFibtLensReading` atrás de sessão autorizada,
  reutilizando a fronteira de acesso existente (`fibt-manager-access.server.ts`).

## Visão executiva (R5)

Ciclo anual, estado das 4 lentes, prioridades, ações e evidências — reutiliza
`season-engine` e o ledger quando habilitados. Ainda não implementada.

## Dashboard da lente FIB-T

Reutiliza `FibtManagerControlCenter` sem alteração de apresentação.
