# Checkpoint de retomada — VitalOS IVO (2026-10-05)

## Estado operacional (confirmado em 2026-10-05)
- Branch `feat/ivo-fibt-platform-foundation`, PR #51 **draft**, sem merge. Código publicado: `8859c01`; `cfa956b` só documentação (CI verde: run `37332961177`; código: run `37330366606`).
- Staging `vitalos-ivo-staging` / Supabase `xttjkpzhxtjfwxjsxuab`: versão ativa **`8da81ce2-6de4-4819-aa09-ddbacfa74928`** (100%); anterior `98b1a4db-…` (rollback). Access 7/7 (S1) e `preflight` 50/0/0 (S9) aprovados.
- **Smoke S2–S8 PENDENTE** (login autenticado no navegador). **Smoke completo NÃO aprovado.** Esta pendência não bloqueia o desenvolvimento local.
- Prazo (`2026-01-11`) e registros anteriores (2 aprendizagens) preservados; nenhum usuário/organização recriado; sem migration nova.

## Onda atual (local; sem deploy/migration/escrita remota)
Plano canônico `docs/vitalos/ivo-roadmap.md` · ADR-005 · dossiê `ivo-methodology-dossier.md` (decisões D1–D10) ·
`specs/efficacy-protocol-c8.md` · `specs/ivo-integrated-slice.md`. Código local: `efficacy-protocol`, `ivo-coverage` (+ painel),
`experimental/ivo-experimental-index` (somente teste). Tudo **proposta**: nada de método aprovado, índice validado ou
eficácia comprovada.

## Próxima ação executável
1. (Operador) S2–S8 na versão publicada.
2. (Metodológico) revisar o dossiê §11 e decidir D1–D10.
3. (Engenharia, sem esperar decisão) PI-9 governança metodológica (R8), PI-10 linha do tempo (R7), PI-13 encerramento de plano; preparar a migration do C8 **após** D9.

## Regras de retomada
Ler este arquivo + `ivo-roadmap.md`; não repetir build/deploy/migration/provisionamento sem mudança que justifique; reaproveitar
`ivo:staging:prepare`; novas escritas remotas exigem o escopo autorizado vigente. Gate: `bun run gate`.
