# Especificação — Migration B produtiva (FIBT-1 CONTRACT)

> **Status: ESPECIFICAÇÃO. Nada aqui é executável.**
> O rascunho de SQL vive em `MIGRATION_B_PRODUCTION_DRAFT.sql.disabled` —
> extensão deliberadamente inválida, fora de `supabase/migrations/`.
> Roteiro operacional: `MIGRATION_B_EXECUTION_CHECKLIST.md`.
>
> Promover a migration executável é **decisão humana separada** (§K).
>
> **Revisão 4** — incorpora as correções da revisão final adversarial: três P1
> (contrato de retorno estrutural · `pg_depend` por catálogo · triggers) e
> quatro P2 (inventário de policies · snapshot único · fingerprint de ACL ·
> limite declarado abaixo de *k*). Fixtures estáticas em §M.
>
> **Revisão 5** — decisão humana PROD-0.5H:
> `EXPECTED_WAVE_RESPONSES_POLICY_COUNT = 0`. Qualquer policy aborta, inclusive
> `response_submit`; policy deixou de ser dependência esperada; o `DROP POLICY`
> foi **removido** do draft.

## Por que um arquivo novo, e não a Migration B de staging

A Migration B canônica
(`supabase/migrations/20260730160000_drop_response_invite_link_contract.sql`,
blob `c0d35c06f359bb1d56c23b06f3e2821df9b45246`) **permanece imutável**. Suas
preconditions são específicas do dataset sintético de staging:

| Precondition de staging | Congelado | Em produção |
| --- | --- | --- |
| `AFETADAS_ESPERADAS` | `16` | **0** |
| `ORGS_SINTETICAS` | 2 UUIDs `a0000000-…` | não existem |
| Política de e-mail | aborta fora de `example.invalid`/`example.com` | e-mails reais |
| `DROP POLICY "response_submit"` | remove a policy do estado histórico | **não existe neste draft** — produção tem zero policies (§F) |

Não é defeito — é o fail-closed recusando rodar num banco para o qual a
autorização humana não foi dada.

## A. Finalidade

1. Remover `wave_responses.invite_token` — a coluna que materializa, no schema,
   o caminho resposta → convite → pessoa.
2. Remover a FK `wave_responses_invite_token_fkey`.
3. Preservar integralmente o contrato criado por A e H.
4. Executar **somente** depois de A e H comprovadamente aplicadas.

Privacidade por desenho é **não guardar** a ligação — não escondê-la.

## B. Contagens, invariantes e gates

### As cinco contagens — deliberadamente distintas

Total de respostas e total de vínculos legados **não são a mesma coisa**.

| Variável | Definição |
| --- | --- |
| `v_total_responses` | todas as linhas de `wave_responses` |
| `v_with_invite_token` | `invite_token IS NOT NULL` |
| `v_valid_invite_links` | token não nulo **com** convite correspondente |
| `v_orphan_invite_links` | token não nulo **sem** convite correspondente |
| `v_snapshot_rows` | linhas cujo vínculo se perde no `DROP` |

**Normativo:** `v_snapshot_rows = v_with_invite_token`. O valor é destruído
tanto para vínculo válido quanto para órfão.

### Um único `SELECT`, um único snapshot

As cinco acima — mais `v_duplicados`, `v_divergentes` e `v_org_invalida` —
são obtidas em **um só `SELECT … INTO`**, executado **depois** do
`ACCESS EXCLUSIVE`.

Antes eram statements separados. `wave_responses` está protegida pelo lock, mas
`wave_invites` e `waves` **não são bloqueadas** (deliberadamente — §E, inversão
de ordem e deadlock), e as contagens de válidos, órfãos, divergentes e
organização as consultam. Sob `READ COMMITTED`, cada statement abre seu próprio
snapshot: escrita concorrente naquelas duas tabelas poderia fazer as
invariantes **não fecharem por artefato de leitura**, abortando uma execução
correta. Um statement, um snapshot — o artefato desaparece.

**`REPEATABLE READ` não é adotado:** desnecessário, e mudaria a semântica de
isolamento do bloco inteiro para resolver algo que o snapshot único já resolve.

**Registrado sem eufemismo:** com as duas expressões avaliadas no mesmo
statement, a invariante `v_snapshot_rows = v_with_invite_token` passa a ser
**definicional**, não um detector de concorrência. As demais continuam
detectando incoerência real e continuam abortando.

### Invariantes cruzadas

```
v_valid_invite_links + v_orphan_invite_links = v_with_invite_token
v_snapshot_rows                              = v_with_invite_token
v_with_invite_token                         <= v_total_responses
v_orphan_invite_links                        = 0
tokens duplicados                            = 0
divergências resposta–convite–onda           = 0
inconsistências de organização (afetadas)    = 0
```

As três primeiras detectam **contagem incoerente**, não apenas alta —
divergência entre elas indica leitura inconsistente ou escrita concorrente, e
aborta por si só.

### Dois gates independentes

**Drift operacional — `EXPECTED_TOTAL_RESPONSES = 0`.** Se `≠ 0`: abortar,
**não presumir que as linhas são seguras**, refazer inventário, nova
autorização. Uma resposta com `invite_token NULL` não é perda de vínculo — mas
enquanto o baseline autorizado for "tabela vazia", qualquer linha é drift.

**Perda de vínculo legado — `EXPECTED_WITH_INVITE_TOKEN = 0`.** Se `≠ 0`:
abortar, snapshot privado, SHA-256, revisão controlada de todas as linhas
afetadas, nova autorização.

## C. Preconditions da Migration A — os nove componentes

Estado parcial **não é aceito**. Cada componente é verificado individualmente,
com tipo quando o tipo faz parte do contrato.

| # | Componente | Verificação |
| --- | --- | --- |
| 1 | `public.wave_cohorts` | tabela existe |
| 2 | `waves.instrument_version` | existe · `text` |
| 3 | `wave_invites.cohort_id` | existe · `uuid` |
| 4 | `wave_invites.expires_at` | existe · `timestamp with time zone` |
| 5 | `wave_responses.cohort_id` | existe · `uuid` |
| 6 | `wave_responses.instrument` | existe · `text` |
| 7 | `wave_responses.instrument_version` | existe · `text` |
| 8 | `waves_id_org_uk` | existe · `contype = 'u'` na tabela `waves` |
| 9 | `aggregate_cohort_responses` | `to_regprocedure('…(uuid,uuid)')` + contrato de retorno **estrutural** (§D) |

**Por que o #4 importa concretamente:** `submit_wave_response` (versão A) lê
`v_invite.expires_at`. Com A parcialmente aplicada, a função quebraria em
runtime — e a versão anterior deste rascunho não detectava.

Qualquer divergência → `RAISE EXCEPTION` **antes do primeiro DDL**.

## D. Preconditions do hardening H

Presença nominal **não basta** — o que importa é o contrato de retorno e o
gate interno.

### Por que a verificação anterior era insuficiente

A revisão 3 comparava `array_to_string(proargnames, ',')` contra oito
predicados `LIKE`. Isso conferia **nomes e nada mais**:

- **ordem trocada passava** — a concatenação contém as mesmas substrings;
- **tipo trocado passava** — `proargnames` não carrega tipo algum;
- **nome divergente passava** se contivesse o esperado como substring:
  `response_count_label_v2` satisfaz `'%response_count_label%'`.

### A verificação estrutural — dois ângulos sobre o mesmo contrato

**Contrato canônico**, fonte normativa
`20260730155000_cohort_aggregate_privacy_hardening.sql`, `RETURNS TABLE(…)`:

| # | Nome | Tipo |
| --- | --- | --- |
| 1 | `visible` | `boolean` |
| 2 | `response_count` | `integer` |
| 3 | `response_count_label` | `text` |
| 4 | `k_min` | `integer` |
| 5 | `item_means` | `jsonb` |
| 6 | `factor_scores` | `jsonb` |
| 7 | `domain_means` | `jsonb` |
| 8 | `suppression_reason` | `text` |

1. **Resolução pela assinatura exata de entrada** — `to_regprocedure`, nunca
   comparação textual de `pg_get_function_identity_arguments`.
2. **Ângulo estrutural (`pg_proc`)** — `proallargtypes` × `proargmodes` ×
   `proargnames` desdobrados com `WITH ORDINALITY`, filtrados a `argmode IN
   ('t','o')`, tipo resolvido por `format_type`, reagregados **na ordem do
   catálogo**. Comparação por igualdade estrita. Se a função não declarar
   `OUT`/`TABLE`, os arrays são `NULL`, o resultado é `NULL` e o
   `IS DISTINCT FROM` **aborta** — fail-closed, nunca passa por omissão.
3. **Ângulo canônico (`pg_get_function_result`)** — a forma que o próprio
   PostgreSQL declara. Comparada **normalizada** (minúsculas, espaços
   colapsados) contra `TABLE(<contrato>)`. Se 2 e 3 discordarem entre si, a
   leitura de catálogo está errada e a migration não prossegue.
4. `count_cohort_participation` — resolvida por `to_regprocedure` e com o
   próprio contrato conferido: `pg_get_function_result` = `integer`.
5. `prosecdef = true` e `search_path=public` fixo nas **duas** funções.
6. **Gate interno de papel/identidade no corpo** — `pg_get_functiondef` precisa
   conter `auth.uid()`, `RH_ADMIN` e `DIRETOR`.

**A string exata devolvida pelo PostgreSQL 17 é expectativa derivada da
definição canônica, não fato medido.** Deve ser observada, conferida contra
esta tabela e registrada na prova não produtiva **antes** da promoção (§K).

**Nenhuma confiança exclusiva na ACL.** A restrição de papel vive no *código*
da função; uma ACL permissiva não pode ser a única barreira. Esta migration
**não altera ACL** (§H).

### Limite declarado — o que a revisão estática *não* prova

**Prova:** assinatura de entrada · contrato de retorno (nome, tipo, ordem) ·
`SECURITY DEFINER` · `search_path` fixo · gate interno de papel.

**Não prova, sem execução:**

1. `visible = false` abaixo de *k*;
2. `response_count = NULL` abaixo de *k*;
3. `response_count_label = '<5'`;
4. supressão efetiva de `item_means`, `factor_scores` e `domain_means`;
5. `suppression_reason` correto.

Os cinco são **comportamento**, não estrutura — nenhum predicado de catálogo os
alcança. São item **obrigatório** da futura prova em PostgreSQL 17 **não
produtivo**. Essa prova **não é executada agora** e não faz parte desta
autorização.

## E. Ordem transacional, timeouts e locks

```
BEGIN
  → SET LOCAL lock_timeout / statement_timeout
  → pg_advisory_xact_lock(FIBT1_MIGRATION_B_PRODUCTION_LOCK)
  → LOCK TABLE wave_responses IN ACCESS EXCLUSIVE MODE
  → preconditions A (§C) · H (§D)
  → coluna → FK exata → INVENTÁRIO DE POLICIES (= 0) → dependências catalogais
    → triggers → as oito contagens em UM SELECT (§B) → invariantes → gates
  → CREATE OR REPLACE submit_sector_response   ← antes do DROP
  → DROP CONSTRAINT wave_responses_invite_token_fkey   ← sem IF EXISTS
  → DROP COLUMN invite_token                           ← sem IF EXISTS
  → pós-checks (§I)
COMMIT
```

### Timeouts — proposta humana, não parâmetro canônico

Busca no repositório: **nenhum valor canônico anterior existe**. Os valores são
propostos.

| Parâmetro | Proposto |
| --- | --- |
| `lock_timeout` | `5s` |
| `statement_timeout` | `2min` |

**Semântica — registrada explicitamente:**

- `statement_timeout` é aplicado **a cada statement**, não à duração total da
  transação. Uma transação com 20 statements de 1min cada dura 20min sem
  disparar um `statement_timeout` de 2min.
- `lock_timeout` **deve permanecer menor** que `statement_timeout`. Invertido,
  o statement morreria antes de o `lock_timeout` diagnosticar que o problema
  era espera por lock.
- Espera superior ao `lock_timeout` de 5s **exige investigação** — identificar
  a sessão/transação bloqueadora (`pg_locks`, `pg_stat_activity`) antes de
  qualquer nova tentativa.
- Timeout → **ROLLBACK e NO-GO**.
- **Não executar retry automático.**

### Locks

`pg_advisory_xact_lock(bigint)` é **transacional** — liberado automaticamente
no `COMMIT`/`ROLLBACK`, sem unlock manual (ao contrário de
`pg_advisory_lock`, de sessão, que vazaria o lock se a sessão terminasse mal).

- **Advisory antes** do `ACCESS EXCLUSIVE`; **`ACCESS EXCLUSIVE` antes** das
  contagens. Ordem **única e documentada**, nunca invertida.
- Chave `4200730160`, nome lógico **`FIBT1_MIGRATION_B_PRODUCTION_LOCK`**.
  Excede `int4`, resolve para a sobrecarga `bigint`. **Todos os operadores
  devem usar exatamente esta chave** — chaves diferentes não se serializam.
- Transações de escrita **já iniciadas** precisam terminar antes de o
  `ACCESS EXCLUSIVE` ser concedido (é o que `lock_timeout` limita).
- **Depois** da aquisição, novas escritas ficam bloqueadas até o `COMMIT`.

**`wave_invites` e `waves` não serão bloqueadas — deliberadamente.**
`submit_wave_response` bloqueia primeiro a linha do convite
(`… FROM wave_invites … FOR UPDATE`) e só depois insere em `wave_responses`.
Esta migration faz o inverso. Como aqui apenas **lemos** `wave_invites`
(leitura MVCC não bloqueia em row lock), não existe ciclo. Adicionar `LOCK` em
`wave_invites` **depois** de `wave_responses` criaria **inversão de ordem** e
risco real de deadlock. **Não adicionar lock nessas tabelas sem nova análise.**

**Suficiência:** o lock em `wave_responses` basta, porque `invite_token` reside
exclusivamente nessa tabela.

### Comparação preservada

| | Como funciona | Vantagem | Risco |
| --- | --- | --- | --- |
| **A. Só `ACCESS EXCLUSIVE`** | bloqueia leitura/escrita da tabela | fecha a janela de escrita | não serializa dois operadores: o segundo espera, com diagnóstico pior |
| **B. Advisory + `ACCESS EXCLUSIVE`** | advisory serializa cooperativamente; table lock bloqueia escrita | cobre os dois cenários | ligeiramente mais complexo |
| **C. Nenhum lock** | confia na janela curta | simples | recontagem fica obsoleta — inaceitável |

**Recomendação provisória: B — sujeita a decisão humana, não aprovada.**

**Contraindicação:** havendo coleta ativa, `ACCESS EXCLUSIVE` derruba a
submissão. **Adiar** para janela sem tráfego — nunca enfraquecer o lock.

## F. Fail-closed do DDL

`IF EXISTS` foi **removido** de `DROP CONSTRAINT` e `DROP COLUMN`. As
preconditions já provaram que ambos existem, sob `ACCESS EXCLUSIVE`. Manter
`IF EXISTS` transformaria um objeto obrigatório ausente — ou com nome
divergente — em **no-op silencioso**.

```sql
ALTER TABLE public.wave_responses DROP CONSTRAINT wave_responses_invite_token_fkey;
ALTER TABLE public.wave_responses DROP COLUMN invite_token;
```

**A FK é verificada por identidade completa**, não por "existe alguma FK entre
as duas tabelas": schema `public` · tabela `wave_responses` · nome
`wave_responses_invite_token_fkey` · `contype = 'f'` · coluna local
`invite_token` · tabela referenciada `wave_invites` · coluna referenciada
`token` · chave de coluna única.

### Policies — baseline zero, sem `DROP POLICY`

**Decisão humana PROD-0.5H.** `EXPECTED_WAVE_RESPONSES_POLICY_COUNT = 0`.

O inventário produtivo Q18 comprovou `public.wave_responses` com **RLS ativo** e
**zero policies**. RLS ativo sem policy é default-deny total: não há nada a
remover.

**Este draft não contém `DROP POLICY`.** A Migration B canônica de staging
tinha `DROP POLICY IF EXISTS "response_submit"` porque cobria um **estado
histórico diferente**, em que a policy existia. Manter aquele `DROP` aqui seria
carregar uma autorização latente para apagar uma policy que ninguém revisou.

**A precondition exige exatamente zero.** Qualquer policy aborta — incluindo
`response_submit`, qualquer outro nome, permissiva, restritiva, e qualquer
comando (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `ALL`).

Ao abortar: **antes do primeiro DDL** · listar **apenas metadados** (nome ·
comando · permissiva/restritiva · papéis · schema · tabela) · **não remover
nenhuma policy** · exigir **novo inventário e nova autorização humana**.
Nenhuma expressão de policy (`polqual`/`polwithcheck`) é impressa — expressão
pode conter literal de negócio.

**Reaparecimento é drift.** Uma policy que volte a existir não é "o estado
antigo de volta": é sinal de que algo criou uma policy depois do inventário.
Drift exige abortar e **rederivar o draft** — não contorná-lo. Uma policy de
**mesmo nome não é presumida equivalente** à histórica: nome não prova
expressão, comando, papéis nem intenção.

**`CASCADE` não é usado em lugar nenhum.** A precondition de dependências (§I)
já provou que não há dependente; `CASCADE` removeria objetos silenciosamente.

## G. Contrato transacional do Lovable

**Precondition humana obrigatória: `LOVABLE_BATCH_TRANSACTION_CONFIRMED = true`.**

Não é verificável pelo próprio SQL. Todo o desenho — locks, atomicidade do DDL,
`SET LOCAL` — depende de o bloco `BEGIN; … COMMIT;` ser executado como **uma
única transação**, sem autocommit entre statements. Staging funcionou, o que é
evidência, não prova.

Comprovar **em ambiente não produtivo**:

- `SET LOCAL` permanece válido até `COMMIT`/`ROLLBACK`;
- `ACCESS EXCLUSIVE` permanece adquirido durante rechecagens **e** DDL;
- erro em qualquer precondition desfaz o bloco **inteiro**;
- nenhuma alteração parcial permanece.

**Execução statement-a-statement com autocommit = NO-GO.** Sem a prova: não
promover, não confiar no lock, redesenhar o mecanismo de aplicação.

## H. ACLs — separação estrita e matriz completa

Esta migration **não contém e não pode conter `REVOKE` ou `GRANT`**. Não altera
`PUBLIC` · `anon` · `authenticated` · `service_role` · `sandbox_exec` ·
default privileges.

`sandbox_exec` é **papel gerenciado da plataforma** — nunca entra em migration
da aplicação.

**`CREATE OR REPLACE` serve apenas para atualizar o corpo das funções
dependentes do schema. A trilha ACL permanece separada.**

**Consequência registrada sem eufemismo:** `CREATE OR REPLACE` preserva a ACL
vigente. Como a Q19 constatou `PUBLIC EXECUTE` em produção,
`submit_sector_response` **permanecerá com `PUBLIC EXECUTE`** depois desta
migration. Deliberado — corrigido na trilha ACL, **obrigatório antes da
ativação da FIB-T**.

### Matriz de ACL — captura completa, read-only

A consulta (rascunho §6) captura, por função: `oid` · `proname` · assinatura ·
`proowner` · **`proacl` integral** · **ACL expandida por `aclexplode`, com
todos os grantees** · `prosecdef` · `proconfig` · `search_path` efetivo ·
`grantor` · `grantee` · `privilege_type` · `is_grantable`.

**Não é limitada a `PUBLIC`/`anon`/`authenticated`/`service_role`** — a
expansão de `proacl` revela qualquer grantee, inclusive papel que ninguém
listou.

Detecta as dez classes: papel adicionado · papel removido · privilégio
adicionado · privilégio removido · alteração de `PUBLIC` · alteração de
`sandbox_exec` · alteração de `SECURITY DEFINER` · alteração de owner ·
alteração de `search_path` · alteração de qualquer configuração da função.

**Qualquer diferença não prevista → NO-GO**, tratada na trilha ACL, nunca
dentro desta migration. As consultas continuam **somente leitura**.

### Fingerprint — a comparação precisa ser reproduzível

Comparar duas listagens "no olho" não é reproduzível: ordem de linha,
espaçamento e recorte de tela variam entre operadores. A captura passa a ter
duas partes (rascunho §6.1 e §6.2):

1. **linhas normalizadas**, com `ORDER BY` determinístico
   (`proname` → assinatura → grantee → privilégio → grantor);
2. **representação canônica** — uma linha `oid|nome|assinatura|owner|proacl|
   prosecdef|proconfig|search_path|grantor|grantee|privilege_type|is_grantable`
   por registro de ACL, agregada na mesma ordem;
3. **fingerprint** da representação: `sha256` **e** `md5`.

`sha256(bytea)` é função **núcleo** do PostgreSQL desde a 11 — **não exige
`pgcrypto`** neste servidor. Em servidor anterior à 11 a alternativa seria
`digest(…, 'sha256')` do `pgcrypto`, e aí sim a dependência existiria.

O `oid` entra no fingerprint **deliberadamente**: `CREATE OR REPLACE` preserva
o `oid`, então esta migration não o altera; um `DROP` + `CREATE` alteraria
ambos — exatamente o sinal desejado. Consequência: o fingerprint **não é
comparável entre bancos**, só antes × depois no mesmo banco.

**Comparação normativa:** `ACL_BEFORE_FINGERPRINT` (imediatamente antes do
`BEGIN`) × `ACL_AFTER_FINGERPRINT` (imediatamente após o `COMMIT`). Iguais →
seguir. Diferentes → **NO-GO**; diferenciar a representação canônica linha a
linha para achar o que mudou; **não corrigir dentro da Migration B** — trilha
ACL.

**Custódia:** salvar os dois resultados **fora do repositório** ou no registro
operacional aprovado. A saída traz apenas metadado de catálogo e nomes de
papel — **sem credencial e sem dado de negócio**.

## I. Dependências, referências residuais e pós-checks

### Dependências catalogais — a consulta corrigida

**O defeito da revisão 3.** A consulta fazia
`JOIN pg_class cl ON cl.oid = d.objid` **sem filtrar `d.classid`**, e não
filtrava `d.refclassid` do lado referenciado. Em `pg_depend`, `objid` só é
interpretável **junto com** `classid`: OIDs são únicos **dentro de cada
catálogo**, nunca globalmente. Duas consequências:

- **Falso negativo.** Views e materialized views dependem de coluna via
  **`pg_rewrite`** (`classid = pg_rewrite`, `objid` = OID da *regra*, não da
  relação). O join com `pg_class` nunca casava: **nenhuma view dependente era
  detectada**. Idem `CHECK` (`pg_constraint`), default (`pg_attrdef`) e função
  (`pg_proc`).
- **Falso positivo cruzado.** Um OID de `pg_rewrite` pode coincidir com o OID
  de um `pg_class` sem relação alguma, inventando um "dependente".

**A consulta corrigida.** Uma CTE `alvo` resolve `table_oid` e `attnum` reais;
uma CTE `dep` filtra a identidade completa do objeto referenciado:

```sql
d.refclassid  = 'pg_class'::regclass
AND d.refobjid    = alvo.table_oid
AND d.refobjsubid = alvo.col_attnum
```

E **cada ramo junta `objid` exclusivamente ao catálogo do seu próprio
`classid`**:

| `classid` | Catálogo unido | Objetos |
| --- | --- | --- |
| `pg_rewrite` | `pg_rewrite` → `pg_class` (`ev_class`) | views, matviews, regras |
| `pg_constraint` | `pg_constraint` | FK, CHECK e demais constraints |
| `pg_attrdef` | `pg_attrdef` | defaults de coluna |
| `pg_proc` | `pg_proc` | funções |
| `pg_trigger` | `pg_trigger` | triggers |
| `pg_policy` | `pg_policy` | policies |
| `pg_class` | `pg_class` | índices, índices de expressão, outras relações |
| **qualquer outro** | — | **dependência desconhecida → aborta** |

**Registrado por dependência:** `deptype` · `classid` · `objid` · `objsubid` ·
`refclassid` · `refobjid` · `refobjsubid` · schema · tipo do objeto · nome do
objeto. Dependência **interna** do catálogo é **classificada e exibida**, não
filtrada em silêncio por `deptype` — a revisão 3 descartava `deptype = 'i'`
sem registrar nada.

**Uma única dependência é deliberadamente esperada** (decisão PROD-0.5H):

| Classificação | Objetos |
| --- | --- |
| `EXPECTED_DEPENDENCY` | **somente** `wave_responses_invite_token_fkey`, com identidade completa: nome · `contype = 'f'` · tabela local · coluna local · tabela referenciada · coluna referenciada |
| `UNEXPECTED_DEPENDENCY` | **tudo o mais**, inclusive **qualquer policy** e inclusive `response_submit` |

Uma FK de **mesmo nome** apontando para outro lugar **bloqueia**.

**`pg_policy` não tem exceção por nome.** Toda dependência com
`classid = pg_policy` é bloqueadora. É coerente com §F: o baseline autorizado
é zero policies, logo este ramo só pode acionar em cenário de drift — e drift
tem que parar a migration.

Nenhuma outra é excluída, por nome parcial ou por tipo amplo. Qualquer
dependência não reconhecida → **NO-GO antes do primeiro DDL**, listando
**apenas metadados**, sem remover nada.

`DROP COLUMN` sem `CASCADE` também é proteção fail-closed — mas uma
precondition explícita produz **diagnóstico**, não um erro obscuro.

### Triggers — evidência, não presença

**O defeito da revisão 3.** O ramo de triggers listava **todos** os triggers
não internos de `wave_responses`, sem nenhum filtro por `invite_token`.
Qualquer trigger legítimo — um `updated_at`, uma auditoria — faria a migration
**abortar sempre**, sem relação alguma com a coluna removida. Falso positivo
permanente.

**A regra corrigida.** Um trigger só bloqueia com **evidência de relação com a
coluna**, em ordem de precedência:

1. **`pg_depend` com `classid = 'pg_trigger'::regclass`** referenciando o
   `attnum` de `invite_token` — fonte **primária** (é o caso de
   `UPDATE OF invite_token`);
2. **`pg_get_triggerdef(tg.oid)`** contendo referência real a `invite_token` —
   defesa **suplementar**, que **não substitui** `pg_depend`;
3. **`pg_get_functiondef(tg.tgfoid)`** — um trigger cuja definição não cita a
   coluna pode acessá-la via `NEW.invite_token` **dentro da função**. Registrado
   explicitamente: esse caso **exige inspeção da função dependente**, e é por
   isso que a função chamada também é inspecionada.

Nome de parâmetro não conta: `\minvite_token\M` não casa `p_invite_token`.
Triggers internos continuam ignorados **somente** quando
`tg.tgisinternal = true`.

**Não bloqueiam:** trigger de `updated_at` · trigger de auditoria sem
`invite_token` · trigger legítimo relacionado a outra coluna.

### Referência residual — o falso positivo corrigido

O predicado antigo era `prosrc ILIKE '%invite_token%' AND prosrc ILIKE
'%wave_responses%'` sem excluir as funções de submissão. **Falso positivo
garantido:**

> **Exemplo de falso positivo (corpo legítimo, não pode falhar):**
> `submit_wave_response` tem o parâmetro `p_invite_token TEXT` e faz
> `INSERT INTO public.wave_responses (wave_id, cohort_id, …)`. O corpo contém
> a substring `invite_token` (dentro de `p_invite_token`) **e** a substring
> `wave_responses` — mas **não** referencia a coluna removida. O predicado
> antigo abortaria em 100% das execuções, **depois** dos DDLs.

> **Exemplo de referência realmente proibida (deve falhar):**
> `INSERT INTO public.wave_responses (wave_id, invite_token, answers)` ·
> `UPDATE public.wave_responses SET invite_token = …` ·
> `SELECT invite_token FROM public.wave_responses` ·
> `wr.invite_token` quando `wr` é alias de `wave_responses` ·
> `RETURNING invite_token`.

**Nome de parâmetro nunca é referência a coluna.**

A verificação corrigida:

- **funções conhecidas** (`submit_wave_response`, `submit_sector_response`):
  **não são excluídas da revisão** — o corpo é inspecionado com
  `pg_get_functiondef` procurando padrões de referência **à coluna**
  (qualificada, `INSERT … (…invite_token…)`, `UPDATE … SET invite_token`,
  `SELECT invite_token … FROM wave_responses`, `RETURNING invite_token`);
- **demais funções**: busca defensiva por referência qualificada, excluindo
  nomes de parâmetro, sobre `pg_get_functiondef`.

**Regex não é prova absoluta.** SQL dinâmico (`EXECUTE format(…)`) pode
escapar — limitação residual registrada.

### Cinco camadas

1. catálogo (`pg_depend` por `classid`, FKs, policies, triggers);
2. corpos das funções (`pg_get_functiondef`);
3. assinaturas e contratos (`to_regprocedure`, `pg_get_function_result`,
   `pg_proc`);
4. fixtures estáticas documentais (§M) — modelo da lógica, não execução de SQL;
5. revisão humana do SQL final e diff estático dos corpos.

Nenhuma sozinha é suficiente.

### Os 21 pós-checks

**Dentro da transação, antes do `COMMIT`** (executáveis pelo banco):

1. `v_total_responses` observado e registrado · 2. `invite_token` ausente ·
3. FK exata ausente · 4. nenhuma FK residual → `wave_invites` ·
5. nenhuma dependência catalogada residual · 6. corpos sem referência real à
coluna · 7. `submit_wave_response` na assinatura exata ·
8. `submit_sector_response` na assinatura exata · 9. `wave_responses.cohort_id`
· 10. `wave_responses.instrument` · 11. `wave_responses.instrument_version` ·
12. `wave_invites.cohort_id` · 13. `wave_invites.expires_at` ·
14. `waves.instrument_version` · 15. `wave_cohorts` · 16. `waves_id_org_uk` ·
17. `aggregate_cohort_responses(uuid,uuid)` · 18. contrato de 8 colunas
**estrutural** (nome + tipo + ordem, via `pg_proc`) · 19. `pg_get_function_result`
idêntico ao contrato canônico · 20. `count_cohort_participation` presente e
retornando `integer` · 21. nenhuma alteração parcial.

Os pós-checks 18–20 usam **exatamente o mesmo predicado** da precondition §D.
Um pós-check mais fraco que a precondition não provaria preservação.

**Externos, após o `COMMIT`:** matriz de ACL comparada antes × depois · junção
`wave_responses ⋈ wave_invites` falha por coluna inexistente · fluxo de link
setorial funcionando.

**Humanos:** `project_ref` · `LOVABLE_BATCH_TRANSACTION_CONFIRMED` · captura
de ACL · decisão sobre lock e timeouts.

**Do pipeline:** gate (`bun run gate`) · manifesto · parity · typecheck.

Um checklist textual **nunca** é apresentado como garantia executada pelo banco.

## J. Corpo de `submit_sector_response` — reproduzido para revisão

Em documento **não executável**, para o draft ser auto-contido. Fonte
normativa: §2 da Migration B de staging.

**Copiar apenas o corpo. As duas últimas linhas daquele bloco (`REVOKE` +
`GRANT`) ficam de fora, por decisão de §H.**

```sql
CREATE OR REPLACE FUNCTION public.submit_sector_response(
  p_token_hash TEXT,
  p_answers    JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link      public.sector_links%ROWTYPE;
  v_wave      public.waves%ROWTYPE;
  v_cohort_id UUID;
  v_count     INTEGER;
BEGIN
  SELECT * INTO v_link FROM public.sector_links WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.status <> 'active' OR v_link.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'revoked'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE, 'expired'::TEXT, 0;
    RETURN;
  END IF;

  SELECT * INTO v_wave FROM public.waves WHERE id = v_link.wave_id;
  IF v_wave.id IS NULL OR v_wave.status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;

  -- Coorte do setor, quando declarada para esta onda. NULL e aceitavel: link
  -- compartilhado sem coorte registrada agrega no nivel da onda.
  SELECT c.id INTO v_cohort_id
    FROM public.wave_cohorts c
   WHERE c.wave_id = v_link.wave_id AND c.key = v_link.sector_label;

  -- Anonimo por schema: nenhuma referencia ao link, ao token ou ao hash.
  INSERT INTO public.wave_responses (wave_id, cohort_id, instrument, instrument_version, answers)
  VALUES (v_link.wave_id, v_cohort_id, v_wave.instrument, v_wave.instrument_version, p_answers);

  SELECT COUNT(*) INTO v_count FROM public.wave_responses WHERE wave_id = v_link.wave_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$$;
```

Muda em relação à versão em produção: `invite_token` deixa de ser nomeada no
`INSERT` (já gravava `NULL`) e a coorte passa a ser resolvida por
`wave_cohorts.key = sector_label`. Validação de token, status, revogação,
expiração e estado da onda: **preservados**. Multi-uso do link compartilhado:
preservado. ACL: **inalterada**.

**`submit_wave_response` não é recriada por esta migration** — já foi corrigida
pela Migration A. Recriá-la duplicaria responsabilidade e criaria uma segunda
fonte de verdade do corpo. Aqui apenas se verifica a assinatura e a ausência de
referência legada.

## K. Promoção a migration executável — decisão humana

1. Revisão humana desta especificação e do rascunho.
2. Inventário PROD-0 revalidado (contagens recontadas na hora).
3. `project_ref` de produção confirmado externamente.
4. Migrations A e H **aplicadas e verificadas** em produção.
5. **`LOVABLE_BATCH_TRANSACTION_CONFIRMED = true`** comprovado (§G).
6. Decisão explícita sobre lock e timeouts (§E) — recomendação é provisória.
7. **Prova em PostgreSQL 17 não produtivo**, obrigatoriamente cobrindo:
   as consultas catalogais de §I exercitadas contra objetos reais (view, CHECK,
   default, função, trigger, policy, índice) · a string literal de
   `pg_get_function_result` observada e conferida contra §D · os **cinco
   comportamentos abaixo de *k*** (§D) · o contrato transacional do Lovable
   (§G).
8. Autorização escrita para criar o arquivo em `supabase/migrations/`, seguida
   de PR, gate e autorização de aplicação separada.

**Proibido copiar apenas o trecho destrutivo.** Um trecho isolado não é uma
migration — é uma operação destrutiva sem guarda.

## L. Rollback

| # | Cenário | Reversibilidade |
| --- | --- | --- |
| 1 | Falha **antes do primeiro DDL** | `ROLLBACK` automático. Banco intocado. **Plena.** |
| 2 | Falha da **precondition da FK exata** | idem — nenhum DDL executado. **Plena.** |
| 3 | Falha de **dependência não funcional** | idem. **Plena.** |
| 4 | Falha **depois de remover a constraint** | `ROLLBACK` desfaz o DDL. **Plena.** |
| 5 | Falha **depois de remover a coluna** | `ROLLBACK` desfaz. **Plena.** |
| 6 | Falha ao substituir **`submit_wave_response`** | não ocorre aqui (não é recriada); se ocorresse, `ROLLBACK` cobre. **Plena.** |
| 7 | Falha ao substituir **`submit_sector_response`** | `ROLLBACK` restaura corpo **e** ACL vigente. **Plena.** |
| 8 | Falha do **novo pós-check de referência residual** | `ROLLBACK` — é para isso que o pós-check está dentro da transação. **Plena.** |
| 9 | Falha em **qualquer outro pós-check** | idem. **Plena.** |
| 10 | Falha da **comparação de ACL antes/depois** | ocorre **após** o COMMIT (verificação externa) → **NO-GO operacional**, tratado na trilha ACL. O schema já está aplicado. |
| 11 | **Erro descoberto depois do COMMIT** | ver 12–14. |
| 12 | Respostas com `invite_token` **NULL** | nada a restaurar. Recriar coluna + FK restaura o **schema**. **Plena em schema.** |
| 13 | Respostas com **vínculo legado**, **com** snapshot | recriar coluna, FK, restaurar valores — e **remover a coluna de novo** depois. **Reversível com snapshot.** |
| 14 | Respostas com vínculo legado, **sem** snapshot | os valores não existem em lugar nenhum. **Irreversível.** |

Todos os cenários 1–9 resultam em **rollback antes do COMMIT**.

**Restaurar schema ≠ restaurar dados.** Recriar coluna e FK devolve a
*estrutura*; não devolve um único token.

**Critério para nunca executar rollback de dados:** se a restauração não for
estritamente necessária para corrigir falha funcional comprovada, não
restaurar. A perda dos tokens é o **objetivo**, não o dano.

## M. Fixtures documentais e prova estática

**O que isto é e o que não é.** As fixtures abaixo foram executadas contra um
**modelo em TypeScript** dos mesmos predicados — catálogos simulados, OIDs
sintéticos. Prova a **lógica** de classificação e de comparação de contrato.
**Não prova execução em PostgreSQL**: nenhum SQL foi executado, nenhum banco
foi acessado. A prova de execução é a de PostgreSQL 17 não produtivo (§K),
ainda não autorizada.

**Resultado: 37 fixtures, 37 corretas, 0 divergências.**

### Contrato de retorno (§D)

| Fixture | Esperado | Obtido |
| --- | --- | --- |
| oito colunas corretas, na ordem | passa | ✅ passa |
| ordem trocada (`k_min` antes de `response_count_label`) | falha | ✅ falha |
| tipo incorreto (`response_count bigint`) | falha | ✅ falha |
| coluna ausente (sete colunas) | falha | ✅ falha |
| nome incorreto (`response_count_label_v2`) | falha | ✅ falha |
| `response_count_label_v2` passaria no `LIKE` antigo | falha agora | ✅ falha |

### Dependências catalogais (§I)

| Fixture | Esperado | Obtido |
| --- | --- | --- |
| `pg_rewrite` dependente | detecta como view | ✅ detecta |
| `pg_constraint` CHECK dependente | bloqueia | ✅ bloqueia |
| `pg_attrdef` dependente | bloqueia | ✅ bloqueia |
| `pg_proc` dependente | bloqueia | ✅ bloqueia |
| `pg_policy` inesperada | bloqueia | ✅ bloqueia |
| `pg_policy` `response_submit` | **bloqueia** (0.5H) | ✅ bloqueia |
| `pg_class`/índice dependente | bloqueia | ✅ bloqueia |
| FK legada **exata** | esperada, não bloqueia | ✅ esperada |
| FK de **mesmo nome**, identidade diferente | bloqueia | ✅ bloqueia |
| `classid` não tratado (`pg_statistic_ext`) | desconhecida → bloqueia | ✅ bloqueia |
| **OIDs iguais em catálogos diferentes** | não confunde | ✅ resolve por `classid` |
| mesmo `objid` via `pg_class` | resolve para a relação | ✅ relação |
| dependência sobre **outra coluna** | ignorada | ✅ ignorada |
| `refclassid` ≠ `pg_class` | ignorada | ✅ ignorada |
| **estado produtivo esperado** (só a FK) | lista bloqueadora vazia | ✅ vazia |

A fixture de colisão é explícita: o OID `30000` existe **ao mesmo tempo** como
regra em `pg_rewrite`, como tabela em `pg_class` e como policy em `pg_policy`.
Com o filtro de `classid`, cada um resolve para o objeto certo; sem ele, a
consulta antiga confundiria os três.

### Inventário de policies — baseline zero (§F)

| Fixture | Esperado | Obtido |
| --- | --- | --- |
| zero policies | **PASS** | ✅ passa |
| `response_submit` presente | **FAIL** | ✅ falha |
| policy inesperada presente | **FAIL** | ✅ falha |
| duas policies presentes | **FAIL** | ✅ falha |
| policy **restritiva** presente | **FAIL** | ✅ falha |
| metadados listados | nome · comando · permissiva · papéis · schema · tabela | ✅ sem expressão |
| FK legada **exata** | `EXPECTED_DEPENDENCY` | ✅ esperada |
| FK legada **+** `response_submit` | **FAIL** por policy inesperada | ✅ só a FK é esperada |
| nenhuma policy como `EXPECTED_DEPENDENCY` | zero | ✅ zero |
| `pg_policy` com OID colidente em outro catálogo | resolve por `classid` | ✅ resolve |

### Triggers (§I)

| Fixture | Esperado | Obtido |
| --- | --- | --- |
| trigger de `updated_at`, sem `invite_token` | não bloqueia | ✅ não bloqueia |
| trigger de auditoria sem `invite_token` | não bloqueia | ✅ não bloqueia |
| trigger cujo parâmetro é `p_invite_token` | não bloqueia | ✅ não bloqueia |
| trigger com `NEW.invite_token` **na função** | bloqueia | ✅ via `pg_get_functiondef` |
| trigger `UPDATE OF invite_token` | bloqueia | ✅ via `pg_depend` |
| trigger interno (`tgisinternal`) | não bloqueia, classificado | ✅ classificado |

### Limitações que nenhuma fixture remove

1. **SQL dinâmico** (`EXECUTE format(…)`) escapa de qualquer regex sobre corpo
   de função.
2. A **string exata** de `pg_get_function_result` no PostgreSQL 17 é
   expectativa derivada da definição canônica, não medida.
3. **Comportamento abaixo de *k*** (§D) não é alcançável estaticamente.
4. O modelo é uma **reprodução** dos predicados, não o planejador do
   PostgreSQL: erro de sintaxe ou de semântica de SQL não é detectado por ele.

As quatro dependem da prova em PostgreSQL 17 não produtivo — **não autorizada
nesta etapa**.
