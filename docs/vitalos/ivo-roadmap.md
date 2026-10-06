# Roadmap canônico IVO — v1.1 (2026-10-05, após a segunda macro-onda local)

Alinhado ao código no commit-base `cfa956b` + as macro-ondas locais (ver §6 e §7). Estados da lista "comprovado" vêm de
testes/CI e de verificações registradas em `staging-rollout.md` §11; o relatório técnico de 05/10 é tratado como
**evidência relatada**, e suas fórmulas, pesos e escalas como **propostas** (não decisões). Decisões: ver
`ivo-methodology-dossier.md` §11 (D1–D10). Arquitetura: `ADR-005`.

## 1. Implementado e comprovado

| Item | Evidência |
|---|---|
| FIB-T: manifesto 32 itens, cálculo nativo (Fatores 0–4, bruto 0–12), ausência fail-closed, k≥5, supressão diferencial, liberação em lote | gate (3900+ testes), CI, SQL `supabase/tests` |
| Camada IVO: contrato `ivo-lens-reading/1`, catálogo, matriz 4×4, adaptador FIB-T, registro de mapeamentos fail-closed | testes + guardas; CI `37332961177` |
| Leitura Q2 autenticada e isolada por organização | staging: operador carregou "Operações → Bem-Estar"; `preflight` 50/0/0 |
| Ciclo prioridade → ação → responsável/prazo → ativação → estado → aprendizagem (R6) | migration `20261002120000` aplicada em staging; teste manual do operador + leitura do banco (plano ativo, ação concluída, 2 aprendizagens, prazo gravado) |
| Infra de staging: Worker, Access (7/7), magic link no host IVO, provisionamento Alfa/Beta | `edge-check` 7/7, sessão de navegador criada no host IVO |
| Versão publicada `8da81ce2` (pacote `8859c01`) | S1 e S9; bundle com rótulos novos |

## 2. Implementado, ainda não homologado

| Item | Falta |
|---|---|
| Cartões de execução × aprendizagem, data civil `America/Sao_Paulo`, envio pendente, datas por extenso | S2–S8 no navegador (operador) |
| Cobertura dimensional (`ivo-coverage`), avaliação de eficácia (`efficacy-protocol`), índice experimental **de teste** | só testes unitários locais; nenhuma rota/servidor os usa (exceto painel de cobertura após revisão de UX) |
| Demonstração local `demo:ivo:*` | não substitui o smoke remoto |
| **Local, provado em banco descartável (segunda macro-onda, §7):** C8 persistente (PI-2) e sua interface (PI-3), governança metodológica consultável (PI-9), linha do tempo e resumo (PI-10), catálogo educativo com conteúdo de TESTE (PI-7/PI-8 parciais) | **nenhum deles está em staging**: a migration `20261005120000` não foi aplicada remotamente; exige revisão e autorização |

## 3. Pendente de implementação

| ID | Entregável | Dependência | Responsável (papel) | Critério de conclusão |
|---|---|---|---|---|
| PI-1 | Smoke S2–S8 na versão publicada | acesso do operador | Operador + QA | 7 itens com resultado individual no runbook |
| PI-2 | ~~Persistência de protocolo e avaliação de eficácia~~ **feito localmente** (migration `20261005120000`, escrita só por `service_role` no servidor, sem RPC pública). **Falta:** revisão + autorização para aplicar em staging | revisão da migration | Engenharia | replay clean/preprod/upgrade ✔ (local); isolamento Alfa/Beta ✔ (local); histórico append-only ✔ (local). Pendente: aplicação remota |
| PI-3 | ~~UI do protocolo/avaliação~~ **feito localmente** (`EfficacyPanel`) | PI-2 remoto | Engenharia + UX | 3 desfechos persistem após recarga ✔ (local). Pendente: homologação em staging |
| PI-4 | Snapshot IVO imutável (chave: org+escopo+janela+publicações+versão do método) | D1–D7 | Engenharia | mesma chave → mesma saída, sem duplicar; nova versão não reescreve histórico |
| PI-5 | Guarda de divulgação conjunta e controle temporal para saídas derivadas | D8 | Engenharia + Privacidade | tentativa de reconstruir célula suprimida falha; teste com partição Alfa/Beta |
| PI-6 | Comparabilidade entre ciclos/versões (bloqueio com explicação) | D7, D9 | Engenharia | comparação inválida bloqueada e explicada; válida mostra composição |
| PI-7 | Registro fator → conteúdo educativo. **Contrato e catálogo feitos localmente** (`factor-content.json`, validador fail-closed, 2 entradas de TESTE identificadas). **Falta:** 1 conteúdo curado REAL | D10 | Engenharia + Conteúdo | conteúdo com objetivo, público, fonte e `safe_claim`; sem claim novo. Hoje: 0 aprovados → "curadoria pendente" |
| PI-8 | ~~Ligação prioridade → conteúdo → aprendizagem~~ **feito localmente** (vínculo `[conteudo:ID@versão]` no ledger existente, só em aprendizagem, só do mesmo fator) | PI-7 real para conteúdo aprovado | Engenharia + UX | fluxo persiste e reaparece após recarga ✔ (com conteúdo de TESTE) |
| PI-9 | ~~Visão de governança metodológica (R8)~~ **feito localmente** (`/ivo-integral/governanca`, registro canônico D1–D10/M1–M6, fluxo técnico "preparar decisão" sem persistência) | — | Engenharia | lista versões, mapeamentos e estados ✔; aprovação indisponível sem autoridade configurada ✔ |
| PI-10 | ~~Linha do tempo de aprendizagem (R7)~~ **feito localmente** (lê o ledger e o C8; sem armazenamento novo) | — | Engenharia | isolamento testado ✔ |
| PI-11 | Adaptador COPSOQ (contrato + leitura nativa) | D5 (licença, Domínio A/B) | Engenharia + Jurídico | instrumento licenciado e versão fixa; nenhuma mistura A/B |
| PI-12 | Módulo transversal IVO (se D2 = módulo) | D2 | Produto + Metodológico | itens revisados, pré-teste, manifesto congelado |
| PI-13 | Encerrar plano (`closed`) e incluir ação em plano existente. O **resumo de encerramento operacional** já existe (somente leitura; não grava `closed`) | — | Engenharia | RPC aditiva + teste de isolamento |
| PI-14 | **Resolução protegida de leitura publicada de outro ciclo** (observação e parecer conclusivo sobre `leitura_publicada`) | D7, D8, D9 | Engenharia + Privacidade | valor resolvido só na leitura, pelo snapshot protegido, sem persistir cópia; comparação só com mesma versão/composição |
| PI-15 | Promover a migration C8 para staging (pacote de revisão + autorização expressa) | revisão da migration | Operador + Engenharia | M6A/preflight verdes no alvo; replay preprod ✔; sem efeito em produção |

## 4. Pendente de decisão metodológica

Lista única, com alternativas e recomendação: `ivo-methodology-dossier.md` §11 — D1 finalidade · D2 cobertura
(menor conjunto) · D3 mapeamentos FIB-T · D4 perguntas abertas do manifesto FIB-T · D5 COPSOQ (licença e
Domínio A/B) · D6 escala, normalização, pesos, agregação (C1/C6) · D7 elegibilidade, janela, comparabilidade ·
D8 privacidade de derivados · D9 parâmetros do protocolo C8 · D10 conteúdo educativo e demais conflitos
(C2–C5, C7). Nenhuma está aprovada.

## 5. Sequência

Onda 0 fechar FIB-T (PI-1) → Onda 1 decisões D1–D10 → Onda 2 IVO piloto `v0.1` em staging (PI-2…PI-6, com D1–D9) →
Onda 3 COPSOQ no mesmo núcleo (PI-11) → Onda 4 validação de campo e demais lentes. PI-7…PI-10 e PI-13 avançam
sem esperar o índice.

## 6. O que a macro-onda de 2026-10-05 acrescentou (local, sem deploy, sem migration, sem escrita remota)

- Documentos: ADR-005, este roadmap, `ivo-methodology-dossier.md`, `specs/efficacy-protocol-c8.md`, `specs/ivo-integrated-slice.md`, `CHECKPOINT.md`.
- Código (nenhum é usado por servidor; só o painel de cobertura aparece em `/ivo-integral`):
  - `src/engine/ivo/efficacy-protocol.ts` — protocolo, comparabilidade, avaliação, parecer e estados do C8 (24 testes);
  - `src/engine/ivo/ivo-coverage.ts` + `src/components/ivo/IvoCoveragePanel.tsx` — estado por dimensão, sem número (8 + 1 testes), montado em `/ivo-integral`;
  - `src/engine/ivo/experimental/ivo-experimental-index.ts` — índice **de teste**, parâmetros e dados sintéticos, trava `NODE_ENV=test`, guarda contra importação (11 testes).
- Estados: nenhum método, mapeamento, peso, escala ou faixa foi aprovado; `dimension-mappings.json` continua vazio.

## 7. O que a segunda macro-onda de 2026-10-05 acrescentou (local; banco local descartável; sem deploy, sem migration remota, sem escrita remota)

- **Migration** `supabase/migrations/20261005120000_ivo_efficacy_protocols.sql` (+ suíte `supabase/tests/08_ivo_efficacy_protocols.sql`, pacote `PACOTE_IVO_C8` no replay): replay clean 39/39, preprod 52/52, upgrade 52/52. Aplicada só no stack local (`bun run demo:ivo:upgrade`).
- **Servidor:** `efficacy-protocol.server.ts` (+ server functions `.strict()`), `ivo-governance.server.ts`, `ivo-education.server.ts`, gate D9 (`ivo-governance-gate.server.ts`), vínculo educativo no ledger (`content-ref.ts`).
- **Domínio/motor:** `methodology-governance.json` (16 entradas, todas em proposta) + carregador fail-closed; `governance-decision.ts`; `factor-content.json` (2 entradas de TESTE).
- **Interface:** `/ivo-integral/governanca` (R8); em `/ivo-integral/acoes`: protocolo C8, resumo de acompanhamento, linha do tempo, painel de educação e seletor de conteúdo na aprendizagem.
- **Prova local:** `bun run demo:ivo:proof` (jornada R5/R6 + C8/R7/R8, sessões reais, duas fases em processos separados, 95 verificações); `bun run demo:ivo:visual:c8` (navegador real, 0 falhas); testes de componente `IvoC8Panels.test.tsx`.
- **Decisões:** `ivo-decision-package.md` (gerado do registro; `bun run ivo:decision-package`).
- **Limites explícitos:** nada aprovado (D1–D10, M1–M6 em proposta); o parecer conclusivo só existe no ambiente local com governança **sintética identificada**; valor de leitura publicada de outro ciclo não é resolvido (PI-14); conteúdo educativo aprovado = 0.
