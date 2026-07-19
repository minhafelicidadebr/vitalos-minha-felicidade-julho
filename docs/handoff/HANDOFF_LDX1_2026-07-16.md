# Handoff — Onda LDX-1 (Learning Dynamics Registry + Elevação Premium da `/voz-segura`)

> **Data:** 2026-07-16 · **Branch:** `feat/ldx-1-learning-dynamics-registry` · **Base:** `main` @ `7f4c596`
> **Status:** implementação concluída + follow-up de acessibilidade concluído (§13), gate verde,
> **sem push/PR/merge/deploy** — aprovada preliminarmente pelo founder, aguardando autorização final.

Sem linguagem promocional abaixo. Nenhuma afirmação de sucesso sem evidência de arquivo:linha ou de gate.

---

## 1 · Resumo executivo

Implementada a Onda LDX-1 exatamente como escopada no Super Prompt operacional
(`docs/learning/SUPER_PROMPT_LDX1_ORIGINAL.md`) e no Registro Canônico
(`docs/learning/REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md`): uma camada de
governança tipada e testável das 14 dinâmicas de aprendizagem do VitalOS, mais a
integração cirúrgica de 3 capacidades genuinamente reais (mas não conectadas até
agora) na trilha `/voz-segura` — sem transformar nenhuma capacidade `PLANNED`,
`PROPOSED` ou `R_AND_D` em disponível, sem LLM/RAG/embeddings, sem migration, sem
tocar o hero/identidade/card IVO.

Um achado arquitetural real foi corrigido no meio da implementação: a primeira
versão do engine de resolução importava tipos de `src/domain/`, violando a
fronteira Engine ≠ Domínio que o próprio repositório testa automaticamente
(`src/engine/engine-domain-boundary.test.ts`). Corrigido movendo os tipos para o
engine (mesmo padrão de `EvidenceStudy`/`EvidenceRegistry` em `passport-engine.ts`)
antes de prosseguir — ver §4.

## 2 · Commit / branch

```
Branch: feat/ldx-1-learning-dynamics-registry (a partir de main @ 7f4c596)
Commits (4 fatias, gate verde a cada uma):
  54a09e4  Fatia A — Registro Canônico (domínio: JSON + schema + tipos + testes)
  d97c71f  Fatia B — engine de resolução puro + cards/rail base
  e79a575  Fatia C — integração cirúrgica em /voz-segura (+ fix de fronteira)
  cd6d350  Fatia D — Continue aprofundando + testes DOM
  3175ad2  docs: handoff + TASK.md
  (pendente) fix(a11y): teclado no DriverMindMapSvg — ver §13
```

## 3 · Arquivos alterados (19 arquivos da onda original, +3233/−24; +2 no follow-up de acessibilidade — ver §13)

**Documentação (3):**
`docs/learning/REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md` ·
`docs/learning/SUPER_PROMPT_LDX1_ORIGINAL.md` · `TASK.md`

**Domínio (4):** `src/domain/learning/learning-dynamics-registry.{json,schema.json,ts,test.ts}` ·
`src/domain/learning/pedagogical-poem-contract.ts`

**Engine (2):** `src/engine/learning/learning-dynamics-resolution.{ts,test.ts}`

**Componentes (6):** `src/features/learning/components/{LearningDynamicCard,LearningDynamicsRail,IntroVideoCard,LearningMethodDialog,ComplementaryResources}.tsx` ·
`src/features/learning/learning-dynamics.dom.test.tsx`

**Rotas (2, composição aditiva):** `src/routes/voz-segura.tsx` (+160/−24) ·
`src/routes/driver.$driverId.tsx` (+3/−1, só um `export` adicionado a `PILLAR_LABEL`)

**Intocados, confirmados por leitura:** hero, identidade, card IVO, copy oficial,
`src/engine/learning/learning-dynamics.ts` + mock (catálogo pedagógico D1-X3 de
`/academia`), CTA Registry, Skill Registry, `mode-router.ts`,
`response-templates.ts`, `FlorenciaDrawer.tsx`, `FlorenciaSafeConversationEntryPoint.tsx`,
Evidence/Claim/Mechanism Registry (frozen), qualquer migration/RLS/auth/billing.

## 4 · Decisões arquiteturais

1. **Dois catálogos de "dinâmicas" coexistem, deliberadamente não fundidos.**
   `src/engine/learning/learning-dynamics.ts` (9 dinâmicas `D#`/`X#`, pedagogia por
   eixo M.E.T.E., usado em `/academia`) é diferente do novo
   `src/domain/learning/learning-dynamics-registry.json` (14 dinâmicas `LD-00N`,
   governança de maturidade/exposição). Documentado nos comentários de ambos.

2. **Tipos vivem no engine, não no domínio** (correção de rota, não decisão
   original). `src/engine/learning/learning-dynamics-resolution.ts:9-79` define
   `CanonicalLearningDynamic` e os 6 enums de governança;
   `src/domain/learning/learning-dynamics-registry.ts` só carrega o JSON e
   re-exporta os tipos do engine. Motivo: domínio pode importar engine, o
   inverso é proibido e testado (`engine-domain-boundary.test.ts`).

3. **`getAvailableDynamics` usa allowlist, não blocklist — falha FECHADO.**
   `learning-dynamics-resolution.ts:114-119` só considera disponível
   `runtimeStatus` explicitamente em `{REAL, PARCIAL, DEMO}`, nunca "tudo que não
   está na lista de roadmap". Testado com um status inventado/corrompido
   (`learning-dynamics-resolution.test.ts:106-119`) que confirma nunca vira CTA.

4. **`LD-011` (Mapa Mental Governado) mapeia ao driver `"confianca"`** do
   `NR1_CROSSWALK` (label "Confiança & Voz", `pillarIds: ["seguranca_psicologica"]`,
   `src/mocks/nr1-crosswalk-mock.ts:23`) — correspondência declarada **desta onda**,
   não um fato literal do Registro Canônico original. Reuso 100% do
   `mindmap-engine.ts`/`DriverMindMapSvg.tsx` já existentes e testados em
   `/driver/$driverId`; zero dado novo inventado (mesmo `DEMO_COPSOQ_EXPOSURE`).

5. **`PILLAR_LABEL` exportado** de `driver.$driverId.tsx` em vez de duplicado —
   fonte única de vocabulário de pilares IVO.

6. **Rota exige match estrito; papel em aberto não restringe.**
   `routeMatches` (`learning-dynamics-resolution.ts`) é estrito por design — uma
   dinâmica sem rota mapeada não "enriquece qualquer rota". `roleAuthorized` é
   permissivo quando `authorizedRoles` está vazio, para dinâmicas `PLANNED` sem
   papel fechado ainda poderem aparecer em "Em evolução" sem CTA.

7. **"Continue aprofundando" só com recursos internos/registrados** (doc §7.8) —
   nenhum link externo. Status de evidência sempre lido de `buildPassport()`
   (`voz-segura.tsx`, bloco `primaryConfidence`/`complementaryConfidence`), nunca
   digitado à mão (CLAUDE.md §6).

## 5 · Matriz antes/depois (as 14 dinâmicas nesta onda)

| ID | Antes desta onda | Depois desta onda |
|---|---|---|
| LD-001 Assistente Temático | Real no engine, sem registro de governança | Registrado PARCIAL/PILOT; sem mudança de runtime |
| LD-002 Quiz Adaptativo | Real na rota, sem registro | Registrado PARCIAL/PILOT; sem mudança de runtime |
| LD-003 Flashcards Espaçados | Real em `/revisar`, invisível em `/voz-segura` | Registrado REAL/PILOT; **rail novo cross-link para `/revisar`** |
| LD-004 VideoLab Guiado | Ausente | Registrado PLANNED/PREPARATION; só em "Em evolução", sem CTA |
| LD-005 Evidence Explorer | Real (Evidence Passport), sem registro | Registrado PARCIAL/PILOT; sem mudança de runtime |
| LD-006 Trilha de Implementação/PDF | Real em `/plano-acao`, invisível em `/voz-segura` | Registrado PARCIAL/PILOT; **rail novo cross-link para `/plano-acao`** |
| LD-007 Poesia Pedagógica | Ausente | Registrado PLANNED/PREPARATION + contrato `PedagogicalPoemRequest` (sem geração); só em "Em evolução" |
| LD-008 Simulador de Decisões | Real na rota, sem registro | Registrado PARCIAL·DEMO/DEMO; sem mudança de runtime |
| LD-009/LD-010 Co-design/Debate | Ausentes | Registrados PLANNED/PREPARATION; sem superfície em `/voz-segura` |
| LD-011 Mapa Mental Governado | Engine real, **não integrado em nenhuma trilha de driver fora de `/driver/$id`** | **Embutido dentro do passo 2** de `/voz-segura`, com alternativa em texto |
| LD-012 Roleplay Multi-Persona | Ausente | Registrado PROPOSED/HIDDEN; não aparece em lugar nenhum |
| LD-013 Microlearning Espaçado | Real na rota, sem registro | Registrado PARCIAL/PILOT; sem mudança de runtime |
| LD-014 Gêmeo Digital | Ausente | Registrado R_AND_D/R_AND_D; não aparece em lugar nenhum |

**Progresso da trilha:** "0 de 5 etapas" → "0 de 5 marcos práticos concluídos" + linha
acessível explicando os 5 marcos (`voz-segura.tsx`, cabeçalho).

## 6 · Funcionalidades efetivamente disponíveis (REAL/PARCIAL/DEMO com CTA)

- Card introdutório de vídeo (sem player falso — `sourceType: "NOT_AVAILABLE"`).
- Modal "Como funciona" (5 marcos reais, blocos "é/não é").
- Mapa Mental Governado embutido (driver "confianca"), com alternativa textual.
- Rail "Praticar em outro formato" → `/revisar` (LD-003).
- Rail "Sintetizar em plano" → `/plano-acao` (LD-006).
- "Continue aprofundando" com 4 recursos (2 estudos + Mundo do Driver + Academia).

## 7 · Funcionalidades apenas representadas como roadmap (sem CTA)

Seção "Nesta trilha, em evolução" no fim de `/voz-segura`: LD-004 (VideoLab) e
LD-007 (Poesia Pedagógica) — texto informativo, zero botão, zero link.
LD-009, LD-010, LD-012, LD-014 existem só no registro, sem superfície em
`/voz-segura` (`enrichesRoutes` não inclui essa rota ou `publicExposure` é
HIDDEN/R_AND_D).

## 8 · Testes executados e resultados

```
bunx tsc --noEmit                → limpo
bun test src                     → 2265 pass / 0 fail (209→210 arquivos)
  - learning-dynamics-registry.test.ts        14 testes (paridade schema + invariantes)
  - learning-dynamics-resolution.test.ts      16 testes (resolução pura + fail-closed)
  - learning-dynamics.dom.test.tsx            16 testes (happy-dom, itens 2-7 do Super Prompt)
bun run parity                   → "Repo coerente"
bun run build                    → verde; jspdf.mjs em chunk separado (não entrou no
                                    bundle de voz-segura)
```

Verificação em navegador real (dev server `vitalos-julho-dev`, porta 8098):
progresso corrigido, vídeo sem player falso, mapa mental com dados reais
("Confiança & Voz" + 6 dimensões + pilar "Segurança Psicológica"), os 2 rails
navegam de fato (`/revisar`, `/plano-acao`), "Continue aprofundando" navega
(`/driver/confianca`), modal abre com `role="dialog"` e foco preso dentro
(confirmado via DOM), sem overflow horizontal em 375px/1280px, dark mode
resolve tokens corretamente. Um bug de composição foi encontrado e corrigido
nesse processo: `LD-003` não tinha `/voz-segura` em `enrichesRoutes`, então o
rail de flashcards nunca aparecia — corrigido no JSON.

## 9 · Limitações

- Fechar o modal via Escape/clique **não pôde ser confirmado pela automação do
  Browser pane** (limitação já documentada no handoff da Onda 4B — eventos
  sintéticos não-`trusted` não disparam o dismiss do Radix Dialog num contexto
  de automação). **Coberto pelo teste DOM** (`learning-dynamics.dom.test.tsx`,
  `fireEvent.keyDown`/`fireEvent.click` via Testing Library, que usa o sistema de
  eventos sintéticos do React de verdade) — mas a confirmação em navegador real
  por um humano continua recomendada antes de qualquer aceite formal.
- ~~`DriverMindMapSvg.tsx` sem suporte de teclado~~ — **corrigido no follow-up de
  acessibilidade, ver §13.** O anel de foco visível não pôde ser confirmado
  visualmente pela automação do navegador pelo mesmo motivo do item acima
  (chamadas `.focus()` programáticas não disparam evento `focus`/`focusin`
  "trusted" nesta ferramenta — confirmado que isso afeta até um `<button>` HTML
  puro na mesma página, não é específico do meu componente); coberto por 2
  testes DOM dedicados que usam o `fireEvent.focus`/`fireEvent.blur` do
  Testing Library (que simula o evento corretamente).
- `LD-006`/`LD-002`/`LD-008`/`LD-013` registrados com `runtimeStatus: PARCIAL`
  descrevem fielmente o que existe hoje (real, mas não generalizado/adaptativo)
  — nenhuma mudança de comportamento foi feita nessas dinâmicas nesta onda,
  só o registro de governança e (onde fazia sentido) um cross-link.
- Import de `PILLAR_LABEL` cruza de `voz-segura.tsx` para `driver.$driverId.tsx`
  (um arquivo de rota importando de outro) — funciona (confirmado por tsc/build/
  bundler), mas é um padrão de acoplamento um pouco incomum; se incomodar,
  mover `PILLAR_LABEL` para um arquivo de domínio compartilhado é um refactor
  pequeno e seguro para uma onda futura.

## 10 · Riscos residuais

- Nenhum risco de segurança/privacidade identificado (zero dado novo, zero
  persistência nova, zero PII).
- Risco de regressão visual baixo (composição aditiva, verificado sem overflow/
  sem erro de console/dark mode OK), mas não foi feito screenshot pixel-a-pixel
  — recomendo o founder abrir `/voz-segura` no navegador dele antes do aceite,
  mesmo padrão já estabelecido nas ondas anteriores.
- `getLearningDynamicsRegistry()` roda `assertDynamicRegistryIntegrity` só nos
  testes, não como boot-check em runtime — se alguém editar o JSON manualmente
  sem rodar `bun test`, um erro de governança só aparece no próximo CI/gate, não
  imediatamente no app.

## 11 · Próxima onda recomendada

**LDX-2**, conforme já delineado no Registro Canônico §10: quiz adaptativo por
dificuldade pedagógica real, mais cenários no simulador, microlearning espaçado
com persistência privada real, Carta-poema determinística (o contrato já existe
em `pedagogical-poem-contract.ts`) + PDF local, síntese técnica em PDF com
disclaimers. Recomendo começar pelo mesmo formato desta onda: reconhecimento →
preflight → fatias pequenas → gate a cada fatia.

## 12 · Comandos exatos para revisão local

```bash
git fetch origin
git switch feat/ldx-1-learning-dynamics-registry
bun install
bun run gate            # testes + paridade + typecheck
bun run build            # build de produção
bun run dev               # servidor local — abrir /voz-segura
```

Diff completo vs. `main`: `git diff main...feat/ldx-1-learning-dynamics-registry --stat`
(19 arquivos da onda original +2 do follow-up de acessibilidade).

---

## 13 · Follow-up de acessibilidade — teclado no `DriverMindMapSvg`

Pedido pelo founder após a aprovação preliminar da LDX-1: o componente é
pré-existente (usado em `/driver/$driverId` desde antes desta onda), mas
passou a integrar `/voz-segura` na Fatia C — por isso o gap de teclado virou
parte da experiência entregue e foi corrigido antes do gate final.

### Arquivos alterados

- `src/app/nr1/DriverMindMapSvg.tsx` (+27/−2) — único arquivo de produto tocado.
- `src/app/nr1/DriverMindMapSvg.test.tsx` (novo, 13 testes) — não existia teste
  algum para este componente antes.

Nenhum outro arquivo tocado — nem `mindmap-engine.ts` (a lógica pura de
construção do grafo), nem `crosswalk-engine.ts`, nem os pontos de uso
(`voz-segura.tsx`, `driver.$driverId.tsx` continuam passando as mesmas props).

### Decisões

1. **Elemento nativo não era tecnicamente viável sem risco desproporcional.**
   Cada nó é um cluster SVG (círculo + texto + indicadores) posicionado por
   coordenadas calculadas dinamicamente dentro de um `<svg>` com transformações
   de layout radial. Converter para `<button>` real exigiria `<foreignObject>`
   (comportamento de renderização/acessibilidade inconsistente entre
   navegadores) — desproporcional para um follow-up cirúrgico. Mantido
   `role="button"` + `tabIndex={0}` (já existia) e reforçada a semântica que
   faltava: `aria-pressed={isSelected}` (o clique já era um toggle; o estado
   ARIA agora declara isso).

2. **Ativação por teclado replica exatamente a lógica de clique** — `toggle()`
   foi extraído para uma função compartilhada entre `onClick` e `onKeyDown`
   (`DriverMindMapSvg.tsx:131,136,141`), eliminando qualquer chance de
   divergência de comportamento entre mouse e teclado.

3. **Espaço: `e.preventDefault()` sempre que a tecla for reconhecida**
   (`Enter`, `" "`, ou o legado `"Spacebar"`), antes de chamar `toggle()` —
   impede a rolagem da página que o navegador faz por padrão em elementos
   focáveis (`DriverMindMapSvg.tsx:137-143`).

4. **Foco visível via anel SVG desenhado explicitamente, não `outline` CSS.**
   `outline` em elementos SVG (`<g>`) tem suporte inconsistente entre motores
   de renderização. Em vez de depender disso, um `<circle>` tracejado
   (`stroke-dasharray`, cor `oklch(0.55 0.2 250)`, distinta da cor de seleção)
   é renderizado condicionalmente via estado React (`focusedId`,
   `onFocus`/`onBlur`) — visível em qualquer navegador, testável de forma
   determinística. `outline-none` foi adicionado à className **só porque** este
   substituto sempre o acompanha (nunca isolado — regra do
   `ux-ix-premium-accessibility-guard`).

5. **Nenhuma interação depende de hover.** Auditoria confirmou: o componente já
   não tinha nenhum `:hover`-only reveal antes desta mudança; o painel de
   detalhe sempre dependeu de clique/seleção, nunca de hover.

### Evidências e resultados reais

```
bun test src/app/nr1/DriverMindMapSvg.test.tsx    → 13 pass / 0 fail
bunx tsc --noEmit                                  → limpo
bun run gate (testes + paridade + typecheck)       → 2278 pass / 0 fail (210→211 arquivos)
bun run build                                       → verde
```

Os 13 testes cobrem exatamente os itens pedidos: role=button+tabIndex+nome
acessível em todos os nós; Tab alcança o nó (`.focus()` + `document.activeElement`,
envolvido em `act()`); Enter ativa (`aria-pressed` `false→true`); Espaço ativa
E previne o padrão (`fireEvent.keyDown` retorna `false` = `preventDefault`
chamado); toggle duplo desmarca; teclas irrelevantes (Tab, Escape) não ativam;
clique continua funcionando; clique e teclado produzem o mesmo estado final
(mesmo texto do painel de detalhe); anel de foco aparece/some com
`focus`/`blur`; `outline-none` só existe porque o anel o substitui; **o driver
"confianca" (o mesmo embutido em `/voz-segura`) continua resolvendo nós reais
e ativáveis por teclado** — prova direta de ausência de regressão no ponto de
integração da LDX-1; driver inexistente continua retornando `null`.

**Verificação em navegador real** (dev server `vitalos-julho-dev`, reiniciado
no meio da verificação porque uma instância de várias horas travou em
`AuthGate` — ambiente, não código; confirmado por `preview_logs` sem erro e
resolvido reiniciando o servidor):

- **Desktop:** os 6 nós do mapa embutido em `/voz-segura` têm `tabindex="0"`;
  Enter dispatchado no primeiro nó levou `aria-pressed` a `"true"` e abriu o
  painel de detalhe real ("Qual. liderança · COPSOQ II · 60% · Exposição:
  47/100..."); Espaço confirmado com `preventDefault` (retorno `false` de
  `dispatchEvent`) e mesmo efeito de ativação.
- **Mobile (375×812):** mesmos 6 nós, `tabIndex=0`, Enter ativa
  (`aria-pressed=true`) sem introduzir overflow horizontal
  (`scrollWidth === innerWidth` antes e depois da ativação).
- **`/driver/$driverId` (o outro ponto de uso, não tocado por esta onda):**
  Enter no primeiro nó também ativa (`aria-pressed=true`), zero erro de
  console — confirma que a correção não regrediu a superfície original.
- **Anel de foco visual:** não pôde ser confirmado pela automação do
  navegador — chamadas `.focus()` programáticas não disparam eventos
  `focus`/`focusin` "trusted" nesta ferramenta (testado isoladamente: nem um
  `<button>` HTML puro da mesma página dispara o evento sob `.focus()`
  programático aqui, então não é uma característica do SVG nem do meu código
  — é a mesma classe de limitação já documentada para o Escape do Radix
  Dialog). Coberto pelo teste DOM (happy-dom simula o evento corretamente).

### Risco residual após o follow-up

- **Nenhum.** Os 3 pontos pedidos (ativação por teclado, semântica acessível,
  ausência de regressão) estão implementados, testados (13 testes dirigidos +
  gate completo) e confirmados funcionalmente em navegador real nos dois
  pontos de uso do componente, em desktop e mobile.
- **Único item não 100% verificável por automação:** a aparência VISUAL do
  anel de foco (existência/estilo do elemento é comprovada por teste DOM; a
  automação de navegador não consegue disparar foco "trusted" para
  screenshot). Recomendo, na próxima sessão manual do founder, um Tab real no
  teclado em `/voz-segura` até o mapa mental, só para confirmar visualmente
  — é o mesmo tipo de confirmação humana já pendente para o modal (§9).

## 14 · Auditoria final

Confirmações explícitas pedidas pelo founder, cada uma com a evidência que a sustenta:

| Item | Status | Evidência |
|---|---|---|
| Nenhuma dinâmica `PLANNED`/`PROPOSED`/`R_AND_D` aparece como disponível | ✅ confirmado | Schema `allOf` (`learning-dynamics-registry.schema.json`) recusa o JSON se isso acontecer; teste "PLANNED/PROPOSED/R_AND_D/AUSENTE/DEPRECATED nunca têm exposição operacional" (`learning-dynamics-registry.test.ts`); `getAvailableDynamics` usa allowlist `{REAL,PARCIAL,DEMO}`, testado com status corrompido (`learning-dynamics-resolution.test.ts:106-119`); confirmado no navegador — seção "Em evolução" mostra LD-004/LD-007 sem nenhum botão |
| Card de vídeo não apresenta player ou conteúdo inexistente | ✅ confirmado | `IntroVideoCard` só renderiza `<video>` quando `sourceType !== "NOT_AVAILABLE" && videoSrc`; teste "sourceType NOT_AVAILABLE nunca renderiza \<video\>"; confirmado no navegador — badge "Vídeo em preparação", zero tag `<video>` no DOM |
| Mapa Mental Governado não cria relações por IA | ✅ confirmado | `buildDriverMindMap`/`driverProfile` são funções puras determinísticas (`mindmap-engine.ts`, `crosswalk-engine.ts`) — zero import de LLM/fetch/API externa; `grep -i "fetch\|openai\|anthropic\|llm\|generat"` nos 2 arquivos não retorna nada; o follow-up de acessibilidade não tocou a lógica de construção do grafo, só a interação do `<g>` |
| Nenhum claim novo foi introduzido | ✅ confirmado | Zero arquivo do Claim/Evidence/Mechanism Registry no diff (`git diff --name-only main` não lista nenhum) |
| Não houve migration | ✅ confirmado | Zero arquivo `supabase/migrations/` no diff |
| FlorêncIA não foi conectada ao ActionLog | ✅ confirmado | Zero arquivo `src/engine/florencia/`, `FlorenciaDrawer.tsx` ou `action-log-engine.ts` alterado no diff |
| NASCENTES_ATLAS não foi implementado em runtime | ✅ confirmado | Zero arquivo com "nascentes" no diff; nenhuma menção a NASCENTES em código novo desta onda |
| Identidade, hero e card IVO permaneceram congelados | ✅ confirmado | Zero arquivo de landing/hero/IVO no diff — confirmado por leitura no preflight (§ preflight original) e por `git diff --name-only main` não listar nada em `src/features/landing/` |

Nenhuma exceção encontrada em nenhum item.
