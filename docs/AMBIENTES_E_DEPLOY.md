# Ambientes e deploy

> Como este projeto decide **onde o código roda** e **qual banco ele toca** —
> duas perguntas separadas, que antes eram uma só e falhavam juntas.

## O problema que originou este documento

O `.env` versionado apontava para o projeto Supabase de **produção** e trazia
tudo junto: URL, chave e — implicitamente — a decisão de qual ambiente usar.
Consequência: todo clone novo, toda worktree nova e todo job de CI nascia com
produção como destino padrão, sem nada avisar. O modo de falha nunca foi
"faltou variável" — foi "havia uma variável, e ela apontava para o lugar
errado em silêncio". Um default que funciona é pior que um erro: ninguém
investiga o que não reclama.

Um segundo modo de falha, mais sutil, apareceu durante a validação visual da
FIBT-1: o navegador foi apontado para staging (`VITE_SUPABASE_URL`) enquanto o
lado servidor continuava lendo `SUPABASE_URL`, que seguia em produção. O app
não quebra nesse estado — ele apenas lê de um banco e escreve em outro.

### Por que a solução NÃO é remover o `.env` do git

A primeira tentativa foi tirar o `.env` do versionamento. **Isso quebra o
Lovable** e foi revertido:

- as variáveis `VITE_*` são lidas pelo Vite em **build time** e embutidas no
  bundle — precisam estar no repositório quando o Lovable builda;
- o **Secrets manager do Lovable não as substitui**: ele guarda secret de
  servidor, e `VITE_*` não é secret (vai para o bundle, é público por
  definição);
- sem `.env`, preview e publicação quebram.

A separação correta não é *arquivo versionado × arquivo escondido*, é
**configuração pública × decisão de ambiente**:

| | onde vive | versionado? |
| --- | --- | --- |
| URL do projeto, publishable key, `VITE_APP_URL` | `.env` | **sim** — é configuração pública de build |
| `VITALOS_RUNTIME_ENV` | argumento do comando (`package.json`) | sim, mas por comando |
| `VITALOS_DB_TARGET` | `.env.local` de cada máquina | **não** |
| service role, secret key, senha | Secrets manager / `.env.local` | **nunca** |

O que impede o incidente original não é esconder o `.env` — é ele **não conter
`VITALOS_RUNTIME_ENV` nem `VITALOS_DB_TARGET`**. Sem default versionado para
"onde roda" e "que banco toca", nenhum comando resolve produção por omissão.

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

Cada comando declara o próprio contexto por **argumento**, e o preflight roda
antes da ferramenta real:

| comando | runtime | alvo de banco |
| --- | --- | --- |
| `dev` | `local` | do `.env.local`; só `local` ou `staging` |
| `preview` | `preview` | `staging` (fixo) |
| `build` | `production` | `production` (fixo) — **contrato do Lovable** |
| `build:ci` | `ci` | `test` (fixo) |
| `build:dev` | `local` | do `.env.local`; só `local` ou `staging` |

Argumento em vez de variável de shell inline (`VAR=x cmd`): essa sintaxe não
funciona no shell padrão do Windows, onde este projeto roda.

Explícito no `package.json`, não via hook implícito: um hook `prebuild` é fácil
de contornar sem perceber (`vite build` direto ainda funcionaria). O objetivo é
que o caminho normal seja o caminho seguro.

`build` é o script que o **Lovable executa** para publicar — por isso ele
continua se chamando `build` e continua usando o `.env` público versionado.
`build:ci` existe separado justamente para o CI nunca exercitar o caminho
produtivo.

O preflight **não faz I/O de rede**. Um preflight que consultasse o banco para
"confirmar" o alvo já teria feito exatamente o que deveria impedir.

**Alvo de build `production` não é autorização para nada.** Ele descreve qual
configuração o bundle carrega — não libera acesso ao banco, aplicação de
migration, deploy nem publicação. Essas continuam sendo decisões humanas
separadas.

## Configuração por ambiente

### Local

Copie `.env.example` para **`.env.local`** (ignorado pelo git). Você declara só
o alvo de banco e as credenciais que usa — o runtime vem do comando:

```
VITALOS_DB_TARGET=staging
SUPABASE_URL=https://<ref-do-staging>.supabase.co
VITE_SUPABASE_URL=https://<ref-do-staging>.supabase.co
```

Sem `.env.local`, `bun run dev` **falha** — o `.env` versionado sozinho nunca
resolve um alvo de banco.

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

Definido em `.github/workflows/gate.yml`, sem nenhuma secret. O job roda
`build:ci`, **nunca** `build`:

```
VITALOS_RUNTIME_ENV=ci
VITALOS_DB_TARGET=test
SUPABASE_URL=https://ci.invalid
VITE_SUPABASE_URL=https://ci.invalid
VITE_APP_URL=https://app.ci.invalid
```

O domínio `.invalid` nunca resolve (RFC 2606) — o job não consegue fazer
chamada de rede a banco nenhum. E o contrato recusa `ci` com qualquer alvo que
não seja `test`, então adicionar uma secret por engano não muda nada.

Essas variáveis **sobrescrevem o `.env` versionado**: verificado
empiricamente que `process.env` vence os arquivos `.env` no Vite, e que o
bundle de CI sai contendo apenas `.invalid`, sem nenhum vestígio de produção.

### Produção

`build` já é o caminho de produção: runtime `production`, alvo `production`,
usando o `.env` público versionado — que é exatamente o que o Lovable executa
ao publicar.

Nada além da configuração pública vive ali. Service role e demais secrets
continuam apenas no Secrets manager do Lovable, nunca em arquivo do repositório.

## Regras invioláveis do `.env`

1. **Nunca** remova `.env` do versionamento nem o adicione ao `.gitignore` —
   quebra preview e publicação do Lovable.
2. **Nunca** coloque nele: `SUPABASE_SERVICE_ROLE_KEY`,
   `STAGING_SUPABASE_SECRET_KEY`, qualquer secret key, JWT privilegiado, senha
   ou token privado.
3. **Nunca** coloque `VITALOS_RUNTIME_ENV` ou `VITALOS_DB_TARGET` — são
   exatamente os defaults cuja ausência sustenta o contrato.
4. Qualquer variável `VITE_*` é **publicada no bundle**. Se o valor não pode ser
   lido por qualquer visitante do site, ele não pode ter esse prefixo.
5. Nome novo só entra depois de adicionado à allowlist do teste, com a natureza
   pública declarada.

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

O `.env` fica **fora** dessa varredura por formato — ele legitimamente contém
o ref público do projeto. A proteção dele é mais estrita, não mais frouxa: uma
**allowlist por nome de variável**, em que cada valor precisa comprovar
natureza pública. A publishable key passa porque seu payload JWT traz
`role: anon`; a mesma variável com `role: service_role` reprova. Nome fora da
allowlist reprova. É a diferença entre publicar configuração e publicar
incidente.

Sem build, a superfície 1 é pulada com aviso (para o gate continuar útil
localmente). No CI, `--require-artifact` transforma a ausência em falha, para
que ela nunca seja pulada em silêncio justamente onde ninguém está olhando.

## O que continua fora deste contrato

`SUPABASE_SERVICE_ROLE_KEY` e `PLATFORM_ADMIN_EMAILS` não estão no preflight
porque não vivem em arquivo do repositório — são secrets de servidor no
Lovable Cloud. `PLATFORM_ADMIN_EMAILS` segue com **duas fontes de verdade**
(local em `.env.local`, produção no painel) sem verificação automática de
sincronia; mantê-las iguais continua sendo disciplina, não garantia.
