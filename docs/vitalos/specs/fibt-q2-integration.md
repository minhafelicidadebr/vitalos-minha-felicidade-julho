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
