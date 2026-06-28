# ADR-002: Evidence Loop — Cadeia de Composição Medir→Provar→Custo

**Status:** Implementado (engines + contratos server) · Wiring de UI pendente (Lovable)
**Data:** 2026-06-28
**Autores:** VitalOS Founding Committee (Fable 5)
**Relacionado:**
- ADR-001 — Links de Pesquisa por Setor
- PR #17 — COPSOQ integral (41 itens NR-1)

---

## 1 · Problema

O VitalOS media risco psicossocial (COPSOQ/NR-1) e florescimento (PERMA/IVO), mas até aqui
cada onda era um retrato isolado. Faltava a **cadeia causal viva** que transforma respostas
cegas em prova auditável de evolução — o ciclo M.E.T.E. (Mensurar → Educar → Transformar →
Evoluir) fechado com dado real, do chão de fábrica ao argumento do CFO.

**Restrições inegociáveis (invariantes do projeto):**
1. Anonimato individual — resposta nunca no cliente; k-anonimato ≥5 imposto no servidor.
2. Domínio A (florescimento) ≠ Domínio B (risco) — dados, telas e fluxos separados.
3. Desfecho (burnout, assédio) é medido, **nunca** alvo de intervenção (célula de driver).
4. Sem afirmação crítica sem fonte; sem promessa de resultado; sem alegação de causalidade.
5. `engine/` nunca importa `domain/`; vocabulário injetado.

---

## 2 · Decisão

**Compor, não acumular (Fable 5 §5.1).** Em vez de um mega-módulo "relatório de evidência",
construímos **engines puros pequenos**, cada um responsável por um elo, e os compomos em
contratos server que montam a leitura final. Nenhuma peça duplica a outra; a `Prova de Ciclo`
(o capstone) não calcula nada — apenas orquestra.

### 2.1 A cadeia de composição

```
onda selada                      wave-lifecycle-engine (sealWave)
    │  produz
    ▼
MeasurementContextCapsule        measurement-capsule-engine   ◄── único contrato survey→IA
    │  (selado, k-anon, redigido)
    ├──────────────► FlorescerIA  copilot-engine (capsule + longitudinal)
    │  vários ciclos
    ▼
LongitudinalReading              capsule-longitudinal-engine  ◄── o MOAT (antes/depois)
    │
    ├─► Intervention Evidence     intervention-evidence-engine (diff-in-diff intra-survey)
    │       │
    │       ▼
    │   redução atribuível ─────► Prevention ROI  prevention-roi-engine (custo evitado)
    │
    └─► Dossiê GRO/PGR            pgr-document-engine (compõe pgr-engine + longitudinal)

          TUDO ───► Prova de Ciclo  cycle-proof.server (medir→provar→custo, board)
```

### 2.2 Os elos (engines puros)

| Engine | Responsabilidade | Compõe |
|---|---|---|
| `survey/wave-lifecycle-engine` | Ciclo de vida da onda + selamento honesto do capsule | campaign-engine, capsule |
| `ai/measurement-capsule-engine` | Contrato único survey→IA; redação k-anon; desfechos separados | — |
| `ai/capsule-longitudinal-engine` | Leitura cross-ciclo (antes/depois) domínio-agnóstica | capsule |
| `ai/copilot-engine` | FlorescerIA aterrada (capsule = estado; longitudinal = evolução) | capsule, longitudinal |
| `lab/intervention-evidence-engine` | Eficácia da intervenção vs. medição (drift-adjusted) | longitudinal, evidence-engine |
| `pnl/prevention-roi-engine` | Retorno sobre Prevenção (Domínio B financeiro) | intervention-evidence, pnl-engine |
| `nr1/pgr-document-engine` | Dossiê GRO/PGR auditável (Markdown) | pgr-engine, longitudinal |

### 2.3 Os contratos server (a fronteira segura)

Nenhum capsule bruto chega ao cliente. As server fns retornam só leituras, veredictos e números.

| Server fn (`@/lib/api/…`) | Monta | Fonte |
|---|---|---|
| `wave-lifecycle.functions.transitionWave` | Aplica transição + sela capsule | wave-lifecycle.server |
| `wave-lifecycle.functions.listPackWaveLifecycles` | Painel de ondas (resumo seguro) | wave-lifecycle.server |
| `pgr-document.functions.getSectorPgrDocument` | Dossiê GRO/PGR + Markdown | pgr-document.server |
| `cycle-proof.functions.getCycleProof` | Prova de Ciclo (capstone) | cycle-proof.server |
| `earned-seal.functions.getEarnedSeal` | Selo Empresa Viva GANHO (Domínio B da Prova de Ciclo) | earned-seal.server |
| `board-brief.functions.getBoardBrief` | Arco lido pelos 5 céticos (capstone narrativo) | board-brief.server |

E o copiloto server (`lib/ai/copilot.functions.handleCopilotTurn`) já compõe o capsule
mais recente + a leitura longitudinal do pack (`resolvePackMeasurement`).

---

## 3 · A doutrina da honestidade nesta cadeia

Cada elo carrega sua trava; juntas, formam uma corrente que se recusa a exagerar:

1. **k-anonimato sagrado.** Selar com n<5 → capsule null, "encerrada sem leitura divulgável".
   Dimensão suprimida nunca entra na trajetória longitudinal (não-comparável, contada à parte).
2. **Separação Domínio B.** Desfecho (burnout) é trajetado, mas nunca vira driver de eficácia
   nem linha de ROI. Garantido em capsule, longitudinal, intervention-evidence e prevention-roi.
3. **Diff-in-diff intra-survey.** Sem controle randomizado, o efeito atribuível é a melhora da
   dimensão alvo **além do drift médio**. Confiança tetada em "indicativo" — n alto jamais vira
   "robusto". Construído sobre o atribuível, não o bruto.
4. **Mostre a conta.** Toda linha de ROI carrega a fórmula; fração psicossocial e elasticidade
   são premissas explícitas e ajustáveis; cenário em banda; teto de prevenção.
5. **Nunca cause, associe.** Todo disclaimer nega causalidade e promessa. A Prova de Ciclo
   sintetiza associações orientativas, não veredicto causal.

---

## 4 · Guia de wiring para o Lovable (UI)

Os contratos estão prontos e testados. As telas a seguir consomem as server fns acima.
**Claude Code construiu engines + server; o Lovable conecta as telas.**

| Tela | Server fn | O que renderizar |
|---|---|---|
| `/ondas` (já existe, Claude) | `listPackWaveLifecycles`, `transitionWave` | painel de gestão; botões por estado |
| `/copilota` (Lovable) | `handleCopilotTurn` (via server fn) | exibir `turn.capsuleLine` e `turn.longitudinalLine` quando presentes |
| `/sst` ou `/relatorios` (Lovable) | `getSectorPgrDocument` | botão "exportar dossiê"; render do Markdown |
| `/panorama` (Lovable) | `getCycleProof`, `getBoardBrief` | card "Prova de Ciclo" (ROI) + síntese por cético (5 linhas) |
| `/selo` (Lovable) | `getEarnedSeal` | substituir o `DOMAIN_B_READY` hardcoded pela proveniência real |

**Regra de coordenação:** Claude Code não edita as telas do Lovable; apenas registrou a rota
nova `/ondas` (isolada). As demais telas o Lovable conecta às server fns quando for renderizar.

---

## 5 · Consequências

**Positivas:**
- Cada engine é testável isolado (1.343 testes, 0 falhas no arco).
- A `Prova de Ciclo` prova "sistema > coleção de funções" — orquestra sem recalcular.
- A honestidade é estrutural (invariantes de código), não promessa de marketing.
- Pronto para Fase 2: trocar os mocks por Cloud com RLS por org; a interface não muda.

**Custos / dívidas:**
- Wiring de UI pendente (Lovable) — os contratos existem, as telas ainda não consomem todos.
- `capsule-history-mock` e `intervention-link-mock` são determinísticos para demo; Fase 2 lê do Cloud.
- Verificação visual de `/ondas` pendente (conflito de porta 8080 com o projeto `../vita`).

---

## 6 · Alternativas consideradas (ToT)

- **A — Mega-módulo "EvidenceReport".** Rejeitado: viola compor-não-acumular; intestável; rígido.
- **B — Cada leitura recalcula do zero.** Rejeitado: duplicação, risco de divergência da fonte única.
- **C — Composição por engines puros + server boundaries (escolhido).** Máxima testabilidade,
  reuso e opcionalidade; cada elo evolui sozinho; o capstone só orquestra.
- **D — Adiar para a Fase 2 (Cloud).** Rejeitado: o mock-first prova a cadeia hoje, sem backend.
