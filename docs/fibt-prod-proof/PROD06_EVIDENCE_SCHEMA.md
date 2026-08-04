# PROD-0.6 — Schema de evidência da prova não produtiva

> **Status: PLANO. Nenhuma evidência foi coletada.**
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
| `postgres_version` | retorno de `SELECT version()` | texto integral |
| `client_version` | `psql --version` / `pg_dump --version` | texto |
| `client_server_major_match` | comparação | `true` \| `false` |
| `layer` | camada | `L1_TARGETED_HARNESS` \| `L2_MIGRATION_LINEAGE` |
| `lineage_classification` | só em L2 | `INTEGRAL` \| `MIGRATION_LINEAGE_PROOF_PARTIAL` |
| `started_at` / `finished_at` | timestamps ISO-8601 UTC | |

`source_commit_matches_checkout = false` ou
`client_server_major_match = false` → o run **aborta** e não produz registros
de cenário.

## 2. Bloco de extração — uma vez por bloco extraído

| Campo | Descrição |
| --- | --- |
| `source_file` | caminho do arquivo-fonte no repositório |
| `source_sha256` | SHA-256 do **arquivo-fonte inteiro** |
| `marker_begin` / `marker_end` | marcadores usados |
| `marker_begin_count` / `marker_end_count` | devem ser `1` e `1` |
| `extracted_block_sha256` | SHA-256 do **bloco extraído**, antes do strip |
| `executed_sql_sha256` | SHA-256 do **SQL efetivamente executado** |
| `line_count_total` / `line_count_stripped` | contagens |
| `rejected_lines` | linhas em formato inesperado — deve ser `0` |
| `correspondence_proven` | `true` só se o executado corresponder integralmente ao documentado |
| `temp_path_removed` | `true` no encerramento |

Qualquer contagem de marcador diferente de `1`, qualquer linha rejeitada, ou
`correspondence_proven = false` → **aborta antes de conectar ao banco**.

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

## 4. Campos específicos de certos cenários

| Cenário | Campo adicional |
| --- | --- |
| `C01` | `pg_get_function_result_literal` — a **string exata** devolvida pelo PostgreSQL 17, conferida contra o contrato canônico |
| `E02` | `lineage_migrations` — lista ordenada com nome e hash de cada migration aplicada, e a lista das **excluídas** com o motivo |
| `E02` | `incompatible_migrations` — as que não rodam em PostgreSQL puro, com o motivo |
| `E02` | `stubs_required` — stubs criados para viabilizar o replay |
| `E02` | `supabase_deviations` — desvios conhecidos em relação ao ambiente real |
| `K01`–`K03` | `k_behavior` — `visible`, `response_count`, `response_count_label`, presença/ausência dos agregados, `suppression_reason` |
| `L02` | `lock_timeout_measured_ms` — tempo real até o erro |
| `L08` | `access_exclusive_granted_window` — início e fim da janela observada por terceira sessão |

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
- Artefatos do run (dumps normalizados, diffs) anexados ao run do GitHub
  Actions — **não** commitados no repositório.
- O relatório consolidado pode ser versionado em `docs/fibt-prod-proof/`,
  desde que contenha apenas os campos deste schema e nenhuma proibição da §6.

## 8. Critério de conclusão

A PROD-0.6D conclui quando os **51** cenários de L1/L2 tiverem registro
completo e classificação.

**51 `PASS` não autorizam promoção.** Continuam obrigatórios:
`LOVABLE_BATCH_TRANSACTION_CONFIRMED` · aprovação humana de locks e timeouts ·
A aplicada e comprovada · H aplicado e comprovado · inventário produtivo
repetido · `project_ref` reconfirmado · trilha ACL concluída antes da ativação
da FIB-T.
