# Auditoria de schema e backup da produção — 2026-07-26

> AUDITORIA-PROD-01 + OPS-DATA-01. Worktree `../vitalos-prod-audit`, branch
> `audit/prod-schema-and-ops-readonly`, base `origin/main@65a554a`.
> **Produção não foi alterada. Nenhuma query foi executada por este agente**
> (ver §0). Sem push, PR, merge ou deploy.

## Convenção

Cada afirmação abaixo é marcada como:

- **FATO** — observado diretamente, com a fonte nomeada.
- **EVIDÊNCIA** — o dado bruto que sustenta o fato.
- **INFERÊNCIA** — raciocínio a partir dos fatos; pode estar errado.
- **RISCO** — consequência se a inferência se confirmar.
- **BLOQUEADOR** — impede autorizar piloto.
- **DECISÃO PENDENTE** — precisa do founder.

## §0 — Limite de execução desta auditoria

**FATO.** Este agente (Claude Code) **não possui** a ferramenta
`supabase--read_query`, nem qualquer outro acesso ao banco de produção.

**EVIDÊNCIA.** Busca no conjunto de ferramentas disponíveis não retorna nenhuma
ferramenta `supabase--*`. O próprio Lovable declarou nesta thread: *"As
ferramentas supabase--* que tenho (migration, read_query, linter, etc.) operam
apenas no projeto Cloud já vinculado a este app"* — a ferramenta pertence ao
**Lovable**, não ao Claude Code.

**Consequência.** A Fase 3 (9 queries de catálogo) **não foi executada**. As
queries estão prontas em §5 para o founder rodar via Lovable. Todo número sobre
produção neste documento veio do founder, não de leitura própria.

## §1 — Identidade da produção `FATO` (informado pelo founder)

| Item | Valor |
|---|---|
| Backend | Lovable Cloud, conectado ao app publicado |
| Project ref (mascarado) | `shlm…akol` |
| Região | `ca-central-1` |
| Ambiente | Live / produção |
| Não é | `vitalos-staging` (`xttjkpzhx…`) nem `hmwjawytz…` |
| Acesso a SQL | via `supabase--read_query` (ferramenta do Lovable) |

Confere com o ref visto anteriormente em `.env` (`shlmzz…supabase.co`).
`PROD_TARGET_CONFIRMED`.

## §2 — Baseline do repositório `FATO` (Fase 1, verificado localmente)

Base: `origin/main@65a554a`.

| Item | Valor |
|---|---|
| Migrations | **42** · rollup SHA-256 `496655c9bc68…` (`bun run manifest` ✅) |
| Tabelas distintas esperadas | **29** |
| Funções distintas esperadas | **25** |
| Policies declaradas | 36 (**35** vivas — `response_submit` é dropada de propósito em `20260705160043`) |
| Índices | 30 · Constraints nomeadas | 2 |
| Blocos `SECURITY DEFINER` | 45 · GRANTs | 107 · REVOKEs | 65 |
| **Migrations destrutivas** | **0** |

**FATO — nenhuma migration é destrutiva na aplicação.** O único `DELETE` do
corpus está **dentro** da função `erase_my_assessments`
(`20260706110000_personal_assessments.sql:75`), escopado a `auth.uid()` — é o
recurso de "apagar meus dados" (LGPD), executado sob demanda do titular, não um
comando de migration. Isso é central para o plano de remediação: aplicar as
migrations ausentes não apaga dado existente por construção.

### Autoria das migrations `FATO`

28 escritas por `Dev Team`, 14 pelo bot `gpt-engineer-app[bot]` (Lovable).

**Hipótese descartada.** Levantou-se que o drift seria por autoria (o Lovable
aplicaria só as suas). **Falso:** as migrations #27, #28, #32, #33 e #38 são do
bot do Lovable e caem *depois* do corte observado — se o critério fosse
autoral, estariam presentes. Registrado para não ser reproposto.

## §3 — A inconsistência central `INFERÊNCIA FORTE`

Dois números informados pelo founder, tomados juntos, não fecham.

**EVIDÊNCIA (informada):**
- produção tem **19 tabelas públicas**;
- última migration registrada: **`20260713234253`**.

**FATO (calculado do repo).** Na versão `20260713234252` — a última migration do
repo com versão ≤ à reportada — o estado esperado é de **28 tabelas**.

**INFERÊNCIA.** Se o histórico registra migrations até 2026-07-13, mas só 19 das
28 tabelas correspondentes existem, então **o histórico de migrations da
produção não reflete o schema real**. Migrations aparecem como aplicadas sem
que seus objetos existam.

Isso **derruba a hipótese anterior** de "corte temporal limpo em
`20260706130000`": o corte explicaria 19 tabelas, mas não explicaria um
histórico que avança até `20260713`. As duas coisas só coexistem se o registro
e a aplicação tiverem se separado em algum momento.

**As 9 tabelas provavelmente ausentes** (as que existiriam entre a 20ª e a 28ª):

`sector_links` · `ops_events` · `leads` · `practice_entries` · `seed_events` ·
`pair_directory_entries` · `pair_invites` · `pair_records` · `circle_sessions`

**RISCO.** Um histórico de migrations que mente é pior que um histórico
atrasado: qualquer ferramenta (incluindo o próprio Lovable) que decida o que
aplicar com base nele vai **pular** as migrations que julga já aplicadas, e o
drift nunca se fecha sozinho — nem com um `db push` futuro.

**Corroboração independente.** `docs/CHECKLIST_PRONTIDAO_PILOTO.md:38` tem, em
aberto desde 2026-07-09: `[ ] Migration 19 (leads) aplicada`. `leads` está na
lista das 9 acima. A pendência registrada há 17 dias é consistente com o
cálculo.

### Anomalia adicional `FATO`

A versão reportada pela produção — `20260713234253` — **não existe no
repositório**. O repo tem `20260713234252_8e382d9e-…` (um segundo antes).
Nenhum arquivo do repo tem o prefixo `…253`.

**INFERÊNCIA.** Pode ser (a) diferença de arredondamento de como o Lovable grava
a `version`, (b) transcrição imprecisa, ou (c) uma migration aplicada em
produção que **não está versionada no repo**. A hipótese (c) é a mais grave e a
única que a lista completa de versões (§5, query 1) resolve.

## §4 — Classificação preliminar

Preliminar porque depende das queries de §5. Nada aqui é conclusivo.

| Sev | Achado | Estado |
|---|---|---|
| **P0** | Migrations 41 e 42 (segurança) quase certamente ausentes em produção — são de `20260725`, muito além da última versão registrada. `wave_responses` com SELECT para `anon`/`authenticated`, e `count_wave_responses` sem vínculo de tenant (vazamento de contagem cross-tenant, explorável por qualquer autenticado via REST). | **a confirmar** (§5 q6, q8) |
| **P0** | Histórico de migrations não confiável — registra versões cujos objetos não existem. Compromete qualquer remediação automática. | **inferência forte** |
| **P0?** | Versão `…253` em produção sem correspondente no repo — possível migration não versionada. | **a confirmar** (§5 q1) |
| **P1** | 9 tabelas prováveis ausentes, incluindo `ops_events` (telemetria), `sector_links` (link setorial) e `leads`. | **a confirmar** (§5 q2, q7) |
| **P1** | Estado de RLS e policies das tabelas existentes em produção — desconhecido. | **a confirmar** (§5 q3, q5) |
| **P2** | `pair_*` e `circle_sessions` provavelmente fora do corte do piloto. | **a confirmar** |

## §5 — Queries da Fase 3, para o founder executar `DECISÃO PENDENTE`

Todas somente leitura, todas de catálogo. **Nenhuma toca `wave_responses` em
nível de linha.** Rodar via Lovable, pedindo execução com `supabase--read_query`.

```sql
-- 1. Histórico completo (resolve a anomalia da versão ...253)
SELECT count(*) AS registradas, min(version) AS primeira, max(version) AS ultima
FROM supabase_migrations.schema_migrations;

SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;

-- 2. Tabelas públicas
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;

-- 3. Tabelas e RLS
SELECT count(*) AS tabelas_publicas,
       count(*) FILTER (WHERE c.relrowsecurity) AS tabelas_com_rls
FROM pg_tables t
JOIN pg_class c ON c.relname=t.tablename
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE t.schemaname='public' AND n.nspname='public' AND c.relkind IN ('r','p');

-- 4. Funções
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security,
       p.proconfig AS search_path
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' ORDER BY p.proname, args;

-- 5. Policies
SELECT tablename, policyname, roles, cmd FROM pg_policies
WHERE schemaname='public' ORDER BY tablename, policyname;

-- 6. Grants de wave_responses
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='wave_responses'
  AND grantee IN ('anon','authenticated','service_role')
ORDER BY grantee, privilege_type;

-- 7. Objetos críticos
SELECT to_regclass('public.item_funnel_events') IS NOT NULL AS item_funnel_events,
       to_regclass('public.sector_links')       IS NOT NULL AS sector_links,
       to_regclass('public.ops_events')         IS NOT NULL AS ops_events,
       to_regclass('public.leads')              IS NOT NULL AS leads,
       to_regclass('public.practice_entries')   IS NOT NULL AS practice_entries,
       to_regclass('public.seed_events')        IS NOT NULL AS seed_events,
       to_regclass('public.wave_responses')     IS NOT NULL AS wave_responses,
       to_regclass('public.wave_capsules')      IS NOT NULL AS wave_capsules;

-- 8. Estado das migrations 41 e 42
SELECT has_table_privilege('authenticated','public.wave_responses','SELECT') AS m41_authenticated_select,
       has_table_privilege('anon','public.wave_responses','SELECT')          AS m41_anon_select,
       (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.proname='count_wave_responses')      AS m42_rpc_overloads,
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.proname='count_wave_responses'
           AND pg_get_functiondef(p.oid) ILIKE '%service_role%')             AS m42_rpc_service_role_check;
```

## §6 — Backup, retenção, restauração e owner `BLOCKER_OPS_BACKUP`

Sem alteração desde a apuração de 2026-07-25.

| Item | Estado |
|---|---|
| Projeto do piloto | `shlm…akol` (Lovable Cloud, ca-central-1) |
| Plano · Backup · Frequência · Retenção · Restauração · PITR · RTO · RPO | **não verificáveis** |
| Owner técnico | Lovable (infraestrutura) |
| **Responsável operacional** | **indefinido** |
| Procedimento de restauração / exclusão | não documentado |
| Evidência | conta Supabase do founder tem 2 projetos, nenhum é `shlm…akol` |

**FATO.** O projeto de produção não está na conta Supabase do founder, logo o
painel `Database → Backups` dele é inacessível.

**RISCO.** O ambiente que receberá respostas reais de pesquisa psicossocial tem
backup, retenção e restauração fora do controle e da visibilidade de quem
responde legalmente pelo dado. Não é possível afirmar que há backup, nem que
não há — e a incerteza é, por si só, o bloqueador.

### Solicitação ao suporte Lovable — redigida, **não enviada** `DECISÃO PENDENTE`

> Assunto: Política de backup, retenção e propriedade de dados — projeto `shlm…akol`
>
> Somos responsáveis por uma aplicação em Lovable Cloud que passará a coletar
> dados de pesquisa psicossocial no trabalho (contexto NR-1, dados sensíveis sob
> LGPD). Antes de iniciar um piloto com dados reais, precisamos documentar
> formalmente:
>
> 1. **Backup** — existe backup automático do banco Postgres deste projeto?
> 2. **Frequência** — de quanto em quanto tempo?
> 3. **Retenção** — por quanto tempo cada backup é mantido?
> 4. **Restauração** — qual o procedimento, quem executa e qual o tempo estimado (RTO)?
> 5. **PITR** — há point-in-time recovery? Em qual granularidade (RPO)?
> 6. **Owner de infraestrutura** — quem é o responsável técnico pelo banco?
> 7. **Exportação** — como obtemos um dump completo dos nossos dados, sob demanda?
> 8. **Transferência de propriedade** — é possível migrar este projeto para uma
>    conta Supabase própria nossa? Qual o procedimento e o impacto?
> 9. **Incidente** — qual o processo e o canal em caso de perda ou corrupção de dados?
> 10. **Prazo** — em quanto tempo podemos esperar retorno formal destes pontos?
>
> Precisamos das respostas por escrito, para anexar ao nosso dossiê de
> conformidade antes de autorizar a coleta de dados reais.

## §7 — Plano de remediação `NÃO EXECUTAR NESTA TAREFA`

Pré-condições inegociáveis, todas hoje **não atendidas**:

1. Backup do estado atual da produção **confirmado e testado**.
2. Snapshot/export obtido antes de qualquer escrita.
3. Lista exata de migrations ausentes — depende de §5 q1.
4. Resolver a anomalia `…253` (migration não versionada?) — depende de §5 q1.
5. Decidir como tratar o histórico não confiável: reconciliar registro↔objetos
   antes de aplicar qualquer coisa (aplicar por cima de um histórico que mente
   é o caminho mais rápido para um erro difícil de reverter).
6. Ordem de aplicação = ordem do manifesto (lexicográfica = cronológica).
7. Pré-checks por migration; rollback lógico definido (facilitado por §2:
   nenhuma migration é destrutiva).
8. Validação pós-migration: contagem de objetos + testes de RLS + `has_*_privilege`.
9. **Prioridade absoluta às migrations 41 e 42** — são correções de segurança
   ativa, não features.
10. Responsável operacional nomeado.
11. Aprovação explícita do founder, em janela própria.

## §8 — Veredito

`PROD_SCHEMA_AUDIT_BLOCKED` — o diagnóstico **não pôde ser completado** porque
este agente não tem acesso de leitura à produção (§0). O que foi possível
estabelecer: baseline do repositório completo (§2) e uma inconsistência
estrutural forte entre histórico e schema (§3), que precisa das queries de §5
para virar fato.

`Q1_1_BLOCKED` permanece. **Piloto real não autorizado.**

---

# PARTE II — Plano de remediação (PROD-REMEDIATION-PLAN-01)

> Somente análise e documentação. **Nada foi executado.** Nenhum SQL remoto,
> nenhuma migration, nenhum `db push`, nenhuma alteração no Lovable Cloud.

## §9 — Fonte de verdade `MIGRATION_HISTORY_NON_CANONICAL`

`supabase_migrations.schema_migrations` da produção **não pode** ser a fonte de
verdade: ele registra `20260713234253` enquanto objetos de migrations bem
anteriores estão ausentes (§3), e a base canônica desta tarefa confirma que
`item_funnel_events` — criada em `20260706130000` — não existe.

Fonte de verdade adotada, em ordem: **(1)** schema real observado; **(2)**
migrations do repo `@65a554a`; **(3)** manifesto (`496655c9bc68…`); **(4)**
staging comprovado; **(5)** inventário de objetos.

O histórico **não será corrigido nesta tarefa**.

### Correção de inferência anterior `FATO`

A base canônica informa `item_funnel_events` **ausente**. Isso **refuta** a
inferência do §3 de que as 19 tabelas seriam as 19 primeiras em ordem de
criação (série que terminava justamente em `item_funnel_events`). A composição
real das 19 é **desconhecida** e só a query §5 q2 resolve. Toda linha "produção"
da matriz abaixo está marcada como não verificada por causa disso.

## §10 — Matriz de drift

Coluna "Produção" = `?` significa **não lido** (§0). Não é ausência presumida.

| Objeto | Tipo | Esperado | Produção | Migration origem | Piloto? | Risco | Ação | Pré-check | Rollback |
|---|---|---|---|---|---|---|---|---|---|
| `wave_responses` ACL | grant | sem SELECT p/ anon+auth | **SELECT presente** | 41 (ausente) | **sim** | **P0** | aplicar 41 | q6 | `GRANT SELECT` de volta |
| `count_wave_responses` | função | org-scoped + bypass service_role | **sem checagem** | 42 (ausente) | **sim** | **P0** | aplicar 42 | q8 | `CREATE OR REPLACE` versão anterior |
| `provision_organization_from_invite` | função | validar `p_user_id = auth.uid()` | presente, **sem validação** | `20260703203653` | **sim** | **P0** (§12) | migration nova 43 | q4 | restaurar grant anterior |
| `item_funnel_events` | tabela | existe | **ausente** (confirmado) | `20260706130000` | não (§13) | **P1** | aplicar isolada | q7 | `DROP TABLE` (vazia) |
| `record_item_funnel_event` | função | existe | `?` | `20260706130000` | não | P1 | junto da tabela | q4 | `DROP FUNCTION` |
| `sector_links`, `ops_events` | tabelas | existem | `?` | `20260708120000/130000` | parcial | P1 | reconciliar | q7 | `DROP TABLE` (vazias) |
| `leads` | tabela | existe | `?` | `20260709140000` | não | P1 | reconciliar | q7 | `DROP TABLE` |
| `practice_entries`, `seed_events` | tabelas | existem | `?` | `20260709150000/160000` | não | P2 | adiar | q7 | — |
| `pair_*`, `circle_sessions` | tabelas | existem | `?` | `2026071013/14/15` | **não** | P2 | adiar | q7 | — |
| RLS das 19 existentes | RLS | 100% | `?` | várias | **sim** | **P0 se <100%** | investigar | q3 | n/a |
| Policies | policy | 35 vivas | **25** | várias | **sim** | **P0/P1** | mapear as 10 | q5 | `DROP POLICY` |
| Funções | função | 25 | **11** | várias | parcial | P1 | mapear as 14 | q4 | `DROP FUNCTION` |
| `search_path` | config | `public` em 25/25 | `?` | várias | **sim** | **P0 se ausente** | verificar | q4 | n/a |

**Lacuna de policies é o dado mais preocupante depois dos P0 de segurança:** 25
em produção contra 35 vivas esperadas. Se alguma das 10 faltantes for de tabela
existente e sensível, há exposição **hoje** — não apenas funcionalidade
ausente. A query §5 q5 é a de maior prioridade diagnóstica.

## §11 — Migration 41 (isolada)

Arquivo: `20260725120000_revoke_wave_responses_select_grant.sql` · 1920 bytes ·
`7ce44ce646d9…` · statement único: `REVOKE SELECT ON public.wave_responses FROM authenticated, anon;`

- **ACL atual (produção):** `authenticated` e `anon` **com** SELECT.
- **Origem provável:** `ALTER DEFAULT PRIVILEGES` da conta. A tabela nasceu em
  `20260630161949`, antes da disciplina de `REVOKE ALL` (adotada a partir de
  `20260705100000`), e `20260705160043` revogou INSERT/UPDATE/DELETE mas
  **esqueceu SELECT**. Não há `GRANT SELECT` explícito em nenhuma migration.
- **Efeito:** remove o privilégio de tabela. Não altera dados, não altera RLS.
- **Impacto PostgREST:** `GET /wave_responses` passa de 200-com-0-linhas (hoje
  barrado só pela ausência de policy de SELECT) para **401/403**. Falha mais
  cedo e mais alto — desejável.
- **Impacto em funções:** **nenhum.** As leitoras são `SECURITY DEFINER`
  (rodam como owner) ou usam `service_role`, que mantém `GRANT ALL`.
- **Pré-check:** §5 q6 e q8. **Pós-check:** as duas asserções obrigatórias
  (`has_table_privilege(...) = false` para ambos os papéis).
- **Rollback:** `GRANT SELECT ON public.wave_responses TO authenticated, anon;`
  — restaura exatamente o estado anterior. Reversível em um comando.
- **Risco de aplicar:** baixo. **Risco de não aplicar:** alto — é a única
  camada entre uma policy de SELECT criada por engano (ou pelo scanner
  automático do Lovable, comportamento já documentado neste repo) e a exposição
  de resposta individual de pesquisa.

## §12 — Migration 42 (isolada) + achado novo

Arquivo: `20260725130000_scope_count_wave_responses_to_caller_org.sql` · 2535 bytes ·
`682fe72a0969…` · `CREATE OR REPLACE FUNCTION` (idempotente, sem DDL destrutivo).

- **Definição atual (produção):** conta por `wave_id`, **sem vínculo de org**.
- **Definição esperada:** mesma contagem + `auth.role() = 'service_role' OR
  wave_id IN (SELECT w.id FROM waves w JOIN profiles p ON p.org_id = w.org_id
  WHERE p.id = auth.uid())`.
- **EXECUTE:** `authenticated` (necessário — o painel de ondas mostra contagem).
- **Comportamentos esperados pós-correção** (todos já **comprovados em staging**,
  §Q1.1 prova dinâmica): membro/onda própria → contagem real; membro/onda alheia
  → `0`; sem membership → `0`; `service_role` → contagem real.
- **`SECURITY DEFINER SET search_path = public`** preservado.
- **Pré-check:** §5 q8. **Pós-check:** os 5 testes cross-tenant obrigatórios.
- **Rollback:** `CREATE OR REPLACE` com a definição anterior (preservada em
  `20260630161949`). Reversível sem perda.

### `PROD-P0-NEW` — `provision_organization_from_invite` `FATO` + `INFERÊNCIA`

**Descoberto nesta análise, ainda não corrigido em lugar nenhum** (nem repo, nem
staging, nem produção).

- **FATO.** A função tem `GRANT EXECUTE TO authenticated` e recebe `p_user_id`
  por parâmetro. Ela valida a identidade **apenas** dentro de
  `IF v_invite.email IS NOT NULL` (compara o e-mail do `p_user_id` com o do
  convite). **Nunca** compara `p_user_id` com `auth.uid()`.
- **FATO.** `org_invites.email` é nullable (`email TEXT`, sem `NOT NULL`), e o
  app cria convites sem e-mail deliberadamente:
  `src/lib/api/org-invite.server.ts:88` → `email: boundEmail?.trim() || null`
  (fluxo de link genérico).
- **INFERÊNCIA.** Com um token de convite sem e-mail, qualquer usuário
  autenticado pode chamar a função passando o UUID de **outra pessoa** e
  provisionar uma organização vinculada a ela, sem consentimento — criando
  `profiles` alheio com papel administrativo.
- **Precedente idêntico no repo:** `20260714130000` restringiu
  `accept_member_invite` a `service_role` por **exatamente** este motivo
  ("NUNCA confere se quem está chamando é o próprio p_user_id"). O comentário
  daquela migration classifica `provision_organization_from_invite` como
  "legitimamente chamada do cliente" — o que é verdade, mas a proteção assumida
  (e-mail do convite) **não existe** no caminho de convite genérico.
- **Ação recomendada:** migration nova (43) adicionando
  `IF p_user_id <> auth.uid() THEN RETURN ... 'identity_mismatch'`. Correção de
  uma linha, sem impacto no fluxo legítimo (o cliente sempre passa o próprio id).
- **Não corrigir nesta tarefa** — exige revisão do founder e vai para a mesma
  janela dos P0.

## §13 — `item_funnel_events` `FATO`

- **Criação:** `20260706130000_item_funnel_events.sql` (tabela + índice + RLS +
  `record_item_funnel_event` SECURITY DEFINER + grants). **Idempotente**
  (`CREATE TABLE IF NOT EXISTS`), **não destrutiva**, **sem dependência** de
  outras tabelas ausentes → aplicável isoladamente.
- **Consumidor único:** `src/lib/survey/survey-telemetry.server.ts`, chamado por
  `survey-telemetry.functions.ts`, `routes/convite.$token.tsx` e
  `routes/lupa-da-escuta.tsx`.
- **Impacto da ausência:** a chamada retorna `{ accepted: false, reason:
  "db_error" }` (linha 82) — **falha tolerada, não derruba a submissão**. É
  telemetria de funil, não caminho crítico de resposta.
- **Faz parte do piloto?** **Não.** Perde-se observabilidade do funil, não
  funcionalidade de coleta.
- **Classificação: P1** (não P0). **Pré-check:** §5 q7. **Pós-check:**
  `to_regclass` não-nulo + RLS ativa + `has_function_privilege`. **Rollback:**
  `DROP TABLE public.item_funnel_events CASCADE` — segura, a tabela estará vazia.

## §14 — Funções `SECURITY DEFINER` (lado repositório) `FATO`

Análise das **25 do repo**. Quais 11 existem em produção é **desconhecido**
(§5 q4).

| Eixo | Resultado |
|---|---|
| `SECURITY DEFINER` | 25/25 |
| `SET search_path = public` | **25/25** — zero achados |
| SQL dinâmico (`EXECUTE format`) | **0/25** — zero achados |
| Sem `GRANT EXECUTE` explícito | **0/25** — nenhuma herda default da conta |

**EXECUTE por papel:** 14 só `service_role`; 4 `authenticated`; 3 `anon +
authenticated`; 1 `anon + service_role`; 3 `authenticated + service_role`.

**Classificação das expostas a `anon`/`authenticated`:**

| Função | EXECUTE | Validação | Sev |
|---|---|---|---|
| `provision_organization_from_invite` | authenticated | **falha se convite sem e-mail** | **P0** (§12) |
| `count_wave_responses` | authenticated | org-scoped **após 42** | **P0 até aplicar 42** |
| `submit_wave_response` | anon, authenticated | token + `FOR UPDATE` + vínculo | OK |
| `submit_sector_response` | anon, service_role | token + vínculo | OK |
| `is_invite_valid`, `is_invite_valid_for_wave` | anon, authenticated | só booleano, sem dado | OK |
| `record_item_funnel_event` | anon, authenticated | telemetria agregada | P2 |
| `erase_my_assessments` | authenticated | `auth.uid()` próprio | OK |
| `accept_pair_invite`, `cancel_pair_invite`, `decline_pair_invite` | authenticated | `auth.uid()` | OK |

Nenhuma vulnerabilidade declarada sem evidência: as marcadas OK têm o mecanismo
de autorização nomeado.

## §15 — Janela de mudança proposta `NÃO EXECUTAR`

Pré-condições **bloqueantes** (nenhuma atendida hoje): owner nomeado; backup
comprovado **e restauração testada**; snapshot obtido.

1. Owner técnico + responsável operacional nomeados e cientes.
2. Backup confirmado por escrito pelo Lovable **e restauração testada** (§16).
3. Snapshot/export imediatamente antes da janela.
4. Congelamento: sem edições no Lovable durante a janela.
5. **Diagnóstico completo primeiro** — rodar §5 q1–q8 e fechar a matriz §10.
6. **Migration 41 isolada** → pós-check ACL → observar.
7. Validação RLS/ACL (as duas asserções `has_table_privilege = false`).
8. **Migration 42 isolada** → pós-check → observar.
9. Testes cross-tenant (os 5 casos), com usuários sintéticos, nunca reais.
10. **Migration 43 (novo P0 §12)** — só após revisão do founder.
11. Reconciliação P1 (`item_funnel_events`, `sector_links`, `ops_events`), uma
    a uma, cada uma com pré/pós-check.
12. Gate: `bun run gate` + `bun run manifest` verdes antes de cada aplicação.
13. Observação pós-mudança: erros do app, `ops_events`, submissões reais.
14. Rollback documentado por passo (§11, §12, §13).
15. Registro das evidências neste documento.

**Explicitamente rejeitado:** aplicar as 42 em bloco. O histórico não é
confiável (§9), várias já estão aplicadas, e um `db push` decidiria o que rodar
lendo justamente o registro que sabemos estar errado.

**Ordem de prioridade se a janela for curta:** 41 → 42 → 43 → P1. Os três
primeiros são segurança ativa; o resto é funcionalidade.

## §16 — Backup e governança

Sem alteração: `BLOCKER_OPS_BACKUP` · `BLOCKER_RESTORE_UNPROVEN` ·
`BLOCKER_DATA_OWNERSHIP`. Solicitação ao Lovable redigida em **§6** —
**não enviada**. Acrescentar ao enviá-la: *"restauração já foi testada alguma
vez neste projeto? Se sim, quando e com que resultado?"* — backup não testado
não é backup comprovado.

## §17 — Histórico canônico a partir da próxima mudança

1. Toda mudança de schema nasce como migration versionada no repo — **nunca**
   SQL manual no painel.
2. Revisão humana + CI verde (`bun run gate`, `bun run manifest`) antes de aplicar.
3. Backup imediatamente antes.
4. Aplicação controlada em janela, uma migration por vez.
5. Registro verificável: versão aplicada + evidência de pós-check neste doc.
6. Validação pós-migration obrigatória (contagem de objetos + `has_*_privilege`
   + testes de RLS).
7. **Proibido** SQL manual não documentado — se acontecer em emergência, vira
   migration versionada na mesma semana.
8. `schema_migrations` **não** é retroativamente corrigido nesta tarefa; a
   reconciliação registro↔objetos é decisão própria, com o founder.

## §18 — Veredito da Parte II

`PROD_REMEDIATION_PLAN_READY` — drift mapeado (com as lacunas de leitura
explicitamente marcadas), 41 e 42 com plano isolado e rollback, 25 funções
classificadas, `item_funnel_events` classificada como P1, solicitação ao Lovable
pronta, pré/pós-checks e rollback definidos.

Um **P0 novo** foi descoberto no caminho (§12, `provision_organization_from_invite`).

`Q1_1_BLOCKED` permanece. **Piloto real não autorizado.**
