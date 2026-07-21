# PLANO + SUPER-PROMPT — Arena de Debate Socrático (LD-010)

> Data: 2026-07-21 · Status: **APROVADO pelo founder — Fatia A autorizada**
> Dinâmica: `LD-010` (registro canônico de dinâmicas, v1) · Rota-alvo: `/lab`
> Doutrina controladora: `docs/SKILL_MESTRA_FABLE5.md` + invariantes do `CLAUDE.md`
> Branch: `feat/ld010-arena-socratica-pull-forward`
> Escopo autorizado nesta rodada: **só Fatia A (motor puro)**. Fatias B/C/D
> seguem exigindo autorização própria, uma de cada vez. Sem push/PR/merge/deploy
> sem nova autorização explícita.

---

## 0. ADR — Decisão de antecipação (pull-forward) da LD-010

Registro explícito, exigido pelo founder, para o histórico do registro nunca
ser reescrito silenciosamente.

| Campo | Valor |
| --- | --- |
| **Onda originalmente planejada** | `LDX-4` (registro canônico, `rolloutWave: "LDX-4"`) — a onda imediatamente seguinte à LDX-2 seria `LDX-3 = LD-004` (VideoLab Guiado). |
| **Onda real de implementação** | Sessão de 2026-07-21, **antes** da LDX-3/LD-004 — LD-010 antecipada. |
| **Decisão de antecipação** | Aprovada explicitamente pelo founder em 2026-07-21, nesta sessão, após pergunta direta ("o que fica mais estratégico e inovador?") e comparação nomeada entre LD-010 e LD-004. |
| **Justificativa estratégica** | Arena Socrática (debate governado, revisão de posição, IA generativa proibida) é diferenciador genuíno de produto no vertical NR-1/psicossocial — nenhum concorrente tem mecânica equivalente. VideoLab (LD-004) é dinâmica commodity (vídeo + quiz), presente em qualquer LMS. Priorizar inovação sobre a ordem cronológica do registro é decisão de founder, não drift de engenharia. |
| **Referência ao ADR/plano aprovado** | Este documento (`docs/learning/PLANO_ARENA_SOCRATICA_LD010_2026-07-21.md`), aprovado por mensagem explícita do founder em 2026-07-21. |
| **Regra para a Fatia D (futura, NÃO executada agora)** | Quando a Fatia D atualizar o registro, o campo `rolloutWave` **não pode simplesmente virar `"LDX-3"`** — isso apagaria o fato histórico de que a onda originalmente planejada era `LDX-4`. A Fatia D deve preservar ambos os fatos (planejado vs. real) — provavelmente via um campo de decisão de sequenciamento separado (ex. `sequencingNote` ou equivalente no schema), nunca por sobrescrita. Este ADR é a fonte de verdade até lá. |

LD-004 (VideoLab) continua na fila, agora como próxima onda depois da Arena.

---

## 1. O que a LD-010 é (do registro, verbatim nos campos)

- **kind:** `debate` · **M.E.T.E.:** educar + transformar.
- **primaryOutcome:** "Argumentar os dois lados de um dilema e revisar a própria posição".
- **runtimeStatus:** `PLANNED` → construir a **primeira implementação autorizada**.
- **aiMode:** `GENERATIVE_PROHIBITED` — determinístico e moderado por **roteiro**, **nunca** LLM na v1.
- **persistenceStatus:** `NONE` — saída privada, nada gravado.
- **publicExposure:** `PREPARATION` · **riskTier:** `R3_HIGH`.
- **dependencies:** "roteiro de moderação determinístico" (é o que este plano cria).
- **forbiddenUses:** exposição pública · disputa entre pessoas/equipes · ranking de argumentação · tema sensível sem moderação.
- **accessibilityRequirements:** saída privada · encerramento reflexivo acessível.
- **acceptanceCriteria:** foco em ideias, não indivíduos · regras de civilidade.
- **Formato (doc §LD-010):** tese · antítese · evidência · revisão de posição · síntese de trade-offs.

---

## 2. Ritual ToT — desenho do formato (ramos avaliados)

**Problema de desenho central:** como fazer um "debate" que seja
determinístico (sem LLM, sem analisar texto livre do usuário) e ainda assim
force o usuário a **argumentar os dois lados** de verdade?

- **Ramo A — texto livre analisado por regras:** ❌ Rejeitado — heurística de
  "pontuação" fere "sem ranking" e beira análise de conteúdo pessoal.
- **Ramo B — só leitura de argumentos prontos:** ❌ Rejeitado — vira artigo,
  não exercita tomada de perspectiva ativa (não atinge o primaryOutcome).
- **Ramo C — cartas de argumento governadas + escolha ativa + rascunho privado
  opcional:** o roteiro apresenta o dilema, oferece **cartas de argumento
  revisadas** para CADA lado, o usuário monta o caso dos dois lados escolhendo
  cartas, registra **privadamente** (autodeclarado, nunca inferido) onde estava
  e onde ficou, e o roteiro fecha com **síntese honesta de trade-off — sem
  vencedor**. Rascunho de texto é opcional, local, nunca analisado, nunca
  persistido. ✅ **Vencedor — aprovado pelo founder.**
- **Ramo D — C + cronômetro/gamificação:** ❌ Rejeitado — pressão e pontuação
  ferem o tom não-punitivo do produto.

**Decisão:** Ramo C.

---

## 3. O dilema (APROVADO — substitui o rascunho anterior)

> **"Autonomia participativa ou direção centralizada?"**

- **Lado A — Autonomia participativa:** a equipe coconstrói metas e formas de
  trabalho — participação, apropriação, adaptação ao contexto real de quem
  executa.
- **Lado B — Direção centralizada:** a liderança define metas e processos —
  velocidade, clareza, coordenação, consistência entre times.

### Fontes autorizadas (eixos Achievement · Management · Operational Design)

| Estudo | Eixo | O que autoriza afirmar (safe_claim congelado) | Natureza |
| --- | --- | --- | --- |
| `ACH-001` | Achievement | Participar do desenho do próprio sistema de avaliação/metas associa-se a atitudes e desempenho mais favoráveis do que receber o sistema pronto, nos contextos estudados. | Evidência empírica (quase-experimental) |
| `ACH-002` | Achievement | Em gestão da qualidade, participação dos empregados associou-se a respostas mais favoráveis ao sistema; efeito depende do desenho da participação. | Evidência empírica |
| `MGT-005` | Management | Revisão: desenho do trabalho tende a funcionar melhor quando quem faz o trabalho participa do redesenho; efeitos variam por contexto e implementação. | Revisão sistemática |
| `OPD-001` | Operational Design | Síntese teórica: perspectivas relacionais e proativas ampliam o desenho clássico do trabalho — base conceitual para autoria. | **Síntese teórica** (não é intervenção testada) |
| `OPD-002` | Operational Design | Modelo teórico de job crafting: pessoas remodelam ativamente tarefas e relações do próprio trabalho — é lente conceitual, não intervenção pronta. | **Modelo teórico** (não é intervenção testada) |

**Achado honesto do levantamento (registrado, não escondido):** as 5 fontes
autorizadas nesses eixos **só sustentam o Lado A**. O registro congelado não
tem, hoje, um estudo empírico que sustente o Lado B. Isso é real e será
tratado com honestidade na Fatia B: as cartas do Lado B serão **raciocínio
operacional legítimo** (urgência, clareza regulatória, custo de coordenação da
participação, consistência entre equipes), rotuladas explicitamente como
`valor_operacional` — **nunca disfarçadas de evidência**. O Lado B continua
tendo mérito real (é um trade-off genuíno de gestão), só não tem hoje um paper
por trás — e o motor (Fatia A) é desenhado para essa distinção nunca poder ser
apagada por acidente (campo `basis` obrigatório em toda carta).

Este dilema **não reaproveita** o tema de Voz Segura (Trust/Leadership) — usa
3 eixos (Achievement, Management, Operational Design) que **nenhuma rota ainda
surfaceou**, provando a arquitetura "um motor, muitas nascentes".

---

## 4. Arquitetura (tríade engine/mock/rota — Engine ≠ Domínio)

### 4.1 Engine puro — `src/engine/learning/socratic-arena-engine.ts` (Fatia A — AGORA)
- Tipos: `ArgumentBasis` (`"evidencia_empirica" | "sintese_teorica" |
  "valor_operacional"` — nunca omitido, nunca inferido), `ArgumentCard` (lado
  A/B, texto, `basis`, `sourceStudyId?`), `ArenaStage` (`enquadramento → tese →
  antitese → evidencia → revisao → sintese`), `ArenaPosition` (autodeclarada:
  `"ladoA" | "ladoB" | "indeciso"`), `ArenaDilemma`, `ArenaState`.
- Funções puras: `startArena`, `goToStage` (navegação livre entre estágios já
  visitados; avanço aos próximos exige engajamento mínimo — ver invariantes),
  `toggleArgumentConsidered`, `setPositionBefore`, `setPositionAfter`,
  `validateDilemma` (garante as duas cartelas não-vazias e todo card com
  `basis`), `summarizeArena` (contagens estruturais — **nunca** qualidade).
- **Sem campo de texto livre no engine** — rascunho (se existir na Fatia C) é
  estado só do componente, nunca chega ao engine, nunca é analisado.
- Sem React, sem I/O, sem import de `src/domain`.

### 4.2 Conteúdo (mock) — `src/mocks/socratic-arena-mock.ts` (Fatia B — depois)
- O dilema "Autonomia participativa ou direção centralizada?" com as 5 cartas
  do Lado A (basis `evidencia_empirica`/`sintese_teorica`, citando os 5 ids
  acima) e cartas do Lado B (basis `valor_operacional`, sem estudo).
- Síntese de fechamento sem vencedor (esboço: "a evidência disponível hoje
  favorece a participação para atitudes/desempenho quando há tempo para
  desenhar junto; centralizar pode ser a escolha certa sob urgência real ou
  quando a experiência da liderança já aponta um caminho — nenhum dos dois é
  sempre certo").
- Teste de consistência: ids existem no registro + trust gate; ambos os lados
  não-vazios; nenhuma carta do Lado B citando `sourceStudyId` (honestidade da
  assimetria).

### 4.3 Rota — seção nova em `src/routes/lab.tsx` (Fatia C — depois)
- `SocraticArenaCard`, autocontida, SESSION_ONLY, WCAG 2.2 AA.

---

## 5. Invariantes (checklist 1:1 com o que o founder exigiu)

| # | Invariante exigida | Onde é garantida na Fatia A |
| - | --- | --- |
| 1 | Dinâmica determinística | Funções puras, sem Date/random/IO |
| 2 | Sem IA generativa | Nenhuma chamada de modelo no engine (by construction) |
| 3 | Sem vencedor | `ArenaSummary` não tem campo de vencedor; testado |
| 4 | Sem ranking | Nenhuma pontuação de carta/lado; testado (`score`/`rank` ausentes) |
| 5 | Sem avaliação do participante | `summarizeArena` só conta estrutura (cartas consideradas, estágios visitados) — nunca qualidade do raciocínio |
| 6 | Sem inferência psicológica | Posição é **autodeclarada** (`setPositionBefore`/`After`), nunca derivada de comportamento/tempo |
| 7 | Sem persistência de texto livre | Engine não tem campo de texto livre — decisão de design, não filtro a posteriori |
| 8 | Saída privada | Engine não faz I/O; store real (Fatia C) segue o padrão SESSION_ONLY já usado na LDX-2 |
| 9 | Ambos os lados com mérito real | `validateDilemma` exige as duas cartelas não-vazias; conteúdo (Fatia B) é revisão editorial, não do engine |
| 10 | Evidência só do registro governado | `basis` obrigatório distingue evidência empírica de síntese teórica de valor operacional — nunca mistura |
| 11 | WCAG 2.2 AA | Fora do escopo da Fatia A (motor não tem UI); vira critério de aceite da Fatia C |

---

## 6. Fatias (uma autorização de cada vez)

- **Fatia A — motor** (AUTORIZADA AGORA): `socratic-arena-engine.ts` + testes
  dirigidos aos estados/transições/invariantes acima.
- **Fatia B — conteúdo** (aguarda autorização): mock do dilema aprovado.
- **Fatia C — UI + integração** (aguarda autorização): `SocraticArenaCard` em
  `/lab`.
- **Fatia D — governança do registro** (aguarda autorização): atualização do
  `learning-dynamics-registry.json` respeitando o ADR §0 (nunca sobrescrever
  `rolloutWave` silenciosamente).

Sem push, PR, merge ou deploy em nenhuma fatia sem autorização explícita
adicional.

---

## 7. Restrições permanentes aplicáveis (CLAUDE.md / TASK.md)

- NÃO pesquisar novas referências (Trilho B pausado) — só os 5 estudos já
  congelados acima.
- NÃO declarar causalidade; só `safe_claim` registrado ou mais fraco.
- NÃO inventar evidência para o Lado B — honestidade da assimetria é doutrina,
  não detalhe.
- NÃO ativar a dinâmica acima do nível real entregue (sem overclaim de status).
- NÃO mexer em `NAV_GROUPS`/AppShell — Arena é seção interna de `/lab`.
- Branch `feat/ld010-arena-socratica-pull-forward`, commits por fatia, **sem
  push/PR/merge/deploy até autorização explícita**.
