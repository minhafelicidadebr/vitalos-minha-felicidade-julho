# Ambientes e deploy

> Como este projeto decide **onde o código roda** e **qual banco ele toca** —
> duas perguntas separadas, que antes eram uma só e falhavam juntas.

## O problema que originou este documento

O `.env` era versionado e apontava para o projeto Supabase de **produção**.
Consequência: todo clone novo, toda worktree nova e todo job de CI nascia com
produção como destino padrão, sem nada avisar. O modo de falha nunca foi
"faltou variável" — foi "havia uma variável, e ela apontava para o lugar
errado em silêncio". Um default que funciona é pior que um erro: ninguém
investiga o que não reclama.

Um segundo modo de falha, mais sutil, apareceu durante a validação visual da
FIBT-1: o navegador foi apontado para staging (`VITE_SUPABASE_URL`) enquanto o
lado servidor continuava lendo `SUPABASE_URL`, que seguia em produção. O app
não quebra nesse estado — ele apenas lê de um banco e escreve em outro.

## O contrato: duas dimensões

```
VITALOS_RUNTIME_ENV   local | preview | ci | production      (onde roda)
VITALOS_DB_TARGET     local | test    | staging | production (o que toca)
```

As duas são **obrigatórias**. Ausente, vazia ou desconhecida reprova — não
existe valor default.

### Matriz permitida

| runtime | alvos aceitos |
| --- | --- |
| `ci` | `test` |
| `preview` | `staging` |
| `production` | `production` |
| `local` | `local` ou `staging` |

Cinco combinações de dezesseis possíveis. A lista é **fechada**: tudo que não
está acima é recusado, inclusive combinações que "fariam sentido". Adicionar
uma nova tem que ser uma decisão explícita em
`src/lib/env/environment-contract.ts`, revisável em diff — nunca um efeito
colateral.

### Proibições que importam

- `local → production` — a máquina de alguém escrevendo no banco real.
- `preview → production` — preview é descartável; produção não.
- `ci → staging` e `ci → production` — CI não toca ambiente com dado real.
- `production → staging` — publicar apontando para o banco errado.

## Onde cada variável é lida

| variável | quem lê | quando |
| --- | --- | --- |
| `SUPABASE_URL` | servidor / SSR | runtime |
| `VITE_SUPABASE_URL` | navegador | **build time** (embutida no bundle pelo Vite) |
| `VITALOS_RUNTIME_ENV` / `VITALOS_DB_TARGET` | preflight | antes de dev/build/preview |
| `STAGING_SUPABASE_*` | scripts de prova | runtime do script |

**As duas URLs precisam apontar para o mesmo projeto.** O preflight extrai o
`project_ref` de cada uma e recusa a divergência.

### Natureza da URL casada com o alvo

Cada alvo aceita uma **natureza** de URL, e só ela — declarar um alvo e apontar
para outro tipo de banco é impossível, não apenas desaconselhado:

| alvo | natureza exigida | exemplo |
| --- | --- | --- |
| `test` | inerte | `https://ci.invalid` |
| `local` | loopback | `http://localhost:54321` |
| `staging` | remota | `https://<ref>.supabase.co` |
| `production` | remota | `https://<ref>.supabase.co` |

Misturar naturezas entre cliente e servidor também reprova.

Qualquer variável com prefixo `VITE_` **vai para o bundle do navegador**. Uma
secret key sob esse prefixo não "corre risco de vazar" — ela já está publicada.
O guard de staging recusa a execução se encontrar qualquer `VITE_*SECRET*` ou
`VITE_*SERVICE_ROLE*` no ambiente.

## Comandos protegidos

`dev`, `build`, `build:dev` e `preview` executam o preflight **antes** da
ferramenta real:

```
dev → bun run preflight && vite dev
```

Explícito no `package.json`, não via hook implícito: um hook `prebuild` é fácil
de contornar sem perceber (`vite build` direto ainda funcionaria). O objetivo é
que o caminho normal seja o caminho seguro.

O preflight **não faz I/O de rede**. Um preflight que consultasse o banco para
"confirmar" o alvo já teria feito exatamente o que deveria impedir.

## Configuração por ambiente

### Local

Copie `.env.example` para **`.env.local`** (nunca para `.env` — a família
`.env` inteira é ignorada pelo git):

```
VITALOS_RUNTIME_ENV=local
VITALOS_DB_TARGET=staging
SUPABASE_URL=https://<ref-do-staging>.supabase.co
VITE_SUPABASE_URL=https://<ref-do-staging>.supabase.co
```

### Staging (scripts de prova)

Os scripts de prova usam variáveis **namespaced** e nunca leem `SUPABASE_URL`
como fonte de alvo:

```
STAGING_SUPABASE_URL=https://<ref>.supabase.co
STAGING_SUPABASE_PUBLISHABLE_KEY=<publishable key>
STAGING_SUPABASE_SECRET_KEY=<secret key>
STAGING_SUPABASE_PROJECT_REF=<ref>          # opcional; se declarado, tem que bater
```

A nomenclatura legada (`STAGING_SUPABASE_ANON_KEY`,
`STAGING_SUPABASE_SERVICE_ROLE_KEY`) **não é mais aceita** — um teste estático
falha se voltar.

### CI

Definido em `.github/workflows/gate.yml`, sem nenhuma secret:

```
VITALOS_RUNTIME_ENV=ci
VITALOS_DB_TARGET=test
SUPABASE_URL=https://ci.invalid
VITE_SUPABASE_URL=https://ci.invalid
```

O domínio `.invalid` nunca resolve (RFC 2606) — o job não consegue fazer
chamada de rede a banco nenhum. E o contrato recusa `ci` com qualquer alvo que
não seja `test`, então adicionar uma secret por engano não muda nada.

### Produção (futuro — ainda não configurado)

`VITALOS_RUNTIME_ENV=production` + `VITALOS_DB_TARGET=production`, com as URLs
do projeto real definidas **como secret de servidor no painel do Lovable**,
nunca em arquivo do repositório.

## Git sync ≠ Publish changes

Distinção que decidiu o gate de merge da PR #32:

| | o que faz | dispara deploy? |
| --- | --- | --- |
| **Git sync** | sincroniza o código da branch ativa com o **editor** do Lovable | não |
| **Publish changes** | promove um **snapshot** para o site publicado | **sim** |

O aplicativo publicado é um snapshot separado. Merge na `main` sincroniza o
editor; mudanças só alcançam o site publicado por **ação manual explícita**
("Publish changes" ou comando de publicação no chat).

No lado GitHub, verificado nesta onda: nenhum workflow de deploy, zero
Deployments, zero Environments, nenhum webhook clássico.

### Como verificar o projeto conectado no painel do Lovable

1. Painel do Lovable → o projeto → configurações de Cloud/Supabase.
2. Confirme o `project_ref` exibido — compare **só os 4 primeiros e 4 últimos
   caracteres** com o do ambiente que você espera. Nunca cole a chave em
   lugar nenhum para "conferir"; o ref basta para identificar o projeto.
3. Confirme se a publicação é manual ou automática após sync.

### Como identificar o `project_ref` sem expor chave

O ref é o subdomínio da URL da API: `https://<ref>.supabase.co`. Ele **não é
segredo** (aparece em toda requisição do navegador), mas também não precisa
circular inteiro em log. Ferramentas deste repo imprimem sempre a forma
mascarada `abcd...wxyz` — o suficiente para confirmar identidade sem produzir
rastro.

## Feature gate da FIB-T

```
VITE_FIBT_PILOT_ENABLED=false
```

A rota `/fibt-piloto` lê persistência real e depende de três migrations
aplicadas **no staging e não em produção**. Com o flag ausente ou diferente de
exatamente `"true"`:

- a rota não chama o Supabase (nem com `?wave=` na URL);
- nenhuma RPC FIB-T é executada, nenhuma tabela FIB-T é consultada;
- a rota mostra estado de indisponibilidade — e **nunca** cai para mock;
- a rota não aparece em navegação nenhuma (nem no pack, nem no AppShell).

O gate é fail-closed: `"1"`, `"yes"`, `"on"` e variações **não** ligam o piloto.

Habilitar só em ambiente onde as migrations estejam comprovadamente aplicadas,
e apenas via `.env.local` não rastreado.

## Procedimento quando cliente e servidor divergem

Sintoma: o preflight recusa com "Servidor e navegador apontam para projetos
DIFERENTES".

1. **Não contorne o preflight.** A divergência não é o problema — é o aviso.
2. Verifique se `.env.local` sobrescreve só uma das duas URLs. Foi o que
   aconteceu na validação visual da FIBT-1: `VITE_SUPABASE_URL` foi apontada
   para staging e `SUPABASE_URL` ficou em produção.
3. Aponte **as duas** para o mesmo projeto.
4. Se você precisa mesmo de bancos diferentes nos dois lados, isso é uma
   mudança de arquitetura — não uma configuração. Discuta antes.

## Proibição de produção em scripts de prova

Nenhum script de `scripts/` pode rodar contra produção. A regra é imposta em
três camadas:

1. `requireStagingTarget()` só lê `STAGING_*` — nunca `SUPABASE_URL`.
2. O ref proibido é **derivado em runtime** de `SUPABASE_URL`, não fixado no
   código. Se o alvo de staging coincidir com ele, o script aborta antes de
   qualquer I/O.
3. Um teste estático (`scripts-guard-coverage.test.ts`) falha se qualquer
   script criar um cliente Supabase sem invocar o guard, ou se voltar a fixar
   um `project_ref` no código.

Antes desta onda, dois scripts tinham guard **próprio**, cada um comparando um
prefixo diferente fixado no código (`"shlmzz"` num, `"shlm"` no outro). Um
prefixo de quatro caracteres casaria com projetos que não são produção.

## Varredura de segredo

`bun run gate` inclui `bun run secret-scan`, que varre três superfícies:

1. **artefato** servido ao navegador (`.output/public/`) — service role,
   secret key, referência ao client admin;
2. **configuração versionada** — URL real, `project_ref`, JWT, chave `sb_*`;
3. **fontes** — credencial literal escrita no código.

A detecção em configuração é por **formato**, nunca por valor conhecido:
escrever o ref de produção no scanner para procurá-lo o colocaria no
repositório, que é o que se quer impedir.

Sem build, a superfície 1 é pulada com aviso (para o gate continuar útil
localmente). No CI, `--require-artifact` transforma a ausência em falha, para
que ela nunca seja pulada em silêncio justamente onde ninguém está olhando.

## O que continua fora deste contrato

`SUPABASE_SERVICE_ROLE_KEY` e `PLATFORM_ADMIN_EMAILS` não estão no preflight
porque não vivem em arquivo do repositório — são secrets de servidor no
Lovable Cloud. `PLATFORM_ADMIN_EMAILS` segue com **duas fontes de verdade**
(local em `.env.local`, produção no painel) sem verificação automática de
sincronia; mantê-las iguais continua sendo disciplina, não garantia.
