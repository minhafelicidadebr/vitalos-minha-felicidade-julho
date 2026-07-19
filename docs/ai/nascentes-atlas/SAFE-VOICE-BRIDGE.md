# NASCENTES_ATLAS v0.9 — SAFE-VOICE-BRIDGE

**Onda 4C · subetapa documental · Status: PROVISÓRIO**
**Caso único mapeado:** Voz Segura → Liderança → Preparar uma conversa segura
**Decisão de forma:** documento (caminho A), contrato conceitual do caminho D — ver §3.
**Baseline deste documento:** `main` = `71d9f77` (2026-07-18).

---

## 1 · O que este documento é — e o que ele não é

NASCENTES_ATLAS v0.9 é uma **camada metodológica provisória** que organiza
mecanismos, capacidades, lentes, modos M.E.T.E. e intervenções possíveis.
Nada além disso. Explicitamente, NASCENTES **não** é:

- novo construto científico universalmente validado;
- diagnóstico ou escala psicométrica;
- causalidade comprovada;
- substituto da evidência ou do claim;
- nova taxonomia normativa;
- classificação individual de pessoas.

Toda linha deste documento referencia artefatos canônicos que **já existem
no repositório** — nenhum dado é duplicado aqui, nenhuma evidência é
inventada, nenhum claim novo é criado. Quando este documento e o código
divergirem, o código e os registries congelados são a fonte da verdade e
este documento está desatualizado.

## 2 · Baseline e deltas em relação ao superprompt original

O superprompt da Onda 4C (seção 7 do handoff `PASSAGEM_BASTAO_ONDA4B_PARA_4C_2026-07-15.md`)
foi escrito quando a `main` estava em `8de62b0`. Entre aquele baseline e o
baseline real deste documento (`71d9f77`), a onda **Convergência de
Evidências** (2026-07-18, autorizada pelo founder corte a corte) mudou
legitimamente parte do estado que o superprompt descrevia:

| Item do superprompt (em 8de62b0) | Estado real em 71d9f77 |
| --- | --- |
| "ActionLog: não integrado" | Integrado para orientações da FlorêncIA: evento `evidence_recorded` com `evidenceRef` (templateId) + `evidenceClaimIds` (ver §6) |
| "conteúdo atual: DEMO" | Mantido DEMO — inalterado |
| 1 CTA ativa (prepare) | 5 CTAs governadas ativas, 4 templates determinísticos (`explain_mechanism` segue sem template por design — superfície é o passaporte) |
| Claim Registry "REAL para Voz Segura" | v1.0.0 **congelada** (frozen + validador); expansão v1.1.0 para o corpus completo em branch própria (`feat/claim-registry-v1-1-corpus`), aguardando merge |
| "quatro capacidades adicionais: PLANNED" | As 4 CTAs restantes do registry foram ativadas com templates governados na onda autorizada — as capacidades PLANNED do skill-registry seguem inativas |
| LLM/RAG/embeddings inexistentes | Inalterado — tudo determinístico |

As proibições do superprompt para **esta subetapa** foram todas respeitadas:
este documento não cria UI, CTA, ActionLog, banco, migration, embeddings,
RAG, LLM, claim, Skill ou capacidade nova.

## 3 · Decisão registrada (Tree of Thoughts resumido)

Alternativas avaliadas no reconhecimento (entregue em 2026-07-16, sessão da
validação humana da 4B):

| Caminho | Síntese | Veredito |
| --- | --- | --- |
| A. Taxonomia documental | Rastreabilidade sem runtime; risco: virar letra morta | **Adotado como forma desta subetapa** |
| B. Registry operacional separado | JSON órfão sem consumidor real hoje; schema/paridade/versionamento sem benefício imediato | Adiado — gatilho na Onda 5 (§5) |
| C. Metadado dentro de Claims/Skills | Contamina registries congelados com conceito provisório; acoplamento errado | Rejeitado |
| D. Camada de ligação Evidence↔Claim↔Skill↔M.E.T.E.↔intervenção | O modelo conceitual correto — é o que este documento expressa | **Adotado como conteúdo** (expresso via A) |
| E. Ontologia extensa com RAG | Sobreengenharia; LLM/RAG nem existem no runtime | Rejeitado |

**Decisão:** D como modelo conceitual, materializado documentalmente (A).
Registry operacional (B) só quando existir **consumidor real** — critério
objetivo no §5.

## 4 · O primeiro caminho canônico (verificado no código em 71d9f77)

Cadeia completa, com o artefato real onde cada elo vive:

| # | Elo | Valor canônico | Onde vive | Status |
| --- | --- | --- | --- | --- |
| 1 | Evidence | `TRU-006` (EDMONDSON-1999; aliases LDR-013, VOI-005) · B2 · V1 · E3 · C1 · T3 · L1 · DOI 10.2307/2666999 | `src/domain/evidence/evidence-registry.json` (v1, frozen) | REAL |
| 2 | Claim | `CLAIM-EDMONDSON1999-VOICE-002` · `prepare_conversation` × `preparar-conversa` × lider × enterprise · C1 | `src/domain/evidence/claim-registry.json` (v1.0.0, frozen) | REAL |
| 3 | Mecanismo | `MECH-VOICE-001` — Redução do medo interpessoal (estudos TRU-006 + LDR-007) | `src/domain/evidence/mechanism-registry.json` | REAL |
| 4 | Nascente | `seguranca` (Segurança — NASCENTES v0.9, nome provisório) | campo `nascente` do MECH-VOICE-001 + `nascente_candidates` do TRU-006 + display da trilha | PROVISÓRIO — mapeada, **não** UNMAPPED (convergência de 3 fontes) |
| 5 | Lente | LIDERANÇA | 4 Lentes VITA (pack enterprise) | REAL |
| 6 | Papel | `lider` (autorização de superfície Empresa × Liderança) | claim `role` + entry point da FlorêncIA | REAL |
| 7 | Modo M.E.T.E. | `transformar` — derivado, nunca declarado pelo CTA | `src/engine/florencia/mode-router.ts` (`prepare_conversation → "transformar"`) | REAL |
| 8 | Skill | `SKILL-CONVERSATION-FACILITATOR` (principal) + `SKILL-EVIDENCE-CLAIM-GUARDIAN`, `SKILL-PRIVACY-SAFETY-GUARDIAN` (auxiliares) | `docs/ai/florencia-skills/registries/skill-registry.json` | **PARCIAL** (status registrado da skill principal — não elevar) |
| 9 | Template | `prepare-safe-conversation-v1` (determinístico, guards em ordem fixa) | `src/engine/florencia/response-templates.ts` | REAL (engine) · conteúdo DEMO |
| 10 | CTA / Superfície | `CTA-PREPARE-CONVERSATION` → seção da missão em `/voz-segura` | `src/domain/florencia/cta-registry.json` + `src/routes/voz-segura.tsx` | REAL (wiring) · DEMO (conteúdo) |
| 11 | Intervenção possível | Missão "5 minutos para riscos" + rodadas registradas (projeto 30 dias) | `voz-segura-mock.ts` (`VOZ_SEGURA_MISSION`, `VOZ_SEGURA_PROJECT_30D`) | DEMO |
| 12 | Indicadores | Indicadores de processo: rodadas realizadas, participação média, riscos levantados, decisões — **nunca** indicadores de saúde | `computeEvolveIndicators` em `src/engine/learning/trail-engine.ts` | REAL (engine) · dados de sessão |
| 13 | Rastreabilidade ESG | `ESGT-VOZ-SEGURA-001` — projeto → mecanismo → evidência (via Evidence Passport) → execução (ActionLog) → limitações declaradas · linguagem "mudança observada", nunca impacto garantido | `VOZ_SEGURA_ESG_TRACE` + painel da seção 8 de `/voz-segura` | DEMO |

**Classificação do conteúdo em toda a cadeia: DEMO.** Nenhum elo desta
tabela autoriza claim causal, clínico ou de ROI. O elo mais fraco governa a
comunicação: a Skill principal é PARCIAL e o conteúdo é DEMO — a cadeia
inteira se comunica como demonstração metodológica, nunca como resultado.

## 5 · Contrato `NascentesBridgeEntry` — avaliado, NÃO implementado

O contrato proposto no superprompt foi auditado campo a campo contra o que
já existe. Conclusão: **quase todos os campos já vivem em registries
canônicos** — implementá-lo hoje duplicaria dados congelados:

| Campo proposto | Onde o dado JÁ vive |
| --- | --- |
| `evidenceIds` | `evidence-registry.json` (nó + aliases) |
| `claimIds` | `claim-registry.json` (congelado) |
| `mechanismIds` | `mechanism-registry.json` |
| `nascenteIds` | campo `nascente` do mecanismo (provisório) |
| `lensIds` / `roleIds` | pack enterprise + `role` do claim |
| `meteModes` | `mode-router.ts` (derivado, único lugar) |
| `skillIds` | `skill-registry.json` + `candidateSkillIds` do CTA |
| `templateIds` / `ctaIds` / `routeIds` | `response-templates.ts` + `cta-registry.json` + rota |
| `indicatorIds` / `esgRefs` | `trail-engine.ts` + `VOZ_SEGURA_ESG_TRACE` |
| `classification` / `status` / `limitations` | StatusBadge/doutrina + templates |

O único dado que NÃO existe em lugar nenhum é a **ligação nomeada** entre
tudo isso — exatamente o que a tabela do §4 registra documentalmente.

**Gatilho objetivo para operacionalizar (criar
`src/domain/nascentes/nascentes-bridge-registry.json` + schema + paridade +
testes):** existir um **consumidor de runtime real** — previsto na Onda 5
(Truth Layer) do Plano de Elevação 180%, quando alguma superfície precisar
LER a ponte (ex.: navegar de uma Nascente para todas as suas trilhas).
Antes disso, JSON de ponte seria runtime órfão — proibido pelo critério de
aceite 9.

## 6 · ActionLog — estado atual e limites (era "futuro" no superprompt)

A onda Convergência de Evidências integrou o rastro do copiloto ao
ActionLog (evento `evidence_recorded`, `src/engine/action-plan/action-log-engine.ts`).
O que É registrado hoje, por construção:

- `evidenceRef` = templateId da orientação aberta (referência, nunca conteúdo);
- `evidenceClaimIds` = claim_ids autorizados pelo Policy Gate;
- `actorRole` = papel, nunca nome;
- `note` operacional "requer revisão humana antes de uso real" quando o
  Policy Gate marca `requiresHumanReview`;
- bloqueios NÃO geram evento (um bloqueio não produziu orientação — não há
  o que atestar; decisão documentada no handler da rota).

O que permanece PROIBIDO entrar no ledger, hoje e no futuro: conteúdo da
conversa, falas, nomes, acusações, respostas individuais, inferências,
dados clínicos, texto livre sensível. Finalidade: trilha de auditoria do
uso do copiloto (quais orientações, sob quais claims). Retenção atual:
sessão do navegador (mock-first, sem persistência). Classificação: DEMO.
Vínculo com o ciclo: eventos ancoram na ação da missão (`actionKey`).

## 7 · Regra de extensão da ponte

A segunda entrada (ex.: Voz Segura → `suggest_observation` → Evoluir) e as
seguintes entram **deliberadamente, uma a uma**, cada uma com sua linha
verificada no código — nunca por derivação automática. Uma Nascente só
aparece na ponte se já existir mapeamento legítimo em mecanismo/estudo
(como `seguranca`); caso contrário registra-se **UNMAPPED** com candidata
proposta, mantida provisória e fora do runtime.

## 8 · Critérios de aceite da subetapa — verificação

1. Nenhuma claim nova criada ✔ (documento referencia apenas claims congelados)
2. Nenhuma Skill nova ✔
3. Nenhuma evidência inventada ✔ (todos os IDs verificados no repo em 71d9f77)
4. Nenhuma causalidade declarada ✔ (§4: correlacional, "mudança observada")
5. Nenhuma Nascente ativada sem correspondência ✔ (`seguranca` tem 3 fontes)
6. DEMO preservado ✔ (§4, §6)
7. Domain A ≠ Domain B ✔ (a cadeia inteira vive no Domain A/trilha educativa; indicadores de processo, não COPSOQ)
8. FlorêncIA fora do papel de fonte de evidência ✔ (ela consome claims, nunca os cria — Policy Gate)
9. Nenhum runtime órfão ✔ (decisão documental; gatilho objetivo no §5)
10. ActionLog não implementado NESTA subetapa ✔ (o rastro existente veio da onda autorizada anterior; aqui apenas documentado)
11. Capacidades PLANNED do skill-registry não ativadas ✔
12. Rastreabilidade auditável ✔ (tabela do §4 com arquivo real por elo)
13. Limites declarados ✔ (§1, §4, §6)
14. NASCENTES_ATLAS v0.9 mantido PROVISÓRIO ✔ (cabeçalho e §1)

---

*Documento da Onda 4C (Plano de Elevação 180%, primeiro passo da sequência).
Próximo passo natural da onda: revisão/aceite do founder; depois, na Onda 5
(Truth Layer), avaliar o gatilho do §5 para a versão operacional da ponte.*
