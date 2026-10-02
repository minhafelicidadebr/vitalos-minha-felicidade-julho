# Governança metodológica

## Camadas — nunca misturar

| Camada | Quem define | Estado atual |
|---|---|---|
| 1. Instrumento validado | Fonte científica + manifesto versionado | FIB-T `1.0.0` (`METHODOLOGY_CONFIRMED`) |
| 2. Cálculo do instrumento | Manifesto + engine puro | FIB-T: média por Fator (0–4) e escore bruto (0–12) |
| 3. Normalização | Aprovação metodológica | **Não autorizada** para FIB-T (manifesto recusa) |
| 4. Interpretação (faixas) | Aprovação metodológica | **Não autorizada** para FIB-T |
| 5. Mapeamento para dimensões | `dimension-mappings.json` com status | **Nenhum aprovado** |
| 6. Índice composto IVO | Aprovação metodológica | **Não aprovado** |
| 7. Recomendação | Plataforma sugere | Somente a partir de leituras autorizadas |
| 8. Decisão | Pessoa responsável | Sempre humana e registrada |

## Mapeamentos lente → dimensão

Cada mapeamento é um registro versionado com: `id`, origem, construto de
origem (ex.: Fator FIB-T), dimensão, justificativa, versão, responsável,
evidência científica, status `PROPOSTO | APROVADO | REJEITADO` e data de
aprovação. O carregador valida e congela o registro (fail-closed). Somente
`APROVADO` com responsável, evidência e data alimenta células da matriz.

## Conflitos registrados (não resolvidos por esta fundação)

| # | Conflito | Evidência | Tratamento até decisão |
|---|---|---|---|
| C1 | `calculateIVO` produz índice 0–1000 com pesos e faixas de maturidade, status `experimental`, sem aprovação; conta pilares com n<k como média neutra 3,0 | `src/engine/index/ivo-engine.ts`, `ivo-framework.json` | Não é usado pela fundação IVO nem por leituras oficiais. |
| C2 | A jornada descreve T3 como "PERMA+V → IVO … aqui se forma o IVO basal" — IVO atado a uma lente | `src/domain/journey.ts` | Catálogo de lentes usa "PERMA+V"; IVO = integração das 4 lentes. Copy da jornada fica para decisão. |
| C3 | Seção "Orquestração temporal" do `CLAUDE.md` está desatualizada | `CLAUDE.md` | `journey.ts` prevalece. |
| C4 | "Lente" designa dimensão no JSON do pack e instrumento na jornada | `ivo-framework.json`, `journey.ts` | No código novo: dimensão = `IvoDimensionId`, lente = `IvoLensId`. Sem renomeação em massa. |
| C5 | Versão FIB-T em três notações (`1.0.0`, `fibt-1.0.0`, `2020.1-furtado`) | manifesto, `hml-contract.ts`, `instrument-registry-mock.ts` | Manifesto prevalece. |
| C6 | `action_items.expected_ivo_lift` pressupõe previsão de índice composto | migration `20260705100000` | Ações originadas de lente FIB-T não preenchem esse campo. |
| C7 | Fonte metodológica da FIB-T arquivada em pasta de cliente (`docs/fibt-isg/references/`) | manifesto `source_document` | Mover exige refazer custódia SHA-256; adiado. |

Qualquer resolução destes itens é **gate metodológico**.
