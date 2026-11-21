# Q2 · B2 · migration do ledger · 19/11/2026

Claude Code · Q2_FECHAMENTO · bloco B2 · branch `feat/claude-q2-perfis` · base `b771e08`. Estado: **aceito no escopo demonstrado — aplicada só no stack institucional local**. Execução em qualquer outro banco depende de autorização própria do founder.

## Auditoria antes da mudança (skill `supabase-rls-security-definer-auditor`)

| Achado | Severidade |
| --- | --- |
| `record_action_event` e `record_evidence` gravavam ator e papel como recebidos, sem conferir org nem papel real | P2 (defesa em profundidade; o servidor já conferia) |
| `set_action_item_accountability` aceitava responsável de qualquer org | P2 |
| Visibilidade de título dependia de instante fixo no código (`TITLE_VISIBLE_SINCE`) | P2 |

## Mudança — `supabase/migrations/20261119120000_q2_ledger_actor_scope_and_title_visibility.sql`

- `action_items.title_visible_at TIMESTAMPTZ`, NULL nas linhas existentes e `DEFAULT NOW()` nas novas (qualquer caminho de inserção).
- `public.ledger_actor_denial(item, ator, papel, operação)`: `SECURITY INVOKER`, `search_path` fixo, sem EXECUTE para nenhum papel. Ator tem de ser da org do item; papel declarado = papel real em `profiles`; administradores (`RH_ADMIN`, `DGP_RH`, `DIRETOR`, `SESMT_SAUDE`, `SINDICO`) passam; `LIDER_EQUIPE` só em `status_change`/evidência de execução, na própria ação, com plano ativo (ação alheia → `item_not_found`); demais papéis → `authority_reserved_to_admin`.
- `record_action_event` e `record_evidence` chamam a regra antes de escrever; `set_action_item_accountability` exige responsável administrador ou `LIDER_EQUIPE` da mesma org (`owner_not_eligible`). Assinaturas inalteradas; EXECUTE continua só `service_role`, conferido no rodapé com `has_function_privilege`.
- Aplicação: `member-plan-feedback.server.ts` passa a ler `title_visible_at` (sem a coluna → nenhum título); `TITLE_VISIBLE_SINCE` removido. `schema-manifest.ts` e `migrations.manifest.json` atualizados.

## Verificação

- `supabase/tests/10_q2_ledger_actor_scope.sql` no stack local: **16/16** (responsável elegível; ator de outra org, papel divergente e colaborador recusados; admin aceito; liderança aceita na própria ação e recusada em aprendizagem, nota, ação alheia e plano não ativo; `title_visible_at` preenchido; superfície de EXECUTE). Transação com ROLLBACK, sem resíduo; qualquer FAIL aborta a suíte. Registrada no inventário de `profile-authority-boundary.test.ts`.
- `bun run parity` e `bun run gate`: 4.509 aprovados, paridade, TypeScript, secret-scan.
- Regressão pela aplicação (app do worktree em 8092): RH Delta mudou o estado da ação; `action_log` com `status_change` e `actor_role_label = RH_ADMIN`.

Limite da prova SQL: os gatilhos de origem/módulo (`institutional.guard_module_operation`) ficam desligados na transação da suíte (`session_replication_role = replica`) porque as fixtures não têm origem Q2; a suíte isola a lógica do corpo das RPCs. A integração com esses gatilhos foi exercida pela regressão via aplicação. A prova de replay (`scripts/db-replay-proof.ts`) não foi executada nesta sessão.

Efeito visível: ações criadas antes da migration (inclusive a da Delta, que mostrava título pelo corte antigo) passam a não exibir título aos membros — padrão conservador da D4.

O app do checkout principal (8091) usa o mesmo stack e passa a enfrentar estas checagens; os caminhos de RH existentes enviam o papel da sessão, igual ao de `profiles`.

## Rollback (só se autorizado; restaura o comportamento de `20260705100000`)

```sql
BEGIN;
-- 1. Recriar as três RPCs com o corpo de supabase/migrations/20260705100000_action_plan_ledger.sql
--    (linhas 242-292, 334-388, 392-424), mantendo REVOKE/GRANT das linhas 429-438.
-- 2. Remover a regra auxiliar:
DROP FUNCTION IF EXISTS public.ledger_actor_denial(UUID, UUID, TEXT, TEXT);
-- 3. Coluna: manter é inofensivo; para remover, antes reverter member-plan-feedback.server.ts
--    e a entrada do schema-manifest:
-- ALTER TABLE public.action_items DROP COLUMN IF EXISTS title_visible_at;
COMMIT;
```

## Próxima ação única

B3 (Codex, `INTEGRAÇÃO_LOCAL`): integrar `feat/claude-q2-perfis` com o delta Q1, revisando primeiro as superfícies listadas no superprompt de fechamento e incluindo esta migration na lista de revisão de segurança.
