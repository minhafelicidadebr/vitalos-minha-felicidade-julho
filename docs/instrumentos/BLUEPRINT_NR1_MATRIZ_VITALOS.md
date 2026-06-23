# Blueprint NR-1 × COPSOQ II × FIB-T × Drivers — elevação para o VitalOS

> Avaliação sistêmica do app de referência (`playbook-nr1`) + manual NCOPSII, e elevação do
> Blueprint de dev em nível estado-da-arte, **adaptado aos eixos M.E.T.E. e aos invariantes do
> VitalOS**. Documento preparatório dos sprints. Fonte primária lida: código do app de
> referência, `COPSOQ-Manual-Portugal2013`, `Manual Completo do NCOPSII`, WWP 2.0.

---

## 0 · Veredito da avaliação (o que herdar, o que superar)

**App de referência (`playbook-nr1`, React18/Supabase):** forte na biblioteca de drivers, no
crosswalk versionado (`nr1Crosswalk.ts`: 12 fatores → MTE → COPSOQ → drivers com peso, AIHA,
nível de evidência, intervenções) e no COPSOQ II PT curto bem codificado (`copsoqData.ts`: 12
dimensões + 6 desfechos, com reverso e tercis). **Limite central:** o "crosswalk" é uma **lista
em accordion** — não uma matriz navegável; mistura `autonomy`/`employee_voice` como drivers
fantasma fora do catálogo canônico (a própria nota de integridade do app admite); e a separação
risco × desenvolvimento humano é frouxa.

**Plataforma NCOPSII (do manual):** é, ela própria, um SaaS NR-1 maduro — tercis (0-33/34-66/
67-100), AIHA 5×5, biblioteca de 25+ controles em 6 categorias com **detecção de divergência**
(controle existe, risco continua vermelho), Radar 360°, Semáforo, Critérios de Tolerabilidade
(NR-01 1.5.4.4.6.x), integração GRO/PGR. **Limite:** centrado em risco/compliance — sem a camada
de florescimento, sem ecossistema (FIB-T), sem ciclo educacional vivo.

**O VitalOS já está à frente em arquitetura** (Engine ≠ Domínio, k-anon, separação sagrada
Domínio A/B, M.E.T.E., 5 packs, SM-2, driver-pillar-bridge) e **atrás em profundidade de
mensuração NR-1**. A elevação consiste em **trazer as virtudes metodológicas do COPSOQ II/
NCOPSII para dentro do cânone do VitalOS** — sem importar marca, sem virar "portal de conteúdo".

---

## 1 · As 12 virtudes metodológicas mineradas → tradução VitalOS

| # | Virtude (COPSOQ II / NCOPSII / NR-1) | Tradução premium no VitalOS |
| - | --- | --- |
| 1 | **Tercis direcionais** (0-33/34-66/67-100; invertido p/ dimensões positivas) | Padroniza o `nr1-readiness-engine` (hoje `favorável/intermediário/risco`) com corte canônico versionado e direção por dimensão. |
| 2 | **Exposição × Efeito** (COPSOQ mede causa E desfecho) | Reforça a separação Domínio A/B: dimensões = exposição (B); Burnout/sintomas/ofensivos = **desfecho**, sinalizados mas **fora** do cálculo de risco dimensional e fora das células de driver. |
| 3 | **Metodologia tripartida** (curta/média/longa, modular) | **Instrument Registry** versionado, independente dos drivers: `instrument_version`, `item_set_hash`, `scoring_formula_version`, `cutoff_reference`, `permitted_uses`. Nunca hardcodar contagem de itens (o próprio manual PT diverge: 23dim/40q vs 26sub/41q). |
| 4 | **AIHA 5×5 + Critérios de Tolerabilidade** (NR-01 1.5.4.4.6.x) | Camada de priorização do `priority-engine`, alimentando o Plano de Ação. Severidade ancorada, não inventada. |
| 5 | **Biblioteca de controles com detecção de divergência** | `interventions` + `controls` no Plano de Ação: sinaliza "controle implantado, risco persistente" → reabre hipótese. Anti-teatro de compliance. |
| 6 | **Dimensões ligadas à saúde acionam responsabilidade legal** (Burnout, sintomas, ofensivos) | Gate de criticidade: célula/desfecho crítico exige plano documentado; microcopy de responsabilidade NR-01, sem gamificação na tela de assédio/violência. |
| 7 | **Participação do trabalhador em todo o ciclo** | Jornada por audiência (já no VitalOS): decidir dimensões, informar, devolutiva coletiva, propor medidas. Consulta = requisito, não enfeite. |
| 8 | **Aplicação modular de subescalas** | Campanhas podem aplicar subconjuntos de dimensões por contexto/função — `survey-engine` recebe o conjunto do Registry. |
| 9 | **Radar 360° + Semáforo + Ranking de dimensões** | Data-viz do `/sst` elevada: radar de exposição, semáforo agregado (k≥5), ranking por criticidade. |
| 10 | **Crosswalk versionado fonte-da-verdade** | `nr1-crosswalk` como **engine puro** + mock (driver↔dimensão↔MTE↔intervenção↔evidência), consumido pela matriz e pelo Copiloto (grounding). |
| 11 | **Driver Registry canônico** (resolve `autonomy`/`employee_voice` fantasma) | Taxonomia única de 12 drivers com `aliases`, `copsoq_dimensions`, `nr1_relevance`, `pillar_ids` — reconcilia drivers ↔ pilares IVO ↔ dimensões COPSOQ ↔ domínios FIB-T. |
| 12 | **Camada de evidência sinal→causa→ação→eficácia** | Já existe (`/experimentos`, diff-in-diff honesto) — conectar o crosswalk ao Evidence/ação→reavaliação, fechando Evoluir. |

---

## 2 · Taxonomia canônica reconciliada (a correção de integridade)

12 drivers canônicos (macrocamadas Condições · Relações · Desenvolvimento · Sustentabilidade),
cada um com vínculo explícito a **pilares IVO**, **dimensões COPSOQ II** e **domínios FIB-T** —
um só registro, sem referência solta:

| Driver | COPSOQ II (exposição) | Pilar IVO (florescimento) | FIB-T (ecossistema) |
| --- | --- | --- | --- |
| Carga & Recuperação | demands_quant, work_pace, demands_emotional | energia_vitalidade | uso_tempo, saúde |
| Autonomia & Flexibilidade | influence | equilibrio_autonomia | uso_tempo |
| Clareza & Previsibilidade | predictability, role_clarity | — (clareza) | governança |
| Liderança Preventiva | leadership_quality | — (liderança) | governança |
| Apoio & Comunidade | social_support, community | comunicacao_pertencimento | vit. comunitária |
| Confiança & Voz | leadership_quality, justice | seguranca_psicologica | governança |
| Justiça & Reconhecimento | recognition | reconhecimento_pares | padrão de vida |
| Inclusão & Proteção | community, offensive (desfecho) | comunicacao_pertencimento | vit. comunitária |
| Propósito & Contribuição | meaning | proposito_significado | bem-estar emocional |
| Aprendizagem & Desenvolvimento | (possib. desenvolvimento) | crescimento_maestria | educação |
| Realização Coletiva | role_clarity, recognition, meaning | crescimento_maestria | bem-estar emocional |
| Segurança de Futuro | insecurity | equilibrio_autonomia | padrão de vida |

> Estende o `wwp-drivers-mock` atual (7 → 12 drivers) e dá ao `driver-pillar-bridge` o terceiro
> vínculo (COPSOQ + FIB-T), tornando o loop **Medir → Educar** sensível a risco **e** ecossistema.

---

## 3 · A Matriz de Intersecção — 180% além do modelo

**Modelo de referência:** lista vertical, um fator por vez, drivers como barras dentro do
accordion. **Elevação VitalOS** (protótipo interativo entregue no chat):

- **Matriz 2D viva** — 12 drivers × dimensões, com força da relação por célula (heatmap).
- **Bi-lente comutável** — alterna o eixo entre **COPSOQ II** (risco psicossocial) e **FIB-T**
  (ecossistema), realizando "Drivers × COPSOQ × FIB-T" numa só superfície.
- **Evidência por clique** — cada célula abre hipótese de trabalho, implicação NR-1/NR-17,
  intervenção priorizada, evidência citada e o fluxo M.E.T.E. daquela intersecção.
- **Prioridade NR-1 codificada** — marcador P0/P1 + anel de risco crítico; filtro por prioridade.
- **Desfecho separado** — Burnout/sintomas/ofensivos nunca viram célula de driver (Domínio B).
- **Espinha M.E.T.E.** explícita: Medir (instrumento) → Educar (driver) → Transformar
  (intervenção) → Evoluir (reavaliação k≥5).
- **Acessível** (sr-only, ARIA grid, crosshair, teclado) e **theme-aware** (tokens oklch).

### Porta para o VitalOS (tríade Fable 5)
- `engine/nr1/crosswalk-engine.ts` — puro: `intersection(driver, dimension) → {strength, priority, evidence}`, sem domínio.
- `mocks/nr1-crosswalk-mock.ts` — o registro versionado (driver↔COPSOQ↔FIB-T↔MTE↔intervenção↔evidência).
- `routes/matriz.tsx` — a matriz viva, pack-aware, gateada por consentimento, ligada a `/sst`, `/prioridades` e `/experimentos`.

---

## 4 · Como cada eixo M.E.T.E. é elevado

- **Medir** — Instrument Registry versionado; COPSOQ modular + tercis direcionais; exposição×efeito; radar/semáforo no `/sst`; k-anon ≥ 5 inegociável.
- **Educar** — driver-pages como "centro de inteligência e ação" (não página educativa solta); Copiloto ancorado no crosswalk (grounding + citação, gates G1/G5).
- **Transformar** — biblioteca de intervenções em camadas (organização → liderança → equipe → desenvolvimento), com **regra crítica**: nunca "workshop de propósito" para sobrecarga/assédio; primeiro a organização do trabalho. AIHA + tolerabilidade priorizam.
- **Evoluir** — controles com detecção de divergência; camada de evidência (diff-in-diff) sinal→causa→ação→eficácia→reavaliação; selo computado, nunca comprado.

---

## 5 · Roadmap (alinhado aos engines existentes)

1. **Driver Registry canônico (12)** + reconciliação aliases/pilares/COPSOQ/FIB-T — estende `wwp-drivers-mock`.
2. **`crosswalk-engine` + mock versionado** — fonte-da-verdade da matriz e do grounding do Copiloto.
3. **Instrument Registry** — versão/itemHash/cutoff/usos; corrige o hardcode de contagem.
4. **Rota `/matriz`** — a matriz viva bi-lente (protótipo já validado), ligada a `/sst`/`/prioridades`/`/experimentos`.
5. **Tercis + AIHA + tolerabilidade** no `nr1-readiness`/`priority` — priorização ancorada.
6. **Controles com divergência** no Plano de Ação; gates de criticidade (saúde→responsabilidade NR-1).

**Invariantes mantidos:** Engine ≠ Domínio · k-anon ≥ 5 · Domínio A ⟂ B · sem diagnóstico
individual · desfecho ≠ célula de driver · mock-first · build verde antes de cada commit.
