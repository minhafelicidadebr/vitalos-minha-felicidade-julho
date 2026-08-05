# Deployment isolado de homologação FIB-T (ISG) — Cloudflare Workers

> Documento de referência, sem valores reais. Nenhum secret, ref ou URL real
> aparece aqui — só nomes de variável e o que cada uma faz.
>
> Preparação técnica (FIBT-HML-2B): configuração e build sintético local.
> **Nenhum deployment remoto foi executado.** O comando de deploy real
> (Fase 7 abaixo) permanece documentado, não executado — exige autorização
> própria.

## Worker

Nome: `vitalos-fibt-hml-isg` (fixado em [`wrangler.hml.jsonc`](../../wrangler.hml.jsonc)).
Subdomínio: `workers.dev` — nunca `vitalos.com.br`, `www.vitalos.com.br` ou
`app.vitalos.com.br`.

## Variáveis

### Secrets server-side (nunca versionadas, configuradas como secret do Worker)

| Variável | O que é |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role do projeto Supabase de **staging** — bypassa RLS. Configurar via `bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.hml.jsonc` (comando documentado, não executado nesta preparação). |

### Variáveis server-side (não secretas por si só, mas nunca versionadas nem expostas ao cliente)

| Variável | O que é |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase de staging — lida em runtime por `client.server.ts`/`identity-boundary.server.ts`. |
| `SUPABASE_PUBLISHABLE_KEY` | Mesma chave publicável do lado servidor (fallback SSR). |
| `FIBT_HML_AUTHORIZED_STAGING_REF` | O único project ref de staging que `assertHmlBackendBoundary()` aceita como autorizado para este lote. |
| `VITALOS_PRODUCTION_PROJECT_REF` | Âncora de produção — obrigatória, independente, nunca derivada de `SUPABASE_URL` (ver `hml-backend-boundary.server.ts`). Ausente/vazia/inválida bloqueia (`HML_PRODUCTION_PROJECT_REF_MISSING`). |
| `FIBT_HML_FRONTEND_BASE_URL` | Origem HTTPS pública deste Worker — comparada por igualdade exata contra `VITE_FIBT_HML_FRONTEND_BASE_URL`. |
| `VITALOS_RUNTIME_ENV` | Só usada pelo preflight de build (`environment-preflight.ts`) — nunca lida pelo app em runtime. Valor esperado para este cenário: `preview`. |
| `VITALOS_DB_TARGET` | Idem — valor esperado: `staging`. |
| `VITALOS_STAGING_PROJECT_REF` | Exigida pelo preflight quando `VITALOS_DB_TARGET=staging`; conferida contra o ref real extraído de `SUPABASE_URL`. |
| `FORBIDDEN_PROJECT_REFS` | Opcional — lista extra de refs proibidos, mesma convenção de `forbiddenRefs()` (`staging-guard.ts`). |

### Variáveis públicas de build (`VITE_*` — embutidas no bundle do navegador, precisam existir **antes** do build)

| Variável | Valor esperado neste cenário |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do mesmo projeto Supabase de staging (deve resolver ao MESMO ref de `SUPABASE_URL`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publicável (anon) — pública por design. |
| `VITE_FIBT_HML_ENABLED` | `true` |
| `VITE_FIBT_HML_ENVIRONMENT` | `staging` |
| `VITE_FIBT_HML_BATCH_ID` | `FIBT-ISG-HML-01` |
| `VITE_FIBT_HML_PROJECT_REF` | Mesmo valor de `FIBT_HML_AUTHORIZED_STAGING_REF` — o cliente se autoconfirma contra o ref derivado de `VITE_SUPABASE_URL`. |
| `VITE_FIBT_HML_FRONTEND_BASE_URL` | Mesma origem de `FIBT_HML_FRONTEND_BASE_URL` — as duas são comparadas por igualdade exata em `assertHmlBackendBoundary()`. |

**Importante:** as variáveis `VITE_*` são substituídas estaticamente pelo Vite
no momento do build (inclusive no bundle SSR) — mudar uma delas depois do
build não tem efeito; exige rebuild. As variáveis server-side (não
`VITE_*`) são lidas via `process.env` a cada requisição — podem ser
alteradas na configuração do Worker sem rebuild.

## Build

```
bun install --frozen-lockfile
bun run build:hml:staging
```

Produz `.output/public/` (assets do navegador) e `.output/server/` (bundle
SSR/Worker, `index.mjs`).

## Deploy (documentado, não executado nesta preparação — Fase 7)

```
bunx wrangler deploy --config wrangler.hml.jsonc
```

Configurar o secret antes do primeiro deploy:

```
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.hml.jsonc
```

Nenhum destes comandos foi executado como parte desta preparação.

## Checklist do primeiro deployment real (futuro — exige autorização própria)

1. Autenticar na conta Cloudflare correta (`bunx wrangler login` ou token dedicado);
2. Confirmar o nome do Worker (`vitalos-fibt-hml-isg`) antes de confirmar o deploy;
3. Confirmar que a URL resultante é `*.workers.dev` (`workers_dev: true`, nenhuma rota customizada declarada);
4. Configurar as variáveis públicas de build (lista acima) antes do build;
5. Configurar as variáveis server-side não secretas (lista acima) no ambiente do Worker;
6. Configurar `SUPABASE_SERVICE_ROLE_KEY` como **secret** (nunca como variável de texto plano);
7. Executar `bun run build:hml:staging`;
8. Executar `bunx wrangler deploy --config wrangler.hml.jsonc`;
9. Registrar a URL resultante (só depois de existir);
10. Abrir `/api/fibt-hml/attestation` na URL resultante;
11. Exigir `status:"READY"` antes de considerar o deployment válido — qualquer `BLOCKED` interrompe a validação;
12. Testar `/convite/<token-inexistente>` e confirmar banner + estado `HML_ATTESTED`, nunca um formulário;
13. Comprovar, pela resposta do endpoint e pela ausência de qualquer chamada de rede visível ao domínio Supabase de produção, que zero tráfego chega à produção;
14. **Não** executar o gerador (`create-synthetic-homologation-links.ts`) em modo `--commit`;
15. **Não** criar nenhum link ou registro real nesta fase — isso permanece uma autorização separada e futura.
