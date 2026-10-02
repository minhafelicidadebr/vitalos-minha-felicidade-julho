# Rollout IVO R5/R6 em staging — pacote operacional

Documento único do rollout IVO em staging. Não substitui
`docs/fibt-hml/*` (Worker histórico `vitalos-fibt-hml-isg`, que **não muda**).

## 1. Estado

| Item | Valor |
|---|---|
| Branch / PR | `feat/ivo-fibt-platform-foundation` / #51 (draft) |
| Commit de código do pacote | `a99e760` (evidências abaixo vinculadas a esta árvore) |
| CODE_READY | Sim — testes locais e CI do commit final |
| STAGING_PACKAGE_READY | **Parcial** — falta a configuração privada de staging (§8); sem ela não há artefato de staging nem dry-run com alvo real |
| REMOTE_SMOKE | Não executado |
| Escritas remotas desta onda | Nenhuma em banco/infra. Só GitHub (push + PR) |

## 2. Decisão (Tree of Thoughts, 3 caminhos)

- A — só a migration: insuficiente; o código recusa HML e o ledger fica sem capability.
- B — ampliar o Worker HML: mistura o deployment histórico (ISG, allowlist fechada) com o produto genérico.
- **C — perfil de staging IVO** (escolhido): Worker novo `vitalos-ivo-staging`, `VITALOS_IVO_PROFILE=staging` com projeto e organizações explícitos, reaproveitando sessão, leitor FIB-T e ledger. Recuperação da aplicação independe do banco.

## 3. Alvo

| | |
|---|---|
| Projeto Supabase | staging `xttjkpzhxtjfwxjsxuab` (produção `shlmzzchddohaytfakol` excluída: o perfil recusa se o ref coincidir) |
| Worker | `vitalos-ivo-staging` (`wrangler.ivo-staging.jsonc`), `workers_dev`, sem preview URLs |
| Borda | Aplicação Cloudflare Access cobrindo a URL workers.dev **antes do primeiro upload** |
| Organizações | Fictícias Alfa e Beta, criadas pelo provisionamento (§6.4) |

## 4. Banco — o mínimo necessário, nesta ordem

Rode `scripts/ivo-staging/preflight.sql` (somente leitura) antes de tudo. Cada passo abaixo só roda se o preflight indicar `MISSING` no item correspondente; qualquer `FAIL` interrompe o rollout.

| # | Arquivo | Quando | O que entrega |
|---|---|---|---|
| 1 | `supabase/migrations/20260705100000_action_plan_ledger.sql` | Se `table action_*` ou `function create_action_plan…` = MISSING | 4 tabelas do ledger (RLS: membro lê a própria org; sem escrita de cliente) e 5 RPCs `SECURITY DEFINER`, `search_path=public`, EXECUTE só `service_role`. Depende de `wave_capsules` (FK). |
| 2 | `supabase/migrations/20261002120000_fibt_action_provenance.sql` | Sempre (idempotente) | Colunas `source_*`, CHECKs corrigidos (R6-C1), FKs compostas por organização, `evidence_scope`, `create_action_plan` com validação de proveniência. |

Regras:
- **Nunca** reaplicar o passo 1 depois do passo 2 (recria `create_action_plan` sem validação). O preflight detecta (`R6 create_action_plan validates provenance` = MISSING) e a correção é reaplicar o passo 2.
- Não usar `supabase db push`, `--include-all` nem `migration repair`: o histórico remoto não está reconciliado. Não inserir linhas em `supabase_migrations.schema_migrations`.
- Procedimento por arquivo: conferir o SHA-256 do arquivo contra `supabase/migrations.manifest.json`; colar o conteúdo inteiro no SQL Editor de **staging** (o arquivo 2 tem `BEGIN/COMMIT` próprios; o 1 roda como submissão única); registrar horário, hash e o resultado do preflight posterior no log do rollout.
- Nada de M6A, G1 ou Task 10.1 é reaplicado por este rollout.

Prova local da sequência (commit `e6d095a` em diante): `db:replay:preprod` aplica ledger → R6 num clone do estado produtivo observado, confere o corpo da RPC, reconcilia a M6A e roda a suíte 07 com caminho de RPC **PROVADO** (não SKIP).

## 5. Configuração

Build (`bun run build:ivo:staging`, preflight `--runtime=preview --db=staging`) — variáveis do processo de build:

| Nome | Valor esperado |
|---|---|
| `VITALOS_STAGING_PROJECT_REF` | `xttjkpzhxtjfwxjsxuab` |
| `VITALOS_PRODUCTION_PROJECT_REF` | ref de produção (já no `.env` versionado) |
| `SUPABASE_URL`, `VITE_SUPABASE_URL` | URL do projeto de staging (sobrescrevem o `.env`) |
| `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable key de staging (pode ser opaca `sb_publishable_…`) |
| `VITE_FIBT_PILOT_ENABLED` | `true` |
| `VITE_APP_URL` | URL do Worker |
| `VITE_FIBT_HML_ENABLED` | **ausente** |

Runtime do Worker (`vars`) + 1 secret:

| Nome | Valor |
|---|---|
| `VITALOS_IVO_PROFILE` | `staging` |
| `VITALOS_IVO_AUTHORIZED_PROJECT_REF` | `xttjkpzhxtjfwxjsxuab` |
| `VITALOS_IVO_AUTHORIZED_ORG_IDS` | IDs de Alfa e Beta (saída do §6.4), separados por vírgula |
| `VITALOS_PRODUCTION_PROJECT_REF` | ref de produção |
| `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | iguais ao build |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** (`wrangler secret put`), nunca em `vars` |
| `FIBT_HML_DEPLOYMENT_ENABLED`, `VITE_FIBT_HML_ENABLED` | **ausentes** (presentes ⇒ perfil inválido ⇒ IVO recusa tudo) |

O perfil (`src/lib/ivo/ivo-runtime-profile.server.ts`) recusa antes de consultar a sessão se o projeto da URL ≠ autorizado, se produção não está declarada ou coincide, ou se a allowlist está vazia/malformada. A organização sempre vem da sessão; a allowlist só restringe. `ACTION_PLAN` liga apenas para o ciclo IVO; o registro global e `/plano-acao` legado continuam desligados.

## 6. Sequência

1. **Snapshot** (antes de qualquer escrita): confirmar backup diário/PITR do projeto no dashboard; e
   `docker run --rm postgres:17 pg_dump "$STAGING_DB_URL" --schema-only -f ivo-pre-schema.sql` +
   `pg_dump "$STAGING_DB_URL" --data-only -t 'public.action_*' -t public.evidence_records -f ivo-pre-ledger.sql`
   (`STAGING_DB_URL` vem do cofre do operador; arquivos fora do repositório).
2. **Preflight** `scripts/ivo-staging/preflight.sql`. Interromper em qualquer `FAIL`.
3. **Banco** §4 (passo 1 condicional, passo 2). **Preflight de novo**: todos os itens de banco = PASS (fixtures ainda MISSING).
4. **Provisionamento** (escreve em staging: usuários de teste, organizações, onda, respostas sintéticas):
   ```
   bun run ivo:staging:provision --target-ref=xttjkpzhxtjfwxjsxuab            # plan: só valida, sem rede
   bun run ivo:staging:provision --target-ref=xttjkpzhxtjfwxjsxuab --apply \
     --out=<privado>/ivo-staging-manifest.json --secrets-out=<privado>/ivo-staging-test-passwords.json
   ```
   Requer `IVO_STAGING_ALFA_ADMIN_EMAIL`, `IVO_STAGING_ALFA_MEMBER_EMAIL`, `IVO_STAGING_BETA_ADMIN_EMAIL` (caixas reais do operador — o login é por link mágico), `SUPABASE_SERVICE_ROLE_KEY` e `VITE_FIBT_PILOT_ENABLED=true` no ambiente. Idempotente; estado parcial aborta. Imprime os IDs para `VITALOS_IVO_AUTHORIZED_ORG_IDS`.
5. **Build** `bun run build:ivo:staging`; `bun run scripts/build-secret-scan.ts --require-artifact`; registrar SHA-256 de `.output/server/index.mjs`.
6. **Dry-run** `bunx wrangler deploy --dry-run --config wrangler.ivo-staging.jsonc --outdir <tmp>`.
7. **Access** confirmado na URL do Worker; **vars/secret** do §5 configurados.
8. **Deploy** `bunx wrangler deploy --config wrangler.ivo-staging.jsonc`; registrar o version id.
9. **Smoke** (§7). **Preflight final**.

Critérios de interrupção: `FAIL` no preflight; erro em qualquer migration (a transação volta inteira); provisionamento abortado; requisição sem Access que não seja redirecionada; qualquer dado de uma organização visível à outra; número exibido em setor protegido.

## 7. Smoke remoto (pela interface, com Access)

| # | Ação | Esperado |
|---|---|---|
| S1 | `curl -sI <worker>/ivo-integral` sem Access | 302/403 da Cloudflare Access |
| S2 | Admin Alfa: `/entrar` → link no e-mail → `/ivo-integral` | Resumo "Organização Fictícia Alfa", Q2 FIB-T 1.0.0 disponível em parte dos setores |
| S3 | `/ivo-integral/q2` | Operações com fatores; Atendimento "Publicação pendente"; Logística/Financeiro "Protegido" `<5`; Comercial "Em coleta" |
| S4 | `/ivo-integral/acoes`: prioridade Operações × Bem-Estar → responsável/prazo/indicador → ativar → "Em execução" → evidência de execução e aprendizagem → **recarregar** | Tudo reaparece; eficácia "não avaliada"; dimensão "mapeamento pendente" |
| S5 | Membro Alfa (papel não administrativo) | "Acesso não autorizado" |
| S6 | Admin Beta: `/ivo-integral/q2` e `/acoes` | Beta inteira protegida (supressão complementar); nenhuma ação ou dado da Alfa |
| S7 | Preflight final | Todos PASS |

## 8. Recuperação

**Aplicação** (não toca o banco):
- Desligar IVO sem redeploy: `VITALOS_IVO_PROFILE=disabled` (valor inválido ⇒ toda leitura/escrita IVO recusada antes da sessão).
- Bloquear a borda: política Access "deny all" na aplicação do Worker.
- Versões seguintes: `bunx wrangler rollback <version-id> --name vitalos-ivo-staging`. No primeiro deploy não há versão anterior: usar os dois itens acima.

**Banco** (independente; rollback de Worker não desfaz migration):
- As migrations são aditivas e idempotentes; código anterior ignora as colunas novas.
- Correção progressiva: nova migration ou reaplicação do passo 2. Não preparar DROP de colunas nem remoção automática de dados como recuperação.
- Se o passo 1 regredir `create_action_plan`, reaplicar o passo 2.
- Dados do ledger das organizações fictícias podem permanecer; remoção, se decidida, é ato manual autorizado à parte.

## 9. Evidências desta árvore (local)

| Evidência | Resultado |
|---|---|
| Regressão R6-C1 antes da correção (suíte 07 bloco 4 contra a versão anterior) | 7 ataques aceitos (INSERT/UPDATE com lente ou fator nulo, lente nula com lift) |
| Depois da correção | clean 36/36, preprod 46/46, upgrade 49/49; atualização da versão defeituosa substitui os CHECKs |
| Promoção ledger → R6 no clone produtivo | caminho de RPC PROVADO |
| Perfil staging (unit) | ambiente/projeto/produção/allowlist/HML: recusa; org fora da allowlist: forbidden |
| `demo:ivo:proof` (Supabase local, sessões reais, dados do provisionamento) | 30 + 5 PASS (isolamento Alfa/Beta, sessão ausente/inválida, papel insuficiente, origem não publicada, persistência após processo novo) |
| Provisionamento reexecutado | contagens idênticas (orgs/ondas/setores/respostas/perfis/publicações) |
| Preflight no stack promovido | 50/50 PASS |
| `bun run gate` + `build:ci` + secret-scan `--require-artifact` | 3923 pass / 0 fail |
| `wrangler deploy --dry-run` (artefato de CI **inerte**) | empacotamento OK (Wrangler 4.147.0). Valida a config, **não** é artefato de staging |

## 10. Pendências para declarar STAGING_PACKAGE_READY

Configuração privada de build de staging indisponível nesta máquina: `VITALOS_STAGING_PROJECT_REF`, `SUPABASE_URL`/`VITE_SUPABASE_URL` de staging e a publishable key de staging (nenhum `.env.local` ou arquivo privado presente). Com elas: §6 passos 5–6 produzem o artefato com alvo efetivo, hash e dry-run.
