# Checklist de execução — Migration B produtiva

> **Nada aqui foi executado.** Roteiro operacional para quando (e se) a
> Migration B produtiva for promovida a arquivo executável e autorizada.
> Especificação normativa: `MIGRATION_B_PRODUCTION_SPEC.md`.
>
> Este checklist **não autoriza** aplicação.
>
> **Revisão 3** — incorpora as correções da segunda revisão adversarial.

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

## Prova do contrato transacional — em ambiente NÃO produtivo

- [ ] `SET LOCAL` permanece válido até `COMMIT`/`ROLLBACK`.
- [ ] `ACCESS EXCLUSIVE` permanece adquirido durante rechecagens **e** DDL.
- [ ] Erro em qualquer precondition desfaz o bloco **inteiro**.
- [ ] Nenhuma alteração parcial permanece.

**Execução statement-a-statement com autocommit = NO-GO.** Sem a prova: não
promover, não confiar no lock, redesenhar o mecanismo.

## Matriz de ACL — capturar ANTES

- [ ] Consulta completa (SPEC §H · rascunho §6) executada e resultado salvo.

Captura `proacl` integral e **ACL expandida com todos os grantees** — não
apenas quatro papéis. Também `proowner`, `prosecdef`, `proconfig` e
`search_path` efetivo.

## Timeouts — semântica antes de ajustar

- `statement_timeout` é aplicado **a cada statement**, não à duração total da
  transação.
- `lock_timeout` **deve ser menor** que `statement_timeout`.
- Espera > `lock_timeout` (5s) → **investigar** a sessão bloqueadora
  (`pg_locks`, `pg_stat_activity`).
- Timeout → **ROLLBACK e NO-GO**. **Sem retry automático.**
- `5s` e `2min` são **propostas humanas**, não parâmetros canônicos do projeto.

## Recontagem imediatamente antes

Executar **na hora**. As cinco contagens:

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
                                                                              AS orphan_invite_links;
```

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
contornar**) · dependência inesperada sobre a coluna · FK exata ausente ou com
nome divergente · diff inesperado em função · `project_ref` diferente do
confirmado · timeout de lock ou statement · `LOVABLE_BATCH_TRANSACTION_CONFIRMED`
não comprovado · A ou H não confirmadas.

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
- [ ] 18. Contrato de oito colunas intacto.
- [ ] 19. `response_count_label` presente.
- [ ] 20. `count_cohort_participation` preservada.
- [ ] 21. Nenhuma alteração parcial.

## Pós-check — externo, após o COMMIT

- [ ] Junção `wave_responses ⋈ wave_invites ON invite_token` **falha** por
      coluna inexistente.
- [ ] **Matriz de ACL capturada DEPOIS e comparada com a de antes.**
- [ ] Fluxo de link setorial funcionando (caminho vivo em produção).
- [ ] Tipos TypeScript **ainda não regenerados** (isso é PROD-5).
- [ ] `VITE_FIBT_PILOT_ENABLED` ainda `false`.
- [ ] `operational_real_collection_status` ainda `blocked_until_release_gate`.
- [ ] Nenhum Publish acionado.

## Verificações humanas

`project_ref` · `LOVABLE_BATCH_TRANSACTION_CONFIRMED` · captura de ACL antes e
depois · decisão sobre lock e timeouts · revisão do SQL final.

## Verificações do pipeline

`bun run gate` · manifesto (46 migrations) · parity · typecheck.

**Um checklist textual nunca é garantia executada pelo banco.** Os itens 1–21
acima rodam dentro da transação; os externos, humanos e de pipeline, não.

## Comparação de ACL — antes × depois

1. Capturar **imediatamente antes**. 2. Capturar **imediatamente depois**.
3. **Comparar.** 4. Alteração não prevista → **NO-GO**. 5. Tratar na **trilha
ACL**, nunca dentro da Migration B. 6. **Repetir antes da ativação da FIB-T**,
para detectar alteração posterior da plataforma.

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
| Falha de dependência não funcional | idem. |
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
