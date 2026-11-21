# Spec — Protocolo de eficácia (C8)

**Status (2026-10-05, segunda macro-onda):** motor puro (`src/engine/ivo/efficacy-protocol.ts`), **persistência
(PI-2) e interface (PI-3) implementadas e provadas LOCALMENTE** em banco descartável. A migration
`20261005120000_ivo_efficacy_protocols.sql` **não foi aplicada em staging nem em produção** (depende de revisão e
autorização). Nada aqui aprova método: D9 segue em **proposta**; o parecer conclusivo só existe no ambiente local
de teste, com governança sintética identificada. Na interface publicada em staging (`8da81ce2`) a eficácia continua
"não avaliada".

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

**Persistência implementada (migration aditiva, local):** `efficacy_protocols`, `efficacy_observations`,
`efficacy_verdicts`, todas com `org_id`, FK composta `(item_id, org_id)` como no ledger R6 (com `UNIQUE (id, org_id)`
adicionada a `action_items`, protegida), RLS de leitura por `profiles.org_id`. Decisões que **divergem da proposta
original**, com o motivo:

- **Sem funções novas em `public`** (o guarda M6A aborta funções públicas desconhecidas) e **sem RPC `SECURITY DEFINER`**:
  a escrita é feita só por `service_role` a partir do servidor, que valida sessão, papel, organização, capability e posse
  do item; os gatilhos de integridade vivem no schema `ivo_c8`. `authenticated` só lê (RLS); `anon` não lê.
- **Ciclo de vida com rascunho.** O protocolo nasce `draft` (campos anuláveis: pode ficar **incompleto** e persistir);
  `registered` exige o contrato completo (`CHECK` + gatilho repetem a regra do motor) e é **imutável** depois. Revisar =
  nova linha (`revision+1`, `supersedes_id`); um rascunho aberto por item (índice único parcial).
- **Sem `DELETE` para ninguém de aplicação** (`service_role` inclusive); a exclusão da ação ainda remove por cascata de FK.
- **Observações e pareceres são append-only.** Um novo parecer vira novo registro; **o mais recente prevalece** e os
  anteriores permanecem no banco.
- **Parecer conclusivo exige governança D9 aprovada registrada NO PRÓPRIO parecer** (`governance_decision`,
  `governance_state`, `governance_source ∈ registro_canonico | teste_sintetico`, `CHECK` no banco). Revisor ≠ criador do protocolo
  (gatilho). Override de teste `VITALOS_IVO_TEST_GOVERNANCE=D9_APROVADO_SINTETICO` só vale em runtime **local descartável**
  (runtime/db local, URLs loopback, sem declaração HML) e marca o parecer como teste.
- **Valor de leitura publicada nunca é persistido** (`baseline_value` nulo; só referência; `CHECK` recusa chaves extras no JSON).
  Observação e parecer conclusivo sobre `leitura_publicada` de outro ciclo retornam `published_reading_resolution_pending`:
  a **resolução protegida** do valor ainda **não existe** (pendência do roadmap). Único parecer possível ali: inconclusivo.

Provas: replay clean 39/39 · preprod 52/52 · upgrade 52/52 (`PACOTE_IVO_C8`), suíte SQL `supabase/tests/08_ivo_efficacy_protocols.sql`
(duas organizações), testes unitários do servidor e prova de integração com sessões reais (`bun run demo:ivo:proof`).

## 4. Interface (PI-3 — implementada localmente)

`src/components/ivo/EfficacyPanel.tsx`, dentro do cartão da ação em `/ivo-integral/acoes`: o bloco estático "Eficácia: não
avaliada" só permanece quando não há protocolo **registrado**. Rascunho incompleto lista o que falta e segue persistido;
registrado mostra o protocolo (sem campos editáveis — só "nova revisão"), observações e parecer com escopo, grau de evidência,
atribuição causal (padrão "não avaliada"), governança D9 usada e marca de **TESTE SINTÉTICO**. Mantém o texto fixo "Concluir a ação
registra a execução — não comprova melhora do indicador nem causalidade, e não altera o IVO". Com D9 em proposta, só "inconclusiva"
é selecionável. Pareceres novos ficam em "Registrar nova observação ou novo parecer" (histórico preservado).

## 5. Critérios de aceite

C8-1 estado independe da ação · C8-2 ausência nunca vira zero · C8-3 comparação inválida bloqueada e explicada ·
C8-4 revisão de protocolo não reescreve pareceres · C8-5 favorável, desfavorável e inconclusivo persistem após
recarga (PI-2/PI-3) · C8-6 atribuição causal nunca é padrão · C8-7 nenhum valor de leitura publicada é persistido.

**Situação local:** C8-1 (concluir a ação B não cria parecer; B termina "meta não atingida" com a ação concluída), C8-2, C8-3,
C8-5 (UI real + releitura em processo novo), C8-6 e C8-7 comprovados localmente; C8-4 coberto por testes do motor e da suíte SQL.
**Não comprovado:** qualquer efeito em staging/produção; resolução protegida de leitura publicada de outro ciclo (pendente).
Critérios dos três desfechos de demonstração são **fictícios e explícitos** (favorável: base 40 → observado 62, meta 60, diferença
mínima 5 · desfavorável: base 50 → observado 48, meta 60 · inconclusivo: leitura publicada sem resolução protegida). Dados sintéticos
verificam o software, não a eficácia de intervenção real.
