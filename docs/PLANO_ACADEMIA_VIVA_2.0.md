# PLANO ACADEMIA VIVA 2.0 — Blueprint Premium de Educação do VitalOS™

> **Status:** Proposto (aprovado pelo founder em 2026-07-03 para escrita + 1ª fatia vertical).
> **Irmão editorial de:** `PLANO_MESTRE_EVOLUCAO_VITALOS_2026_2027.md` (respeita e estende o §F;
> não substitui a espinha S6–S8).
> **Etiquetas de evidência:** `Confirmado no código` · `Confirmado no app irmão` · `Proposto`.
> **Doutrina ativa:** `SKILL_MESTRA_FABLE5.md` — ToT §3, composição §5.1, honestidade §8,
> invariantes §9. Nível 3 (Fundacional) do protocolo §0.2.

---

## §0 · Tese e sumário executivo

**A integração é a disrupção.** O app irmão (Educação Felicidade) prova que formatos
gamificados premium engajam; o VitalOS já tem o que nenhum LXP do mercado tem: **a trilha de
aprendizagem ancorada na medição real da própria organização** (crosswalk exposição→driver→
academia-engine, `Confirmado no código`). A Academia Viva 2.0 não adiciona uma "plataforma de
cursos" — adiciona **duas marés** que atravessam tudo que já existe:

1. **A economia pró-social ("Sementes Vivas")** — a primeira loja de recompensas onde o
   catálogo é composto de coisas que você **dá**, não que você consome. Fundamento: o achado
   replicado de que gastar recursos em outros gera mais bem-estar do que gastar em si
   (Dunn, Aknin & Norton, 2008, *Science*; universal psicológico em 136 países — Aknin et al.,
   2013, *JPSP*).
2. **A espinha narrativa coletiva** — as 8 forças antagonistas do cânone
   (`FRAMEWORK_MESTRE_EMPRESA_VIVA.md` §1.5, `Confirmado no código`-doc) deixam de ser
   literatura e viram mecânica: a organização enfrenta, por temporada, o antagonista **que a
   sua própria medição priorizou** — e só o derrota **com prova** (delta da reavaliação).

Sobre essas duas marés, **7 inovações** (I1–I7) compõem engines existentes — nunca criam silos.
Cada uma é uma fatia vertical independente, com rollout S6→S9 que **não quebra** a espinha
comprometida do Plano Mestre.

**Filtro de ouro aplicado:** cada inovação fecha um pedaço do ciclo
medir → aprender → praticar → **dar** → provar. Nada aqui é feature de vaidade; a loja de
avatares do irmão, por exemplo, foi deliberadamente **rejeitada** (§B).

---

## §A · Inventário honesto — o que o VitalOS já tem

Tudo `Confirmado no código` (auditoria desta sessão, 2026-07-03):

| Ativo | Onde | Estado |
|---|---|---|
| 9 dinâmicas de aprendizagem com citação científica (D1–D6, X1–X3) | `src/mocks/learning-dynamics-mock.ts` + `docs/instrumentos/WWP.md` §2 | catálogo vivo; D2 operante |
| SM-2 completo + sessão de flashcards | `src/engine/learning/sm2-engine.ts`, `flashcard-session.ts` | **persistido** (S5: `sm2_card_state`) |
| Ledger de participação (8 kinds, tetos anti-gaming) | `src/engine/gamification/participation-ledger.ts` | **persistido** (S5: `participation_events`, INSERT-only) |
| 5 moedas: xp (cap 150/dia) · impact · coop · learn · kudos | `src/domain/packs/enterprise/gamification-economy.json` | config viva |
| Kudos: 5/semana, transferível, k-anon ≥5, mensagem NUNCA persistida | `src/engine/recognition/recognition-engine.ts` + `/reconhecimento` | operante (demo) |
| 13 badges + 6 missões seed (micro/macro/legendary) | `gamification-economy.json` | config viva |
| VIA-T 24 forças × 6 virtudes + ICUFT + ponte de afinidade | `src/engine/viat/` + `driver-pillar-bridge.ts` | operante |
| Academia ranqueada por prioridade coletiva × afinidade (100:20) | `src/engine/academia/academia-engine.ts` | operante |
| 15 Embaixadorias (1 por pilar) | `src/mocks/embaixadorias-mock.ts` | **mock-only** (lacuna) |
| Selo Empresa Viva (elegibilidade computada, nunca comprada) | `src/engine/certification/certification-engine.ts` | operante — **só nível ORG** |
| Idioma documental (sections → Markdown) | `src/engine/nr1/pgr-document-engine.ts` | operante — **sem lib de PDF** |
| 8 antagonistas sistêmicos + 10 arquétipos | `docs/FRAMEWORK_MESTRE_EMPRESA_VIVA.md` §1.4–1.5 | narrativa sem mecânica (lacuna) |
| 9 princípios éticos da economia | `gamification-economy.json` § ethicalPrinciples | invioláveis |

**As 3 lacunas que este plano fecha:** (1) não existe certificado INDIVIDUAL; (2) kudos não
têm loja/resgate — a moeda circula mas não "compra" nada, nem simbolicamente; (3) as dinâmicas
coletivas (embaixadorias, antagonistas, rituais) são narrativa sem mecânica persistente.

---

## §B · Inspiração e dívida editorial — o mapa do app irmão

Auditoria sistêmica do **Educação Felicidade** (zip 2026-06; `Confirmado no app irmão`).
Três colunas honestas: o que **adotamos**, o que **adaptamos**, o que **rejeitamos e por quê**.

### B1 · Adotado (padrões provados que importamos com gratidão)

| Padrão do irmão | Evidência lá | Uso aqui |
|---|---|---|
| Evidência de prática em 4 tipos (texto/foto/checklist/reflexão) | `practice_progress`, 30+ práticas | I7 Diário de Prática Viva |
| Credencial verificável com share + revogação | `verifiable_credentials` + `credential_shares` + `credential_revocations` | I2 Diploma Vivo (simplificado: hash + código público, sem blockchain-teatro) |
| jsPDF + html2canvas para PDF no cliente | `package.json` do irmão | compra pontual (ramo E) — serve também ao PDF do plano S6 |
| Loop semanal de 7 passos com desbloqueio sequencial | `loop_submissions`, LoopSemanal.tsx | I3 — porém coletivizado (ver B2) |
| Missões coletivas com narrativa de capítulos e antagonistas | `collective_missions`, XP coletivo separado | I4 — porém com antagonista DERIVADO da medição (ver B2) |
| Círculos restaurativos com facilitador e prompts estruturados | CirculosRestaurativos.tsx | I5 — porém com privacidade por schema (ver B2) |
| ScienceNote por ferramenta (fundamento citado na própria UI) | tools-data.ts | padrão de microcopy em todas as inovações |

### B2 · Adaptado (a alma fica, o mecanismo muda)

- **Loop Semanal**: lá é individual (cada pessoa destrava seu passo seguinte). Aqui vira
  **maré de equipe** — o passo coletivo destrava por cobertura k≥5 (ex.: ≥60% participou),
  sem jamais nomear quem falta. Motivo: a tese VitalOS é o sistema vivo, não o herói solitário;
  e cobertura coletiva elimina a pressão individual que o unlock pessoal cria.
- **Antagonistas**: lá são ficção decorativa da temporada. Aqui o antagonista é **derivado do
  driver que a medição real priorizou** (carga→A Sobrecarga; justica→A Injustiça Percebida;
  apoio→A Desconexão — crosswalk canônico) e **só recua com prova** (delta de exposição na
  reavaliação, `reavaliacao-engine`). A narrativa ganha o que só o VitalOS pode dar: verdade.
- **Círculos**: lá o conteúdo da conversa pode ser registrado (notas de reflexão do grupo).
  Aqui a privacidade é **estrutural**: o schema `circle_sessions` não possui coluna de
  conteúdo — é impossível vazar o que foi dito, por design (idioma `neverPersist` do
  socialRecognition, elevado de política a esquema físico).
- **Loja**: lá vende auto-consumo (avatares, temas, powerups). Aqui a loja é **invertida**:
  o catálogo é o que você dá (§E). O powerup "2x XP por 1 semana" do irmão é diretamente
  **contrário** ao nosso invariante anti-gaming (teto diário existe para proteger) — não entra.

### B3 · Rejeitado (e o porquê registrado)

| Padrão do irmão | Por que NÃO entra |
|---|---|
| **Leaderboard individual** (Minha Turma: ranking por XP pessoal) | Veneno canônico. Viola `ethicalPrinciples`: cooperação > competição, nunca ranking de pessoas. Substituído pelo anel de progresso COLETIVO (k≥5) |
| Loja de auto-consumo (avatares/temas/powerups) | Feature de vaidade (comando mental 1); powerup de XP quebra anti-gaming. A v1 da nossa loja é 100% give-first |
| Streaks individuais com badge de pressão (7/14/30 dias) | Streak individual pune ausência (férias, licença) — "no punishment for non-participation" é princípio ético do pack. Ritmo coletivo do Loop Vivo cumpre o papel sem punir |
| Curso 1:1 estilo LMS (Course→Module→ContentItem sequencial) | O ToT-E do Plano Mestre já pontuou LMS genérico em 5,0: biblioteca morta perde o moat trilha↔medição. Nossa unidade continua sendo a TRILHA ancorada em driver priorizado |
| Chat IA (AlegrIA) | Bloqueado até a data plane segura (P2-04) — posição já firmada no Plano Mestre; nada muda |
| Certificação por presença/XP acumulado | Certificar seat-time é overclaim pedagógico. O Diploma Vivo certifica retenção medida + prática aplicada (§F) |

**Dívida editorial declarada:** o conteúdo pedagógico real (vídeos, artigos, quizzes por
driver) continua sendo **curadoria do founder** — Playbook 2.0 sob CC BY-NC-ND com atribuição,
citando sem reproduzir. Este blueprint desenha os RECIPIENTES e as MECÂNICAS; nenhum conteúdo
é inventado aqui (honestidade §8).

---

## §C · Decisão central — ToT exposto

**Pergunta:** loja pró-social + certificado + dinâmicas coletivas + interação entre perfis
viram o quê, arquiteturalmente?

**Comitê convocado (§3.1):** ciência da aprendizagem · psicologia positiva/economia
comportamental · UX premium · dados/privacidade (LGPD, k-anon) · estratégia SaaS B2B.

| Ramo | Descrição | Valor | Risco | Custo | Tese | Reuso | **Ponderado** |
|---|---|---|---|---|---|---|---|
| A | Porto 1:1 do irmão | 5 | 3 | 6 | 3 | 4 | 4,10 |
| B | 7 inovações compostas ("Constelação") | 8 | 7 | 6 | 9 | 9 | 7,90 |
| C | Mega-feature "Jornada Viva" única | 7 | 4 | 3 | 6 | 5 | 5,25 |
| D | Mínimo: só loja + certificado | 5 | 8 | 9 | 5 | 6 | 6,35 |
| E | LXP plataforma-dentro-da-plataforma | 7 | 3 | 2 | 4 | 6 | 4,55 |
| **F** | **Constelação com Maré única** (B + 2 substratos compartilhados primeiro) | **9** | **7** | **5** | **10** | **9** | **8,25** |

Pesos: Valor 25 · Risco 20 (10=seguro) · Custo 15 (10=barato) · Tese 25 · Reuso 15.

**Escolha: F.** O risco real de B é fragmentação — 7 features boas que não conversam
(acúmulo, anti-§5.1). F compra coerência com ~1 sprint de substrato: a carteira pró-social
alimenta círculos, duplas, loop e expedições; o arco narrativo dá contexto a missões,
certificados e celebrações. A integração É a disrupção — a mesma lógica dos 7 motores da tese.

**Risco assumido de F:** substrato-primeiro atrasa a primeira tela visível. **Mitigação:**
a primeira fatia vertical já entrega substrato + experiência (carteira + doação a colega
na rota `/reconhecimento` existente). **Critério de aceite do ramo:** cada inovação, removida
sozinha, não quebra as outras; nenhuma define vocabulário fora do pack.

**Rejeições registradas:** A carrega o leaderboard individual (veneno); C viola fatia
vertical (§4.2); D entrega ~40% do mandato; E perde o moat (LMS genérico já pontuara 5,0
no ToT-E do Plano Mestre).

---

## §D · As 7 inovações

> Formato por inovação: o que é · ciência (citações verificadas) · composição (arquivos
> exatos) · o que é genuinamente novo · pontos de configuração no pack · ética.

### I1 · Sementes Vivas — a Loja Viva do Bem-Comum

**O que é.** A inversão da loja do irmão: uma loja onde **tudo que existe para "comprar" é
um presente**. A moeda simbólica — **Sementes** — nasce da participação (fontes = os 8 kinds
do `participation-ledger`, todos já capados) e se gasta em três canais de doação:

1. **Pessoa → colega** ("plantar uma semente"): reconhecimento simbólico premium — um item do
   catálogo (ex.: "Semente de Carvalho — por sustentar a equipe na semana difícil") entregue
   em privado por default, com nome do doador só sob opt-in.
2. **Pessoa → equipe** ("Pomar da Equipe"): sementes contribuídas a um pool coletivo que o
   LÍDER converte em celebração real registrada (ver I6 — Celebração do Jardineiro).
3. **Pessoa → instituição** ("Bosque do Bem-Comum"): pool coletivo da organização rumo a uma
   meta; ao atingi-la, a **empresa cliente** cumpre um compromisso CSR **que ela mesma
   declarou** (ex.: doação a instituição escolhida pelos colaboradores). A plataforma registra
   e exibe o compromisso e seu cumprimento — **nunca promete nem intermedia dinheiro**.

**Ciência (verificada, sem invenção):**
- Dunn, Aknin & Norton (2008). *Spending money on others promotes happiness.* **Science**,
  319(5870), 1687–1688 — gasto pró-social > gasto pessoal para bem-estar.
- Aknin et al. (2013). *Prosocial spending and well-being: cross-cultural evidence for a
  psychological universal.* **JPSP**, 104(4), 635–652 — o efeito replica em 136 países.
- Moll et al. (2006, **PNAS**) e Harbaugh, Mayr & Burghart (2007, **Science**) — doação
  voluntária ativa circuitos mesolímbicos de recompensa; voluntariedade importa.
- Lyubomirsky, Sheldon & Schkade (2005, *Review of General Psychology*) — atos de gentileza
  deliberados elevam bem-estar sustentado.
- Deci & Ryan (SDT) — o dar só gera bem-estar quando **autônomo**. Daí a decisão de design
  mais importante da economia: **doar NÃO rende XP nem sementes de volta** (evita
  overjustification — corromper o motivo pró-social com incentivo extrínseco).
- Ostrom (1990, *Governing the Commons*) — governança do pool comum: fronteiras claras,
  regras definidas coletivamente, monitoramento transparente (o pool é sempre visível em
  agregado k≥5).

**Compõe:** `recognition-engine.ts` (idioma inteiro herdado: weekly budget, cooldown,
no-self, consent de visibilidade, neverPersist de mensagem), `participation-ledger.ts`
(fonte única de ganho), `gamification-economy.json` (nova seção `prosocialEconomy`),
`consent-engine.ts`, rota existente `/reconhecimento`.

**Novo vs irmão:** o irmão não tem doação nenhuma; nossa v1 não tem auto-consumo nenhum.

**Pack:** nome da moeda e verbos da metáfora (Empresa: "plantar/semear"; Escola: "regar";
Saúde: "cuidar"), catálogo de itens doáveis, causas CSR por setor, orçamentos.

**Ética (a lista "nunca" — verbatim no §E):** zero leaderboard de doadores; zero total
individual público; nunca exibir quem não doou; doação jamais conversível em
dinheiro/benefício/vantagem; nunca meta individual de doação.

### I2 · Diploma Vivo

**O que é.** O primeiro certificado INDIVIDUAL do VitalOS — e ele certifica **prática, não
presença**. Elegibilidade computada (mesmo princípio do `certification-engine`: nunca
comprada), exigindo três provas reais: (i) trilha do driver concluída
(`learning_progress`/quiz), (ii) **retenção comprovada** — cartões SM-2 do driver em estado
maduro (intervalo ≥21 dias, dado real de `sm2_card_state`), (iii) ≥1 registro de prática
aplicada (I7). O PDF premium leva o nome da pessoa (com consentimento explícito de exibição),
tipografia serif editorial, selo em dourado (`--color-accent`), e um **código de verificação
público** — `/verificar/:code` confirma emissor, escopo, data e status de revogação sem expor
nenhum outro dado.

**Ciência:** Roediger & Karpicke (2006) — o que o diploma atesta é o efeito de teste (recordar
fortalece), não seat-time; Cepeda et al. (2006) — retenção espaçada como critério válido;
SDT — reconhecimento de competência REAL sustenta motivação (certificado vazio a corrói).

**Compõe:** idioma documental do `pgr-document-engine.ts` (o certificado é um "documento
estruturado" da mesma família — sections → serialização), `certification-engine.ts`
(elegibilidade computada), `sm2-engine.ts` + `card-state-hydration.ts` (maturidade),
tabelas S5. **Compra pontual (ramo E):** `jspdf` + `html2canvas` (provadas no irmão).

**Novo vs irmão:** o irmão certifica conclusão com tiers escolares; nós certificamos
retenção+aplicação, com revogação e verificação pública, e **variantes por papel** (letramento
NR-1 para RH/SST; facilitador de Círculos para EMBAIXADOR — pré-requisito do I5).

**Pack:** títulos de credencial, entidade emissora, template visual por setor, disclaimer
verbatim do verso: *"Documento educativo de reconhecimento de aprendizagem. Não constitui
capacitação legal, habilitação profissional ou certificação exigida por norma."*

### I3 · Loop Vivo da Semana

**O que é.** Os 7 passos do irmão (Aprender → Praticar → Evidenciar → Refletir → Compartilhar
→ Celebrar → Evoluir) transformados em **ritual coletivo de equipe** dentro do ritmo M.E.T.E.:
cada passo destrava pela **cobertura da equipe** (ex.: ≥60% participou, contagem k≥5 — nunca
nomeando quem falta), não pelo progresso individual. Cada passo compõe uma dinâmica existente:
Aprender=D1/D2 · Praticar=missão micro · Evidenciar=`mission_evidence`/I7 · Refletir=D6 ·
Compartilhar=kudo · Celebrar=ritual do líder (I6) · Evoluir=revisão SM-2 agendada.

**Ciência:** Fredrickson (2001, broaden-and-build) — o passo Celebrar não é enfeite, é o
mecanismo (afeto positivo amplia repertório); Gaertner & Dovidio (identidade de grupo comum)
— a equipe fecha o loop JUNTA; Gollwitzer (1999) — o passo Praticar carrega intenção de
implementação ("quando X, farei Y").

**Compõe:** `season-engine.ts` (semana corrente), `learning-dynamics.ts` (D1–D6),
`participation-ledger` (novo kind `loop_step_completed`), `recognition-engine`.

**Novo vs irmão:** loop individual → maré coletiva com gate k-anon; o "Minha Turma com
leaderboard" do irmão é absorvido e **desintoxicado**: existe a visão da equipe, mas ela
mostra o anel de progresso do TIME — jamais ranking de pessoas.

**Pack:** nomes dos 7 passos, thresholds de cobertura, cadência (semanal/quinzenal).

### I4 · Expedições contra a Drenagem

**O que é.** Missões coletivas de temporada (13 semanas = capítulos) contra os **8
antagonistas sistêmicos** do cânone (§1.5): A Sobrecarga, O Silêncio, A Névoa,
A Invisibilidade, O Atrito, A Injustiça Percebida, A Desconexão, O Cinismo. O antagonista da
temporada **não é escolhido por marketing — é derivado do driver priorizado pela medição real**
(crosswalk: `carga`→A Sobrecarga; `justica`→A Injustiça Percebida; `apoio`→A Desconexão).
Contribuições individuais somam num pool coletivo (dedupe por pessoa, indivíduo jamais
exposto). E o twist que o irmão não tem: **o antagonista só recua com prova** — o delta
medido na reavaliação (`reavaliacao-engine`). O Cinismo, chefe final, só é derrotado por
ciclo fechado com evidência — verbatim do cânone: *"é exatamente para matá-lo que existem o
Culture Lab e a Vitrine de Evidências."*

**Ciência:** identidade de grupo comum (inimigo sistêmico compartilhado — o cânone já blinda:
antagonistas nunca são pessoas); Locke & Latham (2002) — metas coletivas específicas;
honestidade estatística §8 — a "derrota" declara o tamanho de efeito real (um recuo de
d=0,3 diz "pequeno", não infla).

**Compõe:** `crosswalk-engine.ts` + `exposure-derivation-engine.ts` (antagonista ← driver),
`season-engine.ts` (capítulos), `reavaliacao-engine.ts` + `evidence-engine.ts` (condição de
derrota), missões seed do pack (escopos team/org já existem), badges coletivos.

**Novo vs irmão:** antagonista decorativo → risco real medido; vitória auditável.

**Pack:** o bestiário é **narrativa de pack** (nova seção `collectiveNarrative`; o enterprise
herda o §1.5 pronto; Escola/Governo/Saúde definem os seus).

### I5 · Círculos Vivos

**O que é.** Rodas de 5–8 pessoas facilitadas por um **EMBAIXADOR** — finalmente dando função
mecânica às 15 Embaixadorias (hoje mock-only) — com roteiros determinísticos por driver
(prompts estruturados, versionados, citáveis — sem LLM, P2-04 respeitado). Contrato de
privacidade exibido na abertura e garantido **por schema**: não existe coluna de conteúdo em
`circle_sessions` — só metadados (facilitador, driver, data, contagem de presença).
Fechamento ritual: cada participante assume um micro-compromisso de gentileza (alimenta I7)
e pode plantar uma semente (I1).

**Ciência:** Edmondson (1999) — segurança psicológica se constrói em grupo pequeno com
estrutura; Craik & Lockhart (1972) — elaboração reflexiva falada; Lyubomirsky et al. (2005) —
compromissos de gentileza no fechamento.

**Compõe:** `embaixadorias-mock.ts` (+ rota `/embaixador`), dinâmica D6, `recognition-engine`,
`consent-engine`. Facilitador tem trilha própria + variante do Diploma Vivo (I2).

**Novo vs irmão:** facilitador certificado + roteiro citável + **impossibilidade estrutural**
de vazamento (privacidade por schema, não por política).

**Pack:** nome ("Círculos Vivos" / Escola: "Rodas de Conversa"), tamanho, se o líder participa
do círculo da própria equipe (default enterprise: não).

### I6 · Duplas de Prática + Celebração do Jardineiro

**O que é.** Dois mecanismos de interação entre perfis:

1. **Duplas de Prática** — pareamento **opt-in bilateral** por forças VIA-T *consentidas*
   complementares + mesmo driver em foco (colaborador↔colaborador; embaixador↔líder como
   dupla de facilitação). A dupla pratica a micro-missão da semana junta e **um confirma a
   evidência do outro** — confirmação por par substitui aprovação de RH para evidência micro,
   com anti-conluio: o mesmo par não se valida 2× na mesma semana.
2. **Celebração do Jardineiro** — o LIDER_EQUIPE (e só ele) destrava o passo Celebrar do Loop
   Vivo e converte o Pomar da Equipe (I1 canal 2) em celebração real registrada. O arquétipo
   Líder-Jardineiro do cânone §1.4 vira mecânica.

**Ciência:** SDT (pertencimento/relatedness); Gollwitzer — intenção de implementação com
parceiro tem taxa de execução maior; Weinstein & Ryan (2010, *JPSP*) — ajudar gera bem-estar
quando autônomo (dupla é opt-in bilateral, **nunca designada por gestor**).

**Compõe:** `viat/` (forças declaradas com consentimento — nunca perfil computado às
escondidas), `academia-engine.ts` (AFFINITY já existe), `participation-ledger` (kind
`pair_practice_confirmed`), missões do pack.

**Novo vs irmão:** o irmão não tem pareamento nenhum — só feed social. Aqui entra o mecanismo
mais forte da literatura de transferência: prática social com accountability recíproca.

**Pack:** vocabulário ("Duplas de Prática" / Escola: "Duplas de Estudo"), regras de papel.

### I7 · Diário de Prática Viva

**O que é.** O Action Log do S6 elevado a cidadão de primeira classe: registro de prática
aplicada ("apliquei X com minha equipe") com os 4 tipos de evidência do irmão
(texto/foto/checklist/reflexão), **privado por default** (conteúdo reflexivo nunca exposto sem
consentimento explícito POR REGISTRO), com três saídas: elegibilidade do Diploma Vivo (I2),
agregado k-anon na Vitrine de Evidências (`/experimentos`), passo Evidenciar do Loop (I3).

**Ciência:** Craik & Lockhart (elaboração), Gollwitzer (o registro fecha o "então farei Y"),
efeito de teste aplicado (recuperar o que praticou consolida).

**Compõe:** `action-plan-engine.ts`, `intervention-evidence-engine.ts`, idioma INSERT-only
de `participation_events` (S5).

**Novo vs irmão:** lá o registro morre no item do catálogo; aqui é ledger conectado à
prioridade medida da org e à credencial.

**Pack:** tipos de evidência habilitados, rótulos.

---

## §E · Spec — a Economia das Sementes

### E1 · Fontes de ganho (nunca novas torneiras — as existentes)

Sementes derivam **exclusivamente** dos eventos já registrados no `participation-ledger`
(8 kinds, todos com `maxPerDay` e teto global de XP). Conversão configurada no pack
(`prosocialEconomy.earning`): ex. 1 semente por evento de kind elegível, cap semanal.
**Nenhuma fonte nova de farming é criada** — se o ledger já é anti-gaming, a carteira herda.

### E2 · Os três canais de gasto

| Canal | Destino | Mecânica | Visibilidade |
|---|---|---|---|
| `person` | colega | item do catálogo doável; consome orçamento semanal de doação | privada por default; nome do doador só com opt-in |
| `team` | Pomar da Equipe | contribuição a pool; líder converte em celebração (I6) | pool sempre agregado |
| `cause` | Bosque do Bem-Comum | pool org rumo a meta; empresa cumpre compromisso CSR declarado | pool k≥5; compromisso e cumprimento públicos |

### E3 · A lista "NUNCA" (verbatim — proibições de design)

1. **Nunca** leaderboard de doadores, nem "top doadores", nem total individual público.
2. **Nunca** exibir quem não doou; **nunca** nudge de culpa ("você ainda não doou" é proibido).
3. **Nunca** meta individual de doação; metas são sempre coletivas e opt-in.
4. **Nunca** conversão de sementes em dinheiro, benefício, folga, brinde físico individual ou
   qualquer vantagem material — a moeda é reconhecimento simbólico, ponto (invariante 6:
   jamais alimenta remuneração; fronteira LGPD/trabalhista limpa).
5. **Nunca** XP ou sementes de volta por doar (SDT/overjustification — o motivo pró-social
   não se compra).
6. **Nunca** doação anônima forçada NEM identificação forçada — visibilidade é escolha do
   doador, recebimento é sempre digno (microcopy: "alguém plantou uma semente para você").
7. **Nunca** o canal `cause` como promessa da plataforma: o compromisso CSR é declarado, com
   texto próprio, pela empresa cliente; a plataforma registra e cobra transparência
   (status: declarado → meta atingida → cumprido com evidência).

### E4 · Governança do pool (Ostrom aplicado)

Fronteiras claras (quem participa: a org; o time), regras definidas no pack e visíveis na UI,
monitoramento transparente (pool agregado sempre público em k≥5), sanção zero a indivíduos
(só a integridade do pool importa), arena de mudança (o founder/RH ajusta o catálogo por
config, nunca por código).

---

## §F · Spec — o Diploma Vivo

### F1 · Elegibilidade computada (nunca comprada, nunca por presença)

```
elegível(user, driver) =
    trilha_concluida(driver)                       # learning_progress/quiz
  ∧ retencao_madura(driver)                        # ≥N cartões SM-2 com intervalo ≥21d (dado real)
  ∧ pratica_aplicada(driver) ≥ 1                   # practice_records (I7)
```

Variantes por papel: **Letramento NR-1** (RH/SST — pré-requisito recomendado antes da 1ª
onda, já previsto no §F3 do Plano Mestre) · **Facilitação de Círculos** (EMBAIXADOR —
pré-requisito do I5).

### F2 · Documento e verificação

- **Documento:** mesma família do `pgr-document-engine` (meta + sections + notice); render
  premium client-side (`jspdf` + `html2canvas`): serif nos títulos, selo `--color-accent`,
  nome da pessoa **com consentimento explícito de exibição** (`display_name_consented`).
- **Verificação:** código público único; `/verificar/:code` responde apenas
  {válido?, tipo, escopo, data, revogado?} — nenhum outro dado pessoal.
- **Revogação:** só via service_role (erro de emissão, fraude); histórico preservado.
- **Disclaimer verbatim (verso):** "Documento educativo de reconhecimento de aprendizagem.
  Não constitui capacitação legal, habilitação profissional ou certificação exigida por
  norma. Emitido por [emissora do pack] com base em critérios computados de conclusão,
  retenção e prática registrada."

---

## §G · Arquitetura de dados (Supabase)

Dois padrões RLS já estabelecidos e verificados em produção nesta sessão:
**pessoal** (S5: linha de `auth.uid()`, cliente direto, INSERT-only onde histórico importa) e
**org** (S1–S4: RPC atômica + autorização por sessão, agregado k-anon sai por função).

| Tabela | Colunas-chave | Padrão | Nota |
|---|---|---|---|
| `seed_wallet_events` | user_id, event_id UNIQUE(user,event), kind(`earned`\|`donated_person`\|`donated_team`\|`donated_cause`), amount, source_kind, occurred_on | pessoal, **INSERT-only** | saldo = fold (event sourcing); débito via RPC `donate_seeds` atômica |
| `recognition_gifts` | org_id, sender_id, recipient_id, item_id, named_visibility, occurred_on | RPC-only | **sem coluna de mensagem** (neverPersist por schema) |
| `csr_pledges` | org_id, cause_id, pledge_statement, seed_target, status, fulfilled_evidence_ref | org/admin | ponte CSR honesta; pool por view k-anon |
| `certificates_issued` | user_id, credential_kind, scope_ref, verify_code UNIQUE, payload_hash, display_name_consented, issued_at, revoked_at | pessoal p/ dono; RPC pública `verify_credential(code)` | revogação só service_role |
| `practice_records` | user_id, record_id UNIQUE(user,record), driver_id, evidence_kind, content_private, share_consent, occurred_on | pessoal, INSERT-only | conteúdo só sai agregado/contado |
| `loop_step_events` | org_id, team_id, user_id, week_key, step_id, occurred_on | RPC; leitura SÓ agregada | nunca listar faltantes |
| `collective_mission_events` | org_id, mission_id, antagonist_id, season_id, user_id (dedupe), contribution, occurred_on | RPC; pool agregado | user_id p/ dedupe, jamais exposto |
| `circle_sessions` | org_id, facilitator_user_id, driver_id, script_version, scheduled_on, attendance_count | org RPC | **zero coluna de conteúdo** |
| `practice_pairs` + `pair_confirmations` | pair: member_a, member_b, driver_id, status; confirmations INSERT-only | RPC duplo-consent | reciprocidade limitada no engine |

**Extensões sem tabela nova:** `participation_events.kind` ganha `circle_attended`,
`loop_step_completed`, `pair_practice_confirmed`, `practice_record`,
`expedition_contribution` (tetos no pack). `gamification-economy.json` ganha
`prosocialEconomy`, `collectiveNarrative`, `credentialTemplates`; `domain-pack.schema.json`
atualizado (validação Ajv no boot — invariante 19).

**Lição operacional herdada (runbook):** toda migration nova NESTA conta Supabase precisa de
REVOKE explícito + verificação `has_table_privilege` (o default da conta concede ALL a toda
tabela nova — achados S1 e S5 documentados no RUNBOOK_MIGRACOES_LOVABLE.md).

---

## §H · Mapa de engines (puros, kebab-case, testes co-localizados)

| Engine novo | Compõe | Testes est. |
|---|---|---|
| `engine/recognition/seed-economy-engine.ts` | recognition-engine, participation-ledger | ~22 |
| `engine/certification/credential-engine.ts` | sm2 (maturidade), learning progress, practice-log | ~16 |
| `engine/certification/certificate-document-engine.ts` | idioma pgr-document | ~10 |
| `engine/learning/loop-week-engine.ts` | season, learning-dynamics | ~18 |
| `engine/gamification/expedition-engine.ts` | crosswalk, season, evidência (sinal injetado) | ~16 |
| `engine/circles/circle-engine.ts` | embaixadorias (roles injetados), consent | ~12 |
| `engine/learning/practice-pair-engine.ts` | viat (forças consentidas injetadas), academia | ~15 |
| `engine/learning/practice-log-engine.ts` | action-plan, intervention-evidence | ~10 |

≈119 testes novos sobre os 1496 atuais. Lei de ferro: **nenhum importa `domain/`** —
antagonistas, catálogo, forças e thresholds chegam por parâmetro.
**Compra pontual (ramo E):** `jspdf` + `html2canvas`.

---

## §I · Rollout (a espinha do Plano Mestre permanece)

| Fase | Conteúdo | Demo de 60s |
|---|---|---|
| **Fatia imediata** (esta sessão) | Substrato I1 mock-first: `seed-economy-engine` + pack `prosocialEconomy` + seção Sementes Vivas em `/reconhecimento` | "Participei → ganhei sementes → plantei uma para a colega, privada por default → o pomar coletivo cresce em k≥5. Nenhum ranking em lugar nenhum." |
| **S6 (comprometido — riders naturais)** | Action Log nasce já como Diário de Prática Viva (I7); camada PDF (jspdf) entra servindo o plano E de graça prepara o Diploma | "Da capsule ao PDF do plano; o líder registra a prática aplicada com evidência." |
| **S6.5 · "Reconhecer e Selar"** | Persistência das Sementes (canal person) + Diploma Vivo v1 + `/verificar/:code` | "Concluo a trilha de Carga com retenção comprovada → Diploma premium com meu nome → planto uma semente para quem me apoiou." |
| **S7 (+ carona leve)** | Diploma e Loja Viva na landing como prova; I3 Loop Vivo v1; I6.2 Celebração do Jardineiro | "A equipe fecha os 7 passos como maré; o líder celebra e o pomar floresce — sem nomear quem faltou." |
| **S8 (+ Expedições)** | I4 (exige reavaliação real p/ derrota honesta) + I1 canal `cause` (csr_pledges) | "A org mede de novo: A Sobrecarga recua com prova (d declarado); o pool bate a meta e a empresa cumpre o compromisso que ELA declarou." |
| **S9 / pós-S8** | I5 Círculos (exige embaixadorias reais + trilha de facilitador) e I6.1 Duplas (exige VIA-T consentido em escala — temporada T2) | "A embaixadora abre um círculo de 6 pessoas com roteiro citável; nada do que foi dito existe em banco — só que aconteceu, e as sementes plantadas no fechamento." |

**Racional:** economia+certificado primeiro (pedidos explícitos, dependem só do S5 entregue);
coletivo-ritual depois (Loop barato, compõe o existente); coletivo-narrativo quando houver
reavaliação (honestidade da derrota); dinâmicas humanas por último (dependem de processo
organizacional real, não de código).

---

## §J · Riscos e ética

| Risco | Mitigação de design |
|---|---|
| Doação vira obrigação social ("todo mundo doou menos eu") | lista NUNCA §E3: sem leaderboard, sem exposição de não-doadores, sem meta individual; default privado |
| Shaming reverso (doador ostentação) | nome do doador é opt-in POR doação; agregados só k≥5 |
| Conluio de duplas (validação recíproca fraudulenta) | reciprocidade limitada (1×/semana por par), evidência micro só vale XP capado, RH audita agregados |
| Semente vira "moeda paralela" trabalhista | proibição verbatim de conversão material (§E3.4); disclaimers na UI; revisão jurídica antes do canal cause |
| Antagonista lido como pessoa/área | cânone §1.5 blinda (sistêmico, nunca pessoas); copy sempre no sistema ("A Sobrecarga"), nunca em quem sofre dela |
| Círculo vaza conteúdo sensível | privacidade por SCHEMA (sem coluna de conteúdo); contrato exibido na abertura; protocolo de tema sensível do cânone (§5.2) |
| Certificado inflado (overclaim pedagógico) | elegibilidade tripla computada; disclaimer verbatim; revogação |
| Conteúdo pedagógico raso para preencher trilha | NENHUM conteúdo inventado; curadoria editorial do founder; stubs honestos "em breve" |
| LGPD (dados de doação/prática) | practice_records INSERT-only com consent por registro; gifts sem mensagem; DPO review no S6.5 |

**O que NUNCA faremos (síntese):** ranking de pessoas em qualquer métrica desta economia;
gamificação de sofrimento; conversão material; chatbot antes da data plane; conteúdo sem
fonte; promessa de resultado.

---

## §K · Métricas e critérios de aceite

**North Star educacional:** % de pessoas com o ciclo completo no trimestre —
aprendeu (trilha) → reteve (SM-2 maduro) → aplicou (practice_record) → **deu** (≥1 semente
plantada, qualquer canal) — reportado SEMPRE como agregado k≥5.

| Métrica | Fonte | Guarda |
|---|---|---|
| Retenção SM-2 (fresh/young/mature por driver) | sm2_card_state (real) | pessoal, nunca comparativa entre pessoas |
| Práticas registradas / ciclo | practice_records | agregado k≥5 |
| Circulação pró-social (sementes plantadas, pools) | seed_wallet_events | SÓ agregados; jamais por pessoa |
| Cobertura do Loop Vivo | loop_step_events | por equipe k≥5 |
| Recuo de antagonista | reavaliacao-engine (delta real) | com tamanho de efeito declarado |
| Diplomas emitidos / verificações públicas | certificates_issued | contagem simples |

**Aceite da fatia imediata:** engine puro sem import de domain; ~22 testes verdes; pack valida
no Ajv; demo de 60s no browser (ganhar → plantar → pomar k-anon); zero regressão nos 1496.

---

## Autoauditoria (§10 da SKILL_MESTRA)

- [x] Tríade planejada (engine → teste → mock → rota → wiring) para cada inovação.
- [x] Engine ≠ domínio: bestiário, catálogo, verbos e thresholds via pack.
- [x] k-anon, A/B, disclaimers e termos vedados endereçados por inovação (§D, §E3, §J).
- [x] Honestidade: citações verificadas e corrigidas (Aknin 2013 JPSP; Moll 2006 PNAS;
      Harbaugh 2007 Science); zero conteúdo pedagógico inventado; CSR sem promessa.
- [x] Composição sobre acúmulo: 8 engines novos compõem 12 existentes; zero silo.
- [x] Features de vaidade rejeitadas e registradas (§B3).
- [x] Rollout preserva S6–S8; fatias verticais com demo de 60s cada.
- [x] Usuário do quiosque: doação e loop funcionam no celular, opt-in, linguagem adulta.
