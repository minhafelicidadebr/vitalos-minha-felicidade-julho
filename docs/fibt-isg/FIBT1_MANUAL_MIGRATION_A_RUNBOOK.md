# Runbook — aplicação manual da Migration A (FIBT-1)

Migration **EXPAND**: só adiciona. Não remove coluna, tabela nem dado.
A remoção do vínculo `resposta → convite` é a Migration B, separada, e só
depois da prova intermediária.

---

## 1. Confirmar que o alvo é staging

No painel do Supabase, confira o `project_ref` na URL do projeto.

- **Deve ser:** `xttj...xuab`
- **NUNCA:** `shlm...akol` — esse é **produção**

Confirmação adicional, dentro do SQL Editor do projeto aberto:

```sql
select current_database(), count(*) as organizacoes from public.organizations;
```

Esperado em staging: **15** organizações, todas com nome sintético
(`Tenant Demo (sintético)`, `Tenant Piloto (sintético)`, `P0 Proof …`).
Se aparecer qualquer nome de cliente real, **pare**: o projeto está errado.

> O `.env` versionado do repositório aponta para produção. Nunca deduza o
> ambiente a partir dele.

---

## 2. Qual arquivo copiar

```
supabase/migrations/20260730150000_generic_anonymous_submissions_expand.sql
```

Copie **do arquivo**, não de mensagem de chat ou documento formatado. O
arquivo é ASCII puro justamente para sobreviver ao transporte — foi uma
substituição tipográfica (travessão no lugar de `--`) que quebrou a migration
do P0.

Confira antes de colar:

| | |
|---|---|
| Tamanho | 12600 bytes |
| git blob | `32710cca979f428461ea6a0c5bf47cede03d6ee3` |
| Bytes não-ASCII | 0 |

---

## 3. Preflight (somente leitura)

Rode **antes**, e guarde o resultado:

```sql
select
  (select count(*) from public.wave_responses)                     as respostas,
  (select count(*) from public.wave_responses
     where invite_token is not null)                               as com_vinculo,
  (select count(*) from public.wave_invites)                       as convites,
  (select count(*) from public.waves)                              as ondas,
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='wave_cohorts')    as ja_tem_cohorts;
```

Esperado: `respostas=16`, `com_vinculo=16`, `convites=16`, `ondas=3`,
`ja_tem_cohorts=0`.

Se `ja_tem_cohorts` já for `1`, a migration provavelmente já foi aplicada —
**não rode de novo sem falar comigo**.

---

## 4. Executar uma única vez

1. SQL Editor → nova query.
2. Cole o arquivo **inteiro**.
3. Execute **uma vez**.
4. Não execute em pedaços: os blocos `DO $$ … $$` precisam chegar completos.

A migration termina com um bloco de verificação que **levanta exceção** se
qualquer invariante falhar. Se ela completou sem erro, as invariantes passaram.

---

## 5. Pós-aplicação (somente leitura)

```sql
select
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='wave_cohorts')            as cohorts_criada,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='wave_responses'
       and column_name='cohort_id')                                        as resposta_tem_cohort,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='wave_responses'
       and column_name='invite_token')                                     as legado_preservado,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='waves'
       and column_name='instrument_version')                               as onda_tem_versao,
  (select count(*) from pg_constraint
     where conname='wave_cohorts_wave_org_fk')                             as fk_coorte_org,
  (select count(*) from pg_proc
     where proname='aggregate_cohort_responses')                           as rpc_agregacao,
  (select count(*) from public.wave_responses)                             as respostas_intactas;
```

### Resultado esperado de sucesso

Todos os campos = **1**, exceto `respostas_intactas` = **16**.

`legado_preservado = 1` é intencional: EXPAND **não remove** `invite_token`.
Se vier `0`, algo removeu a coluna cedo demais — **me avise antes de seguir**.

---

## 6. O que NÃO fazer

- Não rodar no projeto `shlm...akol` (produção).
- Não rodar a Migration B (`…_drop_response_invite_link_contract.sql`) agora.
- Não executar duas vezes.
- Não editar o SQL antes de colar — nem para "arrumar" acento.
- Não apagar as organizações `Tenant Demo`, `Tenant Piloto` ou `P0 Proof …`.
- Não gerar convite com e-mail real.

---

## 7. O que me enviar de volta

1. O `project_ref` que você viu (pode mascarar).
2. A saída do **preflight** (passo 3).
3. Sucesso ou a mensagem de erro completa.
4. A saída do **pós-aplicação** (passo 5).

Com isso eu rodo a prova intermediária:

```bash
bun run scripts/fibt1-staging-proof.ts seed
```

```bash
bun run scripts/fibt1-staging-proof.ts proof
```

---

## Rollback da Migration A

Totalmente reversível — só remove o que foi adicionado:

```sql
drop function if exists public.aggregate_cohort_responses(uuid, uuid);
alter table public.wave_invites   drop constraint if exists wave_invites_cohort_wave_fk;
alter table public.wave_responses drop constraint if exists wave_responses_cohort_wave_fk;
alter table public.wave_invites   drop column if exists cohort_id, drop column if exists expires_at;
alter table public.wave_responses drop column if exists cohort_id,
                                  drop column if exists instrument,
                                  drop column if exists instrument_version;
drop table if exists public.wave_cohorts;
alter table public.waves drop constraint if exists waves_id_org_uk;
alter table public.waves drop column if exists instrument_version;
```

`submit_wave_response` volta reaplicando a definição de
`20260703203653_aef6adcc-60fe-4bc4-b9b6-0fbd11f276f5.sql`.
