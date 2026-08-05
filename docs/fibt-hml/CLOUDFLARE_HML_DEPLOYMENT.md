# Deployment isolado de homologação FIB-T (ISG) — Cloudflare Workers

> Documento de referência, sem valores reais. Nenhum secret, ref ou URL real
> aparece aqui — só nomes de variável e o que cada uma faz.
>
> Preparação técnica (FIBT-HML-2B): configuração e build sintético local.
> **Nenhum deployment remoto foi executado.** O comando de deploy real
> (seção "Sequência segura do primeiro deployment real" abaixo) permanece
> documentado, não executado — exige autorização própria.
>
> Hardening adicional (FIBT-HML-3A): Preview URLs desabilitadas por
> configuração; `wrangler secret put` isolado removido do fluxo padrão em
> favor de uma estratégia de secrets via arquivo privado; sequência de
> deployment reordenada em três etapas (bootstrap selado → Access →
> versão HML) para que o secret nunca exista numa versão sem proteção.

## Worker

Nome: `vitalos-fibt-hml-isg` (fixado em [`wrangler.hml.jsonc`](../../wrangler.hml.jsonc)).
Subdomínio: `workers.dev` — nunca `vitalos.com.br`, `www.vitalos.com.br` ou
`app.vitalos.com.br`.

## Variáveis

### Secrets server-side (nunca versionadas, configuradas como secret do Worker)

| Variável | O que é |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role do projeto Supabase de **staging** — bypassa RLS. **Nunca configurada via `wrangler secret put` isolado no bootstrap** — ver "Estratégia segura de secrets" abaixo para o motivo e o contrato real. |

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
| `preview_urls` | ausente (Nitro não declara) | `false` | ALTERADO_INTENCIONALMENTE (FIBT-HML-3A) — confirmado campo reconhecido pelo parser real do Wrangler 4.118.0 (teste de controle: um campo genuinamente desconhecido gera "Unexpected fields found in top-level field", este não gera nenhum aviso); reconfirmado por `wrangler deploy --dry-run` limpo contra o artefato real do build sintético desta preparação. Evita que cada `versions upload` gere uma URL de preview adicional fora do perímetro do Cloudflare Access. |
| `observability` | ausente | ausente | AUSENTE_COM_JUSTIFICATIVA — recurso opcional (logs), não necessário para correção ou contenção; pode ser adicionado depois sem quebrar paridade. |
| `placement` | ausente | ausente | AUSENTE_COM_JUSTIFICATIVA — "Smart Placement" é opcional, sem relação com segurança/roteamento. |
| `migrations` | ausente | ausente | AUSENTE_COM_JUSTIFICATIVA — refere-se a migrações de Durable Objects (conceito do Workers), não a migrations de banco; o app não usa Durable Objects. |
| bindings adicionais (KV/D1/R2/DO) | nenhum | nenhum | AUSENTE_COM_JUSTIFICATIVA — nenhuma variável server-side é declarada como binding em texto plano neste arquivo; todas são configuradas via secret/env do Worker, nunca versionadas aqui. |
| `rules` (glob ESModule) | `[{"type":"ESModule","globs":["**/*.mjs","**/*.js"]}]` | ausente | AUSENTE_COM_JUSTIFICATIVA (observado em FIBT-HML-3A, reconfirmado por build sintético) — `rules` só afeta o bundling que o próprio Wrangler faria; com `no_bundle: true` (presente e IGUAL nos dois arquivos), o Wrangler não bundla o artefato, então este campo é inerte. Nenhuma divergência de segurança ou de comportamento de deploy. |

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

## Estratégia segura de secrets (FIBT-HML-3A)

**`bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` isolado no bootstrap
foi retirado do fluxo padrão.** Motivo: `secret put` provoca a implantação
imediata de uma nova versão do Worker — se executado antes de o Worker ter
Cloudflare Access validado, essa nova versão (com o secret já presente) fica
exposta na URL `workers.dev` sem proteção, ainda que por uma janela curta.

Contrato operacional (substitui o comando isolado):

1. **Nunca** configurar o secret antes de existir uma proteção Access
   validada no Worker (ver "Etapa A/B/C" abaixo — o secret só entra na
   Etapa C, depois do Access da Etapa B estar confirmado);
2. **Nunca** usar `secret put` isoladamente no bootstrap;
3. Preparar o valor do secret em um **arquivo privado fora do repositório**
   (ex.: fora de qualquer worktree deste projeto, num diretório de
   credenciais controlado pelo operador) — nunca em `.env`, `.env.local`
   nem em qualquer arquivo versionado ou versionável;
4. **Não imprimir o valor** em nenhum terminal, log, relatório ou saída de
   comando;
5. **Não colocar o valor em `.env` versionado** — mesmo `.env.local`
   (gitignored) é desaconselhado para o valor real; preferir um arquivo
   fora da árvore do repositório;
6. Incluir o secret **somente na versão final já autorizada** para
   deployment real (Etapa C), nunca numa versão de bootstrap ou de teste;
7. Preferir uma destas duas estratégias — confirmado contra o Wrangler
   real instalado nesta preparação (**4.118.0**; ambas as flags existem e
   foram confirmadas via `--help`, não presumidas):

   **a)** `wrangler deploy --config wrangler.hml.jsonc --secrets-file <arquivo-privado>`
   — aplica o secret junto com o deploy, numa única operação; ou

   **b)** `wrangler versions upload --config wrangler.hml.jsonc --secrets-file <arquivo-privado>`
   seguido de `wrangler versions deploy --version-id <id-retornado> --percentage 100`
   — separa "criar a versão com o secret" de "rotear tráfego para ela",
   permitindo confirmar a versão (ex.: via preview interno, quando
   aplicável) antes de promovê-la. Preferível quando se quer um ponto de
   verificação explícito entre preparar e expor.

   Nenhum dos dois comandos foi executado nesta preparação.

8. O arquivo privado com o secret:
   - deve ficar **fora do repositório** (nenhum caminho dentro de
     `vitalos-fibt-hml-deployment-safety/` nem de qualquer worktree
     versionado deste projeto);
   - seu caminho **não pode aparecer em nenhum commit**, PR, comentário ou
     documentação;
   - deve ser **apagado após uso**, ou preservado apenas num diretório
     privado controlado pelo operador (fora do controle de versão),
     nunca deixado num diretório temporário compartilhado;
   - o valor do secret **nunca pode aparecer em stdout, relatório ou
     manifest** de nenhum comando gerado por esta preparação;
9. **Somente `SUPABASE_SERVICE_ROLE_KEY` é secret.** As demais variáveis
   server-side (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `FIBT_HML_AUTHORIZED_STAGING_REF`, `VITALOS_PRODUCTION_PROJECT_REF`,
   `FIBT_HML_FRONTEND_BASE_URL`, `VITALOS_RUNTIME_ENV`, `VITALOS_DB_TARGET`,
   `VITALOS_STAGING_PROJECT_REF`, `FORBIDDEN_PROJECT_REFS`,
   `FIBT_HML_DEPLOYMENT_ENABLED`) não são secretas e seguem o contrato
   separado descrito na tabela de variáveis acima — configuráveis como
   `vars` normais do Worker, nunca como `wrangler secret put`.

## Sequência seguro do primeiro deployment real (futuro — exige autorização própria)

Nenhuma das três etapas abaixo foi executada nesta preparação — documentadas
para a autorização de deployment futura, não para execução imediata.

### Etapa A — bootstrap selado

Uma versão **temporária, sem backend e sem dados** — nunca a versão que
importa o aplicativo VitalOS inteiro.

1. Autenticar na conta Cloudflare correta (`bunx wrangler login` ou token
   dedicado);
2. Criar o Worker (`vitalos-fibt-hml-isg`) com uma versão **selada**: sem
   nenhuma variável Supabase, sem `SUPABASE_SERVICE_ROLE_KEY`, sem nenhum
   secret configurado;
3. Essa versão selada deve responder apenas `403`/indisponível a qualquer
   requisição — nunca uma página, dashboard ou rota funcional do app;
4. **Nenhum código VitalOS funcional deve ser exposto** nessa versão —
   não é o artefato de `bun run build:hml:staging`, é um worker mínimo
   dedicado só a provar que o nome/domínio existe e está fechado;
5. `preview_urls: false` já garantido por `wrangler.hml.jsonc` (Correção 1
   desta preparação) — confirmar que nenhuma URL de preview adicional foi
   gerada para essa versão selada.

### Etapa B — Cloudflare Access

6. Habilitar Cloudflare Access na URL `workers.dev` do Worker criado na
   Etapa A;
7. Allowlist do Access contendo **somente** os e-mails explicitamente
   autorizados a participar da homologação — nunca "qualquer um com o
   link";
8. **`/api/fibt-hml/attestation` também deve ficar atrás do Access** —
   não é um endpoint "público por natureza" só por não expor segredo; ele
   confirma o estado do deployment e não há motivo para deixá-lo fora do
   perímetro por padrão, salvo necessidade operacional explicitamente
   aprovada à parte;
9. Validar em **sessão anônima** (sem login Access) que o acesso é negado;
10. Validar com um **usuário autorizado** que o bootstrap selado da Etapa A
    é alcançável (ainda que só devolva 403/indisponível — o que se testa
    aqui é que o Access deixa passar quem deve, não que o app funciona).

Access é uma **defesa adicional**, não um substituto do boundary da
aplicação (`hml-deployment-boundary.server.ts`) — nunca justifica abrir
`/_serverFn/*` de forma ampla: mesmo com Access habilitado, o boundary
continua allowlistando por identidade real de função
(`serverFnMeta.name`/`filename`), não por prefixo. As duas camadas cobrem
preocupações diferentes: Access impede que qualquer requisição não
autenticada chegue ao Worker; o boundary de aplicação impede que uma sessão
autenticada pelo Access (ou uma eventual falha de configuração do Access)
ainda consiga navegar para dashboards/admin/relatórios ou invocar uma
server function fora das 5 permitidas.

### Etapa C — versão HML real

Só depois de A e B confirmados.

11. Build limpo a partir de `origin/main` (`bun install --frozen-lockfile`
    seguido de `bun run build:hml:staging`);
12. Usar as `VITE_*` **definitivas de staging** durante o build (lista de
    variáveis públicas acima) — embutidas estaticamente, exigem rebuild se
    mudarem depois;
13. Incluir as variáveis runtime de staging não secretas (lista acima),
    incluindo `FIBT_HML_DEPLOYMENT_ENABLED=true`, como `vars` do Worker;
14. Incluir `SUPABASE_SERVICE_ROLE_KEY` **somente como secret** — via
    `--secrets-file` (estratégia "a" ou "b" acima), nunca `secret put`
    isolado nem variável de texto plano;
15. Realizar **um único deploy controlado** da versão HML (estratégia "a"),
    ou promover explicitamente a versão preparada (estratégia "b" — passo
    de `versions deploy` separado);
16. Exigir **`status:"READY"`** em `/api/fibt-hml/attestation` antes de
    considerar o deployment válido — qualquer `BLOCKED` interrompe a
    validação;
17. Verificar, pela resposta do endpoint e pela ausência de qualquer
    chamada de rede visível ao domínio Supabase de **produção**, que zero
    tráfego chega à produção;
18. **Não** executar o gerador (`create-synthetic-homologation-links.ts`)
    em modo `--commit`;
19. **Não** criar nenhum convite ou registro real nesta fase — isso
    permanece uma autorização separada e futura.

Confirmações adicionais, herdadas da preparação anterior:

- Confirmar o nome do Worker (`vitalos-fibt-hml-isg`) antes de confirmar
  qualquer deploy;
- Confirmar que a URL resultante é `*.workers.dev` (`workers_dev: true`,
  nenhuma rota customizada declarada, `preview_urls: false`);
- Testar `/convite/<token-inexistente>` e confirmar banner + estado
  `HML_ATTESTED`, nunca um formulário;
- Confirmar que rotas fora da allowlist (`/admin`, `/rh`, `/relatorios`,
  etc.) retornam 404 sanitizado — o boundary já está conectado
  (`src/start.ts`); confirmar apenas que `FIBT_HML_DEPLOYMENT_ENABLED=true`
  foi de fato configurado no Worker (sem essa variável, o boundary fica
  inativo por design).

**O deployment não poderá ser entregue ao RH enquanto as Etapas A, B e C
não estiverem completas, nessa ordem — nunca C antes de B.**
