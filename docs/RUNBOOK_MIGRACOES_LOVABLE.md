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

## Achado real #3: Lovable fechou sozinho o gap de EXECUTE das RPCs S0–S3

`supabase/migrations/20260705160043_9800f3be-4083-4ea3-80d4-833731eeed31.sql`
— **já aplicada em produção**, gerada e commitada automaticamente pelo
Lovable (não por mim), no mesmo espírito do achado documentado em
`20260705100000_action_plan_ledger.sql`: nenhuma migration de S0–S3 revogava
`EXECUTE` de PUBLIC nas RPCs `is_invite_valid`, `is_invite_valid_for_wave`,
`mark_invite_used`, `count_wave_responses`, `submit_wave_response`,
`provision_organization_from_invite`. O scanner de segurança do Lovable
encontrou e fechou essa mesma classe de risco de forma independente, com o
padrão certo (grant granular por papel: `anon+authenticated` só nas RPCs do
fluxo de convite anônimo; `service_role` em `mark_invite_used`). Também
adicionou policies de leitura admin-scoped em `org_invites`/`wave_invites`
(antes sem NENHUMA policy — deny-all mesmo para admin) e revogou INSERT/
UPDATE/DELETE direto em `wave_responses`/`wave_invites` (escrita só via RPC).
Incluída aqui para o repositório continuar descrevendo fielmente o que existe
no banco — colar de novo é no-op seguro (todo REVOKE/GRANT é idempotente por
natureza; `DROP POLICY IF EXISTS` também).

## A Ata de Vitória — a Reavaliação NR-1 real destrava (I-E2/I-E4)

`supabase/migrations/20260706120000_victory_records.sql` — 1 tabela
(`victory_records`) + 1 RPC (`seal_victory_record`), INSERT-only com
`UNIQUE(org_id, cycle_key, driver_id)` — uma Ata por driver por ciclo, nunca
duplicada. Destrava dois itens que dependiam de um problema arquitetural até
aqui não resolvido: **Vigia I-E4** (o `maintenance_check` real do Plano Vivo,
já existente desde S6.1, é chaveado por `lever_id` — vocabulário do
Playbook — enquanto a Reavaliação NR-1 é chaveada por `driverId` do
crosswalk; os dois nunca foram unificados) e **Ata de Vitória I-E2** (que
depende da Vigia + de uma Reavaliação real, agora possível graças ao Cofre
de Ciclos do S6.75).

**A ponte, sem inventar correspondência:** `engine/evolucao/lever-driver-bridge.ts`
usa o vocabulário que os dois lados JÁ compartilham de fato — cada lever do
Playbook declara `targetPillarIds` (IVO) e cada driver do crosswalk declara
`pillarIds` (IVO) — e computa, por sobreposição de pilares, qual driver um
lever mais provavelmente mantém. Um lever sem nenhum pilar em comum não tem
correspondência forçada (retorna `null`, honesto). `lib/evolucao/
maintenance-bridge.server.ts` usa essa ponte para transformar os eventos
reais de manutenção do Plano Vivo num `maintenanceByDriver` real.

**Decisão registrada:** o blueprint original (Academia Viva 2.0, I4) previa
um "antagonista" nomeado por Ata — auditado o repositório, a camada de
Expedições/bestiário que daria sentido a isso nunca foi implementada. A Ata
declara o driver pelo seu próprio rótulo real do crosswalk (ex.: "Carga &
Recuperação recuou"), nunca um nome fictício. **Escopo v1:** `efficacy` da
Reavaliação fica `null` de propósito (ligar um PGR real ao Plano Vivo é
trabalho futuro) — a evolução real de exposição por driver e as Atas
funcionam plenamente sem isso, pois dependem só de `maintenanceByDriver`.

**Ação do founder:** colar o arquivo no Lovable. Idempotente. Depois de
aplicar, com sessão de administrador real e ≥2 ciclos registrados no Cofre
de Ciclos: a seção "Sala de Vitórias" em `/evolucao-nr1` deve mostrar a
evolução real por driver; se algum driver melhorou (≥5 pts) com uma medida
do Plano Vivo atestada como mantida, um botão "Selar Ata de Vitória" deve
aparecer — clicar deve gravar uma linha nova e nunca permitir selar a mesma
Ata duas vezes para o mesmo ciclo.

## O Espelho Vivo real — autoavaliação pessoal persistida (I-M3/I-M5)

`supabase/migrations/20260706110000_personal_assessments.sql` — 1 tabela
(`personal_assessments`) + 1 RPC (`erase_my_assessments`). Mesmo padrão do
S5 (`sm2_card_state`/`participation_events`): dado PESSOAL, sem k-anonimato a
proteger, RLS por `auth.uid()` — **sem service role no caminho de escrita**;
o cliente autenticado insere/lê direto (`src/lib/cloud/espelho-adapter.ts`).
**Minimização LGPD** (decisão do próprio blueprint Mensurar Vivo): só o
snapshot computado (faixas, escores, completude) é gravado — as respostas
item a item nunca saem da sessão do navegador. **INSERT-only** — cada
autoavaliação tomada é uma linha nova (histórico = tendência); não há
UPDATE/DELETE ao cliente. Apagar tudo (Cofre Pessoal, LGPD art. 18) só existe
pela RPC `erase_my_assessments()`, que deleta apenas as linhas do próprio
`auth.uid()` — o mesmo motivo de `participation_events` não ter DELETE
direto: impedir reescrever a própria história por fora do rito auditável.

**Ação do founder:** colar o arquivo no Lovable. Idempotente. Depois de
aplicar, teste com uma sessão real (não a senha de demo): abrir `/espelho`,
completar a autoavaliação de 15 itens, recarregar a página — o resultado deve
persistir (ao contrário da demonstração, que só guarda no navegador); em
outro aparelho/navegador logado com a mesma conta, o resultado deve aparecer
igual. Clicar "Apagar meu espelho" deve remover tudo e voltar à tela de
convite.

## O Dossiê ESG Auditável — snapshot imutável (I-E1)

`supabase/migrations/20260706100000_esg_report_snapshots.sql` — 1 tabela +
1 RPC (`create_esg_snapshot`). Guarda o Anexo de Asseguração (linhagem +
materialidade declarada + as 5 checagens F3, ver `assurance-annex-engine.ts`)
como artefato **imutável**: regerar é sempre uma NOVA linha, nunca um UPDATE
— o `content_hash` (SHA-256, calculado no servidor, nunca confiado do
cliente) é o que permitirá um dia a um terceiro verificar a integridade do
PDF recebido. **Escopo v1, declarado por honestidade:** só o KPI de COPSOQ
(via Cofre de Ciclos) tem linhagem real hoje — os outros 7 KPIs do relatório
completo em `/relatorio-global` continuam leitura de referência do setor;
o snapshot só sela o que é auditável de verdade, nunca o relatório inteiro
como se fosse todo real. Mesma trava de EXECUTE das migrations anteriores.

**Ação do founder:** colar o arquivo no Lovable. Idempotente. Depois de
aplicar, em `/relatorio-global` com sessão de administrador real (e ao menos
1 cápsula selada): a seção "Anexo de Asseguração" deve mostrar a linhagem do
KPI real (onda, cápsula, n, fórmula), permitir declarar materialidade por
tema, mostrar as 5 regras F3 com status ao vivo, e "Gerar snapshot imutável"
deve gravar uma linha nova a cada clique (nunca substituir a anterior).

## A Lupa da Escuta — telemetria k-anon do funil de resposta (I-M7)

`supabase/migrations/20260706130000_item_funnel_events.sql` — 1 tabela
(`item_funnel_events`) + 1 RPC (`record_item_funnel_event`), INSERT-only,
**sem token, sem identidade, sem org_id** — deliberadamente cross-tenant
(mede a qualidade do INSTRUMENTO para toda a base, não um recorte por
cliente). Nenhuma policy de SELECT para `anon`/`authenticated`; leitura
agregada só via `service_role` (`survey-telemetry.server.ts`), sempre com
corte k-anonimato ≥ 5 aplicado dentro do engine puro
(`survey-telemetry-engine.ts`) antes de qualquer leitura.

**Adaptação registrada (Fable5 §8):** o blueprint original imaginava um
funil sequencial "página por item". O fluxo real (`/convite/$token`) é um
formulário de PÁGINA ÚNICA — todos os itens visíveis ao mesmo tempo. A
telemetria foi adaptada honestamente: cada item guarda o timestamp da
PRIMEIRA resposta (não uma "tela vista"), e "chegou ao item X" significa
"respondeu o item X". O tempo incremental entre itens é correlação com a
ordem declarada do instrumento, não uma sequência estritamente observada —
o disclaimer do resultado deixa isso explícito.

**Captura no cliente:** `/convite/$token` grava um snapshot ao ENVIAR
(`completed: true`, sempre disparado) e, best-effort, quando a aba é
ocultada antes do envio (`completed: false`, via `visibilitychange` — não é
garantido, é a captura possível sem instrumentação mais invasiva). Os
outros 3 fluxos de resposta (`/responder` demo, `/respond.s/$token`,
`/quiosque`) NÃO foram instrumentados nesta v1 — não têm um componente de
item compartilhado (cada um define sua própria renderização), e
`/quiosque` tem uma arquitetura de índice fundamentalmente diferente
(pulses agregados, não itens de instrumento). Extensão futura, escopo
declarado.

**Ação do founder:** colar o arquivo no Lovable. Idempotente. A rota nova
`/lupa-da-escuta` (aberta, sem RBAC — mesmo modelo de `/benchmark`) mostra
"Amostra protegida" até existirem ≥5 sessões reais respondendo o mesmo
pack+instrumento; depois disso, mostra por item: % que respondeu, queda
relativa ao item anterior, tempo típico entre itens, e um selo "Carga alta"
quando um item consome ≥3× o tempo típico do instrumento.

## Sector Links reais — persistência do link setorial (P0-01, Plano §I)

`supabase/migrations/20260708120000_sector_links.sql` — 1 tabela
(`sector_links`: só `token_hash` SHA-256, nunca o token bruto; zero policy
de SELECT, tudo via service role) + 1 RPC (`submit_sector_response`,
SECURITY DEFINER, chamável por `anon` — o link compartilhado É a
credencial, modalidade `shared_sector` MULTI-USO, diferente do convite de
onda de uso único). A resposta entra em `wave_responses` com
`invite_token NULL` (anônima por schema) e passa pelo MESMO pipeline de
agregação k-anon (capsule, n≥5). Agregado POR SETOR é v2 declarada.

**Ação do founder:** colar o arquivo no Lovable. Idempotente. Depois,
rodar as 4 queries de verificação comentadas no rodapé do próprio arquivo
(`has_table_privilege`/`has_function_privilege` — lição do S5: o REVOKE
explícito precisa ser CONFERIDO, nunca presumido nesta conta Supabase).
Teste no app real: em `/admin`, numa onda aberta, "+ Gerar link de setor" →
copiar o link (aparece UMA vez só) → abrir numa aba anônima → responder →
a contagem da onda deve subir e a resposta entra no relatório protegido.

## Ops Events — telemetria operacional mínima (P1-04, EV-13)

`supabase/migrations/20260708130000_ops_events.sql` — 1 tabela INSERT-only
(`ops_events`), escrita SÓ pelo servidor (service role), zero policies. O
emissor TypeScript (`ops-events.server.ts`) é fire-and-forget e NUNCA lança
— telemetria jamais derruba o fluxo que observa. Um evento carrega só nome/
org/onda/motivo/contexto mínimo — nunca resposta, token ou e-mail
(privacidade por schema: o tipo não tem onde colocar).

Eventos emitidos: response_submit_attempted/accepted/rejected,
sector_response_accepted/rejected, sector_link_created, wave_created,
wave_closed, capsule_published, authorization_denied.

**Ação do founder:** colar o arquivo no Lovable. Idempotente. Rodar as 2
queries de verificação do rodapé. Depois, em `/admin`, o painel "Trilha de
operações" (botão "Ver trilha") mostra os últimos 20 eventos da org — é a
"falha visível" do P1-04 sem precisar de SQL.

## Leads — captura real da landing (P1-05, S7 Porta de Entrada)

`supabase/migrations/20260709140000_leads.sql` — 1 tabela (`leads`), sem
RPC (cada submissão é independente, sem recurso concorrente disputado).
Escrita SÓ pelo servidor (service role); zero policy de SELECT — só o
painel admin lê, via a mesma allowlist `PLATFORM_ADMIN_EMAILS` de
`/plataforma`. Fecha o modal "Receber apresentação executiva" (`/`, `/nr1`),
que antes descartava tudo silenciosamente (honestamente rotulado como
demonstração).

**Ação do founder:** colar o arquivo no Lovable. Idempotente. Rodar as 2
queries de verificação do rodapé. Depois, em `/plataforma`, o painel "Leads
recentes" mostra cada solicitação com origem (página + UTM). Teste real:
preencher o modal em `/` ou `/nr1` com o consentimento marcado → o lead
aparece em `/plataforma` com a origem correta.

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
12. `20260705160043_9800f3be-4083-4ea3-80d4-833731eeed31.sql` — **já aplicada em
    produção pelo próprio Lovable** (achado #3 acima, gerado pelo scanner de
    segurança do Lovable, não por mim). Incluída aqui pelo mesmo motivo dos
    itens 6 e 8.
13. `20260706100000_esg_report_snapshots.sql` (Dossiê ESG Auditável, I-E1)
14. `20260706110000_personal_assessments.sql` (Espelho Vivo real, I-M3/I-M5)
15. `20260706120000_victory_records.sql` (Ata de Vitória, I-E2/I-E4)
16. `20260706130000_item_funnel_events.sql` (Lupa da Escuta, I-M7)
17. `20260708120000_sector_links.sql` (Sector Links reais, P0-01)
18. `20260708130000_ops_events.sql` (Telemetria operacional, P1-04)
19. `20260709140000_leads.sql` (Captura real de leads, P1-05, S7)
20. `20260709150000_practice_entries.sql` (Diário de Prática real, I7 —
    tabela PESSOAL padrão S5: RLS own-only SELECT/INSERT/DELETE, sem UPDATE;
    o INSERT amarra org_id ao profile da sessão. Após aplicar, rodar as 3
    verificações do rodapé do arquivo. Teste no app: logar com conta real →
    `/diario` → registrar prática → recarregar a página → o registro
    persiste; no modo demo nada muda — segue efêmero e declarado.)
21. `20260709160000_seed_events.sql` (Sementes Vivas reais, I1 — ledger
    pessoal INSERT-ONLY: nem UPDATE nem DELETE, os limites semanais são
    folds do histórico e apagar evento os burlaria. Pools coletivos
    (Pomar/Bosque) computados só via service role com k-anon ≥5 por pool.
    Após aplicar, rodar as 4 verificações do rodapé. Teste no app: logar
    real → `/reconhecimento` → a carteira mostra saldo 0 real (não o mock
    da Marina); o plantio pessoal só lista destinatários depois da migration
    22 abaixo — antes dela, aparece a nota honesta "ninguém entrou no
    diretório ainda"; os pools aparecem protegidos (0 contribuintes < 5).)
22. `20260710130000_pair_directory.sql` (Diretório consentido de colegas —
    destrava Duplas de Prática reais e os destinatários reais do plantio de
    Sementes. Entrar no diretório É o ato de consentir ser visto pela
    própria org; leitura alcança colegas VISÍVEIS da mesma org (nunca
    cross-tenant), escrita é sempre da própria pessoa. Sair =
    `visible=false`, nunca DELETE — histórico auditável. Após aplicar,
    rodar as 2 verificações do rodapé. Teste no app: logar com DUAS contas
    reais da mesma org → `/diario` → cada uma entra no diretório com um
    driver em foco + até 3 forças → a segunda pessoa aparece na lista de
    sugestões da primeira (e vice-versa) → em `/reconhecimento`, cada uma
    aparece como destinatário possível de semente para a outra. Formação
    bilateral da dupla chega na migration 23, abaixo.)
23. `20260710140000_bilateral_pairs.sql` (Formação bilateral REAL da Dupla
    de Prática — o aperto de mão que fecha a I6. Duas tabelas
    (`pair_invites`, `pair_records`) + 3 RPCs SECURITY DEFINER
    (`accept_pair_invite` atômica — `FOR UPDATE` no convite, revalida
    diretório e "uma dupla ativa por pessoa" dos DOIS lados antes de criar
    a dupla; `decline_pair_invite`/`cancel_pair_invite`). `pair_records`
    nunca recebe INSERT/UPDATE/DELETE de cliente — só a RPC cria. Convite
    só pode ser endereçado a quem está VISÍVEL no diretório (migration 22);
    anti-spam por UNIQUE parcial (1 convite pendente por par ordenado).
    Após aplicar, rodar as 4 verificações do rodapé — atenção: o SQL tem
    `ON DELETE CASCADE` nas FKs, o Lovable vai mostrar o aviso de
    "destructive operation"; seguro confirmar (mesmo falso-positivo já
    documentado). Teste no app: com DUAS contas reais no diretório, a
    primeira convida a segunda (botão "Convidar" na sugestão) → a segunda
    vê o convite em "Convites recebidos" e aceita → as duas veem "Dupla
    ativa" imediatamente. Uma terceira conta tentando convidar qualquer
    uma das duas recebe `already_paired`.)
24. `20260710150000_circle_sessions.sql` (Círculos Vivos reais, I5 —
    privacidade POR SCHEMA: a tabela NÃO tem coluna de conteúdo nem lista
    de participantes, só `{facilitator_id, embassy_id, driver_id,
    occurred_on, presence_count}`. O facilitador (autenticado) registra a
    própria roda; qualquer membro da org vê que a roda aconteceu (ritual
    coletivo), nunca quem participou. Sem UPDATE/DELETE — roda que ocorreu
    é fato. Após aplicar, rodar as 4 verificações do rodapé (todas `false`
    + COUNT policies = 2). Teste no app: logar real → `/embaixador` abrir
    uma roda com presença ≥2 → recarregar → a roda persiste; o
    micro-compromisso de cada pessoa vai para o Diário dela, nunca para o
    registro da roda.)

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
