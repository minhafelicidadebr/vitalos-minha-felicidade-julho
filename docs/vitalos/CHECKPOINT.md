# Checkpoint de retomada — VitalOS IVO (2026-10-17, após a retomada local do PI-13; base: segunda macro-onda de 2026-10-05)

## Estado operacional
- Branch `feat/ivo-fibt-platform-foundation`, PR #51 **draft**, sem merge. Código em staging: `8859c01` (versão `8da81ce2-6de4-4819-aa09-ddbacfa74928`, 100%; anterior `98b1a4db-…` para rollback). S1 (edge-check 7/7) e S9 (preflight 50/0/0) aprovados.
- **Smoke S2–S8 PENDENTE** (navegador autenticado do operador). Smoke completo **não** aprovado. Não bloqueia o desenvolvimento local.
- **Nada da segunda macro-onda nem do PI-13 está em staging**: as migrations `20261005120000` (C8) e `20261016120000` (PI-13) e todo o código novo existem só na branch/PR (o PI-13, só em commit local, sem push) e no banco local descartável.

## O que existe localmente (segunda macro-onda)
Protocolo de eficácia C8 persistente (rascunho → registrado → observação → parecer; append-only; sem DELETE; isolamento por organização),
governança metodológica consultável em `/ivo-integral/governanca` (D1–D10 e M1–M6, **todos em proposta**), aprendizagem vinculada a conteúdo,
linha do tempo e resumo de acompanhamento. Detalhes: `ivo-roadmap.md` §7 · `specs/efficacy-protocol-c8.md` · pacote de decisões `ivo-decision-package.md`.
Limites: parecer conclusivo só com governança D9 **sintética de teste** (runtime local descartável); leitura publicada de outro ciclo não é resolvida (PI-14);
conteúdo educativo aprovado = 0 (só TESTE).

## PI-13 — incluir ação em plano existente e encerrar plano (retomada local de 2026-10-17)
**Feito localmente; commit local, sem push; fora de staging.** Base: HEAD `e661f99` ("feat(ivo): C8 persistente, governanca aplicada (R8) e aprendizagem rastreavel (R7) — local"). O commit do PI-13 (`feat(ivo): PI-13 inclusao de acao em plano existente e encerramento operacional do plano (local)`) fica logo acima dele; o hash não é registrado aqui.
Entrega: migration `20261016120000_ivo_plan_composition_and_closure.sql` (aditiva e idempotente; gatilhos no schema `ivo_ledger`, nenhuma função nova em `public`, escrita só por `service_role` no servidor) + suíte `supabase/tests/09_ivo_plan_composition_closure.sql` + servidor (`fibt-plan-composition.server.ts`, `plan-closure.ts`) + interface (`PlanComposition.tsx` em `/ivo-integral/acoes`). Encerrar é ato operacional e terminal: não avalia eficácia, não altera o IVO, não toca o C8. Detalhes e decisões abertas: `ivo-roadmap.md` §8.
Revisão (composição e encerramento): nenhum defeito bloqueante; nenhum código ou SQL alterado nesta retomada.
Evidência desta retomada: testes direcionados em 12 arquivos, 189 testes, 0 falhas (a 1ª execução teve 1 timeout de cache frio em `profile-authority-boundary.test.ts`, fora do PI-13; o teste passou isolado e na reexecução); `bun run gate` rodado 1×: 4136 pass / 0 fail / 321 arquivos, `parity` OK, `tsc --noEmit` OK, `secret-scan` OK.
Reaproveitado, não reexecutado (logs locais da sessão anterior, ignorados pelo git): replay clean 42/42, preprod 67/67, upgrade 55/55; `demo:ivo:proof` 147 verificações (52 do PI-13); verificação visual 34/34.
Pendente (autorização ou decisão humana): aplicar a migration em staging; smoke no navegador publicado; decisões de `ivo-roadmap.md` §8. Não verificado: `vite build` (sobrescreveria `.output/`, preservado).

## Rodar a demonstração local
`bun run demo:ivo:setup` (ou `demo:ivo:upgrade` em stack já existente) → `bun run demo:ivo:proof` (jornada + C8 + PI-13, 147 verificações no último registro local, processos separados) →
`bun run demo:ivo:dev` (governança D9 de teste ligada por padrão; `VITALOS_IVO_TEST_GOVERNANCE=off` desliga) → `bun run demo:ivo:visual:c8` (navegador real; **recria** o ledger das organizações fictícias e deixa os três desfechos na interface).
Pré-requisito: Docker. Usuários fictícios em `.ivo-demo.local/demo-users.json` (ignorado pelo git); e-mails de acesso no Mailpit local.
PI-13: `demo:ivo:upgrade` aplica, em ordem, C8 e PI-13; `bun run demo:ivo:proof:plan` roda só a prova do PI-13 (parte do estado deixado por `demo:ivo:proof`); `bun run scripts/ivo-local-plan-visual-check.ts` (sem alias no `package.json`) dirige o navegador real, **recria** o ledger das organizações fictícias e deixa o plano **encerrado**. Replay SQL local em Docker: `bun run db:replay`, `db:replay:preprod`, `db:replay:upgrade` (a suíte 09 roda nos três).

## Próxima ação executável
1. (Operador) S2–S8 na versão publicada.
2. (Metodológico) decidir D1–D10 a partir de `ivo-decision-package.md`; nomear o responsável e o revisor independente.
3. (Engenharia, só com autorização de migration remota) PI-15: revisar e promover a migration do C8 para staging. **Não executar sem autorização expressa.** A migration do PI-13 (`20261016120000`) vem depois da do C8 na ordem de aplicação, depende só do ledger (`20260705100000`) e da proveniência R6 (`20261002120000`), e também precisa de revisão e autorização; hoje o PI-15 cita só a do C8.
4. (Produto + Engenharia) decidir os pontos abertos do PI-13 em `ivo-roadmap.md` §8 (reabertura, quem encerra, motivo, DELETE, rótulo do papel, critério "RPC aditiva") e revisar o commit local antes de qualquer push.

## Regras de retomada
Ler este arquivo + `ivo-roadmap.md`; não repetir build/deploy/migration/provisionamento sem mudança que justifique; reaproveitar
`ivo:staging:prepare`; novas escritas remotas exigem o escopo autorizado vigente. Gate: `bun run gate` (= `bun test src scripts` + `parity` + `bunx tsc --noEmit` + `secret-scan`; nenhum passo lê estes dois documentos).