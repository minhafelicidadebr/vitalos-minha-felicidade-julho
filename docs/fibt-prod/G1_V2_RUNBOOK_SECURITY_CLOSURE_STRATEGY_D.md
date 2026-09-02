# G1-v2 — Security Closure Strategy D

Status: **LOCALMENTE VALIDADO; NÃO EXECUTADO EM PRODUÇÃO**.

- Branch: `feat/fibt-security-closure-5-2-xl`
- `PRODUCTION_MUTATION=false`
- `BETA_DB_APP_CONTRACT_GAP=OPEN`
- O pacote G1 original está **SUPERSEDED** para execução produtiva; permanece apenas como evidência histórica.
- SHA histórico preservado: `f89bd3f3407aece6c19f5905a09faa63ebea6b2a0cf2e5acf0a5bd25060aca9b`.
- M6 histórico `20260828121000_definer_surface_and_execute_grants.sql` permanece byte-for-byte no repositório, SHA `4725c8c3e3ce8033045e7613ed1eab49c5ef77628210ec74a43496fe46877371`, mas fica fora deste pacote.

## Pacote produtivo fechado

A ordem é literal e não pode ser inferida por timestamp nem ampliada por glob:

| # | Fase | Migration | SHA-256 canônico |
|---:|---|---|---|
| 1 | M1 | `20260806211000_response_invite_link_contract_forward_fix.sql` | `7f96dcb72c63e04ed57aacaaea7ee98b0cb82510ff2468b7e77e83b73aa1e633` |
| 2 | M2 | `20260807120000_sector_response_consent_durability.sql` | `6e4cf5f34c403a9eff67d5b88998e431bda53de0693de61f26f24a1f5c883e4e` |
| 3 | M3 | `20260811120000_fail_closed_sector_response_cohort_binding.sql` | `536e641aa4f7ccfdb6742406bedf9a23c872c3e42bd6b92adabfb3df0216008e` |
| 4 | M4 | `20260812120000_one_active_sector_link_per_cohort.sql` | `a83923a5ecf22a17eccb3c454ceebdfbb2a53f9faa43ea35da320b8850dbb6c3` |
| 5 | M5 | `20260828120000_profile_authority_boundary_hardening.sql` | `8ca839b853653bf662d912f9ad6fe6a5acc361c6c275387dafd4388aad5a1b4b` |
| 6 | M6A | `20260901120000_current_production_definer_surface_security_closure.sql` | `ef682f4c641cf35531e36a4011a592b51343019a5500013bf007ac95ce902724` |

`G1_V2_PACKAGE_FILES=6`

`G1_V2_PACKAGE_SHA256=076276d45aebe4ad78322382215c32ed8c5d7b905a6c65d2951a6e5fdc08d5d7`

Custódia: payload UTF-8 sem newline final, uma linha LF por arquivo no formato `index:name:canonical_file_sha256`, índice iniciando em 1, seguido de SHA-256. O mesmo cálculo reproduz o SHA histórico acima.

## Decisão Strategy D

O M6 histórico inventariou a união da superfície produtiva com 14 funções de sete módulos RC ainda não materializados no baseline observado. Implantar esses módulos apenas para satisfazer o registro ampliaria indevidamente o G1. M6A separa 15 `REQUIRED_NOW` de 14 `FUTURE_OPTIONAL`: ausência requerida aborta; ausência futura é aceita; função futura presente recebe ACL exata; qualquer função pública desconhecida aborta.

Invariantes não negociáveis: zero `PUBLIC EXECUTE`; funções service-only inacessíveis a `anon`/`authenticated`; allowlist explícita; `search_path` fixo em toda `SECURITY DEFINER`; completude fail-closed; `enforce_profile_authority_boundary()` permanece `SECURITY INVOKER`.

## Evidência local

- `db:replay:preprod`: 25/25, prestate com M1 já presente, M1 reaplicado, 14 futuras ausentes, M6A `0/14`.
- `db:replay`: 21/21, cadeia RC preserva M6 histórico e aplica M6A com `14/14` futuras seguras.
- Matriz negativa isolada: função desconhecida aborta; `REQUIRED_NOW` ausente aborta; futura presente com ACL insegura é reconciliada; `SECURITY DEFINER` sem `search_path` aborta.
- Quatro suítes SQL validam autoridade de `profiles`, ACL/identidade, convergência FIB-T e superfície phase-aware.

## Restrições de release

`WAVE_6_PUBLISH_BLOCKED=true` enquanto `BETA_DB_APP_CONTRACT_GAP=OPEN`. Não publicar Lovable, habilitar coleta FIB-T real, promover os sete módulos, executar SQL produtivo, mover `vitalos-pre-g1-2026-09-01` ou fazer merge da PR #46 por causa deste documento. Uma execução produtiva exige autorização humana separada, novo preflight read-only e conferência dos seis hashes.