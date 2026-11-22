# Pacote de validação humana · Q3 e pendências herdadas · 19/11/2026

Branch `feat/claude-q3-fundacao`, HEAD após F1 (`119fede`) e F2 (`ebbfd70`). `bun run gate`: 4.569 aprovados, paridade, TypeScript, secret-scan. Tudo que dispensava decisão humana já foi feito. O que falta **depende de você**, nesta ordem de desbloqueio (ToT: cada decisão abre a próxima fatia sem retrabalho).

## Entregue sem decisão

- **F1** `scripts/check-perma-v-source.ts`: ficha de fonte só com hashes; CLI recusa hoje com "Q3-01/Q3-02/Q3-03 pendentes" (verificado: exit 1). Ficha `test` recusada fora dos testes. 5 testes.
- **F2** `src/lib/ivo/q3-role-policy.ts`: Q3-07 em função pura, não ligada (teste de importadores = nenhum). Leitura individual sempre recusada. 5 testes.
- `isQ3Activatable()` continua falso.

## Decisões a registrar (Q3)

| # | Decisão | Desbloqueia | Responsável | O que preciso receber |
| --- | --- | --- | --- | --- |
| 1 | **Q3-01** instrumento e significado do "+V" (ou "sem +V") | F3 | direção científica | nome, edição, forma; definição do +V e sua fonte |
| 2 | **Q3-02** fonte BR e permissão de uso | F3 | direção científica + jurídico | arquivo-fonte (fora do repo), hash, localizador, registro da permissão |
| 3 | **Q3-03** itens, escala, polaridade, ausências, cálculo | F3 | direção científica | regra de ausências por fator; ≥2 casos esperados (um suprimido) |
| 4 | **Q3-06** módulo Q3 em `org_module_entitlements` | F4 | founder | aprovação da migration aditiva local (após 1–3) |
| 5 | **Q3-04** limiar k e proteção de recortes | F5 | founder + privacidade | k (≥5) e regra de lote |
| 6 | **Q3-08** conteúdo educativo e revisão editorial | F6 | editorial | revisor e critério de aceite |
| 7 | **Q3-05** mapear ao IVO ou não mapear | F6 | direção científica | se mapear: matriz com fonte; nunca índice composto |
| 8 | **SST no Q3** (não coberto pela Q3-07) | F2 | founder | hoje recusado por padrão; confirmar ou ampliar |

Observação: `docs/instrumentos/PERMA_TRABALHO.md` (15 itens, mapeamento a pilares) é **candidato a verificar**, não fonte aprovada — não usei.

## Pendências de outros donos (replay clean, 16 passos falhando)

| Item | Dono | Decisão |
| --- | --- | --- |
| Três RPCs do Q1 em `public` violam a M6A | frente Q1 (Codex) | mover para schema privado ou exceção registrada na M6A |
| Guard de módulo contra fixtures das suítes 06–09 | frente Q1/Q2 | fixtures habilitarem o módulo ou guard reconhecer o contexto de teste |
| `aggregate_cohort_responses` redefinida quebra a caracterização do release em lote | frente Q2 + revisão | atualizar a caracterização ou reverter a redefinição |

## Fora do escopo (não toquei)

Push, deploy, migration remota, stack preservado, checkout do Codex/Q4, `.q.out`/`.q.sql`, `.env*`. Pilha descartável desligada.
