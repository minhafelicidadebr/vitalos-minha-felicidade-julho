# Especificação — Migration B produtiva (FIBT-1 CONTRACT)

> **Status: ESPECIFICAÇÃO. Nada aqui é executável.**
> Este documento define *o que* a Migration B produtiva precisa garantir.
> O rascunho de SQL vive em `MIGRATION_B_PRODUCTION_DRAFT.sql.disabled` —
> extensão deliberadamente inválida, fora de `supabase/migrations/`, para que
> nenhum pipeline o descubra. Ver `MIGRATION_B_EXECUTION_CHECKLIST.md` para o
> roteiro de execução futura.
>
> Promover este rascunho a migration executável é **decisão humana separada**
> (ver §H).
>
> **Revisão 2** — incorpora as correções da revisão adversarial do Draft PR #35.

## Por que um arquivo novo, e não a Migration B de staging

A Migration B canônica
(`supabase/migrations/20260730160000_drop_response_invite_link_contract.sql`,
blob `c0d35c06f359bb1d56c23b06f3e2821df9b45246`) **permanece imutável**. Ela
não pode ser aplicada em produção porque suas preconditions são específicas do
dataset sintético de staging:

| Precondition de staging | Valor congelado | Em produção |
| --- | --- | --- |
| `AFETADAS_ESPERADAS` | `16` | **0** (inventário PROD-0) |
| `ORGS_SINTETICAS` | 2 UUIDs `a0000000-…` | não existem |
| Política de e-mail | aborta se houver e-mail fora de `example.invalid`/`example.com` | produção tem e-mails reais |

Isso **não é um defeito** — é o fail-closed funcionando: a migration recusa
rodar num banco que não é aquele para o qual a autorização humana foi dada.
A consequência correta é derivar um arquivo novo, com timestamp novo, hash
novo, revisão e autorização próprios.

## A. Finalidade

1. Remover `wave_responses.invite_token` — a coluna legada que materializa, no
   schema, o caminho resposta → convite → pessoa.
2. Remover a FK `wave_responses_invite_token_fkey`.
3. Preservar integralmente o contrato de submissão anônima introduzido por
   Migration A e pelo privacy hardening H.
4. Executar **somente** depois de A e H comprovadamente aplicadas e
   verificadas em produção.

Privacidade por desenho é **não guardar** a ligação — não escondê-la. Enquanto
a coluna existir, uma policy futura, um dump ou um RPC descuidado reidentifica.

## B. Contagens e invariantes

### As cinco contagens — deliberadamente distintas

Total de respostas e total de vínculos legados **não são a mesma coisa**.
Tratá-los como sinônimo é o erro que esta seção existe para impedir.

| Variável | Definição |
| --- | --- |
| `v_total_responses` | todas as linhas de `wave_responses` |
| `v_with_invite_token` | linhas com `invite_token IS NOT NULL` |
| `v_valid_invite_links` | token não nulo **com** convite correspondente |
| `v_orphan_invite_links` | token não nulo **sem** convite correspondente |
| `v_snapshot_rows` | linhas cujo vínculo legado se perde no `DROP` |

**Definição normativa:** `v_snapshot_rows = v_with_invite_token`. O valor é
destruído tanto para vínculo válido quanto para órfão — a validade do vínculo
não muda o fato de que o token some.

### Invariantes cruzadas — obrigatórias

```
v_valid_invite_links + v_orphan_invite_links = v_with_invite_token
v_snapshot_rows                              = v_with_invite_token
v_with_invite_token                         <= v_total_responses
v_orphan_invite_links                        = 0
tokens duplicados                            = 0
divergências resposta–convite–onda           = 0
inconsistências de organização (afetadas)    = 0
```

As três primeiras existem para detectar **contagem incoerente**, não apenas
contagem alta. Divergência entre elas indica leitura inconsistente ou escrita
concorrente — motivo de abortar por si só, independente dos valores absolutos.

### Dois gates separados, com finalidades diferentes

**Gate de drift operacional — `EXPECTED_TOTAL_RESPONSES = 0`**

Se `v_total_responses ≠ 0`: abortar. **Não presumir que as linhas são
seguras.** Refazer o inventário e solicitar nova autorização.

Uma resposta com `invite_token NULL` é compatível com o contrato novo e **não**
representa perda de vínculo — mas, enquanto o estado autorizado for "tabela
vazia", qualquer linha significa que o banco divergiu do inventário PROD-0, e
a autorização humana concedida não cobre esse estado.

**Gate de perda de vínculo legado — `EXPECTED_WITH_INVITE_TOKEN = 0`**

Se `v_with_invite_token ≠ 0`: abortar; criar snapshot privado fora do
repositório; calcular SHA-256; revisar de forma controlada **todas** as linhas
afetadas; solicitar nova autorização.

Os dois gates são independentes: o primeiro detecta que o mundo mudou; o
segundo detecta que há algo a perder.

## C. Preconditions fail-closed

| # | Precondition | Verificação | Natureza |
| --- | --- | --- | --- |
| 1 | `project_ref` de produção confirmado | painel do Lovable, ref mascarado. Não se prova por `current_database()` | humana |
| 2 | `LOVABLE_BATCH_TRANSACTION_CONFIRMED = true` | ver §G | humana |
| 3 | Matriz de ACL capturada **antes** | consulta read-only de `has_function_privilege` | humana |
| 4 | Migration A integral | `wave_cohorts`, `cohort_id`, `instrument_version`, `waves_id_org_uk` | SQL |
| 5 | Hardening H integral | `response_count_label`; `count_cohort_participation` via `to_regprocedure` | SQL |
| 6 | `invite_token` presente | `information_schema.columns` | SQL |
| 7 | FK legada presente | `table_constraints` ⋈ `constraint_column_usage` | SQL |
| 8 | Cinco contagens sob lock | §B | SQL |
| 9 | Invariantes cruzadas | §B | SQL |
| 10 | Gate de drift (`total = 0`) | §B | SQL |
| 11 | Gate de vínculo legado (`com_token = 0`) | §B | SQL |
| 12 | Zero órfão / duplicado / divergência de onda | — | SQL |
| 13 | Zero inconsistência de organização **nas linhas afetadas** | escopo restrito — ver nota | SQL |
| 14 | Assinaturas via `to_regprocedure` | §F | SQL |
| 15 | Nenhuma outra função depende da coluna | `prosrc` + camadas de §D | SQL (limitado) |

**Nota sobre o escopo da #13:** restrita a `invite_token IS NOT NULL`. Uma
resposta já compatível com o contrato novo que tenha onda órfã é um problema de
integridade **real**, mas sem relação com o vínculo sendo removido — bloquear a
Migration B por causa dela seria falso positivo. O gate de drift já cobre a
existência dessas linhas enquanto o estado autorizado for "total zero".

### Removido em relação a staging, sem substituto

- **Lista fechada de UUIDs de organização** — em produção a invariante correta
  é *zero linha afetada*, não *linhas afetadas pertencem a esta lista*.
- **Política baseada em domínio de e-mail** — não se consulta nem se valida
  e-mail em nenhum momento.

## D. Pós-checks

Dentro da transação, antes do COMMIT:

1. `v_total_responses` **observado e registrado** via `RAISE NOTICE` — valor
   auditável, não presumido.
2. `invite_token` ausente.
3. FK legada ausente.
4. Nenhuma FK residual de `wave_responses` para `wave_invites`.
5. `cohort_id` preservado.
6. Funções encontradas por `to_regprocedure` com as assinaturas exatas.
7. Nenhuma referência **estática** residual à coluna removida.
8. Contrato de 8 colunas da agregação intacto.
9. `count_cohort_participation` presente.

Fora da transação, como parte da onda:

10. Matriz de ACL comparada **antes × depois**, sem presunção.
11. Tipos ainda **não** regenerados (isso é PROD-5).
12. `VITE_FIBT_PILOT_ENABLED` ainda `false`.
13. `operational_real_collection_status` ainda `blocked_until_release_gate`.
14. Nenhum Publish acionado.
15. Nenhuma aplicação parcial.

### Ausência de referência — cinco camadas, nenhuma suficiente sozinha

`p.prosrc ILIKE '%invite_token%'` **não é prova absoluta**. Ele lê o texto do
corpo; uma função que monte a referência por **SQL dinâmico**
(`EXECUTE format(...)`) não é detectada.

Por isso a garantia é composta:

1. inspeção do corpo (`prosrc`) — no SQL;
2. dependências catalogadas (`pg_depend`, FKs, policies) — no SQL;
3. assinaturas esperadas (`to_regprocedure`) — no SQL;
4. testes estáticos do repositório (`fibt-no-mock-fallback.test.ts`,
   `fibt-types-regeneration.test.ts`) — no gate;
5. revisão humana do SQL final antes da promoção.

**Limitação residual registrada:** SQL dinâmico permanece fora do alcance
automático. Mitigado pela camada 5, não eliminado.

## E. Ordem transacional e locks

```
BEGIN
  → SET LOCAL lock_timeout / statement_timeout
  → pg_advisory_xact_lock(FIBT1_MIGRATION_B_PRODUCTION_LOCK)
  → LOCK TABLE wave_responses IN ACCESS EXCLUSIVE MODE
  → rechecagens fail-closed (§C)
  → CREATE OR REPLACE das funções dependentes   ← antes do DROP
  → DROP POLICY IF EXISTS "response_submit"
  → DROP CONSTRAINT IF EXISTS wave_responses_invite_token_fkey
  → DROP COLUMN IF EXISTS invite_token
  → pós-checks (§D)
COMMIT
```

### Timeouts — proposta para revisão humana

Busca no repositório: **não existe valor canônico** de `lock_timeout` ou
`statement_timeout` neste projeto. Os valores abaixo são **propostos**, não
herdados de precedente.

| Parâmetro | Proposto | Por quê |
| --- | --- | --- |
| `lock_timeout` | `5s` | evita espera indefinida por `ACCESS EXCLUSIVE` atrás de transação longa |
| `statement_timeout` | `2min` | impede sessão administrativa pendurada |

Qualquer timeout resulta em **ROLLBACK e NO-GO**. **Não repetir
automaticamente** — investigar *quem* estava segurando o lock antes de nova
tentativa. Repetição cega transforma um sinal em ruído.

### Mecanismo de exclusão — comparação preservada

| Alternativa | Como funciona | Vantagem | Risco |
| --- | --- | --- | --- |
| **A. Só `ACCESS EXCLUSIVE`** | bloqueia leitura/escrita da tabela | fecha a janela real de escrita | não serializa dois operadores administrativos: o segundo espera, com diagnóstico pior |
| **B. Advisory + `ACCESS EXCLUSIVE`** | advisory serializa cooperativamente; table lock bloqueia escrita | cobre os dois cenários | ligeiramente mais complexo |
| **C. Nenhum lock** | confia na janela curta | simples | a recontagem fica obsoleta entre o `SELECT` e o `DROP` — inaceitável |

**Recomendação provisória: B.** O `DROP COLUMN` já adquire `ACCESS EXCLUSIVE`
implicitamente; adquiri-lo **no início**, antes das rechecagens, é o que
transforma a precondition "nenhuma resposta criada entre preflight e execução"
de promessa em garantia. Custo hoje é nulo: 0 respostas, 0 convites enviados.

- advisory lock → serializa execuções **administrativas cooperativas**;
- `ACCESS EXCLUSIVE` → impede escrita concorrente **na tabela**;
- chave: `4200730160`, nome lógico **`FIBT1_MIGRATION_B_PRODUCTION_LOCK`**.
  Excede `int4` (2 147 483 647), portanto resolve para a sobrecarga **bigint**
  de `pg_advisory_xact_lock`. Literal fixo, estável entre sessões;
- **ordem de aquisição sempre a mesma**, nunca invertida;
- qualquer timeout → rollback; **não repetir automaticamente**.

**Esta recomendação não é decisão final.** Exige aprovação humana explícita
antes da promoção.

**Contraindicação:** havendo coleta ativa, `ACCESS EXCLUSIVE` derruba a
submissão enquanto durar. Nesse caso **adiar** para janela sem tráfego — nunca
enfraquecer o lock.

## F. Verificação de assinaturas

Usar **resolução por `regprocedure`**, não comparação textual:

```sql
to_regprocedure('public.submit_wave_response(uuid,text,jsonb)')  IS NOT NULL
to_regprocedure('public.submit_sector_response(text,jsonb)')     IS NOT NULL
to_regprocedure('public.count_cohort_participation(uuid,uuid)')  IS NOT NULL
```

`to_regprocedure()` resolve a assinatura pelo catálogo e devolve `NULL` se não
existir. Comparar o **texto** devolvido por
`pg_get_function_identity_arguments()` contra uma string literal é
**mais frágil**: a formatação exata (presença ou não de nomes de parâmetro,
espaçamento, aliases de tipo) é detalhe de rendering do servidor, não contrato
estável.

A mesma verificação é usada em **três momentos**: nas preconditions, depois de
cada `CREATE OR REPLACE`, e nos pós-checks.

## G. Contrato transacional do Lovable

**Precondition humana obrigatória: `LOVABLE_BATCH_TRANSACTION_CONFIRMED = true`.**

Todo o desenho — locks, atomicidade do DDL, "aborta a transação inteira",
`SET LOCAL` — depende de o bloco `BEGIN; … COMMIT;` ser executado pelo
mecanismo do Lovable como **uma única transação**, sem autocommit entre
statements.

Isso **não está comprovado**. A Migration B de staging fez a mesma suposição e
funcionou — o que é evidência, não prova.

Antes de promover, comprovar **em ambiente não produtivo** que:

- `SET LOCAL` permanece válido até `COMMIT`/`ROLLBACK`;
- `ACCESS EXCLUSIVE` permanece adquirido durante as rechecagens e o DDL;
- um erro em qualquer precondition desfaz o bloco **inteiro**;
- nenhuma alteração parcial permanece.

Se a propriedade não puder ser comprovada: **não promover a migration**, **não
confiar no lock**, e desenhar outro mecanismo de aplicação controlada.

Este teste não faz parte da autorização atual.

## H. ACLs — separação estrita

Esta migration **não contém e não pode conter `REVOKE` ou `GRANT`**.

Não altera: `PUBLIC` · `anon` · `authenticated` · `service_role` ·
`sandbox_exec` · default privileges.

`sandbox_exec` é **papel gerenciado da plataforma** (LOGIN, BYPASSRLS, CONNECT,
default privileges) — nunca entra em migration da aplicação e nunca é alvo de
`REVOKE` nosso.

**`CREATE OR REPLACE` será usado apenas para atualizar o corpo das funções
dependentes do schema. A trilha ACL permanece separada.**

**Consequência registrada, sem eufemismo:** `CREATE OR REPLACE` preserva a ACL
vigente. Como a Q19 constatou `PUBLIC EXECUTE` em produção para
`submit_sector_response`, ela **permanecerá com `PUBLIC EXECUTE`** depois desta
migration. Isso é deliberado — corrigir ACL aqui misturaria duas trilhas que se
decidiu separar. A correção acontece na trilha ACL, com PR e autorização
próprios, e **deve estar concluída antes da ativação da FIB-T**.

O draft **pode** conter consultas read-only de `has_function_privilege` — e
contém, na §5 — para a comparação antes × depois. Ler não é alterar.

## I. Corpo de `submit_sector_response` — reproduzido para revisão

Reproduzido aqui, em documento **não executável**, para que o draft seja
auto-contido para revisão sem criar uma segunda fonte de verdade executável.
A fonte normativa continua sendo a §2 da Migration B de staging.

**Copiar apenas o corpo. As duas últimas linhas daquele bloco (`REVOKE` +
`GRANT`) ficam de fora, por decisão explícita de §H.**

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

O que muda em relação à versão hoje em produção: a coluna `invite_token` deixa
de ser nomeada no `INSERT` (já gravava `NULL`), e a coorte passa a ser resolvida
por `wave_cohorts.key = sector_label`. Validação de token, status, revogação,
expiração e estado da onda: **preservados sem alteração**.

`submit_wave_response` **não é reescrita por esta migration** — ela já é
reescrita pela Migration A, que remove a gravação do token. Sua assinatura é
verificada aqui apenas como precondition e pós-check.

## J. Rollback — cenários nomeados

| # | Cenário | Reversibilidade |
| --- | --- | --- |
| 1 | Falha **antes do primeiro DDL** | `ROLLBACK` automático. Banco intocado. **Plena.** |
| 2 | Falha **depois de remover a constraint** | `ROLLBACK` desfaz o DDL (Postgres é transacional para DDL). **Plena.** |
| 3 | Falha **depois de remover a coluna** | `ROLLBACK` desfaz. **Plena.** |
| 4 | Falha ao substituir **`submit_wave_response`** | não ocorre nesta migration (não é reescrita aqui); se ocorresse, `ROLLBACK` cobre. **Plena.** |
| 5 | Falha ao substituir **`submit_sector_response`** | `ROLLBACK` restaura o corpo anterior **e** a ACL vigente. **Plena.** |
| 6 | Falha em **pós-check** | `ROLLBACK` — é o objetivo do pós-check estar dentro da transação. **Plena.** |
| 7 | **Erro descoberto depois do COMMIT** | ver 8–11. |
| 8 | Respostas com `invite_token` **NULL** | nada a restaurar — não havia vínculo. Recriar coluna + FK restaura o **schema**. **Plena em schema.** |
| 9 | Respostas com **vínculo legado** | só ocorre se §B foi violado. Ver 10–11. |
| 10 | **Restauração com snapshot** | recriar coluna, recriar FK, restaurar valores — e **remover a coluna de novo** depois. **Reversível com snapshot.** |
| 11 | **Sem snapshot, com linhas afetadas** | os valores não existem em lugar nenhum. **Irreversível.** |

**Distinção que não pode ser diluída: restaurar schema ≠ restaurar dados.**
Recriar a coluna e a FK devolve a *estrutura*; não devolve um único token.

**Critério para nunca executar rollback de dados:** se a restauração não for
estritamente necessária para corrigir falha funcional comprovada, não
restaurar. A perda dos tokens é o **objetivo** da migration, não o dano — e
restaurá-los reconstrói exatamente o vínculo que se decidiu eliminar.

## K. Promoção a migration executável — decisão humana

Este rascunho **não** vira migration por iniciativa técnica. Para promover:

1. Revisão humana desta especificação e do rascunho SQL.
2. Inventário PROD-0 revalidado (contagens recontadas na hora).
3. `project_ref` de produção confirmado externamente.
4. Migrations A e H **aplicadas e verificadas** em produção.
5. **`LOVABLE_BATCH_TRANSACTION_CONFIRMED = true`** comprovado em ambiente não
   produtivo (§G).
6. Decisão explícita sobre o mecanismo de lock e os timeouts (§E) — a
   recomendação é provisória.
7. Autorização escrita para criar o arquivo em `supabase/migrations/` com
   timestamp definitivo, seguido de PR, gate e autorização de aplicação
   separada.

Enquanto esses sete pontos não estiverem satisfeitos, o arquivo permanece
`.sql.disabled`, fora de `supabase/migrations/`, invisível para o pipeline.

**Proibido copiar apenas o trecho destrutivo (§3 do rascunho).** Um trecho
isolado daquele arquivo não é uma migration — é uma operação destrutiva sem
guarda.
