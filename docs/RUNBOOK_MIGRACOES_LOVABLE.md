# RUNBOOK — Migrações sob Lovable Cloud

> **Por que este runbook existe:** a produção roda em Lovable Cloud (Supabase
> gerenciado). Não há `psql` direto nem CI que aplique migrations contra o banco
> real. Toda mudança de schema é aplicada **colando SQL no chat do Lovable**. Sem
> disciplina, o repositório e a produção divergem (foi exatamente o P0-02 da
> auditoria). Este runbook mantém `supabase/migrations/` como a fonte única.

---

## A regra de ouro

**1 mudança de schema = 1 arquivo de migration = 1 paste no Lovable = 1 commit.**

Nunca aplique SQL no Lovable sem que o mesmo SQL exista, idêntico, num arquivo
versionado em `supabase/migrations/`. Nunca comite um arquivo de migration sem
tê-lo aplicado (ou confirmado como já aplicado) na produção.

---

## Fluxo passo a passo

1. **Claude Code escreve** o arquivo em `supabase/migrations/AAAAMMDDHHMMSS_descricao.sql`.
   - Sempre idempotente: `CREATE OR REPLACE FUNCTION`, `ADD COLUMN IF NOT EXISTS`,
     `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
   - Idempotência é de propósito: colar de novo o que já existe é no-op — e esse
     no-op É a prova de que repo e produção estão em paridade.

2. **`bun run parity`** (e `bun test src`) ficam verdes localmente — o repo passa
   a declarar tudo que o código usa.

3. **O founder cola o arquivo INTEIRO** no chat do Lovable, pedindo para executar
   a migration no banco conectado.

4. **O founder cola de volta a confirmação** do Lovable (quantas tabelas/colunas/
   funções afetadas). Se o Lovable mostrar um diff inesperado numa função
   (corpo diferente do arquivo), **pare e investigue** antes de confirmar — pode
   haver lógica de produção não versionada que precisa ser capturada primeiro.

5. **Commit** do arquivo de migration (e de qualquer código que dependa dele)
   **juntos**, com mensagem que cita o que foi aplicado.

6. Aguardar o sync do Lovable ↔ GitHub antes de editar qualquer coisa no Lovable
   (ver CLAUDE.md · Sincronização).

7. **Sempre rodar a query de verificação** (não só confiar em "executou sem
   erro") — ver o achado real abaixo de por que isso importa.

---

## Achado real: REVOKE column-level pode ser um no-op silencioso

Ao aplicar a migration de S1 (`20260703130000_revoke_profile_self_elevation.sql`),
`REVOKE UPDATE (role, org_id) ON public.profiles FROM authenticated` rodou sem
erro nenhum — mas não teve efeito. `profiles` já tinha `GRANT UPDATE` na
TABELA INTEIRA para `authenticated` desde a migration base. No Postgres,
privilégio de coluna e de tabela são entradas de ACL separadas; revogar a de
coluna nunca subtrai da de tabela que já cobre tudo. Só foi descoberto porque
a query de verificação (`has_column_privilege(...)`) checou o EFEITO real no
banco, não se o SQL "rodou". Corrigido em
`20260703170000_fix_profile_revoke_table_level_grant.sql`
(`REVOKE UPDATE ON public.profiles FROM authenticated` seguido de
`GRANT UPDATE (display_name) ON public.profiles TO authenticated`).

**Lição travada no processo:** `bun run parity` prova que o repo é coerente
consigo mesmo (todo RPC/tabela/coluna usado tem definição). Não prova — e não
tem como provar sem consultar o banco vivo — que um GRANT/REVOKE produziu o
efeito de privilégio pretendido. Daqui pra frente, toda migration que mexe em
GRANT/REVOKE vem acompanhada de uma query `has_column_privilege`/
`has_table_privilege` de verificação, não só do SQL de mudança.

---

## A migration de reconciliação (S0)

`supabase/migrations/20260703120000_reconcile_prod_drift.sql` recupera o que já
estava em produção mas não no repo: as RPCs `is_invite_valid_for_wave` e
`mark_invite_used`, e as colunas `organizations.{cnpj,team_size_band,phone,
address,segment}`, `org_invites.plan`, `wave_invites.emailed_at`.

**Ação do founder:** colar esse arquivo no Lovable. Como é idempotente, se a
produção já tiver tudo, é no-op seguro. Se `is_invite_valid_for_wave` ou
`mark_invite_used` NÃO existirem em produção (cenário possível — o código pode
estar falhando silenciosamente ao coletar respostas), esta migration as cria com
o comportamento que o código espera. Confirme o resultado no chat.

## A migration de revogação de autoelevação (S1 · P0-03)

`supabase/migrations/20260703130000_revoke_profile_self_elevation.sql` — uma
única linha (`REVOKE UPDATE (role, org_id) ON public.profiles FROM authenticated`)
que impede um usuário autenticado de alterar o próprio papel ou organização.
Aplique **depois** da migration de reconciliação (S0), na mesma sessão de chat.

**Ação do founder:** colar o arquivo no Lovable. Não afeta nenhum fluxo hoje —
todas as escritas legítimas de `role`/`org_id` já acontecem via `service_role`
(onboarding), nunca pelo próprio usuário autenticado.

## A RPC transacional de provisionamento (S2 · P0-05)

`supabase/migrations/20260703140000_provision_organization_from_invite.sql` —
substitui os 5 passos separados de `createOrgAndAdmin` (validar convite, checar
e-mail, criar org, criar perfil, consumir convite) por UMA função PL/pgSQL que
faz tudo na mesma transação, com `SELECT ... FOR UPDATE` travando a linha do
convite. Duas ativações simultâneas com o mesmo token agora produzem
exatamente 1 organização — a segunda vê `already_used` e não escreve nada.

**Ação do founder:** colar o arquivo no Lovable. Idempotente via `CREATE OR
REPLACE FUNCTION`. Depois de aplicar, um convite antigo ainda funciona
normalmente — a função só muda COMO o provisionamento acontece, não o convite.

## A RPC atômica de submissão de resposta (S3 · P0-06 + P0-07)

`supabase/migrations/20260703150000_submit_wave_response_atomic.sql` —
substitui as 3 chamadas separadas de `saveWaveResponse` (validar → inserir →
consumir) por uma única RPC (`submit_wave_response`) que trava a linha do
convite, verifica o vínculo com a onda certa, checa se a onda ainda aceita
respostas e só então grava — tudo na mesma transação. Também reforça a
policy `response_submit` com o mesmo vínculo, como segunda camada de defesa.
A validação de instrumento/itens/escala (P0-07) passou a rodar também no
caminho Cloud, com o MESMO validador puro do modo demo (zero duplicação).

**Ação do founder:** colar o arquivo no Lovable. Idempotente. Depois de
aplicar, links de convite (`/convite/:token`) e o link setorial continuam
funcionando normalmente — a mudança é só em COMO a resposta é validada e
gravada, não no formato do link.

## Ciclo de vida da onda (S4 · P0-08)

`supabase/migrations/20260703160000_wave_lifecycle_and_capsule_upsert.sql` —
uma constraint (`UNIQUE(wave_id)` em `wave_capsules`) que permite a cápsula
ser ATUALIZADA em vez de "criada uma vez e nunca mais". Sem essa mudança, uma
onda selava sozinha na 5ª resposta; agora ela só sela quando você clica em
"Fechar onda" em `/admin` — k-anonimato continua protegendo a publicação,
mas quem decide PARAR de coletar é você, não o banco.

**Ação do founder:** colar o arquivo no Lovable. Idempotente (bloco
`DO $$ ... EXCEPTION WHEN duplicate_object` — se a constraint já existir, é
no-op). Nenhuma migration nova precisa para P0-01 (o link setorial): a
correção ali foi só no código (para de fingir sucesso em modo Cloud).

## Persistência da Academia (S5)

`supabase/migrations/20260703220000_learning_persistence.sql` — cria
`sm2_card_state` (agendamento SM-2 por cartão) e `participation_events`
(ledger de XP/participação), as duas com RLS por `auth.uid()`. Diferente de
toda migration anterior desta sessão, este dado é PESSOAL (não organizacional)
— não há k-anonimato a proteger, então não existe server function nem service
role no caminho de escrita: o cliente autenticado lê/escreve direto via RLS
(`src/lib/cloud/learning-adapter.ts`). Privilégio deliberadamente assimétrico:
`sm2_card_state` aceita UPDATE do próprio dono (reagendar o próprio cartão só
prejudica a própria aprendizagem); `participation_events` aceita só
SELECT+INSERT — nunca UPDATE/DELETE — porque apagar o próprio histórico seria
o caminho mais óbvio de burlar o teto diário de XP (calculado no cliente,
mesmo modelo de sempre, motivacional e sem consequência real). Antes desta
migration, todo o progresso da Academia (repetição espaçada em `/revisar`,
ledger de participação em `/academia`) vivia só em Zustand+localStorage —
resetava a cada troca de navegador ou limpeza de cache. A demonstração
(visitante sem sessão real) continua 100% efêmera por design, sem tocar
nenhuma destas tabelas.

**Ação do founder:** colar o arquivo no Lovable. Idempotente
(`CREATE TABLE IF NOT EXISTS`). Depois de aplicar, teste com uma sessão real
(login por magic link, não a senha de demo): abrir `/revisar`, avaliar
2-3 cartões, recarregar a página — os cartões avaliados devem ter saído da
fila (ou reagendado para o intervalo certo), não voltado ao início.

## Ordem de aplicação recomendada (S0 → S5, nesta sessão)

1. `20260703120000_reconcile_prod_drift.sql`
2. `20260703130000_revoke_profile_self_elevation.sql`
3. `20260703140000_provision_organization_from_invite.sql`
4. `20260703150000_submit_wave_response_atomic.sql`
5. `20260703160000_wave_lifecycle_and_capsule_upsert.sql`
6. `20260703170000_fix_profile_revoke_table_level_grant.sql` — **já aplicada em
   produção** (achado ao verificar o item 2 com `has_column_privilege`; ver
   "Achado real" acima). Incluída aqui só para o repositório continuar
   descrevendo fielmente o que existe no banco — colar de novo é no-op seguro.
7. `20260703220000_learning_persistence.sql` (S5 · Academia viva)

Depois de colar as cinco primeiras, teste no app real: (a) criar uma onda em `/admin` —
antes falhava com "Falha ao criar onda no banco" se as RPCs não existissem em
produção; (b) confirmar que `/rh` continua mostrando a capsule normalmente;
(c) gerar um convite novo em `/plataforma` e ativar em `/ativar/:token`
escolhendo um setor diferente de Empresa (ex.: Escola) — deve cair em
`/escola`; (d) responder um convite real em `/convite/:token` de ponta a
ponta e confirmar que a contagem de respostas em `/admin` sobe; (e) com 5+
respostas, clicar "Ver leitura protegida" várias vezes — a onda continua
"collecting"; só ao clicar "Fechar onda" (com confirmação) ela vira
"Selada · Relatório disponível".

---

## Ação de segurança do founder — tirar o `.env` do git (P1-01)

O `.gitignore` já foi corrigido para ignorar `.env` e `.env.*` daqui em diante,
mas o `.env` que **já está rastreado** precisa ser removido do controle de versão
manualmente (Claude Code não faz operações destrutivas de git nem lida com
segredos):

```bash
git rm --cached .env
git commit -m "chore: remove .env do versionamento (P1-01)"
```

As chaves no `.env` atual são publishable/anon (não service role), então o risco
é moderado — mas a boa prática é **rotacionar a publishable key** no painel do
Lovable Cloud após removê-la do histórico, e manter o valor real só localmente
(`.env`, ignorado) e na secret de servidor do Lovable. O `.env.example` documenta
a estrutura sem valores.

---

## Checklist por migration

- [ ] Arquivo em `supabase/migrations/` com timestamp correto e nome descritivo.
- [ ] 100% idempotente (`IF NOT EXISTS` / `OR REPLACE`).
- [ ] `bun run gate` verde local (testes + paridade + tsc).
- [ ] Colado no Lovable; confirmação colada de volta; sem diff inesperado.
- [ ] Commit do arquivo + código dependente juntos.
- [ ] Sync Lovable ↔ GitHub aguardado.
