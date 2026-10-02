# Spec — Integração FIB-T como lente Q2

## Adaptador

`src/lib/fibt/fibt-lens-adapter.ts` → `toFibtLensReading(snapshot, { organizationId, cycleKey, generatedAt })`.

Fonte: `FibtManagerSnapshot` (já protegido). O adaptador **não** recalcula nada.

| `ManagerAnalytics.state` | `publication` | `constructs` |
|---|---|---|
| `available` | `published` | Fatores FIB-T (`padrao_de_vida`, `bem_estar`, `satisfacao_empresa`) com média 0–4 + escore bruto 0–12 |
| `insufficient_participants`, `awaiting_batched_release`, `complementary_suppression`, `awaiting_item_coverage`, `withheld_on_close` | `protected` | `null` |
| `no_data` | `collecting` (onda coletando) / `concluded` (selada) | `null` |
| `methodology_error`, `technical_error`, `wave_reading_unavailable` | `protected` com `protectionReason` | `null` |

- `privacyStatus` é `"protected"` se qualquer coorte não está publicada.
- `countLabel` é sempre o rótulo já protegido do snapshot.
- `instrumentVersion` vem do snapshot; `calculationVersion` = `fibt-manifest/<versão>`.

## Leitura autenticada (R5)

`src/lib/ivo/ivo-q2-reading.server.ts` → `loadIvoQ2ReadingForSession({ accessToken, waveId? })`,
exposta por `loadIvoQ2Reading` (POST, `src/lib/api/ivo-q2-reading.functions.ts`).

1. `authorizeIvoSession`: fronteira HML, backend cloud, sessão, `requireOrgAdmin`.
2. Onda: a informada (precisa pertencer à organização da sessão) ou a FIB-T mais recente da organização.
3. `loadFibtManagerControlCenterAsAdmin(orgId, waveId, { environment: "application" })` **sem** publicador.
4. `projectIvoQ2View`: organização, ciclo canônico, onda, identidade metodológica, setores, leitura normalizada.

| Grupo IVO | Estados nativos |
|---|---|
| `available` — resultado publicado | `available` |
| `suppressed` — protegido | `insufficient_participants`, `complementary_suppression`, `withheld_on_close` |
| `pending_publication` | `awaiting_batched_release`, `awaiting_item_coverage` |
| `collecting` / `no_data` | `no_data` com onda coletando / encerrada |
| `unavailable` | `methodology_error`, `technical_error` |
| (sem onda) `no_wave` | organização sem onda FIB-T |

Recusas: `unauthenticated`, `forbidden`, `unavailable`, `hml_boundary`, `validation`, `backend` — nenhuma com dado substituto.

## Desacoplamento de cliente

- `fibt-manager-control-center.server.ts` não importa mais `hml-contract`.
- `FibtManagerStore.findCanonicalHmlWave(identity)` recebe a identidade do lote.
- A identidade é fornecida por `fibt-manager-access.server.ts` (fronteira HML).

## Critérios

- F1 — Nenhuma coorte protegida expõe número.
- F2 — Fatores e escore bruto idênticos ao `FibtResult` publicado.
- F3 — Leitura de onda não-FIB-T é recusada.
- F4 — Nenhum módulo de produto FIB-T fora da fronteira HML importa `hml-contract`.
- F5 — Toda a suíte FIB-T existente permanece verde.
- F6 — Leitura Q2 só com sessão válida, papel administrativo e organização da sessão; onda de outra organização → `validation`, sem leitura escopada por onda.
- F7 — A leitura IVO não avança publicação (provado contra Supabase local em `demo:ivo:proof`, R5.8).
