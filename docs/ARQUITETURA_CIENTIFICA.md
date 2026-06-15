# Arquitetura Científica — 4 Lentes VITA™

> **Skill de orientação** — leia antes de implementar qualquer módulo de mensuração.
> Este documento é a fonte de verdade sobre QUAIS instrumentos fazem O QUÊ e ONDE
> cada um vive no app. É a resposta para "o que muda no app" com a base científica completa.

---

## 1. Arquitetura de 4 camadas (não confundir entre si)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CAMADA 4 — AÇÃO          Work-Wellbeing Playbook 2.0              │
│  O que fazer depois dos dados → Culture Lab → /lab                 │
├─────────────────────────────────────────────────────────────────────┤
│  CAMADA 3 — FORÇAS        VIA-T v1 Exploratório                    │
│  Como cada pessoa contribui → autodesenvolvimento → /viat (NOVO)   │
├─────────────────────────────────────────────────────────────────────┤
│  CAMADA 2 — FLORESCIMENTO  PERMA no Trabalho (BR, 2026)            │
│  Como as pessoas estão → IVO + Pulses → /ivo, /pulse               │
├─────────────────────────────────────────────────────────────────────┤
│  CAMADA 1 — RISCO          COPSOQ II / NR-1 / Guia MTE 2026        │
│  O que ameaça as pessoas → Domínio B → /sst, /relatorios           │
└─────────────────────────────────────────────────────────────────────┘
```

**Regra de ouro do produto:** cada camada tem vocabulário, tela e uso de dados próprio.
NUNCA misturar risco (camada 1) com forças (camada 3) na mesma interface.

---

## 2. Os 4 instrumentos — mapa completo

### 2.1 PERMA no Trabalho (Camada 2 — Florescimento)

| Atributo          | Valor                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Referência        | Seligman (2011) + validação BR pepsic.bvsalud.org (2026)                                         |
| Escala            | Likert 0–10, 15 itens                                                                            |
| Dimensões         | P (Emoções Positivas) · E (Engajamento) · R (Relacionamentos) · M (Significado) · A (Realização) |
| Fator de 2ª ordem | PERMA Global (α=0,92 · ω=0,93)                                                                   |
| Alerta            | Pilar A (Realização): α=0,64 — interpretar com cautela                                           |
| Invariância       | **Escalar** — comparação entre gênero e setor é estatisticamente válida                          |
| Correlações-chave | Satisfação no trabalho r=0,82 · Engajamento r=0,89                                               |
| No app            | Alimenta pilares EU e NÓS do IVO; itens entram no Pulse                                          |

**Lentes IVO alimentadas:**

- EU: `proposito_significado` (M), `energia_vitalidade` (P+E), `crescimento_maestria` (A), `equilibrio_autonomia` (E)
- NÓS: `cooperacao_confianca` (R), `reconhecimento_pares` (R), `comunicacao_pertencimento` (R)

**Itens PERMA incorporáveis ao Pulse (os mais robustos psicometricamente):**

- P1: "No trabalho, com que frequência você se sente bem?"
- E2: "Até que ponto você se sente animado e interessado no seu trabalho?"
- R2: "Até que ponto você se sente apreciado pelos seus colegas?"
- M1: "Até que ponto o seu trabalho tem propósito e significado?"
- A1: "Com que frequência você sente que está progredindo para alcançar seus objetivos?"

---

### 2.2 COPSOQ II / NCOPSII — NR-1 (Camada 1 — Risco)

| Atributo                 | Valor                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Referência               | Copenhagen Psychosocial Questionnaire II · NCOPSII (adaptação BR)                                                                                                                                   |
| Escala                   | 0–100 (sempre agregado)                                                                                                                                                                             |
| Dimensões (versão curta) | Demandas quantitativas · Influência/Desenvolvimento · Sentido do trabalho · Comprometimento · Previsibilidade · Transparência da liderança · Suporte social · Feedback · Interface trabalho-família |
| Uso legal                | GRO/PGR obrigatório pela NR-1 (Guia MTE 2026)                                                                                                                                                       |
| Faixas                   | Favorável / Intermediário / Risco (cor: verde/amarelo/vermelho)                                                                                                                                     |
| No app                   | `/sst` · COPSOQ Card · `/relatorios` (evidência para GRO)                                                                                                                                           |
| Restrição crítica        | **NUNCA** expor resultado individual. Mínimo 5 respondentes.                                                                                                                                        |

**Regra de separação Domínio B:**

> COPSOQ mede **exposição a fatores psicossociais de risco**. É evidência obrigatória
> para o PGR, não é instrumento de desenvolvimento humano. Vive exclusivamente no Domínio B.

---

### 2.3 VIA-T v1 Exploratório (Camada 3 — Forças)

| Atributo          | Valor                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Referência        | Instrumento autoral inspirado na ciência VIA (Peterson & Seligman). NÃO é a Pesquisa VIA oficial. |
| Escala            | 0–10, 24 itens (curto) ou 48 itens (recomendado) + 10 itens ICUFT                                 |
| Dimensões         | 24 forças × 6 virtudes: Sabedoria · Coragem · Humanidade · Justiça · Temperança · Transcendência  |
| Status            | **v1 exploratório** — sem validação psicométrica formal ainda                                     |
| No app            | **NOVO módulo /viat** — separado do IVO e do COPSOQ                                               |
| Restrição crítica | Jamais usar para seleção, promoção, punição, remuneração ou demissão                              |

**Disclaimers obrigatórios na interface:**

_Individual (colaborador):_

> VIA-T v1 exploratório — ferramenta autoral para autodesenvolvimento e reflexão
> sobre forças percebidas no trabalho. Não é diagnóstico psicológico, não substitui
> a Pesquisa VIA oficial e não deve ser usado para seleção, promoção, punição,
> remuneração, desligamento ou alocação individual.

_Coletivo (gestor/RH):_

> Os dados do VIA-T são apresentados apenas de forma agregada e anonimizada para
> fins de desenvolvimento, cultura e bem-estar. É vedado usar estes resultados
> para decisões individuais de RH, avaliação de desempenho, promoção, punição,
> remuneração, desligamento ou seleção.

**Matriz VIA-T × PERMA+V (para FlorescerIA e nudges):**

| PERMA                 | Forças VIA-T relacionadas                                                        | Nudge/ação sugerida                                                       |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| P — Emoções Positivas | Gratidão · Esperança · Humor · Entusiasmo · Apreciação                           | Rituais de reconhecimento, celebração, práticas de gratidão               |
| E — Engajamento       | Curiosidade · Amor ao aprendizado · Criatividade · Perseverança · Autorregulação | Desafios de aprendizagem, job crafting, metas significativas              |
| R — Relacionamentos   | Bondade · Vínculo · Inteligência social · Trabalho em equipe · Perdão            | Acordos de convivência, feedback apreciativo, cooperação                  |
| M — Significado       | Propósito · Perspectiva · Gratidão · Esperança · Apreciação da excelência        | Conexão trabalho-impacto, storytelling de propósito                       |
| A — Realização        | Perseverança · Liderança · Prudência · Autorregulação · Bravura                  | Metas coletivas, acompanhamento de progresso, feedback de desenvolvimento |
| V — Vitalidade        | Entusiasmo · Autorregulação · Esperança · Humor · Prudência                      | Pausas inteligentes, gestão de energia, hábitos sustentáveis              |

**ICUFT — Índice de Condições de Uso das Forças no Trabalho:**

- 10 itens que medem SE o ambiente permite usar as forças
- Interpretação cruzada:
  - VIA-T alto + ICUFT alto → forças presentes e ambiente favorável
  - VIA-T alto + ICUFT baixo → **potencial humano subutilizado pelo contexto** (sinal de alerta RH)
  - VIA-T baixo + ICUFT alto → ambiente favorável, foco em desenvolvimento individual
  - VIA-T baixo + ICUFT baixo → prioridade para intervenção cultural e de liderança

---

### 2.4 Work-Wellbeing Playbook 2.0 (Camada 4 — Ação)

| Atributo   | Valor                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Referência | Playbook baseado em evidências de intervenções de bem-estar                                      |
| No app     | Culture Lab → `/lab` (protocolos e experimentos)                                                 |
| Uso        | Selecionar intervenções baseadas nos dados de PERMA + VIA-T + COPSOQ                             |
| Lógica     | Dado (PERMA/VIA-T/COPSOQ) → diagnóstico → protocolo do Playbook → experimento → evidência → Selo |

---

## 3. O que muda no app

### 3.1 NOVO — Módulo VIA-T (`/viat`)

**Arquivos a criar:**

```
src/engine/viat/
  viat-engine.ts          # Pure engine: score 24 forças, 6 virtudes, ICUFT
  viat-engine.test.ts     # Testes unitários

src/mocks/
  viat-mock.ts            # Marina Santos: top 5 forças, ICUFT, dashboard coletivo

src/routes/
  viat.tsx                # Assessment flow → devolutiva → missão 7 dias
```

**Fluxo da rota `/viat`:**

1. Boas-vindas + explicação + disclaimer
2. Assessment (48 itens ou 24 — por configuração do pack)
3. Salvamento automático por secção
4. Devolutiva individual: Top 5 forças + virtudes predominantes + missão 7 dias
5. Dashboard coletivo (k-anon ≥5, somente para RH/CHRO/Líder)

**Entrada na nav do pack (`enterprise.pack.json`):**

```json
{
  "id": "viat",
  "label": "Mapa de Forças",
  "roles": ["COLABORADOR", "EMBAIXADOR", "LIDER_EQUIPE", "RH_ADMIN", "CHRO"]
}
```

**AppShell (`NAV_ROUTES`):**

```ts
viat: "/viat";
```

---

### 3.2 ATUALIZAR — FlorescerIA (`/floresceria`)

**Novo modo de IA:**

```json
{
  "id": "analista_forcas",
  "label": "Analista de Forças VIA-T",
  "roles": ["COLABORADOR", "EMBAIXADOR", "LIDER_EQUIPE", "RH_ADMIN"]
}
```

**Guardrail adicional:**

- `never`: "interpret_viat_as_diagnosis", "rank_individuals_by_strengths", "suggest_hiring_based_on_viat"
- `always`: "frame_as_development_not_evaluation", "reference_viat_v1_exploratory_nature"

---

### 3.3 ATUALIZAR — Dashboard Colaborador (`/colaborador`)

**Novo card:** VIA-T Top 5 (se o colaborador completou o assessment)

- Mostra as 5 forças-assinatura percebidas
- Missão ativa da semana (derivada do VIA-T)
- Link para completar o VIA-T se ainda não fez
- Disclaimer visível

---

### 3.4 ATUALIZAR — Academia (`/academia`)

**Novo critério de filtragem de trilhas:** além de papel, filtrar por forças de afinidade VIA-T.

- Ex: colaborador com "Criatividade" alta → trilha de Inovação em destaque
- Ex: colaborador com "Amor ao Aprendizado" alta → Academia do Florescimento personalizada

---

### 3.5 ATUALIZAR — Pulses (`/pulse`)

**Adicionar itens PERMA validados** ao banco de itens do pulse engine, marcados com origem:

```ts
{ pillarId: "proposito_significado", source: "perma_m1", text: "Até que ponto o seu trabalho tem propósito e significado?" }
{ pillarId: "energia_vitalidade", source: "perma_p1", text: "Com que frequência você se sente bem no trabalho?" }
```

---

### 3.6 ATUALIZAR — Culture Lab (`/lab`)

**Ligar protocolos ao Playbook 2.0** com campos:

- `playbook_ref`: código do protocolo no Work-Wellbeing Playbook
- `targets_perma`: pilares PERMA que o protocolo visa
- `targets_strengths`: forças VIA-T que o protocolo ativa

---

## 4. Matriz de guardrails — o que NUNCA fazer

| Instrumento | NUNCA                                                                 |
| ----------- | --------------------------------------------------------------------- |
| PERMA       | Mostrar score individual para gestor sem consentimento                |
| COPSOQ      | Misturar com módulos de Domínio A; expor resultados por grupo <5      |
| VIA-T       | Usar em seleção · promoção · demissão · remuneração · ranking público |
| IVO         | Ligar a performance review, promoção ou remuneração                   |
| Todos       | Expor resposta individual; cruzar dados sem base legal                |

---

## 5. Arquitetura de permissões por instrumento

| Quem vê          | PERMA (IVO/Pulse)     | COPSOQ (SST)        | VIA-T                 | Playbook             |
| ---------------- | --------------------- | ------------------- | --------------------- | -------------------- |
| COLABORADOR      | Próprio resultado     | ✗                   | Próprio resultado     | Missões sugeridas    |
| LIDER_EQUIPE     | Agregado equipe (n≥5) | ✗                   | Agregado equipe (n≥5) | Protocolos da equipe |
| RH_ADMIN         | Agregado org          | Agregado org        | Agregado org          | Todos protocolos     |
| CHRO             | Tudo agregado         | Tudo agregado       | Tudo agregado         | Tudo                 |
| C_LEVEL          | Tendência IVO         | Dashboard executivo | ✗                     | ROI dos protocolos   |
| SST_PROFISSIONAL | ✗                     | Completo            | ✗                     | Protocolos Domínio B |

---

## 6. Mensagem central ao produto

> O app separa **o que ameaça** (COPSOQ/NR-1) de **como as pessoas estão** (PERMA/IVO)
> e de **como cada um contribui** (VIA-T). A ação fica no Playbook/Lab.
> Cada camada tem seus dados, sua interface e seu léxico.
> Confundir é passivo regulatório, reputacional e ético.

---

## 7. Referências de arquivo

| Documento               | Local                                              |
| ----------------------- | -------------------------------------------------- |
| Validação PERMA BR 2026 | `docs/instrumentos/PERMA_TRABALHO.md`              |
| VIA-T completo          | `docs/instrumentos/VIA_T.md`                       |
| COPSOQ + NR-1           | `docs/instrumentos/COPSOQ_NR1.md`                  |
| Work-Wellbeing Playbook | `docs/instrumentos/PLAYBOOK.md`                    |
| Framework IVO           | `src/domain/packs/enterprise/ivo-framework.json`   |
| Pack de navegação       | `src/domain/packs/enterprise/enterprise.pack.json` |
