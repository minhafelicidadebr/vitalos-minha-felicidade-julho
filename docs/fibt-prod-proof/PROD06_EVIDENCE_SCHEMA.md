# PROD-0.6 — Schema de evidência da prova não produtiva

> **Status: PLANO. Nenhuma evidência foi coletada. O workflow
> `fibt-nonprod-proof` nunca foi disparado — zero execução, zero PostgreSQL
> iniciado, zero SQL aplicado.**
> Plano: `PROD06_NONPROD_PROOF_PLAN.md` · Cenários:
> `PROD06_SCENARIO_MATRIX.md` · Roteiro: `PROD06_EXECUTION_CHECKLIST.md`.

Define **o que** cada execução registra, para que a evidência seja comparável
entre execuções e auditável sem acesso ao runner.

## 1. Cabeçalho da execução — uma vez por run

| Campo | Origem | Exemplo de forma |
| --- | --- | --- |
| `commit` | SHA integral do checkout | `3f8b950…` (40 hex) |
| `branch` | ref do checkout | `main` |
| `workflow_run` | id e URL do run | `30869876931` |
| `source_commit_input` | input do disparo | 40 hex |
| `source_commit_matches_checkout` | comparação | `true` \| `false` |
| `proof_target` | input do disparo | `LOCAL_PG17_ONLY` |
| `acknowledgement` | input do disparo | `I_CONFIRM_NONPROD_EPHEMERAL_PG17` |
| `runner_os` | runner | `ubuntu-…` |
| `container_image` | imagem do service container | `postgres:17-…` |
| `image_digest` | digest imutável | `sha256:…` |
| `container_id_masked` | `job.services.pg17.id`, mascarado | primeiros 12 caracteres |
| `client_strategy` | fixo | `SERVICE_CONTAINER_EXEC_STDIN` |
| `postgres_version` | retorno de `SELECT version()` | texto integral |
| `client_version_psql` | `psql --version` | texto |
| `client_version_pg_dump` | `pg_dump --version` | texto |
| `client_server_major_match` | comparação | `true` \| `false` |
| `layer` | camada | `L1_TARGETED_HARNESS` \| `L2_MIGRATION_LINEAGE` |
| `lineage_classification` | só em L2 | `MIGRATION_LINEAGE_PROOF_INTEGRAL` \| `…_PARTIAL` \| `…_FAILED` |
| `pgcrypto_extension_declared` | `CREATE EXTENSION IF NOT EXISTS pgcrypto;` presente no schema sintético (`PGCRYPTO_DEPENDENCY_DECLARED`) — necessário para `gen_random_bytes()`, usado no `DEFAULT` de `wave_invites.token`; instalado só no PostgreSQL 17 efêmero, sem rede | `true` |
| `harness_version` | versão do orquestrador que gerou a evidência | `fibt-proof-harness/PROD-0.6C` |
| `started_at` / `finished_at` | timestamps ISO-8601 UTC | |

`source_commit_matches_checkout = false` ou
`client_server_major_match = false` → o run **aborta** e não produz registros
de cenário.

## 2. Extração multibloco

`EXTRACTION_CONTRACT = EXPLICIT_MULTIPLE_EXECUTABLE_BLOCKS`.

### Cabeçalho da extração — uma vez por execução

| Campo | Descrição |
| --- | --- |
| `source_file` | caminho do arquivo-fonte no repositório |
| `source_sha256` | SHA-256 do **blob** do arquivo-fonte inteiro |
| `expected_block_count` | `13` — recongelado após PROD-0.6B-FUNCBODY |
| `observed_block_count` | contagem real de pares de marcador |
| `block_ids_expected` / `block_ids_observed` | `B001…B013` |
| `sequence_gaps` · `duplicate_ids` · `nested_blocks` · `empty_blocks` | devem ser `0` |
| `source_without_markers_and_new_block_sha256` | igual ao blob do draft em `origin/main` **sem** os marcadores **e sem** o corpo novo de `B007` (prova mais fraca que a anterior — ver plano §"Prova de preservação") |
| `expected_block_sha256` | mapa congelado `B001`…`B013` → SHA-256, incorporado ao extrator na PROD-0.6C-MICROFIX — ver §2.1 |
| `aggregate_transaction_sha256` | SHA-256 da concatenação `B001`–`B011` |
| `aggregate_acl_evidence_sha256` | SHA-256 da concatenação `B012`+`B013` (grupo `ACL_EVIDENCE`, fora da transação) |
| `aggregate_all_blocks_sha256` | SHA-256 da concatenação `B001`…`B013` |
| `spec_j_function_sha256` / `canonical_b_function_sha256` / `draft_b007_function_sha256` | as três devem ser **idênticas** — corpo inserido em `B007` bate com a SPEC §J e com a Migration B canônica |
| `rejected_lines` | linhas em formato inesperado — deve ser `0` |
| `temp_paths_removed` | `true` no encerramento, **inclusive em falha** |

### 2.1 Modo de garantia — `CANONICAL_PER_BLOCK_HASH_PIN`

**O harness não classifica linguisticamente SQL e prosa.** Construir um
classificador real exigiria um parser SQL completo, fora de escopo. A garantia
de conteúdo canônico — inclusive contra prosa nua inserida por engano dentro
de um bloco — vem inteiramente de validação estrutural dos marcadores,
reconstrução byte a byte, e **hashes SHA-256 congelados por bloco**
(`expected_block_sha256`, um valor por `Bnnn`, verificado **antes** de
qualquer outra checagem semântica). Qualquer alteração de conteúdo — uma
palavra a mais, uma linha de prosa, um espaço — muda o hash daquele bloco
especificamente e aborta a extração com `BLOCK_HASH_DIVERGENT:Bnnn`, antes de
chegar a E18 ou aos invariantes.

Isto é uma **limitação deliberada, declarada**, não uma deficiência silenciosa:
o pin por bloco garante que o draft de hoje é byte-idêntico ao congelado no
merge do PR #38; não é, e não pretende ser, uma prova de que uma revisão
*futura* do draft (com um novo congelamento) estaria livre de prosa —
isso continua exigindo revisão humana no momento em que o novo hash for
congelado, exatamente como os commits anteriores já registravam
("Verificação manual: zero linhas malformadas e zero sentenças em prosa").

### Registro por bloco — um por `Bnnn`

| Campo | Descrição |
| --- | --- |
| `block_id` | `B001` … `B013` |
| `start_line` / `end_line` | posição no arquivo-fonte |
| `line_count` | linhas do bloco |
| `classification` | `TRANSACTION_OPEN` · `PRECONDITION` · `DDL` · `POSTCHECK` · `TRANSACTION_CLOSE` · `SUPPORTING_SQL` |
| `first_token` / `last_token` | após o strip |
| `source_sha256` | SHA-256 do conteúdo **comentado** |
| `stripped_sha256` | SHA-256 do conteúdo **após o strip** |
| `block_sha256_matches_canonical` | comparação de `stripped_sha256` contra `expected_block_sha256[block_id]` — deve ser `true` para os 13 blocos |

Divergência de contagem, lacuna de ID, ID repetido, aninhamento, bloco vazio,
linha rejeitada, hash individual de qualquer bloco divergente do congelado
(`BLOCK_HASH_DIVERGENT:Bnnn`), ou `source_without_markers_and_new_block_sha256`
diferente do blob de `origin/main` → **aborta antes de conectar ao banco**.

### 2.2 Grupos de extração

| Grupo | Blocos | Papel |
| --- | --- | --- |
| `TRANSACTION` | `B001`–`B011` | a transação produtiva completa — `BEGIN;` até `COMMIT;` |
| `ACL_EVIDENCE` | `B012`–`B013` | consultas de leitura da matriz de ACL/fingerprint, **fora** da transação — nunca concatenadas dentro dela |

Os dois grupos são disjuntos e sua união é exatamente `B001`…`B013` — não há
bloco fora de ambos, nem bloco em ambos.

### 2.3 E18 — `REQUIRED_FUNCTION_BODY_PRESENT` (ampliado na PROD-0.6C-MICROFIX)

| Campo | Descrição |
| --- | --- |
| `function_body_present` | `B007` contém a assinatura `CREATE OR REPLACE FUNCTION public.submit_sector_response(` |
| `exactly_one_create_or_replace` | exatamente uma ocorrência do `CREATE OR REPLACE FUNCTION` em `B007` |
| `hash_matches_canonical` | hash de `B007` igual ao congelado |
| `no_invite_token_residual` | **ampliado**: falha diante de **qualquer** ocorrência lexical de `invite_token` em `B007` (fronteira de palavra `\b`), não apenas no padrão de `INSERT` — cobre `UPDATE`, `SELECT`, `RETURNING`, referência qualificada, alias, comentário e string literal, porque o corpo canônico não contém essa palavra em nenhuma forma |
| `no_grant_or_revoke` | zero `GRANT`/`REVOKE` executável dentro de `B007` |
| `result` | `PASS` só quando os cinco campos acima são verdadeiros |

### Invariantes transacionais da concatenação

Cada um registrado como booleano: `first_statement_is_begin` ·
`last_statement_is_commit` · `begin_count = 1` · `commit_count = 1` ·
`no_intermediate_commit` · `no_rollback_on_happy_path` ·
`set_local_inside_transaction` · `preconditions_before_first_ddl` ·
`postchecks_after_ddl` · **`no_executable_fragment_omitted`**.

O último passou a **`true`** após a PROD-0.6B-FUNCBODY: o `CREATE OR REPLACE`
de `submit_sector_response` foi incorporado como bloco `B007`, byte-idêntico à
SPEC §J e à Migration B canônica. Validado estaticamente (sem executar
PostgreSQL) — a confirmação empírica ainda depende da execução real do Tier 1,
que segue não disparada.

## 3. Registro por cenário — um por cenário

| Campo | Descrição |
| --- | --- |
| `scenario_id` | `H01`, `P07`, `D03`, `L08`, `X03`… |
| `scenario_group` | estrutural · caminho feliz · precondition · pós-DDL · locks · contrato · abaixo-de-k · aparato |
| `layer` | `L1` \| `L2` |
| `expected_result` | descrição normativa vinda da matriz |
| `observed_result` | o que de fato ocorreu |
| `sqlstate` | código quando houve erro (`55P03`, `P0001`…) |
| `error_message` | mensagem, **sem** dado de negócio |
| `schema_hash_before` | hash do dump normalizado antes |
| `schema_hash_after` | hash do dump normalizado depois |
| `schema_diff` | diff textual quando os hashes divergem |
| `acl_fingerprint_before` | fingerprint da matriz de ACL antes |
| `acl_fingerprint_after` | fingerprint depois |
| `locks_observed` | leitura de `pg_locks` quando o cenário exige |
| `orphan_transactions` | leitura de `pg_stat_activity` — esperado vazio |
| `elapsed_ms` | duração medida (crítico em L02) |
| `started_at` / `finished_at` | timestamps |
| `limitations` | limitações específicas do cenário |
| `classification` | **`PASS`** \| **`FAIL`** \| **`INCONCLUSIVE`** |

### Semântica das três classificações

- **`PASS`** — o resultado observado corresponde ao esperado **e** as asserções
  auxiliares do cenário passaram.
- **`FAIL`** — divergência real. Um `FAIL` em cenário de precondition ou de
  rollback é **NO-GO** para promoção.
- **`INCONCLUSIVE`** — o cenário não pôde ser decidido (dependência ausente,
  stub insuficiente, dump não comparável). **Não conta como aprovação.** Conta
  como pendência aberta.

### 3.1 Evidência terminal — exceção não tratada (`TERMINAL_FAILURE_EVIDENCE`)

Cenários já antecipados (falha de precondition, timeout, etc.) sempre chegam a
um registro normal da §3, via `emit()`. Uma **exceção não tratada** — algo que
não foi antecipado por nenhum cenário — antes rompia o processo sem gravar
nenhum artefato; a PROD-0.6C-MICROFIX acrescentou um boundary de topo
(`main().catch(...)`) que grava um registro terminal sanitizado nesse caso.

| Campo | Descrição |
| --- | --- |
| `status` | `FAIL` (padrão) ou `INCONCLUSIVE` |
| `generated_at` | timestamp ISO-8601 UTC |
| `phase` | checkpoint grosso onde a exceção interrompeu — `STARTUP` \| `VERSION_CHECK` \| `TIER1_SCENARIOS` \| `TIER1_LOCK_SCENARIOS` \| `TIER1_K_ANON_SCENARIOS:Txx` \| `EMIT` |
| `failure_code` | código textual fixo (`UNCAUGHT_EXCEPTION`) — nunca a mensagem/stack do erro original |
| `source_sha` | `GITHUB_SHA` quando disponível, senão `null` |
| `harness_version` | mesma versão do cabeçalho normal (§1) |

**Nunca registrado neste caminho:** stack trace completa, senha, connection
string, token, variável de ambiente, SQL descomentado ou dado do seed — o
construtor (`buildTerminalFailureEvidence`) só aceita `phase`/`failure_code`/
`source_sha`/`status` como entrada; não há parâmetro para passar o objeto de
erro inteiro. Se a própria gravação da evidência terminal falhar, o processo
sai com código não zero e uma mensagem genérica no stderr, sem tentar
alternativa alguma.

## 4. Campos específicos de certos cenários

| Cenário | Campo adicional |
| --- | --- |
| `C01` | `pg_get_function_result_literal` — a **string exata** devolvida pelo PostgreSQL 17, conferida contra o contrato canônico |
| `S02` | `LINEAGE_MANIFEST_EXPECTED_COUNT` (45) e `LINEAGE_MANIFEST_OBSERVED_COUNT` |
| `S02` | `ordered_path_list_hash` · `ordered_blob_hash_list` · `ordered_sha256_list` |
| `S02` | `lineage_first_item` · `lineage_last_item` |
| `S02` | `migration_a_present` · `hardening_h_present` · `staging_b_absent` — os três booleanos |
| `S02` | `incompatible_migrations` — as que não rodam em PostgreSQL puro, com o motivo |
| `S02` | `stubs_required` — stubs criados para viabilizar o replay |
| `S02` | `supabase_deviations` — desvios conhecidos em relação ao ambiente real |
| `K01`–`K03` | `k_behavior` — `visible`, `response_count`, `response_count_label`, presença/ausência dos agregados, `suppression_reason` |
| `L02` | `lock_timeout_measured_ms` — tempo real até o erro |
| `L03` | `attempt_count` (esperado **1**) · `psql_processes_started` · `backend_pids` · `single_attempt_timestamp` |
| `L08` | `access_exclusive_granted_window` — início e fim da janela observada por terceira sessão |
| `P16` | `unknown_classid` · `objid` · `objsubid` · `deptype` do dependente não reconhecido |
| `P17-A` | `policy_count_at_precondition` · `sqlstate` · timestamps |
| `P17-B` | `concurrent_operation_state` · `locks_observed` · `POLICY_COUNT_AFTER_COMMIT` · timestamps |
| `D04` | `postcheck_passed_before_failure` · `sqlstate` · `schema_hash_before`/`after` |

### Regra de derivação dos hashes de linhagem

`ordered_sha256_list` é calculado sobre o **conteúdo do blob Git** de cada
item, na ordem do manifesto — **não** sobre os bytes do working tree. Em
checkout Windows com `core.autocrlf = true` os dois divergem (o Hardening H,
por exemplo, tem 179 CRLF no disco e SHA-256 diferente do blob). O runner Linux
observa o conteúdo canônico; congelar o hash do disco produziria aborto
garantido.

## 5. Limitações declaradas — obrigatórias em todo relatório

O relatório final **abre** com estas, não as relega a rodapé:

1. **O container não reproduz o `ALTER DEFAULT PRIVILEGES` da conta Supabase.**
   O fingerprint de ACL é prova **sintática**, não comportamental. Só staging
   fecha.
2. **`auth.uid()` e `auth.role()` são stubs**, não o GoTrue real.
3. **A atomicidade do transporte do Lovable não é testável aqui** — é a
   PROD-0.6E.
4. **`MIGRATION_LINEAGE` pode ser parcial**; quando for, a classificação
   `MIGRATION_LINEAGE_PROOF_PARTIAL` aparece no cabeçalho e o resultado **não**
   é apresentado como equivalência produtiva.
5. **SQL dinâmico** (`EXECUTE format(…)`) escapa dos predicados de referência
   residual.
6. **O extrator não tem classificador SQL-versus-prosa.** A garantia contra
   prosa dentro de um bloco vem inteiramente de `CANONICAL_PER_BLOCK_HASH_PIN`
   (§2.1) — hash congelado por bloco, contra o draft de hoje. Uma revisão
   futura do draft, com um novo congelamento, continua exigindo revisão
   humana no momento do recongelamento; o código não substitui essa revisão.
7. **`workflow fibt-nonprod-proof` nunca foi disparado.** Todas as validações
   deste schema — extração, E18, invariantes, hash-pin — foram exercitadas
   estaticamente (sem PostgreSQL). A confirmação empírica via Tier 1
   (T01–T17) depende de autorização própria (PROD-0.6D) e continua pendente.

## 6. Proibições de conteúdo — absolutas

**Nunca registrar**, em nenhum campo, artefato ou log:

- senha;
- connection string;
- token;
- e-mail real;
- `answers` ou qualquer conteúdo de resposta;
- UUID real de produção ou staging;
- secret de qualquer natureza;
- `polqual`, `polwithcheck` ou qualquer expressão de policy.

Dados sintéticos permitidos: **UUIDs determinísticos** derivados de namespace
própria de teste (UUIDv5), e-mails em `example.invalid`, nomes marcados
`TEST_ONLY`. **Nenhum dado copiado de staging ou produção.**

## 7. Formato e custódia

- Um arquivo por execução, nomeado com `workflow_run` e data.
- Os registros de cenário em formato tabular estável (uma linha por cenário),
  para permitir diff entre execuções.
- Artefatos transitórios vivem sob **`RUNNER_TEMP`** e são removidos no
  encerramento, **inclusive em falha ou cancelamento** — SQLs extraídos, dumps,
  fingerprints temporários, arquivos de coordenação das sessões e logs
  intermediários. Nenhum temporário no workspace versionado.
- Artefatos do run que sobrevivem (dumps normalizados sanitizados, diffs) são
  anexados ao run do GitHub Actions — **não** commitados no repositório.
- O relatório consolidado pode ser versionado em `docs/fibt-prod-proof/`,
  desde que contenha apenas os campos deste schema e nenhuma proibição da §6.

## 8. Critério de conclusão

A PROD-0.6D conclui quando os **68** cenários de L1/L2 tiverem registro
completo e classificação. A contagem é **derivada da tabela canônica** da
`PROD06_SCENARIO_MATRIX.md` §9, e a validação fail-closed exige
`count_documented = count_parsed` e a **mesma contagem nos três documentos**.

**68 `PASS` não autorizam promoção.** Continuam obrigatórios:
`LOVABLE_BATCH_TRANSACTION_CONFIRMED` · aprovação humana de locks e timeouts ·
A aplicada e comprovada · H aplicado e comprovado · inventário produtivo
repetido · `project_ref` reconfirmado · trilha ACL concluída antes da ativação
da FIB-T.
