# Decisão pendente · linhagem do replay para 10 migrations · 19/11/2026

Estado: **proposta de classificação para revisão de custódia**. Nenhuma migration histórica foi alterada; o harness `scripts/db-replay-proof.ts` não foi alterado.

## Sintoma

`bun run db:replay` (container sem porta, `tmpfs`) para em `reconciliação de arquivos`: 10 arquivos sem pacote. A regra existe para forçar uma decisão explícita de pacote; a lacuna começa em `20261113195527`, antes do Q1/Q2 desta onda.

## Constraint duplicada (rastreada)

`relation "wave_capsules_wave_id_unique" already exists` não vem destas 10. Origem: `20260703160000_wave_lifecycle_and_capsule_upsert.sql` cria a constraint; `20260703203653_aef6adcc-…sql` (eco gerado pelo Lovable) recria sem guarda. Já tratada por compensação versionada `supabase/local/lineage/20260703203653_…sql` (`DROP CONSTRAINT IF EXISTS`, estado final idêntico), aplicada pelo harness e por `institutional-local.ts`. A falha da prova pontual anterior foi do agente, que não aplicou a compensação. Nenhuma mudança necessária.

## Classificação proposta (ordem lexicográfica = ordem de aplicação)

| # | Migration | Finalidade | Depende de | Substitui função existente? |
| --- | --- | --- | --- | --- |
| 1 | `20261113195527_institutional_first_admin` | Convite de primeiro RH; trigger de integridade | `auth.users`, `organizations`, `profiles` | não |
| 2 | `20261113202253_…_private_identity` | Correção aditiva: identidade lida só no trigger privado | #1 | redefine o trigger de #1 |
| 3 | `20261115135955_enterprise_module_entitlements` | Habilitação Q1/Q2 por empresa; guard de operação por módulo | `action_items`, `efficacy_*`, ondas | **sim: `public.aggregate_cohort_responses`** |
| 4 | `20261115142320_enterprise_module_pack_compatibility` | Entitlement só governa o núcleo enterprise | #3 | **sim: `aggregate_cohort_responses` de novo** |
| 5 | `20261118163000_q1_preparation` | Eventos de preparação Q1 (pré-coleta) | #3 (`org_module_entitlements`) | não |
| 6 | `20261118170000_partner_interest` | Fila de interesse da rede (feature só em DEV) | — | não |
| 7 | `20261118173000_q1_preparation_delegates` | Delegados da preparação Q1 | #5 | não |
| 8 | `20261119090000_q1_manage_preparation_delegates` | Gestão de delegados pela plataforma | #7 | não |
| 9 | `20261119103000_q1_technical_review` | Revisão técnica SST do Q1 | #5, #7 | não |
| 10 | `20261119120000_q2_ledger_actor_scope_and_title_visibility` | Ator verificado no ledger Q2; `title_visible_at` | ledger (`20260705100000`), PI-13 | **sim: 3 RPCs do ledger** |

Proposta: um pacote `PACOTE_INSTITUCIONAL_Q1_Q2_LOCAL` com os 10 arquivos, em ordem, depois do PI-13, **somente** no modo `clean` (como R6/C8/PI-13, "não aplicados remotamente"), mais as suítes `10_q2_ledger_actor_scope.sql` e as provas Q1 do Codex quando existirem.

## Ambiguidades de custódia (decisão humana)

1. #3, #4 e #10 **redefinem funções presentes em produção** (`aggregate_cohort_responses`, `record_action_event`, `record_evidence`, `set_action_item_accountability`). Entram em `preprod`/`upgrade`? Exigem prova de atualização com dados (como a do PI-13)?
2. #6 cria tabela para uma feature exibida só em `DEV`: pertence à linhagem de produção ou a um pacote "local apenas"?
3. #1/#2 dependem de `auth.users`: o shim do replay cobre o necessário? (não verificado nesta onda).
4. Quem decide: o responsável pela custódia de migrations (operador). O agente não classificou no harness.

## Evidência complementar desta onda

Os 10 arquivos (com os demais 60 executáveis) foram aplicados em ordem na pilha descartável `vitalos-q1q2-integ` (Compose loopback, `scripts/integ-local/`) com as compensações de lineage: **70 aplicadas, 0 falhas**. Isso prova aplicabilidade em banco limpo com a imagem Supabase; **não** substitui as provas de `preprod`/`upgrade` do harness.
