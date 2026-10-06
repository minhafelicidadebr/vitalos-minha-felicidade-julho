# Checkpoint de retomada — VitalOS IVO (2026-10-05, após a segunda macro-onda local)

## Estado operacional
- Branch `feat/ivo-fibt-platform-foundation`, PR #51 **draft**, sem merge. Código em staging: `8859c01` (versão `8da81ce2-6de4-4819-aa09-ddbacfa74928`, 100%; anterior `98b1a4db-…` para rollback). S1 (edge-check 7/7) e S9 (preflight 50/0/0) aprovados.
- **Smoke S2–S8 PENDENTE** (navegador autenticado do operador). Smoke completo **não** aprovado. Não bloqueia o desenvolvimento local.
- **Nada da segunda macro-onda está em staging**: a migration `20261005120000` (C8) e todo o código novo existem só na branch/PR e no banco local descartável.

## O que existe localmente (segunda macro-onda)
Protocolo de eficácia C8 persistente (rascunho → registrado → observação → parecer; append-only; sem DELETE; isolamento por organização),
governança metodológica consultável em `/ivo-integral/governanca` (D1–D10 e M1–M6, **todos em proposta**), aprendizagem vinculada a conteúdo,
linha do tempo e resumo de acompanhamento. Detalhes: `ivo-roadmap.md` §7 · `specs/efficacy-protocol-c8.md` · pacote de decisões `ivo-decision-package.md`.
Limites: parecer conclusivo só com governança D9 **sintética de teste** (runtime local descartável); leitura publicada de outro ciclo não é resolvida (PI-14);
conteúdo educativo aprovado = 0 (só TESTE).

## Rodar a demonstração local
`bun run demo:ivo:setup` (ou `demo:ivo:upgrade` em stack já existente) → `bun run demo:ivo:proof` (jornada + C8, 95 verificações, processos separados) →
`bun run demo:ivo:dev` (governança D9 de teste ligada por padrão; `VITALOS_IVO_TEST_GOVERNANCE=off` desliga) → `bun run demo:ivo:visual:c8` (navegador real; **recria** o ledger das organizações fictícias e deixa os três desfechos na interface).
Pré-requisito: Docker. Usuários fictícios em `.ivo-demo.local/demo-users.json` (ignorado pelo git); e-mails de acesso no Mailpit local.

## Próxima ação executável
1. (Operador) S2–S8 na versão publicada.
2. (Metodológico) decidir D1–D10 a partir de `ivo-decision-package.md`; nomear o responsável e o revisor independente.
3. (Engenharia, só com autorização de migration remota) PI-15: revisar e promover a migration do C8 para staging. **Não executar sem autorização expressa.**

## Regras de retomada
Ler este arquivo + `ivo-roadmap.md`; não repetir build/deploy/migration/provisionamento sem mudança que justifique; reaproveitar
`ivo:staging:prepare`; novas escritas remotas exigem o escopo autorizado vigente. Gate: `bun run gate`.