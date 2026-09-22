# FIB-T HML — Prontidão de implantação controlada das proteções da Task 10.1

**Macro-onda 10.2 · 2026-09-15 · somente leitura remota · nenhuma escrita executada**

> Este documento decide **se** e **como** aplicar em HML as três migrations da
> Task 10.1. Ele **não** é autorização e **não** registra nenhuma operação
> remota: nesta macro-onda não houve `commit`, `push`, PR, merge, deploy,
> migration remota, convite, publicação ou coleta.
>
> Não contém token, hash de token, resposta, e-mail, JWT, credencial nem
> `project_ref` inteiro. Refs aparecem apenas na forma mascarada já usada no
> repositório.
>
> Contrato científico congelado e inalterado: `ITEMS=32`, `FACTORS=12/12/8`,
> `ITEM_5_FACTOR=3`, `K_MIN=5`, `MISSING_AS_ZERO=false`,
> `INDIVIDUAL_RESPONSE_EXPOSURE=false`. Todos os ensaios usaram exclusivamente
> dados sintéticos, em container Postgres local descartável.

---

## 1 · Mapa do ambiente-alvo

`HML` **não é um projeto de banco próprio**. É um *frontend* isolado
(Cloudflare Worker) apontado para o **mesmo projeto Supabase de staging**.
Reconstruído por evidência documental, não por lembrança:

| Camada | Identidade | Classificação | Evidência |
|---|---|---|---|
| Aplicação HML | Worker `vitalos-fibt-hml-isg`, subdomínio `*.workers.dev`, `preview_urls:false`, atrás de Cloudflare Access com JWT RS256 validado no próprio Worker | homologação | `wrangler.hml.jsonc`; `docs/fibt-hml/CLOUDFLARE_HML_DEPLOYMENT.md` |
| Backend HML | `SUPABASE_URL` do Worker = projeto **de staging**; `FIBT_HML_AUTHORIZED_STAGING_REF` é o único ref aceito por `assertHmlBackendBoundary()` | homologação | `docs/fibt-hml/CLOUDFLARE_HML_DEPLOYMENT.md` (tabela de variáveis); `src/lib/fibt-hml/hml-backend-boundary.server.ts` |
| Banco de staging | `xttj...xuab` — projeto `vitalos-staging`, us-east-2, plano **Free**, org própria do founder | homologação/staging (descartável, só dado sintético) | `docs/handoff/Q1.1_GATES_RESIDUAIS_2026-07-25.md` §GATE 3; `docs/fibt-isg/FIBT_DECISION_LEDGER.md` |
| Aplicação de produção | Lovable (sync automática com `main`; publicação é ação manual "Publish changes") | produção | `docs/AMBIENTES_E_DEPLOY.md` §"Git sync ≠ Publish changes" |
| Banco de produção | `shlm...akol` — provisionado e gerido pelo Lovable Cloud, fora do acesso do founder | produção | `docs/handoff/Q1.1_GATES_RESIDUAIS_2026-07-25.md`; `.env` versionado |

**Conclusão de identidade: HML e staging são o MESMO banco.** "Aplicar em HML"
significa, concretamente, **escrever no schema de `xttj...xuab`**. Não existe um
terceiro ambiente intermediário.

**Três armadilhas de identidade, confirmadas por leitura:**

1. `supabase/config.toml` declara `project_id = shlmzz…` — **o ref de
   PRODUÇÃO**. Qualquer `supabase link` ou `supabase db push` disparado deste
   repositório **sem `--project-ref` explícito** resolve produção, não staging.
2. O `.env` versionado declara a identidade de **produção**
   (`VITALOS_PRODUCTION_PROJECT_REF`, `SUPABASE_URL`, `VITE_SUPABASE_URL`).
   O ambiente nunca deve ser deduzido dele — é a advertência já registrada em
   `FIBT1_MANUAL_MIGRATION_A_RUNBOOK.md`.
3. A identidade de staging vive apenas em `.env.local` **não versionado**, que
   **não existe nesta worktree** (existe em 4 outras worktrees do projeto; não
   foram lidas nem alteradas).

---

## 2 · Baseline e SHA avaliado

| Item | Valor | Estado |
|---|---|---|
| Worktree | `C:\Users\FIB2030\claude code\vitalos-fibt-hml-readiness` | confirmado |
| `origin` | `minhafelicidadebr/vitalos-minha-felicidade-julho` | confirmado |
| Branch | `chore/fibt-hml-rollout-readiness` | confirmado |
| **SHA avaliado** | **`01de8361b7c6fe9697943ba257d903de31ed9da4`** | fixado |
| Relação com `main` | após `git fetch origin main`: `origin/main...HEAD = 0 0` — **idênticos**, nenhum commit posterior ao merge de referência | confirmado |
| Commit da implementação | `7cb77a6e0beee75f85b0ca0155040aef55f14494` — ancestral de HEAD (`merge-base --is-ancestor` = 0) | confirmado |
| Conteúdo do merge #48 | 19 arquivos, +3033/−16 — exatamente os mesmos de `7cb77a6`; merge sem conteúdo adicional | confirmado |
| `git status` | limpo na entrada da macro-onda | confirmado |

O merge de referência **é** o HEAD desta worktree. Não houve avanço silencioso
da `main` a reconciliar.

> Efeito colateral registrado, não descartado: rodar `bun run build:ci` (para
> incluir o artefato na varredura de segredo) fez o plugin do TanStack Router
> reescrever `src/routeTree.gen.ts` com terminadores LF. `git diff` do arquivo é
> **vazio** — zero diferença de conteúdo; `git status` o marca apenas por EOL.
> Não foi revertido porque `checkout`/`reset`/`clean`/`stash` estão fora da
> autorização desta onda.

### Automações com efeito externo — inventário

| Mecanismo | Verificado | Resultado |
|---|---|---|
| Hooks de git | `core.hooksPath` vazio; diretório de hooks do repo comum sem arquivo não-`.sample` | **nenhum** |
| Scripts de instalação | `package.json` sem `postinstall`/`preinstall`/`prepare` | **nenhum** |
| Workflows | apenas `.github/workflows/gate.yml` | **nenhum deploy**; ambiente inerte por construção (`VITALOS_DB_TARGET=test`, URLs sob `.invalid`, contrato recusa `ci` com qualquer alvo ≠ `test`) |
| Deploy automático real | sync bidirecional Lovable ↔ GitHub `main` | **existe**, mas sincroniza o **editor**; alcançar o site publicado exige "Publish changes" manual (`docs/AMBIENTES_E_DEPLOY.md`) |
| Deploy do Worker HML | `bunx wrangler deploy --config wrangler.hml.jsonc` | **manual**; `wrangler` **não está no PATH** desta máquina |
| Preflight de ambiente | `scripts/environment-preflight.ts`, sem I/O de rede | ativo e fail-closed: sem `.env.local`, `dev`/`preview`/`build:hml:staging` **falham** por falta de `VITALOS_DB_TARGET` e de `VITALOS_STAGING_PROJECT_REF` |

Nenhum caminho automático deste repositório alcança HML, staging ou produção.
O único vetor automático é a sync do editor Lovable a partir de `main` — e esta
macro-onda não empurrou nada para `main`.

---

## 3 · Matriz de evidências

Legenda: `PASS` = comprovado nesta onda · `FAIL` = contradito por evidência ·
`UNKNOWN` = não verificado · `N/A` = não aplicável, justificado.

### 3.1 Repositório, automações e gates

| # | Verificação | Estado | Evidência |
|---|---|---|---|
| A1 | SHA avaliado = merge de referência, sem commits posteriores | **PASS** | `git fetch` + `rev-list --left-right --count` = `0 0` |
| A2 | Commit da implementação é ancestral do SHA avaliado | **PASS** | `merge-base --is-ancestor` exit 0 |
| A3 | Nenhum hook, postinstall ou workflow com efeito externo | **PASS** | inventário §2 |
| A4 | Aplicação não se conecta a ambiente real por omissão | **PASS** | `.env.local` ausente ⇒ preflight recusa; contrato de 5 combinações fechadas |
| A5 | Integridade do manifesto de migrations | **PASS** | `bun run manifest` → 59 arquivos, rollup `9d52b09b921f…`, zero drift |
| A6 | `bun run gate` no estado candidato | **PASS** | 3.747 testes / 295 arquivos, 0 falhas, 10.740 `expect()`; paridade de schema OK; `tsc --noEmit` limpo |
| A7 | Varredura de segredo **incluindo o artefato** | **PASS** | 6 configs · 632 fontes · 278 arquivos de artefato · 0 ocorrências (build `ci` inerte, `.invalid`) |

### 3.2 Identidade dos ambientes

| # | Verificação | Estado | Evidência |
|---|---|---|---|
| B1 | HML e staging são o mesmo projeto Supabase | **PASS** (documental) | §1 |
| B2 | Produção identificada e distinta de staging | **PASS** (documental) | `shlm...akol` vs `xttj...xuab` |
| B3 | **Identidade efetiva do destino, confirmada contra o projeto vivo** | **UNKNOWN** | nenhuma credencial `STAGING_SUPABASE_*` nem `SUPABASE_ACCESS_TOKEN` no ambiente; `supabase` CLI e `wrangler` ausentes do PATH; `~/.supabase` sem arquivo de access-token |
| B4 | Estado vivo do schema de HML/staging (funções, ACL, policies, tabelas) | **UNKNOWN** | consequência de B3 |
| B5 | Inventário vivo de respostas/coortes em HML/staging | **UNKNOWN** | consequência de B3 |
| B6 | Ledger remoto de migrations | **N/A** | `supabase_migrations` **não existe** em staging (`tem_historico_formal=false`) — schema aplicado pelo SQL Editor, que não registra histórico (`Q1.1_GATES_RESIDUAIS_2026-07-25.md`). O controle compensatório é o manifesto versionado + inventário read-only, não o ledger |
| B7 | Backup/retenção/PITR de HML/staging | **FAIL** (para "existe backup") | plano **Free** — *"Free Plan does not include project backups"*; aceitável ali porque o dado é sintético |

`UNKNOWN` **não** foi convertido em `PASS`. B3–B5 são a fronteira real desta
macro-onda e estão no pedido de autorização (§10).

### 3.3 Comportamento das três migrations (ensaio local, dados sintéticos)

| # | Prova | Estado | Onde |
|---|---|---|---|
| C1 | Replay da cadeia inteira desde banco vazio + 6 suítes adversariais | **PASS** | `bun run db:replay` → 23 passos, 23 ok, 0 falhas |
| C2 | Fronteira de escrita em `waves` (`authenticated`/`anon` sem DML direto, SELECT org-scoped preservado, `waves_admin_write` ausente, cross-tenant bloqueado, gestão legítima por `service_role` preservada, nenhuma RPC alcançável pelo cliente muta `waves` — 48 funções inspecionadas) | **PASS** | `supabase/tests/05_waves_write_boundary.sql` |
| C3 | Supressão diferencial entre coortes, partição completa: `[10,4]·[10,8,4]·[10,8,4,3]·[5,4]·[100,4]·[100,100,4]` — nenhuma coorte oculta derivável; sem falso-positivo quando o residual ≥ k_min | **PASS** | `supabase/tests/03_fibt_contract_convergence.sql` |
| C4 | Diferenciação temporal: primeiro release < k indisponível; = k permitido; +1..+4 **sem mudança observável**; +5 release atômico; chamadas repetidas nunca expõem estado ao vivo | **PASS** | `supabase/tests/06_cohort_temporal_release.sql` |
| C5 | Mutação de resposta (UPDATE in-place, DELETE+INSERT parcial) não produz delta < k_min — marca d'água **por conjunto** | **PASS** | suíte 06 |
| C6 | Limiar **por item**: item com 2 contribuintes suprimido, com 6 liberado; `MISSING_AS_ZERO` permanece `false` | **PASS** | suíte 06 |
| C7 | Composição entre snapshots e coortes (coorte antes/depois + outra coorte + total ao vivo + contagem de coorte ao vivo; ordem indiferente) — subtração devolve no máximo **contagem operacional**, nunca média ou soma de grupo < k_min | **PASS** | suíte 06 |
| C8 | Isolamento por organização e por papel: `anon` negado; tabela de persistência negada a papel de cliente (leitura **e** escrita); RH_ADMIN e membro sem bypass; cross-tenant bloqueado; `service_role` puro recebe `not_authorized` explícito | **PASS** | suíte 06 |
| C9 | Bootstrap **sem publicação** (baseline registrado; n=10 não exposto contra observação histórica n=9) | **PASS** | suíte 06 (simulado) + §3.4 C13 (execução real da migration) |
| C10 | Concorrência **real**: duas sessões `psql` independentes disputando o limiar | **PASS** | `bun run proof:concurrency` → 10 passos, 10 ok: mesmo snapshot nas duas sessões, 1 linha persistida, `published_at` único, nenhum valor parcial, índice único recusa a duplicata |
| C11 | Nenhuma resposta individual sai para papel de cliente; `K_MIN=5`; agregado suprimido abaixo de k | **PASS** | suíte 03 |
| C12 | Superfície `SECURITY DEFINER` auditada após as migrations (sem `PUBLIC`, `search_path` fixo, owner único, `M6A_UNKNOWN_FUNCTIONS=0`) | **PASS** | suítes 02 e 04 |

### 3.4 Ensaio de ATUALIZAÇÃO a partir do estado anterior (o que faltava)

Reconstruído localmente: cadeia de produção **sem** as três migrations (54
arquivos) → dados sintéticos (segmentos A=9, B=6, C=3, D=2 respostas, 32 itens
cada) → aplicação das três migrations → verificação.

| # | Medição | Resultado |
|---|---|---|
| C13 | **Bootstrap REAL** executado sobre banco **não vazio** | `2 baseline(s) NÃO PUBLICADO(S) registrado(s) a partir de 20 resposta(s)`; `cohort_capsules` = 2 linhas, ambas com `item_means` e `published_response_count` NULL, marca d'água com 9 ids no maior segmento — **PASS** |
| C14 | Estado ANTES: segmento A (n=9) | `visible=true, count=9, item_means={"1":2.0000,…}` — **a média ao vivo era exposta**; a vulnerabilidade temporal existia de fato |
| C15 | Estado DEPOIS: segmento A (n=9) | `visible=false, count=NULL, label=NULL, suppression_reason=awaiting_batched_release` — **PASS** |
| C16 | Estado DEPOIS: segmento C (n=3) | `visible=false, label="<5", suppression_reason=privacy_threshold` — **PASS** |
| C17 | +4 contribuintes novos | nada observável muda (segue `awaiting_batched_release`) — **PASS** |
| C18 | 5º contribuinte novo | publica snapshot atômico, `count=14` com médias novas — **PASS** |
| C19 | ACL de `waves` depois | `INSERT/UPDATE/DELETE = false/false/false`, `SELECT = true`, policy `waves_admin_write` ausente — **PASS** |
| C20 | As 6 suítes adversariais **sobre o estado atualizado** (não só sobre banco limpo) | 6/6 **PASS** |
| C21 | Duração medida (Postgres 17 local, dataset sintético pequeno) | `220000` = 243 ms · `221000` = 237 ms · `222000` = 395 ms |
| C22 | Reaplicação de `220000` e `221000` | **idempotente** (passa) |
| C23 | Reaplicação de `222000` **depois de existir qualquer publicação** | **RECUSA fail-closed**: `FALHA: o bootstrap publicou agregado (item_means não nulo)` — ver defeito D4 |

C21 é **medição** num dataset pequeno, não estimativa para o alvo. A estimativa
para HML/staging está em §5.

### 3.5 Harness do repositório

| # | Verificação | Estado | Evidência |
|---|---|---|---|
| C24 | `bun run db:replay` (modo `clean`) | **PASS** | 23/23 |
| C25 | `bun run db:replay:preprod` (modo de estado real) | **FAIL** | 27 passos, 24 ok, **3 falhas**: suíte 03 (`FAILED: supressão diferencial`), 05 (`policy waves_admin_write voltou a existir`) e 06 (`relation "public.cohort_capsules" does not exist`) — ver defeito D3 |

---

## 4 · Migrations realmente pendentes

Hashes canônicos = SHA-256 do conteúdo **normalizado em LF**, exatamente como
`supabase/migrations.manifest.json` os registra (o arquivo em disco está em
CRLF nesta worktree; o hash do arquivo bruto **não** bate com o manifesto — use
sempre a coluna abaixo).

| Ordem | Arquivo | SHA-256 (manifesto, LF) | git blob | bytes (LF) |
|---|---|---|---|---|
| 57 | `20260909220000_lock_down_waves_direct_writes.sql` | `82a516ef58bff60e71af1ec2460610e5ff094759d8b5c3bddcdfb741488cd1ac` | `fd87693ab3b613e2aef2401c126f341ee690709c` | 3 184 |
| 58 | `20260909221000_cohort_differential_suppression.sql` | `c31388a69da0130a4cf634fab2c56be7264090dac29dcbe7c7ac87f296f1d384` | `27866355828df135728754da54d2b389c5354733` | 10 207 |
| 59 | `20260909222000_cohort_batched_release_temporal_privacy.sql` | `a8bc43af1aaa87f995f15f76b13ee64a5b54598fa2afce44043bb03f75c81928` | `9ded5db250d4eb94175134b3a09b6e8ddd2f6980` | 26 018 |

Manifesto íntegro: 59 migrations, rollup `9d52b09b921fdbcff6439d2ab27291c792452eaf583e9af1c540096315b4a92d`.

**Ordenação e dependências (obrigatórias, nesta ordem):**

- `221000` substitui o corpo de `aggregate_cohort_responses` por
  `CREATE OR REPLACE`; `222000` substitui **de novo**, incorporando a regra de
  `221000`. Aplicar `222000` sem `221000` não perde a supressão diferencial
  (ela está reescrita dentro de `222000`), mas **inverter a ordem regride** a
  função ao corpo de `221000` e reabre a diferenciação temporal.
- `222000` depende de `wave_cohorts(id, wave_id)` (FK composta, criada em
  `20260730150000`) e de `organizations`/`waves`. Nenhuma delas é criada aqui.
- `220000` é independente das outras duas; pode ir primeiro sem interação.
- **Nenhuma função nova é criada** em nenhuma das três — exigência da M6A
  (`20260901120000`), que aborta diante de função de `public` fora da sua
  allowlist. Respeitado via `CREATE OR REPLACE`. Confirmado: `M6A_UNKNOWN_FUNCTIONS=0`
  após a atualização (§3.3 C12).

**Transações e falha parcial:**

| Arquivo | `BEGIN/COMMIT` próprio | Falha parcial possível? |
|---|---|---|
| `220000` | **sim** | não — atômico |
| `221000` | **não** | **sim**, se executado statement-a-statement. Estado residual possível: função substituída com os `GRANT/REVOKE` anteriores (que são idênticos aos novos ⇒ efeito nulo). Mitigação: envolver em `BEGIN; … COMMIT;` na execução |
| `222000` | **sim** | não — atômico, inclusive o bootstrap e o postflight |

**Quantas estão realmente pendentes no alvo: UNKNOWN.** O repositório tem 59
migrations e as três acima são as novas *do repositório*. Afirmar que só essas
três faltam **no banco vivo** exigiria o inventário read-only de B4/B5, que
esta onda não pôde executar. Historicamente há divergência entre repositório e
estado vivo (drift de ACL de produção reproduzido em
`supabase/local/10_production_observed_drift.sql`; linhagem de staging e de
produção mutuamente exclusivas). **Ledger atualizado não prova ausência de
drift — e aqui não existe nem ledger.**

---

## 5 · Riscos e dependências

### 5.1 Defeitos encontrados (documentados, **nenhum corrigido nesta onda**)

**D1 · P1 — a proteção da Task 10.1 não governa a tela que o RH usa**

Existem **dois caminhos de leitura agregada, disjuntos**:

- `aggregate_cohort_responses` (o que as três migrations endurecem) é chamada
  em **um único lugar** — `src/lib/api/fibt-cohort.functions.ts:69` — e
  **nenhum componente React consome** o `FibtCohortReport` resultante.
- O painel real `/fibt-piloto` vai por
  `loadFibtManagerControlCenter` → `fibt-manager-control-center.server.ts` →
  `listResponses(waveId)` (cliente `service_role`, `select answers` **cruas**)
  → `buildManagerAnalytics` (`fibt-manager-control-center.ts:55+`), que aplica
  apenas `n >= FIBT_K_MIN` em TypeScript. Não toca `cohort_capsules`, não lê
  `suppression_reason`.

Consequências concretas, no HML:

1. `loadFibtManagerControlCenter` **está na allowlist** do boundary HML
   (`hml-deployment-boundary.server.ts`), portanto é alcançável.
2. Duas cargas sucessivas do painel enquanto um setor cruza n → n+1 devolvem
   duas leituras **ao vivo** — a diferenciação temporal que `222000` fecha no
   banco **continua aberta nessa superfície**.
3. "Comparação entre setores publicáveis" + `participationLabel` por setor
   (`<5` quando protegido) + "Participação protegida" da onda reconstroem por
   subtração exatamente o cenário `[10, 8, 4]` que `221000` recusa no banco.

Isto **não** viola `INDIVIDUAL_RESPONSE_EXPOSURE=false`: as respostas cruas
ficam no servidor e só agregados são serializados. Mas invalida a afirmação
"a diferenciação temporal está fechada em HML". Aplicar as migrations continua
sendo melhora estrita; **não é suficiente** para essa afirmação.

*Menor correção proposta (não implementada):* fazer
`loadFibtManagerControlCenterAsAdmin` obter a leitura de coorte e de onda pela
RPC `aggregate_cohort_responses` (com identidade organizacional real) em vez de
recalcular sobre `listResponses`, e derivar `publishableCohorts` e
`factorComparison` do que a RPC liberou. Exige onda própria: muda código
funcional e o contrato do snapshot do painel.

**D2 · P1 — microcopy falsa latente para os novos motivos de supressão**

`buildFibtCohortReport` (`src/lib/fibt/fibt-cohort-report.ts:100-111`) trata
`not_authorized` e colapsa **todo o resto** em
`status:"suprimido"` com o texto
*"Resultado oculto: menos de 5 respostas (<5). A quantidade exata não é
informada, para proteger quem respondeu."* — usando `countLabel ?? "<5"`.

Como `awaiting_batched_release`, `differential_inference_risk` e
`item_level_insufficient_contributors` devolvem `response_count_label = NULL`
(medido em §3.4 C15), uma coorte com 9 ou 40 respostas seria descrita como
tendo "menos de 5 respostas". As três strings **não existem em nenhum lugar de
`src/`**. Hoje o dano é **zero** porque nada renderiza esse objeto (D1) — é
defeito **latente**, e precisa ser corrigido **antes** de a tela ser ligada.

*Menor correção proposta:* ramos próprios para `awaiting_batched_release`
(publicação em lote pendente — não é falta de respostas) e para
`differential_inference_risk`/`item_level_insufficient_contributors`, e
remoção do fallback `?? "<5"` quando o motivo não é `privacy_threshold`.

**D3 · P2 — `db:replay:preprod` não cobre a Task 10.1 (harness vermelho no SHA avaliado)**

`scripts/db-replay-proof.ts` define `PACOTE_G1_V2` como lista **fechada de 6
arquivos** e valida `pacoteG1.length === 6`. As três migrations de 2026-09-09
não entraram nem no baseline (`antes`, cortado em `G1_BOUNDARY = 20260806210000`)
nem no pacote. Mas `rodarProvas()` executa **todas** as suítes por glob — então
05 e 06 rodam contra um banco que não tem `cohort_capsules` nem a ACL fechada.
Resultado medido: 3 falhas (§3.5 C25).

Além disso, o baseline `preprod` reproduz o estado observado de **produção**
(drift de ACL + ausência das 14 funções futuras), **não** o de HML/staging.
Mesmo corrigida a lista, o modo não ensaiaria o alvo desta onda.

*Menor correção proposta:* um pacote/marco explícito para a Task 10.1 (lista
fechada com as 3, no mesmo padrão do G1-v2) e um baseline dedicado ao estado de
HML/staging. Enquanto isso, o ensaio de atualização de §3.4 é o substituto
executável.

**D4 · P2 — `222000` recusa reaplicação depois de qualquer publicação**

O bloco de bootstrap termina com uma invariante **global**:
`IF EXISTS (SELECT 1 FROM public.cohort_capsules WHERE item_means IS NOT NULL)
THEN RAISE EXCEPTION`. Depois de um release legítimo, reexecutar o arquivo
aborta (medido em §3.4 C23), embora o `INSERT` do bootstrap seja guardado por
`NOT EXISTS` e semeie 0 linhas. Não é falha de segurança — é fail-closed
excessivo. Impacto operacional: se a janela for retomada por engano depois de
ter concluído **e** de já haver publicação, o operador vê um `FALHA:` alarmante
que na verdade indica "já aplicada".

*Menor correção proposta:* escopar a invariante às linhas semeadas nesta
execução (ex.: verificar apenas as `ROW_COUNT` inseridas), preservando o
propósito original.

**D5 · P2 — tipos gerados desalinhados com a RPC**

`src/integrations/supabase/types.ts:926-938` declara `response_count: number`,
`response_count_label: string`, `item_means: Json` e `suppression_reason: string`
como **não-nulos**, e não contém `cohort_capsules`. A RPC devolve NULL nesses
campos em todos os ramos de supressão (comportamento anterior à 10.1, agora
mais frequente). Regeneração de tipos pertence a outra onda.

**D6 · P2 — `config.toml` aponta para produção**

Ver §1. Risco de ferramenta, não de código.

**D7 · P3 — os três arquivos não são ASCII puro**

41 / 355 / 2 846 bytes não-ASCII (comentários e mensagens de `RAISE`/`COMMENT`).
Divergem da convenção de transporte dos runbooks FIBT-1 ("arquivo é ASCII puro
justamente para sobreviver ao transporte", após um incidente real de travessão
substituindo `--`). Nenhum identificador executável é afetado, e cada arquivo
tem postflight próprio que aborta se a lógica chegar corrompida — mas a
mitigação segue sendo copiar **do arquivo**, nunca de chat ou documento
formatado.

### 5.2 Riscos operacionais

| Risco | Severidade | Mitigação |
|---|---|---|
| Aplicar em produção por engano (`config.toml`, `.env` versionado) | **alta** | ref explícito confirmado no painel + query de confirmação antes de qualquer execução (§6) |
| Estado vivo divergente do repositório (drift), sem ledger para comparar | média | preflight read-only obrigatório (§6 passo 2); as próprias migrations abortam por precondition |
| Lock em `public.waves` durante `220000` | baixa | `REVOKE`/`DROP POLICY`/`GRANT` tomam `ACCESS EXCLUSIVE` por milissegundos; **estimativa** para HML/staging (3 ondas legadas seladas, poucas dezenas de respostas): < 1 s. Exigir `lock_timeout` curto |
| `222000` varre `wave_responses` no bootstrap | baixa | seq scan + `GROUP BY` sobre dataset pequeno; **medição** local 395 ms com 20 respostas; **estimativa** HML < 2 s |
| Chamada concorrente de `aggregate_cohort_responses` durante `221000`/`222000` | baixa | `CREATE OR REPLACE` serializa contra chamadas em curso; nenhuma UI consome a RPC hoje (D1) — blast radius efetivo próximo de zero |
| Sem backup em HML/staging (plano Free) | **aceita** | dado é 100 % sintético e reconstruível pelos fixtures do repositório |
| Nenhum script de rollback para as três | média | ver §7 — a contenção é fail-closed, não rollback |

### 5.3 Compatibilidade app × schema

| Combinação | Estado | Evidência |
|---|---|---|
| **app antigo + schema novo** | **PASS** | toda escrita em `waves` no código usa `adminClient()` (`service_role`): `db-adapter.ts:104`, `wave-admin.server.ts:203`. A única leitura por sessão de cliente (`db-adapter.ts:221`) é `SELECT`, preservado. Contrato de retorno da RPC inalterado (8 colunas, mesmos tipos/nomes) |
| **app novo + schema antigo** | **PASS** | é o estado de HML hoje; nada em `src/` referencia `cohort_capsules` (0 ocorrências) nem as novas strings de supressão. O piloto é fechado por `VITE_FIBT_PILOT_ENABLED` |
| **app novo + schema novo** | **PASS** | as 6 suítes adversariais verdes sobre o estado atualizado (§3.4 C20) + gate completo verde (§3.1 A6/A7) |
| Fluxo do participante em HML | **inalterado** | `resolveSectorToken`, `submitSectorLinkResponse`, `checkAndAggregateByToken` não chamam `aggregate_cohort_responses`; `submit_sector_response` e `wave_capsules` não são tocados pelas três migrations |

**Consequência para a ordem:** as três migrations são compatíveis com o
artefato já implantado. Não há acoplamento que force "código antes" ou "código
depois".

---

## 6 · Plano exato de implantação (a executar **somente** com autorização de §10)

Método: **SQL Editor do painel do projeto de staging**, arquivo inteiro, uma
única vez — o mesmo procedimento dos runbooks FIBT-1, e o único historicamente
usado nesse projeto (não há CLI/Docker apontado para ele). Se em vez disso for
usado o Supabase CLI, é **obrigatório** `--project-ref <ref-de-staging>`
explícito; **nunca** `--linked`, porque `config.toml` resolve produção.

**Passo 1 — confirmar o alvo (bloqueante)**

Ref na URL do painel **deve** ser `xttj...xuab`; **nunca** `shlm...akol`.
Dentro do SQL Editor do projeto aberto:

```sql
select current_database(),
       (select count(*) from public.organizations) as organizacoes;
```

Se aparecer qualquer nome de organização real, **parar**.

**Passo 2 — preflight somente leitura (bloqueante, guardar a saída)**

```sql
select
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='cohort_capsules')      as ja_tem_cohort_capsules,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='waves'
       and policyname='waves_admin_write')                             as policy_waves_admin_write,
  has_table_privilege('authenticated','public.waves','INSERT')          as auth_insert_waves,
  has_table_privilege('authenticated','public.waves','SELECT')          as auth_select_waves,
  (select count(*) from public.waves)                                   as ondas,
  (select count(*) from public.wave_responses)                          as respostas,
  (select count(*) from public.wave_cohorts)                            as coortes,
  (pg_get_functiondef(to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)'))
     ~* 'v_hidden_segments')                                            as tem_supressao_diferencial,
  (pg_get_functiondef(to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)'))
     ~* 'cohort_capsules')                                              as tem_release_em_lote;
```

Estado esperado **antes** da janela: `ja_tem_cohort_capsules=0`,
`policy_waves_admin_write=1`, `auth_insert_waves=true`, `auth_select_waves=true`,
`tem_supressao_diferencial=false`, `tem_release_em_lote=false`.

- Qualquer `true`/`1` já presente em `tem_release_em_lote` ou
  `ja_tem_cohort_capsules` ⇒ **parcialmente aplicada**: parar e reavaliar.
- Registrar `ondas`, `respostas`, `coortes` — são a base do postflight.
- Só **contagens e metadados de catálogo**. Nenhuma consulta a conteúdo de
  resposta individual.

**Passo 3 — janela**

`SET lock_timeout = '5s';` na sessão. Nenhuma outra mudança de schema em
paralelo. Confirmar que ninguém está em coleta ativa no HML.

**Passo 4 — aplicar, na ordem, uma vez cada, arquivo inteiro**

| # | Arquivo | Observação |
|---|---|---|
| 1 | `20260909220000_lock_down_waves_direct_writes.sql` | já traz `BEGIN/COMMIT`; ao final imprime `P0-2 fechado: …` |
| 2 | `20260909221000_cohort_differential_suppression.sql` | **envolver manualmente em `BEGIN; … COMMIT;`** (o arquivo não gerencia transação); imprime `PROVEN: … partição completa …` |
| 3 | `20260909222000_cohort_batched_release_temporal_privacy.sql` | já traz `BEGIN/COMMIT`; imprime `Bootstrap de cohort_capsules: N baseline(s) NAO PUBLICADO(S) …` e `PROVEN: … libera somente snapshot publicado …` |

Não executar em pedaços: os blocos `DO $$ … $$` precisam chegar completos.
Copiar do arquivo, não de mensagem formatada (D7). Se o passo 1 ou 2 falhar,
não seguir. Se um arquivo abortar, **não** tentar de novo sem reler a mensagem:
todas as abortagens dessas migrations são preconditions/postflights
deliberados.

**Passo 5 — postflight (§8) antes de declarar concluído.**

**Passo 6 — deploy do artefato: NÃO NECESSÁRIO nesta janela.**
Compatibilidade app × schema é `PASS` nas três combinações (§5.3). Um novo
`wrangler deploy` do Worker HML é decisão separada e **não** faz parte deste
plano.

**Retomabilidade:** `220000` e `221000` são idempotentes (medido). `222000` é
atômico; se abortar, nada foi aplicado e pode ser reexecutado. Se já houve
publicação de coorte, reexecutar `222000` **aborta por D4** — isso significa
"já aplicada", não "falhou".

---

## 7 · Plano de recuperação e contenção

**Premissa registrada:** reverter `222000` reabriria a diferenciação temporal e
reverter `221000` reabriria a inferência por subtração. Isso **não é
recuperação aceitável**. A postura é **contenção fail-closed + correção
progressiva**.

**Contenção (ordem de preferência, todas fora do banco):**

1. `FIBT_HML_DEPLOYMENT_ENABLED` no Worker ≠ `"true"` ⇒ o boundary bloqueia
   **todas** as rotas (nunca cai para o modo comum em silêncio). É o corte mais
   rápido e mais amplo.
2. Remover `VITE_FIBT_HML_ENABLED` das `vars` do Worker ⇒ `HML_NOT_ENABLED`.
3. Revogar os links setoriais sintéticos
   (`scripts/fibt-hml/revoke-synthetic-homologation-batch.ts`) ⇒ para a coleta
   sem tocar schema.
4. Esvaziar a allowlist do Cloudflare Access ⇒ ninguém alcança o Worker.

`VITE_FIBT_PILOT_ENABLED` **não** é alavanca de contenção: é lido por
`import.meta.env` em tempo de build, exige rebuild.

**Recuperação de dados:** o plano Free de `xttj...xuab` **não inclui backup**
(§3.2 B7). Não existe restauração testada nem por testar para esse projeto —
apenas **reconstrução sintética documentada**, via
`scripts/fibt-hml/ensure-sector-smoke-cohorts.ts` e
`scripts/fibt-hml/create-synthetic-homologation-links.ts`. Isso é aceitável
**exclusivamente** porque o dado é sintético; deixaria de ser aceitável no
instante em que houvesse resposta real. **Distinção explícita:** o que foi
ensaiado nesta onda é *reconstrução do schema desde banco vazio em container
local* (`bun run db:replay`, PASS) — **não** é restauração de backup do
projeto de staging, que não existe.

**Se `220000` quebrar um caminho de escrita legítimo:** nenhum foi encontrado
no código (§5.3), e a suíte 05 prova que a gestão de ondas por `service_role`
continua funcionando. Se ainda assim ocorrer, o reparo é **para frente**
(corrigir o caminho para passar por `createWaveAsAdmin`), não reconceder
`INSERT/UPDATE/DELETE` a `authenticated` — isso reabriria o bypass do gate de
plano/instrumento e exigiria autorização própria.

**Reversão limitada tecnicamente possível, e por que não é o plano:** `220000`
é reversível por `GRANT` + recriação da policy, mas reabre o bypass P0-2.
`221000`/`222000` só seriam "revertidas" reescrevendo a função — reabrindo o
vazamento. `cohort_capsules` pode ser dropada, mas a função passaria a
referenciar tabela inexistente e falharia em runtime (fail-closed, porém como
erro, não como proteção). Nenhuma dessas rotas está autorizada.

---

## 8 · Smoke sintético e postflight

**Postflight de catálogo (somente leitura, imediatamente após a janela).**
Reexecutar a query do passo 2 e exigir:

| Campo | Esperado |
|---|---|
| `ja_tem_cohort_capsules` | `1` |
| `policy_waves_admin_write` | `0` |
| `auth_insert_waves` | `false` |
| `auth_select_waves` | `true` (a leitura org-scoped **precisa** continuar) |
| `tem_supressao_diferencial` | `true` |
| `tem_release_em_lote` | `true` |
| `ondas`, `respostas`, `coortes` | **idênticos** ao passo 2 — as migrations não criam nem apagam resposta |

Mais:

```sql
select count(*)                                              as capsulas,
       count(*) filter (where item_means is not null)         as publicadas,
       count(*) filter (where published_response_count is not null) as com_contagem
  from public.cohort_capsules;
```

Exigir `publicadas = 0` **e** `com_contagem = 0`. Qualquer valor > 0 significa
que o bootstrap publicou agregado — o próprio arquivo aborta nesse caso, então
essa linha é conferência de segunda camada.

```sql
select relrowsecurity                                        as rls_on,
       (select count(*) from pg_policies
          where schemaname='public' and tablename='cohort_capsules') as policies,
       has_table_privilege('anon','public.cohort_capsules','SELECT')  as anon_le,
       has_table_privilege('authenticated','public.cohort_capsules','SELECT') as auth_le
  from pg_class where oid = 'public.cohort_capsules'::regclass;
```

Exigir `rls_on = true`, `policies = 0`, `anon_le = false`, `auth_le = false`.

**Atestação do deployment:** `/api/fibt-hml/attestation` deve continuar
`status:"READY"`. Qualquer `BLOCKED` interrompe a validação.

**Smoke sintético em HML (opcional e sujeito a autorização própria — NÃO faz
parte da janela de migration):** uma submissão sintética por link setorial já
existente, seguida de recarga do painel. Cuidado registrado: por D1, o painel
mostrará leitura ao vivo e **não** exercitará o release em lote; a única forma
de exercitar a proteção no alvo é chamar a RPC diretamente com JWT de membro
sintético. Nenhum convite ou registro novo deve ser criado.

**O que o postflight NÃO faz:** não consulta conteúdo de resposta individual,
não invoca RPC que publique snapshot só para "testar leitura", não usa
`--linked`, não imprime ref inteiro nem credencial.

---

## 9 · Checkpoint para continuidade

```
MACRO_ONDA=10.2
SHA_AVALIADO=01de8361b7c6fe9697943ba257d903de31ed9da4
BRANCH=chore/fibt-hml-rollout-readiness
WORKTREE=vitalos-fibt-hml-readiness

REPO_TRUTH=PASS
AUTOMACOES_EFEITO_EXTERNO=NENHUMA_ALEM_DA_SYNC_LOVABLE
GATE_COMPLETO=PASS (3747/0 · parity OK · tsc limpo · secret-scan com artefato OK)
MANIFESTO=PASS (59 migrations · rollup 9d52b09b921f…)

REPLAY_CLEAN=PASS (23/23 · 6 suites)
REPLAY_PREPROD=FAIL (D3 — pacote fechado não inclui a 10.1)
ENSAIO_ATUALIZACAO=PASS (bootstrap real sobre banco não vazio · 6/6 suites)
CONCORRENCIA_REAL=PASS (10/10 · 2 sessões psql)

AMBIENTE_HML=xttj...xuab (mesmo banco do staging)
IDENTIDADE_EFETIVA_DO_DESTINO=UNKNOWN
SCHEMA_VIVO_DO_DESTINO=UNKNOWN
MIGRATIONS_PENDENTES_NO_ALVO=UNKNOWN
LEDGER_REMOTO=NOT_APPLICABLE (supabase_migrations ausente em staging)
BACKUP_HML=AUSENTE (plano Free) · RESTAURACAO_TESTADA=NAO

DEFEITOS_ABERTOS=D1(P1) D2(P1) D3(P2) D4(P2) D5(P2) D6(P2) D7(P3)
PROTECAO_TEMPORAL_FECHADA_NO_BANCO=PASS
PROTECAO_TEMPORAL_FECHADA_NO_PRODUTO=FAIL (D1)

ESCRITAS_REMOTAS=NENHUMA
COMMIT_PUSH_PR_MERGE=NENHUM
DEPLOY=NENHUM

NEXT_SAFE_ACTION=OBTER_AUTORIZACAO_E_IDENTIDADE_DE_STAGING_PARA_PREFLIGHT_READ_ONLY
```

Artefatos de evidência local (gitignored, fora do controle de versão):
`.replay-clean.log`, `.replay-preprod.log`, `.upgrade-rehearsal.log`,
`.concurrency.log`, `.gate.log`. O harness do ensaio de atualização vive **fora
do repositório** (`%TEMP%`), para não alterar o inventário de scripts
versionados.

---

## 10 · Pedido único de autorização

### 10.1 Bloqueio que precede qualquer escrita

**Duas entradas `UNKNOWN` impedem, por si, a execução:** a identidade efetiva do
destino (B3) e o estado vivo do seu schema (B4/B5). Nenhuma credencial de
staging e nenhum CLI autorizado estão disponíveis nesta sessão, e falha de
acesso não autoriza contornar controle. Portanto **não** apliquei nem tentei
aplicar nada, e o pedido abaixo é condicionado a essas duas passarem a `PASS`
por ação humana.

### 10.2 O que peço autorização para fazer

| Campo | Valor |
|---|---|
| **Project ref** | `xttj...xuab` (staging = HML). **Nunca** `shlm...akol` |
| **Ambiente** | HML/staging — dado exclusivamente sintético |
| **SHA** | `01de8361b7c6fe9697943ba257d903de31ed9da4` |
| **Migrations** | `20260909220000` (`82a516ef58bf…`) → `20260909221000` (`c31388a69da0…`) → `20260909222000` (`a8bc43af1aaa…`), nesta ordem |
| **Operações** | `REVOKE`/`GRANT` em `public.waves`; `DROP POLICY waves_admin_write`; `CREATE OR REPLACE FUNCTION aggregate_cohort_responses` (2×); `CREATE TABLE public.cohort_capsules` + 3 índices + FK + RLS sem policy; `INSERT` de baseline **não publicado** em `cohort_capsules`; blocos de verificação |
| **Dados envolvidos** | nenhuma resposta é criada, alterada ou apagada. O bootstrap **lê** `wave_responses` e grava apenas `id`s anônimos como marca d'água. Nenhum conteúdo de resposta é consultado por operador |
| **Impacto esperado** | `authenticated` perde DML direto em `waves` (leitura preservada); a RPC deixa de devolver agregado ao vivo e passa a devolver `awaiting_batched_release` até haver ≥ 5 contribuintes novos. **Nenhuma tela muda**, porque nenhuma tela consome a RPC hoje (D1) |
| **Duração medida** | 243 / 237 / 395 ms em Postgres 17 local com dataset sintético; **estimativa** para o alvo < 2 s por arquivo |
| **Locks** | `ACCESS EXCLUSIVE` em `public.waves` (milissegundos); locks de FK em `organizations`/`waves`/`wave_cohorts` na criação de `cohort_capsules`; `lock_timeout = 5s` exigido |
| **Critérios de parada** | ref diferente do declarado · qualquer nome de organização real no passo 1 · `tem_release_em_lote` ou `ja_tem_cohort_capsules` já verdadeiro no preflight · qualquer `RAISE EXCEPTION` de precondition/postflight · `lock_timeout` estourado · contagem de `ondas`/`respostas`/`coortes` divergente entre pré e pós · `publicadas > 0` em `cohort_capsules` · `/api/fibt-hml/attestation` ≠ `READY` |
| **Recuperação** | contenção fail-closed pelas alavancas do Worker (§7). **Sem backup e sem restauração testada** no projeto de staging; recuperação de dados = reconstrução sintética pelos fixtures. Reversão de schema **não** está autorizada e não é recuperação aceitável |

### 10.3 Pré-requisitos que só o operador humano pode satisfazer

1. Confirmar, no painel do Supabase, que o ref do projeto de staging é
   `xttj...xuab` e que ele é o mesmo declarado em
   `FIBT_HML_AUTHORIZED_STAGING_REF` no Worker HML.
2. Disponibilizar `STAGING_SUPABASE_URL` / `STAGING_SUPABASE_PUBLISHABLE_KEY` /
   `STAGING_SUPABASE_SECRET_KEY` em `.env.local` desta worktree **ou** executar
   pessoalmente as queries de preflight do §6 passo 2 e me passar a saída, sem
   credencial.
3. Confirmar que ninguém está em coleta ativa no HML durante a janela.

### 10.4 O que este pedido explicitamente **não** cobre

Deploy ou novo `wrangler deploy` do Worker · qualquer operação em produção
(`shlm...akol`) · geração de convites ou links (`--commit`) · coleta real ·
`commit`, `push`, PR ou merge · correção dos defeitos D1–D7 · entrega do painel
ao RH.

### 10.5 Recomendação

**Autorizar a aplicação das três migrations em HML/staging**, condicionada a
§10.3. A justificativa é assimétrica e não é conforto de gate: no estado atual
do banco de HML, medi que o agregado de uma coorte com n=9 é devolvido **ao
vivo** (§3.4 C14) — a diferenciação temporal é uma exposição real e presente.
As três migrations a fecham no banco com prova adversarial e de concorrência,
com blast radius próximo de zero (nenhuma UI consome a RPC), atomicidade, e
sem tocar uma única resposta.

**E, separadamente, tratar D1 e D2 como bloqueadores de operação** — não de
implantação. Enquanto o painel `/fibt-piloto` recalcular sobre respostas cruas,
não é defensável afirmar ao RH que a proteção temporal e a supressão diferencial
estão fechadas na experiência, nem entregar a "Comparação entre setores" como
se ela respeitasse o mesmo limiar que o banco. Isso exige onda própria, com
autorização própria, porque muda código funcional.
