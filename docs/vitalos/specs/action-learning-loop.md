# Spec — Ciclo ação e aprendizagem

Fluxo: **resultado publicado → prioridade → ação → evidência de execução → aprendizagem**.
Eficácia fica fora (gate C8).

## Reutilização

| Etapa | Ativo existente |
|---|---|
| Ação | `action_items` + RPC `create_action_plan` / `set_action_item_accountability` / `activate_action_plan` |
| Estados | `planejada → em_execucao → concluida → em_vigilancia`; `interrompida` (`action-log-engine.ts`, espelhado na RPC) |
| Evidência | `evidence_records` + RPC `record_evidence` |
| Histórico | `action_log` INSERT-only, status por fold |

Os estados sugeridos no pedido (RASCUNHO…ARQUIVADA) **não** foram adotados:
o ledger já tem máquina de estados validada em SQL e TS. Mapeamento:
RASCUNHO/PRIORIZADA ≈ plano `draft`; PLANEJADA = `planejada`; EM_EXECUCAO =
`em_execucao`; EM_VERIFICACAO ≈ `em_vigilancia`; CONCLUIDA = `concluida`;
ARQUIVADA ≈ plano `closed` (sem RPC hoje).

## Implementado (R6, recorte mínimo)

Servidor: `src/lib/ivo/fibt-action-loop.server.ts`; server functions POST
`.strict()` em `src/lib/api/ivo-action-loop.functions.ts`; tela
`/ivo-integral/acoes`.

| Passo | Como |
|---|---|
| Prioridade | Gestor escolhe setor **publicado** × fator FIB-T. O servidor relê o snapshot protegido da organização da sessão e recusa setor protegido/pendente (`source_not_published`). |
| Ação | `create_action_plan` com `source_*` por referência; ciclo canônico `YYYY-Tn` da onda; ciclo equivalente já planejado é detectado pelo conversor. |
| Responsável, prazo, estado | `set_action_item_accountability` (plano em rascunho), `activate_action_plan` (§13 completo), `record_action_event` (transição checada contra o estado real). |
| Evidência de execução | `record_evidence` com `texto`/`checklist`/`metrica` → `evidence_scope = execucao`. |
| Aprendizagem | `record_evidence` com `aprendizagem` → `evidence_scope = aprendizagem`. |
| Eficácia | Não registrável; exibida como "não avaliada" com o motivo. |
| Dimensão IVO | Derivada na leitura do registro de mapeamentos; vazio ⇒ "mapeamento pendente". |

## Migration `20261002120000_fibt_action_provenance.sql` (local, não aplicada)

- Colunas `source_lens_id`, `source_wave_id`, `source_cohort_id`, `source_factor_id`, `source_instrument_version`, `source_published_at` (todas nulas ou todas presentes).
- FK composta `(source_wave_id, org_id) → waves(id, org_id)` e `(source_cohort_id, source_wave_id) → wave_cohorts(id, wave_id)`: origem de outra organização é impossível até para `service_role`.
- `CHECK` lift IVO = 0 em ação de origem FIB-T (C6).
- `evidence_kind` aceita `aprendizagem`; `evidence_scope` gerada.
- `create_action_plan` substituída na mesma assinatura (M6A intacta), só onde existe; valida proveniência e leitura publicada antes de qualquer escrita; deriva versão e `published_at` no banco.
- Idempotente. Classificada no replay como `PACOTE_IVO_R6`.

## Critérios

- A1 — Ação só nasce de leitura `published` da própria organização (servidor + RPC).
- A2 — Prioridade é ato humano registrado (`created_by`, papel da sessão no log).
- A3 — Isolamento: RLS por `profiles.org_id`, escrita só via RPC, posse conferida no servidor antes de cada RPC.
- A4 — Nenhum valor do resultado (média, contagem, escore, resposta) é copiado para ação, evidência ou log.
- A5 — Execução e aprendizagem separadas; eficácia não avaliada.

Evidência: `supabase/tests/07_fibt_action_provenance.sql` (service_role,
authenticated de duas organizações, anon; replay clean/preprod/upgrade),
`src/lib/ivo/ivo-journey.server.test.ts`, `demo:ivo:proof` (Supabase local).
