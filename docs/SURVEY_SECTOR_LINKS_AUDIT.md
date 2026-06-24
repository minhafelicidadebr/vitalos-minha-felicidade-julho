# Auditoria: Links de Pesquisa por Setor — Estado Real do Repositório

> **Escopo:** auditoria factual. Nenhuma alteração de código, migration ou RLS neste documento.
> **Data:** 2026-06-23
> **Branch auditada:** `feat/instrument-registry-instrumentos-integrais` (base `main` / `adb6dbb`)
> **Protocolo:** Fable 5 §8 — "evidência antes de opinião; nunca afirme sem fonte técnica".

---

## 1 · Sumário executivo

O VitalOS possui **infraestrutura de campanha/onda sólida** (`campaign-engine.ts`, `responder.tsx`,
`response-capture.server.ts`) e uma **fronteira de privacidade madura** (ephemeral_demo, k-anon ≥5,
blind submission, trust-chain attestation em 14 verificações). O que **não existe** é a camada de
**endereçamento opaco por setor**: não há token, não há rota `/respond/s/{token}`, não há QR Code,
não há ciclo de vida de link (expiração/revogação/rotação). A coleta depende hoje de uma rota
autenticada `/responder` com pack derivado do perfil logado — incompatível com o modelo de link
compartilhado anônimo por setor.

---

## 2 · Tabela de capacidades (estado factual)

| Capacidade | Status | Evidência técnica | Risco | Recomendação |
|---|---|---|---|---|
| Tabela/domínio de campanhas | **Parcial** | `engine/campaign/campaign-engine.ts` — `MeasurementWaveInput` orquestra ondas (estado, janela, k-anon, segmentos). Não há tabela Supabase real; tudo é mock. | Sem persistência, campanhas desaparecem ao recarregar | Engine pronto para camada de persistência; aguardar G1 Privacy Vault |
| Setores/unidades | **Parcial** | `SegmentParticipation.segmentId/label` em campaign-engine; `nr1-sector-exposure.ts` (dados por setor). Sem tabela `sectors` no Supabase | Falta granularidade setor→token | Adaptar `SegmentParticipation` → `SectorLinkTarget` |
| Convites / tokens públicos | **Ausente** | Nenhuma referência a token de pesquisa pública. `/responder` usa RBAC logado (usePack → packId) | Impossível distribuir pesquisa sem login | P0 — criar `sector-link-engine.ts` |
| Links de pesquisa opacos | **Ausente** | Nenhuma rota `/respond/s/:token`. `routeTree.gen.ts` não contém este padrão | Sector_id vaza via URL, ou link impossível | P0 — criar rota com token opaco 256+ bits |
| QR Code | **Ausente** | Nenhum componente de QR Code no repo | Canal de distribuição físico bloqueado | P1 — `qrcode.react` (client-side, sem servidor) |
| Respostas (armazenamento) | **Parcial** | `response-capture.server.ts` aceita e valida; retorna `ephemeral_demo` (linha 46) — descarta conteúdo deliberadamente. Sem tabela Supabase real | Todas as respostas são descartadas hoje | Aguardar G1 Privacy Vault + RLS aprovado |
| Contadores de participação agregados | **Parcial** | `WaveLedger` em campaign-engine computa taxa, oculta segmentos n<k. Não persistido em banco | Sem continuidade entre sessões | Persistir agregados (nunca individuais) pós-G1 |
| Campanhas públicas (sem login) | **Ausente** | `/responder` exige AppShell → PackProvider → usePack (autenticado) | Colaboradores sem conta não podem responder | P0 — rota pública `respond/s/:token` sem autenticação |
| Deduplicação de respostas | **Ausente** | `useWaveResponses()` usa localStorage (wave_id → bool). Sem deduplicação server-side ou credencial anônima | Uma aba limpa localStorage permite resposta dupla | P1 — Modo A: aceitar duplicata anônima; Modo B: credencial anônima (Fase 3) |
| Link geral de campanha (sem setor) | **Ausente** | — | — | Avaliar se necessário; prefira link-por-setor |
| Seleção manual de setor pelo respondente | **Ausente** | — | Risco de erro e manipulação do setor | NÃO implementar — derivar setor do token no servidor |
| Link vinculado a setor (opaco) | **Ausente** | — | — | P0 |
| Link individual por colaborador | **Ausente** | — | Viola modelo de privacidade do VitalOS | NÃO implementar como padrão |
| QR Code por setor | **Ausente** | — | — | P1 |
| Expiração de token | **Ausente** | — | Links permanentes são risco após ciclo | P0 |
| Revogação de token | **Ausente** | — | Distribuição indevida sem mecanismo de stop | P0 |
| Rotação de token | **Ausente** | — | Correlação temporal se um token vaza | P1 |
| Rastreamento abertura/início/conclusão | **Parcial** | campaign-engine rastreia `responded`. Sem abertura ou início separados | Granularidade insuficiente para funil de participação | P1 — aggregate events sem identidade |
| Setor derivado no servidor a partir do token | **Ausente** | Não há resolução token→setor | Manipulação do setor pelo front-end | P0 — exigência inegociável |
| Risco de correlação token↔identidade | **Presente** | localStorage guarda `waveId` respondido; não há token associado hoje. Mas: o `submissionId = crypto.randomUUID()` é gerado no cliente (responder.tsx:92) e enviado ao servidor — correlacionável se logado | Risco de correlação submissionId ↔ sessão logada | P0 — em modo anônimo, submissionId deve ser server-side ou descartado |
| Gestores podem visualizar respostas individuais | **Não** | `WaveLedger` nunca expõe identidade; `visibleToLeader: s.responded >= k` (campaign-engine.ts:146) | Conforme | Manter |
| Tracking por IP/localStorage/fingerprint | **Parcial** | localStorage para `hasResponded`. Sem IP, sem fingerprint, sem analytics de terceiros confirmados | localStorage correlaciona dispositivo (not ideal para anonimato forte) | P1 — no modo anônimo público, considerar session cookie efêmero em vez de localStorage |
| k-anonimato aplicado | **Sim (engine)** | `WAVE_K_ANON_MIN = 5`; `visibleToLeader: visible = s.responded >= k` (campaign-engine.ts:146,148). Engine marca, UI reflete | Conforme | Estender para setor-links |
| Supressão de grupos pequenos | **Sim (engine)** | `hiddenSegmentCount` + `readyToPublish: visible` — segmentos ocultos não aparecem no líder | Conforme | Manter invariante no sector-link-engine |
| Prevenção contra filtros diferenciais | **Ausente** | Não há guard de "filtro por diferença" (ex.: total - grupo_A = grupo_B) | Gestor pode inferir grupo pequeno por subtração | P1 — adicionar ao `WaveLedger`: `suppressDifferentialInference` |
| Proteção server-side dos dados | **Sim (demo)** | `response-capture.server.ts` é server-only (`.server.ts`); `ephemeral_demo` descarta | Em produção real, aguarda RLS aprovado | Conforme para demo; P0 para produção |
| RPCs seguras | **Ausente** | Sem RPCs Supabase ainda. `submitSurveyResponses` (survey.functions.ts) é chamada simulada | Sem RLS real | Aguardar G1 |

---

## 3 · Respostas diretas às 7 perguntas de auditoria

### 3.1 Tabelas e domínios existentes

| Entidade | Existe? | Onde |
|---|---|---|
| Campanhas | Parcial (engine mock) | `engine/campaign/campaign-engine.ts` |
| Setores | Parcial (segmentos no engine, dados por setor em `nr1-sector-exposure.ts`) | `mocks/nr1-sector-exposure.ts` |
| Convites/tokens | **Não** | — |
| Links de pesquisa | **Não** | — |
| QR Codes | **Não** | — |
| Respostas | Parcial (ephemeral_demo) | `lib/survey/response-capture.server.ts` |
| Contadores de participação | Parcial (engine, não persistido) | `engine/campaign/campaign-engine.ts` |

### 3.2 O setor é derivado no servidor ou pode ser manipulado pelo cliente?

**Hoje: manipulável pelo cliente.** O `packId` vem de `usePack()` (contexto React, Zustand), não de
um token validado server-side. Qualquer usuário que altere o estado do PackProvider pode mudar o
setor. **Isso deve ser corrigido** no modelo de sector-link: token opaco → servidor resolve setor →
jamais aceitar `sector_id` livre do front-end.

### 3.3 Risco de correlação

| Par | Risco atual |
|---|---|
| token ↔ identidade | Ausente hoje (sem tokens). Em produção, risco se link não for 100% desvinculado de sessão logada |
| submissionId ↔ sessão | **Presente**: `submissionId = crypto.randomUUID()` gerado no cliente e enviado. Se o usuário estiver logado, o servidor consegue correlacionar |
| localStorage ↔ resposta | **Presente**: `hasResponded(wave.id)` no localStorage correlaciona dispositivo com participação |
| horário ↔ respondente | Baixo (apenas `acceptedAt` no recibo, não exposto ao líder) |

### 3.4 Gestores podem ver respostas individuais?

**Não** — pela arquitetura atual. `WaveLedger` expõe apenas taxas por segmento, nunca identidades.
`visibleToLeader = s.responded >= k` impede acesso a segmentos pequenos. Manter e estender.

### 3.5 Tracking atual

| Mecanismo | Usado? |
|---|---|
| localStorage | **Sim** — `hasResponded(waveId)` |
| IP | **Não** confirmado |
| User-agent | **Não** confirmado |
| Fingerprinting | **Não** |
| Analytics de terceiros | **Não** confirmado em rotas de survey |
| Logs de URL com token | N/A (sem tokens ainda) |

### 3.6 k-anonimato e proteções server-side

- k-anonimato: **Sim** no engine, k=5 por padrão
- Supressão de grupos pequenos: **Sim** — `hiddenSegmentCount`
- Prevenção de filtros diferenciais: **Ausente** — P1
- Proteção server-side: **Demo (ephemeral_demo)** — produção aguarda G1 Privacy Vault

---

## 4 · Gaps críticos (P0)

1. **Token opaco por setor** — inexistente; bloqueia todo o modelo de link público
2. **Rota pública sem autenticação** — `/responder` exige login; impossível para trabalhador de chão de fábrica sem conta
3. **Derivação server-side de setor a partir do token** — sem isso, sector_id é manipulável
4. **Expiração e revogação de tokens** — sem ciclo de vida, um link vazado é permanente
5. **submissionId server-side** — hoje é `crypto.randomUUID()` no cliente em `responder.tsx:92`; em modo anônimo público precisa ser gerado e descartado no servidor

## 5 · O que pode ser reutilizado

| Componente existente | Papel no novo modelo |
|---|---|
| `campaign-engine.ts` — `computeWave`, `WaveLedger`, `buildIndividualView` | Motor de participação: rastreia adesão por segmento com k-anon já implementado |
| `response-capture.server.ts` + `response-capture-engine.ts` | Fronteira de captura: valida, descarta conteúdo, emite recibo sem identidade |
| `survey-engine.ts` — `SurveyDefinition`, itens, escalas | Runtime de perguntas: completamente reutilizável |
| `survey-mock.ts` — instrumentos integrais (PERMA/VIA-T/FIB-T/COPSOQ) | 41-item COPSOQ → Domínio B sem reescrita |
| `crosswalk-engine.ts` — `rankDriversByExposure` | Fecha Medir→Transformar: agrega exposição COPSOQ → prioriza drivers |
| `trust-chain-attestation-engine.ts` | 14 checks de confiança reutilizáveis na validação do token |
| `consent-ledger-engine.ts` | Gestão de consentimento — estender para escopo Domínio B |

---

*Próxima seção: `SURVEY_SECTOR_LINKS_ARCHITECTURE.md` — proposta de arquitetura elevada à integração VitalOS.*
