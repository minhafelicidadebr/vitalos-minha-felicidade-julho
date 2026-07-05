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

## Achado real #2: GRANT default da conta Supabase mascara o GRANT explícito da migration

Ao verificar a migration de S5 com `has_table_privilege`, a query mostrou
`authenticated` com UPDATE/DELETE em `participation_events` e DELETE em
`sm2_card_state` — privilégios que a migration NUNCA concedeu de propósito
(ela só concede SELECT+INSERT em `participation_events` e SELECT+INSERT+
UPDATE em `sm2_card_state`). Causa: este projeto Supabase tem
`ALTER DEFAULT PRIVILEGES` configurado na conta para conceder ALL a
`authenticated`/`anon`/`service_role` em toda tabela NOVA do schema
`public` — o GRANT explícito da migration rodou sem erro, mas o default já
cobria tudo antes dele, então não restringiu nada. Mesma classe do achado de
S1 (GRANT/REVOKE só se prova consultando o banco vivo, nunca só "rodou sem
erro"), causa raiz diferente (lá era column vs table level; aqui é GRANT
default da conta vs GRANT explícito da migration). Corrigido em
`20260703230000_revoke_learning_default_privileges.sql` — fechar essa
segunda camada importa porque `participation_events` existe justamente para
impedir apagar o próprio histórico de XP (o jeito mais óbvio de burlar o
teto diário anti-gaming); depender só da RLS deixaria isso a um bug de
policy de distância.

## O Ledger de Transformação — Plano Vivo real (S6.1–S6.3)

`supabase/migrations/20260705100000_action_plan_ledger.sql` — persistência real
do Plano de Ação (`/plano-acao`), até aqui 100% mock. Cria 4 tabelas
(`action_plans`, `action_items`, `action_log`, `evidence_records`) e 5 RPCs
`SECURITY DEFINER`: `create_action_plan` (grava o plano como SNAPSHOT congelado
— agendamento/esforço/embaixadoria não recalculam depois, para nunca invalidar
silenciosamente um dono/prazo já combinado), `set_action_item_accountability`
(só funciona com o plano em `draft`), `activate_action_plan` (o **Guia MTE
2026 §13 virou constraint de banco**: só ativa se TODA ação tem
dono+prazo+métrica — não é mais só afirmado pela UI), `record_action_event`
(replica em SQL a mesma máquina de estados de `action-log-engine.ts` — defesa
em profundidade) e `record_evidence` (evidência + evento espelho na mesma
transação). `action_items.status` é sempre PROJEÇÃO do ledger — só escrita
dentro da mesma transação do evento, nunca por outro caminho.

**Achado de segurança desta migration (novo, não é reincidência dos achados
#1/#2 acima):** auditado `supabase/migrations/*.sql` inteiro, NENHUMA migration
anterior deste repositório revoga `EXECUTE` das funções `SECURITY DEFINER` que
cria — por padrão do Postgres, toda função nova é executável por `PUBLIC`. Para
`submit_wave_response` (S3) isso é seguro, porque a segurança está no próprio
token de convite, não em quem chama. Para as 5 RPCs desta migration — que
seriam escrita privilegiada em nome de QUALQUER org se um cliente as chamasse
direto (mesma classe do P0-04 original) — o rodapé do arquivo faz
`REVOKE EXECUTE ... FROM PUBLIC, authenticated, anon` + `GRANT ... TO
service_role` nas 5, só alcançáveis via `action-plan.server.ts` depois de
`requireOrgAdmin(accessToken)` resolver a org real do chamador.

**Ação do founder:** colar o arquivo no Lovable. Idempotente
(`CREATE TABLE IF NOT EXISTS`). Depois de aplicar, com uma sessão de
administrador real: abrir `/plano-acao` — deve aparecer "Nenhum plano ativo
ainda", clicar "Gerar plano desta temporada", preencher responsável/prazo/
métrica de cada ação no painel "Gerenciar esta ação", clicar "Ativar plano"
(deve recusar se algo faltar, mostrando quantas ações estão incompletas), e
então mover status/registrar evidência — o Registro da ação deve refletir
cada evento.

## A Cerimônia da Devolutiva (S6.4)

`supabase/migrations/20260705120000_devolutiva_sessions.sql` — persistência do
rito participativo em `/devolutiva` (I-T2 do blueprint Arco da Prova): cria
`devolutiva_sessions` e 4 RPCs (`open_devolutiva_session`,
`cast_priority_vote`, `set_devolutiva_attendance`, `close_devolutiva_session`).
**Privacidade por schema:** a tabela não tem NENHUMA coluna de identidade de
votante — `priority_votes` é só uma contagem por driver (JSONB), incrementada
pela RPC; a cerimônia é um rito ao vivo (facilitador registra votos de mão
levantada na sala), então um voto individual rastreável não é uma política de
acesso, é uma impossibilidade estrutural do schema. A pauta final
(`pauta_driver_ids`) só é preenchida no fechamento **se `attendance_count >= 5`
(quórum k-anônimo)** — abaixo disso a UI mostra "quórum não atingido", nunca
expõe o ranking de uma amostra pequena. Mesma trava de EXECUTE da migration
anterior nas 4 RPCs.

**Ação do founder:** colar o arquivo no Lovable. Idempotente. Depois de
aplicar, em `/devolutiva` com sessão de administrador real deve aparecer a
seção "Cerimônia da Devolutiva": iniciar a cerimônia, registrar presença ≥5,
votar em pelo menos uma intervenção candidata, encerrar — a pauta ranqueada
deve aparecer; repetir com presença <5 e confirmar que a mensagem é "quórum
não atingido" em vez de expor a pauta.

## O Cofre de Ciclos — o registro humano de ciclo real (S6.75)

`supabase/migrations/20260705130000_org_cycle_registry.sql` — a peça mais
fundacional do blueprint Arco da Prova (I-P1): promove uma cápsula SELADA
(`wave_capsules`, já existente desde S4) a "ciclo N da série longitudinal" da
organização. Cria 1 tabela (`org_cycle_registry`) e 1 RPC
(`register_org_cycle`). **Publicar um agregado é automático** (k-anon ≥5, já
existia); **registrar um agregado como ciclo é uma decisão humana** — mesmo
princípio de "fechar a onda é ação separada" do S4. A RPC recusa registrar
uma cápsula cuja onda ainda não está `sealed` (leitura parcial protegida
nunca vira ciclo definitivo), recusa cross-tenant e recusa cápsula/chave de
ciclo já registrada (`UNIQUE(org_id,instrument,cycle_key)` e
`UNIQUE(capsule_id)`). Mesma trava de EXECUTE das duas migrations anteriores.

Uma vez registrados ≥2 ciclos, `cycle-proof.server.ts` (agora com
`buildCycleProofFromHistory`, extraída sem mudar o comportamento do caminho
mock existente) monta a mesma Prova de Ciclo real — cycle count, direção,
dimensões que melhoraram/pioraram — exposta em `/evolucao-nr1` na seção
"Cofre de Ciclos". **Escopo v1, declarado por honestidade:** só o substrato
(registro + leitura + Prova de Ciclo básica) foi ligado a dado real; Board
Brief/Selo (`/panorama`, `/selo`) continuam 100% mock porque também dependem
de IVO/participação/consentimento reais, fora do escopo deste sprint —
tocá-los exigiria inventar dados que ainda não existem.

**Ação do founder:** colar o arquivo no Lovable. Idempotente. Depois de
aplicar, em `/evolucao-nr1` com sessão de administrador real: abrir "Gerenciar
registro de ciclos", registrar uma cápsula selada com uma chave (ex.:
`2026-t1`) — deve recusar se a onda não estiver selada; registrar uma segunda
cápsula com outra chave — a seção deve então mostrar uma "Prova de Ciclo
real" com direção e contagem de dimensões.

## Ordem de aplicação recomendada (S0 → S6.75, cumulativa)

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
8. `20260703230000_revoke_learning_default_privileges.sql` — **já aplicada em
   produção** (achado ao verificar o item 7 com `has_table_privilege`; ver
   "Achado real #2" acima). Incluída aqui pelo mesmo motivo do item 6.
9. `20260705100000_action_plan_ledger.sql` (S6.1–S6.3 · Plano Vivo real)
10. `20260705120000_devolutiva_sessions.sql` (S6.4 · Cerimônia da Devolutiva)
11. `20260705130000_org_cycle_registry.sql` (S6.75 · Cofre de Ciclos)

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
