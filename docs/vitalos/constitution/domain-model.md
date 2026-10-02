# Modelo de domínio

Nomes seguem o código existente quando há conceito equivalente.

| Conceito | Nome no código | Onde vive | Observação |
|---|---|---|---|
| Organização | `organizations`, `orgId` | Supabase | Tenant. Pertencimento = linha em `profiles`. |
| Ciclo de vitalidade | `AnnualPlan`, `cycle_key` | `season-engine.ts`, ledgers | Formatos divergentes: `T1-2026` (jornada) × `2026-T1` (DB). Ver governança. |
| Trimestre | `quarter` (`T1..T4`) / `IvoQuarter` (`Q1..Q4`) | `journey.ts` / `src/engine/ivo/` | IVO usa `Q`; derivado da ordem da jornada. |
| Dimensão IVO | `IvoDimensionId` (`eu`,`nos`,`lideranca`,`organizacao`) | `src/engine/ivo/lens-contract.ts` | No JSON do pack o campo se chama `lenses` (legado; não renomeado). |
| Lente | `IvoLensId` (`copsoq`,`fibt`,`perma_v`,`via_t`) | `src/engine/ivo/lens-contract.ts` | Instrumento trimestral. |
| Aplicação / onda | `waves` | Supabase | Uma aplicação de uma lente numa organização. |
| Coorte | `wave_cohorts` | Supabase | Recorte agregado; nunca indivíduo. |
| Resultado agregado publicado | `cohort_capsules` | Supabase | Única fonte de valor observável da FIB-T. |
| Leitura normalizada da lente | `NormalizedLensReading` | `src/engine/ivo/lens-contract.ts` | Preserva a semântica do instrumento. |
| Mapeamento lente→dimensão | `DimensionMapping` | `src/domain/ivo/dimension-mappings.json` | Só `APROVADO` alimenta indicador. Registro vazio hoje. |
| Insight / tema de atenção | — | spec `action-learning-loop.md` | Ainda não persistido. |
| Prioridade | fila de `action-plan-engine` | `src/engine/action-plan/` | Hoje alimentada por mock. |
| Plano de ação | `action_plans` (`draft`,`active`,`closed`) | migration `20260705100000` | Desligado no capability registry. |
| Ação | `action_items` (`planejada`,`em_execucao`,`concluida`,`em_vigilancia`,`interrompida`) | idem | Responsável, prazo, métrica (§13). |
| Evidência | `evidence_records` (`texto`,`foto`,`checklist`,`metrica`) | idem | Referência, nunca conteúdo pessoal. |
| Histórico | `action_log` (INSERT-only) | idem | Status é fold dos eventos. |
| Aprendizagem | `victory_records`, `org_cycle_registry` | migrations `20260706120000`, `20260705130000` | Selo e registro de ciclo. |
| Versão metodológica | `instrument_version` (manifesto) | `fibt-instrument.v1.json` | FIB-T `1.0.0`. |
