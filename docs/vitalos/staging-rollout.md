# Rollout IVO R5/R6 em staging — pacote operacional

Documento único do rollout IVO em staging. O Worker histórico
`vitalos-fibt-hml-isg` (`docs/fibt-hml/*`) **não muda**.

## 1. Estado e entrada única

Toda a preparação passa por `bun run ivo:staging:prepare <comando>`
(`scripts/ivo-staging-prepare.ts`; adaptador PowerShell 5.1 com prompt oculto
em `scripts/ivo-staging/prepare.ps1`). Comandos: `build`, `preflight`,
`snapshot`, `edge-check`, `secrets-file`, `provision`, `finalize`.

| Marco | Estado |
|---|---|
| CODE_READY | Sim (gate + CI do commit do pacote) |
| BUILD_ENV_READY | Sim — alvo canônico fixo; chave pública obtida pelo Supabase CLI autenticado e validada no projeto (`GET /auth/v1/settings` → 200) |
| STAGING_ARTIFACT_VERIFIED | Sim — pacote em `.ivo-staging.local/packages/<commit12>-<carimbo>/` (fora do git), hash publicado no PR |
| DRY_RUN | Sim — bootstrap, app e contenção sobre o MESMO pacote, digest conferido depois |
| ROLLOUT_PLAN_READY | Sim — entradas, ordem, recuperação e comandos definidos abaixo |
| REMOTE_SMOKE | Parcial — S1 e S9 remotos verificados; S2–S8 (login autenticado no navegador) pendentes (§11) |

Escritas e verificações já realizadas no staging: ver §11 (separadas em testes locais, verificações remotas e pendências).

## 2. Mecanismo de preparação (decisão)

Configuração por **processo filho** com ambiente montado pelo script, chave
pública vinda da integração autenticada já instalada (Supabase CLI) ou de
prompt oculto. Rejeitados: arquivo privado com chave (precisa de ciclo de vida
e limpeza) e editar `.env`/dashboard (herança silenciosa, sem verificação). O
ambiente do chamador não é alterado; o adaptador restaura variáveis no `finally`.

## 3. Alvo (valores públicos)

| | |
|---|---|
| Supabase | `xttjkpzhxtjfwxjsxuab` (`https://xttjkpzhxtjfwxjsxuab.supabase.co`); produção `shlmzzchddohaytfakol` só como bloqueio |
| Conta Cloudflare | `cf5c12917add1a584f7ee33bc7a56a6a` (wrangler whoami); subdomínio `pesquisafib` (confirmado: `vitalos-fibt-hml-isg.pesquisafib.workers.dev` → 302 Access) |
| Worker | `vitalos-ivo-staging` (inexistente na leitura: 10007) → `https://vitalos-ivo-staging.pesquisafib.workers.dev` = `VITE_APP_URL` |
| PostgreSQL | 17.6 |

## 4. Entradas

| Entrada | Fonte | Estado |
|---|---|---|
| Ref/URL de staging e ref de produção | fixos em `scripts/ivo-staging/package-lib.ts` | ok |
| Publishable key | `supabase projects api-keys` (CLI autenticado) ou `prepare.ps1` (prompt oculto); aceita `sb_publishable_` ou anon legada; recusa secret/service_role | ok |
| `VITE_FIBT_PILOT_ENABLED` | `true` (fixado pelo build) | ok |
| Declarações HML / fixture local / `VITALOS_DB_TARGET` | **removidas** do processo de build (não "false") | ok |
| `SUPABASE_SERVICE_ROLE_KEY` | `secrets-file` → arquivo privado fora do repo → `wrangler deploy --secrets-file` e `provision` | gerado no rollout |
| `IVO_STAGING_ALFA_ADMIN_EMAIL`, `IVO_STAGING_ALFA_MEMBER_EMAIL`, `IVO_STAGING_BETA_ADMIN_EMAIL` | 3 caixas reais do operador (login por link mágico) | **operador** |
| E-mails da política Access | pessoas nomeadas (sem curinga de domínio) | **operador** |
| IDs de Alfa/Beta | saída do `provision --apply` (nunca IDs da demo local — `finalize` recusa) | gerado no rollout |

## 5. Bindings do Worker — fonte de verdade

O config efetivo do pacote (`wrangler.app.json`) é a fonte de verdade:
`keep_vars: false` faz o deploy **apagar** vars do Dashboard e aplicar
exatamente estas; `secrets.required` faz o deploy falhar sem o secret. Não
editar vars no Dashboard.

| Var | Valor |
|---|---|
| `VITALOS_IVO_PROFILE` | `staging` |
| `VITALOS_IVO_AUTHORIZED_PROJECT_REF` | `xttjkpzhxtjfwxjsxuab` |
| `VITALOS_IVO_AUTHORIZED_ORG_IDS` | `PENDENTE_PROVISIONAMENTO` até o `finalize` — placeholder **invalida** o perfil (fail-closed); o perfil `default` nunca conta como staging configurado |
| `VITALOS_PRODUCTION_PROJECT_REF` | `shlmzzchddohaytfakol` |
| `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | iguais ao build |
| Secret `SUPABASE_SERVICE_ROLE_KEY` | `--secrets-file` (aditivo; não apaga secrets) |

`workers_dev: true`, `preview_urls: false` (sem Version/Preview URLs),
`run_worker_first: true` (assets também passam pelo Worker e pelo Access).

## 6. Banco — o que o preflight observou e o que falta

`bun run ivo:staging:prepare preflight` (somente SELECT): **41 PASS · 9 MISSING · 0 FAIL**.
Ledger `20260705100000`: as 5 RPCs com corpo **idêntico ao do repositório**
(md5 normalizado), ACL só `service_role`, RLS ligada, colunas iguais, 0 linhas
em `action_*`. Decisão: **não reaplicar o ledger**. MISSING: os 7 itens de R6
e as 2 organizações fictícias.

Única mudança de banco: `supabase/migrations/20261002120000_fibt_action_provenance.sql`.
- Atômica: `BEGIN … COMMIT` próprios, uma transação; erro ⇒ nada muda.
- Estado antes: ledger sem R6. Depois: ledger + R6. Não há estado intermediário.
- Não existe rollback conjunto com o provisionamento (transações distintas, etapas seguintes).
- Método: conferir SHA-256 contra `supabase/migrations.manifest.json` e executar o arquivo inteiro:
  `bunx supabase@2.119.0 db query --linked --project-ref xttjkpzhxtjfwxjsxuab -f supabase/migrations/20261002120000_fibt_action_provenance.sql`
  (ou colar no SQL Editor). Sem `db push`, `--include-all` ou `migration repair`; nada é escrito em `supabase_migrations.schema_migrations`.
- Nunca reaplicar `20260705100000` depois de R6 (recria `create_action_plan` sem validação; o preflight acusa).

## 7. Sequência executável

1. **Pacote** (já feito para o commit do PR): `bun run ivo:staging:prepare build` — exige worktree limpo; gera diretório novo a cada execução, nunca sobrescreve.
2. **Borda, sem exposição intermediária**
   1. `bunx wrangler@4.147.0 deploy --config <pkg>/wrangler.bootstrap.json` — cria o Worker com uma versão selada (403 em tudo, sem vars, sem secret, sem código VitalOS).
   2. Dashboard → Workers & Pages → `vitalos-ivo-staging` → Settings → Domains & Routes → workers.dev → habilitar Cloudflare Access; política só com as pessoas nomeadas.
   3. `bun run ivo:staging:prepare edge-check` — `/`, `/ivo-integral`, `/ivo-integral/q2`, `/_serverFn/…`, `/assets/…`, `/favicon.ico`, `/entrar` precisam dar 302 para `*.cloudflareaccess.com` (controle positivo provado contra o Worker histórico). O 403 do bootstrap **não** conta.
3. **Snapshot**: `bun run ivo:staging:prepare snapshot --via-cli --out-dir=<privado>` (schema `public` + dados de `public`, SQL plano, `SHA256SUMS`, `coverage.json`; credenciais redigidas nos logs). Alternativa com URL própria: `prepare.ps1 -Command snapshot -OutDir <privado>` (URL por prompt oculto → `pg_dump -Fc` em volume `-v <host>:/backup`, TOC + SHA-256). Não cobre `auth.*`/`storage.*` — o backup do projeto (PITR/diário) segue sendo a referência para isso.
4. **Preflight** → esperado 41/9/0 e "não reaplicar o ledger".
5. **Banco** (§6) → **preflight**: R6 PASS; só fixtures MISSING.
6. **Provisionamento**: `bun run ivo:staging:prepare secrets-file --out=<privado>\ivo-staging.secrets.json`; definir os 3 e-mails; `… provision --secrets-file=<privado>\ivo-staging.secrets.json` (plano) e depois `… --apply --out=<privado>\provision-manifest.json --secrets-out=<privado>\test-passwords.json`. Escreve: 3 usuários de teste, 2 organizações (convite → `provision_organization_from_invite`), 1 membro, 2 ondas, 7 setores, 7 links, 31 respostas sintéticas, publicação de Operações e tentativa em Produção (retida por supressão complementar). Idempotente; estado parcial aborta. **Preflight**: tudo PASS.
7. **Runtime**: `bun run ivo:staging:prepare finalize --package=<pkg> --provision-manifest=<privado>\provision-manifest.json` — valida projeto e IDs, regrava `wrangler.app.json`, refaz o dry-run, confere o digest do código; registrar `runtime-manifest.json`.
8. **Deploy do pacote identificado**: `bunx wrangler@4.147.0 deploy --config <pkg>/wrangler.app.json --secrets-file <privado>\ivo-staging.secrets.json`; registrar o version id; `edge-check` de novo.
9. **Smoke** (§8).

Interromper em: `FAIL` ou divergência no preflight; erro na migration; provisionamento abortado; qualquer caminho sem Access; perfil não-staging após o deploy (Q2 responde "não está habilitada corretamente"); dado de uma organização visível à outra; número em setor protegido.

## 8. Smoke remoto (Access + contas do operador; só organizações fictícias)

| # | Ação | Esperado |
|---|---|---|
| S1 | `edge-check` | todos os caminhos 302 → Access |
| S2 | Admin Alfa: `/entrar` → link → `/ivo-integral` | "Organização Fictícia Alfa", Q2 FIB-T 1.0.0 disponível em parte dos setores; dimensão "mapeamento pendente" |
| S3 | `/ivo-integral/q2` | Operações com fatores; Atendimento "Publicação pendente"; Logística/Financeiro "Protegido" `<5`; Comercial "Em coleta" |
| S4 | `/ivo-integral/acoes`: prioridade Operações × Bem-Estar → responsável/prazo/indicador → ativar → "Em execução" → execução e aprendizagem → **recarregar** | tudo reaparece; eficácia "não avaliada" |
| S5 | Prioridade em setor protegido (URL com `setor` de Logística) | recusada: só setor publicado embasa ação |
| S6 | Membro Alfa | "Acesso não autorizado" |
| S7 | Sessão inválida (sair e abrir `/ivo-integral/q2`, ou link expirado) | pedido de login; nada lido |
| S8 | Admin Beta: `/q2` e `/acoes` | Beta inteira protegida; nenhuma ação ou dado da Alfa |
| S9 | Preflight final | tudo PASS |

## 9. Recuperação

**Aplicação** (não toca o banco; cada item é um deploy/config no provedor, verificável):
- Contenção: `bunx wrangler@4.147.0 deploy --config <pkg>/wrangler.app-disabled.json --secrets-file …` — mesmo código, `VITALOS_IVO_PROFILE=disabled` ⇒ toda leitura/escrita IVO recusada antes da sessão. Verificação: Q2 responde "não está habilitada corretamente".
- Rollback de versão: `bunx wrangler@4.147.0 rollback <version-id> --name vitalos-ivo-staging`. No primeiro deploy funcional, a versão anterior é o **bootstrap selado** (403 em tudo).
- Borda: política Access "deny all" na aplicação do Worker (imediato, sem deploy).
- Segredo: `wrangler secret delete SUPABASE_SERVICE_ROLE_KEY --name vitalos-ivo-staging` e rotação da chave no Supabase.

**Banco** (independente; rollback de Worker não desfaz migration):
- R6 é aditiva; o código anterior ignora as colunas novas. Correção sempre progressiva (nova migration ou reaplicação de R6), nunca DROP de colunas.
- Dados do ledger: restauração **seletiva, só com decisão específica**, e sempre precedida de ensaio em banco descartável. O formato depende do snapshot:
  - `snapshot --via-cli` (SQL plano, `data-public.sql`): `bun run ivo:staging:prepare snapshot-extract --snapshot=<dir>` grava `ledger-restore.sql` (só os blocos `COPY` das 4 tabelas do ledger, em ordem de dependência, com SHA-256; tabela sem bloco = 0 linhas). Aplicação: `psql -v ON_ERROR_STOP=1 --single-transaction -f ledger-restore.sql` contra o alvo, com as 4 tabelas vazias (restauração sobre linhas existentes falha por chave duplicada e nada muda). Ensaio comprovado em banco local: 1/1/2/3 → perda simulada 0/0/0/0 → restaurado 1/1/2/3.
  - `prepare.ps1 -Command snapshot` (`pg_dump -Fc`): `pg_restore --data-only --single-transaction --exit-on-error -t action_plans -t action_items -t evidence_records -t action_log -d <alvo> data-ivo.dump`.
  - Nada de remoção automática de dados.
- Organizações fictícias podem permanecer; removê-las é ato manual autorizado à parte.

## 10. Evidências

| Evidência | Resultado |
|---|---|
| Regressão R6-C1 (antes/depois), promoção ledger→R6, perfil staging, `instrument_version`, isolamento Alfa/Beta | herdadas — código inalterado desde `2b68e69` (replay clean 36/36, preprod 46/46, upgrade 49/49; `demo:ivo:proof` 30+5) |
| Preflight remoto (SELECT) | 41 PASS · 9 MISSING · 0 FAIL; ledger = versão do repo |
| Snapshot local (`-Fc` em volume do host) | 14/14 tabelas; `sha256sum -c` OK; perda simulada das 4 tabelas do ledger restaurada com contagens idênticas (1/1/2/3) |
| Snapshot via CLI | `--dry-run` OK; logs sem credencial (redação testada) |
| Borda | `edge-check` reprova hoje (Worker inexistente: 404) e passa no controle positivo (Worker histórico: 7/7 → 302 Access) |
| Pacote | `package-manifest.json`: commit, árvore, ferramentas, SHA-256 dos 678 arquivos, digest; `runtime-manifest.json`: hashes dos 3 configs, vars (chave só por impressão digital) |
| Conteúdo do pacote | cliente com URL e chave de staging; sem URL/ref de produção; sem secret/service_role; servidor sem URL de produção; sem declaração HML |
| Dry-run | bootstrap, app e contenção · Wrangler 4.147.0 · digest inalterado após o dry-run |

## 11. Execução em staging — o que foi provado onde

Pacote publicado em staging (Worker `vitalos-ivo-staging`, Supabase `xttjkpzhxtjfwxjsxuab`):
commit `8859c01`, pacote `8859c0111982-20261005T024421`, digest
`a45652245c17ae462d0466541cb18d51eb1a0166a125ba223d2abe2410bc55fc`,
`wrangler.app.json` sha256 `fc4c2c7e…fda08`, **versão ativa `8da81ce2-6de4-4819-aa09-ddbacfa74928`**
(anterior `98b1a4db-0427-42f8-919e-9524386c1e53`, rollback disponível; bootstrap selado `47eaaf24-…`).

**Testes locais (dados sintéticos, Supabase local, Edge real via CDP)** — não substituem o smoke remoto:
- formulários de execução e aprendizagem independentes: cada envio grava só o seu escopo; recarregar mostra 1 ocorrência; duplo clique grava 1;
- falha de rede: alerta no cartão correto, texto mantido, reenvio funciona;
- teclado, foco visível, calendário nativo no tema escuro, celular 390 px sem overflow, botões de 48 px;
- data: `03102026` digitado → `2026-10-03`; prazo `2026-10-11` sobrevive a gravação e leitura e aparece por extenso;
- gate completo (3942+ testes, paridade, `tsc`, varredura de segredos) e CI do commit `8859c01` verdes.

**Verificações remotas (executadas após a publicação)**:
- integridade do pacote 678/678 e configuração conferidas imediatamente antes do deploy; versão ativa anterior confirmada;
- nova versão ativa com 100% do tráfego; bindings: perfil `staging`, projeto autorizado, 2 IDs de organização, chave de serviço oculta;
- bundle publicado contém os rótulos "Registrar execução" / "Registrar aprendizagem";
- S1 — `edge-check` 7/7 (302 para o Access);
- S9 — `preflight` 50 PASS · 0 MISSING · 0 FAIL;
- dados preservados (leitura): prazo da ação segue `2026-01-11`, 2 registros de aprendizagem e 0 de execução, nenhum usuário/organização recriado, nenhuma migration.

**Pendente (exige o operador no navegador — Access + magic link)**: S2–S8, incluindo a conferência visual
dos cartões, o calendário no tema escuro e os dois envios reais. O smoke **não** está aprovado.
Recuperação acionada neste deploy: nenhuma.

## 12. Migration do C8 — NÃO aplicada em staging

A migration `20261005120000_ivo_efficacy_protocols.sql` (protocolos, observações e pareceres de eficácia) existe **somente no
repositório e no banco local descartável**. Ela **não** faz parte do pacote `8859c01` publicado e **nenhum comando deste
runbook a aplica**. Promovê-la a staging é um passo separado (PI-15): exige revisão do SQL, autorização expressa do escopo
"migration remota", `preflight`/M6A verdes no alvo e replay preprod (já verde localmente: 52/52). Até lá, a interface publicada
mostra "Eficácia: não avaliada" e não há tabela `efficacy_*` em `xttjkpzhxtjfwxjsxuab`.