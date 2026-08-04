# PROD-0.6 — Plano da prova não produtiva da Migration B

> **Status: PLANO. Nada aqui foi executado.**
> Nenhum workflow existe. Nenhum harness existe. Nenhum banco foi criado.
> Nenhum SQL foi executado. Nenhum acesso a Supabase, Lovable ou produção.
>
> Documentos irmãos: `PROD06_SCENARIO_MATRIX.md` ·
> `PROD06_EXECUTION_CHECKLIST.md` · `PROD06_EVIDENCE_SCHEMA.md`.

## Estado canônico no momento deste plano

| Item | Valor |
| --- | --- |
| `origin/main` | `3f8b950` |
| Gate da main | verde |
| Ruleset | ativo · bypass vazio |
| Migrations ativas | 46 · parity OK |
| A / H / B canônicas | `32710cca` · `25cc1d41` · `c0d35c06` |
| `VITE_FIBT_PILOT_ENABLED` | `false` |
| `operational_real_collection_status` | `blocked_until_release_gate` |
| Deployments | 0 |
| Migration B produtiva | existe **apenas** em `docs/fibt-prod/MIGRATION_B_PRODUCTION_DRAFT.sql.disabled` |

## A. Decisão de arquitetura

1. **GitHub Actions com PostgreSQL 17 efêmero é a execução de registro.** Toda
   evidência citável vem de lá.
2. **Docker local é opcional e serve apenas para iteração.** Nunca produz
   evidência de registro.
3. **A prova do executor Lovable ocorrerá depois, exclusivamente em staging.**
4. **Produção permanece fora de todas as provas**, sem exceção e sem etapa
   futura prevista.

### Por que Actions, e não a máquina local

Nenhuma ferramenta de banco está instalada na máquina de desenvolvimento —
`docker`, `podman`, `psql`, `pg_ctl`, `initdb` e `supabase` foram verificados e
estão **ausentes**. Provar sintaxe, transação e locks exige um PostgreSQL real;
não há como contornar isso com engenhosidade.

O runner resolve sem instalação, destrói o ambiente a cada execução, e arquiva
o log amarrado a um commit — evidência auditável em vez de captura de terminal.

## B. Sequência de autorizações

```
PROD-0.6B  documentação (esta)                         → Draft PR, sem execução
PROD-0.6C  workflow + harness INERTES, em PR separado  → revisão
           merge do executor inerte                    → sem disparo
PROD-0.6D  autorização separada do primeiro disparo    → execução
           análise das evidências
PROD-0.6E  prova do executor Lovable, em staging       → autorização própria
```

### Ciclo do `workflow_dispatch` — restrições reais da plataforma

- `workflow_dispatch` **só pode ser disparado depois que o workflow existir na
  branch padrão**. Um workflow que vive apenas numa branch de feature não
  aparece na interface de disparo.
- Por isso a PROD-0.6C cria workflow e harness num **PR separado**, que é
  revisado e **mergeado sem execução**. O merge habilita o disparo; não o
  realiza.
- **Nenhum workflow será disparado a partir de Draft PR.**
- **Service containers exigem runner Linux.** `ubuntu-latest`, nunca Windows ou
  macOS.

## C. Duas camadas de prova — e o que cada uma autoriza afirmar

### L1 — `TARGETED_HARNESS`

Schema mínimo sintético, construído para o teste. Prova: sintaxe ·
preconditions · dependências catalogais · policies · locks · concorrência ·
rollback · pós-checks · fingerprint de ACL · comportamento abaixo de *k* com
stubs.

**Esta camada NÃO autoriza alegar compatibilidade com toda a linhagem de
migrations.** Ela prova que o bloco funciona sobre o schema que ela mesma
montou.

### L2 — `MIGRATION_LINEAGE`

Prova de integração por *replay* ordenado das migrations reais:

1. migrations predecessoras necessárias, na ordem cronológica do repositório;
2. **Migration A canônica** (`20260730150000`, blob `32710cca`);
3. **Hardening H canônico** (`20260730155000`, blob `25cc1d41`);
4. **exclusão explícita da Migration B de staging** (`20260730160000`, blob
   `c0d35c06`) — ela é específica do dataset sintético de staging e abortaria;
5. **draft produtivo extraído** do arquivo aprovado, conforme §D.

Registrar obrigatoriamente: lista exata das migrations · ordem · hashes ·
migrations incompatíveis com PostgreSQL puro · stubs necessários · qualquer
desvio em relação ao Supabase · critérios de classificação.

**Se o replay completo não for possível, o relatório declara
`MIGRATION_LINEAGE_PROOF_PARTIAL`** e o resultado **não** é promovido como
equivalência produtiva.

### O que nenhuma das duas camadas prova

Um container PostgreSQL 17 não é um projeto Supabase. Faltam:

| Ausente no container | Consequência |
| --- | --- |
| papéis `anon`, `authenticated`, `service_role`, `sandbox_exec` | precisam ser criados como stubs |
| o `ALTER DEFAULT PRIVILEGES` da conta, que concede `ALL` por padrão | **o fingerprint de ACL vira prova sintática, não comportamental** |
| schema `auth` com `auth.uid()` e `auth.role()` | o gate interno de H roda contra stub, não contra o GoTrue real |
| o executor do Lovable | a atomicidade do transporte é indemonstrável aqui |

O mecanismo de default privileges é exatamente o que já produziu surpresa duas
vezes neste projeto. Sua ausência no container é a limitação mais relevante
deste plano, e o relatório final precisa declará-la na abertura — não em nota
de rodapé.

## D. Contrato de extração determinística do SQL

**Descomentação indiscriminada do prefixo `--` não é autorizada.** O contrato
tem quinze regras:

1. bloco SQL delimitado por **marcadores únicos**;
2. exatamente **um** marcador inicial;
3. exatamente **um** marcador final;
4. marcador final **posterior** ao inicial;
5. **somente** linhas dentro do bloco podem ser processadas;
6. remover **exatamente um** prefixo de comentário esperado;
7. **rejeitar** linha com formato inesperado;
8. **rejeitar** conteúdo não comentado no arquivo-fonte;
9. gerar o SQL apenas em diretório temporário do runner;
10. **nunca** gravar SQL descomentado no repositório;
11. registrar SHA-256 do **arquivo-fonte**;
12. registrar SHA-256 do **bloco extraído**;
13. registrar SHA-256 do **SQL executado**;
14. provar que o bloco executado corresponde **integralmente** ao documentado;
15. apagar o temporário no encerramento do job.

### Formato do arquivo-fonte — medido, não presumido

Inspeção de `MIGRATION_B_PRODUCTION_DRAFT.sql.disabled` em `3f8b950`:

| Formato de linha | Ocorrências |
| --- | --- |
| `-- ` seguido de conteúdo | 1121 |
| exatamente `--` | 116 |
| linha em branco | 34 |
| **qualquer outro formato** | **0** |
| **total** | **1271** |

O arquivo é integralmente canônico. A regra 6 fica: strip de `-- ` quando a
linha começa com `-- `; linha `--` vira linha vazia; linha em branco é
preservada. **Qualquer outro formato aborta a extração** (regras 7 e 8).

Note que o strip remove **um** nível: uma linha `--   -- comentario` vira
`  -- comentario`, que continua sendo comentário SQL legítimo. É o
comportamento desejado.

### Marcadores — ainda não existem

O arquivo **não possui** hoje um par de marcadores dedicados. `-- BEGIN;` e
`-- COMMIT;` ocorrem **exatamente uma vez cada** (verificado), e por isso
seriam tecnicamente utilizáveis — mas são palavras-chave SQL, e um segundo
`BEGIN` futuro quebraria a unicidade em silêncio.

> **Bloqueador registrado:** a introdução de marcadores dedicados é uma
> **alteração documental separada**, obrigatória **antes** da PROD-0.6C. Ela
> tocará `MIGRATION_B_PRODUCTION_DRAFT.sql.disabled` — arquivo já mergeado — e
> por isso exige autorização própria. Este plano não a executa.

Blocos previstos, cada um com seu par de marcadores: **bloco transacional**
(`BEGIN` … `COMMIT`) · **bloco de ACL antes** (§6.1/6.2, read-only) · **bloco
de ACL depois** (o mesmo, executado após o `COMMIT`).

**Descomentação seletiva permanece proibida**, agora também mecanicamente: o
extrator só aceita o bloco inteiro entre marcadores.

## E. Controles anti-produção

### Sem falsa isolação de rede

**Não se afirma que o runner "não possui rota para produção".** Um runner
hospedado **tem** conectividade externa. A proteção é outra, e é declarada
honestamente:

| Controle | Forma |
| --- | --- |
| **Ausência de credencial** | o job não recebe nenhum secret de banco |
| **Fixação do alvo** | conexão rigidamente `127.0.0.1` ou `localhost` |
| **Sem Environment produtivo** | o job não usa GitHub Environment de produção |
| **Sem OIDC** | o job não solicita token OIDC |
| **Permissões mínimas** | preferencialmente `contents: read` e nada mais |
| **Checkout sem credencial** | `persist-credentials: false` |
| **Sem fallback** | ausência de variável **aborta**; nunca aciona padrão |

O último merece ênfase: foi um fallback silencioso que produziu a regressão de
`528106c`.

### Denylist obrigatória

Aborta se aparecer, em qualquer variável, URL, host ou parâmetro:

- o `project_ref` produtivo completo (`shlmzzchddohaytfakol`);
- o prefixo produtivo `shlm`;
- o domínio produtivo conhecido;
- **qualquer host que não seja `localhost` ou `127.0.0.1`**, na etapa Actions.

Nenhuma variável `SUPABASE_URL`, `DATABASE_URL` ou equivalente pode apontar
para alvo remoto. A presença de uma dessas apontando para fora é aborto, não
aviso.

### Confirmação não interativa

O futuro `workflow_dispatch` exigirá três inputs. **Nenhum prompt interativo
dentro do job.**

| Input | Valor |
| --- | --- |
| `proof_target` | valor único permitido: `LOCAL_PG17_ONLY` |
| `acknowledgement` | valor exato: `I_CONFIRM_NONPROD_EPHEMERAL_PG17` |
| `source_commit` | SHA **integral** do commit que contém o draft aprovado |

O job aborta **antes de inicializar o harness** se: algum input faltar · algum
valor divergir · `source_commit` não corresponder ao checkout · o alvo não for
local · qualquer segredo de banco remoto estiver presente.

## F. PostgreSQL e clientes

O plano de execução deverá: usar **runner Linux** · fixar **PostgreSQL major
17** · preferir **imagem imutável por digest** · registrar imagem, digest e o
retorno de `SELECT version()` · **não presumir** que `psql` e `pg_dump`
corretos já existem no runner · escolher explicitamente como os clientes PG17
serão fornecidos · garantir **cliente e servidor na mesma major** · permitir
**múltiplas sessões concorrentes** · executar `psql` em modo **fail-fast** ·
**impedir leitura de configuração pessoal** de `psql`.

### Como fornecer o cliente — comparação, sem decisão ainda

| | Como | Vantagem | Risco |
| --- | --- | --- | --- |
| **A. Cliente dentro do próprio container** | `docker exec` no service container | major garantidamente idêntica | sessões concorrentes e arquivos ficam menos naturais |
| **B. Job container com cliente PG17** | o job inteiro roda numa imagem que já traz o cliente | ambiente reprodutível por digest | duas imagens para versionar |
| **C. Instalação explícita no runner** | repositório PGDG, versão fixada | máxima flexibilidade | mais passos, e a major precisa ser fixada à mão |

**Não implementar ainda.** A escolha entra na PROD-0.6C.

Modo fail-fast previsto: `psql -v ON_ERROR_STOP=1 --no-psqlrc`, com o
`--no-psqlrc` cumprindo a regra de não ler configuração pessoal.

## G. Rollback e dumps

A comparação de schema antes × depois usará:

- `pg_dump` da **mesma major** do servidor;
- `--schema-only` · `--no-owner` · `--no-privileges`;
- **chave de `restrict` fixa**, exclusivamente para comparação de teste;
- normalização documentada (remoção de cabeçalho com data e versão de cliente,
  ordenação estável);
- **hash do dump normalizado antes** e **depois**;
- **diff textual**;
- **fingerprint catalogal complementar** — a comparação não depende só do dump.

Registrado explicitamente:

- dump idêntico é **evidência forte, não única**;
- diferenças aleatórias e metadados de cliente **devem ser eliminados** pela
  normalização, e a normalização é parte da evidência;
- **dados não são incluídos** — apenas schema;
- o dump é **artefato de teste**, jamais backup produtivo.

### Cenário obrigatório de rollback pós-DDL

Erro deliberado **depois do `DROP COLUMN`** → `ROLLBACK` → coluna restaurada ·
FK restaurada · funções restauradas · schema antes/depois equivalente ·
nenhum lock ou transação órfã. Sem ele, provaríamos rollback antes do DDL e
não depois — que é o caso que importa.

## H. Prova do executor Lovable — PROD-0.6E

**Não usa tabela temporária.** Uma tabela temporária desaparece com a sessão e
não distingue rollback de encerramento de conexão — provaria pouco.

Desenho:

- **schema dedicado e explicitamente não produtivo**;
- **objeto permanente de sonda**, com nome único;
- bloco `BEGIN … COMMIT`;
- `SET LOCAL`;
- aquisição de lock;
- criação do objeto;
- **falha deliberada**;
- consulta posterior, **em chamada separada**, confirmando que o objeto **não
  persiste**.

Registrar: backend PID ou outro identificador disponível · estado transacional
observado · valor de `SET LOCAL` dentro do bloco · ausência do objeto depois
do erro · ausência de locks remanescentes.

Se o objeto **persistir**: `LOVABLE_BATCH_TRANSACTION_CONFIRMED=false` ·
**NO-GO** · limpeza **somente mediante autorização separada** · redesenho do
mecanismo de aplicação — não da migration.

**A prova não pode tocar** `wave_responses` · `wave_invites` · `waves` ·
`wave_cohorts` · nenhuma tabela funcional da FIB-T.

## I. Dados sintéticos

- **UUIDs determinísticos** gerados a partir de **namespace própria de teste**
  (UUIDv5 com namespace documentada), não "prefixo reservado" — prefixo não é
  garantia de nada;
- conjunto inteiro **documentado como sintético**;
- e-mails em `example.invalid`;
- nomes marcados `TEST_ONLY`;
- **nenhum dado copiado** de staging ou produção, em nenhuma hipótese.

## J. Riscos ainda abertos

1. **O container não reproduz o `ALTER DEFAULT PRIVILEGES` da conta Supabase.**
   O fingerprint de ACL passa a ser prova sintática. Só staging fecha isso.
2. **Stubs de `auth.uid()`/`auth.role()` são aproximação** do GoTrue real.
3. **Marcadores de extração não existem** — bloqueiam a PROD-0.6C até uma
   alteração documental separada.
4. **Risco de falso conforto.** Uma matriz majoritariamente verde pode ser lida
   como "está provado". Não está: os itens que dependem da plataforma real
   continuam abertos, e o relatório deve abrir com isso.
5. **`MIGRATION_LINEAGE` pode sair parcial** se alguma migration predecessora
   depender de extensão ou papel do Supabase. Nesse caso a classificação é
   `MIGRATION_LINEAGE_PROOF_PARTIAL`, e não se promove equivalência.
6. **Adicionar workflow é mudança na branch padrão** — precisa de revisão
   própria, e o `workflow_dispatch` só existe depois do merge.

## K. O que este plano explicitamente não autoriza

Criar workflow · executar GitHub Actions · criar harness · executar PostgreSQL
· instalar Docker ou PostgreSQL · acessar Supabase, Lovable, staging ou
produção · executar SQL · alterar banco · promover `.sql.disabled` · criar
migration ativa · Publish · ativar FIB-T · alterar ACL · alterar
`sandbox_exec` · alterar feature flag · alterar release gate.
