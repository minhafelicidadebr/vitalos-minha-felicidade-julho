# PLANO MENSURAR VIVO 1.0 — Blueprint Premium do Eixo Mensurar (Experiência · Espelho Individual · Vitrine do Bem-Comum)

> **Status:** Proposto (aprovado pelo founder em 2026-07-04 para escrita + 1ª fatia vertical).
> **Fecha a trilogia:** `PLANO_ACADEMIA_VIVA_2.0.md` (Educar) · `PLANO_ARCO_DA_PROVA_1.0.md`
> (Transformar+Evoluir) · **este** (Mensurar) — todos estendendo, nunca quebrando, a espinha
> S6–S8 do `PLANO_MESTRE_EVOLUCAO_VITALOS_2026_2027.md`.
> **Orçamento:** ~900 linhas — maior que os irmãos porque carrega 3 frentes E a resolução
> por extenso da tensão mais delicada da trilogia (Vitrine vs cânone da economia).
> **Etiquetas de evidência:** `Confirmado no código` · `Mockado` · `Proposto`.
> **Doutrina ativa:** `SKILL_MESTRA_FABLE5.md` — ToT §3, composição §5.1, honestidade §8,
> invariantes §9. Nível 3 (Fundacional) do protocolo §0.2.

---

## §0 · Tese e sumário executivo

**A medição que devolve.** O VitalOS mede muito — 4 instrumentos, 4 fluxos de resposta,
k-anonimato sério — e devolve pouco a quem dá o dado: o respondente entrega sua voz e
recebe, no melhor caso, um recibo (excelente, mas só um recibo). O colaborador nunca vê o
próprio perfil PERMA; o VIA-T que ele responde evapora no reload; a "loja" reconhece mas
nada retorna dele para ele. **A inovação do eixo Mensurar não é medir melhor — é devolver
melhor.**

Este blueprint instala o **Contrato de Reciprocidade** — a promessa, exibida em cada ato
de medição e cumprida por mecânica: *"Todo dado que você dá devolve algo a você: um recibo
honesto, um espelho seu se você quiser, uma recomendação sua, e uma retribuição da
instituição ao coletivo."* Quatro atos: **recibo → espelho → bússola → retribuição.**

Dois substratos sustentam tudo:

1. **Os Dois Trilhos** — Trilho A: ondas organizacionais de captura cega (anônimas por
   arquitetura física, intocadas). Trilho B: autoavaliação pessoal identificada, opt-in,
   dona dos próprios dados. **Nada cruza entre trilhos, nunca.**
2. **O Contrato de Reciprocidade** — cada fluxo respondente termina no Recibo Vivo; cada
   autoavaliação termina no Espelho; cada Espelho termina na Bússola; cada resgate
   individual da Vitrine dispara contribuição espelhada ao coletivo.

Fundamento: Gouldner (1960, norma da reciprocidade) e Cialdini — devolver valor a quem deu
dado sustenta participação sem coerção; Kahneman (regra do pico-fim) — o momento FINAL da
experiência de medição domina a memória dela; o fim da survey é o ponto de maior
alavancagem UX do eixo inteiro, e hoje já é o melhor ativo existente (o Recibo).

**Filtro de ouro aplicado:** cada inovação fecha um pedaço do ciclo dar → receber →
crescer → retribuir. A loja de auto-consumo, o ranking de scores pessoais e o dashboard
de gestor sobre dados individuais foram deliberadamente **rejeitados** (§B/§J).

---

## §A · Inventário honesto — o que existe e o que falta

Auditoria desta sessão (2026-07-04), tudo `Confirmado no código`:

### A1 · Ativos (evoluir, não inventar)

| Ativo | Onde | Estado |
|---|---|---|
| 4 fluxos de resposta (demo, onda org, link setorial, quiosque) | `/responder` `/convite/$token` `/respond.s/$token` `/quiosque` | um item/tela, toque ≥44px (56px públicos), progresso sticky, microcopy de confiança em todos |
| **Recibo sem conteúdo** (CaptureReceipt: `contentReturned: false` SEMPRE) | `response-capture-engine.ts` | o ativo mais forte do eixo — pós-submissão honesta |
| Componentes de item compartilhados (ButtonScale/SliderScale, 4 estados) | `responder.tsx` (espelhados nos públicos) | integrados ao A11yProvider (movimento/contraste/fonte) |
| VIA-T individual completo: 24 forças + ICUFT, devolutiva "Meu Mapa" (top 5, radar, missão 7 dias) | `viat-engine.ts` (testado) + `/viat` modo assessment | shapes prontos; **efêmero** |
| Motores de recomendação | `recommendPaths` (prioridade 100 × afinidade 20), `rankDriversByNeed`, `buildDevolutiva` (audiência individual JÁ narra) | prontos para compor — o Espelho é ~80% composição |
| Padrão de persistência pessoal | S5: `sm2_card_state`/`participation_events` (RLS `auth.uid()`, privilégio assimétrico, INSERT-only) | template pronto |
| consent-engine genérico (canais, 50% org + k≥5) | `engine/trust/consent-engine.ts` | canal novo cabe sem mudar core |
| Linguagem dataviz (radar 6 virtudes, radar 4 lentes, heatmap, trend) | `/viat` `/ivo` `/rh` `/evolucao` | Recharts + tokens — herdar |
| `check_in` como event kind (15 XP, 1/dia) | participation-ledger | **sem UI dedicada** (órfão) |
| Pulse 60s (3 itens, rotação pelos pilares mais baixos) | pulse-engine | agregado POR DESIGN — não tocar |

### A2 · Lacunas (as três do mandato + uma descoberta)

1. **Save/resume: NENHUM.** Os fluxos são `useState` puro — refresh perde tudo. O COPSOQ
   tem 22–32 itens; o VIA-T completo, 58. Risco real de abandono e frustração — e a
   persona primária (a operária de 55 anos no celular do quiosque… ou no 4G instável do
   ônibus) é quem mais paga.
2. **PERMA individual NÃO EXISTE.** Os 15 itens alimentam só o IVO agregado; o colaborador
   nunca vê o próprio perfil de florescimento.
3. **VIA-T assessment é efêmero.** A devolutiva individual mais rica do app não sobrevive
   a um reload.
4. **Zero conceito de parceiro/benefício no repo** (verificado em engines, packs,
   migrations) — a Vitrine é campo verde, o que permite desenhá-la certa desde a origem.

### A3 · O fato arquitetural que governa tudo (captura cega)

`wave_responses` = `wave_id` + `invite_token` (consumido na transação atômica do S3) —
**zero campo de identidade**. Score pessoal JAMAIS pode derivar de onda organizacional,
nem por acidente: a impossibilidade é física, não política. Este blueprint a declara como
**argumento de confiança** ("suas respostas de onda nunca viram um perfil seu — o banco
não tem onde guardar isso") e constrói o caminho pessoal em trilho separado.

---

## §B · Melhores práticas — adotar · adaptar · rejeitar

| Prática/ciência | Decisão | Como entra |
|---|---|---|
| Reciprocidade (Gouldner 1960; Cialdini) | **Adotar como tese** | o Contrato de Reciprocidade — devolução como mecânica, não cortesia |
| Regra do pico-fim (Kahneman) | **Adotar** | Recibo Vivo: investir no momento final da survey — o mais barato e mais poderoso |
| Response burden / abandono (literatura de survey UX) | **Adotar** | save/resume, modo blocos opcional, tempo restante honesto |
| Indicadores de progresso | **Adaptar** | a evidência é MISTA (progresso pode ajudar ou pressionar): progresso + tempo honesto sim; **progresso gamificado/acelerado fake: rejeitado** |
| PERMA (Seligman 2011) e VIA (Peterson & Seligman 2004) | **Adotar** | espelho individual exploratório, com os disclaimers verbatim existentes — nunca psicometria inventada |
| SDT — autonomia (Deci & Ryan) | **Adotar** | autoavaliação 100% opt-in; re-teste por escolha com guarda de cadência; jamais cobrada |
| Prosocialidade (Dunn/Aknin/Lyubomirsky — já cânone) | **Adotar** | Oferta Espelhada: o ganho individual PRODUZ ganho coletivo por construção |
| Broaden-and-build (Fredrickson 2001) | **Adotar** | o Espelho celebra forças antes de apontar cuidados (ordem da narrativa) |
| LGPD art. 18 (acesso, portabilidade, eliminação) | **Adotar como feature** | Cofre Pessoal: exportar/apagar de verdade — a confiança que torna o Espelho premium |
| WCAG 2.2 AA + k-anonimato ≥5 | **Já cânone** | mantidos em toda peça nova |
| Draft de survey no servidor | **REJEITAR** | criaria linha token→respostas parciais antes do consumo atômico — alarga a superfície de identidade da captura cega (§G justifica o localStorage) |
| Loja de troca/cashback (modelo clube-de-benefícios) | **REJEITAR** | converte reconhecimento em remuneração (invariante 6, passivo trabalhista) e corrompe o motivo (SDT) |
| Recompensa proporcional a pontos/mérito | **REJEITAR** | ranking disfarçado — viola cooperação>competição |
| **Saúde mental como prêmio** | **REJEITAR — redline** | cuidado é direito universal do programa (§F3) |
| "Responda a pesquisa para concorrer" | **REJEITAR** | corrompe a voluntariedade (LGPD) e a psicometria (resposta por incentivo) |
| Dashboard de gestor sobre dados individuais | **REJEITAR** | T3: o Espelho é da pessoa; agregação futura só k≥5 com consentimento |

---

## §C · Decisão central — ToT exposto

**Pergunta:** as 3 frentes (experiência · espelho · vitrine) viram o quê?

**Comitê (§3.1):** ciência da felicidade/psicologia positiva · economia comportamental ·
UX/IX · dataviz · gamificação ética · dados/privacidade · estratégia SaaS.

| Ramo | Descrição | Valor | Risco | Custo | Tese | Reuso | **Ponderado** |
|---|---|---|---|---|---|---|---|
| A | Três docs pequenos separados | 6 | 7 | 6 | 4 | 6 | 5,70 |
| B | Um blueprint unificado "Mensurar Vivo" | 8 | 6 | 6 | 9 | 8 | 7,55 |
| C | Addenda nos blueprints existentes | 5 | 7 | 8 | 3 | 5 | 5,35 |
| D | Só auditoria UX agora, features depois | 4 | 9 | 9 | 3 | 4 | 5,50 |
| E | Doc "Mensurar" + Vitrine como addendum da Academia | 7 | 7 | 7 | 6 | 7 | 6,75 |
| **F** | **"Mensurar Vivo com Contrato de Reciprocidade"** — B + 2 substratos primeiro | **9** | **7** | **5** | **10** | **9** | **8,25** |

Pesos: Valor 25 · Risco 20 (10=seguro) · Custo 15 (10=barato) · Tese 25 · Reuso 15.

**Escolha: F.** Sem a reciprocidade, a Vitrine é corpo estranho num doc de mensuração (o
risco real do ramo B); com ela, as 3 frentes viram os 4 atos de UMA devolução — e a
Vitrine deixa de ser "loja de prêmios" para ser **a retribuição da instituição**, que é
exatamente o que a tensão T1 exige. Os três blueprints da trilogia venceram com o mesmo
ramo e a mesma nota (8,25) porque aplicam a mesma doutrina: **substrato antes de feature**.

**Rejeições registradas:** A fragmenta a tese; C mata a simetria da trilogia e enterra a
Vitrine onde ela conflitaria com o §E3 da Academia sem espaço para resolver; D abandona
2 dos 3 mandatos com ~80% da composição do Espelho pronta; E quebra "uma frente, um dono
editorial" — a resolução de T1 precisa morar ao lado da tese da reciprocidade.

**Risco assumido de F:** doc de 3 frentes pode inchar. **Mitigação:** orçamento declarado,
§F dedicado à Vitrine, Vitrine v1 deliberadamente pequena (catálogo + Ciranda + Oferta
Espelhada; sem billing, sem parceiro real, sem checkout).

---

## §D · As 7 inovações

> Formato: o que é · ciência · composição (arquivos exatos) · novo · pack · ética.

### I-M1 · Travessia Leve — a resposta que não se perde

**O que é.** Save/resume por rascunho em **localStorage apenas** para `/convite/$token` e
`/respond.s/$token` — **nunca no `/quiosque`** (aparelho compartilhado: a sessão efêmera
lá é feature de privacidade, não lacuna). Rascunho chaveado por hash do token, TTL = janela
da onda, invalidado se a definição do instrumento mudar, apagado no submit, com banner
honesto: *"Rascunho salvo só neste aparelho."* **Modo blocos opcional** (3 itens/tela,
escolha do respondente, config do pack; um-por-tela permanece default e é o único modo do
quiosque). **Tempo restante honesto**: "~4 min (estimativa)" derivado de medianas reais por
item (alimentadas pela Lupa I-M7) — nunca barra acelerada fake.

**Ciência:** response burden/abandono; indicadores de progresso com evidência mista →
adotar-adaptar (§B). **Persona:** a operária de 55 anos — um COPSOQ de 32 itens não pode
morrer num refresh de 4G.

**Compõe:** os 4 fluxos existentes + novo `survey-draft-engine` (puro). **Pack:** tamanho
do bloco, habilitação por fluxo. **Ética:** rascunho contém respostas sensíveis → só no
aparelho da pessoa, nunca servidor (§G), nunca quiosque.

### I-M2 · Recibo Vivo — o fim que domina a memória

**O que é.** Evolução do ativo mais forte do eixo: o recibo pós-submissão ganha (i) a
**linha do tempo do dado** — "sua resposta → junta com 5+ → cápsula selada → devolutiva
coletiva → plano de ação" (compondo a máquina de estados real do S4); (ii) o **convite dos
Dois Trilhos**: *"Suas respostas desta onda são anônimas e nunca viram um perfil seu — o
banco não tem onde guardar isso. Se você quiser ver o SEU espelho, existe outro caminho:
seu, opcional, identificado."* Zero schema novo; quase só copy + composição.

**Ciência:** Kahneman pico-fim — o momento mais barato e poderoso do eixo. Gouldner — o
recibo é o primeiro ato da reciprocidade.

**Compõe:** `CaptureReceipt` existente, wave lifecycle (S4), rota de confirmação dos 3
fluxos. **Pack:** textos por setor. **Ética:** `contentReturned: false` permanece SEMPRE.

### I-M3 · Espelho Vivo — o dashboard pessoal PERMA+V e VIA-T

**O que é.** O primeiro resultado individual persistente do VitalOS (Trilho B):

- **Autoavaliação PERMA pessoal NOVA** — os mesmos 15 itens (`PERMA_ITEMS`) num fluxo
  próprio, opt-in, identificado; scoring pessoal por fator P/E/R/M/A (+V via itens de
  vitalidade) exibido em **faixas** (vocabulário §5.7 — "florescendo/cultivando/atenção",
  nunca nota crua).
- **VIA-T persistido** — o "Meu Mapa" que já existe (top 5, radar 6 virtudes, ICUFT)
  deixa de evaporar.
- **Tendência entre reavaliações** — histórico INSERT-only vira linha do tempo pessoal;
  **guarda de cadência** (~4 semanas mínimas entre re-testes; cadência sugerida pelas
  temporadas: T1 PERMA · T2 VIA-T) contra re-testagem obsessiva.
- **Hospeda o check-in diário** (kind existente, 15 XP, hoje órfão de UI) como presença
  privada opcional — fechando o loop com a elegibilidade da Vitrine (participação
  booleana, nunca conteúdo).
- Os 3 disclaimers verbatim (IVO experimental · PERMA exploratório · VIA-T nunca
  diagnóstico/ranking/seleção) visíveis no dashboard.

**Ciência:** Seligman 2011; Peterson & Seligman 2004; SDT (opt-in); Fredrickson (a
narrativa celebra forças antes de apontar cuidados).

**Compõe:** `PERMA_ITEMS` + ButtonScale/A11y (medição), `scoreViat`/`ViatResult`
(existentes), linguagem radar do `/viat`, padrão S5 (persistência no S6.5). **Novo
engine:** `personal-assessment-engine`. **Pack:** faixas, rótulos, cadências. **Ética:**
T2/T3 integrais — visível SÓ para a pessoa; SEM visão de gestor na v1 POR DESIGN.

### I-M4 · Bússola Pessoal — Educar e Transformar a partir do MEU dado

**O que é.** As recomendações que o founder pediu, por composição fina (~80% pronta):
afinidade = top-5 VIA-T consentido; necessidade pessoal = fatores PERMA mais baixos;
prioridade coletiva injetada (mock agora; série real do Cofre de Ciclos no S6.75). Saídas:
2–3 trilhas da Academia (Educar) + 1 micro-missão/prática que escreve no Diário de Prática
I7 (Transformar). Narrativa via `buildDevolutiva` (audiência individual JÁ existe).

**Ciência:** o próprio desenho 100×20 do `recommendPaths` (necessidade coletiva > afinidade
pessoal — honestidade sistêmica); Gollwitzer na micro-missão. **Compõe:**
`recommendPaths`, `rankDriversByNeed`, `buildDevolutiva`, `driver-pillar-bridge`. **Novo
engine:** `mirror-recommendation-engine` (fino). **Ética:** linguagem de convite, nunca de
correção; jamais prescrição clínica.

### I-M5 · Cofre Pessoal — "seu dado é seu" como feature

**O que é.** LGPD art. 18 operacionalizado no Trilho B: **exportar** (JSON portável com
escores, versões de instrumento/engine e datas), **apagar de verdade** (RPC dedicada
`erase_my_assessments()` — o cliente não tem DELETE; privilégio assimétrico por caso de
uso), **painel de consentimento** do canal `personal_results`. É a peça que faz o Espelho
ser premium em vez de assustador.

**Compõe:** consent-ledger existente; padrão S5. **Novo engine:**
`personal-data-rights-engine` (montagem pura do payload de portabilidade). **Ética:**
apagar apaga; exportar exporta tudo; consentimento granular e revogável.

### I-M6 · Vitrine do Bem-Comum — a retribuição da instituição

**O que é.** A camada de recompensas institucionais/parceiras que o founder pediu —
cultural, educacional, entretenimento, comunitária — desenhada para caber no cânone SEM
tocá-lo (resolução completa em §F). Em uma linha: **o indivíduo sai da posição de
comprador**; a instituição declara ofertas (idioma `csr_pledges`), o acesso individual é
por **Ciranda** (sorteio opt-in de chance uniforme entre participantes — jamais mérito),
e **toda oferta individual espelha uma contribuição coletiva** (Oferta Espelhada). Saúde
mental fica FORA do catálogo, como **Porta Aberta** (direito, não prêmio).

**Ciência:** Dunn/Aknin/Norton no MECANISMO (o resgate individual produz ganho coletivo);
Ostrom na governança do comum. **Compõe:** `csr_pledges` (tabela da Academia, reusada),
Pomar/Celebração do Jardineiro (canais coletivos existentes), participation-ledger
(elegibilidade booleana). **Novo engine:** `vitrine-offer-engine` com guardas de redline.
**Pack setorial:** Escola: livros/museu/teatro · Governo: cultura local · Saúde:
autocuidado · Comunitário: eventos. **SaaS:** tier parceiro/patrocinador = receita futura
pós-S8, honestamente gateado em entitlements reais (a coluna `organizations.plan` do
piloto não sustenta isso).

### I-M7 · Lupa da Escuta — qualidade de instrumento, nunca vigilância

**O que é.** Telemetria k≥5 do funil de resposta POR ITEM: onde as pessoas param, mediana
de tempo por item, flags de carga ("o item 17 leva 3× a mediana"). Alimenta a governança
editorial dos instrumentos (encurtar/reordenar/reescrever) e as estimativas honestas de
tempo do I-M1. **Sem token, sem identidade, k≥5 antes de qualquer leitura** — o funil
melhora o INSTRUMENTO, jamais vigia o respondente.

**Compõe:** infra de onda/capsule (carona no S6.75). **Novo engine:**
`survey-telemetry-engine`. **Ética:** nunca "straight-lining" ou acusação por pessoa;
agregado sempre.

---

## §E · Spec — Os Dois Trilhos + o Contrato de Reciprocidade

### E1 · Os Dois Trilhos (T2 resolvida como arquitetura)

| | Trilho A — Voz coletiva | Trilho B — Espelho pessoal |
|---|---|---|
| O que é | ondas organizacionais (COPSOQ, PERMA da onda, pulses) | autoavaliação pessoal (PERMA pessoal, VIA-T) |
| Identidade | **NENHUMA por arquitetura** (token consumido, zero campo) | `auth.uid()` — a pessoa É a dona |
| Persistência | wave_responses → capsule k≥5 | `personal_assessments` (S5, INSERT-only) |
| Quem vê | ninguém individualmente; agregado k≥5 | SÓ a própria pessoa |
| Consentimento | participação voluntária na onda | opt-in explícito + canal `personal_results` |
| Ponte | **NENHUMA nos dados.** A única ponte é um CONVITE renderizado no cliente (Recibo Vivo → "existe outro caminho") | — |

**Decisão de minimização (LGPD):** o Trilho B persiste o **snapshot computado** (perfil em
faixas + escores + versões), NUNCA as respostas item a item — o dado cru adiciona
sensibilidade sem valor ao titular. Versões de instrumento/engine preservam a honestidade
histórica se o scoring evoluir.

### E2 · O Contrato de Reciprocidade (verbatim de produto)

> *"Todo dado que você dá devolve algo a você: um recibo honesto do que aconteceu com a
> sua resposta; um espelho seu, se você quiser — seu, privado, apagável; uma recomendação
> feita para você; e uma retribuição da instituição ao coletivo. Medir aqui nunca é
> extração — é troca."*

Exibido: no início de cada fluxo de resposta (1 linha), no Recibo Vivo (completo), no
Espelho (com o painel de direitos), na Vitrine (com a Oferta Espelhada explicada).

### E3 · Consentimento e disclaimers

- Canal novo `personal_results` no consent-engine (genérico; 50% org + k≥5 já embutidos)
  gateia qualquer USO AGREGADO futuro; a visão individual exige apenas o opt-in do fluxo.
- Disclaimers verbatim no Espelho: IVO ("experimental… não mede felicidade individual"),
  PERMA ("exploratório — não substitui avaliação psicométrica formal"), VIA-T
  ("exploratório… não é diagnóstico, não é ranking, não se usa para seleção, promoção,
  remuneração ou desligamento").

---

## §F · Spec — Vitrine do Bem-Comum (a resolução de T1 por extenso)

### F1 · Por que a regra existe (e permanece)

`never_convertible_to_money_or_benefit` (constante REQUIRED no Ajv desde a Academia Viva)
protege duas fronteiras duras: **trabalhista** (reconhecimento que vira vantagem material
proporcional a comportamento é remuneração variável disfarçada — invariante 6) e
**motivacional** (SDT: recompensa material corrompe o motivo pró-social — overjustification).
A Vitrine NÃO revoga nada: **sementes nunca são moeda da Vitrine e a Vitrine nunca lê saldo
ou mérito de ninguém.**

### F2 · Os três mecanismos

1. **Canal coletivo (default).** Ofertas acoplam-se aos canais que JÁ existem: o Pomar da
   Equipe convertido pelo líder (Celebração do Jardineiro) e o Bosque do Bem-Comum
   (meta coletiva → compromisso da instituição via `csr_pledges`). "Quando o Bosque
   atingir a meta, oferecemos ingressos do museu para o coletivo." Ostrom, não marketplace.
2. **Ciranda (canal individual sem mérito).** Sorteio **opt-in** de chance **uniforme**
   entre qualquer pessoa com ≥1 evento de participação no ciclo — booleano, jamais
   proporcional a XP/sementes/desempenho. Sorteio determinístico **auditável** (seed
   publicada, hash do resultado). Modos alternativos por pack: rodízio; desbloqueio
   universal (todos ganham quando um marco coletivo é atingido).
3. **Oferta Espelhada (obrigatória por schema).** Todo resgate individual dispara uma
   contribuição espelhada declarada da instituição ao coletivo/causa — o ganho individual
   PRODUZ ganho coletivo por construção. A filosofia de "recompensa compartilhada" do
   founder vira invariante mecânico.

### F3 · A lista NUNCA da Vitrine (verbatim; 4 constantes REQUIRED no Ajv)

1. `eligibility_never_reads_merit_or_balance` — **Nunca** elegibilidade por XP, sementes,
   desempenho, ranking ou intensidade de participação; só o booleano "participou ≥1 vez".
2. `care_is_a_right_not_a_reward` — **REDLINE: apoio à saúde mental NUNCA é prêmio.
   Cuidado é direito de acesso universal do programa — fora do catálogo, fora do sorteio,
   fora de qualquer mecânica de elegibilidade. Gamificar o acesso ao cuidado violaria
   "nenhuma punição por não-participação" e "nunca gamificar sofrimento".** Na UI: bloco
   **"Porta Aberta"** permanente, ACIMA do catálogo, sem condição alguma.
3. `platform_never_intermediates_money` — **Nunca** checkout, estoque ou pagamento; ofertas
   são compromissos declarados (declarado → disponível → cumprido com evidência).
4. `every_individual_offer_mirrors_collective` — **Nunca** oferta individual sem
   contrapartida coletiva declarada.

Mais duas regras de texto: **nunca** "responda a pesquisa para concorrer" (elegibilidade lê
participação genérica do ledger, JAMAIS resposta a instrumento — protege a voluntariedade
LGPD e a psicometria); vencedor público **só com consentimento** (notificação privada digna
por default).

**Nota trabalhista:** chance uniforme desvinculada de desempenho/intensidade não constitui
remuneração variável; ainda assim, revisão jurídica antes do go-live real (mesma flag do
canal cause da Academia).

### F4 · Catálogo por setor (config de pack, `collectiveOffers`)

| Pack | Exemplos de oferta |
|---|---|
| Empresa | ingressos culturais, cursos/livros, dia de voluntariado remunerado pela empresa |
| Escola | livros, visita ao museu, teatro para a turma |
| Governo | eventos culturais locais, biblioteca cidadã |
| Saúde | autocuidado (massagem, atividade física) — NUNCA terapia/cuidado clínico como prêmio |
| Comunitário | eventos do bairro, hortas, oficinas |

---

## §G · Arquitetura de dados

**Trilho B — pessoal (padrão S5 + lição REVOKE verbatim em toda migration):**

| Tabela | Colunas-chave | Padrão | Nota |
|---|---|---|---|
| `personal_assessments` | user_id, assessment_id UNIQUE(user, assessment), instrument (`perma_personal`\|`viat`), instrument_version, engine_version, result JSONB, taken_at | pessoal, **INSERT-only** (SELECT+INSERT; sem UPDATE/DELETE ao cliente) | snapshot computado, não respostas cruas (E1); histórico = tendência |
| RPC `erase_my_assessments()` | security definer, `WHERE user_id = auth.uid()` | — | LGPD art. 18: o DELETE existe, mas só pelo caminho auditável |

**Vitrine — org (padrão S1–S4, RPC atômica):**

| Tabela | Colunas-chave | Nota |
|---|---|---|
| `institutional_offers` | org_id, offer_id, category, title, provider_kind (`institution`\|`partner`), pledge_statement, access_mode (`collective`\|`lottery`\|`rotation`\|`universal_unlock`), mirrored_pledge_ref → `csr_pledges`, capacity, window, status | reusa `csr_pledges` da Academia p/ o espelhamento — composição, não tabela paralela |
| `offer_entries` | offer_cycle, user_id, UNIQUE(user, cycle), entered_at | **INSERT-only**; elegibilidade booleana; jamais lista pública |
| `offer_draws` | offer_cycle, draw_seed, drawn_at, result_hash | sorteio determinístico auditável |
| `offer_redemptions` | offer_id, redeemer (privado; público só com consent), fulfillment_status, mirrored_status | a Oferta Espelhada só fecha quando a contrapartida cumpre |

**Rascunho de survey: localStorage APENAS — nunca servidor.** Justificativa tripla:
(1) draft server-side criaria linha token→respostas parciais ANTES do consumo atômico,
alargando a superfície de identidade e quebrando a alegação "zero campo de identidade";
(2) o invariante 4 protege contra respostas DE OUTROS no cliente — as respostas em
progresso do PRÓPRIO respondente já vivem na memória do cliente por necessidade; o
localStorage não cria classe nova de exposição além do próprio aparelho; (3) risco
residual mitigado: nunca no quiosque, TTL, limpeza no submit, banner honesto.

**Telemetria (Lupa):** agregada por item na fronteira server junto ao ciclo da onda — sem
token, sem identidade, k≥5 antes de qualquer leitura.

---

## §H · Mapa de engines (puros, kebab-case, testes co-localizados)

| Engine novo | Compõe | Testes est. |
|---|---|---|
| `engine/mensurar/survey-draft-engine.ts` | serializar/restaurar/expirar/invalidar rascunho + estimativa honesta de tempo | ~14 |
| `engine/mensurar/survey-telemetry-engine.ts` | funil por item k-anon, flags de carga | ~12 |
| `engine/espelho/personal-assessment-engine.ts` | scoring PERMA 15 pessoal (itens/faixas INJETADOS), tendência sobre histórico, guarda de cadência; VIA-T atrás do tipo `PersonalAssessmentRecord` (scoreViat JÁ existe) | ~18 |
| `engine/espelho/mirror-recommendation-engine.ts` | recommendPaths + rankDriversByNeed + buildDevolutiva (individual) | ~12 |
| `engine/espelho/personal-data-rights-engine.ts` | payload de portabilidade + manifesto de apagamento | ~8 |
| `engine/vitrine/vitrine-offer-engine.ts` | elegibilidade booleana uniforme, sorteio auditável, matemática da Oferta Espelhada, **guardas de redline** (rejeita oferta que leia mérito/saldo, categorize cuidado como prêmio ou omita espelhamento) | ~20 |

≈84 testes novos. Lei de ferro: **nenhum importa `domain/`** — itens, faixas, catálogo,
verbatims e thresholds chegam por parâmetro. Zero mudança em viat/academia/devolutiva/
consent-engine — só passam a ser compostos.

---

## §I · Rollout (a espinha S6–S8 permanece; interfaces declaradas)

| Fase | Conteúdo | Demo de 60s |
|---|---|---|
| **Fatia imediata** (esta sessão) | Espelho Vivo v1 mock-first: personal-assessment + mirror-recommendation engines + `/espelho` | "Faço meu PERMA em 3 min → perfil em faixas, nunca nota crua → o top-5 VIA-T compõe → 2 trilhas e 1 micro-missão da MINHA prioridade → 'seu dado é seu' visível. E a tela declara: nada disso veio da onda anônima." |
| **S6 (riders leves, zero schema)** | I-M1 Travessia Leve + I-M2 Recibo Vivo — as ondas reais do S6 ganham no dia 1 | "Caiu a conexão no item 19 do COPSOQ → volto → continuo de onde parei → recibo honesto → convite ao espelho." |
| **S6.5 (rider "Espelhar e Guardar")** | `personal_assessments` + canal `personal_results` + Cofre Pessoal v1 (mesma fase que já executa o padrão S5 p/ Sementes/Diploma) | "Refaço o PERMA um mês depois — a linha do tempo mostra minha evolução; exporto meu JSON; apago e some de verdade." |
| **S6.75 (Cofre de Ciclos, do Arco)** | Lupa da Escuta na infra de onda; Bússola compõe prioridade coletiva REAL | "O funil mostra onde o instrumento pesa; a recomendação pessoal cita a prioridade real da org." |
| **S7 (aquisição)** | Espelho + Contrato de Reciprocidade na landing (claims só de fato computado — regra anti-greenwash do Arco); Vitrine v1 DEMO rotulada | "A plataforma que devolve: recibo → espelho → bússola → retribuição." |
| **S8** | Vitrine real (`institutional_offers` + Ciranda + Oferta Espelhada sobre `csr_pledges` — mesma fase da Academia); Dossiê ESG lê ofertas cumpridas como KPI de G | "O Bosque bate a meta → a instituição cumpre → cada resgate espelha contribuição → o KPI de Governança mostra a linhagem." |
| **Pós-S8** | Tier parceiro/patrocinador (receita SaaS) gateado em entitlements reais | — |

**Interfaces declaradas com os irmãos:** Bússola→trilhas da Academia (`recommendPaths`) e
micro-missões→Diário de Prática I7 (referência consentida, jamais cópia) ·
Vitrine→Pomar/Bosque/Celebração do Jardineiro I6.2 e →`csr_pledges` (tabela da Academia,
reusada) · Dossiê ESG I-E1 lê ofertas cumpridas · Cofre de Ciclos I-P1 fornece a prioridade
coletiva real da Bússola · Recibo Vivo é o irmão individual da Cerimônia da Devolutiva
I-T2 (mesma doutrina de devolução, audiências distintas) · constantes NUNCA da Vitrine
vivem na MESMA seção do schema que as das Sementes.

---

## §J · Riscos e ética

| Risco | Mitigação de design |
|---|---|
| Rascunho em aparelho compartilhado expõe respostas | nunca no quiosque; TTL; limpeza no submit; banner "só neste aparelho" |
| Espelho lido como avaliação da empresa | Trilho B declarado na tela; SEM visão de gestor POR DESIGN; disclaimers verbatim; consentimento gateia qualquer agregação futura |
| Re-testagem obsessiva (bem-estar como métrica ansiogênica) | guarda de cadência ~4 semanas; cadência ancorada nas temporadas; linguagem de convite |
| Sorteio percebido como injusto | chance uniforme EXPLICADA na UI; seed e hash publicados; modos rodízio/universal por pack |
| Oferta de parceiro vira publicidade invasiva | catálogo curado pela instituição; sem tracking de parceiro; provider_kind declarado |
| Telemetria lida como vigilância | k≥5 estrutural; por ITEM, nunca por pessoa; propósito declarado (melhorar o instrumento) |
| Vitrine recria remuneração variável | lista NUNCA §F3 no schema; elegibilidade booleana; revisão jurídica pré-go-live |
| Saúde mental gamificada por engano de configuração | guarda de redline NO ENGINE (oferta categorizada como cuidado é rejeitada na validação) + constante Ajv |
| LGPD (dado pessoal de bem-estar) | minimização (snapshot, não cru); art. 18 como feature; consentimento granular; DPO review no S6.5 |

**O que NUNCA faremos:** ranking de scores pessoais; espelho visível a gestor; prêmio por
responder pesquisa; cuidado como recompensa; draft no servidor; venda de dados pessoais.

---

## §K · Métricas e critérios de aceite

**North Star do eixo:** **% de atos de medição que terminam em devolução recebida** —
submit→recibo visto; ciclo→% de opt-in do espelho; espelho→recomendação aceita;
resgate→espelhamento cumprido. Sempre agregado k≥5.

| Métrica | Fonte | Guarda |
|---|---|---|
| Conclusão de survey (por fluxo) e retomadas de rascunho | telemetria k≥5 | por item/fluxo, nunca por pessoa |
| Opt-in do Espelho / re-testes na cadência | personal_assessments (contagens) | agregado k≥5 |
| Recomendações aceitas (trilha aberta, missão iniciada) | participation-ledger | agregado |
| Exportações/apagamentos do Cofre | contadores de RPC | prova de direitos exercidos |
| Cirandas realizadas / ofertas espelhadas cumpridas | offer_draws/redemptions | transparência estrutural |

**Aceite da fatia imediata (Espelho v1):** engines puros sem import de domain; ~30 testes
novos verdes; zero regressão nos 1550; demo de 60s no browser; rótulo honesto
demo/efêmero; disclaimers verbatim visíveis; declaração dos Dois Trilhos na tela.

---

## Autoauditoria (§10 da SKILL_MESTRA)

- [x] Tríade planejada para cada inovação (engine → teste → mock → rota → wiring).
- [x] Engine ≠ domínio: itens, faixas, catálogo, verbatims, thresholds — tudo por parâmetro.
- [x] k-anon, A/B, disclaimers e termos vedados endereçados por inovação (§D, §E, §F, §J).
- [x] Honestidade: citações verificadas (Gouldner 1960, Kahneman, Seligman 2011, Peterson &
      Seligman 2004, SDT, Dunn/Aknin, Fredrickson, LGPD art. 18); evidência MISTA de
      progresso declarada como mista; zero psicometria inventada.
- [x] Tensões resolvidas explicitamente (T1 §F, T2 §E1, T3 §E1/E3) — nunca contornadas.
- [x] Composição sobre acúmulo: 6 engines novos compõem 9 existentes; Espelho ~80% reuso.
- [x] Vaidade rejeitada e registrada: loja de troca, mérito, dashboard de gestor,
      progresso fake, draft server-side, cuidado-como-prêmio (§B/§J).
- [x] Rollout preserva S6–S8; interfaces com os 2 irmãos declaradas.
- [x] Usuário do quiosque: sessão efêmera preservada COMO feature; modo blocos opcional;
      linguagem adulta; toque ≥44px mantido.
