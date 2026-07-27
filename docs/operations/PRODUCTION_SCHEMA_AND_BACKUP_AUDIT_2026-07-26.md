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
