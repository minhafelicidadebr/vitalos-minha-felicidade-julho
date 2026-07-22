# TASK.md — tarefa atual

> Uma tarefa por vez. Este arquivo substitui o super prompt extenso no dia a dia.
> Regras permanentes: seção "Regras científicas permanentes" do CLAUDE.md.
> Registro canônico: `src/domain/evidence/evidence-registry.json` (congelado, v1.0.0).
> Claim Registry: `src/domain/evidence/claim-registry.json` (congelado, v1.1.0 — corpus completo).

## Tarefa concluída — Auditoria COPSOQ II Product Truth & Commercial Readiness Gate (Ondas T1–T4)

Executada em 2026-07-20 (sessão da conta agencia9.17, retomada aqui em
2026-07-20 após reinstalação do Claude Code). As 4 ondas de CÓDIGO da
auditoria estão mescladas na main:

- **T1** (PR #6): landing para de fazer claims proibidos sobre o COPSOQ.
- **T2** (PR #7): manifesto canônico do instrumento —
  `src/domain/survey/copsoq-instrument-manifest.json` (frozen, fonte única
  de identidade/licença/claims permitidos+proibidos; derivados regenerados
  por `scripts/sync-copsoq-manifest.ts`, divergência quebra o gate).
- **T3** (PR #8): Truth Layer pública — `landing-copy.copsoq-truth.test.ts`
  varre TODO o landing-copy contra `forbidden_claims`; `/sst` consome
  `COPSOQ_AGGREGATE_LABEL` derivado de `allowed_claims[0]`.
- **T4** (PR #10): dossiê PGR (engine + PDF) rotula a matriz
  probabilidade×severidade como "transformação VitalOS — critério de
  gestão NR-01", nunca como parte oficial do instrumento.

**Onda T5 (trilho de licenciamento) — decidida em 2026-07-22: Opção B**
(iniciar diligência de licenciamento). Checklist de campo aberto em
`docs/DILIGENCIA_LICENCIAMENTO_PROTOCOLO_PSICOSSOCIAL_2026-07-22.md` —
execução EXTERNA do founder (contatos institucionais + jurídico), não
tarefa de implementação. Nenhum código, instrumento, landing, manifesto
ou produção foi tocado por esta decisão. Mudança técnica só começa após
diligência completa + avaliação jurídica + nova decisão formal + plano
de migração + confirmação de paridade metodológica (ver
`docs/DECISAO_T5_TRILHO_LICENCIAMENTO_COPSOQ_2026-07-20.md` §6–§8).

## Tarefa anterior — Onda 5 (Truth Layer), 2 cortes entregues

Sequência do Plano de Elevação 180% autorizada pelo founder em 2026-07-18
(após merge da Convergência de Evidências, do Claim Registry v1.1.0 e da
ponte documental 4C `docs/ai/nascentes-atlas/SAFE-VOICE-BRIDGE.md`).

- **Corte 1**: `deriveProductStatus()` (elo mais fraco, falha fechado) em
  `learning-dynamics-resolution.ts` + badges de `/voz-segura` (FlorêncIA,
  mapa mental, flashcards) derivando do registro canônico de dinâmicas em
  vez de digitar "DEMO"/"PARCIAL".
- **Corte 2**: `skillStatus` do Policy Gate deixou de ser opcional —
  omitir era autorização implícita (fail-open). Decisão de governança do
  founder: **opção B** — espelho runtime mínimo e curado
  (`src/domain/florencia/contracts/skill-status-projection.json`, só
  `skill_id`+`status`, gerado por `scripts/sync-skill-status-projection.ts`)
  em paridade testada e integral contra `docs/ai/florencia-skills/
  registries/skill-registry.json` (que segue sendo a ÚNICA fonte de
  governança humana — nunca importado pelo bundle).

Ver `docs/DECISAO_TRUTH_LAYER_SEMENTE_2026-07-18.md` (ToT completo dos 2
cortes + critério de aceite + limitações remanescentes).

### Bloqueadores pré-§5 do SAFE-VOICE-BRIDGE — ✅ AMBOS RESOLVIDOS (2026-07-18)

1. ✅ **Semântica do ActionLog** — kind novo `orientation_consulted`
   (consulta de orientação da FlorêncIA), separado de `evidence_recorded`
   (prova de execução real). Consulta exige `evidenceRef`, NÃO conta em
   `evidenceCountByAction`, e convive com evidência real na mesma ação sem
   contaminar. `/plano-acao` rotula como "Consulta", nunca "Evidência".
2. ✅ **Contexto completo na seleção de claims** — `findClaimForContext()`
   em passport-engine exige as QUATRO dimensões (uso, papel, segmento,
   contexto-alvo) já na SELEÇÃO, com trustGate embutido (claim
   dimensionalmente certo mas C3/V2 sem caveat fica fora — fail-closed).
   `findClaimForStudy()` deprecado, zero call sites de produção; rota e
   teste-espelho migrados.

Com os dois resolvidos, o §5 do SAFE-VOICE-BRIDGE (registry operacional da
ponte NASCENTES) está DESBLOQUEADO — mas segue exigindo o gatilho objetivo
do próprio §5 (consumidor real que LEIA a ponte) + autorização do founder.

## Tarefa concluída — Onda LDX-1 (Learning Dynamics Registry)

Registro canônico de governança das 14 dinâmicas de aprendizagem
(`docs/learning/REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md` +
`src/domain/learning/learning-dynamics-registry.json`) + integração
contextual cirúrgica em `/voz-segura` (marcos práticos, card de vídeo
com fallback honesto, modal "Como funciona", Mapa Mental Governado
reusado do driver `confianca`, rails cross-link para `/revisar` e
`/plano-acao`, "Continue aprofundando"). Ver
`docs/handoff/HANDOFF_LDX1_2026-07-16.md` para o handoff completo.

Branch `feat/ldx-1-learning-dynamics-registry`, 4 commits (Fatia A-D),
sem push/PR até autorização do founder.

## Tarefa concluída — Onda LDX-2 (Adaptive Learning), 5 fatias

Conforme `docs/learning/REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md` §10.
Branch `feat/ldx-2-adaptive-learning`, 5 commits, sem PR até autorização.

- **Fatia A** — `adaptive-quiz-engine.ts` (LD-002): 3 níveis pedagógicos
  (fundamento→aplicação→transferência), banco versionado, undo reversível,
  síntese SEM score-para-empregador (travado por teste).
- **Fatia B** — `AdaptiveQuizCard` ao vivo em `/voz-segura` (seção 3);
  marco "quiz" deriva de `summary.complete`.
- **Fatia C** — biblioteca `VOZ_SEGURA_SCENARIOS` (LD-008): +2 cenários
  (silêncio, feedback), só TRU-006/LDR-007, consequências sempre prováveis;
  `ScenarioSimulator` navegável; consistency test varre a lista inteira.
- **Fatia D** — microlearning espaçado privado (LD-013): `spaced-
  microlearning-engine` (compõe SM-2, datas YYYY-MM-DD, cadência = piso,
  SEM streak) + `spaced-microlearning-store` (persistência PRIVADA opt-in,
  "parar e apagar") + `SpacedMicrolearningCard` + 4 micro-unidades.
- **Fatia E** — carta-poema (LD-007) + síntese técnica (LD-006) em PDF
  local: `farewell-letter-engine` (determinístico, sem IA, nome opcional
  não-persistido) + `trail-synthesis-engine` (disclaimers sempre anexos,
  corpo sem claim proibida) + 2 renderizadores PremiumPdf + `Trail
  ConclusionCard` (seção 9 "Levar consigo").

Gate no fim: 2467 testes / 226 arquivos, 0 falhas; paridade OK; tsc limpo.
Tudo verificado ao vivo no preview (localhost:8081).

## Restrições permanentes (todas as tarefas)

- NÃO pesquisar novas referências científicas (Trilho B pausado)
- NÃO declarar causalidade; usar somente os safe_claims registrados
- NÃO prometer ROI nem implementar Next Best Action
- NÃO alterar banco, migrations ou RLS sem pedido explícito
- NÃO transformar líderes em profissionais clínicos
- NÃO mexer em NAV_GROUPS/AppShell sem coordenação (lane Lovable)
- NÃO ativar dinâmicas PLANNED/PROPOSED/R_AND_D como se estivessem disponíveis
