# Work-Wellbeing Playbook 2.0 — Gamified Learning OS (integração VitalOS)

> Como os dois documentos WWP (Full Deck + spec JSON PatchPack v1.1.0) entram no
> VitalOS. Resposta curta: **enriquecem os eixos Educar e Transformar** — não criam
> eixo novo. O que existia raso (Academia, plano de ação) ganha ciência da
> aprendizagem; nenhuma marca de terceiros é importada.

---

## 1 · O que cada documento é (honestidade de categoria)

| Documento                      | Natureza                                                                                                | Uso no VitalOS                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **WWP Full Deck** (PDF, 36 p.) | Base científica aberta (World Wellbeing Movement / Oxford / Indeed) — 12 drivers.                       | Confirma a ciência já citada em `PLAYBOOK.md`. Não adiciona arquitetura.         |
| **WWP JSON PatchPack v1.1.0**  | Especificação de **contratos de dados** stack-agnóstica (schemas, catálogos, algoritmos, regras de QA). | Transposta para TypeScript puro, sem dependência externa. É o documento valioso. |

---

## 2 · As 9 dinâmicas → eixos M.E.T.E.

Destiladas em `src/mocks/learning-dynamics-mock.ts`, organizadas pelo
`src/engine/learning/learning-dynamics.ts`. Cada uma **enriquece uma rota existente**.

| ID  | Dinâmica                      | Eixo        | Enriquece       | Base científica                 |
| --- | ----------------------------- | ----------- | --------------- | ------------------------------- |
| D1  | Quiz de Verificação           | Educar      | `/academia`     | Roediger & Karpicke (2006)      |
| D2  | Cartões c/ Repetição Espaçada | Educar      | `/academia`     | Woźniak (1990) — SM-2           |
| D3  | Videolab Guiado               | Educar      | `/academia`     | Mayer (2009); Sweller (1988)    |
| D4  | Explorador de Evidências      | Educar      | `/academia`     | Catálogo WWP (12 drivers)       |
| D6  | Pausa Reflexiva               | Educar      | `/academia`     | Craik & Lockhart (1972)         |
| D5  | Plano de 90 Dias              | Transformar | `/prioridades`  | Gollwitzer (1999)               |
| X1  | Simulador de Decisões         | Transformar | `/trajetoria`   | Ericsson (2008); Kolb (1984)    |
| X2  | Estúdio de Co-design          | Transformar | `/experimentos` | Papert (1980); Edmondson (1999) |
| X3  | Arena Socrática               | Transformar | `/lab`          | Kuhn (1991)                     |

> Educar concentra **aquisição**; Transformar concentra **aplicação**. Medir e Evoluir
> são tocados de leve (evidências, gates de QA), não recebem dinâmicas próprias.

---

## 3 · SM-2 — o único algoritmo genuinamente novo

`src/engine/learning/sm2-engine.ts` (puro, testado em `sm2-engine.test.ts`).

- Fonte: P. A. Woźniak, _Optimization of learning_, SuperMemo (1990). Domínio público.
- Entrada: autoavaliação de recordação `q ∈ [0,5]`. `q < 3` → reaprender (n=0, I=1).
- Acerto: I(1)=1, I(2)=6, I(n)=round(I(n-1)·EF). EF começa 2.5, piso 1.3.
- O intervalo usa o EF **anterior** à atualização (fidelidade ao SM-2 original).
- `summarizeDeck` dá leitura honesta (fresh/young/mature) sem inferir "quanto sabe".

**Invariantes respeitados:** o estado do baralho é do aprendiz; nunca alimenta
desempenho/promoção (§9.6); agregação organizacional exige k-anon ≥ 5 (§9.5);
não é psicometria nem diagnóstico (§8).

---

## 4 · Economia de gamificação (IFT → adaptação)

A moeda WWP (IFT, não-monetária) e suas `anti_toxicity rules` já são **compatíveis** com
o cânone VitalOS — confirmam, não conflitam:

| Regra WWP                             | Invariante VitalOS                             |
| ------------------------------------- | ---------------------------------------------- |
| `no_individual_leaderboards`          | k-anon ≥ 5; nunca ranking (§9.10)              |
| `no_public_shaming` / `opt_in_cohort` | consentimento explícito; reconhecimento opt-in |
| XP não-monetário                      | XP/IVO jamais ligados a remuneração (§9.6)     |
| `privacy_first`                       | LGPD by design                                 |

As regras de earning por dinâmica (EARN-QUIZ, EARN-VIDEO…) entram como extensão do
`engine/gamification/` existente — **não** como novo silo. Nomes de marca (IFT, AlegrIA)
**não** migram.

---

## 5 · RAG + gates de QA (Fase 2)

- `evidence_catalog` (108 itens, 9/driver, DOIs) → enriquece a base do Copiloto Setorial
  (`mocks/copilot-knowledge.ts`), preservando grounding + citações.
- Pipeline RAG (chunking 1200, top_k=8, verificação diária de links) → spec para a edge
  function da Fase 2, **não** para o cliente.
- Gates G1–G5: G1 (sem referência alucinada) e G4 (k-anon/LGPD) **já** implementados no
  grounding-engine; G2/G3/G5 a formalizar.

---

## 6 · O que NÃO migrar

- `ui/design_tokens.json` (#0B1020/#55C7CF) — VitalOS usa tokens oklch (§7).
- `ui/routes.json` — VitalOS usa TanStack Router file-based, não React Router.
- Nomes de marca de terceiros (IFT, AlegrIA, MaestrIA…).
- Auth/billing — Fase 2 (Lovable Cloud / RLS).

---

## 7 · Roadmap

- **Edu-1 ✅** — `sm2-engine.ts` + testes; `learning-dynamics.ts` + mock; esta doc.
- **Edu-2 ✅** — `driver-pillar-bridge.ts` + testes; `wwp-drivers-mock.ts` (7 drivers →
  pilares IVO enterprise). Fecha o loop **Medir → Educar**: o IVO agregado reordena os
  cartões pelos pilares de menor leitura (com k-anon respeitado: pilar n<5 não prioriza).
- **Edu-3 ✅ (parcial)** — `FlashcardDeck.tsx` (flip 3D acessível, teclado, 4 estados) +
  rota focada `/revisar` (sessão efêmera, adaptativa, pack-aware). Falta wiring de nav e
  `QuizInline` / `Evidence Explorer` na `/academia` (lane Lovable).
- **Edu-4** — estender 7 → 12 drivers; mapear demais packs (escola/governo/etc.);
  chunks de evidência no Copiloto; formalizar gates G2/G3/G5 em `qa-gates.ts` (Fase 2).
