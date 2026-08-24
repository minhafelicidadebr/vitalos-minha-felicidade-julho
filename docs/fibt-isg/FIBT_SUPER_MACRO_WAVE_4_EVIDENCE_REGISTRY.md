# FIB-T Super-Macro-Onda 4 - Evidence Registry

Data da rodada original: 2026-08-12
Data da retomada/reconciliacao: 2026-08-24
Ambiente remoto autorizado: HML/STAGING
Producao acessada: nao

## Estado desta retomada

- Branch recuperada: `feat/fibt-isg-manager-control-center`.
- HEAD de inicio: `a16693007cef269c0f0fb63ea009ec5d5b747022`.
- Arquivos dirty foram classificados como A-E (implementacao, testes,
  documentacao, configuracao ou historico); `src/routeTree.gen.ts` foi gerado
  pelo build e permanece fora do escopo. `UNKNOWN_FILES=0`.
- O codigo local de PKCE, callback same-origin, retorno sanitizado, bloqueio de
  open redirect e rota de conta existente esta presente e coberto por testes:
  `AUTH_CODE_FIX_PRESENT=PASS_LOCAL`.
- A correcao local evita que HML dependa de `?wave` ou de uma sessao Supabase
  para resolver a campanha sintetica canonica no servidor.
- A causa historica do defeito de autenticacao continua registrada como:
  redirect nao allowlistado, `SITE_URL` incorreto, boundary de callback HML
  ausente e fluxo implicit. Isso foi tratado no codigo local; a configuracao
  remota foi reconciliada e o reteste browser confirmou o callback HML.
- `HML_AUTH_CONFIG_RECONCILED=PASS`.
- `HML_BROWSER_AUTH_RETEST=PASS`.
- `REMOTE_CONFIG_POSTFLIGHT=PASS_HUMAN`.
- `HML_CALLBACK_REDIRECT_ACCEPTED=PASS_HUMAN`.
- `EFFECTIVE_REDIRECT_IS_LOCALHOST=false`.
- Nenhuma migration, deploy, acesso de producao ou resposta sintetica foi
  executado nesta retomada.

## Escopo entregue

| Superficie | Estado | Evidencia |
| --- | --- | --- |
| Centro de controle | IMPLEMENTED_LOCAL; HML HISTORICAL | `/fibt-piloto` integra campanha, participacao, setores, links, privacidade, fatores, bloqueios e proxima acao |
| Autorizacao comum | PASS | organizacao derivada de `requireOrgAdmin`; `orgId` do cliente nunca e autoridade |
| Autorizacao HML | PASS_LOCAL_AND_HML_AUTH | requer deployment atestado, identidade Cloudflare Access verificada e campanha sintetica canonica |
| Boundary HML | PASS | rota GET/HEAD e somente as tres ServerFns do centro de controle foram adicionadas a allowlist exata |
| Engine FIB-T | PRESERVED | motor canonico continua sendo a unica autoridade de scoring e agregacao |
| Operacoes de link | PASS_LOCAL_CONTRACT; HML HISTORICAL | emissao, recusa de duplicata, leitura operacional e revogacao validadas |
| Telemetria | PASS_LOCAL_SCOPE_FILTER; HML HISTORICAL | eventos de campanha permitidos, sem token, resposta, identidade ou motivo livre |
| Migration nova | NOT_REQUIRED | schema e invariantes existentes cobrem a onda 4 |

## Decisoes de arquitetura

- Uma unica pagina operacional conecta campanha, participacao, estado dos setores,
  limiar de publicacao, fatores FIB-T e administracao de links.
- Fora do deployment HML, a pagina exige sessao Supabase administrativa e uma onda
  selecionada. No HML isolado, a onda e a organizacao sao resolvidas no servidor
  pela identidade sintetica canonica; o cliente nao escolhe tenant.
- A consulta de respostas ocorre apenas no modulo `.server.ts`, depois das
  verificacoes de organizacao, onda e conjunto exato de coortes. Respostas e
  respostas individuais nunca entram no snapshot, na telemetria ou no DOM.
- O token bruto e devolvido uma unica vez na emissao. O banco recebe somente
  SHA-256, e a UI nao persiste o token.
- Link expirado nao e renovado silenciosamente: a operacao exige revogacao
  explicita antes de nova emissao.

## Contratos analiticos e de privacidade

| Contrato | Resultado |
| --- | --- |
| Total de itens | 32 |
| Distribuicao por fator | 12 / 12 / 8 |
| Item 5 | Fator 3 |
| `k_min` | 5 |
| Missing como zero | proibido |
| Faixas, indices ou cutoffs novos | nenhum |
| Estados analiticos | `available`, `suppressed`, `no_data`, `error` |
| Resposta individual no admin | nenhuma |
| Cruzamento de tenant/coorte | fail-closed |

O staging atual comprova os estados sem gerar respostas adicionais: a coorte
TESTE-ISG-A permanece suprimida por `k<5` e TESTE-ISG-B permanece sem dados.
Uma divergencia historica de vinculacao de coorte e apresentada apenas como
bloqueio de integridade da leitura da onda; nenhum identificador, contagem
individual ou conteudo de resposta e exposto.

## UX e acessibilidade

- Hierarquia executiva: campanha e prontidao antes de fatores e operacoes.
- Estado de privacidade deliberado, sem substituir dado suprimido por zero.
- Loading anunciado, erros recuperaveis e estados vazios distintos.
- Controles nativos com rotulos acessiveis, foco visivel e alvos de toque de
  pelo menos 44 px.
- Layout fluido sem largura fixa, com reorganizacao para desktop, tablet e
  mobile; graficos preservam rotulos e nao introduzem scroll horizontal fixo.
- Nenhum ranking individual ou identificador pessoal aparece na superficie.

## Validacao local desta retomada

| Gate | Resultado |
| --- | --- |
| Testes focados apos correcao | PASS - 19 testes / 42 expectations |
| Full gate | PASS - 3.683 testes / 10.824 expectations |
| TypeScript | PASS |
| Lint dos arquivos novos/fixados | PASS |
| Lint amplo do dirty worktree | LIMITADO - erros de CRLF em arquivos historicos dirty nao relacionados |
| Build CI com endpoints inertes | PASS |
| Build HML privado | BLOCKED_PRIVATE_ENV - `VITALOS_STAGING_PROJECT_REF` ausente |
| Schema parity | PASS |
| Migration manifest | PASS - 51 migrations |
| Secret scan | PASS |
| Diff check | PASS |

O build CI foi executado com overrides de processo para endpoints inertes, sem
alterar arquivos de ambiente. O build HML/STAGING privado nao foi reproduzido
localmente nesta retomada sem materializar o ambiente privado; o artefato HML
ja ativo foi validado pela jornada browser protegida.

## Validacao HML/STAGING historica

Os resultados abaixo sao os registrados em 2026-08-12. Eles nao foram tratados
como prova de estado remoto atual nesta retomada.

| Gate | Resultado |
| --- | --- |
| Preflight de ambiente | PASS - `preview/staging` |
| Artefato server | PASS - SHA-256 `e9ae74db122edbbcd77e7fa5b29e6a96c1554eb110d0a2614498d1f7bcf219b7` |
| Metadados da rota/ServerFns | PASS - rota e tres operacoes presentes no bundle |
| Wrangler dry-run | PASS |
| Deploy | PASS - nova versao confirmada ativa |
| Campanha sintetica | PASS - organizacao, onda, instrumento, versao e coortes A/B exatos |
| Leitura do manager | PASS - somente snapshot agregado e metadata operacional |
| Emissao reversivel em B | PASS |
| Hash-only remoto | PASS |
| Segundo link ativo | DENIED_AS_EXPECTED |
| Revogacao e restauracao do estado original | PASS |
| Telemetria de link | PASS |
| Respostas sinteticas criadas | 0 |
| Atestacao pos-deploy via cliente sem sessao Access | BLOCKED_EXPECTED - HTTP 302 para Access |
| Browser E2E autenticado | PENDING_HUMAN_ACCESS |

## Postflight HML desta retomada

| Gate | Resultado |
| --- | --- |
| Build/deploy HML nesta retomada | NOT_EXECUTED - artefato ativo ja existente |
| Configuracao Supabase Auth remota | PASS_HUMAN |
| `SITE_URL` e allowlist de callback | PASS_HUMAN |
| Callback final sem localhost | PASS_HUMAN |
| Atestacao do artefato atual | PASS_HUMAN_BROWSER |
| Browser E2E com Access | PASS_HUMAN_AUTH_RETEST |

## Riscos e limitacoes restantes

1. A campanha sintetica preserva uma divergencia historica de coorte. O centro
   de controle a bloqueia corretamente; reconciliar esse dado nao faz parte
   desta onda e exigiria decisao explicita de custodia.
2. A leitura agregada server-side precisa acessar respostas completas para usar
   o engine canonico. O acesso esta limitado ao servidor depois dos gates de
   tenant/onda/coorte, mas continua sendo uma superficie sensivel a manter sob
   testes de regressao.

## Gate humano historico encerrado

Executar uma unica operacao humana no HML: verificar e, se necessario, salvar
somente estas configuracoes de Auth — Site URL
`https://vitalos-fibt-hml-isg.pesquisafib.workers.dev` e redirect URL
`https://vitalos-fibt-hml-isg.pesquisafib.workers.dev/auth/callback**` — e entao
retestar no navegador uma jornada controlada em `/fibt-piloto`, com Network
aberto, sem criar respostas. Confirmar que o callback final permanece no HML,
carregar campanha/coortes, confirmar os estados suprimido/sem dados/bloqueio,
validar desktop/tablet/mobile e emitir/revogar um link de TESTE-ISG-B. Reportar
somente PASS/FAIL; nao compartilhar token, cookie, magic link ou email.

Resultado do gate: `HML_AUTH_CONFIG_RECONCILED=PASS` e
`HML_BROWSER_AUTH_RETEST=PASS`. O callback final permaneceu no HML e nao
resolveu para localhost.
