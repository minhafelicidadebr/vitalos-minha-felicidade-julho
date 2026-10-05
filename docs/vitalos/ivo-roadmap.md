# Roadmap canônico IVO — v1.0 (2026-10-05)

Alinhado ao código no commit-base `cfa956b` + a macro-onda local (ver §6). Estados da lista "comprovado" vêm de
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

## 3. Pendente de implementação

| ID | Entregável | Dependência | Responsável (papel) | Critério de conclusão |
|---|---|---|---|---|
| PI-1 | Smoke S2–S8 na versão publicada | acesso do operador | Operador + QA | 7 itens com resultado individual no runbook |
| PI-2 | Persistência de protocolo e avaliação de eficácia (migration aditiva, RPCs, leitura) | D9 (parâmetros C8) | Engenharia | replay clean/preprod/upgrade; isolamento Alfa/Beta; idempotência; histórico append-only |
| PI-3 | UI do protocolo/avaliação em `/ivo-integral/acoes` | PI-2 | Engenharia + UX | 3 desfechos (favorável, desfavorável, inconclusivo) persistem após recarga |
| PI-4 | Snapshot IVO imutável (chave: org+escopo+janela+publicações+versão do método) | D1–D7 | Engenharia | mesma chave → mesma saída, sem duplicar; nova versão não reescreve histórico |
| PI-5 | Guarda de divulgação conjunta e controle temporal para saídas derivadas | D8 | Engenharia + Privacidade | tentativa de reconstruir célula suprimida falha; teste com partição Alfa/Beta |
| PI-6 | Comparabilidade entre ciclos/versões (bloqueio com explicação) | D7, D9 | Engenharia | comparação inválida bloqueada e explicada; válida mostra composição |
| PI-7 | Registro fator → conteúdo educativo (contrato + 1 conteúdo curado real) | D10 | Engenharia + Conteúdo | conteúdo com objetivo, público, fonte e `safe_claim`; sem claim novo |
| PI-8 | Ligação prioridade → conteúdo → aprendizagem na tela de ações | PI-7 | Engenharia + UX | fluxo persiste e reaparece após recarga |
| PI-9 | Visão de governança metodológica (R8) | — | Engenharia | lista versões, mapeamentos e estados; sem número composto |
| PI-10 | Linha do tempo de aprendizagem (R7) | — | Engenharia | lê `action_log`/`evidence_records`; isolamento testado |
| PI-11 | Adaptador COPSOQ (contrato + leitura nativa) | D5 (licença, Domínio A/B) | Engenharia + Jurídico | instrumento licenciado e versão fixa; nenhuma mistura A/B |
| PI-12 | Módulo transversal IVO (se D2 = módulo) | D2 | Produto + Metodológico | itens revisados, pré-teste, manifesto congelado |
| PI-13 | Encerrar plano (`closed`) e incluir ação em plano existente | — | Engenharia | RPC aditiva + teste de isolamento |

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