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

## 5 · RAG + gates de QA

- `evidence_catalog` → enriquece a base do Copiloto (`mocks/copilot-knowledge.ts`): **7 chunks
  de driver citáveis** (um por driver WWP), universais aos 5 packs, preservando grounding +
  citações. O Copiloto agora responde "como melhorar X?" com ciência aterrada e fonte (Edu-4b ✅).
- Pipeline RAG (chunking 1200, top_k=8, verificação diária de links) → spec para a edge
  function da Fase 2, **não** para o cliente.
- Gates G1–G5: G1 (sem referência alucinada) e G4 (k-anon/LGPD) **já** no grounding-engine.
  **G2/G3/G5 formalizados** em `engine/ai/qa-gates.ts` (Edu-4c ✅) — validador puro de um
  `CopilotTurn`: G2 integridade de citação, G3 conformidade k-anon (sem vazamento sub-k),
  G5 honestidade de método (sem overclaim, negação-aware). O teste de fechamento prova que o
  próprio `copilot-engine` passa os gates em toda combinação POV × bateria. Na Fase 2, é o
  contrato que a saída do LLM real terá de passar antes de chegar ao usuário.

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
- **Edu-3 ✅** — `FlashcardDeck.tsx` (flip 3D acessível, teclado, 4 estados) + rota focada
  `/revisar` (sessão efêmera, adaptativa, pack-aware) + seção **"Dinâmicas de aprendizagem"**
  na `/academia` (D2 ao vivo → `/revisar`; D1/D3/D4/D6 "em breve", honestas). Falta só o wiring
  de nav no AppShell (lane Lovable). Bônus: corrigido loop infinito de render do `/copilota`
  (seletor Zustand devolvia array novo — `EMPTY_THREAD` estável).
- **Edu-4 ✅ (parcial)** — **4a** mapa driver→pilar nos 5 packs (`wwp-drivers-mock`) + guard de
  integridade referencial; **4b** 7 chunks de driver no Copiloto; **4c** gates G2/G3/G5
  (`qa-gates.ts`). **Falta:** estender 7 → 12 drivers (+5 flashcards e chunks) — expansão de
  conteúdo, não de arquitetura.
