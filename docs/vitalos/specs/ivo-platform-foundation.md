# Spec — Fundação da plataforma IVO

## Escopo

Catálogo de lentes, quatro dimensões, estados trimestrais, contrato normalizado
e matriz 4×4. Somente FIB-T funcional.

## Componentes

| Peça | Caminho |
|---|---|
| Contrato e matriz (puros) | `src/engine/ivo/lens-contract.ts`, `src/engine/ivo/ivo-matrix.ts` |
| Catálogo de lentes | `src/domain/ivo/lens-catalog.ts` (deriva de `journey.ts`) |
| Dimensões | `src/domain/ivo/lens-catalog.ts` → `ivoDimensionsForPack(packId)` (rótulos do índice do pack) |
| Mapeamentos | `src/domain/ivo/dimension-mappings.json` + `dimension-mappings.ts` |

## Matriz 4×4

Linhas = dimensões; colunas = lentes. Cada célula: `availability`,
`instrumentVersion`, `publicationState`, `lastMeasuredAt`, `mapping`
(`none | proposed | approved`), `evidence` (leituras que sustentam a célula) e
`detailRoute`.

Regras:
- M1 — Lente `planned` → célula `planned`, sem evidência, sem data.
- M2 — Lente funcional sem leitura → `prepared`.
- M3 — Leitura de outra organização é descartada e reportada em `warnings`.
- M4 — Sem mapeamento `APROVADO` para a célula → `mapping: "none"` e `evidence: []`, ainda que a lente esteja publicada (estado da lente continua visível).
- M5 — Nenhuma célula carrega pontuação.
- M6 — Ordem das colunas segue a jornada (Q1..Q4).
