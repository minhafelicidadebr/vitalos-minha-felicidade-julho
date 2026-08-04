# PROD-0.6 — Checklist de execução da prova não produtiva

> **Nada aqui foi executado.** Roteiro para quando (e se) a PROD-0.6D for
> autorizada. **Este checklist não autoriza execução.**
>
> Plano: `PROD06_NONPROD_PROOF_PLAN.md` · Cenários:
> `PROD06_SCENARIO_MATRIX.md` · Evidência: `PROD06_EVIDENCE_SCHEMA.md`.

## Ordem das ondas

```
PROD-0.6B documentação (esta) ✅
PROD-0.6C workflow + harness inertes, PR separado ⏸ → revisão → merge sem disparo
PROD-0.6D primeiro disparo manual ⏸
PROD-0.6E prova do executor Lovable, em staging ⏸
```

Nenhuma onda encadeia automaticamente na seguinte.

## Bloqueadores anteriores à PROD-0.6C

- [x] **Marcadores multibloco introduzidos** — agora 13 pares `B001`–`B013` em
      `docs/fibt-prod/MIGRATION_B_PRODUCTION_DRAFT.sql.disabled`, com
      preservação byte a byte comprovada (Prova A e Prova B, ver plano).
- [x] **`CREATE OR REPLACE submit_sector_response` acrescentado ao draft**
      (PROD-0.6B-FUNCBODY). Bloco `B007`, byte-idêntico à SPEC §J e à Migration
      B canônica de staging. `B007`–`B012` antigos renumerados para
      `B008`–`B013`; conteúdo pré-existente inalterado (confirmado por hash).
      O pós-check §5.6 (bloco `B010`) agora encontra a função já substituída —
      o caminho feliz deixa de ser bloqueado por construção.
- [ ] **Extrator adaptado ao contrato multibloco de 13 blocos** — o de
      `69cca10` (PR #37) presume um único par de marcadores e ainda não conhece
      `B001`–`B013`. Ver seção "Impacto no PR #37" no handoff.

Enquanto o extrator do PR #37 não for adaptado, a PROD-0.6C fica bloqueada —
mas o corpo da função deixou de ser um bloqueador.

## Pré-execução — PROD-0.6D

- [ ] **Autorização humana escrita**, específica para este disparo.
- [ ] O PR da PROD-0.6C **mergeado na branch padrão** — `workflow_dispatch` não
      aparece a partir de branch de feature nem de Draft PR.
- [ ] `origin/main` sem commits novos não revisados · gate verde · ruleset ativo
      com bypass vazio.
- [ ] 46 migrations · parity OK · A/H/B byte-idênticas.
- [ ] `VITE_FIBT_PILOT_ENABLED` ainda `false`.
- [ ] `operational_real_collection_status` ainda `blocked_until_release_gate`.
- [ ] Zero deployments.
- [ ] Nenhuma outra alteração de schema em andamento.

## Inputs obrigatórios do disparo

| Input | Valor exigido |
| --- | --- |
| `proof_target` | `LOCAL_PG17_ONLY` |
| `acknowledgement` | `I_CONFIRM_NONPROD_EPHEMERAL_PG17` |
| `source_commit` | SHA **integral** do commit que contém o draft aprovado |

- [ ] Os três informados.
- [ ] `source_commit` **corresponde ao checkout** do job.

**Sem prompt interativo dentro do job.** O job aborta **antes de inicializar o
harness** se algum input faltar, divergir, ou se `source_commit` não bater.

## Guardrails de ambiente — verificados pelo job, não pelo operador

- [ ] Runner **Linux** (`ubuntu-latest`) — service containers exigem.
- [ ] Permissões do job: preferencialmente `contents: read` e nada mais.
- [ ] `persist-credentials: false` no checkout.
- [ ] **Nenhum** GitHub Environment — nem produtivo **nem de staging**.
- [ ] **Nenhum** token OIDC solicitado.
- [ ] **Nenhum** secret de banco no job — nem produtivo, **nem de staging**.
- [ ] Ausentes do job: `SUPABASE_URL` · `DATABASE_URL` remoto · service role
      key · anon key · token Lovable. A presença de qualquer uma **aborta antes
      do harness**.
- [ ] Host de conexão **rigidamente** `127.0.0.1` ou `localhost`.
- [ ] Denylist ativa: `shlmzzchddohaytfakol` · prefixo `shlm` · domínio
      produtivo · qualquer host que não seja local.
- [ ] Nenhuma variável `SUPABASE_URL`, `DATABASE_URL` ou equivalente apontando
      para alvo remoto.
- [ ] **Ausência de variável aborta** — nunca aciona fallback.

> Não se afirma que o runner "não tem rota para produção". Ele tem
> conectividade externa. A proteção vem da **ausência de credencial** e da
> **fixação do alvo local** — e é assim que deve ser descrita no relatório.

## PostgreSQL e clientes

- [ ] PostgreSQL **major 17** fixado.
- [ ] Imagem **imutável por digest**.
- [ ] Registrados: imagem · digest · retorno de `SELECT version()`.
- [ ] Cliente `psql`/`pg_dump` da **mesma major** do servidor — **não presumir**
      que o runner já traz a versão correta.
- [ ] **`CLIENT_STRATEGY = SERVICE_CONTAINER_EXEC_STDIN`** — `psql` e `pg_dump`
      executados **dentro** do service container, via `docker exec`, com ID
      obtido de `job.services.pg17.id`.
- [ ] SQL enviado por **stdin**:
      `docker exec -i "$PG_CONTAINER_ID" psql … < "$RUNNER_TEMP/…sql"`.
- [ ] **Não usar `docker cp`** · **não presumir workspace montado** no service
      container.
- [ ] Registrados: container ID (mascarado quando necessário) ·
      `psql --version` · `pg_dump --version` · `SELECT version()` · imagem ·
      digest.
- [ ] Múltiplas sessões concorrentes possíveis (cenários L01–L10) — cada
      `docker exec` é uma sessão independente.
- [ ] `psql` em modo fail-fast (`ON_ERROR_STOP=1`).
- [ ] Configuração pessoal de `psql` **não lida** (`--no-psqlrc`).

## Extração do SQL — `EXPLICIT_MULTIPLE_EXECUTABLE_BLOCKS`

- [ ] **`FIBT_PROD_B_EXPECTED_BLOCK_COUNT = 13`** conferido.
- [ ] Marcadores de formato exato `-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:Bnnn` /
      `…_END:Bnnn`, ocupando a linha inteira.
- [ ] Sequência `B001…B013` **sem lacuna** e **sem ID repetido**.
- [ ] Um `BEGIN` e um `END` por ID · `END` depois do `BEGIN` · **sem
      aninhamento** · **nenhum bloco vazio**.
- [ ] **Somente** linhas dentro dos blocos processadas.
- [ ] Removido **exatamente um** prefixo de comentário esperado.
- [ ] Linha em formato inesperado → **rejeita**.
- [ ] Blocos concatenados na **ordem física**, com newline determinístico.
- [ ] SQL gerado **apenas** em **`RUNNER_TEMP`**.
- [ ] **Nunca** gravar SQL descomentado no workspace **nem dentro do
      container** — o transporte é por stdin.
- [ ] Registrados: **hash por bloco** e **hash agregado**.
- [ ] `SOURCE_WITHOUT_MARKERS_AND_NEW_BLOCK_SHA256` confere com o blob do
      draft em `origin/main`.
- [ ] `DRAFT_B007_FUNCTION_SHA256` confere com `SPEC_J_FUNCTION_SHA256` e com
      `CANONICAL_B_FUNCTION_SHA256`.
- [ ] Temporários **apagados** no encerramento.

**Proibido:** `BEGIN`/`COMMIT` como marcador · regex de palavra-chave para
decidir executabilidade · remoção global de `--` · seleção manual de linhas
durante a execução · **fallback** quando os marcadores falharem.

Hashes sempre sobre o **conteúdo do blob Git (LF)**, nunca sobre o working
tree — `core.autocrlf` faz os dois divergirem, e o runner Linux vê o primeiro.

**Descomentação seletiva é proibida** — o extrator só aceita blocos inteiros
entre marcadores declarados.

> **✅ Resolvido (PROD-0.6B-FUNCBODY):** a §3b do draft **contém agora** o
> `CREATE OR REPLACE FUNCTION public.submit_sector_response(...)`, como bloco
> `B007`. A transação concatenada passa pela substituição da função antes do
> `DROP CONSTRAINT`, e o pós-check §5.6 (bloco `B010`) encontra o corpo já sem
> referência a `invite_token`. O caminho feliz deixa de estar bloqueado por
> construção — falta apenas a execução real do Tier 1 para confirmação
> empírica.

## Camadas

- [ ] **L1 `TARGETED_HARNESS`** montado: schema mínimo · stubs de `auth` e
      papéis · estado pré-A · A canônica · H canônico · baseline zero.
- [ ] **L2 `MIGRATION_LINEAGE`** por replay do **manifesto congelado** —
      **45 itens**, ordinal 1 a 45, prefixo lexicográfico até o Hardening H
      inclusive. O runtime **não recalcula** o conjunto a partir do diretório.
- [ ] `LINEAGE_MANIFEST_OBSERVED_COUNT = 45`.
- [ ] `ordered_path_list_hash` = `c5c8e2ae…` ·
      `ordered_blob_hash_list` = `f0619f68…` ·
      `ordered_sha256_list` = `cbea0c5b…`.
- [ ] SHA-256 calculado sobre o **conteúdo do blob** (LF canônico), **não**
      sobre os bytes do working tree — `core.autocrlf` altera o segundo.
- [ ] Denylist da B de staging ativa por **caminho**, **blob**
      (`c0d35c06…`) e **SHA-256** (`3f2a6750…`) — aborta se aparecer.
- [ ] Aborta se: faltar arquivo · surgir arquivo adicional · caminho mudar ·
      ordem mudar · blob mudar · SHA-256 mudar · contagem ≠ 45 · commit-fonte
      divergir.
- [ ] Registrados: incompatibilidades com PostgreSQL puro · stubs necessários ·
      desvios em relação ao Supabase.
- [ ] Classificação declarada: **`INTEGRAL`** · **`PARTIAL`** · **`FAILED`**.

Se `PARTIAL` ou `FAILED`, **não promover como equivalência produtiva** — e
**nunca** selecionar outro subconjunto para conseguir passar.

## Execução dos cenários

- [ ] Os **68** cenários de L1/L2 executados (tabela canônica da
      `PROD06_SCENARIO_MATRIX.md` §9), incluindo `E18` —
      `REQUIRED_FUNCTION_BODY_PRESENT`, específico do bloco `B007`.
- [ ] Cada um classificado `PASS` · `FAIL` · `INCONCLUSIVE`.
- [ ] Validação fail-closed da matriz: IDs únicos · nenhum cenário sem
      resultado esperado · nenhum sem evidência · `count_documented =
      count_parsed` · **mesma contagem nos três documentos**.
- [ ] Controles negativos P13n e R02 executados — não bloqueiam.
- [ ] L03 executado — **`ATTEMPT_COUNT = 1`**, provado por PIDs e
      `pg_stat_activity`, não por ausência da palavra "retry" no log.
- [ ] L08 executado — terceira sessão observando `pg_locks` durante o bloco.
- [ ] D03 executado — falha deliberada **depois do `DROP COLUMN`**.
- [ ] D04 executado — falha deliberada **depois de um pós-check**, antes do
      `COMMIT`.
- [ ] P16 executado — dependência de **catálogo desconhecido** aborta.
- [ ] P17-A e P17-B executados — corrida de policy; **nenhum `PASS` silencioso
      com policy presente**.
- [ ] C01 executado — string literal de `pg_get_function_result` **observada e
      registrada**.
- [ ] K01–K03 executados — comportamento abaixo de *k*.
- [ ] X01–X09 executados — falhas do próprio aparato.

## Rollback e dumps

- [ ] `pg_dump` da **mesma major** do servidor.
- [ ] `--schema-only` · `--no-owner` · `--no-privileges`.
- [ ] Chave de `restrict` **fixa**, exclusivamente para comparação de teste.
- [ ] Normalização **documentada** (cabeçalho com data e versão de cliente
      removido; ordenação estável) — a normalização é parte da evidência.
- [ ] Hash do dump normalizado **antes** e **depois**.
- [ ] **Diff textual** produzido.
- [ ] **Fingerprint catalogal complementar** — a comparação não depende só do
      dump.
- [ ] Ausência de transação órfã (`pg_stat_activity`) e de lock remanescente
      (`pg_locks`).

Registrado: dump idêntico é **evidência forte, não única** · diferenças
aleatórias e metadados de cliente **eliminados** pela normalização · **sem
dados**, apenas schema · o dump é **artefato de teste**, jamais backup
produtivo.

## Encerramento do job — inclusive em falha ou cancelamento

Tudo sob **`RUNNER_TEMP`**: SQLs extraídos · dumps · fingerprints temporários ·
arquivos de coordenação das sessões · logs intermediários sem dado sensível.
**Nenhum temporário no workspace versionado.**

- [ ] SQL descomentado **removido**.
- [ ] Dumps temporários **removidos**.
- [ ] Arquivos de sinalização **removidos**.
- [ ] Mantidos apenas os artefatos explicitamente aprovados e sanitizados.
- [ ] Container destruído (automático no fim do job).
- [ ] Evidências emitidas conforme `PROD06_EVIDENCE_SCHEMA.md`.
- [ ] Nenhuma credencial, token, e-mail real, `answers`, UUID real ou secret
      em qualquer artefato.

## Critérios de NO-GO — qualquer um basta

Marcadores ausentes ou duplicados · hash divergente em qualquer das três
etapas de extração · **manifesto congelado divergente em contagem, ordem,
caminho, blob ou SHA-256** · **B de staging presente no conjunto** · host não
local detectado · credencial de produção **ou de staging** presente · input de
disparo incorreto · `source_commit` divergente do checkout · cliente de major
diferente do servidor · qualquer `FAIL` em cenário de precondition ou de
rollback · dump antes ≠ depois num cenário de falha · lock ou transação órfã ·
`ATTEMPT_COUNT > 1` em L03 · `PASS` em P17-B com policy presente ·
classificação `PARTIAL` ou `FAILED` sendo apresentada como integral ·
contagem divergente entre os três documentos.

## Depois da PROD-0.6D — o que NÃO acontece automaticamente

Não promove o `.sql.disabled` · não cria migration em `supabase/migrations/` ·
não aplica A, H ou B · não libera Publish · não ativa a FIB-T · não altera
feature flag nem release gate · não resolve a trilha ACL · **não substitui a
prova do executor Lovable**, que é a PROD-0.6E.

## Continuam obrigatórios antes de qualquer promoção

`LOVABLE_BATCH_TRANSACTION_CONFIRMED` · prova sintática e comportamental em
PostgreSQL 17 não produtivo (esta) · aprovação humana de locks e timeouts ·
Migration A aplicada e comprovada · Hardening H aplicado e comprovado ·
inventário produtivo repetido · `project_ref` reconfirmado · **trilha ACL
concluída antes da ativação da FIB-T**.

## Registro pós-execução

Atualizar (não duplicar): `docs/fibt-isg/FIBT2_RUNBOOK_MIGRATION_PRODUCAO.md`
(seção datada com a classificação de cada cenário) ·
`docs/fibt-isg/FIBT_DECISION_LEDGER.md` (decisão registrada).
