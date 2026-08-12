# FIB-T Macro-Onda 3 - Evidence Registry

Data: 2026-08-12

| Evidencia | Estado | Artefato ou prova |
|---|---|---|
| Base tecnica FIB-T validada | ACCEPTED | `d86cac0795955f0ae4361b33941b1b5c3b872654` |
| Worktree isolada do PR 45 | PASS | branch `feat/fibt-isg-pilot-operational-readiness` |
| Worktree original preservada | PASS | tres arquivos sujos conhecidos nao foram tocados |
| Modelo de campanha setorial | IMPLEMENTED_LOCAL | `distributionMode=sector`, zero `wave_invites` |
| Gestao de setores | IMPLEMENTED_LOCAL | `wave_cohorts` com chave canonica e tenant derivado da sessao |
| Emissao segura de link | IMPLEMENTED_LOCAL | token aleatorio, hash persistido, retorno uma vez |
| Revogacao | IMPLEMENTED_LOCAL | escopo por organizacao, onda e link ativo |
| Vínculo fail-closed | IMPLEMENTED_LOCAL | coorte unica obrigatoria antes do insert |
| Participacao protegida | IMPLEMENTED_LOCAL | `<5` para contagens abaixo de k=5 |
| Anomalia de link legado | IMPLEMENTED_LOCAL | metadata sem token/respostas e revogacao humana |
| Dashboard por campanha | IMPLEMENTED_LOCAL | deep link `/fibt-piloto?wave=...` |
| Boundary HML | PRESERVED | novas funcoes administrativas continuam fora da allowlist |
| Migration de invariantes | PREPARED_LOCAL | SHA-256 `a83923a5ecf22a17eccb3c454ceebdfbb2a53f9faa43ea35da320b8850dbb6c3`; nao aplicada remotamente |
| Testes focados | PASS | 106 testes, 274 assercoes |
| Gate canonico | PASS | 3.661 testes, parity, typecheck e secret scan |
| Typecheck | PASS | `bunx tsc --noEmit --pretty false` |
| Lint dos modulos novos | PASS | ESLint focado, zero erros |
| Build CI | BLOCKED_BY_ENV_GUARD | URL remota recusada para `VITALOS_DB_TARGET=test` |
| Build HML | BLOCKED_BY_ENV_GUARD | `VITALOS_STAGING_PROJECT_REF` privado ausente |
| HML deploy | NOT_EXECUTED | nao necessario para provar o control plane local |
| HML fixture | NOT_EXECUTED | nenhum dado sintetico novo necessario nesta rodada |
| Producao | NOT_ACCESSED | obrigatorio |
| Dados reais | NOT_USED | obrigatorio |
| Envio a colaboradores | NOT_EXECUTED | obrigatorio |
| Push ou merge | NOT_EXECUTED | nao autorizado |

## Evidencias negativas

- Nenhuma consulta le `answers`.
- Nenhum output registra token, hash, cookie, JWT, e-mail ou identificador pessoal.
- Nenhuma rota ou server function administrativa foi adicionada ao deployment HML isolado.
- Nenhuma migration remota foi executada.
- Nenhuma campanha, setor ou link real do ISG foi criado.
