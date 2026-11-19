# Q3 · PERMA+V · fundação neutra · 19/11/2026

Branch `feat/claude-q3-fundacao` (worktree `..\vitalos-claude-q3`), base `6d48c48` (candidato Q1+Q2 com gate local verde). Estado: **fundação versionada; sem instrumento, itens, escala, cálculo ou pontuação**. Q4 fora deste escopo.

## Estado observado

| Superfície | Situação |
| --- | --- |
| Catálogo (`src/domain/ivo/lens-catalog.ts`) | `perma_v`, Q3, `availability: "planned"`, sem versão e sem rota |
| Jornada (`src/domain/journey.ts`) | estágio `florescimento` = Q3 |
| Habilitação (`module-contract.ts`) | só `Q1`, `Q2`; não há módulo Q3 |
| Autorização de uso (`instrument-usage-authorization.json`) | sem entrada PERMA |
| Referência (`docs/instrumentos/PERMA_TRABALHO.md`) | cita Seligman (2011) e validação BR 2026 de 15 itens; inclui mapeamento a pilares IVO — **não adotado** |

## Entregue

- `src/domain/ivo/q3-readiness.ts`: 8 pré-condições (Q3-01…Q3-08), todas `pending`, com responsável por papel; `isQ3Activatable()` só é verdadeiro com todas decididas **e** com registro de decisão.
- `src/domain/ivo/q3-readiness.test.ts` (5): Q3 não ativável hoje; decisão sem registro não conta; catálogo mantém `perma_v` planejada sem versão/rota; nenhum módulo Q3 no contrato; responsáveis por papel.

Reuso previsto quando as decisões existirem: organização da sessão (`authorizeIvoSession`), habilitação por módulo (`org_module_entitlements`, após Q3-06), publicação protegida k≥5, contrato de unidade/atividade versionada (padrão D10) e o harness de personas. Nada de pontuação, mapeamento ou equivalência com Q1/Q2 é reutilizado.

## Pré-condições (decisão humana)

Q3-01 instrumento e significado do “+V” · Q3-02 fonte/versão BR e permissão · Q3-03 itens, escala, polaridade, ausências, cálculo · Q3-04 limiar e proteção de recortes · Q3-05 mapeamento IVO ou não mapear · Q3-06 módulo Q3 (migration) · Q3-07 papéis · Q3-08 conteúdo educativo e revisão.

## Verificação

`bun test src/domain/ivo/q3-readiness.test.ts src/domain/ivo/ivo-domain.test.ts`: 15 aprovados; `bunx tsc --noEmit` limpo.

## Entrega 2 · aviso de prontidão na Visão IVO

`src/components/ivo/Q3ReadinessNotice.tsx`, exibido em `/ivo-integral` logo após o aviso do Q1. **Informativo**: diz que nada é medido, pontuado ou publicado; mostra "0 de 8 decisões registradas" e a lista Q3-01…Q3-08 com responsável por papel, derivada de `q3-readiness.ts` (fonte única). Sem link, botão, formulário ou valor; texto explícito de independência de Q1/Q2. Testes: `Q3ReadinessNotice.test.tsx` (2) + `q3-readiness.test.ts` (5). `bun run gate` na branch: 4.549 aprovados, paridade, TypeScript, secret-scan. Não verificado no navegador.

**Navegador (19/11/2026, app da branch em 8095 contra a pilha descartável, RH Norte):** `/ivo-integral` exibe o aviso com "0 de 8 decisões registradas", 8 itens, "Nada é medido…", 0 elementos interativos. 320 px e 390 px: largura útil = rolagem, aviso dentro da tela (borda 304/374 px). Teclado: o aviso não tem foco próprio (é informativo) e não interrompe a ordem de tabulação. Revisão independente (Codex): aviso confere como informativo.

## F0 · base consolidada · 19/11/2026

Merge revisado de `integ/q1-q2-merge` (`f8cabb9`: correções SST e delegação do Q1, B2.1 e linhagem do replay) na branch Q3. Nenhum arquivo tocado pelos dois lados desde `6d48c48` (17 × 8); sem conflitos. `bun run gate`: 4.553 aprovados, paridade, TypeScript, secret-scan. Aviso Q3 e contrato de prontidão inalterados.
