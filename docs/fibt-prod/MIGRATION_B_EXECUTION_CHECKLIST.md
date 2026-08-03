# Checklist de execução — Migration B produtiva

> **Nada aqui foi executado.** Roteiro operacional para quando (e se) a
> Migration B produtiva for promovida a arquivo executável e autorizada.
> Especificação normativa: `MIGRATION_B_PRODUCTION_SPEC.md`.
>
> Este checklist **não autoriza** aplicação.
>
> **Revisão 4** — incorpora as correções da revisão final adversarial:
> contrato de retorno estrutural · `pg_depend` por catálogo · triggers por
> evidência · inventário de policies · snapshot único · fingerprint de ACL ·
> limite declarado abaixo de *k*.
>
> **Revisão 5** — decisão humana PROD-0.5H:
> `EXPECTED_WAVE_RESPONSES_POLICY_COUNT = 0`, sem `DROP POLICY`.

## Ordem das ondas — B é a quarta

```
PROD-1 preparação · PROD-2 Migration A ⏸ · PROD-3 hardening H ⏸
PROD-4 Migration B ⏸ (ESTE checklist) · PROD-5 tipos · PROD-6 smoke
```

Nenhuma onda encadeia automaticamente na seguinte.

## Pré-execução

- [ ] **Autorização humana escrita**, específica para esta aplicação.
- [ ] `project_ref` de produção confirmado **no painel do Lovable**.
- [ ] **`LOVABLE_BATCH_TRANSACTION_CONFIRMED = true`** (bloco próprio abaixo).
- [ ] Migration A aplicada e verificada (PROD-2).
- [ ] Privacy hardening H aplicado e verificado (PROD-3).
- [ ] **Decisão humana sobre lock e timeouts registrada** (SPEC §E — a
      recomendação é provisória, não aprovada).
- [ ] `origin/main` sem commits novos não revisados · CI verde · ruleset ativo.
- [ ] Nenhuma outra alteração de schema em andamento.
- [ ] Janela fora de horário de coleta.
- [ ] Hash do arquivo executável conferido.

## Policies de `wave_responses` — baseline zero

`EXPECTED_WAVE_RESPONSES_POLICY_COUNT = 0` (decisão PROD-0.5H, inventário Q18:
RLS ativo, zero policies).

- [ ] **Antes da janela:** contar policies em `public.wave_responses`.
      Resultado esperado: **0**.
- [ ] **Dentro da transação:** a precondition conta e compara numericamente —
      `v_wave_responses_policy_count <> EXPECTED_WAVE_RESPONSES_POLICY_COUNT`
      → **aborta antes do primeiro DDL**. Não é teste de string nula.
- [ ] **Depois do `COMMIT`:** releitura externa (seção própria abaixo) —
      `POLICY_COUNT_AFTER_COMMIT = 0`.

```sql
SELECT pol.polname, pol.polcmd, pol.polpermissive
  FROM pg_policy pol
  JOIN pg_class pt ON pt.oid = pol.polrelid
  JOIN pg_namespace pn ON pn.oid = pt.relnamespace
 WHERE pn.nspname = 'public' AND pt.relname = 'wave_responses';
```

**Nunca remover uma policy inesperada automaticamente** — nem `response_submit`.
Este draft **não contém `DROP POLICY`**. Qualquer policy encontrada é **drift**:
registrar só metadados (nome · comando · permissiva/restritiva · papéis ·
schema · tabela, **sem expressão**), abortar, refazer o inventário, **rederivar
o draft** e obter nova autorização humana. Policy de mesmo nome **não** é
presumida equivalente à histórica.

## Prova em ambiente NÃO produtivo — obrigatória antes da promoção

### Contrato transacional

- [ ] `SET LOCAL` permanece válido até `COMMIT`/`ROLLBACK`.
- [ ] `ACCESS EXCLUSIVE` permanece adquirido durante rechecagens **e** DDL.
- [ ] Erro em qualquer precondition desfaz o bloco **inteiro**.
- [ ] Nenhuma alteração parcial permanece.

**Execução statement-a-statement com autocommit = NO-GO.** Sem a prova: não
promover, não confiar no lock, redesenhar o mecanismo.

### Consultas catalogais exercitadas contra objetos reais

- [ ] View dependente da coluna → **detectada** (via `pg_rewrite`).
- [ ] `CHECK` dependente → detectada. Default → detectado. Função → detectada.
- [ ] Índice sobre a coluna → detectado.
- [ ] **Qualquer** policy (inclusive `response_submit`) → inventário aborta.
- [ ] Trigger de `updated_at` → **não bloqueia**.
- [ ] Trigger `UPDATE OF invite_token` → bloqueia.
- [ ] FK legada exata → reconhecida como esperada; FK de mesmo nome com outra
      identidade → bloqueia.

As fixtures de SPEC §M provam a **lógica** em modelo TypeScript. Isto prova a
**execução em PostgreSQL**. Uma não substitui a outra.

### Comportamento abaixo de *k* — não é verificável estaticamente

A revisão estática comprova assinatura, contrato de retorno, `SECURITY
DEFINER`, `search_path` e gate interno. **Não comprova**, sem execução:

- [ ] `visible = false` abaixo de *k*;
- [ ] `response_count = NULL`;
- [ ] `response_count_label = '<5'`;
- [ ] supressão de `item_means`, `factor_scores` e `domain_means`;
- [ ] `suppression_reason` correto.

**Os cinco são item obrigatório desta prova.** Não executar agora.

### String literal do contrato

- [ ] `pg_get_function_result(aggregate_cohort_responses)` **observado** e
      conferido contra a tabela canônica de SPEC §D, e o valor registrado.

## Matriz de ACL — capturar ANTES

- [ ] Consulta de linhas normalizadas (SPEC §H · rascunho §6.1) executada.
- [ ] **`ACL_BEFORE_FINGERPRINT`** (rascunho §6.2) capturado e registrado.
- [ ] Representação canônica arquivada **fora do repositório** ou no registro
      operacional aprovado — sem credencial, sem dado de negócio.

Captura `proacl` integral e **ACL expandida com todos os grantees** — não
apenas quatro papéis. Também `oid`, `proowner`, `prosecdef`, `proconfig` e
`search_path` efetivo. `sha256` é função núcleo do PostgreSQL ≥ 11: **não
exige `pgcrypto`**. O fingerprint só é comparável **no mesmo banco**.

## Timeouts — semântica antes de ajustar

- `statement_timeout` é aplicado **a cada statement**, não à duração total da
  transação.
- `lock_timeout` **deve ser menor** que `statement_timeout`.
- Espera > `lock_timeout` (5s) → **investigar** a sessão bloqueadora
  (`pg_locks`, `pg_stat_activity`).
- Timeout → **ROLLBACK e NO-GO**. **Sem retry automático.**
- `5s` e `2min` são **propostas humanas**, não parâmetros canônicos do projeto.

## Recontagem imediatamente antes

Executar **na hora**, em **um único `SELECT`** — um só snapshot de statement.
`wave_responses` está sob `ACCESS EXCLUSIVE`; `wave_invites` **não é
bloqueada** (deliberado — ver locks). Statements separados sob `READ COMMITTED`
poderiam observar snapshots diferentes e quebrar uma invariante por artefato de
leitura. Qualquer divergência entre invariantes **continua abortando**.

```sql
SELECT
  (SELECT COUNT(*) FROM public.wave_responses)                                AS total_responses,
  (SELECT COUNT(*) FROM public.wave_responses WHERE invite_token IS NOT NULL) AS with_invite_token,
  (SELECT COUNT(*) FROM public.wave_responses r
     WHERE r.invite_token IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.wave_invites i WHERE i.token = r.invite_token))
                                                                              AS valid_invite_links,
  (SELECT COUNT(*) FROM public.wave_responses r
     WHERE r.invite_token IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.wave_invites i WHERE i.token = r.invite_token))
                                                                              AS orphan_invite_links,
  (SELECT COUNT(*) FROM public.wave_responses WHERE invite_token IS NOT NULL) AS snapshot_rows;
```

**Não adotar `REPEATABLE READ`** — desnecessário para isto.

| Resultado | Caminho |
| --- | --- |
| `total = 0` **e** `with_token = 0` | Segue sem snapshot. Os dois gates passam. |
| `total > 0`, `with_token = 0` | **ABORTA** por drift operacional. Não presumir que as linhas são seguras. |
| `with_token > 0` | **ABORTA** por perda de vínculo. Ver bloco abaixo. |
| Invariantes não fecham | **ABORTA.** Leitura inconsistente ou escrita concorrente. |

### Se `with_invite_token > 0`

1. **Parar.** 2. Snapshot privado (`id`, `wave_id`, `invite_token`,
`submitted_at`; só linhas com token; **não exportar `answers`**).
3. Fora de qualquer worktree do git. 4. SHA-256 + contagem registrados.
5. `git ls-files` não lista o arquivo. 6. **Revisar de forma controlada todas
as linhas afetadas.** 7. Registrar custódia e responsável. 8. **Nova
autorização humana.**

## Execução

1. Conferir o hash.
2. Colar o arquivo **inteiro**. **Proibido colar apenas a seção destrutiva.**
3. Colar de volta a confirmação do Lovable.
4. **Diff inesperado em função → PARAR e investigar.**
5. **Timeout de lock → ROLLBACK e NO-GO.** Investigar quem segurava o lock.
   **Não repetir automaticamente.**

## Critérios de abortar — qualquer um basta

Hash divergente · `total ≠ 0` ou `with_token ≠ 0` sem o bloco de snapshot ·
invariantes não fecham · qualquer `RAISE EXCEPTION` (**investigar, nunca
contornar**) · **qualquer policy em `wave_responses` (esperado: zero)** ·
dependência catalogal sobre a coluna · **`classid` de dependência não
reconhecido** · trigger com referência real a `invite_token` · FK exata ausente
ou com nome divergente · **contrato de retorno de `aggregate_cohort_responses`
divergente em nome, tipo ou ordem** · diff inesperado em função ·
`project_ref` diferente do confirmado · timeout de lock ou statement ·
`LOVABLE_BATCH_TRANSACTION_CONFIRMED` não comprovado · A ou H não confirmadas.

## Pós-check — dentro da transação (executado pelo banco)

- [ ] 1. `v_total_responses` observado e **registrado** no log.
- [ ] 2. `invite_token` ausente.
- [ ] 3. FK exata `wave_responses_invite_token_fkey` ausente.
- [ ] 4. Nenhuma FK residual `wave_responses` → `wave_invites`.
- [ ] 5. Nenhuma dependência catalogada residual.
- [ ] 6. Nenhum corpo de função com referência **real** à coluna removida.
- [ ] 7. `submit_wave_response(uuid,text,jsonb)` na assinatura exata.
- [ ] 8. `submit_sector_response(text,jsonb)` na assinatura exata.
- [ ] 9. `wave_responses.cohort_id` preservado.
- [ ] 10. `wave_responses.instrument` preservado.
- [ ] 11. `wave_responses.instrument_version` preservado.
- [ ] 12. `wave_invites.cohort_id` preservado.
- [ ] 13. `wave_invites.expires_at` preservado.
- [ ] 14. `waves.instrument_version` preservado.
- [ ] 15. `wave_cohorts` preservada.
- [ ] 16. `waves_id_org_uk` preservada.
- [ ] 17. `aggregate_cohort_responses(uuid,uuid)` preservada.
- [ ] 18. Contrato de oito colunas intacto — **nome, tipo e ordem**, via
      `pg_proc` (`proallargtypes`/`proargmodes`/`proargnames`).
- [ ] 19. `pg_get_function_result` idêntico ao contrato canônico.
- [ ] 20. `count_cohort_participation` preservada e retornando `integer`.
- [ ] 21. Nenhuma alteração parcial.

Os itens 18–20 usam o **mesmo predicado** da precondition. Um pós-check mais
fraco que a precondition não provaria preservação.

## Pós-check — externo, após o COMMIT

- [ ] Junção `wave_responses ⋈ wave_invites ON invite_token` **falha** por
      coluna inexistente.
- [ ] **`POLICY_COUNT_AFTER_COMMIT = 0`** — releitura do inventário (abaixo).
- [ ] **`ACL_AFTER_FINGERPRINT` capturado e comparado com `ACL_BEFORE`.**
- [ ] Fluxo de link setorial funcionando (caminho vivo em produção).
- [ ] Tipos TypeScript **ainda não regenerados** (isso é PROD-5).
- [ ] `VITE_FIBT_PILOT_ENABLED` ainda `false`.
- [ ] `operational_real_collection_status` ainda `blocked_until_release_gate`.
- [ ] Nenhum Publish acionado.

## Releitura do inventário de policies — externa, depois do `COMMIT`

Consulta **somente leitura**. Reconfirma `schema = public` ·
`tabela = wave_responses` · `policy_count = 0`.

```sql
SELECT pn.nspname AS schema_name,
       pt.relname AS table_name,
       COUNT(pol.oid)::INTEGER AS policy_count
  FROM pg_class pt
  JOIN pg_namespace pn ON pn.oid = pt.relnamespace
  LEFT JOIN pg_policy pol ON pol.polrelid = pt.oid
 WHERE pn.nspname = 'public' AND pt.relname = 'wave_responses'
 GROUP BY pn.nspname, pt.relname;
```

Havendo drift, listar **apenas** schema · tabela · nome · comando ·
permissiva/restritiva · papéis:

```sql
SELECT pn.nspname AS schema_name,
       pt.relname AS table_name,
       pol.polname AS policy_name,
       pol.polcmd AS command,
       pol.polpermissive AS permissive,
       (SELECT string_agg(CASE WHEN r = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END, '+' ORDER BY r)
          FROM unnest(pol.polroles) r) AS roles
  FROM pg_policy pol
  JOIN pg_class pt ON pt.oid = pol.polrelid
  JOIN pg_namespace pn ON pn.oid = pt.relnamespace
 WHERE pn.nspname = 'public' AND pt.relname = 'wave_responses'
 ORDER BY pol.polname;
```

**Não consultar nem exibir** `polqual`, `polwithcheck`, expressão alguma ou
dado de negócio.

- [ ] `POLICY_COUNT_AFTER_COMMIT = 0` → segue.
- [ ] `≠ 0` → **NO-GO operacional**: não remover policy · não corrigir
      automaticamente · registrar o drift · encaminhar para inventário e
      autorização separados.

**O que esta releitura é e não é** — a distinção importa para não criar
falsa sensação de reversibilidade:

- é **externa**, acontece **depois** do `COMMIT`;
- **não participa do rollback transacional**;
- **detecta** alteração inesperada, mas **não desfaz** a Migration B;
- **não pertence à trilha de ACL de funções** — é governança de RLS/policies,
  trilha distinta.

**Por que existe:** controle geral de drift da plataforma. O precedente
conhecido neste projeto é de alteração de privilégios `EXECUTE`, **não** de
policy — a justificativa não é um episódio de policy que nunca ocorreu, e sim
a ausência de garantia de que o estado permaneça o observado.

## Verificações humanas

`project_ref` · `LOVABLE_BATCH_TRANSACTION_CONFIRMED` · captura de ACL antes e
depois · releitura do inventário de policies depois do `COMMIT` · decisão sobre
lock e timeouts · revisão do SQL final.

## Verificações do pipeline

`bun run gate` · manifesto (46 migrations) · parity · typecheck.

**Um checklist textual nunca é garantia executada pelo banco.** Os itens 1–21
acima rodam dentro da transação; os externos, humanos e de pipeline, não.

## Comparação de ACL — antes × depois

1. Capturar `ACL_BEFORE_FINGERPRINT` **imediatamente antes**.
2. Capturar `ACL_AFTER_FINGERPRINT` **imediatamente depois**.
3. **Comparar os dois fingerprints.** Iguais → seguir. Diferentes → diferenciar
   a **representação canônica** linha a linha para achar o que mudou.
4. Alteração não prevista → **NO-GO**.
5. Tratar na **trilha ACL**, nunca dentro da Migration B.
6. **Repetir antes da ativação da FIB-T**, para detectar alteração posterior da
   plataforma.

Deve detectar: papel adicionado/removido · privilégio adicionado/removido ·
`PUBLIC` · `sandbox_exec` · `SECURITY DEFINER` · owner · `search_path` ·
qualquer configuração da função.

Precedente: o scanner do Lovable já reconcedeu `EXECUTE` por conta própria
**duas vezes** neste projeto. **ACL não se presume — se confere.**

## Depois da B — o que NÃO acontece automaticamente

Não regenera tipos (PROD-5) · não libera Publish (PROD-7) · não ativa a FIB-T
(PROD-8) · não altera `operational_real_collection_status` · não resolve a
trilha ACL, que **deve estar concluída antes da ativação da FIB-T**.

## Rollback

| Momento | Ação |
| --- | --- |
| Falha antes do primeiro DDL | `ROLLBACK` automático, banco intocado. |
| Falha da precondition da FK exata | idem — nenhum DDL executado. |
| Falha do inventário de policies (`count ≠ 0`) | idem — este draft não remove policy alguma. |
| Falha de dependência catalogal | idem. |
| Falha do contrato de retorno de H | idem. |
| Falha após remover constraint ou coluna | `ROLLBACK` desfaz o DDL. |
| Falha após `CREATE OR REPLACE` | `ROLLBACK` restaura corpo **e** ACL vigente. |
| Falha do pós-check de referência residual | `ROLLBACK`. |
| Falha de qualquer outro pós-check | `ROLLBACK`. |
| Falha da comparação de ACL (pós-COMMIT) | **NO-GO operacional** — schema já aplicado; tratar na trilha ACL. |
| Após COMMIT, 0 linhas afetadas | Recriar coluna + FK restaura o **schema**. Nenhum dado perdido. |
| Após COMMIT, com linhas, **com** snapshot | Recriar, restaurar — e **remover a coluna de novo** depois. |
| Após COMMIT, com linhas, **sem** snapshot | **Irreversível.** |

**Restaurar schema ≠ restaurar dados.**

**Critério para nunca executar rollback de dados:** se a restauração não for
estritamente necessária para corrigir falha funcional comprovada, não
restaurar. A perda dos tokens é o objetivo, não o dano.

## Registro pós-execução

Atualizar (não duplicar): `docs/fibt-isg/FIBT2_RUNBOOK_MIGRATION_PRODUCAO.md`
(seção de execução datada, com as cinco contagens e as confirmações) ·
`docs/fibt-isg/FIBT_DECISION_LEDGER.md` (decisão registrada).
