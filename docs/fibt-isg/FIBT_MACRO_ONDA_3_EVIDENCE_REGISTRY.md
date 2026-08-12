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
| Migration de invariantes | APPLIED_HML | SHA-256 `a83923a5ecf22a17eccb3c454ceebdfbb2a53f9faa43ea35da320b8850dbb6c3`; aplicada somente em HML/STAGING e comprovada por postflight humano read-only |
| Testes focados | PASS | 106 testes, 274 assercoes |
| Gate canonico | PASS | 3.661 testes, parity, typecheck e secret scan |
| Typecheck | PASS | `bunx tsc --noEmit --pretty false` |
| Lint dos modulos novos | PASS | ESLint focado, zero erros |
| Build CI | BLOCKED_BY_ENV_GUARD | URL remota recusada para `VITALOS_DB_TARGET=test` |
| Build HML | PASS | ambiente privado carregado em memoria; staging `xttj...xuab`; artefato server SHA-256 `1743b82c924912c7010f7b55b85371a19f21f0af22141bed7cf2cadaac076c2b` |
| HML deploy | PASS | versao corrigida ativa `30a44884-d2b9-4bfd-95f4-f5f740afa782` |
| HML fixture | NOT_EXECUTED | nenhum dado sintetico novo necessario nesta rodada |
| Producao | NOT_ACCESSED | obrigatorio |
| Dados reais | NOT_USED | obrigatorio |
| Envio a colaboradores | NOT_EXECUTED | obrigatorio |
| Push ou merge | NOT_EXECUTED | nao autorizado |

## Evidencias negativas

- Nenhuma consulta le `answers`.
- Nenhum output registra token, hash, cookie, JWT, e-mail ou identificador pessoal.
- Nenhuma rota ou server function administrativa foi adicionada ao deployment HML isolado.
- Nenhuma migration de producao foi executada.
- Nenhuma campanha, setor ou link real do ISG foi criado.

## Macro-Onda 3.1 - integracao HML

| Evidencia | Estado | Prova |
|---|---|---|
| Configuracao privada HML | PASS | ponteiro ativo em `C:\Users\FIB2030\Documents\VitalOS-private-hml-deploy`; nomes obrigatorios presentes; valores nao impressos |
| Guarda de destino | PASS | runtime `preview`, banco `staging`, projeto mascarado `xttj...xuab`, alvo produtivo recusado |
| Custodia de origem | PASS | branch `feat/fibt-isg-pilot-operational-readiness`, HEAD `5b3d9f8dad860325757c9373cf5cd0a6fc396144` |
| Custodia da migration | PASS | SHA-256 `a83923a5ecf22a17eccb3c454ceebdfbb2a53f9faa43ea35da320b8850dbb6c3` |
| Build HML | PASS | artefato final server index SHA-256 `3ad7290ae52219726da92de3ca99aeca2e68d03cc0a2960b4ce3b5c96cbde985` |
| Artefato HML | PASS | operacoes setoriais e protecao k=5 presentes; feature gate habilitado apenas no processo de build HML |
| Secret scan com artefato | PASS | 6 configs, 621 fontes e 265 arquivos publicos; nenhuma credencial ou project ref real encontrado |
| Manifesto de migrations | PASS | 51 arquivos; rollup `a6fb90e8af01...` |
| Preflight remoto de tabelas/colunas | PASS | `sector_links`, `waves`, `wave_cohorts` e colunas requeridas acessiveis via metadata |
| Preflight da unicidade | PASS | 1 link ativo examinado; 0 grupos duplicados; nenhum token ou resposta lido |
| Preflight de catalogo | NOT_AVAILABLE | `pg_catalog` nao e exposto pelo canal PostgREST do staging |
| Canal SQL/DDL seguro | NOT_AVAILABLE | sem password de banco, token de gestao, CLI vinculada ou integracao SQL previamente configurada |
| Migration apply | PASS_HUMAN | arquivo canonico terminou em `COMMIT` antes de SQL antigo residual do editor |
| Migration postflight | PASS | indice unico e FKs `sector_links_wave_org_fk` e `sector_links_wave_cohort_key_fk` presentes |
| Deploy HML | PASS | versao final `30a44884-d2b9-4bfd-95f4-f5f740afa782` confirmada ativa pelo Wrangler |
| Attestation do novo artefato | PASS_HUMAN | `READY`, ambiente `staging`, backend e origem frontend atestados; contrato `FIBT-HML-1`, lote `FIBT-ISG-HML-01` |
| Smoke HML da Macro-Onda 3 | PASS_WITH_ACCESS_LIMIT | staging guard, inventario A/B, emissao, resolucao, duplicata, revogacao, hash-only, telemetria e k<5 passaram; zero respostas criadas |
| Privacidade | PRESERVED | respostas, tokens, hashes e identificadores pessoais nao foram lidos nem impressos |
| Producao | NOT_ACCESSED | nenhum banco, deploy, migration ou configuracao produtiva acessada |

### Lacuna e proximo gate

Executar integralmente, no SQL Editor do projeto HML/STAGING ja identificado,
`supabase/migrations/20260812120000_one_active_sector_link_per_cohort.sql` e
registrar apenas sucesso/erro sem dados sensiveis. Depois, retomar pelo
postflight read-only de indice, constraints e integridade de `TESTE-ISG-A|B`.

## Correcao encontrada no smoke HML

A migration adicionou um segundo relacionamento entre `sector_links` e
`waves`. O embed PostgREST anterior, `waves(...)`, ficou ambiguo e fazia o
resolver falhar fechado como `not_found`. O resolver agora usa
`waves!sector_links_wave_org_fk(...)`, com teste de regressao. O primeiro link
de smoke que revelou a falha foi identificado sem ambiguidade e revogado antes
da nova tentativa. A segunda tentativa comprovou resolucao antes da revogacao e
estado `revoked` depois dela.

O gate final passou com 3.662 testes, 10.750 assercoes, paridade, typecheck e
secret scan. O teste de imports do artefato recebeu timeout explicito de 30 s
sem reduzir a verificacao.

HML pilot operational readiness: `PASS` para operacao sintetica controlada.
Production readiness permanece `NOT_ASSERTED`.
