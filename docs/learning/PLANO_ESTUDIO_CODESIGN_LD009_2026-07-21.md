# PLANO + SUPER-PROMPT — Estúdio de Co-design (LD-009)

> Data: 2026-07-21 · Status: **APROVADO (delegado via "prossiga") — Fatia A autorizada**
> Dinâmica: `LD-009` (registro canônico de dinâmicas, v1) · Rota-alvo: `/experimentos`
> Doutrina controladora: `docs/SKILL_MESTRA_FABLE5.md` + invariantes do `CLAUDE.md`
> Branch: `feat/ld009-estudio-codesign-pull-forward`
> Escopo autorizado nesta rodada: **só Fatia A (motor puro)**. Fatias B/C/D seguem
> exigindo autorização própria, uma de cada vez. Sem push/PR/merge/deploy sem
> nova autorização explícita.
>
> **Decisões §9 resolvidas (founder delegou via "prossiga" — opções recomendadas):**
> (1) Ramo C no núcleo; Ramo D opcional em fatia futura. (2) Rota-alvo do 1º
> corte: `/experimentos`. (3) Os **4 padrões** do registry no 1º corte (já são
> dados prontos). (4) 2ª antecipação de LDX-4 confirmada; `sequencingNote` na
> Fatia D preservará `rolloutWave`.

---

## 0. Nota de governança — segunda antecipação de LDX-4

O registro marca **LD-009 como `rolloutWave: "LDX-4"`** (a mesma onda da LD-010, já
antecipada). A onda planejada seguinte continua sendo **LDX-3 = LD-004
(VideoLab)**. Construir LD-009 agora é a **segunda** dinâmica LDX-4 puxada à
frente da LDX-3 — decisão sua, registrada com honestidade.

**Regra para a Fatia D (futura):** mesmo tratamento do LD-010 — `rolloutWave`
**nunca** sobrescrito silenciosamente; campo aditivo `sequencingNote` registra
onda planejada vs. real, decisão, justificativa e referência a este ADR.

---

## 1. O que a LD-009 é (do registro, verbatim nos campos)

- **kind:** `builder` · **M.E.T.E.:** transformar.
- **primaryOutcome:** "Compor uma intervenção validada em vez de partir de uma folha em branco".
- **runtimeStatus:** `PLANNED` → construir a **primeira implementação autorizada**.
- **aiMode:** `NONE` — sem IA de qualquer tipo (mais restritivo que a Arena: nem determinístico-gerativo).
- **persistenceStatus:** `NONE` — o rascunho vive na sessão; "export rastreável" é entrega, não armazenamento.
- **publicExposure:** `PREPARATION` · **riskTier:** `R3_HIGH`.
- **forbiddenUses:** **"medida individualizante quando a causa é organizacional"** (o guardrail central).
- **acceptanceCriteria:** validação de campos · revisão humana · export rastreável.
- **dependencies (todas verificadas no repo):**
  - `Intervention Pattern Registry` → `src/domain/evidence/intervention-patterns.json` **existe, mas hoje sem NENHUM consumidor** — LD-009 é o primeiro a lê-lo.
  - `NASCENTES_ATLAS mínimo` → satisfeito em nível de doc (`docs/ai/nascentes-atlas/`, `docs/METODO_NASCENTES_ATLAS_VIVO_FASE0.md`).
  - `ActionLog governado` → `src/engine/action-plan/action-log-engine.ts` **existe** (`recordActionEvent`, kinds `evidence_recorded`/`orientation_consulted`).

---

## 2. Fronteira crítica — LD-009 × o que já existe em `/experimentos`

`/experimentos` já tem `designExperimentFromLever()` (`src/engine/lab/evidence-engine.ts`):
ele **desenha automaticamente** a hipótese de um experimento a partir de uma
*alavanca* e do estado dos pilares (faixa de ganho, duração, N mínimo).

LD-009 é o **oposto complementar**: o humano **compõe à mão** uma intervenção a
partir de **blocos validados** — escolhe um dos 4 padrões do
`intervention-patterns.json`, preenche os campos obrigatórios, e o estúdio
**valida** (não gera). Um sugere; o outro deixa você construir com trilhos.

**Invariante de não-duplicação (vira teste):** LD-009 não reimplementa
`designExperimentFromLever` — se quiser um ponto de partida sugerido, ele
**consome** a saída daquele engine, nunca a recria.

---

## 3. Matéria-prima já pronta em `intervention-patterns.json`

O estúdio não inventa estrutura — ela já está no registry:

- **4 padrões** (`patterns`): `projeto_equipe`, `projeto_lideranca`,
  `projeto_organizacional`, `experimento_cultural` — cada um com escopo e
  regra de supervisão (ex.: `projeto_lideranca` = "nunca transforma o líder em
  profissional clínico").
- **6 campos obrigatórios** (`required_fields`): `hypothesis`,
  `eligible_context`, `process_metrics`, `outcome_metrics`,
  `adverse_effects_monitored`, `stop_rule`.
- **Plano 90d default** (`plan_90d_default.phases`): 4 fases (baseline/co-design
  → piloto restrito → ajuste → avaliação honesta incluindo o que não funcionou).
- **Watchlist de efeitos adversos** (`adverse_effects_watchlist`):
  intensificação do trabalho, exclusão de quem não participa, participação
  simbólica sem poder, transferência de responsabilidade sistêmica ao indivíduo.

---

## 4. Ritual ToT — desenho do estúdio (ramos avaliados)

**Problema central:** como deixar o humano **compor** uma intervenção real
(não um formulário morto) sem IA, com R3_HIGH, garantindo que o guardrail
"não individualizar causa organizacional" seja estrutural, não um aviso?

- **Ramo A — formulário livre de texto:** campos em branco, sem trilhos.
  ❌ Rejeitado: é a "folha em branco" que o primaryOutcome existe para EVITAR;
  e não há como validar o guardrail sobre texto livre.
- **Ramo B — assistente que gera o plano:** ❌ Rejeitado: viola `aiMode: NONE`
  e a doutrina anti-alucinação; "compor validado" não é "receber pronto".
- **Ramo C — builder por blocos com validação progressiva + gate de revisão
  humana + export rastreável:** escolha do padrão (dos 4) → preenchimento
  guiado dos 6 campos obrigatórios → seleção de escopo (equipe/liderança/
  organizacional/cultural) que **trava** medidas individualizantes quando o
  escopo declarado é organizacional → reconhecimento explícito da watchlist de
  efeitos adversos → **checklist de revisão humana** antes de liberar → export
  de um objeto estruturado rastreável (padrão + campos + timestamp + papel
  revisor), pronto para virar entrada no ActionLog. Sem persistência: o objeto
  é entregue ao chamador, não gravado. ✅ **Vencedor.**
- **Ramo D — C + sugestão automática de campos:** consome
  `designExperimentFromLever` para PRÉ-PREENCHER a hipótese/duração como ponto
  de partida editável. ⚠️ Possível na Fatia C como opção, atrás de um "usar
  sugestão" — mas não no núcleo (mantém o Ramo C puro e testável primeiro).

**Decisão proposta:** Ramo C no núcleo; Ramo D como enriquecimento opcional só
se você quiser.

---

## 5. Arquitetura (tríade engine/mock/rota — Engine ≠ Domínio)

### 5.1 Engine puro — `src/engine/learning/codesign-studio-engine.ts` (Fatia A)
- Tipos: `InterventionScope` (`equipe | lideranca | organizacional | cultural`),
  `CodesignDraft` (padrão escolhido + os 6 campos obrigatórios + indicador
  {baseline, alvo, unidade} + dono {papel, nunca nome} + prazo + efeitos
  adversos reconhecidos), `CodesignValidation`.
- Funções puras: `startDraft(pattern)`, `setField(...)`, `acknowledgeAdverseEffect(...)`,
  `validateDraft(draft)` (todos os campos obrigatórios presentes; dono é PAPEL
  não pessoa; indicador tem baseline+alvo; **guardrail: escopo organizacional
  ⇒ nenhuma medida individualizante** — regra estrutural), `readyForReview(draft)`,
  `buildTraceableExport(draft, reviewerRole)` (objeto rastreável; NÃO persiste).
- **Invariante travada por teste:** `validateDraft` recusa medida
  individualizante sob escopo organizacional; export sempre carrega padrão +
  revisor + timestamp.
- Sem React, sem I/O, sem IA, sem import de `src/domain`.

### 5.2 Consumo do registry (Fatia B) — loader puro de `intervention-patterns.json`
- Primeiro leitor do arquivo. Um `intervention-patterns-loader.ts` (engine) que
  expõe os 4 padrões, os required_fields e a watchlist — validado por teste de
  consistência (arquivo íntegro, 4 padrões, 6 campos).

### 5.3 Rota (Fatia C) — `CodesignStudioCard` em `/experimentos` (e/ou `/plano-acao`)
- Builder por blocos, SESSION_ONLY, a11y (a LD-009 hoje tem
  `accessibilityRequirements: []` no registro — proponho preencher com o
  mínimo do projeto: teclado, 4 estados, foco visível), gate de revisão humana,
  export rastreável.

### 5.4 Governança (Fatia D)
- Atualiza o registro (PARCIAL/CURATED/PILOT), `rolloutWave` preservado +
  `sequencingNote`, evidências reais, dependencies zeradas.

---

## 6. Invariantes (checklist 1:1)

| # | Invariante | Onde é garantida |
| - | ---------- | ---------------- |
| 1 | Sem IA (aiMode NONE) | Nenhuma chamada de modelo; by construction |
| 2 | Não individualizar causa organizacional | `validateDraft` recusa estruturalmente (não é aviso) |
| 3 | Validação de campos (acceptanceCriteria) | `validateDraft` cobre os 6 obrigatórios + indicador + dono-papel |
| 4 | Revisão humana (acceptanceCriteria) | `readyForReview` + gate na UI antes de liberar export |
| 5 | Export rastreável (acceptanceCriteria) | `buildTraceableExport` carimba padrão + revisor + timestamp |
| 6 | Sem persistência (persistenceStatus NONE) | Engine não faz I/O; UI SESSION_ONLY; export é entrega |
| 7 | Dono é papel, nunca pessoa | Tipo do campo restringe a papéis do pack |
| 8 | Não reimplementar /experimentos | LD-009 consome designExperimentFromLever, nunca o recria (teste) |
| 9 | Efeitos adversos reconhecidos | Watchlist do registry exibida + reconhecimento obrigatório |
| 10 | WCAG 2.2 AA | Critério de aceite da Fatia C |

---

## 7. Fatias (uma autorização de cada vez)

- **Fatia A — motor** `codesign-studio-engine.ts` + testes (validação, guardrail
  organizacional, export rastreável).
- **Fatia B — loader do registry** `intervention-patterns-loader.ts` + teste de
  consistência (primeiro consumidor do `intervention-patterns.json`).
- **Fatia C — UI** `CodesignStudioCard` em `/experimentos` (e/ou `/plano-acao`),
  a11y, revisão humana, export + testes DOM + verificação ao vivo.
- **Fatia D — governança do registro** respeitando o ADR §0.

Sem push/PR/merge/deploy em nenhuma fatia sem autorização explícita.

---

## 8. Restrições permanentes aplicáveis

- NÃO pesquisar novas referências (Trilho B pausado).
- NÃO prometer ROI nem implementar Next Best Action.
- NÃO transformar líderes em profissionais clínicos (regra do padrão `projeto_lideranca`).
- NÃO alterar banco/migrations/RLS (o "export" NÃO grava no ActionLog real
  nesta fatia — só produz o objeto; a escrita no ledger é Fase 2, pedido próprio).
- NÃO mexer em `NAV_GROUPS`/AppShell — o estúdio é seção interna de rota existente.

---

## 9. Decisões que preciso de você antes de codar

1. **Aprovar o desenho (Ramo C no núcleo)** — ou quer o Ramo D (pré-preenchimento
   via `designExperimentFromLever`) já no primeiro corte?
2. **Rota-alvo do primeiro corte:** `/experimentos` (onde a camada de evidência
   já vive) — concorda, ou prefere `/plano-acao`? (o registro lista as duas)
3. **Escopo dos padrões no 1º corte:** começar com os **4 padrões** do registry,
   ou só 1-2 para validar o fluxo antes de abrir todos?
4. **Confirmar a 2ª antecipação de LDX-4** (LD-009 antes da LDX-3/LD-004),
   registrada via `sequencingNote` na Fatia D — ok?

Com o seu aval, crio a branch, committo este plano aprovado e começo pela Fatia A.
