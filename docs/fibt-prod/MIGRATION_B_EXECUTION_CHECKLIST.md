# Checklist de execução — Migration B produtiva

> **Nada aqui foi executado.** Este é o roteiro operacional para quando (e se)
> a Migration B produtiva for promovida a arquivo executável e autorizada.
> Especificação normativa: `MIGRATION_B_PRODUCTION_SPEC.md`.
>
> Este checklist **não autoriza** aplicação. Autorização é ato humano separado,
> por escrito, específico para a execução.
>
> **Revisão 2** — incorpora as correções da revisão adversarial do Draft PR #35.

## Ordem das ondas — B é a quarta, não a primeira

```
PROD-1  preparação e recontagem
PROD-2  Migration A          ← parada obrigatória
PROD-3  privacy hardening H  ← parada obrigatória
PROD-4  Migration B produtiva ← ESTE checklist · parada obrigatória
PROD-5  regeneração de tipos
PROD-6  smoke sintético
```

Nenhuma onda encadeia automaticamente na seguinte.

## Pré-execução — todos obrigatórios

- [ ] **Autorização humana escrita**, específica para aplicar a Migration B
      produtiva em produção.
- [ ] `project_ref` de produção confirmado **no painel do Lovable**. Não se
      prova por SQL.
- [ ] **`LOVABLE_BATCH_TRANSACTION_CONFIRMED = true`** — comprovado em
      ambiente não produtivo (ver bloco próprio abaixo).
- [ ] Migration A aplicada e verificada (PROD-2 concluída).
- [ ] Privacy hardening H aplicado e verificado (PROD-3 concluída).
- [ ] Decisão humana sobre lock e timeouts registrada (SPEC §E — a
      recomendação é provisória).
- [ ] `origin/main` sem commits novos não revisados.
- [ ] CI (`gate`) verde no HEAD atual de `main`.
- [ ] Ruleset `20184083` ativo, bypass vazio.
- [ ] Nenhuma outra alteração de schema em andamento.
- [ ] Janela combinada, fora de horário de coleta.
- [ ] Hash do arquivo executável conferido antes de colar.

## Prova do contrato transacional — antes de qualquer execução produtiva

Executar **em ambiente não produtivo** e registrar o resultado:

- [ ] `SET LOCAL` permanece válido até `COMMIT`/`ROLLBACK`.
- [ ] `ACCESS EXCLUSIVE` permanece adquirido durante as rechecagens **e** o DDL.
- [ ] Um erro em qualquer precondition desfaz o bloco **inteiro**.
- [ ] Nenhuma alteração parcial permanece após o erro.

**Se não for comprovável:** não promover a migration, não confiar no lock,
desenhar outro mecanismo de aplicação controlada.

## Matriz de ACL — capturar ANTES

Consulta read-only (SPEC §H · rascunho §5). Salvar o resultado:

- [ ] Matriz capturada **imediatamente antes** da migration.

## Recontagem imediatamente antes — decide o caminho

Executar **na hora**, não confiar no inventário PROD-0. As cinco contagens:

```sql
SELECT
  (SELECT COUNT(*) FROM public.wave_responses)                                   AS total_responses,
  (SELECT COUNT(*) FROM public.wave_responses WHERE invite_token IS NOT NULL)    AS with_invite_token,
  (SELECT COUNT(*) FROM public.wave_responses r
     WHERE r.invite_token IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.wave_invites i WHERE i.token = r.invite_token))
                                                                                 AS valid_invite_links,
  (SELECT COUNT(*) FROM public.wave_responses r
     WHERE r.invite_token IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.wave_invites i WHERE i.token = r.invite_token))
                                                                                 AS orphan_invite_links;
```

| Resultado | Caminho |
| --- | --- |
| `total_responses = 0` **e** `with_invite_token = 0` | Segue sem snapshot. Os dois gates passam. |
| `total_responses > 0`, `with_invite_token = 0` | **ABORTA** por drift operacional. Refazer inventário, nova autorização. Não presumir que as linhas são seguras. |
| `with_invite_token > 0` | **ABORTA** por perda de vínculo legado. Ver bloco abaixo. |
| Invariantes cruzadas não fecham | **ABORTA.** Leitura inconsistente ou escrita concorrente. |

### Se `with_invite_token > 0`

1. **Parar.** Não aplicar nada.
2. Gerar snapshot privado de `wave_responses` (colunas `id`, `wave_id`,
   `invite_token`, `submitted_at`; apenas linhas com `invite_token IS NOT NULL`).
   **Não exportar `answers`.**
3. Salvar **fora de qualquer worktree do git**, em diretório privado.
4. Calcular e registrar **SHA-256** e contagem de linhas.
5. Confirmar que `git ls-files` não lista o arquivo.
6. **Revisar de forma controlada todas as linhas afetadas.**
7. Registrar caminho de custódia e responsável.
8. **Solicitar nova autorização humana**, apresentando contagem, SHA-256,
   custódia, e por que o estado divergiu do inventário PROD-0.

## Execução

1. Conferir o hash do arquivo executável.
2. Colar o arquivo **inteiro** no chat do Lovable — nunca um trecho.
   **Proibido colar apenas a seção destrutiva.**
3. Colar de volta a confirmação do Lovable.
4. **Se aparecer diff inesperado em alguma função → PARAR e investigar.**
5. **Se houver timeout de lock → ROLLBACK e NO-GO.** Investigar *quem*
   segurava o lock. **Não repetir automaticamente.**

## Critérios de abortar — qualquer um basta

- Hash do arquivo não confere.
- `total_responses ≠ 0` ou `with_invite_token ≠ 0` sem o bloco de snapshot.
- Invariantes cruzadas não fecham.
- Qualquer `RAISE EXCEPTION` (isto é o sistema funcionando — **investigar,
  nunca contornar**).
- Diff inesperado em função.
- `project_ref` conectado diferente do confirmado.
- Timeout de lock ou de statement.
- `LOVABLE_BATCH_TRANSACTION_CONFIRMED` não comprovado.
- Migration A ou H não confirmadas.

## Pós-check — dentro da transação

- [ ] `v_total_responses` observado e **registrado** no log.
- [ ] `invite_token` ausente.
- [ ] FK `wave_responses_invite_token_fkey` ausente.
- [ ] Nenhuma FK residual de `wave_responses` para `wave_invites`.
- [ ] `cohort_id` preservado.
- [ ] Funções encontradas por `to_regprocedure` com assinaturas exatas.
- [ ] Nenhuma referência **estática** residual à coluna removida.
- [ ] Contrato de 8 colunas da agregação intacto.
- [ ] `count_cohort_participation` presente.

## Pós-check — fora da transação

- [ ] Junção `wave_responses ⋈ wave_invites ON invite_token` **falha** por
      coluna inexistente.
- [ ] **Matriz de ACL capturada DEPOIS** e comparada com a de antes.
- [ ] Tipos TypeScript **ainda não regenerados** (isso é PROD-5).
- [ ] `VITE_FIBT_PILOT_ENABLED` ainda `false`.
- [ ] `operational_real_collection_status` ainda `blocked_until_release_gate`.
- [ ] Nenhum Publish acionado.
- [ ] Nenhuma aplicação parcial.
- [ ] Fluxo de link setorial continua funcionando — é caminho vivo em produção.

### Comparação de ACL — antes × depois

1. Capturar matriz **imediatamente antes** da migration.
2. Capturar **imediatamente depois**.
3. **Comparar as duas.**
4. Qualquer alteração não prevista → **NO-GO**.
5. Tratar a diferença na **trilha ACL**, nunca dentro da Migration B.
6. **Repetir a verificação antes da ativação da FIB-T** — para detectar
   alteração posterior feita pela plataforma.

Precedente que justifica: o scanner do Lovable já reconcedeu `EXECUTE` por
conta própria **duas vezes** neste projeto (`docs/RUNBOOK_MIGRACOES_LOVABLE.md`,
"Achado real #3" e o achado de 2026-07-14 em `accept_member_invite`). **ACL não
se presume — se confere.**

## Depois da B — o que NÃO acontece automaticamente

Aplicar a Migration B **não**: regenera tipos (PROD-5) · libera Publish
(PROD-7) · ativa a FIB-T (PROD-8) · altera
`operational_real_collection_status` · resolve a trilha ACL (Q19), que
permanece separada e **deve estar concluída antes da ativação da FIB-T**.

## Rollback — resumo operacional

| Momento | Ação |
| --- | --- |
| Precondition falhou | `ROLLBACK` automático, banco intocado. |
| Falha após remover constraint | `ROLLBACK` desfaz o DDL. |
| Falha após remover coluna | `ROLLBACK` desfaz o DDL. |
| Falha ao substituir `submit_sector_response` | `ROLLBACK` restaura corpo **e** ACL vigente. |
| Falha em pós-check | `ROLLBACK` — é para isso que o pós-check está dentro da transação. |
| Após COMMIT, 0 linhas afetadas | Recriar coluna + FK restaura o **schema**. Nenhum dado perdido. |
| Após COMMIT, com linhas afetadas, **com** snapshot | Recriar coluna, FK, restaurar valores — e **remover a coluna de novo** depois. |
| Após COMMIT, com linhas afetadas, **sem** snapshot | **Irreversível.** |

**Restaurar schema ≠ restaurar dados.**

**Critério para nunca executar rollback de dados:** se a restauração não for
estritamente necessária para corrigir falha funcional comprovada, não
restaurar. A perda dos tokens é o objetivo, não o dano.

## Registro pós-execução

Atualizar (não duplicar):

- `docs/fibt-isg/FIBT2_RUNBOOK_MIGRATION_PRODUCAO.md` — seção de execução
  datada, com as cinco contagens e as confirmações;
- `docs/fibt-isg/FIBT_DECISION_LEDGER.md` — decisão registrada.
