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
| `FIBT_HML_DEPLOYMENT_ENABLED` | **Nova (FIBT-HML-2D).** Gatilho dedicado, server-side, da contenção de rotas (`hml-deployment-boundary.server.ts`) — deliberadamente independente de `VITE_FIBT_HML_ENABLED` (que só liga o banner no cliente). Valor esperado: exatamente `true`. Ausente = comportamento normal; qualquer valor presente que não seja exatamente `true` (vazio, `"1"`, `" true"`, etc.) bloqueia TODAS as rotas — nunca cai de volta ao modo comum em silêncio. |

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

## Paridade entre o wrangler.json gerado pelo Nitro e wrangler.hml.jsonc

Comparação mecânica (FIBT-HML-2C), a partir de um build sintético local
(`.invalid`, sem rede):

| Campo | Nitro gera | `wrangler.hml.jsonc` | Classificação |
| --- | --- | --- | --- |
| `main` | `index.mjs` (relativo a `.output/server/`) | `.output/server/index.mjs` (relativo à raiz do repo) | ALTERADO_INTENCIONALMENTE — mesmo arquivo físico, caminho reescrito porque este config vive na raiz do repo, não em `.output/server/`. |
| `name` | `tanstack-start-ts-<pasta-do-worktree>` (muda por worktree) | `vitalos-fibt-hml-isg` (fixo) | ALTERADO_INTENCIONALMENTE — permitido explicitamente; o auto-gerado nunca é o nome desejado. |
| `compatibility_date` | Data do dia do build (ex.: `2026-08-02`) | `2026-08-01` (pinada) | ALTERADO_INTENCIONALMENTE — compatível (≥ 2025-04-01, ver seção seguinte); pinar é decisão deliberada de reprodutibilidade, não um efeito colateral. |
| `compatibility_flags` | `["nodejs_compat"]` | `["nodejs_compat"]` | IGUAL |
| `no_bundle` | `true` | `true` | IGUAL — confirmado necessário: o artefato do nitro já vem empacotado. |
| `assets.directory` | `..\public` (relativo a `.output/server/`) | `.output/public` (relativo à raiz do repo) | ALTERADO_INTENCIONALMENTE — mesmo diretório físico, mesma razão do `main`. |
| `assets.binding` | `ASSETS` | `ASSETS` | IGUAL |
| `assets.run_worker_first` | ausente | `true` | ALTERADO_INTENCIONALMENTE — ver Fase 6 abaixo; não estritamente necessário hoje (nenhum HTML estático existe em `.output/public/`), ligado como defesa em profundidade. |
| `assets.not_found_handling` | ausente | ausente | AUSENTE_COM_JUSTIFICATIVA — não há HTML de fallback (SPA ou 404 customizado) no artefato; nada para configurar. |
| `workers_dev` | ausente (Nitro não declara) | `true` | ALTERADO_INTENCIONALMENTE — permitido explicitamente; garante `*.workers.dev`, nunca domínio próprio nesta fase. |
| `observability` | ausente | ausente | AUSENTE_COM_JUSTIFICATIVA — recurso opcional (logs), não necessário para correção ou contenção; pode ser adicionado depois sem quebrar paridade. |
| `placement` | ausente | ausente | AUSENTE_COM_JUSTIFICATIVA — "Smart Placement" é opcional, sem relação com segurança/roteamento. |
| `migrations` | ausente | ausente | AUSENTE_COM_JUSTIFICATIVA — refere-se a migrações de Durable Objects (conceito do Workers), não a migrations de banco; o app não usa Durable Objects. |
| bindings adicionais (KV/D1/R2/DO) | nenhum | nenhum | AUSENTE_COM_JUSTIFICATIVA — nenhuma variável server-side é declarada como binding em texto plano neste arquivo; todas são configuradas via secret/env do Worker, nunca versionadas aqui. |

**Nenhum campo técnico do Nitro foi removido sem justificativa** — `no_bundle`,
`compatibility_flags` e `assets.binding` são preservados exatamente.

### Confirmações específicas (Fase 2)

1. `no_bundle` preservado — confirmado necessário (artefato já empacotado pelo nitro, reconfirmar com `no_bundle: false` quebraria o deploy tentando rebundlar um bundle já processado);
2. `assets.directory` aponta para o diretório correto — `.output/public` a partir da raiz do repo resolve ao MESMO diretório físico que `..\public` resolve a partir de `.output/server/` (confirmado por inspeção de caminho, não suposição);
3. `binding` exigido pelo entrypoint (`ASSETS`) está presente e idêntico nos dois arquivos;
4. Nenhuma variável, URL ou secret está em `wrangler.hml.jsonc` — confirmado por leitura completa do arquivo;
5. Deploy usando `--config wrangler.hml.jsonc` não deve provocar rebundle incompatível — `no_bundle: true` está preservado e os caminhos `main`/`assets.directory` resolvem corretamente relativos à localização real do arquivo (raiz do repo).

## process.env no runtime Cloudflare (Fase 3)

- `compatibility_flags` contém `nodejs_compat` — confirmado nos dois arquivos;
- `compatibility_date` (`2026-08-01`) é posterior a `2025-04-01` — a margem é de mais de um ano, folgada;
- `process.env` no Worker recebe as vars/secrets configuradas na conta Cloudflare do Worker (dashboard ou `wrangler secret put`/`wrangler.jsonc` `vars`) — o shim `nodejs_compat` é o que faz essa ponte;
- confirmado por leitura do código-fonte: `hml-backend-boundary.server.ts` **nunca** lê `process.env` diretamente (recebe o ambiente como parâmetro, puro); as únicas 3 leituras reais de `process.env.*` no caminho HML (`invite-resolve.server.ts:29`, `response-capture.server.ts:74`, `api.fibt-hml.attestation.ts:69`) acontecem **dentro do corpo de uma função de request/handler**, nunca em escopo de módulo compartilhado — importante em runtime Workers, onde uma leitura em escopo de módulo rodaria só uma vez no cold start, potencialmente antes do binding de env estar disponível;
- ausência de qualquer variável obrigatória (`VITALOS_PRODUCTION_PROJECT_REF`, `FIBT_HML_AUTHORIZED_STAGING_REF`, etc.) mantém `assertHmlBackendBoundary()` em `BLOCKED` — comportamento herdado do PR #39, não alterado nesta fase.

## Superfície de rotas e contenção (Fase 4/5 — conectada, FIBT-HML-2D)

O artefato contém o **aplicativo inteiro** — dezenas de rotas (`/admin`,
`/rh`, `/clevel`, `/painel`, `/relatorios`, etc.), confirmado por inspeção
de `routeTree.gen.ts`. Estritamente necessário para a homologação:

- `/convite/:token` (página, GET/HEAD);
- `/api/fibt-hml/attestation` (atestação, GET/HEAD);
- as 5 server functions que o fluxo de convite usa: `checkInviteToken`,
  `submitSurveyResponses`, `checkAndAggregateByToken`,
  `recordSurveyFunnelSnapshot`, `loadSurveyFunnelResult`.

**Assets estáticos (`/assets/*`, `/favicon.ico`) não precisam de entrada na
allowlist** — confirmado por inspeção direta do artefato gerado
(`.output/server/index.mjs`): o próprio runtime do preset nitro
`cloudflare-module` resolve esses caminhos via `isPublicAssetURL()`, um
**lookup exato** contra o manifesto de arquivos realmente gerados pelo
build, ANTES de qualquer requisição alcançar o handler do TanStack Start.
Um caminho como `/assets/../admin` não corresponde a nenhum arquivo real
gerado, então nunca casa nesse lookup — cai (corretamente) no boundary da
aplicação, que o recusa por não estar na allowlist de página/API/server-fn.

### Conectado ao request path real

`src/lib/fibt-hml/hml-deployment-boundary.server.ts` implementa a decisão
(`assertHmlDeploymentRequestAllowed`) e está **conectada** como o PRIMEIRO
`requestMiddleware` global em `src/start.ts`
(`hmlDeploymentBoundaryMiddleware`, antes até do `errorMiddleware`).
Request middleware do TanStack Start roda em **toda** requisição
server-side — SSR, rotas de API e server functions — não apenas páginas
(documentação oficial: "Runs on ALL server requests (SSR, routes,
functions)"), o que resolve a limitação anterior de usar `__root.tsx` (que
só protegeria navegação de página, não server functions/APIs).

### Server functions — identidade real, não hash cru (fecha a lacuna anterior)

O id de cada server function na URL (`/_serverFn/<id>`) é
`sha256(arquivo--nomeDaFunção)` — confirmado por leitura do compilador do
TanStack Start (`start-plugin-core/start-compiler/compiler.js`) e
reconfirmado empiricamente: o mesmo hash de `checkInviteToken`
(`fae0711708444afdfe5b4a21062ea2ee5db64e44435e7e9f7e9e25cdab442b63`)
apareceu idêntico em três builds sintéticos distintos, com nomes de chunk
diferentes — a função é pura (dois fatos de código-fonte, sem
timestamp/salt), então o hash é estável entre rebuilds.

Em vez de allowlistar por esse hash (frágil de ler, fácil de errar), o
boundary usa o mecanismo OFICIAL do framework: `RequestServerOptions`
(`@tanstack/start-client-core`) entrega, a cada request middleware,
`serverFnMeta?: { name, filename }` — "metadata about the server function
being invoked... embedded at compile time by the TanStack Start compiler"
— já RESOLVIDA pelo framework a partir do hash da URL, ANTES do handler
rodar. O cliente não pode forjar esse valor: ele reflete a função que o
dispatch já determinou, nunca o contrário. O boundary allowlista por
`{filename, name}` exatos para as 5 funções acima — qualquer outra função
do app (ou uma requisição `/_serverFn/*` sem `serverFnMeta` resolvido,
estado anômalo) é recusada.

**Isso fecha, para o caso normal, a lacuna registrada na revisão anterior**
("não distingue por hash uma função de outra"). O residual que ainda
justifica Cloudflare Access como obrigatório (seção seguinte) não é mais
"o boundary não sabe distinguir" — é que o Access protege contra
requisições não autenticadas alcançarem o Worker DE FORMA NENHUMA,
enquanto o boundary de aplicação é a segunda camada (defesa em
profundidade), não a única.

## Deploy (documentado, não executado nesta preparação — Fase 7)

```
bunx wrangler deploy --config wrangler.hml.jsonc
```

Configurar o secret antes do primeiro deploy:

```
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.hml.jsonc
```

Nenhum destes comandos foi executado como parte desta preparação.

## Cloudflare Access — obrigatório antes da entrega ao RH (Fase 7)

**Não configurado nesta rodada.** Registrado aqui como requisito bloqueante
do primeiro deployment real, não como algo já feito:

- o subdomínio `workers.dev` deste Worker deve ficar protegido por
  Cloudflare Access antes de qualquer pessoa fora da equipe técnica receber
  o link;
- a allowlist do Access deve conter só as pessoas autorizadas a participar
  da homologação (o time do RH/ISG testando o fluxo), nunca "qualquer um
  com o link";
- o acesso deve ser removível ao final do teste — Access não é uma
  configuração permanente deste Worker;
- Access é uma **defesa adicional**, não um substituto do boundary da
  aplicação (`hml-deployment-boundary.server.ts`) — nunca justifica abrir
  `/_serverFn/*` de forma ampla: mesmo com Access habilitado, o boundary
  continua allowlistando por identidade real de função
  (`serverFnMeta.name`/`filename`), não por prefixo. As duas camadas
  cobrem preocupações diferentes: Access impede que QUALQUER requisição
  não autenticada chegue ao Worker; o boundary de aplicação impede que uma
  sessão autenticada pelo Access (ou uma eventual falha de configuração do
  Access) ainda consiga navegar para dashboards/admin/relatórios ou invocar
  uma server function fora das 5 permitidas;
- **o endpoint de atestação (`/api/fibt-hml/attestation`) também deve
  ficar atrás do Access durante a homologação**, salvo necessidade
  operacional explicitamente aprovada (ex.: um monitor externo de saúde que
  precise consultá-lo sem autenticação interativa) — não é um endpoint
  "público por natureza" só porque não expõe segredo; ele confirma o
  estado do deployment, e não há motivo para deixá-lo fora do perímetro por
  padrão.

**O deployment não poderá ser entregue ao RH enquanto o Cloudflare Access
não estiver habilitado e validado.**

## Checklist do primeiro deployment real (futuro — exige autorização própria)

1. Autenticar na conta Cloudflare correta (`bunx wrangler login` ou token dedicado);
2. Confirmar o nome do Worker (`vitalos-fibt-hml-isg`) antes de confirmar o deploy;
3. Confirmar que a URL resultante é `*.workers.dev` (`workers_dev: true`, nenhuma rota customizada declarada);
4. Configurar as variáveis públicas de build (lista acima) antes do build;
5. Configurar as variáveis server-side não secretas (lista acima), incluindo `FIBT_HML_DEPLOYMENT_ENABLED=true`, no ambiente do Worker;
6. Configurar `SUPABASE_SERVICE_ROLE_KEY` como **secret** (nunca como variável de texto plano);
7. Executar `bun run build:hml:staging`;
8. Executar `bunx wrangler deploy --config wrangler.hml.jsonc`;
9. Registrar a URL resultante (só depois de existir);
10. **Habilitar Cloudflare Access no subdomínio `workers.dev` antes de compartilhar a URL com qualquer pessoa fora da equipe técnica** (ver seção "Cloudflare Access" acima) — bloqueante, não opcional;
11. Abrir `/api/fibt-hml/attestation` na URL resultante;
12. Exigir `status:"READY"` antes de considerar o deployment válido — qualquer `BLOCKED` interrompe a validação;
13. Testar `/convite/<token-inexistente>` e confirmar banner + estado `HML_ATTESTED`, nunca um formulário;
14. Confirmar que rotas fora da allowlist (`/admin`, `/rh`, `/relatorios`, etc.) retornam 404 sanitizado — o boundary já está conectado (`src/start.ts`), confirmar apenas que `FIBT_HML_DEPLOYMENT_ENABLED=true` foi de fato configurado no Worker (sem essa variável, o boundary fica inativo por design);
15. Comprovar, pela resposta do endpoint e pela ausência de qualquer chamada de rede visível ao domínio Supabase de produção, que zero tráfego chega à produção;
16. **Não** executar o gerador (`create-synthetic-homologation-links.ts`) em modo `--commit`;
17. **Não** criar nenhum link ou registro real nesta fase — isso permanece uma autorização separada e futura.
