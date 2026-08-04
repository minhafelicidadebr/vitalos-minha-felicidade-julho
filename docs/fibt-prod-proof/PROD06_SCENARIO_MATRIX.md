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

## 3. Falhas injetadas depois do DDL

Os três cenários que provam rollback **de DDL já executado** — o caso que
importa, e que "erro antes do primeiro DDL" não cobre.

| # | Momento da falha | Asserções |
| --- | --- | --- |
| D01 | depois do `CREATE OR REPLACE submit_sector_response` | corpo anterior restaurado · ACL vigente restaurada |
| D02 | depois do `DROP CONSTRAINT` | FK restaurada com identidade integral |
| D03 | **depois do `DROP COLUMN`** | coluna restaurada · FK restaurada · funções restauradas · schema antes ≡ depois · **nenhum lock ou transação órfã** |

D03 é **obrigatório**. A verificação de ausência de transação órfã usa
`pg_stat_activity`; a de locks, `pg_locks`.

## 4. Locks e concorrência

| # | Cenário | Asserção |
| --- | --- | --- |
| L01 | sessão concorrente segurando `wave_responses` | a migration espera |
| L02 | `lock_timeout` de 5s | erro `55P03` medido; tempo real registrado |
| L03 | nenhuma repetição automática | uma única tentativa nos logs |
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

## 9. Contagem e critério de conclusão

| Grupo | Cenários |
| --- | --- |
| Estruturais | 2 |
| Caminho feliz | 1 |
| Preconditions | 15 + 1 controle negativo |
| Falhas pós-DDL | 3 |
| Locks | 10 |
| Contrato e residuais | 7 |
| Abaixo de *k* | 3 |
| Aparato | 9 |
| **L1 + L2 — total** | **51** |
| Executor Lovable (L3) | 5 |

**Critério de conclusão da PROD-0.6D:** os 51 cenários de L1/L2 executados,
cada um classificado `PASS` · `FAIL` · `INCONCLUSIVE`, com evidência conforme
`PROD06_EVIDENCE_SCHEMA.md`.

Um único `FAIL` em cenário de precondition ou de rollback é **NO-GO** para
promoção. `INCONCLUSIVE` não conta como aprovação — conta como pendência.

**Mesmo com 51/51 `PASS`**, a promoção continua bloqueada por
`LOVABLE_BATCH_TRANSACTION_CONFIRMED`, pela aprovação humana de locks e
timeouts, por A e H aplicadas e comprovadas, pelo inventário produtivo
repetido, pelo `project_ref` reconfirmado e pela trilha ACL.
