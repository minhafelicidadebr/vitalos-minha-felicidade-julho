# FIB-T — HANDOFF CANÔNICO ENTRE CONTAS CLAUDE CODE

```
PROJECT=VitalOS / FIB-T
HANDOFF_DATE=2026-08-07
HANDOFF_REASON=Claude weekly credits nearing limit
REPOSITORY=https://github.com/minhafelicidadebr/vitalos-minha-felicidade-julho.git
WORKTREE=C:\Users\FIB2030\claude code\vitalos-fibt-hml-v3
BRANCH=chore/fibt-prod-migration-b-fixture-harness
HEAD=10b5fefb53b75e6d5b2281c52b9d16c44dd0a1f8
WORKTREE_STATUS=CLEAN except the 4 files this handoff introduces (see §11)
LAST_KNOWN_GOOD_TEST_BASELINE=3401 pass / 0 fail (full `bun test src`, before this session's guard-only edits) + 105 pass / 0 fail (targeted, after)
TSC_STATUS=exit 0
BUILD_STATUS=not run this session (no functional/UI code changed — only migrations, tests, docs)
```

Este documento é a fonte de verdade para retomar o trabalho **sem
reauditar o histórico**. Leia-o por completo antes de tocar em qualquer
arquivo do FIB-T.

---

## 1. Como usar este handoff

1. Leia só este arquivo.
2. Execute o `HANDOFF_INTEGRITY_GATE` (§14 / `scripts/fibt-handoff-integrity-gate.ts`).
3. Se `PASS` → `TRUST_HANDOFF=true`, não reaudite nada listado em §13, continue do `NEXT_ACTION` (§16).
4. Se `FAIL` → investigue **somente** o item que divergiu. Não reinicie a auditoria do projeto inteiro.

A fronteira entre contas Claude **não é sinal de drift**. O sinal de drift
é hash divergente, teste vermelho, ou arquivo crítico ausente/modificado.

---

## 2. Verdade metodológica congelada — NÃO REABRIR SEM NOVA EVIDÊNCIA

`METHODOLOGY_FROZEN=true`

- Instrumento FIB-T (Furtado, 2020): **32 itens**.
- **3 fatores**, divisores **12 / 12 / 8**.
- **Item 5 (`q5`) pertence ao Fator 3** (`satisfacao_empresa`).
- **9 domínios.**
- Escala de resposta: **0–4**.
- **Nunca** tratar item faltante como zero (`FibtIncompleteResponseError`).
- **Nunca** criar índice global, banda interpretativa ou claim não suportado pelo manifesto.
- O **engine canônico** (`src/engine/fibt/fibt-engine.ts` + manifesto
  `src/domain/instruments/fibt/fibt-instrument.v1.json`) é a **única** fonte
  de cálculo de Fator/Domínio. Nenhuma fórmula concorrente em SQL — as
  colunas `factor_scores`/`domain_means` de `aggregate_cohort_responses`
  ficam deliberadamente `NULL` por esse motivo, documentado na própria
  migration `20260730155000_cohort_aggregate_privacy_hardening.sql`.
- **k_min = 5.** Abaixo do limiar: `visible=false`, `response_count=NULL`,
  `response_count_label='<5'`, `item_means=NULL`, `factor_scores=NULL`,
  `domain_means=NULL`, `suppression_reason='privacy_threshold'`.
- **Nenhuma resposta individual** é exposta por RPC nenhuma, a papel nenhum
  (nem `service_role` puro sem `auth.uid()`).

Prova empírica desta noite (staging real, madrugada 2026-08-06/07): 10
submissões sintéticas via fluxo canônico, engine validado contra os
`item_means` reais devolvidos pela RPC — diferença **0** (tolerância 1e-9)
nos fatores e domínios contra cálculo local independente.

---

## 3. Estado produtivo confirmado — Pacotes 0/1/2/3/2A

Todos executados **com sucesso** em produção (`shlm...akol`, Lovable
Cloud), com prova read-only pós-execução em cada um. Detalhe completo em
`FIBT_D2B_EXECUTION_LEDGER.md` (privado, fora do repo — ver §8).

```
PACOTE 0 = PASS — 3 ondas COPSOQ legadas seladas (status='sealed',
           seal_outcome='insufficient_data'), 30 convites preservados,
           0 excluído.

PACOTE 1 = PASS — REVOKE SELECT ON public.wave_responses FROM
           authenticated, anon. service_role preservado. Confirmado por
           has_table_privilege pós-execução.

PACOTE 2 = PASS — wave_cohorts criada; waves.instrument_version,
           wave_invites.cohort_id/expires_at, wave_responses.cohort_id/
           instrument/instrument_version criados; submit_wave_response
           (nova versão) não grava invite_token.

PACOTE 3 = PASS — aggregate_cohort_responses com contrato privacy-hardened
           de 8 colunas; count_cohort_participation separada, restrita a
           RH_ADMIN/DIRETOR da org dona.

PACOTE 2A = PASS — os 30 convites legados: expires_at preenchido em todos,
            used_at continua NULL nos 30, 0 respostas, 3 ondas sealed.
            Hash do conjunto de tokens por onda conferido antes/depois
            (inalterado).
```

### O que AINDA NÃO foi aplicado

```
3A + PRODUCTION CONTRACT = NÃO APLICADO COM SUCESSO EM PRODUÇÃO.
```

Duas tentativas produtivas do bundle abortaram **fail-closed dentro da
transação** (ver §6) — o `ROLLBACK` automático preservou o estado anterior
em ambas. **Não presuma que `invite_token` foi removida de produção.**
**Não presuma que a nova `submit_sector_response` persistiu.**

Estado produtivo esperado hoje: `wave_responses.invite_token` **ainda
existe**. `production_contract_closed=false`.

---

## 4. Causa raiz das duas tentativas abortadas

**Tentativa 1** — o pós-check da 3A comparava
`pg_get_function_identity_arguments()` contra a string literal
`'text, jsonb'`. O catálogo devolve os NOMES junto dos tipos
(`p_token_hash text, p_answers jsonb`), então uma assinatura **correta**
foi reprovada. Comparação textual frágil, não defeito da função.

**Tentativa 2** — corrigida para `proargtypes::OID[] = ARRAY[...]`, e
**ainda assim reprovou tipos corretos**. `pg_proc.proargtypes` é um
`oidvector`, indexado a partir de **zero**; convertido para `oid[]`, o
array resultante herda **lower bound 0**, enquanto um `ARRAY[...]` literal
tem lower bound **1**. A igualdade de arrays no PostgreSQL considera
dimensões — dois arrays com os mesmos OIDs na mesma ordem, mas lower
bounds diferentes, nunca são iguais.

Causa reproduzida **empiricamente** contra PostgreSQL 17 real (container
Docker efêmero, função descartável `probe_sector` com a mesma assinatura,
banco destruído ao final — nada produtivo tocado):

```
REAL_POSTGRES_CATALOG_TEST=PASS
pronargs=2
arg0_type=text
arg1_type=jsonb
guard_ANTIGO (proargtypes::oid[] = ARRAY[...]) => false  (com tipos CORRETOS)
guard_NOVO   (proargtypes[0]/[1] indexado direto) => true
```

**Guard correto, em vigor no arquivo atual:**

```sql
p.proargtypes[0] = 'text'::regtype::OID
AND
p.proargtypes[1] = 'jsonb'::regtype::OID
```

Nesta mesma correção, dois outros guards da 3A que usavam a mesma classe
de comparação textual frágil (retorno via `pg_get_function_result()`
contra string; `search_path` via igualdade exata contra
`'search_path=public'`) foram endurecidos preventivamente para
comparação estrutural via catálogo — não por falha observada, mas porque
já haviam causado dois falsos bloqueios reais no mesmo arquivo. Ver
`P2-32` em §12.

**Regra permanente: nunca mais comparar representação textual formatada
de catálogo PostgreSQL.** Use OIDs, `pronargs`, `proargnames` indexado, ou
`unnest(...) WITH ORDINALITY` sobre `proallargtypes`/`proargmodes` — nunca
strings que dependem de como o PostgreSQL escolhe formatar.

---

## 5. Migration 3A — estado atual

```
FILE=supabase/migrations/20260806205000_rewrite_submit_sector_response_without_invite_link.sql
SHA256=0e561ce1f7221fa4cbf4b696d585a9ace84d47e127b8403bb187598f19e2a805
FUNCTION_BODY_CHANGED=false (desde a criação original desta migration — só os guards do pós-check mudaram)
COHORT_SCOPE_OK=true
```

`submit_sector_response(text, jsonb)` preserva, sem alteração:

- assinatura `(p_token_hash TEXT, p_answers JSONB)`;
- retorno `TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)`;
- `SECURITY DEFINER`, `search_path = public`;
- ACL (`anon, service_role` com `EXECUTE`; capturada e comparada
  antes/depois via `set_config`/`current_setting` locais à transação);
- owner;
- os quatro motivos originais: `invalid_token`, `link_revoked`,
  `link_expired`, `wave_not_open` (**deliberadamente diferentes** dos
  motivos `'revoked'`/`'expired'` que a Migration B de staging usa —
  `sector-link.server.ts` repassa `outcome?.reason` sem traduzir, então
  copiar o corpo de staging teria mudado silenciosamente o contrato
  externo).

A única mudança funcional real (feita na criação desta migration, não
nesta sessão): o `INSERT` deixa de nomear `invite_token` e passa a
gravar `cohort_id`/`instrument`/`instrument_version`. A coorte é
resolvida com escopo estrito por onda:

```sql
WHERE c.wave_id = v_link.wave_id AND c.key = v_link.sector_label
```

(sem isso, duas ondas com a mesma `key` cruzariam coorte entre ondas —
possivelmente entre organizações. Reforço independente no schema:
`UNIQUE (wave_id, key)` em `wave_cohorts` e FK composta
`wave_cohorts_wave_org_fk` amarrando a coorte à organização da onda.)

---

## 6. Production CONTRACT — estado atual

```
FILE=supabase/migrations/20260806210000_drop_response_invite_link_contract_production.sql
SHA256=c06ef41b875238e3d9b9dd54dd49d18ff1f1fe2353820ec1605351e9212b11c3
CONTRACT_BYTE_IDENTICAL=true (idêntico em todas as revisões desde sua criação — só a 3A foi corrigida)
```

- `ALTER TABLE public.wave_responses DROP COLUMN invite_token;` — **sem
  `CASCADE`**, **sem `IF EXISTS`** (a precondition já provou que a coluna
  existe).
- Migration **específica de produção**, distinta da Migration B de
  staging (`20260730160000_drop_response_invite_link_contract.sql`, que
  permanece **intocada** — suas preconditions codificam o inventário do
  piloto sintético de staging: `AFETADAS_ESPERADAS=16`, duas orgs
  `a0000000-...`. Nenhum dos dois vale em produção. **Não substituir.**)
- Preconditions fail-closed: tabela/coluna existem; `wave_responses = 0`;
  Migration A completa; hardening completo (contrato de 8 colunas
  conferido); `submit_wave_response` não grava a coluna; **nenhuma
  função de `public` referencia a coluna** (é a precondition que a 3A
  satisfaz); nenhuma dependência estrutural em `pg_depend`; 3 ondas
  seladas; 30 convites expirados; 0 usados.
- Pós-check: coluna removida; nenhuma FK residual para `wave_invites`;
  `wave_responses = 0`; colunas da Migration A sobrevivem;
  `submit_wave_response`/`count_cohort_participation` presentes; contrato
  de agregação de 8 colunas preservado; 30 convites preservados e
  expirados; 3 ondas seladas.

---

## 7. Bundle operacional atual

```
FILE=C:\Users\FIB2030\Documents\VitalOS-private-hml-deploy\ops\FIBT_D2B_3A_CONTRACT_PRODUCTION_BUNDLE.sql
SHA256=9c740dfca54f253de30fd21ef61d917b72dc45236cc22f17773d0339e36f035a
```

**Fora do repositório** (diretório privado, ACL restrita), não entra no
manifesto de migrations. Conteúdo: `BEGIN;` + bytes íntegros da 3A + bytes
íntegros do CONTRACT + `COMMIT;` — nenhum conteúdo interno editado.

Provas locais sobre o bundle:

```
BEGIN_COUNT=1
COMMIT_COUNT=1
DROP_COLUMN_COUNT=1
CASCADE_COUNT=0
DELETE_COUNT=0
TRUNCATE_COUNT=0
DATA_UPDATE_COUNT=0
3A_BEFORE_CONTRACT=true
```

**IMPORTANTE: este bundle, na versão pós-correção do oidvector, AINDA NÃO
FOI EXECUTADO em produção.** As duas execuções produtivas anteriores
usaram versões da 3A com hash diferente (guards ainda com defeito). Não
assuma sucesso produtivo até o postflight (§6 do bootstrap) confirmar.

---

## 8. Artefatos privados relevantes (fora do repositório)

Não copiados aqui — apenas apontados. Todos em
`C:\Users\FIB2030\Documents\VitalOS-private-hml-deploy\` (ACL restrita ao
usuário local):

| Arquivo | Conteúdo |
|---|---|
| `FIBT_D2B_EXECUTION_LEDGER.md` | ledger completo dos Pacotes 0–2A em produção, com as provas read-only de cada um |
| `FIBT_PRODUCTION_RECONCILIATION_D2.md` | reconciliação read-only de produção vs. staging (pré-Pacotes) |
| `FIBT_D2_PRODUCTION_MIGRATION_RUNBOOK.md` | runbook original de migrations produtivas |
| `FIBT_D2B_PACOTE_0.md` | pacote 0 (SQL + provas) |
| `ops/FIBT_D2B_3A_CONTRACT_PRODUCTION_BUNDLE.sql` | bundle desta seção |
| `VitalOS-private-hml\FIBT_PRODUCTION_LEGACY_WAVES_SNAPSHOT.json` | snapshot das 3 ondas COPSOQ legadas (wave_id, org_id, hashes de convites) usado como allowlist nos Pacotes 0/2A |

Estes arquivos **não precisam ser relidos** a menos que um hash divergir
ou uma nova operação produtiva seja necessária.

---

## 9. Test baseline

```
Alvo (fibt-sector-response-contract + fibt-production-contract + migration-manifest.test.ts): 105 pass / 0 fail
  - fibt-sector-response-contract.test.ts: 44 testes
  - fibt-production-contract.test.ts: 50 testes
  - migration-manifest.test.ts: 11 testes
TSC=exit 0

Última regressão AMPLA (bun test src), executada ANTES da correção final
dos guards da 3A (guards não afetam corpo funcional de nenhum outro
arquivo): 3401 pass / 0 fail, 273 arquivos.

Não repetida após a correção dos guards porque nenhum código funcional
mudou — só o bloco de pós-check da migration 3A e seus testes
correspondentes.

MANIFEST:
  count=48 migrations
  rollupSha256=2a20d63b70feb378fd992894e9e116bfdd5d98871afb4bd5f0cb9497caca5f8a
```

---

## 10. Arquivos críticos

| path | purpose | status |
|---|---|---|
| `supabase/migrations/20260806205000_rewrite_submit_sector_response_without_invite_link.sql` | Pacote 3A — remove dependência de runtime da coluna legada | criado nesta sessão, guards corrigidos 2×, pronto |
| `supabase/migrations/20260806210000_drop_response_invite_link_contract_production.sql` | CONTRACT produtivo — `DROP COLUMN invite_token` | criado nesta sessão, byte-identical desde a criação |
| `src/lib/fibt/fibt-sector-response-contract.test.ts` | 44 testes de contrato da 3A | criado/atualizado nesta sessão |
| `src/lib/fibt/fibt-production-contract.test.ts` | 50 testes de contrato do CONTRACT produtivo | criado nesta sessão |
| `supabase/migrations.manifest.json` | manifesto de integridade das 48 migrations | regravado nesta sessão |
| `supabase/migrations/20260730150000_generic_anonymous_submissions_expand.sql` | Migration A (staging) — cria `wave_cohorts`, colunas de coorte/instrumento | histórica, já aplicada em produção via Pacote 2 |
| `supabase/migrations/20260730155000_cohort_aggregate_privacy_hardening.sql` | Privacy hardening (staging) — contrato de 8 colunas | histórica, já aplicada em produção via Pacote 3 |
| `supabase/migrations/20260730160000_drop_response_invite_link_contract.sql` | Migration B de STAGING — **NUNCA usar em produção** | intocada, imutável por design |
| `docs/fibt-prod/MIGRATION_B_PRODUCTION_SPEC.md` | especificação original (revisão 6) que motivou o CONTRACT produtivo | referência histórica, superada operacionalmente pelo CONTRACT já criado |
| `docs/fibt-prod/MIGRATION_B_EXECUTION_CHECKLIST.md` | checklist original | idem |
| `docs/operations/PRODUCTION_SCHEMA_AND_BACKUP_AUDIT_2026-07-26.md` | auditoria de schema/backup de produção pré-FIBT-D2 | histórica; confirma backend = Lovable Cloud |
| `docs/fibt-isg/FIBT_DECISION_LEDGER.md` | ledger de decisões FIBT-1 (staging) | histórico |
| `scripts/fibt-prod/migration-b-preconditions.ts` + `.test.ts` | modelo TypeScript reexecutável dos predicados da spec de Migration B (63 testes) — prova de lógica, não de execução SQL | criado em rodada anterior, estável |
| `src/domain/instruments/fibt/fibt-instrument.v1.json` | manifesto canônico do instrumento (32 itens, 3 fatores, 9 domínios) | congelado, fonte de verdade |
| `src/engine/fibt/fibt-engine.ts` | engine de scoring canônico | congelado, fonte de verdade |
| `src/lib/api/fibt-cohort.functions.ts` | leitura do agregado real via `aggregate_cohort_responses` | estável, sem fallback mock |
| `src/lib/fibt/fibt-cohort-report.ts` | tipo do relatório de coorte | estável |
| `src/lib/fibt/fibt-pilot-flag.ts` | feature flag `VITE_FIBT_PILOT_ENABLED`, fail-closed | estável |
| `src/integrations/supabase/types.ts` | tipos gerados — `wave_responses.Row` já sem `invite_token` | gerado, coerente com o schema pós-CONTRACT |
| `src/routes/convite.$token.tsx` | rota pública de resposta (fluxo `submit_wave_response`) | estável |
| `src/routes/aceitar-convite.$token.tsx`, `fibt-piloto.tsx`, `fibt.tsx` | rotas candidatas do fluxo/piloto FIB-T | **não lidas em profundidade ainda** — ver §16 |

Não existe um "Risk Register" dedicado no repositório: os P2 vivem
registrados nos ledgers privados (§8) e neste handoff (§12). Se a Macro 2
do super prompt de macro-ondas exigir um `docs/fibt/FIBT_RISK_REGISTER.md`
formal, ele ainda não existe — é trabalho novo, não uma releitura.

---

## 11. Arquivos modificados/criados NESTA sessão (working tree)

```
FILES_CREATED:
  supabase/migrations/20260806205000_rewrite_submit_sector_response_without_invite_link.sql
  supabase/migrations/20260806210000_drop_response_invite_link_contract_production.sql
  src/lib/fibt/fibt-production-contract.test.ts
  src/lib/fibt/fibt-sector-response-contract.test.ts
  docs/fibt/FIBT_CLAUDE_ACCOUNT_HANDOFF_2026-08-07.md          (este arquivo)
  docs/fibt/FIBT_NEW_CLAUDE_ACCOUNT_BOOTSTRAP.md                (irmão deste)
  scripts/fibt-handoff-integrity-gate.ts

FILES_MODIFIED:
  supabase/migrations.manifest.json   (regravado por `bun run manifest:write`)

Nada commitado. Nada em push. Nenhum acesso remoto a produção ou ao Lovable
nesta sessão.
```

Uma migration anterior a esta sessão também está no worktree, de uma
rodada prévia — **não relacionada ao 3A/CONTRACT**, não confundir:

```
supabase/migrations/... (Migration B de staging, 20260730160000) — intocada, já commitada em rodada anterior a este branch
```

---

## 12. Riscos abertos

`P0=0` `P1=0`

| id | uma linha |
|---|---|
| P2-11 | (resolvido pelo Pacote 2A) revogação explícita dos 30 convites legados por `expires_at` — feita |
| P2-16 | drift herdado: default privileges amplos em `public` — tabelas novas nascem com GRANT aberto; não bloqueia FIB-T |
| P2-17 | `anon`/`authenticated` mantêm outros privilégios de tabela em produção, fora do escopo FIB-T; registrado, não corrigido |
| P2-18 | `sandbox_exec` é papel privilegiado com `bypass_rls=true`; herdado, fora do escopo FIB-T |
| P2-19 | (resolvido) janela de contrato de 4 colunas entre Pacote 2 e 3 — ambos já aplicados em produção, janela fechada |
| P2-22 | `SECURITY DEFINER` com `search_path=public`; risco fechado hoje (`anon`/`authenticated`/`sandbox_exec` sem `CREATE` em `public`); reabrir só se isso mudar |
| P2-27 | o CONTRACT produtivo não é idempotente entre ambientes — rodado no staging aborta na precondition 1.1 (deliberado) |
| P2-29 | a 3A aborta se `submit_sector_response` não existir — deliberado, ela substitui, não cria |
| P2-30 | `set_config`/`current_setting` da captura de ACL exigem que 3A e CONTRACT rodem na **mesma transação** — é exatamente o desenho do bundle |
| P2-31 | (resolvido) guard de assinatura textual causou falso bloqueio #1 — corrigido para estrutural |
| P2-32 | (resolvido) guard de tipos via array derivado de oidvector causou falso bloqueio #2; retorno e search_path também eram frágeis pela mesma classe — corrigidos preventivamente na mesma correção |
| P2-33 | (novo, não bloqueante) `src/routes/aceitar-convite.$token.tsx`, `fibt-piloto.tsx`, `fibt.tsx` ainda não foram lidos nesta linha de trabalho — necessário para a Macro 2 (Real Collection Readiness) do super prompt de macro-ondas |

```
P2_TOTAL=12
P2_RESOLVED=4        (P2-11, P2-19, P2-31, P2-32)
P2_OPEN_NON_BLOCKING=8   (P2-16, P2-17, P2-18, P2-22, P2-27, P2-29, P2-30, P2-33)
P2_OPEN_BLOCKING=0
```

Nenhum P2 acima é blocker automático do release. Nenhum P0/P1 aberto.

---

## 13. TRUSTED COMPLETED WORK — DO NOT REAUDIT BY DEFAULT

- FIBT-0 truth / metodologia do instrumento (§2) — congelada, fonte:
  `fibt-instrument.v1.json` + `fibt-engine.ts`.
- Pacotes 0, 1, 2, 3, 2A em produção — aplicados e provados (§3), com
  evidência completa em `FIBT_D2B_EXECUTION_LEDGER.md`.
- Piloto sintético end-to-end em staging (madrugada 2026-08-06/07): 10
  submissões, 18 adversariais fail-closed, k-anon Alfa/Beta provado,
  engine conferido contra o agregado real, revogação e restauração
  SEALED@100% concluídas. Evidência em `FIBT_72H_NIGHT_EXECUTION_LEDGER.md`
  (privado).
- Design de k-anonimato e separação de privacidade (§2, §6) — implementado
  e testado, não é decisão em aberto.
- Snapshot das ondas legadas COPSOQ e disponibilidade de backup produtivo
  (backup confirmado 6 Aug 2026 10:25:53 UTC, "Restore" disponível,
  verificado visualmente pelo proprietário) — não precisa reconfirmação
  a menos que uma nova operação destrutiva seja planejada.
- Histórico Cloudflare/HML (FIBT-HML-1 a 5D, V2/V3, Version Override) —
  não impacta o trabalho de produção do FIB-T em si; relevante só se a
  próxima tarefa envolver o Worker `vitalos-fibt-hml-isg`.
- Decisões já fechadas: nome/escopo do batch sintético, exceção de token
  bruto em staging, contrato dos 17 runtime vars do deployment HML.

**Regra de reabertura:** só reabrir algo desta lista se (a) um hash
divergir do registrado aqui, (b) um arquivo crítico estiver modificado
de forma inesperada, (c) um teste de continuidade falhar, (d) o estado
produtivo observado contradizer este handoff, ou (e) nova evidência
objetiva aparecer.

---

## 14. HANDOFF INTEGRITY GATE

Script: `scripts/fibt-handoff-integrity-gate.ts` (local, read-only, zero
acesso a produção). Executar com:

```bash
bun run scripts/fibt-handoff-integrity-gate.ts
```

Verifica: existência dos arquivos críticos · SHA-256 da 3A · SHA-256 do
CONTRACT · existência e SHA-256 do bundle privado (se o caminho estiver
acessível nesta máquina — se não, reporta `BUNDLE_CHECK=SKIPPED`, não
`FAIL`) · ausência de `CASCADE` no CONTRACT · ordem 3A-antes-do-CONTRACT
por nome de arquivo · zero referência nova a `wave_responses.invite_token`
fora dos arquivos já esperados (migrations históricas, docs, scripts de
staging) · Migration B de staging permanece distinta e com seus valores
fixos (`AFETADAS_ESPERADAS := 16`, `a0000000-...`) · integridade do
manifesto de migrations · roda os 105 testes-alvo.

Saída: `HANDOFF_INTEGRITY_GATE=PASS/FAIL`,
`REPOSITORY_MATCH`, `CRITICAL_HASHES_MATCH`, `MANIFEST_OK`,
`TARGETED_TESTS`, `TSC`.

---

## 15. Nenhum valor sensível neste documento

Nenhum token, secret, senha, valor de `.env`, credencial Cloudflare ou
chave Supabase/Lovable aparece neste arquivo. Refs de projeto, quando
citados, aparecem mascarados (`shlm...akol`, `xttj...xuab`) — nunca
completos.

---

## 16. NEXT ACTION

```
NEXT_ACTION=
Pedir ao proprietário que execute, no SQL Editor do Lovable Cloud
(produção shlm...akol), o bundle:

  C:\Users\FIB2030\Documents\VitalOS-private-hml-deploy\ops\FIBT_D2B_3A_CONTRACT_PRODUCTION_BUNDLE.sql
  (SHA-256: 9c740dfca54f253de30fd21ef61d917b72dc45236cc22f17773d0339e36f035a)

Depois da confirmação de execução, rodar UM ÚNICO postflight produtivo
compacto (já especificado na entrega FIBT-D2B anterior — consultar
FIBT_D2B_EXECUTION_LEDGER.md, seção "Postflight único e final") e
marcar production_contract_closed=true se PASS.
```

Enquanto essa ação humana estiver pendente, **não ficar parado**: o
super prompt de macro-ondas (se recebido pela próxima conta) autoriza
avançar em paralelo nas trilhas de Real Collection Readiness e Promotion
& Launch Experience — nenhuma delas depende deste bundle ter sido
executado.
