# Checklist de execução — Migration B produtiva

> **Nada aqui foi executado.** Este é o roteiro operacional para quando (e se)
> a Migration B produtiva for promovida a arquivo executável e autorizada.
> Especificação normativa: `MIGRATION_B_PRODUCTION_SPEC.md`.
>
> Este checklist **não autoriza** aplicação. Autorização é ato humano separado,
> por escrito, específico para a execução.

## Ordem das ondas — B é a quarta, não a primeira

```
PROD-1  preparação e recontagem
PROD-2  Migration A          ← parada obrigatória
PROD-3  privacy hardening H  ← parada obrigatória
PROD-4  Migration B produtiva ← ESTE checklist · parada obrigatória
PROD-5  regeneração de tipos
PROD-6  smoke sintético
```

Nenhuma onda encadeia automaticamente na seguinte. Cada uma exige autorização
própria.

## Pré-execução — todos obrigatórios

- [ ] **Autorização humana escrita**, específica para aplicar a Migration B
      produtiva em produção. A autorização de preparar o rascunho **não** cobre
      a execução.
- [ ] `project_ref` de produção confirmado **no painel do Lovable**, comparado
      pelo ref mascarado. Não se prova por SQL.
- [ ] Migration A aplicada e verificada (PROD-2 concluída).
- [ ] Privacy hardening H aplicado e verificado (PROD-3 concluída).
- [ ] `origin/main` sem commits novos não revisados desde a última verificação.
- [ ] CI (`gate`) verde no HEAD atual de `main`.
- [ ] Ruleset `20184083` ativo, bypass vazio.
- [ ] Nenhuma outra alteração de schema em andamento (outro operador, Lovable).
- [ ] Janela combinada, fora de horário de coleta.
- [ ] Hash do arquivo executável conferido antes de colar.

## Recontagem imediatamente antes — decide o caminho

Executar **na hora**, não confiar no inventário PROD-0:

```sql
SELECT COUNT(*) AS afetadas
  FROM public.wave_responses
 WHERE invite_token IS NOT NULL;
```

| Resultado | Caminho |
| --- | --- |
| **`0`** | Segue sem snapshot. Precondition `AFETADAS_ESPERADAS = 0` cobre. |
| **`> 0`** | **ABORTA.** Ver bloco abaixo. |

### Se a recontagem for maior que zero

Não improvisar. A sequência obrigatória:

1. **Parar.** Não aplicar nada.
2. Gerar snapshot privado de `wave_responses` (colunas `id`, `wave_id`,
   `invite_token`, `submitted_at`; apenas linhas com `invite_token IS NOT NULL`).
   **Não exportar `answers`** — não é necessário para restaurar o vínculo e
   ampliaria a exposição sem ganho.
3. Salvar **fora de qualquer worktree do git**, em diretório privado.
4. Calcular e registrar o **SHA-256** e a contagem de linhas.
5. Confirmar que `git ls-files` não lista o arquivo e que o caminho não está
   sob o repositório.
6. Registrar o caminho de custódia e o responsável.
7. **Solicitar nova autorização humana**, apresentando: contagem encontrada,
   SHA-256, custódia, e a explicação de por que o estado divergiu do inventário
   PROD-0.
8. Só então reavaliar as preconditions — que passam a exigir a invariante
   apropriada ao novo estado, não mais `= 0`.

## Execução

1. Conferir o hash do arquivo executável.
2. Colar o arquivo **inteiro** no chat do Lovable (não há `psql` direto — ver
   `docs/RUNBOOK_MIGRACOES_LOVABLE.md`).
3. Colar de volta a confirmação do Lovable.
4. **Se aparecer diff inesperado em alguma função → PARAR e investigar.** Pode
   haver lógica de produção não versionada.
5. Rodar as queries de verificação de privilégio no banco vivo — lição já paga
   duas vezes neste projeto: `GRANT`/`REVOKE` que "rodou sem erro" pode ser
   no-op silencioso; o efeito só se prova com `has_function_privilege` /
   `has_table_privilege`.

## Critérios de abortar — qualquer um basta

- Hash do arquivo não confere.
- Recontagem `> 0` sem o bloco de snapshot cumprido integralmente.
- Qualquer `RAISE EXCEPTION` das preconditions (isto é o sistema funcionando —
  **investigar, nunca contornar**).
- Diff inesperado em função.
- `project_ref` conectado diferente do confirmado.
- Escrita concorrente detectada durante a janela.
- Lock não adquirido / timeout de lock.
- Migration A ou H não confirmadas.

Abortar **entre** migrations é seguro — cada uma é uma transação. Não existe
"meio de uma migration": ou a transação inteira passou, ou nada dela passou.

## Pós-check — dentro da transação

- [ ] `wave_responses.invite_token` ausente.
- [ ] FK `wave_responses_invite_token_fkey` ausente.
- [ ] Nenhuma FK de `wave_responses` alcança `wave_invites`.
- [ ] Nenhuma função referencia `wave_responses` + `invite_token` juntos
      (exceto as reescritas na própria transação).
- [ ] `cohort_id` preservado.
- [ ] `aggregate_cohort_responses` com o contrato de 8 colunas intacto.
- [ ] `count_cohort_participation` presente.
- [ ] Assinaturas corretas nas duas funções de submissão.

## Pós-check — fora da transação

- [ ] Junção `wave_responses ⋈ wave_invites ON invite_token` **falha** por
      coluna inexistente — a ligação não existe mais no schema.
- [ ] Tipos TypeScript **ainda não regenerados** (isso é PROD-5).
- [ ] `VITE_FIBT_PILOT_ENABLED` ainda `false`.
- [ ] `operational_real_collection_status` ainda `blocked_until_release_gate`.
- [ ] Nenhum Publish acionado.
- [ ] ACLs inalteradas por esta migration (trilha ACL é separada).
- [ ] Fluxo de link setorial (`submit_sector_response`) continua funcionando —
      é caminho vivo em produção.

## Depois da B — o que NÃO acontece automaticamente

Aplicar a Migration B **não**:

- regenera tipos (é PROD-5, decisão e PR próprios);
- libera Publish (é PROD-7, autorização separada);
- ativa a FIB-T (é PROD-8, exige gate jurídico, metodológico e operacional);
- altera `operational_real_collection_status`;
- resolve a trilha ACL (Q19) — que permanece separada e deve estar concluída
  **antes da ativação da FIB-T**.

## Rollback — resumo operacional

| Momento | Ação |
| --- | --- |
| Precondition falhou | Nada a fazer — `ROLLBACK` automático, banco intocado. |
| Erro após DROP, antes do COMMIT | `ROLLBACK` desfaz o DDL (Postgres é transacional para DDL). |
| Após COMMIT, 0 linhas afetadas | Recriar coluna + FK restaura o schema. Não há dado perdido. |
| Após COMMIT, com linhas afetadas | Exige snapshot. Recriar coluna, FK, restaurar valores — e **remover a coluna de novo** depois. |
| Após COMMIT, com linhas afetadas e sem snapshot | **Irreversível.** |

**Critério para nunca executar rollback de dados:** se a restauração não for
estritamente necessária para corrigir falha funcional comprovada, não
restaurar. A perda dos tokens é o objetivo, não o dano.

## Registro pós-execução

Atualizar (não duplicar):

- `docs/fibt-isg/FIBT2_RUNBOOK_MIGRATION_PRODUCAO.md` — seção de execução
  datada, com contagens e confirmações;
- `docs/fibt-isg/FIBT_DECISION_LEDGER.md` — decisão registrada.
