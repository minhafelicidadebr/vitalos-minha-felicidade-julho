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
| Ciclo | `src/domain/ivo/cycle-key.ts` |
| Leitura Q2 e ciclo de ação | `src/lib/ivo/` (ver `fibt-q2-integration.md`, `action-learning-loop.md`) |

## Matriz 4×4

Linhas = dimensões; colunas = lentes. Cada célula: `availability`,
`instrumentVersion`, `publicationState`, `resultState`, `cohortSummary`,
`lastMeasuredAt`, `mapping` (`none | proposed | approved`), `evidence`
(leituras que sustentam a célula) e `detailRoute`.

Regras:
- M1 — Lente `planned` → célula `planned`, `resultState: not_applicable`, sem evidência, sem data.
- M2 — Lente funcional sem leitura → `prepared`, `resultState: no_reading`.
- M3 — Leitura de outra organização é descartada e reportada em `warnings`.
- M4 — Sem mapeamento `APROVADO` para a célula → `mapping: "none"` e `evidence: []`, ainda que a lente esteja publicada (estado da lente continua visível).
- M5 — Nenhuma célula carrega pontuação.
- M6 — Ordem das colunas segue a jornada (Q1..Q4).
- M7 — `resultState` distingue `available` (≥1 setor publicado), `protected` (nenhum publicado, algum retido), `collecting` e `no_data`; `cohortSummary` conta setores, nunca participantes.

## Demonstração local (organizações fictícias)

Pré-requisitos: Docker Desktop em execução, `bun install`, Microsoft Edge (só para a verificação visual).

```
bun run demo:ivo:setup    # Supabase LOCAL descartável em .ivo-demo.local/ (portas 55421/55422/55424),
                          # linhagem de produção + R6, duas organizações fictícias, publicação canônica
bun run demo:ivo:proof    # prova de integração com sessões reais (escrita + releitura em processo novo)
bun run demo:ivo:dev      # app em http://localhost:8080 contra o Supabase local
bun run demo:ivo:visual   # (com o dev rodando) Edge headless: login, desktop/celular, teclado, recarga
bun run demo:ivo:stop     # derruba o stack local e descarta os dados
```

Acesso pela interface: `http://localhost:8080/entrar`, e-mail
`gestora.alfa@alfa.ficticia.test` (Alfa) ou `gestor.beta@beta.ficticia.test`
(Beta); o link mágico chega no Mailpit local (`http://127.0.0.1:55424`).
Depois: `/ivo-integral` → "Ver leitura Q2" → "Definir prioridade" → plano do
ciclo → responsável/prazo → ativar → estado → evidência e aprendizagem.

Fixtures: Alfa tem Operações (9, publicada), Atendimento (6, publicação
pendente), Logística (3) e Financeiro (2) abaixo do limiar, Comercial (0, em
coleta). Beta tem Produção (8) e Qualidade (3) — supressão complementar retém
ambas. Respostas sintéticas determinísticas; nenhum dado real.

Fronteira: os scripts só aceitam destino loopback e o container
`supabase_db_vitalos-ivo-local`; as chaves são as padrão do Supabase CLI local,
gravadas apenas em `.ivo-demo.local/` (ignorado pelo git).
