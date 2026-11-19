# Q1/Q2 · B3 · integração operacional local · 19/11/2026

Claude Code · Q2_FECHAMENTO · bloco B3 · fase INTEGRAÇÃO_LOCAL. Estado: **requer ajuste** (1 bloqueio de gate no WIP do Q1) e **depende de decisão** (quem comita o WIP do Q1 e onde se prova a persistência do Q1).

## Onde está cada coisa

| Item | Local | Estado |
| --- | --- | --- |
| Q1 (Codex) | checkout principal, branch `feat/ivo-fibt-platform-foundation`, HEAD `16730dc` | **nenhum commit novo**; 14 arquivos modificados + 29 novos não comitados (4 migrations Q1 incluídas) |
| Q2 | worktree `..\vitalos-claude-q2`, branch `feat/claude-q2-perfis`, HEAD `e612391`+ | 14 commits sobre `16730dc`; `e612391` só existe nesta branch |
| Candidato de integração | worktree `..\vitalos-integ-q1q2`, branch `integ/q1-q2-local` | Q2 comitado + **cópia não comitada** do WIP do Q1 (42 arquivos; hash do conjunto de origem `372eb0100f16813f`) + manifesto regenerado |

Nada foi mesclado nem cherry-picked entre branches; o checkout do Codex não foi tocado. O WIP do Q1 foi **copiado (somente leitura da origem)** para o candidato, sem `.q.out`/`.q.sql`, sem o superprompt de handoff e sem o `migrations.manifest.json` do Codex (regenerado).

## Contratos compartilhados (mapa)

| Contrato | Q1 | Q2 | Compartilhamento |
| --- | --- | --- | --- |
| Empresa/organização | vem da sessão (`authorizeIvoSession`) | idem | mesma função; org nunca do payload |
| Permissão | preparação: admin (padrão); delegação própria do Q1 | admin; `allowLeader` (estado/execução próprios); `allowMember` (devolutiva fechada) | opções do Q2 são **opt-in**; padrão segue só-administrador |
| Módulo | `Q1`→`COPSOQ`: habilitado = `method_pending` | `Q2`→`FIB_T` | `org_module_entitlements`, independentes (4 combinações já testadas) |
| Ciclo | preparação por ciclo | plano por ciclo `2026-T4` | `cycle-key` compartilhado, dados separados |
| Navegação | `Q1PreparationEntry` no painel (WIP) | `/ivo-integral/q2`, `/acoes`, `/diario` | sem rota nem tabela em comum |
| Papéis em `profiles` | `SST_PROFISSIONAL` revisor técnico (WIP) | RH/administradores, `LIDER_EQUIPE`, membros | `ledger_actor_denial` recusa `SST_PROFISSIONAL` no ledger Q2 (autoridade reservada) — conservador, correto |

Sem mapeamento entre lentes e sem índice IVO composto: nada foi criado; as ações FIB-T seguem `mapping_pending`.

## Fatia implementada (menor possível)

Só um teste de contrato, sem mudança de produção: `src/lib/ivo/q1-q2-contract.test.ts` (7 testes). Prova que a sessão IVO compartilhada continua só-administrador por padrão (liderança e colaborador recusados e o vínculo de membro nem é consultado — caminho da preparação Q1), que as aberturas do Q2 são opt-in, que a organização vem da sessão, que Q1/Q2 respondem só ao próprio módulo (PERMA/VIA-T não dependem deles), que o `method_pending` do Q1 não bloqueia o Q2 e que falha de leitura nega os dois.

## Verificação

- Candidato (`integ/q1-q2-local`, Q2 `e612391` + WIP Q1 copiado): `bun run parity` ok; `bun run gate`: **4.532 aprovados, 1 falha**, TypeScript e demais gates ok até a falha.
- Falha única: `scripts-guard-coverage` › `q1-browser-proof-setup.ts importa e invoca requireStagingTarget`. O script do Codex usa pilha própria (API 57721) e valida o alvo inline, mas não importa o guard do repositório nem está na lista dos harnesses locais (`src/lib/staging/scripts-guard-coverage.test.ts`). Deve falhar também no checkout do Codex.
- Q2 isolado: contrato 12/12 (7 novos + 5 de `module-access`), `tsc` limpo.
- Migrations: as 4 do Q1 não tocam `action_items`, `action_plans`, nem as RPCs do ledger; só leem `profiles` e `org_module_entitlements`. Timestamps em ordem (`20261118170000` … `20261119103000` < `20261119120000`). Manifesto regenerado: 72 migrations.
- Stack institucional local (leitura): Q1=false/Q2=true na Alfa; Q1=false/Q2=false na Beta; Q2=true na Gama e Delta (sem linha Q1). `action_items.title_visible_at` presente. **Nenhuma tabela do Q1 (partner/delegates/review) existe no stack**: as migrations do Codex não foram aplicadas aqui.

## Bloqueios e decisões

1. **Gate do Q1 (Codex):** registrar ou guardar `scripts/q1-browser-proof-setup.ts` conforme a regra de scripts (lista de harnesses locais com `requireInstitutionalLocalTarget`, ou o guard de staging). Não alterei o arquivo do Codex.
2. **WIP do Q1 não comitado:** a integração por git só é possível depois que o Codex comitar. Até lá, o candidato é uma cópia reproduzível pela lista de arquivos, não um histórico.
3. **Persistência cruzada Q1+Q2 no mesmo banco** não foi provada: exigiria aplicar as migrations do Codex no stack compartilhado (autoridade do Codex/operador) ou uma pilha descartável própria (o script do Codex prevê uma). Recomendado: o Codex roda sua prova Q1 sobre o candidato e o harness `institutional-tenant.ts` cria a empresa Q2 na mesma pilha.
4. **Texto da Visão IVO** (`ivo-integral.index.tsx`: "COPSOQ… planejadas e não…") continua verdadeiro para a coleta; reavaliar quando o Q1 abrir a devolutiva.
5. Migration B2 (`20261119120000`) e as 4 do Q1: nenhuma aplicada fora do stack local; manifesto precisa ser regenerado por quem integrar (feito no candidato).

## Próxima ação única

Codex: corrigir o guard do `q1-browser-proof-setup.ts`, comitar o WIP do Q1 em sua branch e então integrar `feat/claude-q2-perfis` (merge revisado), rodar o gate e repetir o harness Q2 contra o candidato.
