# Spec — Ciclo ação e aprendizagem

Fluxo: **resultado → insight → prioridade → ação → evidência → aprendizagem**.

## Reutilização (sem schema novo nesta fundação)

| Etapa | Ativo existente |
|---|---|
| Ação | `action_items` + RPC `create_action_plan` / `set_action_item_accountability` |
| Estados | `planejada → em_execucao → concluida → em_vigilancia`; `interrompida` (`action-log-engine.ts`) |
| Evidência | `evidence_records` + RPC `record_evidence` |
| Histórico | `action_log` INSERT-only, status por fold |
| Aprendizagem | `victory_records`, `org_cycle_registry` |

Os estados sugeridos no pedido (RASCUNHO…ARQUIVADA) **não** foram adotados:
o ledger já tem máquina de estados validada em SQL e TS. Mapeamento:
RASCUNHO/PRIORIZADA ≈ plano `draft`; PLANEJADA = `planejada`; EM_EXECUCAO =
`em_execucao`; EM_VERIFICACAO ≈ `em_vigilancia`; CONCLUIDA = `concluida`;
ARQUIVADA ≈ plano `closed`.

## Lacuna (R6)

`action_items` não referencia a leitura de lente de origem. Proposta: colunas
`source_lens_id`, `source_wave_id`, `source_cohort_key`, `source_dimension_id`
(nullable) em migration nova, com teste SQL no replay. **Aplicação remota é
gate.** `expected_ivo_lift` fica nulo/zero para ações de origem FIB-T (C6).

## Critérios

- A1 — Ação só nasce de leitura `published` da própria organização.
- A2 — Prioridade é ato humano registrado (`created_by`).
- A3 — Isolamento: RLS por `profiles.org_id`, escrita só via RPC.
