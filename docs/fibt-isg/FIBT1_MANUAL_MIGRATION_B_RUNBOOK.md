# Runbook — Migration B (CONTRACT, destrutiva)

Remove `wave_responses.invite_token` e a FK para `wave_invites`, eliminando do
schema o caminho **resposta → convite → e-mail**.

> **Esta migration destrói dados.** Os valores de `invite_token` das 16
> respostas sintéticas são apagados. Schema é reversível; **dados só com o
> snapshot**.

Só executar depois de: Migration A aplicada · Privacy Hardening aplicado ·
prova intermediária integralmente verde · snapshot conferido por SHA-256.

---

## 1. Snapshot — precondition 1.8, verificada por humano

O banco não consegue conferir um arquivo no disco. **Confirme antes de colar
qualquer SQL:**

| | |
|---|---|
| Caminho | `C:\Users\FIB2030\Documents\VitalOS-private-snapshots\fibt1-invite-links-2026-07-31.json` |
| Tamanho | 4097 bytes |
| SHA-256 | `6f15f5741ff9d2fe92e2dcf4a3ad6a9f08b9ec079ec8109731cd0d58896daf2b` |
| Registros | 16 |
| Project ref | `xttj...xuab` |
| Contém e-mail? | **Não** — campos: `id`, `wave_id`, `invite_token`, `submitted_at` |
| Versionado? | **Não**, e não deve ser |

Confira no PowerShell:

```powershell
Get-FileHash "C:\Users\FIB2030\Documents\VitalOS-private-snapshots\fibt1-invite-links-2026-07-31.json" -Algorithm SHA256
```

Hash diferente ou arquivo ausente → **pare**. Sem ele a migration é
irreversível em dados.

## 2. Confirmar o alvo

- **Deve ser:** `xttj...xuab` · **NUNCA:** `shlm...akol` (produção)

## 3. Arquivo

```
supabase/migrations/20260730160000_drop_response_invite_link_contract.sql
```

| | |
|---|---|
| Tamanho | 11812 bytes |
| git blob | `c0d35c06f359bb1d56c23b06f3e2821df9b45246` |
| Bytes não-ASCII | 0 |

## 4. Preflight (somente leitura)

Rode o preflight completo de 18 pontos — ele bloqueia sozinho se algo divergir:

```bash
bun run scripts/fibt1-final-preflight.ts
```

Esperado: **18/18 PASS**. Qualquer `FAIL` **impede a aplicação** — não siga.

Se preferir conferir à mão no SQL Editor:

```sql
select
  (select count(*) from public.wave_responses where invite_token is not null)   as afetadas,
  (select count(*) from public.wave_responses)                                   as respostas,
  (select count(*) from public.wave_responses
     where cohort_id is not null and invite_token is not null)                   as conflito,
  (select count(*) from public.wave_invites
     where email is not null
       and email not like '%@example.invalid'
       and email not like '%@example.com')                                       as emails_reais,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='wave_responses'
       and policyname='response_submit')                                         as policy_legada,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname='public' and p.proname='count_cohort_participation')        as hardening_aplicado;
```

**Esperado:** `afetadas=16` · `respostas=26` · `conflito=0` · `emails_reais=0`
· `policy_legada=0` · `hardening_aplicado=1`.

Qualquer divergência: **pare**. As preconditions da migration abortariam de
qualquer forma, mas é melhor descobrir antes.

## 5. Preconditions embutidas (abortam a transação)

| # | Verifica |
|---|---|
| 1.1 | Afetadas são **exatamente 16** |
| 1.2 | Toda resposta afetada pertence a `a0000000-…-0001` ou `…-0002` (**UUID exato**) |
| 1.3 | Toda onda afetada pertence a uma dessas duas orgs |
| 1.4 | Nenhum e-mail fora de `example.invalid` / `example.com` |
| 1.5 | Nenhuma resposta com `cohort_id` **e** `invite_token` |
| 1.6 | Nenhuma policy ou função SQL ainda dependente da coluna |
| 1.7 | Migration A **e** privacy hardening aplicados |
| 1.8 | Snapshot confirmado (humana — seção 1 acima) |

`organization.name` **não participa** da decisão destrutiva. Uma versão
anterior usava `LIKE '%(sint_tico)%'`; `_` é curinga no LIKE e casaria
`sintXtico`. Serve como evidência humana, nunca como autorização.

## 6. Executar uma única vez

SQL Editor → nova query → cole o arquivo inteiro → execute uma vez.

A migration reescreve `submit_sector_response` **antes** do DROP: ela nomeia
`invite_token` no INSERT, e sem essa correção o fluxo de link setorial
quebraria.

## 7. Pós-aplicação (somente leitura)

```sql
select
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='wave_responses'
       and column_name='invite_token')                                as coluna_removida,
  (select count(*)
     from information_schema.table_constraints tc
     join information_schema.constraint_column_usage ccu
       on ccu.constraint_name = tc.constraint_name
    where tc.table_schema='public' and tc.table_name='wave_responses'
      and tc.constraint_type='FOREIGN KEY'
      and ccu.table_name='wave_invites')                              as fk_removida,
  (select count(*) from public.wave_responses)                        as respostas_intactas,
  (select count(*) from public.wave_responses where cohort_id is not null) as com_coorte;
```

### Resultado esperado

`coluna_removida=0` · `fk_removida=0` · `respostas_intactas=26` · `com_coorte=10`.

**Prova de desvinculação:** esta consulta deve **falhar** com erro de coluna
inexistente — é o resultado desejado.

```sql
select r.id, i.email
  from public.wave_responses r
  join public.wave_invites i on i.token = r.invite_token;
```

## 8. O que NÃO fazer

- Não rodar em produção.
- Não rodar sem o snapshot conferido.
- Não rodar duas vezes (a 2ª aborta na precondition 1.1 — `afetadas` seria 0).
- Não apagar os dados sintéticos antes da prova pós-migration.

## 9. O que me enviar

1. Confirmação do SHA-256 do snapshot.
2. Saída do preflight.
3. Sucesso, `NOTICE`s ou erro completo.
4. Saída do pós-aplicação.
5. Confirmação de que o `join` da seção 7 falhou.

## 9b. Prova dinâmica pós-B (executo eu, após seu retorno)

```bash
bun run scripts/fibt1-staging-proof.ts proof
```

Deve continuar 31/31 verde, agora com um cenário diferente: o teste de
`invite_token` passa a reportar **"coluna não existe mais (pós-Migration B)"**
em vez de "grava NULL" — as duas formas são aceitas, por motivos diferentes.

Somado a isso, confirmo:

- coorte Alfa: escore bruto calculado pelo engine canônico;
- coorte Beta: `"<5"`, sem número exato;
- `count_cohort_participation`: admin obtém 4, `anon` negado;
- isolamento entre tenants intacto;
- o `join` resposta → convite → e-mail **falha** por coluna inexistente.

## 9c. NÃO limpar os dados sintéticos antes da prova final

`bun run scripts/fibt1-staging-proof.ts cleanup` **não deve ser executado**
antes da prova pós-B estar verde. Sem a organização, as coortes e as 10
respostas sintéticas, não há o que provar depois da remoção da coluna — e
recriar exigiria repetir o seed inteiro num schema já contraído.

## 10. Rollback

### 10a. Schema (reversível)

```sql
alter table public.wave_responses add column if not exists invite_token text;
alter table public.wave_responses
  add constraint wave_responses_invite_token_fkey
  foreign key (invite_token) references public.wave_invites(token);
```

`submit_sector_response` volta reaplicando a definição de
`20260709135007_134c37d3-9731-494a-bb72-13990acb10fe.sql`.

### 10b. Dados (só com o snapshot)

Procedimento **preparado, não executado**. Gere o SQL a partir do snapshot:

```bash
bun run scripts/fibt1-restore-invite-links.ts --dry-run
```

Ele lê o JSON da seção 1, confere o SHA-256, e emite `UPDATE`s por `id`:

```sql
update public.wave_responses set invite_token = '<token>' where id = '<uuid>';
```

Sem o snapshot **não existe restauração** — os valores não estão em nenhum
outro lugar.
