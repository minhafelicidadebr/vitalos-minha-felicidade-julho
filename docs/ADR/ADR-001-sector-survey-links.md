# ADR-001: Links de Pesquisa por Setor — Arquitetura de Privacidade e Integração M.E.T.E.

**Status:** Aprovado (design) · Implementação bloqueada até G1 Privacy Vault  
**Data:** 2026-06-23  
**Autores:** VitalOS Founding Committee (Fable 5)  
**Relacionado:**
- `DECISAO_CAPTURA_CEGA_RESPOSTAS_2026-06-19.md`
- `DECISAO_MANIFESTO_PARIDADE_RLS_2026-06-19.md`
- `DECISAO_AGREGACAO_SERVER_K_ANON_2026-06-19.md`
- `DECISAO_CONSENT_LEDGER_EVENT_SOURCED_2026-06-19.md`
- PR #17 — COPSOQ integral (41 itens NCOPSII)

---

## 1 · Problema

O VitalOS precisa permitir que colaboradores respondam pesquisas psicossociais (COPSOQ/NR-1) sem
necessidade de login, via link distribuído fisicamente (e-mail, intranet, QR Code em mural). O modelo
atual depende de autenticação (`PackProvider` + RBAC), impossibilitando o uso por trabalhadores de
chão de fábrica sem conta.

**Restrições inegociáveis:**
1. Anonimato individual — nenhum gestor pode saber quem respondeu
2. Multi-tenant isolado — Org A jamais vê dados da Org B
3. Setor derivado no servidor — cliente nunca escolhe setor livremente
4. k-anonimato ≥5 em todos os recortes visíveis
5. Sem dados pessoais em banco (IP, e-mail, CPF, matrícula)
6. Domínio B estritamente separado do Domínio A

---

## 2 · Decisão

**Ramo F + D — engine-abstraction + deferred-implementation.**

Construir `src/engine/survey/sector-link-engine.ts` como engine puro (composição sobre
`campaign-engine.ts` existente), com documentos de design completos agora, e **bloquear a
implementação de Supabase/RPC até G1 Privacy Vault aprovado em staging**.

### 2.1 O que decidimos construir

| Componente | Decisão | Justificativa |
|---|---|---|
| Token opaco por setor | **Token de 256+ bits de entropia (nanoid/crypto.randomUUID)** | Previne enumeração; não revela setor/org na URL |
| URL | `/respond/s/{opaque_token}` | Setor derivado no servidor, nunca na URL |
| Armazenamento do token | **Somente hash SHA-256** no banco | Token bruto nunca persistido |
| Expiração | Campo `expires_at` por link | Ciclo de vida controlado por campanha |
| Revogação | Campo `status: revoked` + `revoked_at` | Stops imediatos sem deletar histórico |
| Rotação | `rotated_from_id` — link novo substitui o antigo | Auditoria de rotação mantida |
| Tracking de participação | Apenas agregados por dia (DATE, não TIMESTAMP) | Previne correlação temporal |
| k-anonimato | `suppressDifferentialInference` no engine + `suppressed_flag` no banco | Proteção por construção, não só na UI |
| Modo A (padrão) | Link compartilhado por setor, sem deduplicação server-side | Favorece anonimato sobre controle de duplicatas |
| Modo B (futuro) | Credencial anônima de elegibilidade — Fase 3 | Exige criptografia dedicada; não incluso agora |
| QR Code | Client-side (`qrcode.react`) — sem servidor | Sem requisição de rede para gerar QR |

### 2.2 O que NÃO decidimos construir (agora)

| Capacidade | Decisão | Quando |
|---|---|---|
| RPCs Supabase reais | Não agora | Pós-G1 Privacy Vault |
| Migrations RLS | Não agora | Pós-G1 |
| Modo B (credencial anônima) | Não agora | Fase 3 (Sprint 12+) |
| Link individual por colaborador | Nunca como padrão | Viola modelo de privacidade |

---

## 3 · Alternativas consideradas (ToT)

### Ramo A — MVP só roteador (descartado)
Implementar apenas o roteador opaco sem integrar ao ciclo M.E.T.E. nem ao crosswalk.
**Descartado:** entregaria acesso sem valor estratégico — um link que não fecha o loop Medir→Transformar
não justifica o custo de segurança e UX.

### Ramo B — Full build agora (descartado)
Implementar toda a proposta (RPCs, migrations, RLS, UX) nesta iteração.
**Descartado:** G1 Privacy Vault ainda não aprovado em staging. Construir sobre fundação não validada
viola Invariante 1 (build verde antes de commit) e o manifesto de paridade RLS.

### Ramo C — Mock first (considerado positivamente, parcialmente adotado)
Construir demo convincente do fluxo com token simulado.
**Adotado como subcomponente:** o `sector-link-engine.ts` funciona em modo mock (sem Supabase).
A rota `/respond/s/$token` pode ser construída com RPC mockada antes do G1.

### Ramo D — Design docs + defer (ESCOLHIDO como âncora)
Documentos de design completos agora; implementação após G1.
**Escolhido:** preserva a decisão de design sem criar dívida técnica ou risco de privacidade.

### Ramo F — Engine abstraction (ESCOLHIDO como execução)
`sector-link-engine.ts` puro, composição de `campaign-engine.ts`.
**Escolhido:** segue a lei de ferro da Tríade Fable 5; engine puro testável independentemente
do Supabase; reuso multissetorial (qualquer pack pode ter sector links).

---

## 4 · O salto estratégico: "Link de Setor = Compromisso M.E.T.E."

Esta é a decisão arquitetural que eleva o sector link de "distribuição de pesquisa" para
"artefato de temporada VitalOS":

**Um link de setor ativado = entrada da unidade na fase Medir do T3.**

Consequências:
1. Ao gerar o link, o sistema âncora em `meteAnchor: "T3-2026"` (temporada psicossocial)
2. Ao atingir n≥5, `DimensionExposure[]` alimenta `rankDriversByExposure` (crosswalk-engine)
3. Os drivers priorizados reordenam o Culture Lab e o plano GRO
4. `MeasurementContextCapsule` recebe `permittedAggregate: DimensionExposure[]` para Íris
5. O Vitality P&L atualiza o custo de risco psicossocial
6. O Relatório Global ESG marca "GRO-Ready: evidência coletada T3"

**Sem este fio condutor, o link de setor é só uma URL. Com ele, é o primeiro passo de uma
transformação rastreável e auditável.**

---

## 5 · Invariantes preservados

| Invariante | Como é preservado |
|---|---|
| Engine ≠ Domínio | `sector-link-engine.ts` não importa de `domain/` |
| k-anon ≥ 5 no engine | `suppressDifferentialInference` no engine, `suppressed_flag` no banco |
| Domínio A ≠ Domínio B | COPSOQ/sector-links vivem no Domínio B; jamais misturados com IVO/PERMA |
| Sem resposta individual acessível | `anonymous_response_receipts` sem qualquer identificador pessoal |
| Setor derivado no servidor | RPC recebe token; nunca aceita `sector_id` livre do cliente |
| Token bruto nunca persistido | Somente `token_hash = SHA-256(token)` no banco |
| Sem analytics de terceiros em rotas públicas | Invariante de produto |
| Disclaimer domainB verbatim | `enterprise.pack.json` — tela de consentimento obrigatória |
| Multi-tenant isolado | RLS por `organization_id` com DEFAULT DENY |

---

## 6 · Consequências

### Positivas
- Pesquisa acessível para 100% dos colaboradores, inclusive sem conta (trabalhador de quiosque)
- Fechamento do loop Medir→Transformar no COPSOQ: dado medido vira prioridade de ação
- Arquitetura reutilizável em todos os packs (escola, governo, condomínio, saúde)
- Separação clara Modo A (padrão, anonimato forte) / Modo B (futuro, elegibilidade controlada)
- Honestidade comunicada sobre limitações do Modo A (sem promessa de anonimato absoluto com deduplicação)

### Negativas / riscos residuais
- Modo A aceita respostas duplicadas (localStorage pode ser limpo): comunicar ao usuário
- Token expirado não é "autodestruído" se não houver job de limpeza
- QR Code físico distribuído não pode ser revogado dos murais (apenas o link é revogado)
- Correlação temporal ainda possível se n de respondentes em um setor pequeno for muito baixo em um dia

### Mitigações obrigatórias
- `suppressDifferentialInference` ativo para correlação por subtração
- `completed_at_bucket = DATE` (não TIMESTAMP) para correlação temporal
- `last_access_at_aggregate` atualizado somente em batch (não por request individual)
- Instruções de revogação claramente comunicadas ao admin quando token é distribuído fisicamente

---

## 7 · Backlog de implementação

### P0 (bloqueado por G1 Privacy Vault)
- [ ] `sector-link-engine.ts` (engine puro, sem Supabase) — pode ser construído ANTES do G1
- [ ] Rota `/respond/s/$token` com RPC mockada — pode ser construído ANTES do G1
- [ ] QR Code component client-side
- [ ] RPC `get_public_sector_survey_access` + RLS
- [ ] RPC `submit_sector_survey_response` + descarte server-side do conteúdo
- [ ] Tabelas `sector_survey_links` + `anonymous_response_receipts` + migrations
- [ ] `Referrer-Policy: no-referrer` em todas as rotas `/respond/s/*`

### P1 (pós-G1)
- [ ] Painel "Links por Setor" no `/sst` (criar, gerar QR, revogar, rotacionar)
- [ ] `survey_link_events_aggregate` + batch counter update
- [ ] `suppressDifferentialInference` no dashboard do gestor
- [ ] Job de expiração de tokens (Edge Function)
- [ ] Wiring M.E.T.E.: link gerado → temporada T3 → crosswalk pipeline
- [ ] Extensão do `consent-ledger-engine.ts` para escopo Domínio B

### P2 (Fase 3 — Sprint 12+)
- [ ] Modo B — credencial anônima de elegibilidade (arquitetura criptográfica dedicada)
- [ ] Benchmark setorial COPSOQ entre tenants (k-anon inter-org — benchmark-engine.ts)
- [ ] `MeasurementContextCapsule` + Íris (copiloto de mensuração)
- [ ] Relatório PDF exportável com dados agregados por setor para PGR

---

## 8 · Decisão final: estado para implementação

| Critério | Resultado |
|---|---|
| Pronto para `sector-link-engine.ts` (puro)? | **SIM** — pode começar |
| Pronto para rota mock `/respond/s/$token`? | **SIM** — pode começar |
| Pronto para migrations Supabase? | **NÃO** — aguardar G1 Privacy Vault |
| Pronto para RPCs em produção? | **NÃO** — aguardar G1 |
| Pronto para distribuição de links em produção? | **NÃO** — aguardar G1 + P0 completo |

> **Veredito: Exige precondições antes de produção (G1 Privacy Vault).
> Engine puro e rota mock podem avançar imediatamente.**
