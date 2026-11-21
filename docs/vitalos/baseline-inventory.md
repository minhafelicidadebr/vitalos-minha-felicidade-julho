# Baseline e inventário (Macro-onda 0)

Base: `origin/main` @ `f366fd8e1456f23e7cf2d0931d9e12e40a6de018` (merge PR #50).
Worktree isolada: `vitalos-ivo-fibt-foundation`, branch `feat/ivo-fibt-platform-foundation`.
A worktree anterior (`vitalos-fibt-hml-readiness`) e suas alterações locais foram preservadas sem modificação.

## Classificação de ativos

| Ativo | Caminho | Classe |
|---|---|---|
| Engine FIB-T (scoring, validação, agregação k) | `src/engine/fibt/fibt-engine.ts` | REUTILIZAR |
| Manifesto + carregador fail-closed | `src/domain/instruments/fibt/` | REUTILIZAR |
| Relatório de coorte (razões de supressão) | `src/lib/fibt/fibt-cohort-report.ts` | REUTILIZAR |
| Leitor de estado protegido (`ManagerAnalytics`) | `src/lib/fibt/fibt-manager-control-center.ts` | REUTILIZAR → GENERALIZAR depois (escada é agnóstica, mensagens são FIB-T) |
| Loader do painel + store injetável | `src/lib/fibt/fibt-manager-control-center.server.ts` | GENERALIZAR (remover identidade de cliente) |
| Publicador canônico | `src/lib/fibt/fibt-cohort-publication.server.ts` | REUTILIZAR |
| Painel `FibtManagerControlCenter` | `src/components/fibt/` | REUTILIZAR |
| Rota `/fibt-piloto` | `src/routes/fibt-piloto.tsx` | REUTILIZAR |
| Flag do piloto | `src/lib/fibt/fibt-pilot-flag.ts` | REUTILIZAR |
| Migrations 220000/221000/222000 | `supabase/migrations/` | REUTILIZAR |
| Contrato HML (lotes ISG) | `src/lib/fibt-hml/hml-contract.ts` | ENCAPSULAR (fronteira de deployment) |
| Fronteiras HML, Access JWT, guards | `src/lib/fibt-hml/*`, `src/app/fibt-hml/*` | ENCAPSULAR |
| Worker `vitalos-fibt-hml-isg` | `wrangler.hml.jsonc` | ENCAPSULAR (identidade de deployment) |
| Scripts de lote HML | `scripts/fibt-hml/*` | ENCAPSULAR |
| Fixtures "ISG Sintetica" em testes | `*.test.ts(x)` | REUTILIZAR como fixture |
| Índice composto `calculateIVO` | `src/engine/index/ivo-engine.ts` | INVESTIGAR (conflito C1) |
| Dimensões IVO + pilares | `src/domain/packs/*/i*-framework.json` | REUTILIZAR (rótulos de dimensão) |
| Jornada canônica | `src/domain/journey.ts` | REUTILIZAR (ordem/trimestre das lentes) |
| Temporadas M.E.T.E. | `src/engine/season/` | REUTILIZAR |
| Ledger de ações/evidências | migration `20260705100000`, `src/engine/action-plan/` | REUTILIZAR (desligado) |
| Registro de ciclos, vitórias, ESG | migrations `20260705130000`, `20260706120000`, `20260706100000` | REUTILIZAR (desligado) |
| Proveniência FIB-T em `docs/fibt-isg/references/` | manifesto | REMOVER_POSTERIORMENTE (mover com custódia; C7) |
| Seção temporal do `CLAUDE.md` | `CLAUDE.md` | DEPRECAR (C3) |

## Dívida técnica relevante

- `k_min` replicado em 4 lugares (engine, manifesto, HML, capsule-aggregator, SQL).
- `cycle_key` em dois formatos (`T1-2026` × `2026-T1`).
- Versão FIB-T em três notações.
- Capacidades de ação/aprendizagem desligadas por falta de contrato de produção.
