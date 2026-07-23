# PLANO — SAFE-VOICE-BRIDGE §5 · Primeiro Consumidor Real (Consumer-First)

> Data: 2026-07-22 · Status: **PLANEJAMENTO — aguardando autorização para implementar**
> Origem: `docs/ai/nascentes-atlas/SAFE-VOICE-BRIDGE.md` §5 ("Contrato
> `NascentesBridgeEntry` — avaliado, NÃO implementado") + §7 (regra de extensão).
> Gatilho: autorizado pelo founder em 2026-07-22 — abordagem **consumer-first**.
> Escopo desta etapa: **só o plano**. Nenhum código, branch de implementação,
> registry, migration, push, PR, merge ou deploy nesta etapa.

---

## 0. O pedido, resumido

O primeiro consumidor real da ponte NASCENTES é uma **superfície somente
leitura em `/voz-segura`** que responde à pergunta do líder depois de abrir
uma orientação da FlorêncIA:

> **"Por que esta orientação foi recomendada?"**

Este documento desenha essa superfície primeiro, e só depois deriva dela o
contrato de dados mínimo — na ordem inversa da tentação natural (registry
primeiro, UI depois), conforme instruído.

---

## 1. Usuário e decisão que a superfície apoia

**Usuário:** Líder de equipe (`role: "lider"`, segmento `enterprise`) que já
abriu uma orientação da FlorêncIA em `/voz-segura` (hoje, a única capacidade
ativa com template é `prepare_conversation` → drawer "Preparar uma conversa
segura").

**Decisão que a superfície apoia:** não é uma decisão operacional nova — é a
decisão de **confiança em usar a orientação recebida**. O líder já viu o
roteiro (`guidance`) e os limites (`limitations`); a pergunta "por que isso
foi recomendado" é o que separa "instrução de uma caixa-preta" de "instrução
rastreável". Sem essa resposta, o líder só tem duas opções: confiar
cegamente ou desconfiar por padrão. A superfície dá uma terceira via:
verificar.

Não é dirigido a auditor/DPO (esse público já tem o nível "auditoria" do
Evidence Passport) nem a RH/CHRO (fora do escopo desta CTA). É o mesmo
público que já vê o drawer — a explicação é uma extensão do MESMO momento,
não uma nova audiência.

---

## 2. Jornada da superfície

1. Líder está em `/voz-segura`, seção da missão "5 minutos para riscos".
2. Clica no CTA "Preparar uma conversa segura"
   (`FlorenciaSafeConversationEntryPoint` → `CTA-PREPARE-CONVERSATION`).
3. Pipeline atual roda sem mudança: `resolveFlorenciaContext` →
   `evaluatePolicyGate` → `buildResponseTemplate` → `FlorenciaDrawer` abre
   com o resultado (`status: "allowed"`) — evento `orientation_consulted`
   gravado no ActionLog local da rota, como já acontece hoje.
4. **Novo:** dentro do mesmo drawer, ao final do conteúdo (depois de
   "Próximo passo sugerido"), um disclosure fechado por padrão:
   **"Por que esta orientação foi recomendada?"**
5. Líder expande (teclado ou clique) → a superfície mostra, em linguagem
   humana:
   - o mecanismo por trás ("Redução do medo interpessoal" + explicação seca,
     uma frase);
   - a "Nascente" que este mecanismo mapeia, com o qualificador "provisório"
     sempre junto (nunca omitido);
   - a Skill que governa esta capacidade, com o **status honesto**
     (`PARCIAL`, via `StatusBadge` — nunca "verificado por IA");
   - uma frase fixa: "Esta orientação segue uma regra determinística —
     papel, contexto e claim autorizado —, não uma recomendação
     personalizada por IA";
   - um link para o Evidence Passport do estudo-âncora, para quem quiser a
     pergunta seguinte ("e essa evidência, é confiável?").
6. Fechar o disclosure, fechar o drawer: nada é persistido além do que o
   ActionLog já grava no passo 3. Reabrir o mesmo drawer/disclosure não gera
   novo evento (ver §5 e §9.5).

Não há passo 7 — a jornada termina ali. Não navega para nenhuma rota nova,
não abre formulário, não coleta input.

---

## 3. Elos mínimos da ponte necessários

Auditei o que a jornada do §2 realmente precisa — não o modelo conceitual
inteiro de 13 elos do §4 do SAFE-VOICE-BRIDGE.md. Resultado, elo a elo:

| Elo necessário | Já existe hoje? | Onde |
| --- | --- | --- |
| Qual mecanismo esta orientação usa | **Sim, mas não chega à superfície** | `ResolvedFlorenciaContext.entityRefs` (`["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999"]`) — computado em `cta-resolution.ts`, descartado quando `buildResponseTemplate` projeta só um subconjunto em `FlorenciaResponseTemplateResult` |
| Nome e explicação do mecanismo | Sim | `mechanism-registry.json` (`MECH-VOICE-001.name` + `.safe_explanation`) |
| Nascente do mecanismo | Sim (provisório) | `mechanism-registry.json` (`MECH-VOICE-001.nascente = "seguranca"`) |
| Qual claim sustenta | Sim, já chega | `FlorenciaResponseAllowed.usedClaimIds` |
| Qual estudo por trás do claim | Sim | `resolveCanonicalStudy`/`resolveStudy` (`passport-engine.ts`), já usado em `/voz-segura` |
| Qual Skill governa | **Sim, mas não chega à superfície** | `ResolvedFlorenciaContext.candidateSkillIds` — mesmo caso do entityRefs |
| Status honesto da Skill | Sim | `resolveSkillStatusMap()` (Truth Layer, Onda 5) — já importado em `FlorenciaSafeConversationEntryPoint.tsx` |
| Qual modo M.E.T.E. | **Sim, mas não chega à superfície** | `ResolvedFlorenciaContext.mode` (derivado por `resolveMode`, nunca declarado) |
| Ligação NOMEADA templateId → mecanismo | **Não — é o único elo genuinamente ausente** | Hoje só existe *implícita* dentro do `entityRefs` da CTA; nenhum contrato testado garante que ela não diverge se a CTA mudar |

**Achado central desta seção:** dos 9 elos que a jornada precisa, **8 já
existem** em registries congelados e só não atravessam a fronteira
`context → result` porque `buildResponseTemplate` não os projeta. O único
elo que falta de verdade é o 9º — uma ligação **nomeada e testada** entre
`templateId` e `mechanism_id`, hoje apenas implícita dentro de uma string de
`entityRefs`. Isso muda a arquitetura proposta no §4: não é preciso um
registry com 13 campos (o `NascentesBridgeEntry` original, corretamente
adiado) — é preciso, na pior hipótese, um registry de **2 campos**.

---

## 4. Dados permitidos e proibidos

### Permitidos (todos já existentes, nenhum novo claim/evidência)
- `mechanism_id`, `name`, `safe_explanation`, `nascente` (de `mechanism-registry.json`)
- `usedClaimIds` → `safe_claim` (via `ClaimRecord`, já exibido em outro lugar)
- `study_id` → citação (via `EvidenceStudy.canonical_citation`, para o link ao Passport — não para reexibir o passaporte inteiro)
- `mode` (M.E.T.E., derivado — nunca declarado)
- `skill_id` + status honesto (`resolveSkillStatusMap()`)
- `templateId` (já público, usado como chave)

### Proibidos (nunca entram nesta superfície)
- Qualquer resposta individual, nome de pessoa, conteúdo de conversa.
- Qualquer score, contagem ou recorte com n < 5 (não aplicável aqui — a
  superfície não mostra dado agregado nenhum, só metadado de roteamento).
- Qualquer claim novo ou reescrito — só reproduz `safe_claim` já congelado.
- Qualquer texto que sugira personalização por IA, aprendizado de máquina ou
  inferência sobre o usuário — a frase fixa do §2 passo 5 existe
  precisamente para fechar essa porta.
- Qualquer afirmação de causalidade, eficácia ou resultado — a superfície
  explica **roteamento** (por que isto foi escolhido), nunca **efeito**
  (o que isto vai causar).
- `evidence_recorded`: abrir esta explicação NUNCA gera esse kind de evento
  (ver §5).

---

## 5. Comportamento fail-closed

Cada elo do §3 tem um dono canônico. Se qualquer lookup falhar, a regra é
**esconder o dado, nunca adivinhar ou mostrar "—"**:

- `mechanism_id` referenciado em `entityRefs` mas ausente em
  `mechanism-registry.json` → a seção inteira do mecanismo não renderiza
  (fail-closed no nível do bloco, não do campo).
- `skill_id` ausente em `resolveSkillStatusMap()` → mesmo piso já aplicado em
  toda a Truth Layer (Onda 5): trata como **DEMO** por elo mais fraco, nunca
  eleva.
- `usedClaimIds` vazio (não deveria acontecer em `status: "allowed"`, mas
  defesa em profundidade) → a seção de claim não renderiza.
- Nenhum dos elos disponível → o disclosure inteiro **não aparece** (sem
  link "Por que esta orientação foi recomendada?" nenhum) — never um
  disclosure vazio ou com erro visível.
- O registry novo (§ arquitetura) é `frozen: true` e a paridade contra a
  fonte (`cta-registry.json` + `mechanism-registry.json`) é testada — igual
  ao padrão já usado 2x nesta sessão (`skill-status-projection.json`,
  `copsoq-instrument-manifest.json`).

---

## 6. Diferenciação em relação ao Evidence Passport

| | **Evidence Passport** (já existe) | **Painel "Por que foi recomendado"** (novo) |
| --- | --- | --- |
| Pergunta que responde | "Quanto posso confiar **neste estudo**?" | "Por que **esta orientação, para mim, agora**?" |
| Unidade | Um estudo (`EvidenceStudy`) | Uma orientação consultada (`templateId` + contexto resolvido) |
| Profundidade | 3 níveis progressivos (humano/profissional/auditoria) | 1 nível único — não é sobre profundidade técnica, é sobre rastreabilidade da escolha |
| Reusabilidade | Reaproveitado em qualquer trilha que cite o estudo | Específico da orientação que acabou de ser consultada |
| Relação entre os dois | — | **Linka para** o Passport do estudo-âncora quando o líder quiser aprofundar a pergunta de confiança |

Sem essa diferenciação escrita em código, o risco natural é o painel virar
"Evidence Passport de novo, com outro nome". A blindagem de construção: o
painel **nunca** reimplementa o seletor de 3 níveis nem duplica
`buildPassport()` — ele **compõe** um link para o Passport já existente, não
o substitui.

---

## 7. Separação entre orientação consultada / ação executada / evidência registrada / resultado observado

Estes 4 conceitos já existem como `ActionLogEventKind` distintos — a
superfície nova não cria nenhum kind novo, só respeita a separação que já
está travada em `action-log-engine.ts`:

| Conceito do pedido | `ActionLogEventKind` já existente | Quem grava, quando |
| --- | --- | --- |
| Orientação consultada | `orientation_consulted` | `handleFlorenciaInteraction` em `voz-segura.tsx`, quando o drawer abre com `status: "allowed"` (já acontece hoje) |
| Ação executada | `status_change` (`toStatus: em_execucao/concluida/...`) | `startMission`/`decideCycle`, quando o líder de fato começa/conclui a missão |
| Evidência registrada | `evidence_recorded` | Reservado para prova de execução real (ex.: rodada com registro formal) — **não usado por esta superfície** |
| Resultado observado | `checkin` (+ `computeEvolveIndicators`) | `registerRound`, quando o líder registra uma rodada (participantes, riscos, decisões) |

**Regra de construção desta onda:** abrir o painel "por que foi
recomendado" **não gera nenhum evento novo** — nem um segundo
`orientation_consulted` (a consulta já foi registrada quando o drawer abriu
no passo 3 da jornada), nem `evidence_recorded` (explicitamente proibido no
pedido). O painel é uma **leitura sobre um evento já registrado**, não um
evento em si. Isso evita inflar `evidenceCountByAction`/telemetria com
"cliques de curiosidade" que não são nem orientação nova nem execução.

---

## 8. Critérios de acessibilidade

- Disclosure nativo (`<details>`/`<button aria-expanded>`, mesmo padrão do
  `EvidenceExplorerCard` desta sessão) — operável por teclado sem
  JavaScript extra, `focus-visible` com anel visível.
- Estado fechado por padrão: não empurra o conteúdo principal do drawer para
  fora da viewport inicial.
- Texto do gatilho descreve exatamente o que abre ("Por que esta orientação
  foi recomendada?") — nunca "Saiba mais" genérico.
- Badge de status da Skill (`StatusBadge`) mantém o mesmo contraste e
  semântica já auditados no resto do produto — sem cor nova inventada.
- `prefers-reduced-motion` respeitado (reaproveita a mesma disciplina do
  `A11yProvider` já existente — sem animação de expand/collapse além do
  `Sheet` que já anima).
- Link para o Evidence Passport é um controle real (`<a>`/`<button>` com
  destino claro), nunca texto que parece link mas não é.
- Mobile: o painel vive dentro do `Sheet` que já é full-height em mobile —
  sem novo teste de viewport além do que `FlorenciaDrawer` já cobre.

---

## 9. Critérios de aceite

1. O painel só aparece quando **todos** os elos do §3 resolvem (fail-closed
   por bloco, §5).
2. Nenhum claim novo é criado; todo texto vem de `safe_claim` já congelado
   ou de campos textuais já existentes em `mechanism-registry.json`.
3. A palavra "Nascente" nunca aparece sem o qualificador "provisório" (ou
   equivalente) ao lado.
4. O status da Skill exibido vem de `resolveSkillStatusMap()` — nunca
   digitado, nunca "verificado" sem essa derivação.
5. Abrir o painel não grava nenhum `ActionLogEvent` novo (nem
   `orientation_consulted` duplicado, nem `evidence_recorded`).
6. Nenhuma resposta individual, score ou recorte n<5 aparece — a superfície
   é 100% metadado de roteamento, zero dado agregado de pesquisa.
7. O painel nunca duplica o seletor de 3 níveis do Evidence Passport —
   compõe (linka), não reimplementa.
8. `registry` novo (se adotado — ver arquitetura) é `frozen: true`, testado
   em paridade contra `cta-registry.json`/`mechanism-registry.json`, e
   qualquer script de sync segue o padrão de
   `sync-skill-status-projection.ts`.
9. Nenhum arquivo de engine importa `src/domain` (regra inviolável 1).
10. 4 estados cobertos: painel presente (dados completos) / painel ausente
    (fail-closed, §5) / vazio nunca ocorre como estado próprio (é o mesmo
    que "ausente") / mobile (herdado do `Sheet`).

---

## 10. Riscos de overclaim

| Risco | Mitigação nesta arquitetura |
| --- | --- |
| Mostrar a Skill sugere "aprovado por IA" | `StatusBadge` sempre visível junto (PARCIAL, nunca escondido); frase fixa "regra determinística, não recomendação personalizada" |
| "Nascente" lida como taxonomia científica estabelecida | Qualificador "provisório" obrigatório, sempre — trava no próprio texto do componente, não deixado a critério de quem editar depois |
| Painel confundido com prova de eficácia | Linguagem estritamente de **roteamento** ("por que isto foi escolhido"), nunca de **efeito** ("o que isto vai mudar") — vocabulário differente do painel ESG/reavaliação |
| Vira um "Evidence Passport 2" que infla a superfície | Diferenciação do §6 testada: nenhum teste do painel pode reproduzir a lógica de 3 níveis; se um PR tentar, o teste de "não duplica" falha |
| `mechanism_id` de uma CTA futura sem entrada no registry novo é tratado como bug silencioso | Fail-closed do §5: ausência de linha = painel não aparece, nunca erro visível nem dado inventado |
| Uso deste painel vira precedente para "explicar" qualquer coisa do produto sem o mesmo rigor | Este documento e a Onda futura de extensão (§7 do SAFE-VOICE-BRIDGE.md) exigem que cada nova entrada seja verificada linha a linha — nunca derivação automática |

---

## 11. Alternativas consideradas (Tree of Thoughts)

| Alternativa | Síntese | Veredito |
| --- | --- | --- |
| **A. Implementar o `NascentesBridgeEntry` completo (13 campos) agora** | O contrato original do superprompt, já avaliado e adiado no §5 do SAFE-VOICE-BRIDGE.md | **Rejeitada** — o founder pediu explicitamente para não construir um registry completo antecipadamente; a auditoria do §3 mostra que 8/9 elos já existem em outro lugar |
| **B. Zero registry novo — projetar `entityRefs`/`mode`/`candidateSkillIds` direto no resultado e derivar tudo ad-hoc no componente** | Mais enxuto possível; mas deixa a ligação `templateId → mechanism_id` implícita dentro de uma string de `entityRefs`, sem teste de paridade próprio — se a CTA mudar de mecanismo, nada quebra visivelmente | **Considerada, não recomendada** — viola o espírito do §5 do SAFE-VOICE-BRIDGE.md, que pede uma ligação **nomeada e testada**, não apenas presumida de uma convenção de string |
| **C. Registry de projeção mínima (2–4 campos), gerado por script, mesmo padrão de `skill-status-projection.json`/`copsoq-instrument-manifest.json`** | Nomeia a ligação que falta, sem duplicar nenhum dado que já existe; extensível linha a linha (§7 do SAFE-VOICE-BRIDGE.md); mesmo padrão já validado 2x nesta sessão | **Recomendada** |
| **D. Reabrir o Evidence Passport e adicionar um 4º nível "roteamento"** | Reusaria UI existente | **Rejeitada** — contraria o pedido explícito de diferenciação (§6); misturaria "confiança na evidência" com "por que fui roteado aqui", perguntas de natureza diferente |
| **E. Painel como rota nova (`/voz-segura/por-que`)** | Deep-link compartilhável | **Rejeitada** — sobre-engenharia para uma explicação contextual de um drawer já aberto; não pedido, não necessário |

---

## 12. Arquitetura proposta

```
CTA click (já existe)
  → resolveFlorenciaContext() [já existe, já computa entityRefs/mode/candidateSkillIds]
  → evaluatePolicyGate()      [já existe]
  → buildResponseTemplate()   [MODIFICADO: projeta 2 campos novos, ambos já
                                computados em context, nunca recalculados]
       result.entityRefs  ← context.entityRefs
       result.mode        ← context.mode
  → FlorenciaDrawer (AllowedState)
       [NOVO] <OrientationExplainDisclosure result={result} />
                → orientation-explain-engine.ts (NOVO, puro)
                     input:  result.entityRefs, result.usedClaimIds, result.templateId
                     lookups: orientation-bridge-projection.json (NOVO, frozen)
                              mechanism-registry.json (existente)
                              claim-registry.json / evidence-registry.json (existentes)
                              skill-status-projection.json (existente, Onda 5)
                     output: ExplainPanelData | null (null = fail-closed, §5)
```

- **Engine ≠ Domínio preservado:** `orientation-explain-engine.ts` recebe os
  registries por parâmetro (mesmo padrão de `pgr-document-engine.ts`,
  `evidence-explorer-engine.ts`); quem importa os JSONs é a camada de
  aplicação (`voz-segura.tsx` ou o próprio `FlorenciaDrawer`, a decidir na
  fatia de implementação).
- **Registry novo é gerado, não editado à mão** — script
  `sync-orientation-bridge-projection.ts` deriva as linhas a partir de
  `cta-registry.json` (campo `entityRefs`) + `mechanism-registry.json`,
  igual ao padrão de `sync-skill-status-projection.ts`/
  `sync-copsoq-manifest.ts`. Isso faz a "ligação nomeada" ser **verificada
  por máquina**, não apenas presumida.
- **Uma linha hoje:** `prepare-safe-conversation-v1 → MECH-VOICE-001`. As
  outras 3 templates existentes (`suggest-observation-v1`,
  `create-team-mission-v1`, `organize-evidence-v1`) **não** ganham linha
  nesta etapa — só entram quando alguém verificar o mapeamento delas contra
  mecanismo real, uma a uma (§7 do SAFE-VOICE-BRIDGE.md). Sem linha =
  painel não aparece para essas 3 (fail-closed).

---

## 13. Campos mínimos do registry novo

```jsonc
// src/domain/florencia/orientation-bridge-projection.json (proposto)
{
  "$schema": "./orientation-bridge-projection.schema.json",
  "projection": "Orientation → Mechanism Bridge Projection",
  "description": "Ligação nomeada e testada entre templateId (response-templates.ts) e mechanism_id (mechanism-registry.json), para a superfície 'por que esta orientação foi recomendada' de /voz-segura. Gerado por scripts/sync-orientation-bridge-projection.ts a partir de cta-registry.json (entityRefs) — divergência quebra o gate. Extensão linha a linha, nunca derivação automática (SAFE-VOICE-BRIDGE.md §7).",
  "frozen": true,
  "sourceRegistry": "src/domain/florencia/cta-registry.json",
  "generatedAt": "AAAA-MM-DD",
  "entries": [
    {
      "template_id": "prepare-safe-conversation-v1",
      "mechanism_id": "MECH-VOICE-001"
    }
  ]
}
```

Dois campos por linha. Nada além disso — `name`, `safe_explanation`,
`nascente` continuam vivendo só em `mechanism-registry.json` (zero
duplicação); o registry novo é puramente a ligação que faltava.

---

## 14. Mock da experiência textual

Dentro do `FlorenciaDrawer`, depois de "Próximo passo sugerido":

```
──────────────────────────────────────────────
▸ Por que esta orientação foi recomendada?
──────────────────────────────────────────────

(ao expandir)

MECANISMO POR TRÁS

Redução do medo interpessoal
Ambientes em que perguntar, discordar e admitir erro recebem
resposta não punitiva favorecem comportamentos de aprendizagem —
e os problemas aparecem cedo, enquanto ainda são baratos de corrigir.

Mapeado à Nascente "Segurança" (nome provisório do NASCENTES_ATLAS v0.9 —
ainda não é uma taxonomia final).

GOVERNANÇA DESTA CAPACIDADE

Skill responsável: Facilitação de Conversas · status PARCIAL
[reaproveita o mesmo StatusBadge do resto do produto]

Esta orientação segue uma regra determinística — papel, contexto
e claim autorizado —, não uma recomendação personalizada por IA.

Quer verificar a evidência científica em si?
→ Ver o Evidence Passport do estudo-âncora
```

Nenhuma frase acima é nova texto solto — "Redução do medo interpessoal" e a
explicação vêm literalmente de `mechanism-registry.json`; a frase
determinística é fixa (mesma para toda orientação, não varia por conteúdo).

---

## 15. Arquivos previstos (implementação futura, NÃO criados nesta etapa)

- `src/domain/florencia/orientation-bridge-projection.json` (novo)
- `src/domain/florencia/orientation-bridge-projection.schema.json` (novo)
- `scripts/sync-orientation-bridge-projection.ts` (novo)
- `src/engine/florencia/orientation-explain-engine.ts` (novo, puro)
- `src/engine/florencia/orientation-explain-engine.test.ts` (novo)
- `src/features/florencia/components/OrientationExplainDisclosure.tsx` (novo, presentacional)
- `src/features/florencia/components/OrientationExplainDisclosure.test.tsx` (novo, DOM)
- `src/engine/florencia/response-templates.ts` (modificado — +2 campos aditivos em `FlorenciaResponseAllowed`)
- `src/engine/florencia/response-templates.test.ts` (modificado — cobre os 2 campos novos)
- `src/features/florencia/components/FlorenciaDrawer.tsx` (modificado — monta o disclosure em `AllowedState`)

---

## 16. Testes previstos

- **`orientation-explain-engine.test.ts`**: fail-closed por elo ausente
  (mechanism_id sem linha no registry → null; skill_id sem entrada no
  skill-status-projection → trata como DEMO, nunca eleva; usedClaimIds vazio
  → null); paridade feliz (a única linha real resolve para o mecanismo/
  nascente/skill corretos); nunca inventa string fora do que os registries
  fornecem.
- **`orientation-bridge-projection.test.ts`**: valida contra o schema (Ajv);
  `frozen: true`; toda `template_id` referenciada existe em
  `response-templates.ts`; toda `mechanism_id` referenciada existe em
  `mechanism-registry.json`; paridade com `cta-registry.json` (mesmo padrão
  de `copsoq-instrument-manifest.test.ts`).
- **`OrientationExplainDisclosure.test.tsx`**: fechado por padrão; expande
  por teclado e clique; some por completo quando o engine devolve null
  (fail-closed); nunca renderiza um 3º nível de leitura (guarda a
  diferenciação do §6); link para o Passport aponta para o estudo correto;
  badge de status da Skill usa o mesmo componente `StatusBadge`.
- **`response-templates.test.ts`** (extensão): `result.entityRefs` e
  `result.mode` refletem exatamente `context.entityRefs`/`context.mode`,
  sem transformação.
- **Integração em `voz-segura.tsx`** (manual/preview): abrir o drawer,
  expandir o painel, confirmar zero evento novo no ActionLog local (contar
  `logEvents.length` antes/depois de expandir).

---

## 17. Plano em fatias (cada uma exige autorização própria)

- **Fatia A — engine + registry**: `orientation-bridge-projection.json` +
  schema + script de sync + `orientation-explain-engine.ts` + testes do
  motor. Zero UI.
- **Fatia B — extensão do tipo existente**: `response-templates.ts` ganha
  `entityRefs`/`mode` em `FlorenciaResponseAllowed`; testes de paridade
  contexto→resultado.
- **Fatia C — UI**: `OrientationExplainDisclosure.tsx` + wiring no
  `FlorenciaDrawer.tsx` + testes DOM + verificação ao vivo em `/voz-segura`
  (contagem de eventos do ActionLog antes/depois, confirmando §7).
- **Fatia D — governança**: atualizar `SAFE-VOICE-BRIDGE.md` (§5 deixa de
  dizer "avaliado, não implementado"; nova linha na tabela de status) e o
  `learning-dynamics-registry.json` se alguma dinâmica referenciar este
  consumidor.

Sem push/PR/merge/deploy em nenhuma fatia sem autorização explícita —
mesma disciplina desta sessão inteira.

---

## 18. Addendum (2026-07-22) — checkpoint arquitetural da Fatia A: vínculo `templateId → mechanismId`

Autorização controlada da Fatia A exigiu decidir, antes de implementar, entre:

- **A. Campo `mechanismId` na própria definição canônica do template**
  (`TemplateSpec` em `response-templates.ts`).
- **B. Projeção separada `templateId → mechanismId`** (o registry gerado
  proposto no §12/§13 acima, mesmo padrão de
  `skill-status-projection.json`/`copsoq-instrument-manifest.json`).
- **C. Inferir por parsing de `entityRefs`** — proibida pelo founder.

**Decisão: Opção A.**

**Justificativa:** o mecanismo é propriedade intrínseca e estável do
template, não um dado externo que evolui independentemente:

1. O texto de `guidance`/`limitations` de cada template já é escrito **para
   operacionalizar um mecanismo específico** — mudar o mecanismo sem mudar o
   texto do template quebraria a coerência editorial; eles nascem e mudam
   juntos, pela mesma pessoa, no mesmo commit. Isso é diferente do padrão
   dos outros dois registries de projeção desta sessão (skill status e
   manifesto COPSOQ), que espelham uma fonte **externa e maior** que muda
   independentemente do código que a consome — não há fonte externa aqui:
   a ligação template↔mecanismo nasce junto com a autoria do template.
2. `TemplateSpec` já guarda `requiredClaimId` como string simples, sem
   importar `domain/` — `mechanismId` segue exatamente a mesma convenção já
   estabelecida no mesmo arquivo. Nenhuma fronteira de domínio é violada
   (o engine continua recebendo os registries por parâmetro; só passa a
   também expor uma segunda âncora de string, já do mesmo jeito que a
   primeira).
3. Evita um arquivo + schema + script de sync inteiros para uma relação
   1-para-1 que hoje tem exatamente **uma linha** e cresce por extensão
   deliberada (SAFE-VOICE-BRIDGE.md §7) — overhead de governança
   desproporcional ao dado.

**Consequência no escopo:** o item 2 do escopo original ("schema e loader
readonly/deep-frozen, caso seja criado registry") não se aplica — nenhum
registry novo é criado. `TEMPLATES` em `response-templates.ts` passa a ser
deep-frozen no load do módulo (mesma disciplina de imutabilidade dos outros
registries), e um novo acessor `getTemplateAnchors(templateId)` expõe o
vínculo de forma explícita e testável — essa função, não uma string
implícita em `entityRefs`, é o "vínculo canônico e explícito" pedido.

A validação de integridade referencial (item 3 do escopo) migra para: (a) um
teste de paridade que confirma que todo `mechanismId` declarado em
`TEMPLATES` existe em `mechanism-registry.json`; (b) uma extensão pontual de
`validateMechanisms()` (`passport-engine.ts`) para recusar `mechanism_id`
duplicado — lacuna que já existia nesse validador antes desta onda.

---

*Fim do plano. Fatia A autorizada e em andamento.*
