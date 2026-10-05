# Spec — Protocolo de eficácia (C8)

**Status:** especificação proposta + motor puro implementado localmente (`src/engine/ivo/efficacy-protocol.ts`).
Persistência e UI **não implementadas** (PI-2, PI-3) — dependem dos parâmetros D9 do dossiê. Nada aqui aprova
método; eficácia continua "não avaliada" na interface publicada.

## 1. Cinco camadas, nunca misturadas

| Camada | Pergunta | Onde vive | Comprova |
|---|---|---|---|
| Execução | A atividade aconteceu? | `action_items.status` + `evidence_records` (`execucao`) | entrega |
| Aprendizagem | O que se aprendeu/ajustou? | `evidence_records` (`aprendizagem`) | registro contextualizado |
| Mudança observada | A medida mudou, em que direção? | observação do protocolo | diferença entre duas medidas **comparáveis** |
| Alcance da meta | O critério predefinido foi cumprido? | parecer do revisor | meta atingida / não atingida / inconclusiva |
| Atribuição causal | A mudança se deve à ação? | parecer do revisor | somente com desenho declarado |

Concluir a ação **não** cria protocolo, **não** muda a avaliação e **não** altera nenhum índice. O estado da
avaliação é função de (protocolo, observações, parecer, data) — o estado da ação **não é entrada**.

## 2. Protocolo (registrado ANTES de avaliar; revisões append-only)

| Campo | Regra |
|---|---|
| `objective` | texto ≥ 10 caracteres |
| `indicator` | `label`, `kind` (`execucao` \| `resultado`), `unit`, `direction` (`aumentar` \| `diminuir`; obrigatória em `resultado`), `origin` (`leitura_publicada` \| `medida_da_organizacao`) |
| `baseline` | obrigatório em `resultado`: `observedOn` (≤ início da janela), `population`, `source`; `leitura_publicada` ⇒ só **referência** à publicação (nunca o valor — A4); `medida_da_organizacao` ⇒ `value` |
| `target` | `numerico` (valor) ou `qualitativo` (critério textual, exige revisor) — é **meta de gestão**, não faixa interpretativa |
| `meaningfulDifference` | definida **pelo protocolo**, sem default global; ausente ⇒ diferença de qualquer tamanho é só descritiva |
| `window` | `start < end` (datas civis); observação fora da janela não conta |
| `source` | de onde vem a medida posterior |
| `comparisonRule` | `sameCohort`, `sameInstrumentVersion`, `sameCalculationVersion` explícitos; `requirePublished` é **sempre** `true` (k≥5 e sem supressão) |
| `responsibleRole` / `reviewerRole` | obrigatórios e **distintos** |
| `limitations` | lista opcional de limitações declaradas |

Indicador `execucao` mede entrega: dispensa baseline, mas o parecer fica com `claimScope = execucao` e nunca é
apresentado como melhora de resultado.

## 3. Estados da avaliação (derivados) e persistência

`sem_protocolo → aguardando_observacao → em_avaliacao → meta_atingida | meta_nao_atingida | inconclusiva`

- `aguardando_observacao`: protocolo válido, sem observação dentro da janela.
- `em_avaliacao`: ≥ 1 observação na janela, sem parecer da revisão vigente.
- Parecer sempre com `evidenceGrade` (`descritiva` · `pre_pos` · `comparacao_referencia` · `desenho_causal`),
  `observedChange` (`melhorou` · `piorou` · `sem_mudanca` · `nao_comparavel`), `targetReached` (`true/false/null`),
  `attribution` (`nao_avaliada` padrão · `nao_sustentada` · `sustentada_por_desenho` + `design` obrigatório).
- Revisar o protocolo cria **nova revisão**; pareceres anteriores permanecem ligados à revisão em que foram emitidos.
- Regras do parecer: `meta_atingida`/`meta_nao_atingida` exigem observação na janela, comparabilidade satisfeita e,
  em `resultado`, baseline; qualquer valor ausente/suprimido ⇒ `inconclusiva` (nunca zero); `inconclusiva` exige
  motivo; `sustentada_por_desenho` exige `evidenceGrade = desenho_causal`.

**Persistência proposta (migration aditiva — NÃO criada):** `efficacy_protocols`, `efficacy_observations`,
`efficacy_verdicts`, todas com `org_id`, RLS por `profiles.org_id`, **append-only** (sem UPDATE/DELETE; gatilho
de bloqueio), escrita só por RPCs `SECURITY DEFINER` que derivam organização e papel da sessão, conferem posse do
item e aceitam `request_id` idempotente. FK composta `(item_id, org_id)` como no ledger R6. Revisor da RPC de
parecer ≠ autor do protocolo. Observações de `leitura_publicada` guardam **referência** (ciclo, recorte, versões),
nunca o valor; o valor é resolvido na leitura, pelo snapshot protegido. Critérios de conclusão: replay
clean/preprod/upgrade, teste SQL com duas organizações, idempotência, append-only.

## 4. Interface (PI-3, futura)

Substituir o bloco estático "Eficácia: não avaliada" pelo estado real + protocolo + pareceres, mantendo o
texto fixo "Concluir a ação registra a execução — não comprova melhora nem causalidade" e mostrando sempre
`claimScope`, grau de evidência e limitações.

## 5. Critérios de aceite

C8-1 estado independe da ação · C8-2 ausência nunca vira zero · C8-3 comparação inválida bloqueada e explicada ·
C8-4 revisão de protocolo não reescreve pareceres · C8-5 favorável, desfavorável e inconclusivo persistem após
recarga (PI-2/PI-3) · C8-6 atribuição causal nunca é padrão · C8-7 nenhum valor de leitura publicada é persistido.
Dados sintéticos verificam o software, não a eficácia de intervenção real.
