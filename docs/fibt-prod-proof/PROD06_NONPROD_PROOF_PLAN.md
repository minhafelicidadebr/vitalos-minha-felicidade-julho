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

### L2 — `MIGRATION_LINEAGE` · manifesto congelado

Prova de integração por *replay* ordenado. O conjunto **não é escolhido por
julgamento** — é derivado mecanicamente e **congelado**.

#### Derivação (feita uma vez, no commit-fonte aprovado)

1. listar `supabase/migrations/*.sql`;
2. ordenar **lexicograficamente pelo nome completo**;
3. selecionar o prefixo **até o Hardening H, inclusive**
   (`20260730155000_cohort_aggregate_privacy_hardening.sql`);
4. excluir qualquer arquivo posterior ao H;
5. comprovar que `20260730160000_drop_response_invite_link_contract.sql` **não
   pertence** ao conjunto;
6. verificar dependências entre as migrations selecionadas.

**"Todas as migrations menos uma" não é critério operacional.** O corte é
posicional (prefixo até H), e a denylist é uma segunda barreira independente.

#### Congelamento

`MIGRATION_LINEAGE_FROZEN_MANIFEST` — derivado no commit `3f8b950`.

| Campo | Valor |
| --- | --- |
| `LINEAGE_MANIFEST_EXPECTED_COUNT` | **45** |
| primeiro item | `20260630161949_f66dfbc5-…sql` (ordinal 1) |
| último item | `20260730155000_cohort_aggregate_privacy_hardening.sql` (ordinal 45) |
| `ordered_path_list_hash` | `c5c8e2aed3b4f45a83934157e81e3433e7387c0d8f6d42d092afbb6c7f57db8a` |
| `ordered_blob_hash_list` | `f0619f6833ebbdc2f8c877a2d1df83dd7f861515517bc3a87c332ae7a09377cd` |
| `ordered_sha256_list` | `cbea0c5b744e1c22ee0bc5129f41ba51faca81b2759ac0f8e8a84ecf515a3aec` |
| `MIGRATION_A` | ordinal 44 · blob `32710cca979f` |
| `HARDENING_H` | ordinal 45 · blob `25cc1d41c828` |
| B de staging | **ausente do conjunto** |

> **Regra de normalização de EOL — não é detalhe.** O SHA-256 de cada item é
> calculado sobre o **conteúdo do blob Git** (bytes canônicos, LF), **não**
> sobre os bytes do working tree. Neste repositório `core.autocrlf = true`, e
> a cópia local do H tem 179 CRLF: o SHA-256 do arquivo em disco é
> `a38a17a4…`, enquanto o do blob é `461613bb…`. Um runner Linux enxerga o
> segundo. Congelar o hash do disco produziria aborto garantido no runner —
> por isso o manifesto abaixo é derivado de `git cat-file blob`.

##### Manifesto — 45 itens, ordinal · nome · blob (12) · SHA-256 do blob (16) · bytes

| # | Arquivo | Blob | SHA-256 | Bytes |
| --- | --- | --- | --- | --- |
| 1 | `20260630161949_f66dfbc5-a7f1-4cea-94c3-0f7860edc50a.sql` | `f8e50034a417` | `4ef98f0f861e6dd9` | 4666 |
| 2 | `20260701150019_25f40616-ea74-469f-87b7-21f5620b1f88.sql` | `c3e600b0bd4b` | `142335bb3f728a37` | 900 |
| 3 | `20260701151433_63111577-d87c-4eba-ada6-6d31d1e295ad.sql` | `f8834c5a6d77` | `d29196d731710255` | 203 |
| 4 | `20260701190842_2b28078c-9500-4114-a690-86b3a8be5a8a.sql` | `c9c3fe1c0a7d` | `e114d1af0a77b0ed` | 386 |
| 5 | `20260703120000_reconcile_prod_drift.sql` | `e7fe762721a3` | `c1c8eec593f567fa` | 4306 |
| 6 | `20260703130000_revoke_profile_self_elevation.sql` | `251e29807357` | `ca3bcdb6beb69c77` | 2641 |
| 7 | `20260703140000_provision_organization_from_invite.sql` | `5388e9bb40f0` | `e3f52642e8b80188` | 5351 |
| 8 | `20260703150000_submit_wave_response_atomic.sql` | `50fa1538f5d0` | `bc343422806c1a52` | 4632 |
| 9 | `20260703160000_wave_lifecycle_and_capsule_upsert.sql` | `53e63fbffcad` | `b046d03fc552f353` | 2144 |
| 10 | `20260703170000_fix_profile_revoke_table_level_grant.sql` | `5297f63f30ff` | `a949e03344fd09db` | 2306 |
| 11 | `20260703203653_aef6adcc-60fe-4bc4-b9b6-0fbd11f276f5.sql` | `337003856e1e` | `6e1a72a3870ec622` | 5210 |
| 12 | `20260703203735_ba81502c-14bb-4b17-adef-5b669b24f5bd.sql` | `1867e8941d7a` | `c610334f6bbc5e29` | 117 |
| 13 | `20260703220000_learning_persistence.sql` | `fb52eb65fb51` | `bfa0d36989e8ecdf` | 4277 |
| 14 | `20260703230000_revoke_learning_default_privileges.sql` | `cfc57d7fa5a2` | `bbd001d0b5a9f8df` | 2451 |
| 15 | `20260704010715_59513b08-e81b-461c-8374-e4ba6208a1ac.sql` | `12b8b149da5d` | `e18435326301ca69` | 1748 |
| 16 | `20260704011436_40dc7842-94e7-4a0e-8fc4-1181d42953d4.sql` | `6bc4be093b26` | `f2d9faba59a98e3e` | 143 |
| 17 | `20260705100000_action_plan_ledger.sql` | `206fcf0caddc` | `6c44bebea3d12971` | 21093 |
| 18 | `20260705120000_devolutiva_sessions.sql` | `d14bd8bdc0e8` | `4173cfc8a7b6dca8` | 10113 |
| 19 | `20260705130000_org_cycle_registry.sql` | `71229b08ac91` | `d5e15de256d54312` | 6080 |
| 20 | `20260705160043_9800f3be-4083-4ea3-80d4-833731eeed31.sql` | `57d58fb5039f` | `5b6812e8fbae91a0` | 3729 |
| 21 | `20260706100000_esg_report_snapshots.sql` | `336b5e30ac4a` | `e3db1f9d31240306` | 4631 |
| 22 | `20260706110000_personal_assessments.sql` | `3950b8fb25fc` | `5c81dcf043b28ae7` | 4611 |
| 23 | `20260706120000_victory_records.sql` | `952a11f118d9` | `9d9e2693bd1db043` | 5134 |
| 24 | `20260706130000_item_funnel_events.sql` | `1f180f1c0928` | `5829f4b94f10a021` | 4900 |
| 25 | `20260708120000_sector_links.sql` | `33dfc7edd644` | `856e0ffd08a9419e` | 5684 |
| 26 | `20260708130000_ops_events.sql` | `ede725c4fb64` | `7ceb4a31998fd71c` | 2723 |
| 27 | `20260709135007_134c37d3-9731-494a-bb72-13990acb10fe.sql` | `9ef80ef42126` | `86cca1d00e5a7e87` | 5180 |
| 28 | `20260709135233_a1fc1bc5-b8d4-4066-8867-f14f1c610b4f.sql` | `31470b2edac7` | `55741acf79bd9988` | 2434 |
| 29 | `20260709140000_leads.sql` | `1fde005d6077` | `b2cbab53056b4298` | 3081 |
| 30 | `20260709150000_practice_entries.sql` | `d9ca352004af` | `5501a904ed54e760` | 4018 |
| 31 | `20260709160000_seed_events.sql` | `ad5d72bf4c88` | `7d5921007b2cb59d` | 3678 |
| 32 | `20260710115614_463d3c6b-5ee1-439d-b1c6-d7b791d7a9e3.sql` | `f1fce9d24528` | `658276f66e8db997` | 889 |
| 33 | `20260710121521_ac98d677-9213-43f8-91c3-d3b21c8c0faa.sql` | `027b7d63fdb3` | `17db4fd369edb924` | 9 |
| 34 | `20260710130000_pair_directory.sql` | `7bbd9c245ca2` | `df13c8c3f3fad218` | 4780 |
| 35 | `20260710140000_bilateral_pairs.sql` | `77fd7a057c04` | `9ff67100ec04dc17` | 9385 |
| 36 | `20260710150000_circle_sessions.sql` | `6b5d06594a14` | `c9b34cd18ef833fd` | 3901 |
| 37 | `20260713210000_add_wave_invites_email.sql` | `89ff1f5ab87b` | `498cfd004f3a747f` | 1057 |
| 38 | `20260713234252_8e382d9e-49b9-4778-8602-79af16eb02f5.sql` | `3cf69998c531` | `61eef91448d9538c` | 68 |
| 39 | `20260714120000_member_invites.sql` | `890e3a9c928f` | `3ccf4d7e10e26560` | 7804 |
| 40 | `20260714130000_fix_accept_member_invite_execute_grant.sql` | `241a65e3f5c7` | `516af41d068a75d8` | 2824 |
| 41 | `20260725120000_revoke_wave_responses_select_grant.sql` | `7914934fffa1` | `7ce44ce646d99b79` | 1920 |
| 42 | `20260725130000_scope_count_wave_responses_to_caller_org.sql` | `92e6e22ac9d2` | `682fe72a09696d5b` | 2535 |
| 43 | `20260726120000_bind_org_provisioning_to_authenticated_user.sql` | `a8998aec28a0` | `cd1ba81917bd7354` | 8162 |
| 44 | `20260730150000_generic_anonymous_submissions_expand.sql` | `32710cca979f` | `5e78abec864a156e` | 12600 |
| 45 | `20260730155000_cohort_aggregate_privacy_hardening.sql` | `25cc1d41c828` | `461613bb07b8696a` | 7430 |

Classificação por item: **`PREDECESSOR`** (1–43) · **`MIGRATION_A`** (44) ·
**`HARDENING_H`** (45). As classificações `STUB_REQUIRED` e
`INCOMPATIBLE_WITH_PLAIN_POSTGRES` só podem ser atribuídas **por observação**
na PROD-0.6D — atribuí-las agora seria presumir o resultado da prova.

#### Consumo pelo runtime — fail-closed

O runtime futuro **não recalcula** o conjunto a partir do diretório atual. Ele
**consome o manifesto congelado** e **aborta** se: faltar arquivo · surgir
arquivo adicional no conjunto esperado · caminho mudar · ordem mudar · blob
hash mudar · SHA-256 mudar · contagem divergir de 45 · commit-fonte divergir.

#### Denylist da Migration B de staging

Barreira independente do corte posicional. Aborta se aparecer no conjunto, por
qualquer das três identidades:

| Identidade | Valor |
| --- | --- |
| caminho | `supabase/migrations/20260730160000_drop_response_invite_link_contract.sql` |
| blob hash Git | `c0d35c06f359bb1d56c23b06f3e2821df9b45246` |
| SHA-256 do blob | `3f2a67501cd6a208ab3e2fc349fae3a5822aea052636d9d77dcca452e6c26731` |

Mesmo estando fora do corte até H, sua presença no conjunto **causa aborto**.

#### Classificação da L2

`MIGRATION_LINEAGE_PROOF_INTEGRAL` · `MIGRATION_LINEAGE_PROOF_PARTIAL` ·
`MIGRATION_LINEAGE_PROOF_FAILED`.

Qualquer incompatibilidade com PostgreSQL puro produz **`PARTIAL`** ou
**`FAILED`** — **nunca** seleção silenciosa de outro subconjunto. Não existe
caminho em que o runtime "ajuste" a linhagem para conseguir passar.

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

## D. Contrato de extração — `EXPLICIT_MULTIPLE_EXECUTABLE_BLOCKS`

**Descomentação indiscriminada do prefixo `--` não é autorizada.**

### Por que o contrato de par único foi substituído

A revisão anterior fixou "exatamente um par de marcadores" envolvendo
`BEGIN … COMMIT`. Ao exercitar esse contrato contra o arquivo real, o resultado
foi **SQL inválido**: das 1042 linhas extraídas, **734 ficavam nuas**, e a
esmagadora maioria era **prosa**, não statement. Exemplo do que o strip
produzia:

```
DROP POLICY condicional -- CITACAO HISTORICA, NAO COPIAR, nao reintroduzir --
```

A causa é estrutural: o draft usa **o mesmo prefixo `-- `** para o SQL e para a
prosa explicativa. Um strip de um nível não consegue distinguir os dois, e
nenhuma heurística de palavra-chave poderia fazê-lo sem destruir o determinismo
que o contrato exige.

**Decisão humana:** `EXTRACTION_CONTRACT = EXPLICIT_MULTIPLE_EXECUTABLE_BLOCKS`.
Cada sequência contígua de SQL executável é **declarada** por um par exclusivo
de marcadores. O documento passa a dizer o que é executável, em vez de o
extrator tentar adivinhar.

### Marcadores

```
-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:B001
-- FIBT_PROD_B_EXEC_BLOCK_END:B001
```

Sequenciais: `B001`, `B002`, … `BNNN`. Regras de forma: ID único · sequência sem
lacunas · exatamente um `BEGIN` e um `END` por ID · `END` depois do `BEGIN` ·
sem aninhamento · bloco não vazio · marcador ocupa a linha inteira · marcador
não entra no SQL extraído · marcador não existe dentro de prosa ou de corpo
SQL · blocos concatenados na **ordem física** do arquivo.

### As vinte e quatro regras do extrator

1. ler o arquivo-fonte integral;
2. localizar **somente** marcadores de formato exato;
3. extrair todos os IDs;
4. validar a contagem esperada `N`;
5. validar a sequência `B001…BNNN`;
6. rejeitar ID repetido;
7. rejeitar lacuna;
8. rejeitar aninhamento;
9. rejeitar marcador ausente;
10. rejeitar marcador excedente;
11. rejeitar ordem invertida;
12. rejeitar bloco vazio;
13. processar **somente** linhas dentro dos blocos;
14. remover **exatamente um** prefixo de comentário esperado;
15. rejeitar linha com formato inesperado;
16. concatenar os blocos **em ordem**;
17. inserir somente **newline determinístico** entre blocos;
18. gerar SQL apenas em **`RUNNER_TEMP`**;
19. **nunca** gravar SQL no workspace;
20. **nunca** copiar SQL descomentado para o container;
21. registrar **hash por bloco**;
22. registrar **hash agregado**;
23. enviar o resultado ao `psql` por **stdin**;
24. apagar temporários no encerramento.

**Proibido:** usar `BEGIN` ou `COMMIT` como marcador · regex de palavra-chave
para decidir executabilidade · remoção global de `--` · seleção manual de
linhas durante a execução · **fallback** quando os marcadores falharem.

### `FIBT_PROD_B_EXPECTED_BLOCK_COUNT = 13`

Medido, não presumido. Inventário recongelado após a inserção do corpo de
`submit_sector_response` (PROD-0.6B-FUNCBODY), sobre o draft atual do PR #38:

| ID | Linhas (conteúdo) | Qtd | Primeiro token | Último token | Classificação |
| --- | --- | --- | --- | --- | --- |
| `B001` | 87 | 1 | `BEGIN;` | `BEGIN;` | `TRANSACTION_OPEN` |
| `B002` | 108–109 | 2 | `SET` | `'2min';` | `SUPPORTING_SQL` |
| `B003` | 151–152 | 2 | `SELECT` | `MODE;` | `SUPPORTING_SQL` |
| `B004` | 166–234 | 69 | `DO` | `$$;` | `PRECONDITION` |
| `B005` | 288–400 | 113 | `DO` | `$$;` | `PRECONDITION` |
| `B006` | 421–859 | 439 | `DO` | `$$;` | `PRECONDITION` |
| `B007` | 924–973 | 50 | `CREATE` | `$$;` | `DDL` |
| `B008` | 976–980 | 5 | `ALTER` | `invite_token;` | `DDL` |
| `B009` | 984–987 | 4 | `COMMENT` | `schema.';` | `DDL` |
| `B010` | 1017–1192 | 176 | `DO` | `$$;` | `POSTCHECK` |
| `B011` | 1196 | 1 | `COMMIT;` | `COMMIT;` | `TRANSACTION_CLOSE` |
| `B012` | 1222–1254 | 33 | `SELECT` | `'');` | `SUPPORTING_SQL` |
| `B013` | 1287–1323 | 37 | `WITH` | `canonico;` | `SUPPORTING_SQL` |

Novo bloco **`B007`** (DDL): `CREATE OR REPLACE FUNCTION
public.submit_sector_response`, byte-idêntico (após normalização de prefixo e
EOL) à SPEC §J e à Migration B canônica de staging (blob `c0d35c06…`).
`B008`–`B013` são os antigos `B007`–`B012`, renumerados; nenhuma linha de
conteúdo pré-existente foi alterada dentro deles (confirmado por hash — ver
tabela abaixo).

`B001`–`B011` formam a transação. `B012` e `B013` são as consultas de ACL,
executadas **fora** da transação, antes e depois.

Verificação manual de cada bloco: **zero linhas malformadas** e **zero
sentenças em prosa** dentro de qualquer bloco.

### Hashes e tratamento de EOL

| Item | Valor |
| --- | --- |
| `BASE_DRAFT_BLOB_SHA256` (draft em `origin/main`, sem markers, sem função) | `acafcd5978d6546dd6332283f498613aee88f2c77434b8bb74742537fe68a04c` |
| `SOURCE_WITHOUT_MARKERS_AND_NEW_BLOCK_SHA256` (draft atual menos 26 marcadores, menos o corpo novo de `B007`) | `5e2c8a5912c37316f2b42c4fbca450325d385aeee70a8b9a66a2631b433a66ce` |
| `SPEC_J_FUNCTION_SHA256` / `CANONICAL_B_FUNCTION_SHA256` / `DRAFT_B007_FUNCTION_SHA256` (as três idênticas) | `1ef02de2aece306e7432d2c2d9d4a51bd88457043c2f3b5f3d9f3f960fced2c4` |
| agregado da transação (`B001`–`B011`) | `127979ac95d2da9ffd4d7c4f792c4d13107a76a75f810f478badf851852a9075` |
| agregado de `B012` (ACL 6.1 — conteúdo inalterado, só renumerado) | `c7757bf557ba6679ea763cc3e194b01d2802ebd8150e1422919c9e099403adbe` |
| agregado de `B013` (ACL 6.2 — conteúdo inalterado, só renumerado) | `61ed5e7f15a8dc69abd13a5d2f4750073a2579f6de96e44ff8aa649f8b63ce14` |
| agregado de todos os blocos, `B001`–`B013`, na ordem | `6ba7417cef647c6483269835095f07205b91cdbb84e3af9809aad657b2670d30` |

**Todos os hashes são calculados sobre o conteúdo do blob Git (LF canônico),
nunca sobre o working tree.** Este repositório tem `core.autocrlf = true`; ler
o arquivo do disco no Windows produz bytes diferentes dos que um runner Linux
enxerga. Congelar o hash do working tree causaria aborto garantido no runner.
**EOL não pode produzir resultado diferente entre Windows e Linux** — a
normalização para LF é parte do contrato, não detalhe de implementação.

### Prova de preservação

**A prova muda de natureza na PROD-0.6B-FUNCBODY.** Até aqui (PROD-0.6C), o
draft só ganhava marcadores — "removidos os marcadores, o arquivo é
byte-idêntico à `main`" era uma prova forte. Agora o draft ganha **conteúdo
SQL novo** (o corpo de `submit_sector_response`, 50 linhas), então essa mesma
formulação deixaria de valer por construção. A prova correta, **mais fraca**,
é: "removidos os marcadores **e o bloco novo**, o arquivo é byte-idêntico à
`main`" — `SOURCE_WITHOUT_MARKERS_AND_NEW_BLOCK_SHA256`, que bate com
`BASE_DRAFT_BLOB_SHA256` (tabela acima).

Duas provas independentes, não uma:

- **Prova A (nada mais foi tocado):** remover os 26 marcadores e as 50 linhas
  do corpo novo do draft atual reproduz byte a byte o draft de `origin/main`.
  Confirmado — única diferença residual é a atualização deliberada da prosa
  humana da §3b (deixa de instruir "copiar o corpo manualmente" e passa a
  apontar para o bloco `B007` e o pós-check 5.8), autorizada explicitamente
  nesta mesma rodada.
- **Prova B (o que entrou é o corpo certo):** o corpo extraído de `B007`
  (removido exatamente um prefixo de comentário) é byte-idêntico à SPEC §J e à
  Migration B canônica de staging — `DRAFT_B007_FUNCTION_SHA256 =
  SPEC_J_FUNCTION_SHA256 = CANONICAL_B_FUNCTION_SHA256`.

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

### Invariantes transacionais da concatenação

Validação **estática** do resultado de `B001`–`B011`, sem executar PostgreSQL:

| Invariante | Resultado |
| --- | --- |
| primeiro statement transacional = `BEGIN` | ✅ |
| último statement transacional = `COMMIT` | ✅ |
| exatamente um `BEGIN` de abertura | ✅ (1) |
| exatamente um `COMMIT` final | ✅ (1) |
| ausência de `COMMIT` intermediário | ✅ |
| ausência de `ROLLBACK` no caminho feliz | ✅ (0) |
| `SET LOCAL` dentro da transação | ✅ (`B002`, após `B001`) |
| preconditions antes do primeiro DDL | ✅ (`B004`–`B006` antes de `B007`) |
| `CREATE OR REPLACE` antes do `DROP CONSTRAINT` | ✅ (`B007` antes de `B008`) |
| `CREATE OR REPLACE` antes do `DROP COLUMN` | ✅ (`B007` antes de `B008`) |
| `DROP CONSTRAINT` antes do `DROP COLUMN` | ✅ (ambos em `B008`, nessa ordem) |
| pós-checks depois dos DDLs | ✅ (`B010` depois de `B007`/`B008`/`B009`) |
| função completa presente exatamente uma vez | ✅ (1 ocorrência de `CREATE OR REPLACE FUNCTION public.submit_sector_response`) |
| função nova sem referência a `wave_responses.invite_token` | ✅ (zero ocorrências dentro do corpo de `B007`) |
| SQL de ACL fora da transação | ✅ (`B012`/`B013` fora de `B001`–`B011`) |
| zero `GRANT`/`REVOKE` introduzido | ✅ (0) |
| **nenhum trecho executável omitido entre fases previstas** | ✅ **RESOLVIDO** |

Números medidos por extração direta (linhas cruas, incluindo linhas em
branco preservadas): **862 linhas** na transação (`B001`–`B011`), **932
linhas** no conjunto completo (`B001`–`B013`), **zero linhas de prosa nua**,
**zero linhas malformadas**. Contagem de *statements* individuais não foi
refeita com o extrator real (`scripts/fibt-proof/extract-block.ts` vive só no
PR #37, ainda não adaptado para 13 blocos) — fica pendente da Fase 11/adaptação
do extrator; a extração manual usada aqui replica as mesmas 24 regras de
prefixo e foi cruzada com os hashes de `B012`/`B013`, que batem exatamente com
os hashes já congelados dos antigos `B011`/`B012` — confirmando que a
renumeração não alterou nenhum conteúdo pré-existente.

### ✅ P0 resolvido — corpo de `submit_sector_response` incorporado

A §3b do draft **agora contém** o `CREATE OR REPLACE FUNCTION
public.submit_sector_response(...)` completo, como bloco executável `B007`,
byte-idêntico à SPEC §J e à Migration B canônica (ver hashes acima). O
pós-check §5.6 (dentro de `B010`) passa a encontrar a função **já substituída**,
sem referência residual a `invite_token` — o caminho feliz agora pode
completar. `T02`/`H01` deixam de falhar por construção; permanecem sujeitos à
execução real do Tier 1 (ainda não disparada) para confirmação empírica.

**Descomentação seletiva permanece proibida**, agora também mecanicamente: o
extrator só aceita blocos inteiros entre marcadores declarados.

## E. Controles anti-produção

### Sem falsa isolação de rede

**Não se afirma que o runner "não possui rota para produção".** Um runner
hospedado **tem** conectividade externa. A proteção é outra, e é declarada
honestamente:

| Controle | Forma |
| --- | --- |
| **Ausência de credencial** | o job não recebe nenhum secret de banco |
| **Fixação do alvo** | conexão rigidamente `127.0.0.1` ou `localhost` |
| **Sem Environment** | nem produtivo **nem de staging** |
| **Sem OIDC** | o job não solicita token OIDC |
| **Permissões mínimas** | preferencialmente `contents: read` e nada mais |
| **Checkout sem credencial** | `persist-credentials: false` |
| **Sem fallback** | ausência de variável **aborta**; nunca aciona padrão |

#### O que a etapa PG17 efêmera não recebe — lista fechada

Nenhuma destas chega ao job, e a presença de qualquer uma **aborta antes do
harness**:

credencial produtiva · **credencial de staging** · `SUPABASE_URL` ·
`DATABASE_URL` remoto · service role key · anon key · token Lovable · GitHub
Environment produtivo **ou de staging** · OIDC.

Staging é nomeado de propósito: "nenhum secret de banco" cobriria staging por
implicação, e implicação não é controle. A etapa PG17 é **local e sem
credencial**, ponto — a prova em staging é outra onda, com autorização própria.

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

### Comparação das três opções

| | Como | Vantagem | Risco |
| --- | --- | --- | --- |
| **A. Cliente dentro do próprio container** | `docker exec` no service container | major garantidamente idêntica | o workspace do runner **não** é montado no service container |
| **B. Job container com cliente PG17** | o job inteiro roda numa imagem que já traz o cliente | ambiente reprodutível por digest | duas imagens para versionar |
| **C. Instalação explícita no runner** | repositório PGDG, versão fixada | máxima flexibilidade | mais passos, e a major precisa ser fixada à mão |

### Decisão: `CLIENT_STRATEGY = SERVICE_CONTAINER_EXEC_STDIN`

Opção **A**, com o transporte do SQL resolvido por **stdin**.

Contrato:

- PostgreSQL 17 como **service container**;
- runner **Linux/Ubuntu**;
- ID do container obtido por `job.services.pg17.id`;
- `psql` e `pg_dump` executados **dentro do mesmo container** — servidor e
  clientes vêm da mesma imagem e da mesma major, por construção;
- **múltiplos `docker exec` representam sessões independentes** — é o que
  viabiliza os cenários de concorrência L01–L10;
- **SQL enviado por stdin**;
- **não usar `docker cp`**;
- **não presumir workspace montado** no service container.

Forma conceitual:

```
docker exec -i "$PG_CONTAINER_ID" \
  psql -v ON_ERROR_STOP=1 --no-psqlrc … \
  < "$RUNNER_TEMP/<arquivo-temporario>.sql"
```

**Por que stdin e não `docker cp`.** Em GitHub Actions, service containers
**não montam** o workspace do runner (ao contrário de job containers, que
montam). Sem transporte explícito, `psql -f /caminho/do/runner.sql` executado
dentro do container não encontraria o arquivo. `docker cp` resolveria, mas
criaria uma **segunda cópia do SQL descomentado**, agora dentro do container —
duplicando a superfície que a regra 15 precisa apagar. Com stdin, o arquivo
descomentado existe **em um único lugar**: `RUNNER_TEMP`, no runner.

Registrar por execução: container ID (mascarado quando necessário) ·
`psql --version` · `pg_dump --version` · `SELECT version()` · imagem · digest.

Modo fail-fast: `psql -v ON_ERROR_STOP=1 --no-psqlrc`, com o `--no-psqlrc`
cumprindo a regra de não ler configuração pessoal.

### `RUNNER_TEMP` — onde os temporários vivem

Todos os artefatos transitórios residem sob **`RUNNER_TEMP`**, nunca no
workspace versionado:

- SQLs extraídos;
- dumps;
- fingerprints temporários;
- arquivos de coordenação das sessões concorrentes;
- logs intermediários sem dado sensível.

No encerramento — **inclusive em falha ou cancelamento** — remover o SQL
descomentado, os dumps temporários e os arquivos de sinalização, mantendo
apenas os artefatos explicitamente aprovados e sanitizados.

**Nenhum temporário é criado no workspace versionado.**

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
