# PLANO + SUPER-PROMPT — Evidence Explorer (LD-005)

> Data: 2026-07-22 · Status: **APROVADO — Fatia A autorizada**
> Dinâmica: `LD-005` (registro canônico de dinâmicas, v1) · Rota-alvo: **`/metodologia`**
> Doutrina controladora: `docs/SKILL_MESTRA_FABLE5.md` + invariantes do `CLAUDE.md`
> Branch: `feat/ld005-evidence-explorer`
> Escopo autorizado nesta rodada: **só Fatia A (motor puro)**. Fatias B/C seguem
> exigindo autorização própria. Sem push/PR/merge/deploy sem nova autorização.

---

## 0. Por que esta onda, e não a LDX-3 (LD-004 VideoLab)

Não é antecipação — é **completar a onda mais antiga inacabada**. LD-005 é
`rolloutWave: LDX-1`, a primeira onda, e segue `PARCIAL` até hoje.

| | LD-004 VideoLab (LDX-3) | **LD-005 Evidence Explorer (LDX-1)** |
| --- | --- | --- |
| Dependências | **2, ambas de conteúdo seu**: "fonte de vídeo aprovada e licenciada", "legenda e transcrição" | **0** |
| Fundação no repo | `runtimeEvidence: []` — nada construído | passport-engine, EvidencePassport e registro congelado **já existem** |
| Risco | licenciamento/direitos de mídia | nenhum (ciência já congelada e verificada) |
| Entrega sem input seu | só o arcabouço (casca) | produto real e completo |

**Nenhuma antecipação de onda acontece aqui** — portanto não há
`sequencingNote` a escrever na Fatia D (diferente de LD-009/LD-010).

---

## 1. O que a LD-005 é (do registro, verbatim)

- **kind:** `explorer` · **M.E.T.E.:** medir + educar.
- **runtimeStatus:** `PARCIAL` · **contentStatus:** `VERIFIED` · **exposure:** `PILOT`.
- **persistenceStatus:** `NONE` · **aiMode:** `NONE` · **riskTier:** baixo.
- **dependencies:** `[]` — nada bloqueia.
- **enrichesRoutes:** `/academia`, `/voz-segura`.
- **acceptanceCriteria:** "fonte, ano, desenho do estudo, limites e claim
  autorizado visíveis" · **"nenhum DOI inventado"**.
- **Gap declarado (doc §LD-005):** "Evidence Registry e Evidence Passport são
  reais; **explorador completo ainda não**" + "Níveis de leitura: humano,
  profissional e auditoria".

---

## 2. O que JÁ existe (verificado no repo — não vou reconstruir)

- **Corpus congelado:** 46 estudos em 15 eixos (Job Security 18, Learning 7,
  Achievement 5, Leadership 3, Operational Design 3, e 10 eixos com 1–2).
- **50 claims** no Claim Registry v1.1.0.
- **`buildPassport(study, level)`** com `PassportLevel = "humano" |
  "profissional" | "auditoria"` — **os três níveis de leitura da spec já estão
  implementados**, incluindo a regra de que o nível humano nunca vê jargão.
- **`trustGate`**, `resolveStudy`, `findClaimForContext` — governança pronta.
- **`EvidencePassport`** (componente) — hoje só aparece **embutido** numa trilha,
  um estudo por vez.

**O gap real, em uma frase:** o corpus de 46 estudos é invisível — não há como
percorrer, filtrar ou buscar. A ciência que sustenta o produto está lá, e
ninguém consegue olhar para ela.

---

## 3. Ritual ToT — desenho do explorador

- **Ramo A — nova rota `/evidencias`:** ❌ Rejeitado: exigiria mexer em
  `NAV_GROUPS`/AppShell, que é lane do Lovable e o `CLAUDE.md` proíbe sem
  coordenação.
- **Ramo B — tabela densa com todos os campos:** ❌ Rejeitado: expõe jargão
  (B2/V1/C2/E3/T2) a qualquer público, violando a regra do nível humano.
- **Ramo C — explorador em seção de rota existente, com filtro por eixo + busca
  + seletor de nível de leitura, reusando `buildPassport`:** cada estudo vira um
  card no nível escolhido; abrir mostra o passaporte completo naquele nível.
  Fail-closed: estudo que não passa no `trustGate` nunca aparece como
  utilizável. ✅ **Vencedor** — respeita a lane do Lovable, reusa tudo que
  existe e entrega o explorador de verdade.
- **Ramo D — C + comparador lado a lado:** adiar; o valor está em ver o corpus.

### 3.1 Decisão de rota — `/metodologia`, não `/academia` (desvio consciente)

O registro lista `enrichesRoutes: ["/academia", "/voz-segura"]`. **O 1º corte vai
para `/metodologia`** — desvio deliberado, aprovado pelo founder em 2026-07-22,
com esta justificativa:

| | `/academia` | **`/metodologia`** |
| --- | --- | --- |
| Grupo na nav | `gestao` | **`confianca`** |
| Papéis autorizados | 8 papéis específicos | **`"all"`** |
| Do que trata | trilhas de aprendizagem | **"A Ciência da Vitalidade"** — página de credibilidade |

Motivos: (1) **alcance** — `roles: "all"` alcança C-level, auditor e prospect,
que são justamente quem precisa da prova e que `/academia` exclui;
(2) **coerência** — `/metodologia` é a página que AFIRMA rigor científico, e
hoje o registro congelado só aparece em `/lab` e `/voz-segura`: a página da
promessa não mostra os 46 estudos que a sustentam; (3) o explorador é artefato
de **confiança**, não de treinamento.

**Consequência de governança (Fatia C):** `enrichesRoutes` precisará incluir
`/metodologia`. O registro foi escrito antes de `/metodologia` amadurecer como
página de credibilidade — a atualização é correção documentada, não descuido.

---

## 4. Arquitetura (tríade — Engine ≠ Domínio)

### 4.1 Engine puro — `src/engine/evidence/evidence-explorer-engine.ts` (Fatia A)
- `filterStudies(studies, { axis?, query?, onlyTrusted? })` — busca por texto
  (citação/claim/eixo) e filtro por eixo, determinística e sem I/O.
- `groupByAxis(studies)` — contagem por eixo para a UI de filtros.
- `explorerSummary(studies)` — total, quantos confiáveis, quantos exigem caveat.
- **Invariantes travadas por teste:** nunca inventa campo ausente (DOI vazio
  continua vazio — jamais placeholder); estudo reprovado no `trustGate` sai da
  listagem "utilizável"; busca é case/acento-insensível mas nunca "corrige" o
  conteúdo.
- Sem React, sem I/O, sem import de `src/domain`.

### 4.2 UI (Fatia B) — `EvidenceExplorerCard` em `/metodologia`
- Filtro por eixo (chips com contagem), busca, **seletor de nível de leitura**
  (humano/profissional/auditoria) reusando `buildPassport`.
- Card por estudo no nível escolhido; expandir mostra o passaporte completo.
- 4 estados (vazio/carregando/erro/mobile), WCAG 2.2 AA.

### 4.3 Governança (Fatia C)
- Atualiza LD-005 no registro: `runtimeEvidence` real + `enrichesRoutes` com
  `/metodologia` (ver §3.1). **Sem `sequencingNote`** — não há antecipação de
  onda aqui.

---

## 5. Invariantes

| # | Invariante | Onde |
| - | ---------- | ---- |
| 1 | **Nenhum DOI inventado** (acceptance) | Engine nunca preenche campo ausente; teste trava |
| 2 | Nível humano nunca vê jargão | Reuso de `buildPassport` (já garante) |
| 3 | Fail-closed no trustGate | Estudo reprovado nunca listado como utilizável |
| 4 | C3/V2 só com caveat registrado | Herdado do passport-engine |
| 5 | Nunca mais forte que o `safe_claim` | Só reproduz o registro, nunca reescreve |
| 6 | Sem IA, sem persistência | Engine puro; UI SESSION_ONLY |
| 7 | Não mexer em NAV_GROUPS/AppShell | Seção interna de `/metodologia` (rota já existe na nav) |
| 8 | WCAG 2.2 AA | Critério de aceite da Fatia B |

---

## 6. Fatias (uma autorização de cada vez)

- **Fatia A — motor** `evidence-explorer-engine.ts` + testes. ← **autorizada**
- **Fatia B — UI** `EvidenceExplorerCard` em `/metodologia` + testes DOM +
  verificação ao vivo.
- **Fatia C — governança** do registro (sem sequencingNote).

Sem push/PR/merge/deploy sem autorização explícita.

---

## 7. Decisões resolvidas (founder, 2026-07-22)

1. ✅ **Ramo C aprovado**, com a rota trocada para **`/metodologia`** (§3.1).
2. ✅ **1º corte enxuto:** filtro por eixo + busca + 3 níveis de leitura. O
   comparador lado a lado (Ramo D) fica para depois.
3. ✅ **LD-005 antes de LD-004** — completar a LDX-1 antes de abrir a LDX-3,
   que segue travada por conteúdo (vídeo licenciado) do founder.
