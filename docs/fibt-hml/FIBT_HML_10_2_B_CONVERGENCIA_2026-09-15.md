# FIB-T HML — Convergência da proteção até a experiência do RH

**Macro-onda 10.2-B · 2026-09-15 · implementação e validação LOCAIS · nenhuma escrita remota**

> Complemento de `FIBT_HML_10_2_ROLLOUT_READINESS_2026-09-15.md`, que permanece
> íntegro e continua valendo como o pacote de prontidão. Este documento registra
> a **evolução**: o que foi corrigido, o que passou a ser provado, e o que ficou
> deliberadamente parado.
>
> Nesta onda não houve `commit`, `push`, PR, merge, deploy, migration remota,
> convite, coleta nem qualquer escrita em HML, staging ou produção. Todos os
> ensaios rodaram em container Postgres local descartável com dados
> exclusivamente sintéticos.
>
> Contrato congelado e inalterado: `ITEMS=32`, `FACTORS=12/12/8`,
> `ITEM_5_FACTOR=3`, `K_MIN=5`, `MISSING_AS_ZERO=false`,
> `INDIVIDUAL_RESPONSE_EXPOSURE=false`. Nenhuma fórmula nova foi criada, nenhum
> privilégio foi ampliado e nenhum teste foi afrouxado.

---

## 1 · Causa e correção de cada bloqueio

### D1 · P1 — o painel do RH contornava a publicação protegida · **CORRIGIDO**

**Causa.** `loadFibtManagerControlCenterAsAdmin` chamava `store.listResponses(waveId)`,
que fazia `select("cohort_id,instrument_version,answers")` em `wave_responses`
com `service_role`, e entregava as respostas cruas a
`buildManagerAnalytics(responses, versao)`. Essa função recalculava média por
item e escore **ao vivo**, aplicando apenas `n >= FIBT_K_MIN`. Consequências
medidas na 10.2: duas cargas sucessivas do painel enquanto um setor cruzava
n → n+1 devolviam duas médias exatas (`media_{n+1}·(n+1) − media_n·n` é a
resposta da pessoa nova), e "Comparação entre setores" + rótulos de participação
+ total da onda reconstruíam por subtração o tamanho de um setor protegido.
A RPC endurecida pela Task 10.1 não governava nada disso: ela tinha **zero**
consumidores de interface.

**Correção — a menor que fecha o caminho sem duplicar a regra.** Três decisões:

1. **A fonte do valor observável passou a ser o snapshot PUBLICADO.** O contrato
   do store perdeu `listResponses` e ganhou dois métodos que não trazem conteúdo:
   `listSegmentParticipation` (só `cohort_id,instrument_version` → contagens por
   segmento) e `listPublishedSnapshots` (lê `cohort_capsules`). O conteúdo das
   respostas **não sai mais do banco por este caminho** — é isso, e não uma
   verificação adicional, que fecha o bypass.
2. **A regra de supressão complementar é reusada, não reescrita.** Vem de
   `suppressDifferentialInference` (`src/engine/survey/sector-link-engine.ts`) —
   exatamente a função que a migration `20260909221000` cita como fonte de que o
   SQL foi derivado. Um teste compara as duas decisões sobre as mesmas partições
   (`[10,4]·[10,8,4]·[10,8,4,3]·[5,4]·[100,4]·[100,100,4]·[10,8,7]`).
3. **O escore vem do caminho canônico já existente.** `buildFibtCohortReport`
   (manifesto + engine versionado) recebe as médias por item **publicadas**.
   Nenhuma fórmula nova, `MISSING_AS_ZERO` continua `false`, e a validação dos
   32 itens é a mesma de antes.

A ordem de decisão de `buildProtectedCohortReading` espelha a do SQL de
propósito: `no_data` → `insufficient_participants` → `complementary_suppression`
→ `awaiting_batched_release` / `withheld_on_close` → `awaiting_item_coverage` →
`available`. Antes de tudo isso vem a **precedência 0**, identidade metodológica
(versão da onda diferente do manifesto, ou versões misturadas no recorte), porque
é bloqueio de correção e a mensagem não carrega contagem nenhuma.

Três consequências que valem registro explícito:

- **A contagem exposta é a PUBLICADA, nunca a viva.** Com 9 respostas vivas e 6
  publicadas, o payload diz 6. É isso que impede o delta pequeno de vazar.
- **`participationLabel` deriva do ESTADO, não da contagem.** Número somente em
  `available`; faixa `<5` abaixo do limiar; rótulo não numérico (`protegida`) em
  qualquer estado protegido. Sem isso o painel devolveria por rótulo justamente o
  que a RPC retém: em `[10, 8, 4]`, mostrar 10 e 8 ao lado do total 22 entrega o
  4 por subtração.
- **`buildManagerAnalytics` deixou de existir.** A ausência da função é a prova
  de que não há mais caminho de recálculo ao vivo, e um teste falha se ela voltar.

### D2 · P1 — microcopy falsa para os motivos novos de supressão · **CORRIGIDO**

**Causa.** `buildFibtCohortReport` tratava só `not_authorized` e colapsava todo o
resto num ramo único cuja mensagem era *"Resultado oculto: menos de 5 respostas
(<5)"*, usando `countLabel ?? "<k"`. Como `awaiting_batched_release`,
`differential_inference_risk` e `item_level_insufficient_contributors` devolvem
`response_count_label` NULO, uma coorte de 9 ou 40 respostas era descrita como
tendo menos de cinco.

**Correção.** Cada motivo ganhou ramo próprio (`aguardando_lote`,
`supressao_complementar`, `aguardando_cobertura_itens`) e nenhum deles afirma
contagem. Motivo desconhecido cai em `retido` fail-closed — sem inventar faixa,
sem estimar quantidade. `privacy_threshold` segue sendo o **único** motivo que
cita a faixa, porque é o único em que a faixa é verdadeira. E um rótulo numérico
com conteúdo suprimido (estado anômalo) passa a sair como `protegida` em vez de
ser apresentado como faixa falsa.

### D3 · P2 — `db:replay:preprod` não cobria a Task 10.1 · **CORRIGIDO**

**Causa.** `PACOTE_G1_V2` é uma lista fechada de 6 arquivos e o modo `preprod`
aplicava só ela — mas `rodarProvas()` executa **todas** as suítes de
`supabase/tests/` por glob. As suítes 05 e 06 rodavam contra um banco sem
`cohort_capsules` e sem a ACL de `waves` fechada, e a 03 falhava na supressão
diferencial. Três FAIL do harness, não das migrations.

**Correção.** Novo `PACOTE_TASK_10_1` (lista fechada, nunca inferida por glob),
com custódia validada (3 arquivos únicos, em ordem lexicográfica, sem
sobreposição com o G1-v2), aplicado após o pacote G1-v2 no modo `preprod`. Mais
uma **reconciliação aritmética que falha se alguém adicionar uma migration sem
declarar a que pacote ela pertence** — a classe de erro que causou D3 fica
impossível de repetir em silêncio. E o bootstrap é provado no-op no baseline
produtivo consultando o banco (`0 linhas em cohort_capsules`), não por suposição
sobre o inventário.

### D4 · P2 — reaplicação de `20260909222000` · **CARACTERIZADO, não corrigido**

A invariante final do bootstrap é **global**
(`IF EXISTS (SELECT 1 FROM cohort_capsules WHERE item_means IS NOT NULL)`), então
depois de qualquer publicação legítima uma reexecução aborta com
`FALHA: o bootstrap publicou agregado`. O `INSERT` do bootstrap é guardado por
`NOT EXISTS` e semeia 0 linhas — ou seja, é fail-closed excessivo, não drift real,
e a mensagem assusta quem retoma uma janela.

O replay agora prova as **duas metades**: em um clone sem publicação a
reaplicação passa e o release em lote é conservado; no banco de prova com
publicação ela recusa, com a mensagem exata. Corrigir a invariante para o escopo
das linhas semeadas nesta execução é a menor correção proposta — **exige
autorização própria e não foi feita**, porque alteraria um arquivo de migration
cujo hash está no manifesto e no pedido de autorização da 10.2.

### D8 · P1 (NOVO nesta onda) — ordem de reaplicação regride a função · **CARACTERIZADO**

`20260909221000` e `20260909222000` substituem a **mesma** função por
`CREATE OR REPLACE`, e a 222000 é a final. Reaplicar a 221000 depois da 222000
**não é idempotência, é regressão**: o corpo volta ao que só tinha supressão
diferencial e o release em lote desaparece. O SQL passa, e é justamente por isso
que o risco é silencioso.

Descoberto pelo próprio harness: a versão anterior do replay reaplicava as duas
antes das suítes e só passava porque a reaplicação da 222000, logo depois,
restaurava a função **por acidente de ordem**. No modo `upgrade` — onde já existe
publicação e a 222000 recusa reaplicar — o acidente não acontecia, e a suíte 06
falhava contra uma função regredida. A caracterização foi movida para o fim da
execução e para um clone, com uma verificação final de que o banco de prova
permanece no estado correto (`bun run proof:concurrency` depende disso).

**Consequência operacional para a janela de HML:** se a janela for retomada, a
ordem `220000 → 221000 → 222000` tem de ser respeitada integralmente. Reaplicar
apenas a 221000 "para garantir" **reabre a diferenciação temporal**.

### D9 · P1 (NOVO nesta onda) — em HML não há identidade para publicar · **FRONTEIRA, não corrigido**

Rastreado, não presumido: `aggregate_cohort_responses` é o **único** mecanismo do
schema que faz um snapshot de coorte avançar, e resolve o escopo de tenant por
pertencimento — `JOIN profiles p ON p.org_id = w.org_id WHERE p.id = auth.uid()`.
`service_role` puro tem `auth.uid()` NULL e recebe `not_authorized` explícito
(comportamento já coberto por `supabase/tests/06_cohort_temporal_release.sql`).
Isso é correto e não deve ser contornado.

O painel tem essa identidade no modo `supabase_admin` (o access token da própria
sessão do RH_ADMIN, já validado por `requireOrgAdmin`), e o novo
`fibt-cohort-publication.server.ts` a usa para invocar a RPC — com a **chave
publicável** como `apikey` e o token do administrador como `Authorization`,
**nunca** service role: pedir service role aqui seria pedir à RPC exatamente o
bypass que ela recusa.

**O deployment HML autentica por Cloudflare Access e não tem usuário Supabase.**
Portanto, em HML, nenhuma coorte publica, e o painel mostra
`awaiting_batched_release` de forma honesta e permanente. Não é defeito do
código desta onda: é uma propriedade do desenho da Task 10.1 que só aparece
quando se junta "publicação exige identidade organizacional" com "HML não tem
identidade organizacional". Está no §9 como decisão a tomar.

### Fora de escopo, registrados sem alteração

- **D5** (tipos gerados declaram `response_count`/`suppression_reason`/`item_means`
  como não-nulos e não incluem `cohort_capsules`) — regeneração de tipos pertence
  a outra onda; não afeta runtime, porque o consumidor lê os campos com `??`.
- **D6** (`supabase/config.toml` aponta para o ref de produção) — risco de
  ferramenta; a mitigação continua sendo `--project-ref` explícito, nunca
  `--linked`, como o plano da 10.2 já exige.
- **D7** (as três migrations não são ASCII puro) — inalterado.

---

## 2 · Caminhos reais agora cobertos

| Caminho | Antes | Agora |
|---|---|---|
| `/fibt-piloto` → `loadFibtManagerControlCenter` → `loadFibtManagerControlCenterAsAdmin` (modo `supabase_admin`) | lia `answers` cruas e recalculava ao vivo | lê contagens + `cohort_capsules`; avança a publicação pela RPC canônica com a identidade do administrador |
| Mesmo caminho no modo `hml_access` | idem | somente-leitura sobre o publicado; sem identidade, nada publica (D9) |
| `aggregate_cohort_responses` → `loadFibtCohortReport` → `buildFibtCohortReport` | qualquer supressão desconhecida virava "menos de 5 respostas" | ramo próprio por motivo; motivo novo cai em `retido` fail-closed |
| Leitura agregada da ONDA | média ao vivo de todas as respostas | `wave_reading_unavailable` explícito — ver §"ponto parado" |
| Fechamento de onda (`/admin`) | qualquer motivo ≠ `withheld_for_privacy` era atribuído a k-anonimato | `below_k_anonymity` tem texto próprio; qualquer outro motivo é reportado sem inventar causa |
| `/onda` (leitura de campanha, mocks) | "Pronto para publicar (n≥5 no agregado)" | "Limiar de privacidade atingido (n≥5). A leitura é publicada em lote protegido." |
| `wave_capsules` (publicador de nível onda) | — | inalterado, e agora travado por teste: se `withheldForPrivacy` ou `delta < K_ANONYMITY_MIN` desaparecerem, a guarda falha |

**Superfície de leitura de conteúdo de resposta, após a mudança:** exatamente
um lugar no app inteiro faz `select` com `answers` — `capsule-aggregator.server.ts`,
o publicador de cápsula de onda, que tem controle de lote próprio. A allowlist é
explícita num teste, e qualquer arquivo novo que passe a ler `answers` faz a
suíte falhar.

### O ponto deliberadamente PARADO — decisão metodológica nova

Não existe snapshot publicado de **nível onda** para a FIB-T: `cohort_capsules` é
por segmento, e `wave_capsules` guarda dimensões por pilar de um modelo diferente
(não as médias por item da FIB-T). Compor as médias publicadas dos segmentos numa
média da onda **não é exato**: com o gate por item, os contribuintes por item
diferem entre segmentos, então a média ponderada pela contagem publicada seria uma
aproximação com aparência de escore.

Conforme instruído, **paramos somente este ponto**: a leitura de onda devolve
indisponibilidade explícita, com a razão dita na tela, e as demais atividades
seguiram. Um número aproximado seria mais confortável e menos honesto.

---

## 3 · Testes e limitações

### O que passou a ser provado

| Cenário exigido | Onde | Resultado |
|---|---|---|
| Chamadas sucessivas +1 até +4 e depois +5 | `fibt-manager-control-center.server.test.ts` | cinco cargas do painel produzem **payloads idênticos**; o +5 avança a contagem publicada em exatamente 5 e muda o escore |
| Coortes com relógios de publicação diferentes | idem | um setor `available`, outro `awaiting_batched_release`, na mesma onda |
| Combinação de totais, setores, contagens e médias | idem | partição `[10,8,4]`: os dois visíveis ficam `complementary_suppression`, rótulos saem `protegida`/`protegida`/`<5`, comparação entre setores vazia, total 22 não resolve nada |
| Respostas incompletas por item | idem + módulo puro | `awaiting_item_coverage`; nenhum `escoreBruto` no payload; nenhum item ausente tratado como zero |
| Fechamento de onda sem publicação forçada | idem | setor com publicação anterior mantém a leitura e marca `finalUpdateWithheld`; setor sem publicação nenhuma vira `withheld_on_close`, não "aguardando" |
| Autorização e isolamento entre organizações | idem | onda de outro tenant negada **antes** de qualquer leitura de participação (contadores de leitura em 0) |
| Ausência de respostas individuais no payload | idem | `JSON.stringify(snapshot)` sem `answers`, sem `token_hash`, sem a contagem viva de recorte protegido |
| Ausência de caminho ativo que contorne a proteção | `fibt-published-reading-boundary.test.ts` | guarda estática: allowlist de leitores de `answers`, ausência de `aggregateFibt`/`buildManagerAnalytics` no módulo do painel, publicador sem service role |
| Concorrência real | `bun run proof:concurrency` | 10/10 — duas sessões `psql` independentes, um único snapshot atômico |
| Instalação limpa e atualização a partir do estado anterior | `bun run db:replay` / `db:replay:upgrade` | 31/31 e 44/44 |
| Estados de UX nas telas afetadas | `FibtManagerControlCenter.test.tsx`, `fibt-piloto.render.test.tsx` | títulos distintos por estado, privacidade sem `role="alert"`, alvos de 44px, regiões rotuladas, grade responsiva |

O ensaio de atualização deixou de viver num harness externo: virou
`bun run db:replay:upgrade`, versionado, com dados sintéticos e o **bootstrap
real** rodando sobre banco não vazio — o bloco `DO $bootstrap$` que, até aqui,
nunca havia sido executado contra dados em lugar nenhum (a suíte 06 apenas
simulava a forma do `INSERT`).

### Limitações — o que estes testes NÃO provam

1. **PASS nos cenários testados não é garantia universal de anonimato.** As
   partições exercitadas são finitas. A composição de ataques fora do conjunto
   testado permanece não coberta.
2. **`advanceCohortPublication` nunca rodou contra um Supabase real.** O caminho
   é exercitado por injeção de dependência; a chamada HTTP, o comportamento do
   `apikey`/`Authorization` com chave publicável e a resposta do PostgREST são
   **UNKNOWN** até haver execução autorizada. A falha é contida por construção
   (best-effort, fail-closed no leitor), mas "contida" não é "verificada".
2. **Nada foi verificado em HML, staging ou produção.** Todos os números vêm de
   container local e de dados sintéticos.
4. **O ensaio de atualização não reproduz o estado vivo de HML** — reproduz o
   estado do *repositório* menos as três migrations. O estado real do destino
   segue `UNKNOWN` (§8).
5. **Durações são medições de dataset pequeno**, não estimativas para o alvo.
6. **A leitura de onda não foi resolvida**, foi parada com indisponibilidade
   explícita (§2).

---

## 4 · Inventário completo de alterações

Nenhum arquivo de migration, nenhuma suíte SQL e nenhum manifesto foram
alterados. Nenhum teste foi removido ou afrouxado.

### Código de produção

| Arquivo | Natureza | O que mudou |
|---|---|---|
| `src/lib/fibt/fibt-manager-control-center.ts` | reescrito | `buildManagerAnalytics` removida; `buildProtectedCohortReading` (10 estados) sobre snapshot publicado; reuso de `suppressDifferentialInference`; `buildWaveReadingUnavailable`; `buildFactorComparison` preservado |
| `src/lib/fibt/fibt-manager-control-center.server.ts` | alterado | store sem `listResponses`, com `listSegmentParticipation` + `listPublishedSnapshots`; `seal_outcome` no `select` de `waves`; partição completa; `publisherAccessToken`; `readingPublished`/`publishedCohorts` |
| `src/lib/fibt/fibt-cohort-publication.server.ts` | **novo** | avanço da publicação pela RPC canônica com identidade do chamador; best-effort; sem service role |
| `src/lib/fibt/fibt-cohort-report.ts` | alterado | ramos próprios para os motivos da Task 10.1 (D2); `retido` fail-closed; `RETIDO_COUNT_LABEL` |
| `src/lib/api/fibt-manager-control-center.functions.ts` | alterado | injeta o publicador; passa `publisherAccessToken` só no modo `supabase_admin` |
| `src/components/fibt/FibtManagerControlCenter.tsx` | alterado | mapas de badge/título/ícone por estado; privacidade sem linguagem de falha; nota de retenção final; banner de fechamento retido; copy de publicação corrigida |
| `src/routes/fibt-piloto.tsx` | alterado | `stateForCategory`; `EstadoAcessoNegado`; `EstadoIndisponivel` |
| `src/routes/admin.tsx` | alterado (6 linhas) | motivo de fechamento não é mais atribuído a k-anonimato por padrão |
| `src/routes/onda.tsx` | alterado (4 linhas) | n≥5 deixa de ser apresentado como "pronto para publicar" |

### Ferramental

| Arquivo | O que mudou |
|---|---|
| `scripts/db-replay-proof.ts` | `PACOTE_TASK_10_1` + custódia; reconciliação aritmética de arquivos; aplicação no `preprod`; prova de bootstrap no-op; novo `--mode=upgrade`; `caracterizarReaplicacaoTask10()` (D4 nas duas metades + D8 em clone + verificação do estado final) |
| `package.json` | `db:replay:upgrade` |

### Testes

| Arquivo | Natureza |
|---|---|
| `src/lib/fibt/fibt-manager-control-center.test.ts` | reescrito — estados puros, paridade literal com o engine, ausência do construtor ao vivo |
| `src/lib/fibt/fibt-manager-control-center.server.test.ts` | reescrito — caminho real do painel e seu payload |
| `src/lib/fibt/fibt-published-reading-boundary.test.ts` | **novo** — guarda estática da fronteira de leitura |
| `src/lib/fibt/fibt-cohort-report.test.ts` | ampliado — motivos da Task 10.1 |
| `src/components/fibt/FibtManagerControlCenter.test.tsx` | reescrito — estados, a11y, móvel, teclado |
| `src/routes/fibt-piloto.render.test.tsx` | ampliado — acesso negado × indisponível × erro |

### Documentação

`docs/fibt-hml/FIBT_HML_10_2_B_CONVERGENCIA_2026-09-15.md` (este arquivo).
O relatório da 10.2 e seu `.sha256` **não foram tocados**.

### Diagnóstico de EOL, antes de qualquer normalização

- **`src/routeTree.gen.ts`**: a árvore de trabalho estava em LF (1816 linhas) e o
  índice em CRLF, efeito do `bun run build:ci` da onda anterior (o plugin do
  TanStack Router grava LF). `git diff --numstat` era **vazio** — zero linha de
  conteúdo. Reescrito com os terminadores do checkout (CRLF), mesmo conteúdo, sem
  `checkout`/`reset`/`clean`. O arquivo saiu do `git status`.
- **`src/routes/admin.tsx` e `src/routes/onda.tsx`**: o editor reformatou regiões
  não relacionadas (62 e 13 linhas de churn) ao gravar uma alteração de 5 e 3
  linhas. Restaurados do HEAD e reaplicados por script, fora do editor. Os diffs
  finais são de 6/1 e 4/1 linhas, idênticos com e sem `-w`.
- **`bun run lint` está vermelho em todo o checkout**, e já estava antes desta
  onda: um arquivo não tocado (`src/engine/fibt/fibt-engine.ts`) acusa 236 erros
  `prettier/prettier` do tipo `Delete ␍`, porque o checkout está em CRLF e o
  prettier assume LF; `scripts/db-replay-proof.ts` soma a isso indentação de 4
  espaços contra o padrão de 2. **Não normalizei nada disso**: seria uma
  reescrita em massa de arquivos alheios à onda. `lint` não faz parte de
  `bun run gate`.

---

## 5 · Reconciliação das migrations

Impressa pelo próprio replay, e agora travada por um passo que falha se algum
arquivo ficar sem classificação:

```
59  migrations no manifesto (rollup 9d52b09b921f… — inalterado)
− 1  20260730160000  exclusiva de STAGING (gêmea mutuamente exclusiva)
− 1  20260806210000  comprovadamente não executável (precondition 1.6)
= 57 linhagem de produção replayável

57 = 47 baseline  (46 com nome < 20260806210000  +  1 superseded 20260825022411)
   +  6 PACOTE_G1_V2
   +  3 PACOTE_TASK_10_1        ← faltava no preprod (D3)
   +  1 20260828121000  M6 histórico, fora do baseline produtivo e do pacote
                        (exige 14 funções não promovidas); só na linhagem clean
```

O número "54" citado na 10.2 era o baseline do **ensaio de atualização** —
`57 − 3` da Task 10.1 —, não o baseline do `preprod` (47 + fixtures). Os dois
coexistem e agora estão nomeados no código.

As três migrations, com os hashes canônicos (SHA-256 do conteúdo normalizado em
LF, como o manifesto os registra):

| Ordem | Arquivo | SHA-256 |
|---|---|---|
| 57 | `20260909220000_lock_down_waves_direct_writes.sql` | `82a516ef58bff60e71af1ec2460610e5ff094759d8b5c3bddcdfb741488cd1ac` |
| 58 | `20260909221000_cohort_differential_suppression.sql` | `c31388a69da0130a4cf634fab2c56be7264090dac29dcbe7c7ac87f296f1d384` |
| 59 | `20260909222000_cohort_batched_release_temporal_privacy.sql` | `a8bc43af1aaa87f995f15f76b13ee64a5b54598fa2afce44043bb03f75c81928` |

**Ordem obrigatória, agora com um motivo provado (D8):** `220000 → 221000 → 222000`.
Reaplicar a 221000 depois da 222000 regride a função e reabre a diferenciação
temporal.

---

## 6 · Situação dos gates

| Gate | Comando | Resultado |
|---|---|---|
| Testes | `bun test src scripts` | **3809 pass · 0 fail** (era 3747 antes desta onda) |
| Paridade de schema | `bun run parity` | **OK** |
| Tipos | `bunx tsc --noEmit` | **limpo** |
| Manifesto | `bun run manifest` | **59 arquivos, rollup `9d52b09b921f…`, zero drift** |
| Varredura de segredo | `bun run secret-scan` | **OK** |
| Varredura exigindo artefato | `--require-artifact` | **OK** — 6 configs · 633 fontes · 278 arquivos de artefato · 0 ocorrências |
| Build inerte | `bun run build:ci` | **verde** (runtime `ci`, alvo `test`, URLs `.invalid`) |
| Replay limpo | `bun run db:replay` | **31 passos · 31 ok · 0 falhas** |
| Replay pré-produção | `bun run db:replay:preprod` | **37 passos · 37 ok · 0 falhas** (era 24/27 com 3 falhas) |
| Replay de atualização | `bun run db:replay:upgrade` | **44 passos · 44 ok · 0 falhas** (não existia) |
| Concorrência real | `bun run proof:concurrency` | **10 passos · 10 ok · 0 falhas** |
| Lint | `bun run lint` | **vermelho, pré-existente** (CRLF do checkout + indentação de 4 espaços em um script). Fora de `bun run gate`; não normalizado de propósito |

Durações medidas no ensaio de atualização (Postgres 17 local, dataset sintético
pequeno): `220000` ≈ 0,5 s · `221000` ≈ 0,5 s · `222000` ≈ 1,0 s. Medição, não
estimativa para o alvo.

Configuração inerte usada em todo o ensaio: `VITALOS_RUNTIME_ENV=ci`,
`VITALOS_DB_TARGET=test`, `SUPABASE_URL`/`VITE_SUPABASE_URL=https://ci.invalid`
(RFC 2606 — não resolve). Nenhuma credencial real esteve presente na sessão.

---

## 7 · Checkpoint atualizado

```
MACRO_ONDA=10.2-B
SHA_BASE=01de8361b7c6fe9697943ba257d903de31ed9da4   (inalterado, sem commit)
BRANCH=chore/fibt-hml-rollout-readiness
WORKTREE=vitalos-fibt-hml-readiness

BYPASS_DO_PAINEL=FECHADO (D1)
MICROCOPY_FALSA=CORRIGIDA (D2)
PREPROD=CORRIGIDO (D3)
ENSAIO_DE_ATUALIZACAO=INTEGRADO_AO_REPO (bun run db:replay:upgrade)
REAPLICACAO_222000=CARACTERIZADA_NAO_CORRIGIDA (D4)
ORDEM_DE_REAPLICACAO=ACHADO_NOVO_CARACTERIZADO (D8)
PUBLICACAO_EM_HML=SEM_IDENTIDADE_ORGANIZACIONAL (D9 — decisão pendente)
LEITURA_DE_ONDA=PARADA_COM_INDISPONIBILIDADE_EXPLICITA (decisão metodológica)
TIPOS_GERADOS=DESALINHADOS (D5, outra onda)
CONFIG_TOML_APONTA_PRODUCAO=INALTERADO (D6)

GATE=PASS (3809/0 · parity · tsc · manifesto · secret-scan com artefato)
REPLAY=clean 31/31 · preprod 37/37 · upgrade 44/44 · concorrência 10/10

PROTECAO_TEMPORAL_NO_BANCO=PASS
PROTECAO_TEMPORAL_NO_PRODUTO=PASS_LOCALMENTE (sem verificação remota)
INDIVIDUAL_RESPONSE_EXPOSURE=false (payload provado sem answers)

ESCRITAS_REMOTAS=NENHUMA
COMMIT_PUSH_PR_MERGE=NENHUM
DEPLOY=NENHUM
IDENTIDADE_E_SCHEMA_VIVO_DO_DESTINO=UNKNOWN

NEXT_SAFE_ACTION=DECIDIR_IDENTIDADE_DE_PUBLICACAO_EM_HML_E_AUTORIZAR_PREFLIGHT_READ_ONLY
```

Evidências locais (gitignored): `.replay-clean.log`, `.replay-preprod.log`,
`.replay-upgrade.log`, `.concurrency.log`, `.gate-final.log`.

---

## 8 · Pendências remotas ainda UNKNOWN

Nada nesta onda mudou o estado remoto, e portanto **nada nesta onda pode ser
usado para afirmar prontidão remota**. Segue exatamente como a 10.2 registrou:

| # | Pendência | Estado |
|---|---|---|
| B3 | Identidade efetiva do destino, confirmada contra o projeto vivo | **UNKNOWN** — nenhuma credencial `STAGING_*`, nenhum `SUPABASE_ACCESS_TOKEN`, `supabase` CLI e `wrangler` ausentes do PATH |
| B4 | Estado vivo do schema de HML/staging (funções, ACL, policies, tabelas) | **UNKNOWN** |
| B5 | Inventário vivo de respostas e coortes no destino | **UNKNOWN** |
| — | Migrations realmente pendentes **no destino** | **UNKNOWN** (o repositório tem 3 novas; o que falta no banco vivo não foi verificado) |
| — | Comportamento ao vivo de `advanceCohortPublication` | **UNKNOWN** (nunca executado contra Supabase real) |
| B6 | Ledger remoto de migrations | **NOT_APPLICABLE** — `supabase_migrations` não existe em staging |
| B7 | Backup/retenção/PITR do projeto de staging | **AUSENTE** (plano Free); recuperação = reconstrução sintética |

---

## 9 · Próximo pacote concreto a autorizar

Ordenado por dependência. O item 1 é o único que precisa de decisão de produto;
os demais são execução.

**1 · Decidir como HML publica (D9) — bloqueia a homologação de RESULTADO, não a de coleta.**
Três opções, sem recomendação embutida porque a escolha é de governança:

- **(a) Aceitar HML somente-leitura.** A homologação valida coleta, consentimento,
  vínculo de coorte e proteção — e o painel mostra `awaiting_batched_release`. É o
  estado atual, custa zero e não valida a publicação de resultado.
- **(b) Criar um usuário Supabase sintético de RH_ADMIN na organização HML** e
  fazer o Worker autenticar com ele. Valida a publicação ponta a ponta; introduz
  uma credencial nova no perímetro HML, com todo o cuidado de custódia que isso
  implica.
- **(c) Estender a publicação a um caminho alcançável por `service_role`.** Exige
  migration nova, o que colide com a M6A (que aborta diante de função de `public`
  fora da allowlist) e com a custódia de hashes do pedido da 10.2. É a opção mais
  invasiva.

**2 · Autorizar o preflight read-only do destino** (§6 passo 2 do relatório da
10.2), que converte B3/B4/B5 de `UNKNOWN` para `PASS` ou `FAIL`. Sem isso não há
como afirmar quais migrations faltam no banco vivo.

**3 · Aplicar as três migrations em HML/staging**, na ordem, conforme o plano já
detalhado na 10.2 §6 — agora com D8 acrescentado aos critérios de parada
(reaplicar a 221000 isoladamente é proibido). **Atualização do fechamento
local:** `scripts/fibt-hml/guard-against-221000-isolated-reapply.sql` (somente
leitura) passou a existir e a ser exercitado pelo replay; o operador deve
rodá-lo no SQL Editor antes de colar o corpo de `221000` em qualquer sessão.
Ele não é enforcement de banco — é passo de procedimento, documentado com o
alcance exato no próprio cabeçalho do arquivo.

**4 · Correções P2 acumuladas, em onda própria:** invariante do bootstrap
escopada (D4), regeneração dos tipos (D5), e a decisão sobre `config.toml` (D6).

**5 · Decisão metodológica sobre a leitura de nível onda:** ou definir e publicar
um snapshot de onda com regra própria, ou manter a indisponibilidade explícita
como contrato de produto.

**Nada nesta lista está autorizado por este documento.** Nenhuma implantação foi
iniciada e nenhuma outra macro-onda foi começada.
