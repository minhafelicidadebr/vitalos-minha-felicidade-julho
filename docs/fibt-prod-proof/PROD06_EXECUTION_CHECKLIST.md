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

## Bloqueador anterior à PROD-0.6C

- [ ] **Marcadores de extração introduzidos** em
      `docs/fibt-prod/MIGRATION_B_PRODUCTION_DRAFT.sql.disabled`.

Eles **não existem hoje**. A introdução altera um arquivo já mergeado e exige
**autorização documental separada**. Sem ela, o contrato de extração (§D do
plano) não pode ser implementado, e a PROD-0.6C fica bloqueada.

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
- [ ] **Nenhum** GitHub Environment produtivo.
- [ ] **Nenhum** token OIDC solicitado.
- [ ] **Nenhum** secret de banco no job.
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
- [ ] Estratégia de cliente escolhida entre A (dentro do container), B (job
      container) ou C (instalação versionada) — decisão da PROD-0.6C.
- [ ] Múltiplas sessões concorrentes possíveis (cenários L01–L10).
- [ ] `psql` em modo fail-fast (`ON_ERROR_STOP=1`).
- [ ] Configuração pessoal de `psql` **não lida** (`--no-psqlrc`).

## Extração do SQL — as quinze regras

- [ ] Bloco delimitado por **marcadores únicos**.
- [ ] Exatamente **um** marcador inicial · exatamente **um** final · final
      **posterior** ao inicial.
- [ ] **Somente** linhas dentro do bloco processadas.
- [ ] Removido **exatamente um** prefixo de comentário esperado.
- [ ] Linha em formato inesperado → **rejeita**.
- [ ] Conteúdo **não comentado** no arquivo-fonte → **rejeita**.
- [ ] SQL gerado **apenas** em diretório temporário do runner.
- [ ] **Nunca** gravar SQL descomentado no repositório.
- [ ] Registrados: SHA-256 do **arquivo-fonte** · do **bloco extraído** · do
      **SQL executado**.
- [ ] Provado que o executado corresponde **integralmente** ao documentado.
- [ ] Temporário **apagado** no encerramento do job.

**Descomentação seletiva é proibida** — o extrator só aceita o bloco inteiro
entre marcadores.

## Camadas

- [ ] **L1 `TARGETED_HARNESS`** montado: schema mínimo · stubs de `auth` e
      papéis · estado pré-A · A canônica · H canônico · baseline zero.
- [ ] **L2 `MIGRATION_LINEAGE`** por replay ordenado, com a Migration B de
      staging **explicitamente excluída**.
- [ ] Registrados: lista exata · ordem · hashes · incompatibilidades com
      PostgreSQL puro · stubs necessários · desvios em relação ao Supabase.
- [ ] Classificação declarada: **integral** ou
      **`MIGRATION_LINEAGE_PROOF_PARTIAL`**.

Se parcial, **não promover como equivalência produtiva**.

## Execução dos cenários

- [ ] Os **51** cenários de L1/L2 executados (`PROD06_SCENARIO_MATRIX.md`).
- [ ] Cada um classificado `PASS` · `FAIL` · `INCONCLUSIVE`.
- [ ] Controle negativo P13n executado — trigger sem `invite_token` **não**
      bloqueia.
- [ ] L08 executado — terceira sessão observando `pg_locks` durante o bloco.
- [ ] D03 executado — falha deliberada **depois do `DROP COLUMN`**.
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

## Encerramento do job

- [ ] Temporário com o SQL descomentado **apagado**.
- [ ] Container destruído (automático no fim do job).
- [ ] Evidências emitidas conforme `PROD06_EVIDENCE_SCHEMA.md`.
- [ ] Nenhuma credencial, token, e-mail real, `answers`, UUID real ou secret
      em qualquer artefato.

## Critérios de NO-GO — qualquer um basta

Marcadores ausentes ou duplicados · hash divergente em qualquer das três
etapas de extração · host não local detectado · input de disparo incorreto ·
`source_commit` divergente do checkout · cliente de major diferente do servidor
· qualquer `FAIL` em cenário de precondition ou de rollback · dump antes ≠
depois num cenário de falha · lock ou transação órfã · classificação
`MIGRATION_LINEAGE_PROOF_PARTIAL` sendo apresentada como integral.

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
