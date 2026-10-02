# Modelo de domínio

Nomes seguem o código existente quando há conceito equivalente.

| Conceito | Nome no código | Onde vive | Observação |
|---|---|---|---|
| Organização | `organizations`, `orgId` | Supabase | Tenant. Pertencimento = linha em `profiles`. |
| Ciclo de vitalidade | `CycleRef {year, quarter}`, `cycle_key` | `src/domain/ivo/cycle-key.ts`, ledgers | Canônico `YYYY-Tn`. Conversor lê `T1-2026` (jornada) e `2026-t1` (registro); slug de temporada = legado. Dados gravados não são reescritos. |
| Trimestre | `quarter` (`T1..T4`) / `IvoQuarter` (`Q1..Q4`) | `journey.ts` / `src/engine/ivo/` | IVO usa `Q`; derivado da ordem da jornada. |
| Dimensão IVO | `IvoDimensionId` (`eu`,`nos`,`lideranca`,`organizacao`) | `src/engine/ivo/lens-contract.ts` | No JSON do pack o campo se chama `lenses` (legado; não renomeado). |
| Lente | `IvoLensId` (`copsoq`,`fibt`,`perma_v`,`via_t`) | `src/engine/ivo/lens-contract.ts` | Instrumento trimestral. |
| Aplicação / onda | `waves` | Supabase | Uma aplicação de uma lente numa organização. |
| Coorte | `wave_cohorts` | Supabase | Recorte agregado; nunca indivíduo. |
| Resultado agregado publicado | `cohort_capsules` | Supabase | Única fonte de valor observável da FIB-T. |
| Leitura Q2 da organização | `IvoQ2View` | `src/lib/ivo/ivo-views.ts` | Projeção mínima do snapshot protegido; estado nativo por setor. |
| Leitura normalizada da lente | `NormalizedLensReading` | `src/engine/ivo/lens-contract.ts` | Preserva a semântica do instrumento. |
| Mapeamento lente→dimensão | `DimensionMapping` | `src/domain/ivo/dimension-mappings.json` | Só `APROVADO` alimenta indicador. Registro vazio hoje. |
| Prioridade | escolha do gestor (setor publicado × fator) | `/ivo-integral/acoes` | Não persistida à parte: vira a ação do plano do ciclo. |
| Plano de ação | `action_plans` (`draft`,`active`,`closed`) | migration `20260705100000` | Um por organização e ciclo. Capability `ACTION_PLAN` desligada no registro; ligada só em fixture local. |
| Ação | `action_items` (`planejada`,`em_execucao`,`concluida`,`em_vigilancia`,`interrompida`) | idem | Responsável, prazo, indicador de execução (§13). |
| Origem da ação | `action_items.source_*` (lente, onda, coorte, fator, versão, `published_at`) | migration `20261002120000` (local) | Referência, nunca valor. FK composta impede origem de outra organização. |
| Evidência | `evidence_records` + `evidence_scope` (`execucao`,`aprendizagem`) | idem | Eficácia não é tipo de evidência (C8). |
| Histórico | `action_log` (INSERT-only) | migration `20260705100000` | Status é fold dos eventos. |
| Selo de ciclo | `victory_records`, `org_cycle_registry` | migrations `20260706120000`, `20260705130000` | Não usados pela jornada IVO ainda (R7). |
| Versão metodológica | `instrument_version` (manifesto) | `fibt-instrument.v1.json` | FIB-T `1.0.0`; cálculo `fibt-manifest/1.0.0`. |
