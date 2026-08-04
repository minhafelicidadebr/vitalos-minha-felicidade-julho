# PROD-0.6 — Matriz de cenários da prova não produtiva

> **Status: PLANO. Nenhum cenário foi executado.**
> Contexto e decisões: `PROD06_NONPROD_PROOF_PLAN.md`.
> Formato de registro: `PROD06_EVIDENCE_SCHEMA.md`.

Cada cenário declara **camada** (L1 `TARGETED_HARNESS` / L2
`MIGRATION_LINEAGE` / L3 executor Lovable, em staging), **o que prova**, e
**como se assere** — a asserção é parte do cenário, não uma inspeção visual
posterior.

## 0. Cenários estruturais

| # | Cenário | Camada | Prova | Asserção |
| --- | --- | --- | --- | --- |
| E01 | `TARGETED_HARNESS` completo | L1 | o harness monta o schema mínimo, os stubs e o baseline sem erro | todos os objetos esperados existem; `SELECT version()` major = 17 |
| E02 | `MIGRATION_LINEAGE` completo ou parcial | L2 | replay ordenado das migrations reais + A + H, **sem** a B de staging | lista, ordem e hashes registrados; classificação `INTEGRAL` ou `MIGRATION_LINEAGE_PROOF_PARTIAL` |

**E02 não pode ser reportado como equivalência produtiva** quando parcial.

## 1. Caminho feliz

| # | Pré-estado | Camada |
| --- | --- | --- |
| H01 | A presente · H presente · zero respostas · zero `invite_token` · **zero policies** · FK exata · nenhuma dependência inesperada | L1 e L2 |

Asserções, todas obrigatórias:

- o bloco conclui com `COMMIT`;
- `wave_responses.invite_token` **ausente**;
- `wave_responses_invite_token_fkey` **ausente**;
- nenhuma FK residual `wave_responses` → `wave_invites`;
- `submit_wave_response(uuid,text,jsonb)` e `submit_sector_response(text,jsonb)`
  preservadas na assinatura exata;
- contrato de 8 colunas de `aggregate_cohort_responses` intacto em **nome, tipo
  e ordem**;
- as 8 colunas/objetos de A preservados;
- os 21 pós-checks internos passam;
- fingerprint de ACL antes = depois.

## 2. Falhas de precondition

Quinze cenários. **Cada um prova as mesmas quatro coisas** — é isso que os
torna comparáveis:

1. erro **antes** do `COMMIT`;
2. `ROLLBACK` integral;
3. coluna **e** FK preservadas;
4. **zero estado parcial** — hash do dump normalizado antes = depois.

| # | Injeção | Precondition que deve disparar |
| --- | --- | --- |
| P01 | uma resposta nova em `wave_responses` | gate de drift operacional (§3.7) |
| P02 | resposta com `invite_token` não nulo | gate de perda de vínculo (§3.8) |
| P03 | token órfão (sem convite correspondente) | integridade do conjunto afetado (§3.9) |
| P04 | token duplicado em duas respostas | integridade do conjunto afetado |
| P05 | divergência onda–convite | integridade do conjunto afetado |
| P06 | inconsistência organizacional (onda sem `org_id`) | integridade do conjunto afetado |
| P07 | **policy presente** (`response_submit`) | inventário de policies (§3.3) — gate numérico |
| P08 | FK com **nome** errado | FK exata (§3.2) |
| P09 | FK com **identidade** errada (mesmo nome, outra tabela) | FK exata |
| P10 | objeto de A ausente (ex.: `wave_cohorts` removida) | precondition de A (§1) |
| P11 | contrato de H divergente (coluna renomeada) | contrato estrutural (§2, H/2) |
| P12 | **view** dependente de `invite_token` | dependências catalogais (§3.4), ramo `pg_rewrite` |
| P13 | **trigger** com referência real a `invite_token` | §3.4 (`pg_trigger`) ou §3.4b (textual) |
| P14 | **CHECK / default / índice** sobre a coluna | §3.4, ramos `pg_constraint` / `pg_attrdef` / `pg_class` |
| P15 | assinatura de função errada | §3.10 |

### Controle negativo obrigatório

| # | Injeção | Resultado esperado |
| --- | --- | --- |
| P13n | trigger de `updated_at`, **sem** `invite_token` | **não bloqueia** — o bloco conclui |

Sem P13n, a matriz provaria que o predicado bloqueia, mas não que ele
**discrimina**. Foi exatamente esse falso positivo permanente que a revisão
PROD-0.5F encontrou.

### P16 — `UNKNOWN_CATALOG_DEPENDENCY`

**Fixture:** dependência sobre `invite_token` com `classid` **fora** dos sete
catálogos reconhecidos — modelo sintético de `pg_statistic_ext` ou outro
catálogo não tratado.

**Resultado esperado:**

- `classid` classificado como **desconhecido**;
- precondition **aborta**;
- metadados registrados (`classid`, `objid`, `objsubid`, `deptype`);
- **nenhum DDL iniciado**;
- schema preservado;
- **dependência desconhecida nunca é ignorada**.

O ramo "`classid` não tratado → aborta" é decisão de desenho da §3.4 do
rascunho; sem cenário próprio, essa decisão ficaria sem prova.

### P17 — `POLICY_RACE`

Cenário **concorrente**, em dois subcenários.

#### P17-A — policy criada antes da precondition

Sessão concorrente cria uma policy **antes** do inventário transacional →
`policy_count > 0` → a migration **aborta antes do DDL**.

#### P17-B — tentativa depois do `ACCESS EXCLUSIVE`

A migration adquire `ACCESS EXCLUSIVE`; uma terceira sessão tenta criar
policy. Observar `pg_locks` e `pg_stat_activity`.

**A operação concorrente não pode produzir um `PASS` silencioso.** Depois do
`COMMIT` ou `ROLLBACK`, executar a **releitura externa** do inventário.

| Resultado | Aceitável? |
| --- | --- |
| operação concorrente bloqueada até o fim da transação, **e depois detectada** pelo pós-check externo | ✅ |
| migration aborta porque a policy ficou visível antes da precondition | ✅ |
| migration classificada `PASS` **com** policy presente | ❌ |
| releitura externa **não** detecta o drift | ❌ |

Registrar `SQLSTATE`, timestamps, locks e `POLICY_COUNT_AFTER_COMMIT`.

> **Não presumir** o modo de lock que `CREATE POLICY` adquire no PostgreSQL 17.
> O cenário **mede** o comportamento real; qualquer afirmação prévia sobre
> bloqueio seria especulação, e é justamente o que o cenário existe para
> substituir.

## 3. Falhas injetadas depois do DDL

Os três cenários que provam rollback **de DDL já executado** — o caso que
importa, e que "erro antes do primeiro DDL" não cobre.

| # | Momento da falha | Asserções |
| --- | --- | --- |
| D01 | depois do `CREATE OR REPLACE submit_sector_response` | corpo anterior restaurado · ACL vigente restaurada |
| D02 | depois do `DROP CONSTRAINT` | FK restaurada com identidade integral |
| D03 | **depois do `DROP COLUMN`** | coluna restaurada · FK restaurada · funções restauradas · schema antes ≡ depois · **nenhum lock ou transação órfã** |
| D04 | **depois de um pós-check bem-sucedido**, antes do `COMMIT` | ver abaixo |

D03 é **obrigatório**. A verificação de ausência de transação órfã usa
`pg_stat_activity`; a de locks, `pg_locks`.

### D04 — `FAILURE_AFTER_POSTCHECK`

**Estado:** A e H presentes · preconditions passam · `CREATE OR REPLACE`
executado · FK removida · coluna removida · **pós-checks normais passam** ·
falha deliberada injetada **imediatamente após um pós-check e antes do
`COMMIT`**.

**Asserções:** a transação aborta · FK reaparece · coluna reaparece · a função
volta ao corpo anterior quando aplicável · schema antes ≡ depois · nenhum lock
permanece · nenhuma transação fica órfã · `SQLSTATE` registrado.

**Por que é distinto de D03.** D03 prova que uma falha *no meio* desfaz o DDL
anterior. D04 prova que uma falha **na etapa final** — depois de tudo ter dado
certo, inclusive as verificações — ainda protege **todos** os DDLs anteriores.
É o cenário que justifica os pós-checks viverem *dentro* do `BEGIN` em vez de
depois do `COMMIT`.

## 4. Locks e concorrência

| # | Cenário | Asserção |
| --- | --- | --- |
| L01 | sessão concorrente segurando `wave_responses` | a migration espera |
| L02 | `lock_timeout` de 5s | erro `55P03` medido; tempo real registrado |
| L03 | nenhuma repetição automática | `ATTEMPT_COUNT = 1` — ver abaixo |
| L04 | advisory lock concorrente com a mesma chave | a segunda execução serializa |
| L05 | duas execuções administrativas simultâneas | uma conclui, a outra espera ou falha por timeout — nunca ambas aplicam |
| L06 | escrita **iniciada antes** do `ACCESS EXCLUSIVE` | a migration espera a escrita terminar |
| L07 | escrita **tentada depois** do `ACCESS EXCLUSIVE` | a escrita fica bloqueada até o `COMMIT` |
| L08 | **terceira sessão** observando `pg_locks` no meio do bloco | `ACCESS EXCLUSIVE` presente com `granted = true` da aquisição ao `COMMIT` |
| L09 | `SET LOCAL` observado **dentro** do bloco | `current_setting('lock_timeout')` e `statement_timeout` com os valores definidos |
| L10 | `statement_timeout` | comportamento por statement, não por transação |

**L08 não é opcional.** Sem uma sessão externa observando o catálogo de locks,
"o `ACCESS EXCLUSIVE` permaneceu adquirido" seria inferido do sucesso da
migration — raciocínio circular.

### L03 — evidência de `ATTEMPT_COUNT = 1`

Ausência textual de "retry" no log **não é prova**: prova a ausência de uma
palavra, não a ausência de uma segunda tentativa. L03 registra:

- número de **invocações do cenário**;
- número de **processos `psql` iniciados**;
- **backend PIDs** observados;
- conexões relevantes em `pg_stat_activity`;
- **timestamp da única tentativa**;
- `SQLSTATE` da falha;
- **ausência de segundo início do mesmo `scenario_id`**.

**Resultado esperado: `ATTEMPT_COUNT = 1`.** Um segundo backend PID para o
mesmo `scenario_id` é `FAIL`, ainda que o log não contenha a palavra "retry".

## 5. Contrato de retorno e referências residuais

| # | Cenário | Asserção |
| --- | --- | --- |
| C01 | `aggregate_cohort_responses` canônica | `pg_get_function_result` **observado** e conferido contra o contrato documentado; **a string literal é registrada** |
| C02 | ordem das colunas trocada | aborta |
| C03 | tipo de coluna trocado | aborta |
| C04 | coluna ausente | aborta |
| C05 | nome com sufixo (`response_count_label_v2`) | aborta — o `LIKE` antigo passaria |
| R01 | função com `wr.invite_token` qualificado | pós-check §5.7 detecta |
| R02 | função com parâmetro `p_invite_token` apenas | **não** detecta — controle negativo |

C01 fecha o item aberto desde a PROD-0.5G: a forma textual do PostgreSQL 17 é
hoje expectativa derivada, não medida.

## 6. Comportamento abaixo de *k*

| # | n | Asserções |
| --- | --- | --- |
| K01 | 4 | `visible = false` · `response_count = NULL` · `response_count_label = '<5'` · `item_means`/`factor_scores`/`domain_means` suprimidos · `suppression_reason` correto |
| K02 | 5 | limiar atingido — agregado visível |
| K03 | 7 | agregado visível |

Requer H aplicado e os stubs de `auth.uid()`/`auth.role()`. É o item que a
revisão estática declarou inalcançável sem execução.

## 7. Falhas do próprio aparato de prova

Sete cenários que testam o harness, não a migration. Sem eles, um aparato
defeituoso produziria verde falso.

| # | Cenário | Resultado esperado |
| --- | --- | --- |
| X01 | extração com **marcador ausente** | aborta antes de qualquer conexão |
| X02 | extração com **dois blocos** (marcador duplicado) | aborta |
| X03 | **hash do SQL extraído divergente** do registrado | aborta |
| X04 | linha em formato inesperado dentro do bloco | aborta (regra 7) |
| X05 | conteúdo **não comentado** no arquivo-fonte | aborta (regra 8) |
| X06 | variável de **host remoto** presente | aborta antes de inicializar o harness |
| X07 | input de `workflow_dispatch` incorreto | aborta antes de inicializar o harness |
| X08 | cliente PostgreSQL de **major incorreta** | aborta |
| X09 | dump antes/depois com **chave de `restrict` não determinística** | detectado — a comparação é rejeitada, não interpretada |

## 8. Prova do executor Lovable — L3, staging, autorização separada

| # | Cenário | Asserção |
| --- | --- | --- |
| V01 | bloco com `SET LOCAL`, lock, criação de objeto de sonda e **falha deliberada** | objeto **não persiste** quando consultado em **chamada separada** |
| V02 | `SET LOCAL` dentro do bloco | valor observado corresponde ao definido |
| V03 | locks durante o bloco | presentes; ausentes após o erro |
| V04 | identificador de backend | PID ou equivalente registrado |
| V05 | **objeto persistente após o erro** | `LOVABLE_BATCH_TRANSACTION_CONFIRMED=false` · **NO-GO** · limpeza só com autorização separada |

Schema dedicado, explicitamente não produtivo. Objeto **permanente** de sonda —
não temporário, porque tabela temporária some com a sessão e não distinguiria
rollback de queda de conexão.

**Proibido tocar** `wave_responses` · `wave_invites` · `waves` ·
`wave_cohorts` · qualquer tabela funcional da FIB-T.

## 9. Tabela canônica de cenários

**Esta tabela é a fonte única.** A contagem é **derivada da quantidade de
`scenario_id` únicos** aqui — não mantida à mão em vários lugares.

| `scenario_id` | Camada | Categoria | Resultado esperado | Evidência obrigatória |
| --- | --- | --- | --- | --- |
| `E01` | L1 | estrutural | harness monta sem erro | objetos criados · `postgres_version` |
| `E02` | L2 | estrutural | replay do manifesto congelado | `LINEAGE_MANIFEST_*` · listas ordenadas · classificação |
| `H01` | L1+L2 | caminho feliz | `COMMIT` conclui | 9 asserções da §1 · `schema_hash_*` · `acl_fingerprint_*` |
| `P01` | L1 | precondition | aborta (drift operacional) | `sqlstate` · `schema_hash_*` |
| `P02` | L1 | precondition | aborta (perda de vínculo) | `sqlstate` · `schema_hash_*` |
| `P03` | L1 | precondition | aborta (token órfão) | `sqlstate` · `schema_hash_*` |
| `P04` | L1 | precondition | aborta (token duplicado) | `sqlstate` · `schema_hash_*` |
| `P05` | L1 | precondition | aborta (divergência onda–convite) | `sqlstate` · `schema_hash_*` |
| `P06` | L1 | precondition | aborta (inconsistência organizacional) | `sqlstate` · `schema_hash_*` |
| `P07` | L1 | precondition | aborta (policy presente) | `sqlstate` · metadados de policy |
| `P08` | L1 | precondition | aborta (FK com nome errado) | `sqlstate` · `schema_hash_*` |
| `P09` | L1 | precondition | aborta (FK com identidade errada) | `sqlstate` · `schema_hash_*` |
| `P10` | L1 | precondition | aborta (objeto de A ausente) | `sqlstate` · `schema_hash_*` |
| `P11` | L1 | precondition | aborta (contrato de H divergente) | `sqlstate` · contrato observado |
| `P12` | L1 | precondition | aborta (view dependente) | `sqlstate` · metadados de dependência |
| `P13` | L1 | precondition | aborta (trigger com `invite_token`) | `sqlstate` · metadados |
| `P13n` | L1 | controle negativo | **não** bloqueia | `COMMIT` concluído |
| `P14` | L1 | precondition | aborta (CHECK/default/índice) | `sqlstate` · metadados |
| `P15` | L1 | precondition | aborta (assinatura errada) | `sqlstate` |
| `P16` | L1 | precondition | aborta (`classid` desconhecido) | `sqlstate` · `classid`/`objid`/`deptype` |
| `P17-A` | L1 | concorrência | aborta antes do DDL | `policy_count` · `sqlstate` · timestamps |
| `P17-B` | L1 | concorrência | bloqueio + detecção externa | `pg_locks` · `pg_stat_activity` · `POLICY_COUNT_AFTER_COMMIT` |
| `D01` | L1 | rollback pós-DDL | corpo e ACL restaurados | `schema_hash_*` · `acl_fingerprint_*` |
| `D02` | L1 | rollback pós-DDL | FK restaurada | `schema_hash_*` |
| `D03` | L1 | rollback pós-DDL | coluna e FK restauradas | `schema_hash_*` · `locks_observed` · `orphan_transactions` |
| `D04` | L1 | rollback pós-DDL | tudo restaurado após pós-check | `schema_hash_*` · `sqlstate` · `locks_observed` |
| `L01` | L1 | locks | migration espera | `pg_locks` · timestamps |
| `L02` | L1 | locks | `55P03` em ~5s | `lock_timeout_measured_ms` |
| `L03` | L1 | locks | `ATTEMPT_COUNT = 1` | PIDs · invocações · `pg_stat_activity` |
| `L04` | L1 | locks | advisory serializa | timestamps |
| `L05` | L1 | locks | nunca duas aplicações | `sqlstate` · timestamps |
| `L06` | L1 | locks | migration espera escrita anterior | `pg_locks` |
| `L07` | L1 | locks | escrita posterior bloqueada | `pg_locks` |
| `L08` | L1 | locks | lock `granted` até o `COMMIT` | `access_exclusive_granted_window` |
| `L09` | L1 | locks | `SET LOCAL` ativo no bloco | `current_setting` observado |
| `L10` | L1 | locks | timeout por statement | `elapsed_ms` |
| `C01` | L1 | contrato | retorno canônico | `pg_get_function_result_literal` |
| `C02` | L1 | contrato | aborta (ordem trocada) | `sqlstate` |
| `C03` | L1 | contrato | aborta (tipo trocado) | `sqlstate` |
| `C04` | L1 | contrato | aborta (coluna ausente) | `sqlstate` |
| `C05` | L1 | contrato | aborta (nome com sufixo) | `sqlstate` |
| `R01` | L1 | residual | detecta referência qualificada | `sqlstate` |
| `R02` | L1 | controle negativo | **não** detecta parâmetro | `COMMIT` concluído |
| `K01` | L1 | abaixo de *k* | suprimido em n=4 | `k_behavior` |
| `K02` | L1 | abaixo de *k* | visível em n=5 | `k_behavior` |
| `K03` | L1 | abaixo de *k* | visível em n=7 | `k_behavior` |
| `X01` | — | aparato | aborta (marcador ausente) | log de extração |
| `X02` | — | aparato | aborta (marcador duplicado) | log de extração |
| `X03` | — | aparato | aborta (hash divergente) | três SHA-256 |
| `X04` | — | aparato | aborta (linha inesperada) | log de extração |
| `X05` | — | aparato | aborta (conteúdo não comentado) | log de extração |
| `X06` | — | aparato | aborta (host remoto) | variável detectada, **sem valor** |
| `X07` | — | aparato | aborta (input incorreto) | inputs recebidos |
| `X08` | — | aparato | aborta (cliente de major errada) | `client_version` |
| `X09` | — | aparato | rejeita comparação | chave de `restrict` observada |

**`count_documented = 55`** — 55 `scenario_id` únicos de L1/L2.

Executor Lovable (L3), fora desta contagem: `V01`–`V05` (5 cenários), em onda e
autorização próprias.

### Validação fail-closed da própria matriz

Antes da PROD-0.6D, verificar mecanicamente:

- **IDs únicos** — nenhum `scenario_id` repetido;
- **nenhum cenário sem resultado esperado**;
- **nenhum cenário sem evidência obrigatória**;
- **`count_documented = count_parsed`** — a contagem declarada bate com as
  linhas efetivamente presentes nesta tabela;
- **matriz, checklist e schema de evidência com a mesma contagem**.

Divergência entre os três documentos é `FAIL` do aparato, não detalhe
editorial.

## 10. Critério de conclusão

A PROD-0.6D conclui quando os **55** cenários de L1/L2 tiverem sido executados
e classificados `PASS` · `FAIL` · `INCONCLUSIVE`, com evidência conforme
`PROD06_EVIDENCE_SCHEMA.md`.

Um único `FAIL` em cenário de precondition ou de rollback é **NO-GO** para
promoção. `INCONCLUSIVE` não conta como aprovação — conta como pendência.

**Mesmo com 55/55 `PASS`**, a promoção continua bloqueada por
`LOVABLE_BATCH_TRANSACTION_CONFIRMED`, pela aprovação humana de locks e
timeouts, por A e H aplicadas e comprovadas, pelo inventário produtivo
repetido, pelo `project_ref` reconfirmado e pela trilha ACL.
