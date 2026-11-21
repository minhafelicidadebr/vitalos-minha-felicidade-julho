# Pilha descartável Q1+Q2 (`vitalos-q1q2-integ`)

Por que existe: a Supabase CLI 2.119.0 não oferece opção de host/binding e publica as portas em `0.0.0.0`; o guard do Q1 (`requireQ1BrowserProofLocalTarget`) exige loopback e recusa — corretamente. Este Compose usa as mesmas imagens da CLI (já presentes localmente) com bindings explícitos em `127.0.0.1`.

| Serviço | Imagem | Binding |
| --- | --- | --- |
| db | `public.ecr.aws/supabase/postgres:17.11.0.002` | `127.0.0.1:57922` |
| kong (API) | `public.ecr.aws/supabase/kong:2.8.1` | `127.0.0.1:57921` |
| mailpit | `public.ecr.aws/supabase/mailpit:v1.31.3` | `127.0.0.1:57924` |
| auth (GoTrue) | `public.ecr.aws/supabase/gotrue:v2.197.0` | não publicado |
| rest (PostgREST) | `public.ecr.aws/supabase/postgrest:v16.4` | não publicado |

Sem volume nomeado: `down` descarta os dados. Não toca o stack institucional nem a fixture do Q1.

## Uso

```powershell
bun scripts/integ-local/keygen.ts
```

```powershell
docker compose -f scripts/integ-local/compose.yml --env-file scripts/integ-local/.env.integ up -d db
```

Depois de `db` saudável, rode `sh scripts/integ-local/guard.sh` (projeto, containers e bindings), defina as senhas de `authenticator`, `supabase_auth_admin` e `postgres` com o valor de `POSTGRES_PASSWORD` (sem imprimir), suba os demais serviços com `up -d` e aplique a cadeia:

```powershell
sh scripts/integ-local/apply-chain.sh
```

`apply-chain.sh` reaplica os mesmos critérios de `scripts/institutional-local.ts`: compensações de `supabase/local/lineage/` e exclusão de `20260730160000` (staging) e `20260806210000` (não executável). Recusa banco não vazio.

Encerrar e descartar:

```powershell
docker compose -f scripts/integ-local/compose.yml --env-file scripts/integ-local/.env.integ down
```
