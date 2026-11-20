# Guia da Jornada Empresarial VitalOS · v2

**Proposta para o comitê · 20/11/2026.** Este documento substitui a v1.0 ("Superprompt de implementação · proposta para avaliação do comitê"). Traz quatro partes: o parecer sobre a v1, a decisão de experiência, o superprompt v2 e o quadro de mudanças para o comitê. A implementação começa só depois do parecer do comitê e da decisão de João Paulo. Esta versão não contém credenciais.

---

## Parte 1 · Parecer sobre a v1

A v1 acerta no essencial e essas decisões ficam: uma jornada única navegável por etapa e por perspectiva, a separação entre os três mapas do produto (lentes, ciclo de trabalho e perspectivas do IVO), o caso compartilhado da troca de turno, o limite entre exemplo e operação, e a regra de que ler o guia nunca gera registro. As cinco lacunas abaixo mudam a compreensão do leitor ou o trabalho de quem implementa. A evidência vem do repositório, em leitura dirigida.

| # | Prioridade | Seção da v1 | O que o leitor ou o implementador enfrentaria | Evidência no repositório | Menor mudança suficiente |
|---|---|---|---|---|---|
| 1 | Crítica | §4 Q1 e §5 item 4 | A v1 pede "a orientação disponível a uma pequena empresa sem RH ou SST próprio". Hoje a revisão técnica do Q1 só pode ser designada para um perfil SST **da própria empresa**. O cadastro de profissionais parceiros existe só em desenvolvimento e não opera como marketplace. Sem essa informação, o guia tende a sugerir um caminho de apoio que não existe. | Registro de integração Q1+Q2 (`docs/vitalos/Q1Q2_INTEGRACAO_LOCAL_2026-11-19.md`, "Revisão curta e delegação Q1" e "Fechamento operacional Q2", linha "Profissionais parceiros") | Uma tabela "Quem faz a preparação do Q1" com três situações: empresa com SST próprio; empresa que delega a preparação; empresa sem SST. A terceira situação leva ao serviço ("Conversar sobre o Q1"), nunca a um diretório de profissionais. |
| 2 | Alta | §3 e §5 item 3 | Quem reutilizar a fonte da jornada herda datas fixas ("Jan–Mar", "T1-2026"), o rótulo "COPSOQ — Compliance" e o destaque "Prevenção NR-1". Isso contraria a regra da própria v1 sobre datas e a doutrina de não prometer conformidade. Além disso, Q5 não existe nessa fonte, que tem só quatro etapas, e ela usa T1–T4 em vez de Q1–Q4. | `src/domain/journey.ts` (`CANONICAL_JOURNEY`, campos `startLabel`, `cycleId`, `lensName`, `headline`) | O guia lê de `CANONICAL_JOURNEY` só a ordem e a identidade das lentes. Rótulos, marcos de tempo e a etapa Q5 ficam no conteúdo editorial do próprio guia. O texto de tela não usa "Compliance". |
| 3 | Crítica | §4 (disponibilidade) e §8 | A v1 exige "disponível no ambiente de destino", mas as capacidades estão espalhadas em linhas de código que ainda não se juntaram. Q1 e Q2 integrados estão em uma branch local. A demo do Q3 está no `main` e a produção responde 404. O Q4 é trabalho local do Codex sem commit. O modelo do Q5 rastreável está em outra branch local. Sem um registro único de disponibilidade, cada tela vai decidir sozinha se mostra o CTA. | `integ/q1-q2-merge` (`f8cabb9`); `origin/main` (`7338ebf`); `codex/q4-pratica-forcas` (não comitado); `feat/claude-ciclo-relatorio` | Um único arquivo de disponibilidade (lente × papel × ambiente) com quatro níveis: descrito, demonstrativo, comprovado localmente e disponível no ambiente. O CTA operacional só aparece no último nível. A tela mostra o nível em linguagem cotidiana. |
| 4 | Alta | §7 | A v1 manda reutilizar o acesso da apresentação. Esse acesso guarda sessões em memória, num só processo, e recusa outros modos. Em um ambiente com várias instâncias, a sessão some entre requisições. A v1 também não diz como a pessoa já autenticada chega a "Meu percurso" sem passar pela senha editorial. | `src/lib/presentation/access.server.ts` (`VITALOS_PRESENTATION_STORE` precisa ser `"single-process"`; mapa `sessions` em memória) | Separar as duas portas. A senha editorial protege só a leitura genérica do visitante. "Meu percurso" usa a sessão institucional resolvida no servidor. Antes de reutilizar o mecanismo, confirmar se o armazenamento de sessão funciona no ambiente de destino; se não funcionar, fica uma decisão de engenharia registrada. |
| 5 | Alta | §1 e §5 item 2 | Quem avalia a contratação lê uma boa pergunta, mas não encontra em uma dobra o que recebe, o que a empresa precisa mobilizar e como a cobrança funciona. A v1 trata a direção como "público editorial até encontrar um papel", mas o esquema já tem o papel `DIRETOR` e outros papéis empresariais (`DGP_RH`, `SESMT_SAUDE`) sem escopo documentado no Q1 e no Q2. | Decisão comercial do Q1 em `docs/vitalos/decisions/Q1_COPSOQ_FORMA_ADOTADA_2026-11-20.md` (serviços pagos; o questionário não tem cobrança separada); `PROGRAMA_Q1_OFFER` em `src/mocks/programa-mock.ts`; papéis em `supabase/migrations/20261119120000_*` | Abertura com três blocos: "Você recebe", "Sua empresa mobiliza" e "Você poderá consultar", usando a linguagem já aprovada da oferta. `DIRETOR`, `DGP_RH` e `SESMT_SAUDE` entram no inventário com o escopo "a confirmar" até haver fonte. |

**Divergências registradas, que ficam condicionadas à confirmação:**
- A v1 cita o "SST designado". O esquema tem dois papéis próximos, `SST_PROFISSIONAL` e `SESMT_SAUDE`. A designação do Q1 está documentada para o perfil SST. A relação com `SESMT_SAUDE` falta confirmar.
- A rota `/guia-empresarial` não colide com nenhuma rota existente na base conferida (`feat/claude-ciclo-relatorio`). É preciso conferir de novo na base escolhida para a implementação.

---

## Parte 2 · Decisão de experiência

| Critério | 1. Entrada pelo papel | 2. Entrada pelo calendário | 3. Entrada por situação de trabalho |
|---|---|---|---|
| Compreensão no primeiro acesso | média: quem ainda não contratou não sabe qual é o seu papel | alta para o ano, baixa para a contribuição | **alta**: um caso concreto explica o método sem vocabulário |
| Encontrar a própria tarefa | **alta** | baixa: a tarefa fica dentro de cada etapa | média: depende de trocar a perspectiva |
| Continuidade entre perfis | baixa: cada perfil vê o seu fragmento | média | **alta**: o mesmo caso atravessa todos os papéis |
| Experiência no celular | boa | ruim: linha do tempo larga | boa, se o caso vier em sequência vertical |
| Custo de manter o conteúdo | alto: um texto por papel × etapa | **baixo** | médio: um caso × papéis × etapas, com registro único |

**Decisão:** uma jornada única guiada pelo caso da troca de turno. O papel funciona como perspectiva que se troca sem perder a etapa nem o caso, e o mapa Q1–Q5 fica sempre a um gesto.

**A entrada varia conforme o ponto de origem:**
- **Home** (quem está conhecendo a proposta): abre pelo caso e pela entrega.
- **Painel** (quem já participa): abre no papel e na lente que o servidor reconhece, no item "Meu percurso". O caso fica como exemplo ao lado.

**Principal trade-off:** quem não se reconhece no caso de um centro de distribuição precisa de uma ponte. Uma variante curta de "pequena empresa" e a troca de perspectiva resolvem isso sem multiplicar casos. O custo de manutenção cai porque disponibilidade e rótulos vêm de um registro único, e não do texto das telas.

---

## Parte 3 · Superprompt v2 (autocontido)

### 0. Condição de início e escopo

- Implemente só depois de receber de João Paulo a versão aprovada desta v2.
- O escopo é local: dados fictícios e ambiente local autorizado.
- Publicação, deploy, dados de clientes, contas reais e contato externo exigem autorização específica.
- A credencial da leitura editorial é entregue por João Paulo em canal privado. Ela vai só para o mecanismo de segredo do servidor. Nas provas, use uma credencial de teste diferente.

### 1. Missão

Crie, na VitalOS, um guia da jornada empresarial com duas portas de entrada: a home, para quem avalia contratar, e o painel, para quem já participa. O guia transforma uma escuta organizacional em quatro coisas que o leitor consegue explicar: **uma decisão compreensível, uma ação acompanhada, uma devolutiva com evidência e o que ainda está em aberto.**

Quem participa precisa responder, com as próprias palavras:
1. Onde estou no ciclo?
2. Qual é a minha contribuição?
3. Quem recebe o que eu faço?
4. Como saberei o que aconteceu depois?

Quem avalia contratar precisa responder:
1. O que minha empresa recebe?
2. O que precisa mobilizar?
3. Que evidência poderei consultar e com que alcance?

A autoria institucional é do Instituto Felicidade para Todos, com a identidade VitalOS e as marcas oficiais já presentes em `public/brand/`.

### 2. Antes de editar · estado verificado em 20/11/2026

Confira branch, HEAD, worktrees e trabalho local. Preserve os worktrees de outras frentes, `.q.out` e `.q.sql`. Não junte trabalhos em andamento para viabilizar a demonstração. Releia esta tabela na base escolhida; os caminhos podem mudar.

| Item | Fonte | Estado em 20/11 | O guia pode |
|---|---|---|---|
| Sequência das lentes | `src/domain/journey.ts` · `CANONICAL_JOURNEY` | 4 etapas, T1–T4, com meses fixos e rótulo "COPSOQ — Compliance" | usar ordem e identidade; não usar meses, rótulo nem destaque |
| Q1 · preparação, comunicado, delegação e revisão técnica | `src/routes/ivo-integral.preparar-q1.tsx`, registro de integração Q1+Q2 | comprovado localmente em `integ/q1-q2-merge`; fora do `main` | descrever e demonstrar; CTA só quando estiver disponível no ambiente |
| Q1 · coleta COPSOQ II-Br | `src/lib/identity/module-access.server.ts` (`method_pending`); `Q1_COPSOQ_FORMA_ADOTADA_2026-11-20.md` | bloqueada: faltam enunciados oficiais, regra de respostas em branco e permissão de uso | dizer "coleta oficial em preparação" |
| Q1 · designação do SST | registro de integração Q1+Q2 | exige perfil SST da mesma empresa, com o módulo Q1 habilitado | explicar a designação; não oferecer SST externo |
| Q2 · leitura → atividade aprovada → plano → execução → aprendizagem → devolutiva | `src/routes/ivo-integral.q2.tsx`, `ivo-integral.acoes.tsx`, `devolutiva.tsx` | comprovado localmente por papel (RH, liderança, colaborador), fora do `main` | caso principal; CTA só quando estiver disponível no ambiente |
| Q3 · Vitalidade 001 v0.2.0 | `src/domain/ivo/q3-vitality-unit-001.json`; rota `/q3-demo` | unidade aprovada em D10, escopo local; demo no `main` (`7338ebf`); produção dá 404 | prática voluntária de exemplo; sem item, escore ou ranking |
| Q4 · percurso individual VIA-T | `/viat`; branch `codex/q4-pratica-forcas` | exploratório; percurso novo não comitado pelo Codex | exemplo individual; sem visão de equipe |
| Q5 · Relatório Global | `/relatorio-global` (demonstrativo); `src/lib/reports/cycle-report.ts` | modelo rastreável sintético em branch local | extrato sintético rotulado |
| Acesso editorial | `src/lib/presentation/access.server.ts` | sessão em memória num só processo | reutilizar só se o armazenamento servir no ambiente de destino |
| Papéis | migrations Q2 (`RH_ADMIN`, `DGP_RH`, `DIRETOR`, `SESMT_SAUDE`, `LIDER_EQUIPE`), `COLABORADOR`, `SST_PROFISSIONAL`, `PLATFORM_ADMIN` | escopo do Q1 e do Q2 documentado para RH, liderança, colaborador, SST e plataforma | outros papéis com orientação "a confirmar" |
| Rota proposta | `/guia-empresarial` | sem colisão na base conferida | confirmar de novo na base escolhida |

### 3. Arquitetura

- **Uma jornada versionada, guiada por um caso.** Todo o conteúdo do guia vive em um módulo de conteúdo (sugestão: `src/domain/guide/enterprise-guide.ts`), sem lógica de negócio. Cada afirmação operacional aponta para um item do registro de disponibilidade (§11).
- **Estado de navegação:** `{ etapa: Q1…Q5, perspectiva: papel, detalhe?: id }`, refletido na URL para permitir voltar e compartilhar. Ao trocar a perspectiva, a etapa e o caso ficam. Ao trocar a etapa, a perspectiva fica. Um gesto ("Ver o mapa") volta ao mapa com o foco no item de onde a pessoa saiu.
- **Duas entradas:**
  - **Home:** um convite discreto "Conheça a jornada na VitalOS" leva à abertura comercial. A home continua funcionando como antes.
  - **Painel:** o item "Guia da minha jornada" abre em `perspectiva = papel reconhecido pelo servidor` e `etapa = lente habilitada mais recente`. Se o servidor não reconhecer papel nem lente, abre o mapa com a explicação.
- **Nada de motor novo.** Nenhum motor de autorização, calendário paralelo ou banco de progresso. Escolher uma perspectiva muda só a explicação, nunca permissões.

### 4. Os três mapas, numa cena

| Mapa | Pergunta | Como aparece |
|---|---|---|
| Lentes da jornada anual | Em que momento estamos? | Q1 COPSOQ · Q2 FIB-T · Q3 PERMA+V · Q4 VIA-T → **Q5 · Síntese anual · Relatório Global ESG**. Marcos genéricos: "Ao iniciar o trimestre", "Durante o acompanhamento", "Na revisão". |
| Ciclo de trabalho | O que fazemos com o que aprendemos? | Mensurar → Educar → Transformar → Evoluir, dentro de uma mesma lente |
| Perspectivas do IVO | De onde olhamos? | EU · NÓS · LIDERANÇA · ORGANIZAÇÃO. São olhares de leitura, não papéis de acesso. |

**Cena para a tela (Q2, um quadro só):** "No **Q2** (lente), a equipe da Expedição está em **Transformar** (ciclo): a liderança combina o alinhamento de troca de turno. A mesma liderança pensa em como chega ao turno (**EU**) e cuida do combinado da equipe (**NÓS**); o RH acompanha pela **ORGANIZAÇÃO**." Um destaque visual liga cada palavra ao seu mapa. Na primeira ocorrência, um termo expansível define IVO: "Índice de Vitalidade Organizacional: organiza a leitura em quatro perspectivas. Nesta versão, ele não é calculado no guia."

### 5. Caso de referência · Centro de distribuição Serra Azul (fictício)

Exemplo construído, com prazos ilustrativos. Fica rotulado assim em toda tela onde aparece.

- **Contexto.** Na passagem entre o turno da manhã e o da tarde, as prioridades da Expedição chegam incompletas. Quem entra perde tempo confirmando pedidos, e quem sai estende o horário.
- **Q1 · preparação (risco psicossocial como contexto, não como resultado).**
  - O RH registra o comunicado do ciclo e encaminha a preparação para revisão técnica.
  - O SST designado revisa e devolve com uma recomendação. A escuta deve chegar aos dois turnos, com horário de resposta dentro da jornada de cada um. O comunicado deve explicar que a passagem de turno é tema da conversa coletiva, nunca da avaliação de alguém.
  - Tela: "Coleta oficial em preparação. O exemplo mostra como a preparação acontece."
- **Q2 · da leitura à devolutiva (caso principal).**
  1. **Leitura agregada (RH).** No setor Expedição (12 respostas), o fator *Satisfação com a Empresa* aparece abaixo dos demais. O setor Manutenção, com 3 respostas, não aparece: grupos com menos de 5 respostas ficam protegidos.
  2. **Atividade aprovada (RH).** O RH escolhe a prática de aprendizagem em equipe aprovada em D10, que consiste em escolher um tema coletivo e combinar uma conversa voluntária sobre condições de trabalho. O tema é a passagem de turno.
  3. **Plano (RH).** O RH ativa o plano do ciclo e designa a liderança da Expedição como responsável pela ação "alinhamento de 10 minutos na troca de turno, por duas semanas".
  4. **Execução (liderança).** A liderança combina o alinhamento com a equipe e registra o que aconteceu: dias realizados, dias em que não coube na rotina, e o motivo.
  5. **Aprendizagem (RH).** O RH registra o que a execução ensinou: em três dias o alinhamento não coube porque o caminhão atrasou.
  6. **Devolutiva coletiva (colaborador).** Depois do aviso de publicação, a equipe vê o título da ação, o setor, o fator, o estado, o prazo e o texto "execução registrada"; "Eficácia ainda não avaliada" aparece em seguida. A devolutiva não mostra responsável nem evidência individual.
- **Q3 · autonomia da lente.** A Vitalidade 001 propõe uma pausa curta entre reuniões, voluntária. Quem participa marca no quadro da equipe se a pausa aconteceu, e ninguém é avaliado por isso. A tela não liga Q3 a Q2.
- **Q4 · esfera individual.** Uma pessoa da Expedição lê sobre uma força de caráter e escolhe, sozinha, um jeito de aplicá-la na troca de turno. O registro é dela. Não existe visão de equipe; a tela diz: "Visão coletiva exige contrato próprio de finalidade e privacidade."
- **Q5 · extrato do relatório (sintético).**

| Tipo | Trecho | Fonte de referência |
|---|---|---|
| Execução registrada | "A liderança registrou o alinhamento em 7 de 10 dias." | Registro de execução da ação (Q2) |
| Decisão documentada | "O RH decidiu adaptar o horário do alinhamento para depois da chegada do caminhão." | Revisão do plano (Q2) |
| Mudança observada | "Não há leitura comparável depois da ação; mudança não estimável." | Leitura do ciclo seguinte (ausente) |
| Efeito avaliado | "Não avaliado: não houve desenho de avaliação." | — |

Tela: "Dado sintético. Ausência de dado, dado suprimido e ausência de mudança aparecem como estados diferentes. Vínculos ESG aparecem só como propostos enquanto não forem aprovados."

### 6. Vozes por perfil

| Perfil | Pergunta que o leitor traz | Verbo principal | Texto de tela (exemplo) | Quem recebe a próxima entrega | O que fica privado |
|---|---|---|---|---|---|
| Colaborador | "Minha resposta faz diferença?" | acompanhar a devolutiva | "Quem trabalha no turno conhece os detalhes. Sua resposta entra numa leitura do grupo, nunca individual. Veja qual mudança a equipe decidiu experimentar e onde acompanhar o retorno." | a equipe inteira, na devolutiva coletiva | a resposta individual e a participação nas práticas |
| Liderança designada | "O que eu combino, e o que eu registro?" | combinar a prática; registrar a execução | "Seu papel é combinar a prática com a equipe e registrar o que de fato aconteceu. Se o encontro não coube na rotina, registre também: isso orienta a revisão." | o RH, que revisa e decide a continuidade | quem participou de cada encontro |
| RH ou administração autorizada | "Que decisão vou explicar à equipe no fim do ciclo?" | escolher a prioridade; designar o responsável; decidir na revisão | "Escolha uma prioridade, designe quem acompanha e combine quando voltar ao assunto. A equipe verá o que foi decidido." | a equipe (devolutiva) e a direção (relatório) | dados de grupos com menos de 5 respostas |
| SST designado (Q1) | "O que a minha revisão ajuda a decidir?" | revisar a preparação | "Sua leitura técnica ajuda a decidir se a escuta está adequada às condições de trabalho, aos horários de cada turno e à forma de comunicar o tema." | o RH, que ajusta e encaminha a nova revisão | — |
| SST no Q2 | "Tenho papel no Q2?" | acompanhar (acesso a confirmar) | "No Q2 você não registra nem decide ações. Acompanhar a devolutiva coletiva depende do seu acesso na empresa." | — | — |
| Direção (`DIRETOR`, escopo a confirmar) | "O que a empresa recebe e que decisão posso tomar?" | ler o relatório | "O relatório mostra o que foi executado, o que foi decidido e o que ainda não se sabe, com a origem de cada informação." | o conselho ou a área, conforme o relatório | dados individuais (nunca chegam) |
| Plataforma (`PLATFORM_ADMIN`) | "O que eu habilito?" | habilitar o módulo; designar o revisor | "A habilitação define quais lentes a empresa usa. A designação do revisor técnico do Q1 é feita aqui." | a empresa habilitada | — |
| Pequena empresa sem RH ou SST | "Isso serve para nós?" | conversar sobre o serviço | "A preparação pode ser delegada pela plataforma a uma pessoa da empresa. A revisão técnica exige um profissional SST com perfil na empresa. Se vocês não têm, isso entra na conversa sobre o serviço." | — | — |

`DGP_RH` e `SESMT_SAUDE` aparecem no inventário com a orientação "a confirmar". Sem fonte, não ganham texto de tarefa.

### 7. Matriz perfil × etapa (mínimo exigido)

Cada célula responde em uma linha: o que fazer ou o que acompanhar, quem recebe a entrega e o nível de disponibilidade. Os níveis são **D** (descrito), **Dm** (demonstrativo), **L** (comprovado localmente) e **A** (disponível no ambiente).

| | Q1 | Q2 | Q3 | Q4 | Q5 |
|---|---|---|---|---|---|
| Colaborador | lê o comunicado (L) · coleta em preparação (D) | acompanha a devolutiva (L) | participa, se quiser, da prática (Dm) | reflete em privado (Dm) | lê o extrato coletivo (Dm) |
| Liderança | pode receber a delegação da preparação (L) | combina e registra a execução (L) | facilita, sem acompanhar quem participa (Dm) | reflete sobre o EU (Dm) | lê a ação que acompanhou (Dm) |
| RH | prepara, comunica e encaminha à revisão (L) | lê, escolhe a atividade, planeja, designa e decide (L) | oferece a prática (Dm) | — (esfera individual) | lê e decide os compromissos (Dm) |
| SST designado | revisa a preparação (L) | sem autoridade sobre ações (L); devolutiva: acesso a confirmar | — | — | lê o extrato (Dm) |
| Direção | escopo a confirmar | escopo a confirmar | — | — | lê o relatório (Dm) |
| Plataforma | habilita e designa (L) | habilita (L) | — | — | — |

Nenhuma célula diz "nada a fazer". Onde não há tarefa, a célula diz quem atua e o que a pessoa pode acompanhar.

### 8. Aberturas

**A · Para quem avalia contratar (entrada pela home)**
- **Título:** "Depois de ouvir a equipe, como saber o que a empresa fez a respeito?"
- **Texto:** "A VitalOS organiza a escuta, a decisão, a ação e a devolutiva em um ciclo trimestral. Você acompanha um exemplo construído: uma troca de turno num centro de distribuição."
- **Três blocos:**
  - **Você recebe:** preparação da avaliação, leitura por grupo, apoio ao plano, devolutiva e relatório com a origem de cada informação.
  - **Sua empresa mobiliza:** uma pessoa que coordena, lideranças que acompanham a ação e tempo da equipe para participar.
  - **Você poderá consultar:** o que foi executado, o que foi decidido e o que ainda não foi avaliado.
- **Linha de cobrança:** "A contratação remunera os serviços. O questionário COPSOQ II-Br não tem cobrança separada."
- **CTA principal:** "Ver a jornada por perfil". O clique abre o mapa em Q2, na perspectiva RH, com o caso visível e o seletor de perfil focado.
- **CTA secundário:** "Conversar sobre a VitalOS", que leva ao destino institucional já usado na oferta do Q1.

**B · Para quem já participa (entrada pelo painel)**
- **Título:** "Seu momento no ciclo"
- **Texto:** "Você está no **Q2 · Transformar** como **liderança da Expedição**. A próxima entrega é sua: registrar o que aconteceu no alinhamento. Quem recebe é o RH, que decide se a prática continua."
  - Os valores vêm do servidor. Sem dados, o texto vira: "Ainda não há uma ação atribuída a você. Veja quem atua nesta etapa."
- **CTA principal:** "Registrar o que aconteceu". Aparece só se estiver disponível no ambiente, com papel, módulo e ação válidos; o clique leva ao fluxo existente de ações.
- **Sem CTA operacional:** o CTA vira "Ver como funciona nesta etapa" e abre o exemplo.
- **Ações secundárias:** "Ver o mapa do ano" e "Trocar perspectiva".

### 9. Exemplo resolvido e checagens opcionais

As checagens são privadas, sem pontuação e sem registro. A pessoa pode pular, rever ou aprofundar. O desenho segue dois estudos: a recordação ativa, porque responder antes de ver a explicação favoreceu a retenção em textos (Roediger e Karpicke, 2006), e o controle do ritmo pelo leitor (Mayer e Chandler, 2001). O ganho precisa ser medido no contexto VitalOS (§15).

**Exemplo resolvido (Q2, perspectiva RH).** "A leitura da Expedição mostra *Satisfação com a Empresa* abaixo dos demais fatores. O RH **não** conclui que a liderança causou isso. Escolhe um tema coletivo (a passagem de turno), designa quem acompanha e marca a revisão para o fim de duas semanas. Por quê? A leitura agregada indica onde conversar, não quem é responsável pelo número."

**Checagem 1 · participante: quem recebe a próxima entrega?**
- **Pergunta:** "A liderança registrou que o alinhamento aconteceu em 7 de 10 dias. Quem usa esse registro a seguir?"
- **Alternativas:**
  - a) O RH, para decidir a continuidade. **(correta)**
  - b) A direção, para avaliar a liderança. *(erro plausível)*
  - c) Ninguém; o registro termina na liderança.
- **Feedback para a correta:** "Isso. O RH usa o registro para decidir manter, adaptar ou encerrar, e a decisão volta à equipe na devolutiva."
- **Feedback para (b):** "Ainda não. O registro mostra se a prática aconteceu; não serve para avaliar pessoas, e a VitalOS não o liga a desempenho. Quem o usa é o RH, para decidir a continuidade."

**Checagem 2 · gestor: o que a evidência permite concluir?**
- **Pergunta:** "O relatório diz: 'execução registrada em 7 de 10 dias'. O que você pode afirmar?"
- **Alternativas:**
  - a) A prática aconteceu na maior parte dos dias. **(correta)**
  - b) A clareza das prioridades melhorou. *(erro plausível)*
  - c) A prática não funcionou, porque faltaram 3 dias.
- **Feedback para a correta:** "Isso. O registro comprova a execução. Uma mudança pede leitura comparável; um efeito pede desenho de avaliação."
- **Feedback para (b):** "Ainda não. Melhora é mudança observada e precisa de uma leitura depois da ação. Hoje o relatório mostra só que o alinhamento aconteceu."

### 10. Telas anotadas

**Tela A · Abertura para quem avalia contratar**

```
DESKTOP (≥1024)                                   CELULAR 320–390
┌──────────────────────────────────────────────┐  ┌──────────────────────┐
│ [logo VitalOS]          [Instituto]   [Entrar]│  │ [logo]       [Entrar]│
│ ┌─────────────────────┐ ┌──────────────────┐ │  │ ① Título (h1)        │
│ │ ① Título (h1)        │ │                  │ │  │ ② Texto curto        │
│ │ ② Texto curto        │ │  Foto editorial  │ │  │ ③ [Ver a jornada     │
│ │ ③ [Ver a jornada por │ │  (área livre à   │ │  │     por perfil]      │
│ │     perfil]  ④ link  │ │   esquerda)      │ │  │ ④ link secundário    │
│ └─────────────────────┘ └──────────────────┘ │  │ ⑤ Foto (recorte 4:5, │
│ ⑤ Você recebe | Sua empresa mobiliza |       │  │    rostos preservados)│
│   Você poderá consultar   (3 colunas)        │  │ ⑥ Três blocos        │
│ ⑥ Linha de cobrança · ⑦ "Exemplo construído" │  │    empilhados        │
└──────────────────────────────────────────────┘  │ ⑦ Linha de cobrança  │
                                                  └──────────────────────┘
```

- **Prioridade visual:**
  1. O título.
  2. O CTA "Ver a jornada por perfil", que é a primeira ação focável depois do cabeçalho.
  3. Os três blocos.
- **Imagem:** no celular, a foto vem **depois** do CTA, para que título, texto e ação caibam na primeira tela de 320 × 640. No desktop, o texto fica em bloco de contraste estável, nunca sobre a foto.
- **Tablet:** retrato segue a ordem do celular, com os blocos em duas colunas. Paisagem segue o desktop, com os blocos em três colunas.
- **Rótulo:** "Exemplo construído" fica junto ao caso, não no rodapé.

**Tela B · Caso Q2 visto pelo colaborador**

```
DESKTOP                                            CELULAR 320–390
┌────────────────────────────────────────────────┐ ┌──────────────────────┐
│ Mapa: Q1 · [Q2] · Q3 · Q4 · Q5   Perfil:[Colab▾]│ │ Q2 · Transformar  [▾]│ ← barra fixa, 48px
├──────────────┬─────────────────────────────────┤ │ Perfil: Colaborador  │
│ ① Passagens  │ ② "Quem trabalha no turno       │ ├──────────────────────┤
│  Leitura →   │    conhece os detalhes…"        │ │ ② Texto do perfil    │
│  Decisão RH →│ ③ Onde acompanhar: Devolutiva   │ │ ③ Onde acompanhar    │
│  Ação lider.→│ ④ O que fica privado            │ │ ① Passagens (vertical│
│  [Retorno a  │ ⑤ [Que evidência chega à        │ │    destaque: Retorno)│
│   você] ●    │     equipe?] (expansão em linha)│ │ ④ O que fica privado │
│              │ ⑥ Checagem opcional (fechada)   │ │ ⑤ micro-CTA          │
│              │ ⑦ [Ver a devolutiva] (se A) /   │ │ ⑦ Ação principal     │
│              │    [Ver como funciona] (senão)  │ │ ⑥ Checagem (opcional)│
└──────────────┴─────────────────────────────────┘ └──────────────────────┘
```

- **Prioridade visual:** o texto do perfil e "Onde acompanhar". O infográfico de passagens destaca a passagem do papel selecionado ("Retorno a você").
- **No celular:**
  - Etapa e perfil ficam numa barra fixa de uma linha (48 px). Tocar nela abre o seletor em folha inferior; a barra não ocupa a área de leitura.
  - O infográfico vira sequência vertical, na mesma ordem.
  - A ação principal fica antes da checagem.
- **Ao trocar de perfil:** a etapa, o caso e a posição de leitura se mantêm, e o foco vai para o título do texto do perfil, com um anúncio para leitor de tela: "Perspectiva: Liderança."

### 11. Interação, componentes e conteúdo rastreável

**Micro-CTAs ligados à pergunta do leitor:**
- "O que o SST revisa?"
- "Que evidência chega ao relatório?"
- "Quem recebe isto?"
- "Por que meu nome não aparece?"
- "O que ainda não se sabe?"

**Expansão em linha e diálogo:**
- **Expansão em linha** para definições e explicações curtas. Usa `button` com `aria-expanded` e `aria-controls`, e o conteúdo fica no fluxo da leitura.
- **Diálogo** só para o extrato completo do Q5 e para o caso inteiro:
  - foco no título ao abrir;
  - foco preso dentro do diálogo;
  - Escape e o botão "Fechar" devolvem o foco ao acionador;
  - o conteúdo longo rola dentro do diálogo;
  - a página de fundo não rola.
  - Em tela inteira, mesmos critérios.

**Uma ação principal por situação.** Um CTA operacional só aparece quando o registro de disponibilidade diz **A** para a combinação de papel, módulo, designação e ambiente. Do contrário, a ação é "Ver como funciona nesta etapa".

**Registro de disponibilidade** (sugestão: `src/domain/guide/guide-availability.json`). Cada afirmação operacional do guia aponta para uma entrada, com os campos:
- `id`
- `lens`
- `role`
- `capability`
- `level` (`descrito`, `demonstrativo`, `local`, `ambiente`)
- `environment`
- `route`
- `decisionRef`
- `verifiedAt`

Um teste falha se algum texto de tela citar uma capacidade sem `id`, ou se houver CTA com `level ≠ ambiente`.

### 12. Direção de arte

- **Faixa editorial (brief):**
  - **Cena:** fotografia hiper-realista de um centro de distribuição brasileiro, na troca de turno. Uma supervisora negra de meia-idade escuta um colega mais jovem ao lado de um quadro de turno. Ao fundo, de forma discreta, trabalhadores operacionais diversos.
  - **Luz:** iluminação cinematográfica de estúdio com luz principal lateral suave, tons de pele naturais e gesto espontâneo.
  - **Enquadramento:** desktop em 16:9, com área livre de cerca de 40 % à esquerda para o bloco de texto; celular em recorte 4:5 próprio, com os dois rostos no terço superior.
  - **Texto sobre a imagem:** sempre em bloco sólido, com contraste AA. Sem texto incrustado na imagem.
  - **Rótulo:** "Cena encenada" na legenda.
  - Confira antes a galeria da apresentação; reutilize se servir.
- **Variante de pequena empresa:** uma dupla num balcão de pequena oficina, com a mesma linguagem fotográfica, usada na ponte "pequena empresa".
- **Infográfico de passagens:**
  - **Sequência:** "Leitura da equipe → Decisão do RH → Ação da liderança → Retorno ao colaborador".
  - **Cada nó:** ícone, verbo e responsável.
  - **Nó do perfil ativo:** marcado com borda espessa e o texto "você", nunca só por cor.
  - **"Que evidência fica?"** abre como expansão em linha junto ao nó.
- **Movimento:**

| Efeito | Função | Com movimento reduzido |
|---|---|---|
| Deslocamento curto do marcador no mapa (≤ 200 ms) | localizar a etapa ativa | troca instantânea |
| Realce sequencial entre nós (≤ 300 ms) | mostrar a passagem de responsabilidade | realce fixo no nó ativo |
| Abertura do diálogo (fade ≤ 150 ms) | separar a leitura concentrada | sem animação |

- **Degradação:**
  - **Imagem indisponível ou conexão lenta:** um bloco de cor de marca com a mesma área reservada, sem deslocar o layout (dimensões declaradas, imagens responsivas, primeira imagem prioritária e as demais adiadas).
  - **Texto a 200 %:** sem rolagem horizontal; o infográfico passa a vertical.

### 13. Acesso e engenharia

- **Duas portas:**
  1. A **senha editorial** libera só o conteúdo genérico e sintético para o visitante. A validação é no servidor, a credencial fica em segredo do servidor, o cookie é HttpOnly com escopo de rota, as respostas não vão para cache compartilhado e a sessão expira.
  2. A **sessão institucional** resolve no servidor organização, papel, módulos e designações para "Meu percurso". A pessoa autenticada não passa pela senha editorial para ver o próprio percurso.
- **Antes de reutilizar o acesso da apresentação:** confirme que o armazenamento de sessão funciona no ambiente de destino. Hoje ele é em memória, num só processo.
- **Proibido:**
  - carregar dados institucionais para depois escondê-los no navegador;
  - pôr a credencial em Git, bundle, HTML inicial, URL, telemetria ou capturas.
- **Casos a cobrir:**
  - senha incorreta;
  - sessão expirada;
  - encerramento de acesso;
  - configuração ausente (deve recusar);
  - visitante;
  - usuário autorizado;
  - papel sem designação;
  - módulo indisponível.
- **Regra de leitura:** ler o guia nunca gera registro de execução, consentimento, conclusão de treinamento ou certificação.

### 14. Critérios de aceite

| Prioridade | Prova | Aceite |
|---|---|---|
| Crítica · fidelidade | Teste de conteúdo da matriz §7 contra o registro de disponibilidade | Todas as combinações têm orientação; todo CTA tem `level = ambiente`, destino e escopo comprovados; nenhum texto usa "Compliance", "comprovado" para execução, nem datas de empresa. |
| Crítica · acesso | Testes de servidor e navegador para os casos de §13 | Nada protegido chega antes da validação; trocar a perspectiva não altera privilégios; o link direto respeita as permissões. |
| Alta · continuidade | Navegador: home → abertura → Q2 (RH) → trocar para Colaborador → detalhe → voltar → Q5; e painel → "Meu percurso" | A etapa e a perspectiva se mantêm conforme §3; o caso chega ao Q5 com o extrato de quatro tipos. |
| Alta · acessibilidade | 320 e 390 px, tablet em retrato e paisagem, desktop; teclado, leitor de tela, texto a 200 %, movimento reduzido | Sem rolagem horizontal; foco visível; Escape fecha e devolve o foco; etapa e perfil anunciados (WCAG 2.2 AA como referência). |
| Alta · utilidade | Roteiro com representantes dos perfis (§15), quando autorizado | Registrado como pendente até ser executado. |
| Média · desempenho | Medição em emulação móvel declarada, comparada à página institucional | Título e CTA renderizam antes da foto; sem deslocamento de layout ao carregar a imagem. |

### 15. Como medir a melhoria (ambição: até 90 %)

"Até 90 %" é uma ambição de projeto, não uma promessa. A mesma tarefa roda nas duas versões (v1 prototipada e v2), com participantes diferentes em cada versão para evitar efeito de aprendizagem, e com o mesmo caso.

| Medida | Tarefa | Verificável no protótipo | Exige pessoas |
|---|---|---|---|
| 1. Encontra a própria etapa e a tarefa sem ajuda | "Você é liderança da Expedição. Encontre o que você precisa fazer agora." | o caminho existe e é alcançável (teste automatizado) | taxa de acerto sem ajuda e tempo |
| 2. Identifica quem recebe a entrega e o que vem a seguir | Checagem 1, fora do guia | — | acerto e explicação em palavras próprias |
| 3. Distingue ação executada de efeito avaliado | Checagem 2 com um trecho de relatório novo | — | acerto e erros de interpretação |
| 4. Completa o percurso no celular e por teclado | do início ao Q5 | **sim** (navegador e teclado) | confirmação com usuários de leitor de tela, quando possível |

- **Linha de base:** v1 com as mesmas tarefas.
- **Relato:** contagens e proporções por perfil, com o tamanho da amostra declarado. Com amostras pequenas, relatar diferença descritiva sem extrapolar percentual de ganho.
- **Validação humana:** pendente até ser executada com autorização.

### 16. Sequência de implementação local

1. **Inventário e registro.** Confirmar §2 na base escolhida, criar o registro de disponibilidade e o módulo de conteúdo, com os testes de conteúdo da matriz.
2. **Fatia Q2.**
   - Abertura A, mapa, caso Q2 nas perspectivas RH, liderança e colaborador, e a checagem 1.
   - Senha editorial com segredo de teste.
   - Prova no navegador em 320, 390 e desktop.
3. **Q1, Q3, Q4 e Q5.**
   - Q1 com a tabela de quem faz a preparação e a coleta em preparação.
   - Q3 e Q4 com autonomia e esfera individual.
   - Q5 com o extrato e a checagem 2.
   - Combinações de "só acompanhar".
4. **Integração.**
   - Entrada pelo painel ("Meu percurso", com papel do servidor).
   - Acessibilidade completa e degradações.
   - Gate do candidato.
   - Registro do que foi inspecionado, executado e validado por pessoas.

### 17. Não fazer

- Não mostrar cálculo do IVO, projeção ou associação entre lentes e dimensões sem contrato aprovado e aplicável.
- Não sugerir que um plano de uma lente exige as outras três.
- Não oferecer diretório de profissionais SST.
- Não criar visão coletiva do VIA-T.
- Não publicar, implantar nem contatar terceiros sem autorização específica.

---

## Parte 4 · Quadro para o comitê

| # | Problema na v1 | Solução na v2 | Benefício esperado | Como será testado |
|---|---|---|---|---|
| 1 | Caminho de apoio do Q1 para pequena empresa não existe no produto | Tabela "Quem faz a preparação" com três situações; sem SST leva ao serviço | Nenhuma promessa sem base; o SST entende a condição de designação | Teste de conteúdo; leitura por SST representativo |
| 2 | Disponibilidade decidida tela a tela, com capacidades em branches diferentes | Registro único lente × papel × ambiente; CTA só no nível "disponível no ambiente" | Sem CTA quebrado nem promessa de capacidade local | Teste que falha com CTA sem `level = ambiente` |
| 3 | Fonte da jornada traz datas fixas, "Compliance" e não tem Q5 | Guia usa só ordem e identidade da fonte; rótulos, marcos e Q5 editoriais | Linguagem fiel e sem promessa de conformidade | Teste de conteúdo proibindo esses termos |
| 4 | Abertura comercial sem entrega, contrapartida e cobrança | Três blocos e linha de cobrança alinhada à decisão comercial | Gestor visualiza a entrega em uma dobra | Medida 1 com quem avalia contratar |
| 5 | Entrada única para quem conhece e para quem participa | Duas aberturas; painel abre no papel e na lente do servidor | Participante chega à própria tarefa em um gesto | Medida 1; teste de navegação do painel |
| 6 | Checagens sem feedback para erro plausível | Exemplo resolvido e duas checagens com feedback para acerto e erro | Distinção entre execução e efeito | Medidas 2 e 3 comparadas com a v1 |

**Decisões humanas que alteram escopo, metodologia ou publicação**
1. **Acesso de quem já é autenticado.** A v2 propõe que a pessoa com sessão institucional veja "Meu percurso" sem a senha editorial, e que a senha editorial proteja só a leitura genérica. Confirmar.
2. **Armazenamento da sessão editorial no ambiente de destino.** Se o mecanismo atual, em memória e num só processo, não servir, aprovar o substituto antes da implementação.
3. **Papéis sem escopo documentado.** Definir se `DIRETOR`, `DGP_RH` e `SESMT_SAUDE` têm atribuição no Q1 e no Q2, ou se ficam como público de leitura.
4. **Validação com pessoas.** Autorizar o roteiro com representantes dos perfis (participantes, consentimento e uso dos dados da sessão).
