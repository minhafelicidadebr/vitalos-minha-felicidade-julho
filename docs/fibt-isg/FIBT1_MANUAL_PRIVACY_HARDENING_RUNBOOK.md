# Runbook — Privacy Hardening (FIBT-1)

Substitui o contrato de `aggregate_cohort_responses` para que a contagem
exata **não saia** abaixo do limiar, e cria uma função separada para quem
precisa do número por finalidade operacional.

Roda **depois** da Migration A e **antes** da Migration B.
Não remove coluna nem dado.

---

## 1. Por que existe

A Migration A suprime o conteúdo abaixo de k=5, mas devolve `n=4`. Saber que
uma coorte tem exatamente 4 pessoas já é informação sobre o grupo: combinada
com conhecimento organizacional ("aquele setor tem 4 pessoas"), aproxima a
reidentificação sem que uma única resposta tenha vazado.

## 2. Confirmar o alvo

- **Deve ser:** `xttj...xuab`
- **NUNCA:** `shlm...akol` (produção)

```sql
select count(*) as organizacoes from public.organizations;
```

Espere um número pequeno, com nomes sintéticos. Nome de cliente real = projeto
errado, **pare**.

## 3. Arquivo

```
supabase/migrations/20260730155000_cohort_aggregate_privacy_hardening.sql
```

| | |
|---|---|
| Tamanho | 7430 bytes |
| git blob | `25cc1d41c828e24e6456be0ac414c18793ac1089` |
| Bytes não-ASCII | 0 |

Copie **do arquivo**, não de mensagem formatada.

## 4. Preflight (somente leitura)

```sql
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname='public' and p.proname='aggregate_cohort_responses')   as rpc_atual,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname='public' and p.proname='count_cohort_participation')   as ja_tem_participacao,
  (select count(*) from public.wave_responses)                              as respostas;
```

Esperado: `rpc_atual=1`, `ja_tem_participacao=0`, `respostas=26`.

## 5. Executar uma única vez

SQL Editor → nova query → cole o arquivo inteiro → execute uma vez.

A migration faz `DROP FUNCTION` seguido de `CREATE FUNCTION` porque o tipo de
retorno muda — `CREATE OR REPLACE` não permite alterar a assinatura de saída.
Isso é esperado e não afeta dados.

## 6. Pós-aplicação (somente leitura)

```sql
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname='public' and p.proname='aggregate_cohort_responses'
       and array_to_string(p.proargnames, ',') like '%response_count_label%') as contrato_novo,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname='public' and p.proname='count_cohort_participation')     as funcao_operacional,
  (select count(*) from public.wave_responses)                                as respostas_intactas;
```

### Resultado esperado

`contrato_novo=1`, `funcao_operacional=1`, `respostas_intactas=26`.

## 7. O que NÃO fazer

- Não rodar em `shlm...akol`.
- Não rodar a Migration B ainda.
- Não conceder `EXECUTE` de `count_cohort_participation` a papel que só
  deveria ver resultado agregado — é justamente essa separação que faz o
  hardening valer alguma coisa.

## 8. O que me enviar

1. `project_ref` visto.
2. Saída do preflight.
3. Sucesso ou erro completo.
4. Saída do pós-aplicação.

Com isso eu rodo:

```bash
bun run scripts/fibt1-staging-proof.ts proof
```

Esperado após o hardening: coorte Alfa com conteúdo; coorte Beta com
`response_count = NULL`, `response_count_label = "<5"`, `suppression_reason =
"privacy_threshold"`.

## 9. Rollback

Volta ao contrato da Migration A:

```sql
drop function if exists public.count_cohort_participation(uuid, uuid);
drop function if exists public.aggregate_cohort_responses(uuid, uuid);
```

Depois reaplique a seção 5 de
`20260730150000_generic_anonymous_submissions_expand.sql`.

> Reverter reintroduz a exposição do `n` exato abaixo do limiar. Só faça isso
> se o hardening tiver quebrado algo, e registre o motivo.
