# Q2 · perfis liderança e colaborador · 18/11/2026

Claude Code · Q2 · DESENVOLVIMENTO_LOCAL · branch `feat/claude-q2-perfis` · worktree `vitalos-claude-q2` · base `16730dc`.

## Matriz observada (código, sem ensaio em stack)

| Papel | Mensurar | Educar | Transformar | Evoluir | Primeiro bloqueio |
| --- | --- | --- | --- | --- | --- |
| RH_ADMIN (Alfa) | leitura publicada | D10 | plano/ajuste | vínculos | comprovado em `9759e8d` |
| COLABORADOR | negado no servidor | Diário (agregados k≥5) | negado | negado | `requireOrgAdmin` em `src/lib/ivo/ivo-q2-reading.server.ts:114` |
| LIDER_EQUIPE | sem identidade local | — | — | — | `scripts/ivo-local-demo.ts:57-61` não declara a persona |
| Beta / sem vínculo / módulo desligado | negado | — | — | — | `module_disabled` / `no_profile` |

Todo o caminho Q2 no servidor (`ivo-q2-reading.server.ts`, `fibt-action-loop.server.ts`, aplicação D10) usa `requireOrgAdmin` (`src/lib/auth/authorize.server.ts:110`). A designação de papéis em `enterprise.pack.json` só filtra navegação.

## Fatia entregue

Hipótese: a recusa Q2 para um membro da organização é um beco sem saída. Mudança: a recusa `not_admin` continua negando a leitura e passa a apontar `/diario`, caminho já autorizado a qualquer membro com agregados k≥5 resolvidos no servidor (`src/lib/api/practice-aggregates.functions.ts:10-45`). Conta sem vínculo não recebe o caminho. Nenhuma autoridade foi ampliada.

Arquivos: `ivo-views.ts` (tipo `IvoMemberPath`), `ivo-q2-reading.server.ts`, `IvoAccessNotice.tsx`, `ivo-integral.q2.tsx`, teste em `ivo-journey.server.test.ts`.

Verificação: teste dirigido 24/24; `bun run gate` com 4.470 testes aprovados, paridade, TypeScript e secret-scan, neste worktree.

Limites: prova de reflow em navegador desktop emulando 320 px (não dispositivo real); a recusa do servidor ao colaborador já existia, e esta prova confirma que continua.

## Prova no navegador · 18/11/2026

Stack preservado, sem reinício: `project_id = vitalos-institutional-first-admin`, API `127.0.0.1:57621`, DB `57622`, Mailpit `57624`, validados pelo `institutionalEnv()` do launcher. App deste worktree em `127.0.0.1:8092` (preflight `--runtime=local --db=local`, `ACTION_PLAN` como em `dev --learning`); o app `8091` não foi tocado. Login por link mágico local. Única escrita autorizada pelo operador: o RH Alfa convidou `colaborador.alfa@institutional.test` como COLABORADOR pelo fluxo do produto (`/admin` → Convidar pessoa) e a conta aceitou em `/aceitar-convite`; papel conferido em `public.member_invites` por leitura `READ ONLY`.

| Persona | Resultado observado |
| --- | --- |
| RH_ADMIN Alfa | `/ivo-integral/q2` exibe a leitura publicada (2 setores, n=5); após recarga, idem; `/ivo-integral/acoes` lista as 5 ações do plano 2026-T4, incluindo o ajuste do ensaio anterior. |
| Conta sem vínculo | `/ivo-integral/q2` direto → "Seu acesso institucional ainda não está vinculado"; nenhum dado Q2 e nenhum caminho para o Diário. |
| COLABORADOR Alfa | `/ivo-integral/q2` → "Acesso não autorizado" + "Abrir o Diário de Prática"; resposta do servidor só com `ok:false`, `forbidden`, mensagem e `memberPath` (nenhum setor, fator ou média); idem após recarga; `/ivo-integral/acoes` direto → "Acesso não autorizado", sem plano nem ações; o link abre `/diario`. A 320 px: largura útil = rolagem (320), link focável por teclado, 44 px de altura. |

## Decisão humana pendente · liderança

Antes de qualquer fatia de LIDER_EQUIPE: (1) qual escopo (equipe, setor FIB-T, plano); (2) quem atribui o vínculo; (3) o que a liderança lê e escreve no plano (ex.: só ações das quais é responsável). Até lá, a liderança recebe a mesma recusa e o mesmo caminho do colaborador.

## Próxima ação única

Decidir o contrato da liderança (seção acima); só então abrir a fatia LIDER_EQUIPE.
