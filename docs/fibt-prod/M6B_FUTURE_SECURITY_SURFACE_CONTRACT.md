# M6B — Future Security Surface Contract

Status: **CONTRATO DOCUMENTAL; NÃO É MIGRATION EXECUTÁVEL**.

`BETA_DB_APP_CONTRACT_GAP=OPEN`

M6B só deve ser materializado quando os sete módulos abaixo forem promovidos deliberadamente ao mesmo ambiente. Não criar migration prematura nem implantar funções apenas para satisfazer inventário.

| Módulo | Migration de origem | Funções esperadas |
|---|---|---|
| Action Plan | `20260705100000_action_plan_ledger.sql` | `create_action_plan`, `set_action_item_accountability`, `activate_action_plan`, `record_action_event`, `record_evidence` |
| Devolutiva | `20260705120000_devolutiva_sessions.sql` | `open_devolutiva_session`, `cast_priority_vote`, `set_devolutiva_attendance`, `close_devolutiva_session` |
| Organization Cycle | `20260705130000_org_cycle_registry.sql` | `register_org_cycle` |
| ESG | `20260706100000_esg_report_snapshots.sql` | `create_esg_snapshot` |
| Personal Assessments | `20260706110000_personal_assessments.sql` | `erase_my_assessments` |
| Victory Records | `20260706120000_victory_records.sql` | `seal_victory_record` |
| Survey Telemetry | `20260706130000_item_funnel_events.sql` | `record_item_funnel_event` |

## Condições para fechar o gap

1. Promoção dos sete módulos explicitamente autorizada e compatível com dados reais; nenhuma promoção por dependência artificial de M6.
2. Migrações, tabelas, RLS e call sites de cada módulo validados no alvo da fase.
3. M6B criado como migration monotônica posterior, sem editar M6 histórico nem M6A.
4. Registro M6B contém assinaturas completas e ACL exata: `erase_my_assessments()` somente `authenticated`; as outras 13 somente `service_role`.
5. Nenhuma função de aplicação fora de `REQUIRED_NOW` + superfície promovida; zero `PUBLIC EXECUTE`; zero acesso cliente a service-only; toda `SECURITY DEFINER` com `search_path` fixo.
6. Ausência de qualquer função promovida aborta; função inesperada aborta; aplicação e reaplicação são provadas em replay limpo e production-like.
7. Manifesto, pacote futuro, hashes e runbook são recalculados; o SHA histórico G1 e o SHA G1-v2 nunca são reutilizados.

## Bloqueio

`WAVE_6_PUBLISH_BLOCKED=true` até que o gap seja fechado por promoção autorizada ou até que os call sites não materializados sejam removidos/desativados por decisão explícita de produto. Este contrato não autoriza deploy, publicação Lovable, coleta real, migration produtiva ou criação de tag.