# G1 — Banco de produção · fechamento de segurança + convergência FIB-T

Documento único desta onda: **evidência** (o que foi encontrado e como foi
provado) + **runbook** (o que executar, em que ordem, como verificar, como
voltar). Não há relatórios paralelos.

- Branch: `feat/fibt-security-closure-5-2-xl`
- Alvo do gate: banco de **produção** (Lovable Cloud, ref `shlmzz…`)
- Produção **não foi acessada nem alterada** por esta onda.
- `VITE_FIBT_PILOT_ENABLED` permanece `false`. Nenhum link real, nenhuma
  coleta real, nenhuma resposta individual lida.

---

## 1. Decisão pedida

| Campo | Valor |
| --- | --- |
| Gate | **G1 — migration no banco de produção** |
| Mudança | Fronteira de autoridade de `profiles` + reconciliação de EXECUTE + convergência do contrato FIB-T |
| Arquivos | 6 migrations (`G1_PACKAGE_SHA256=9013c499a3273884`) |
| Pré-condições | PASS (provadas em replay, ver §5) |
| Compatibilidade com o dado vivo | PASS (read-only, favorável) |
| Backup | PASS na existência · **PARCIAL** na recuperação (PITR e drill não provados) |
| Testes | PASS — 3700/3700, replay de migrations verde nos dois modos |
| Rollback / forward-fix | PRONTO (§8) |
| Downtime esperado | **zero** |
| Risco de lock | **baixo** — detalhado em §7 |
| Recomendação | **GO**, com a ressalva de recuperação da §9 |

Autorizar: **SIM / NÃO**

---

## 2. O achado que originou a onda

O scan reportou `Users can grant themselves administrative privileges`. A
evidência no banco produtivo confirmou a capacidade. A causa vem da migration
base e tem duas partes:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
CREATE POLICY "profile_own" ON public.profiles FOR ALL
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```

`profiles.role` e `profiles.org_id` são as colunas de onde **toda** a
autorização do sistema deriva — `waves`, `member_invites`, `org_invites`,
`wave_invites`, planos de ação, capsules, todas resolvem autoridade e tenant
lendo `profiles`. A policy controla a **linha** ("é minha própria linha?") e
nunca a **coluna**; o grant é de **tabela** e cobre todas as colunas.

### 2.1 Por que as duas correções anteriores não fecharam

| Migration | O que fez | Por que não bastou |
| --- | --- | --- |
| `20260703130000` | `REVOKE UPDATE (role, org_id)` por coluna | O `GRANT UPDATE` de **tabela** pré-existente é entrada de ACL separada e continuava cobrindo as colunas |
| `20260703170000` | `REVOKE UPDATE` de tabela + `GRANT UPDATE (display_name)` | Fechou o UPDATE **e parou aí** |

**Achado novo desta onda:** `INSERT` e `DELETE` nunca foram revogados, e
`profile_own` é `FOR ALL` — cobre as duas. O caminho seguia aberto com dois
passos triviais:

```sql
DELETE FROM public.profiles WHERE id = auth.uid();
INSERT INTO public.profiles (id, org_id, role)
VALUES (auth.uid(), '<qualquer org>', 'RH_ADMIN');
```

As duas operações satisfazem `id = auth.uid()`. Privilégio de coluna não
restringe `INSERT`. O resultado é idêntico ao `UPDATE` proibido, por uma porta
que ninguém tinha olhado.

Nenhuma exploração é afirmada — o que foi corrigido é a **capacidade**.

### 2.2 A correção: três camadas independentes

`20260828120000_profile_authority_boundary_hardening.sql`

1. **ACL** — `REVOKE ALL` e reconcessão do mínimo: `SELECT` + `UPDATE
   (display_name)`. Sem `INSERT`, sem `DELETE`. `anon` sem nada. A ordem é o
   controle: partir de `REVOKE ALL` torna impossível sobrar privilégio herdado,
   que é como `20260703130000` falhou.
2. **RLS por comando** — `profile_own` (`FOR ALL`) dá lugar a
   `profiles_select_own` e `profiles_update_own`. **Não existe** policy de
   `INSERT` nem de `DELETE`; RLS nega por padrão o que nenhuma policy permite.
3. **Trigger de invariante** — `enforce_profile_authority_boundary()` recusa,
   vindo de papel de cliente (`anon`, `authenticated`, `authenticator`),
   qualquer `INSERT`, qualquer `DELETE` e qualquer `UPDATE` que mexa em `role`,
   `org_id` ou `id`.

A camada 3 existe porque as duas tentativas anteriores trataram **uma** camada
como suficiente. Ela é testada **com as camadas 1 e 2 desfeitas** — grant
reconcedido e policy `FOR ALL` recriada — e continua recusando
(`supabase/tests/01_profile_authority_boundary.sql`, bloco 5).

Também revogada a escrita de cliente em `organizations` (`INSERT/UPDATE/DELETE`
concedidos na base, sem nenhuma policy de escrita e sem nenhum caminho de
aplicação que os use — dívida pura que uma policy permissiva recriada por engano
transformaria em criação de tenant pelo cliente).

---

## 3. Superfície SECURITY DEFINER

`20260828121000_definer_surface_and_execute_grants.sql`

**A causa raiz é a mesma da §2:** os *default privileges* da conta concedem
`EXECUTE` em função nova a `anon`, `authenticated` e `service_role`. Toda função
nasce alcançável pela borda pública. A maioria das migrations revogou com
`FROM PUBLIC, authenticated, anon` — correto. Algumas revogaram só
`FROM PUBLIC`, e **revogar de PUBLIC não remove concessão explícita**.

| Função | Intenção declarada | ACL real | Impacto |
| --- | --- | --- | --- |
| `mark_invite_used(text)` | só `service_role` | + `anon`, `authenticated` | marca convite como usado → invalidação de convite por quem adivinhar um token |
| `accept_member_invite(text,uuid)` | só `service_role` | + `anon` | cria perfil com o papel do convite, para um `p_user_id` **escolhido pelo chamador** |
| `record_item_funnel_event(...)` | só servidor | + `anon`, `authenticated` | telemetria gravável por qualquer um |
| `count_wave_responses(uuid)` | chamada por `service_role` | **sem** grant a `service_role` | o produto funciona hoje por causa do default privilege — um endurecimento futuro de defaults quebraria produção sem aviso |

Além do achado de ACL, `accept_member_invite` tinha o mesmo defeito de
identidade que `20260726120000` corrigiu na irmã
`provision_organization_from_invite`: `p_user_id` vinha do chamador e nunca era
comparado com `auth.uid()`. Corrigido de forma simétrica, com o mesmo bypass
deliberado de `service_role` (o app resolve a identidade da sessão em servidor
antes de chamar, e nesse caminho `auth.uid()` é NULL por construção).

### 3.1 Inventário e classificação (29 funções da aplicação)

| Classe | Qtd. | Exemplos |
| --- | --- | --- |
| `INTENDED_ANON` | 5 | `submit_sector_response` (2 assinaturas), `submit_wave_response`, `is_invite_valid`, `is_invite_valid_for_wave` |
| `INTENDED_AUTHENTICATED` | 7 | `aggregate_cohort_responses`, `count_cohort_participation`, `count_wave_responses`, `erase_my_assessments`, RPCs de dupla |
| `SERVICE_ONLY` | 16 | ledgers de plano de ação, devolutiva, ESG, ciclo, Ata, `mark_invite_used`, `accept_member_invite`, `provision_organization_from_invite`, `record_item_funnel_event` |
| `SECURITY_DEFINER_NOT_REQUIRED` | 1 | `enforce_profile_authority_boundary()` (trigger, `SECURITY INVOKER` de propósito, sem `EXECUTE`) |
| `UNSAFE` remanescente | **0** | — |

Funções de extensão (pgcrypto) ficam fora por `pg_depend deptype='e'`: não são
superfície da aplicação e mexer na ACL delas quebraria a extensão.

### 3.2 O que a migration adiciona além de revogar

Em vez de mais um lote de `REVOKE` pontual, ela **declara** a ACL pretendida de
cada função e a **impõe** (revoga de todos os papéis de cliente, reconcede o
conjunto declarado — idempotente por construção). E faz uma **checagem de
completude**: se existir em `public` uma função da aplicação fora do inventário,
a migration **aborta**. É a diferença entre "revogamos o que vimos" e "nada
existe fora do inventário" — uma função nova criada por assistente de migration
não pode nascer com privilégio herdado e passar despercebida.

**Menor privilégio, não zero avisos.** RPC anônima de pesquisa continua anônima:
o respondente nunca tem sessão, o token é a credencial. O que muda é que ela
passa a ser pública **por contrato declarado**, não por herança de default.

---

## 4. Convergência FIB-T — e o bloqueio que ninguém tinha visto

### 4.1 `20260806210000` nunca rodou, em lugar nenhum

A precondition 1.6 de
`20260806210000_drop_response_invite_link_contract_production.sql` faz:

```sql
SELECT ... FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND pg_get_functiondef(p.oid) ~* '...'
```

O planejador empurra o qual de `pg_get_functiondef` para o scan de `pg_proc`,
**antes** do join que restringiria ao schema. `pg_get_functiondef` recusa
agregadas, e a primeira agregada do `pg_catalog` aborta a transação com
`"array_agg" is an aggregate function`.

**Reproduzido em PostgreSQL 17 vazio**, sem nenhum objeto do projeto: não é
dependência de plano, de estatística nem de dado. **Aborta sempre.**

A consequência é a que importa: `20260807120000` (durabilidade de
consentimento) tem como precondition que `wave_responses.invite_token` **não
exista mais**. Com o CONTRACT abortando, a durabilidade de consentimento fica
bloqueada — exatamente coerente com a evidência de que `consent_version` e
`consent_accepted_at` estão ausentes em produção. **O CONTRACT é o
pré-requisito que faltava**, e a remoção de `invite_token` é trabalho
**pendente**, não baseline.

A migration original permanece **imutável** (hash no manifesto verificável e
citado em `docs/fibt-prod-proof/PROD06_NONPROD_PROOF_PLAN.md`). A substituta é
`20260806211000_response_invite_link_contract_forward_fix.sql`:

- consulta de dependência corrigida (CTE `MATERIALIZED` + `prokind IN ('f','p')`);
- **idempotente** — coluna ausente é sucesso, porque não se sabe sem preflight
  se alguém aplicou o DROP manualmente depois de a precondition falhar;
- **fail-closed onde importa** — aborta se alguma resposta tiver `invite_token`
  preenchido (destruir vínculo existente exige snapshot e autorização nova);
- sem `CASCADE`, em lugar nenhum.

> **Item obrigatório de preflight (§6, passo 3):** confirmar se
> `wave_responses.invite_token` ainda existe em produção. A resposta muda o
> volume do trabalho, não a decisão — a migration cobre os dois casos.

### 4.2 Duas linhagens mutuamente exclusivas

`20260730160000` (Migration B de **staging**) exige exatamente 16 respostas com
`invite_token` em duas organizações sintéticas de UUID fixo, e **remove** a
coluna. `20260806210000` (gêmea de **produção**) **exige** que a coluna ainda
exista. As duas não podem rodar no mesmo banco, em nenhuma ordem.

Isso **não é defeito** — é fail-closed funcionando, cada migration recusando um
banco para o qual a autorização humana não foi dada. A consequência honesta é
que *"replay lexicográfico da cadeia inteira"* **não é uma afirmação possível**,
e um relatório que a declarasse verde estaria mentindo. O replay reproduz a
**linhagem de produção** (49 migrations aplicáveis de 54), com as exclusões
declaradas e impressas na saída.

### 4.3 Delta de produção fechado pelo pacote

| Item | Antes (evidência) | Depois |
| --- | --- | --- |
| `submit_sector_response` | `(text, jsonb)` | `(text, jsonb, text)` com versão de consentimento |
| `wave_responses.consent_version` / `consent_accepted_at` | ausentes | presentes, carimbo do servidor |
| `wave_responses.invite_token` | presença **não provada** (§4.1) | ausente |
| FK `sector_links` → wave/org e wave/cohort | ausentes | presentes |
| Um link ativo por onda/coorte | ausente | índice único parcial, provado por tentativa real |
| Vínculo de coorte | best-effort | fail-closed antes do INSERT |

---

## 5. Como isto foi provado

Revisão de texto de migration **já falhou nesta base** — um `REVOKE` por coluna
foi neutralizado por um `GRANT` de tabela e ninguém viu. Privilégio efetivo é a
interação de ACL de tabela, ACL de coluna, RLS e trigger; só o banco resolve essa
interação. Então o banco responde.

`bun run db:replay` sobe um Postgres 17 descartável em Docker, aplica um shim de
plataforma fiel (papéis do PostgREST, `auth.uid()`/`auth.role()` lendo
`request.jwt.claims`, **e os default privileges da conta** — sem essa última
linha a auditoria da §3 declararia seguras funções que não são), aplica a cadeia
e executa as suítes de `supabase/tests/`. Cada suíte **tenta o ataque de
verdade**, como `authenticated`, com JWT de sessão.

| Modo | O que prova | Resultado |
| --- | --- | --- |
| `db:replay` | banco limpo → cadeia completa → provas | **14/14 passos** |
| `db:replay:preprod` | banco limpo → estado pré-produção → **drift de ACL observado** → pacote G1 → provas | **16/16 passos** |

O modo `preprod` existe porque validar só contra o replay limpo provaria pouco:
lá o buraco de `UPDATE` já está fechado antes do pacote rodar. Ele injeta a
capacidade de `UPDATE` **observada em produção** e o inventário legado (3 ondas
seladas, 30 convites, 0 resposta), de modo que o pacote precise fechar o caminho
**partindo do estado drifted**.

Invariantes provadas no banco:

```
PROFILE_SELF_ROLE_ESCALATION=BLOCKED (RH_ADMIN, DIRETOR, SST)
PROFILE_SELF_ORG_REBIND=BLOCKED
FULL_ROW_UPDATE_BYPASS=BLOCKED · PARTIAL_UPDATE_BYPASS=BLOCKED
UPSERT_BYPASS=BLOCKED · INSERT_BYPASS=BLOCKED · DELETE_BYPASS=BLOCKED
INSERT_FOREIGN_PROFILE=BLOCKED
DIRECT_POSTGREST_BYPASS=BLOCKED (authenticator sem privilégio próprio)
TENANT_BOUNDARY=PASS · ORG_SELF_PROVISIONING_BY_CLIENT=BLOCKED
ANON_PROFILE_ACCESS=NONE
DRIFT_SURVIVAL=PASS (trigger sozinho recusa escalação, rebind e DELETE)
RPC_EXECUTE_GRANTS=RECONCILED
SECURITY_DEFINER_SURFACE_AUDITED=true (sem PUBLIC, search_path fixo, owner único)
SUBMIT_RPC_CONTRACT=(text,jsonb,text) com consentimento durável
ONE_ACTIVE_SECTOR_LINK=enforced pelo banco
K_MIN=5 · agregado suprimido abaixo de k · nenhuma leitura individual
```

**Controles positivos** (sem eles, "revogar tudo" passaria como sucesso):
`display_name` segue editável pelo dono · onboarding e aceitação de convite
seguem funcionando · `service_role` mantém a escrita administrativa · `anon`
segue invocando `submit_sector_response` · o painel FIB-T segue lendo o
agregado.

**Retomabilidade.** As 5 migrations idempotentes do pacote são reaplicadas no
replay e passam. `20260807120000` é one-shot por decisão de quem a escreveu:
reaplicar **recusa** com diagnóstico de drift, o que é o comportamento correto —
o que seria defeito é reaplicar em silêncio.

---

## 6. Preflight de produção

Read-only. Se qualquer resposta divergir, **pare**.

```sql
-- 1. Identidade do alvo (confirme visualmente o ref do projeto)
SELECT current_database(), version();

-- 2. Nada de resposta FIB-T em risco: a remoção só é sem perda com a coluna vazia
SELECT COUNT(*) AS respostas_total FROM public.wave_responses;                 -- esperado: 0
SELECT COUNT(*) AS com_vinculo FROM public.wave_responses
 WHERE invite_token IS NOT NULL;  -- 0; erro "column does not exist" = CONTRACT já aplicado

-- 3. Contrato atual (§4.1: define o volume do trabalho, não a decisão)
SELECT to_regprocedure('public.submit_sector_response(text,jsonb)')       AS legado_2_arg,
       to_regprocedure('public.submit_sector_response(text,jsonb,text)')  AS novo_3_arg,
       to_regclass('public.wave_cohorts')                                 AS cohorts,
       EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='wave_responses'
                  AND column_name='invite_token')                         AS invite_token_existe;

-- 4. A capacidade que estamos fechando (confirma que o alvo é o alvo)
SELECT has_column_privilege('authenticated','public.profiles','role','UPDATE')   AS pode_role,
       has_column_privilege('authenticated','public.profiles','org_id','UPDATE') AS pode_org,
       has_table_privilege ('authenticated','public.profiles','INSERT')          AS pode_insert,
       has_table_privilege ('authenticated','public.profiles','DELETE')          AS pode_delete;

-- 5. Conflitos com os invariantes que vão passar a valer
SELECT COUNT(*) FROM (SELECT 1 FROM public.sector_links WHERE status='active'
                       GROUP BY wave_id, sector_label HAVING COUNT(*)>1) d;    -- esperado: 0
SELECT COUNT(*) FROM public.sector_links s
  LEFT JOIN public.waves w ON w.id=s.wave_id AND w.org_id=s.org_id
 WHERE w.id IS NULL;                                                            -- esperado: 0
SELECT COUNT(*) FROM public.sector_links s
  LEFT JOIN public.wave_cohorts c
    ON c.wave_id=s.wave_id AND c.key=s.sector_label
 WHERE c.id IS NULL;                                                            -- esperado: 0

-- 6. Pré-requisitos dos caminhos legítimos (fechar sem eles = onboarding indisponível)
SELECT to_regprocedure('public.provision_organization_from_invite(text,uuid,text,text,text,text,text,text,text,text,text)') IS NOT NULL AS onboarding_ok,
       to_regprocedure('public.accept_member_invite(text,uuid)') IS NOT NULL                                               AS convite_ok;
```

Fora do SQL, antes de abrir a janela:

- backup recente visível no painel — anotar data/hora exata no registro da janela;
- `VITE_FIBT_PILOT_ENABLED=false` (nenhuma coleta real durante a janela);
- confirmar que **nenhum deploy de aplicação** acontece nesta janela: a ordem é
  **banco primeiro** (`DB_BEFORE_RC_APPLICATION_DEPLOY=true`).

---

## 7. Execução

Ordem obrigatória. Cada arquivo é **uma transação** — aplique um por vez, no SQL
Editor, e confira os `NOTICE` antes de seguir.

| # | Arquivo | sha256 (16) | O que faz |
| --- | --- | --- | --- |
| 1 | `20260806211000_response_invite_link_contract_forward_fix.sql` | `7f96dcb72c63e04e` | remove `invite_token` + FK (no-op se já removida) |
| 2 | `20260807120000_sector_response_consent_durability.sql` | `6e4cf5f34c403a9e` | colunas de consentimento + RPC de 3 argumentos |
| 3 | `20260811120000_fail_closed_sector_response_cohort_binding.sql` | `536e641aa4f7ccfd` | vínculo de coorte fail-closed |
| 4 | `20260812120000_one_active_sector_link_per_cohort.sql` | `a83923a5ecf22a17` | FKs compostas + um link ativo por coorte |
| 5 | `20260828120000_profile_authority_boundary_hardening.sql` | `dee30e87208a929f` | fronteira de autoridade de `profiles` (3 camadas) |
| 6 | `20260828121000_definer_surface_and_execute_grants.sql` | `4725c8c3e3ce8033` | reconciliação de EXECUTE + identidade em `accept_member_invite` |

```
G1_PACKAGE_FILES=6
G1_PACKAGE_SHA256=9013c499a32738840ff7c13322dc6e50da9b4dcc0969ad6f15fbcb59a84c74ec
MANIFEST_ROLLUP=79a4d1f733229de5b092677676a889993691d5a2ffe110e937ee54da8acb8a99  (54 migrations)
```

**NÃO aplicar** `20260730160000` (exclusiva de staging) nem `20260806210000`
(comprovadamente não executável, substituída pelo item 1).

**Downtime esperado: zero. Risco de lock: baixo**, e vale saber por quê:

- item 1 faz `DROP COLUMN` — `ACCESS EXCLUSIVE` em `wave_responses`, mas é
  metadado apenas (não reescreve a tabela) e a tabela tem 0 linha;
- item 4 cria índice único **sem** `CONCURRENTLY`, dentro de transação — em
  `sector_links` com 0 linha é instantâneo; as FKs entram `NOT VALID`,
  justamente para não varrer a tabela;
- itens 5 e 6 são `GRANT`/`REVOKE`, policy, trigger e `CREATE OR REPLACE
  FUNCTION`: metadado, sem varredura de dados.

O que **não** é desprezível: `GRANT`/`REVOKE` e `CREATE OR REPLACE FUNCTION`
pegam lock em catálogo e podem esperar por transação longa em curso. Aplique
fora de pico e evite executar durante outra operação administrativa.

---

## 8. Postflight

Rodar inteiro. Qualquer `false` inesperado → §9.

```sql
-- Segurança: a capacidade fechada (todos os quatro devem ser FALSE)
SELECT has_column_privilege('authenticated','public.profiles','role','UPDATE')   AS pode_role,
       has_column_privilege('authenticated','public.profiles','org_id','UPDATE') AS pode_org,
       has_table_privilege ('authenticated','public.profiles','INSERT')          AS pode_insert,
       has_table_privilege ('authenticated','public.profiles','DELETE')          AS pode_delete;

-- Segurança: o mínimo legítimo sobreviveu (todos TRUE)
SELECT has_table_privilege ('authenticated','public.profiles','SELECT')                AS le_proprio,
       has_column_privilege('authenticated','public.profiles','display_name','UPDATE') AS edita_nome,
       has_table_privilege ('service_role','public.profiles','UPDATE')                 AS admin_ok;

-- As três camadas
SELECT (SELECT COUNT(*) FROM pg_policies
         WHERE tablename='profiles' AND cmd='ALL')                    AS policies_for_all,      -- 0
       (SELECT COUNT(*) FROM pg_policies
         WHERE tablename='profiles' AND cmd IN ('INSERT','DELETE'))   AS policies_ins_del,      -- 0
       (SELECT COUNT(*) FROM pg_policies
         WHERE tablename='profiles')                                  AS policies_total,        -- 2
       (SELECT COUNT(*) FROM pg_trigger
         WHERE tgrelid='public.profiles'::regclass AND NOT tgisinternal
           AND tgname='profiles_authority_boundary')                   AS trigger_presente;     -- 1

-- EXECUTE reconciliado (as três primeiras FALSE, as três últimas TRUE)
SELECT has_function_privilege('anon','public.mark_invite_used(text)','EXECUTE')                       AS anon_mark,
       has_function_privilege('anon','public.accept_member_invite(text,uuid)','EXECUTE')              AS anon_accept,
       has_function_privilege('authenticated','public.mark_invite_used(text)','EXECUTE')              AS auth_mark,
       has_function_privilege('service_role','public.count_wave_responses(uuid)','EXECUTE')           AS svc_count,
       has_function_privilege('anon','public.submit_sector_response(text,jsonb,text)','EXECUTE')      AS anon_submit,
       has_function_privilege('service_role','public.accept_member_invite(text,uuid)','EXECUTE')      AS svc_accept;

-- Contrato FIB-T
SELECT to_regprocedure('public.submit_sector_response(text,jsonb,text)') IS NOT NULL AS rpc_3_arg,
       NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='wave_responses'
                      AND column_name='invite_token')                                AS sem_invite_token,
       EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='wave_responses'
                  AND column_name='consent_version')                                 AS consent_version,
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sector_links_wave_org_fk')  AS fk_wave_org,
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sector_links_wave_cohort_key_fk') AS fk_cohort,
       EXISTS (SELECT 1 FROM pg_indexes
                WHERE indexname='sector_links_one_active_per_wave_cohort')            AS um_link_ativo;

-- Privacidade não regrediu (ambos FALSE, e nenhuma policy de leitura)
SELECT has_table_privilege('anon','public.wave_responses','SELECT')          AS anon_le,
       has_table_privilege('authenticated','public.wave_responses','SELECT') AS auth_le,
       (SELECT COUNT(*) FROM pg_policies
         WHERE tablename='wave_responses' AND cmd IN ('SELECT','ALL'))       AS policies_leitura;  -- 0

-- Nenhuma superfície pública residual (ambos 0)
SELECT (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
               aclexplode(COALESCE(p.proacl, ACLDEFAULT('f',p.proowner))) a
         WHERE n.nspname='public' AND a.grantee=0
           AND NOT EXISTS (SELECT 1 FROM pg_depend d
                            WHERE d.objid=p.oid AND d.classid='pg_proc'::regclass
                              AND d.deptype='e'))                            AS execute_publico,
       (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.prosecdef
           AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig,'{}')) c
                            WHERE c ~ 'search_path\s*='))                    AS secdef_sem_search_path;
```

Depois do postflight, `VITE_FIBT_PILOT_ENABLED` continua `false`. O release da
aplicação é **Wave 6 / Gate G2**, não agora.

---

## 9. Rollback e forward-fix

Cada arquivo é uma transação: **falha durante a aplicação faz rollback sozinha**,
sem estado parcial. O plano abaixo é para "aplicou e queremos desfazer".

| Item | Reversível? | Como |
| --- | --- | --- |
| 5 (autoridade de `profiles`) | **sim, sem perda** | `DROP TRIGGER profiles_authority_boundary ON public.profiles;` + `DROP POLICY profiles_select_own/profiles_update_own;` + recriar `profile_own` + `GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;` — **reabre o achado CRITICAL**, só faça com incidente aberto |
| 6 (EXECUTE) | **sim, sem perda** | reconceder o `EXECUTE` específico que faltou; a versão anterior de `accept_member_invite` está em `20260714120000` |
| 2, 3 (RPC/consentimento) | **sim, sem perda** | `CREATE OR REPLACE` da versão anterior (`20260806205000` para a de 2 argumentos) |
| 4 (invariantes) | **sim, sem perda** | `DROP INDEX sector_links_one_active_per_wave_cohort;` + `ALTER TABLE ... DROP CONSTRAINT` das duas FKs |
| 1 (CONTRACT) | schema **sim**, dados **não** | recriar coluna e FK é trivial; os **valores** de `invite_token` não voltam |

**Forward-fix é a via preferida.** Rollback do item 5 reabre a autoescalação de
privilégio; qualquer problema encontrado depois dele deve ser corrigido com uma
migration nova, não desfazendo a fronteira.

> **Ressalva de recuperação, honesta:** existe backup recorrente visível
> (última evidência `2026-08-24T10:28:21Z`), mas **PITR não está provado** e
> **nenhum drill de restauração foi executado**. Com `wave_responses = 0` o
> item 1 não tem dado a perder, e é por isso que aplicar o CONTRACT **agora** é
> mais seguro que aplicar depois do início da coleta real. Antes do **G3**
> (coleta real), o drill de restauração deixa de ser P1 e passa a ser
> pré-requisito.

---

## 10. Dependências

`bun audit` antes: **35** (1 critical, 18 high, 11 moderate, 5 low).
Depois: **4** (2 high, 1 moderate, 1 low), **todas de build/desenvolvimento**.

Resolvidas por atualização dentro do semver declarado (`bun update`, sem
breaking change):

| Pacote | Sev. | Por que era P1 |
| --- | --- | --- |
| `seroval` | **critical** | type confusion em `fromJSON()` — o TanStack Start desserializa payload de server function com ele; alcançável em runtime |
| `@tanstack/start-server-core` | moderate | request de server function podia invocar uma função irmã referenciada pelo cliente — o app inteiro é feito de server functions |
| `undici`, `postcss`, `nanoid`, `esbuild` | high/mod | saíram junto com `vite` e `@tanstack/react-start` |

Pinos exatos em `overrides` (transitivas alcançáveis em runtime):

| Pacote | De → para | Motivo |
| --- | --- | --- |
| `fast-uri` | `3.0.x` → **`3.1.5`** | 3 advisories high de confusão de host; `ajv` é dependência de runtime |
| `dompurify` | `<=3.4.11` → **`3.4.14`** | XSS por subárvore destacada; `jspdf` roda no navegador |

**`brace-expansion` NÃO foi fixado, e a tentativa está registrada de propósito:**
o override é global e forçou 5.x sobre o `minimatch` que espera a API v2,
**quebrando o eslint**. A vulnerabilidade é DoS de ferramenta de
desenvolvimento, sobre YAML/globs que nós mesmos escrevemos. Trocar a
toolchain por isso seria péssimo negócio.

Residual, todo **P2/P3**, nenhum em runtime de produção:

| Pacote | Sev. | Classe | Por quê |
| --- | --- | --- | --- |
| `js-yaml` | 2 high, 1 mod | **P2** | via `eslint` e `xmlbuilder2` (build). Correção exige js-yaml 5.x major dentro da árvore do eslint |
| `@babel/core` | low | **P3** | leitura de arquivo via `sourceMappingURL` em build |

`DEPENDENCY_P0=0` · `DEPENDENCY_P1=0`

---

## 11. Gates locais

| Gate | Resultado |
| --- | --- |
`bun test src scripts` | **PASS** — 3700/3700, 10.484 asserções |
`bun run parity` | **PASS** |
`bun run manifest` | **PASS** — 54 migrations, rollup `79a4d1f73322…` |
`bunx tsc --noEmit` | **PASS** |
`bun run secret-scan` (com artefato) | **PASS** — 6 config · 629 fontes · 277 arquivos de artefato |
`bun run build:ci` | **PASS** |
`bun run db:replay` | **PASS** — 14/14 |
`bun run db:replay:preprod` | **PASS** — 16/16 |
`bun run lint` | **FALHA ambiental** — ver abaixo |

`lint` não é gate do CI (`.github/workflows/gate.yml` roda `build:ci` + `gate`).
Local no Windows ele reporta 158.484 problemas, dos quais **158.465 são `Delete
␍`**: `core.autocrlf=true`, sem `.gitattributes`, e prettier com `endOfLine`
padrão `lf`. Os 88 restantes (`no-explicit-any`, `prefer-const`,
`no-control-regex`) são **pré-existentes**, em arquivos que esta onda não
tocou. Os arquivos desta onda passam limpos com a regra de formatação desligada.

Remédio (**P3**, deliberadamente fora desta onda): adicionar `.gitattributes`
com `* text=auto eol=lf` ou `endOfLine: "auto"` no `.prettierrc`. Normalizar
fim de linha em 600+ arquivos dentro de uma onda de segurança enterraria o diff
que importa.

Uma observação de rodada única: `engine-domain-boundary.test.ts` estourou o
timeout de 5s na primeira execução da suíte completa e passou em **20 ms**
isolado; na segunda execução completa passou. É **flakiness por contenção** num
teste pré-existente que varre o sistema de arquivos, não regressão (**P3**).

---

## 12. Aberto

| Classe | Item |
| --- | --- |
| **P0** | nenhum |
| **P1** | nenhum |
| **P2** | drill de restauração / PITR provado — **pré-requisito do G3**, não do G1 |
| **P2** | `js-yaml` (dev/build) |
| **P2** | `supabase/config.toml` tem `project_id` do projeto **produtivo**: um `supabase db push` distraído apontaria para produção. Nenhum fluxo atual usa o CLI, mas é um pé de armadilha |
| **P2** | `Site URL` do Auth aponta para o domínio `lovable.app`; `vitalos.com.br` só é coberto por wildcard de redirect. Sem impacto no G1 (nenhuma mudança de Auth nesta onda) |
| **P2** | retirar as duas migrations duplicadas de 2026-07-03 (eco do Lovable) — exige recomputar manifesto e reemitir documento de prova |
| **P2** | `is_invite_valid` / `is_invite_valid_for_wave` sem call site vivo: mantidas em `anon` de propósito, porque revogar trocaria um risco pequeno (oráculo booleano sobre token aleatório) pela chance de quebrar o fluxo legado do respondente |
| **P3** | `.gitattributes` / `endOfLine` (§11) |
| **P3** | `@babel/core` (build) |
| **P3** | flakiness de `engine-domain-boundary.test.ts` sob contenção |

---

## 13. Sequência a partir daqui

```
WAVE 5.2-XL  →  pacote G1 pronto            ← estamos aqui
GATE G1 (humano)  →  migration no banco  →  postflight §8
WAVE 6-XL    →  go-live técnico da aplicação
GATE G2 (humano)  →  Lovable Publish  →  smoke  →  flag FIB-T ainda false
WAVE 6.1-XL  →  piloto controlado
GATE G3 (humano)  →  coleta real       ← drill de restauração é pré-requisito
```

`DB_BEFORE_RC_APPLICATION_DEPLOY=true` — o banco vai primeiro porque a
aplicação RC chama `submit_sector_response` com 3 argumentos e a produção só
tem 2. Publicar a aplicação antes do banco quebraria a submissão no primeiro
respondente.
