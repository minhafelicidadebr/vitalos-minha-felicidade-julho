# Ficha de revisão · Proposta para o ecossistema ISG (`/proposta/ecossistema`)

**Data:** 25/11/2026 · **Branch:** `feat/proposta-ecossistema` (sobre `main` e0fa696) · **Base:** super prompt "VitalOS ISG Ecossistema", seção 4.
**Estado:** prévia local e PR para revisão. Sem merge, publicação, envio à ISG, banco ou produção.

## Arquitetura (opção 3 da árvore de decisão)
- Rota nova `/proposta/ecossistema`; a original `/proposta` continua com o mesmo conteúdo, endereço e acesso.
- **Uma senha, uma sessão:** o cookie `vitalos_proposal` (Path `/api/proposta`) vale para as duas versões. Senha e saída passam sempre por `/api/proposta` (mesmo limite de tentativas); `/api/proposta/ecossistema` só lê (GET) e delega o resto à porta original.
- Conteúdo das 24 cenas só no servidor (`src/lib/proposal/ecosystem-content.server.ts`), servido depois da senha, `no-store`.
- Componentes comuns: o palco de slides saiu de `ProposalSlides.tsx` para `SlideDeck.tsx` e a porta de acesso para `ProposalGate.tsx`. A proposta original usa os mesmos componentes, sem mudança de comportamento (testes antigos verdes).
- Três vistas do mesmo conteúdo: leitura vertical (com impressão), **Apresentar** (palco 16:9) e **Roteiro do apresentador** (`?vista=roteiro`, outra janela, acompanha a cena projetada).
- Seletor "Versão da proposta": Proposta original · Proposta para o ecossistema. Modos: Percurso executivo (01, 02, 05, 07, 11, 13, 16, 17, 20, 24) e Apresentação completa (24).

## Alternativas aplicadas
| Cena | Decisão | Motivo |
|---|---|---|
| 04 | **Alternativa literal** ("Acompanhar produtividade, absenteísmo e bem-estar…"), títulos por indicador no mesmo layout | Os percentuais Gallup Q12 2024 (14 %, 78 %, 70 %) **não têm claim aprovado** no Commercial Claims Registry |
| 03 | Números exibidos (12 bilhões · cerca de US$ 1 trilhão) | Claim aprovado `CLAIM-COM-PRESENTATION-WHO-001`; nova superfície `marketing.proposal.ecosystem.context` adicionada ao claim (**precisa de confirmação da governança científica**). Sem claim, a cena mostra só os rótulos (fail-closed) |
| 24 | Botão "Combinar sessão de desenho" leva ao texto de apoio | Não há canal de contato aprovado registrado (a original também usa `contact: null`) |

## Imagens
- Capa e 22: `continuity-editorial.webp` (Brasília, gerada) com "Ilustração gerada". 12: `v4-compreender.jpg` (gerada). 15: `v4-hero.jpg` (gerada). 19: capa do Relatório Global ESG, "Capa ilustrativa".
- Logo da ISG **não usado** (autorização pendente): nome em texto. Logos IFT e VitalOS: arquivos oficiais do projeto.
- 23: sem fotografia de atividade comunitária no acervo — cena sem foto.

## Verificação (observada)
- `bun run gate` no estado final: 4.776 testes / 0 falhas, paridade de schema OK, tsc limpo, secret-scan OK.
- Testes novos: conteúdo (24 cenas, ordem, percurso executivo, Entenda, sem preço/percentual não aprovado, fail-closed OMS), acesso (sem sessão 401, sessão compartilhada, delegação de senha/saída, cookie forjado), interface (seletor, modos, impressão, demonstração, decisão, roteiro, link direto).
- Prévia local (127.0.0.1:8095, sem banco): sem sessão → 401 `no-store`; login em `/api/proposta` abre as duas versões; POST de outra origem → 403; depois de sair → 401; HTML sem sessão não contém texto da proposta.
- Palco: 24 cenas **sem transbordo** em 1920×1080, 1440×900, 1280×720 e 1024×768; sem rolagem horizontal. Slides 03, 04, 10, 13, 16, 22 e 24 inspecionados por captura.
- Janelas no palco: abrem com foco dentro, setas não trocam o slide, Esc fecha só a janela e o foco volta ao acionador.
- Celular: 320 e 375 px sem rolagem horizontal; alvos ≥ 44 px; apresentação empilhada (24 cenas, sem miniatura do palco).
- **Não verificado:** leitor de tela real, Safari/iOS, tela cheia em projetor físico, animação em movimento (o painel de teste congela o relógio de animação), impressão em PDF real (só a marcação print), Lovable/produção.

## Decisões pendentes (comerciais/factuais)
1. Aprovar (ou retirar) a superfície `marketing.proposal.ecosystem.context` no claim OMS.
2. Registrar claim Gallup Q12 2024 se os percentuais devem aparecer na cena 04.
3. Canal de contato aprovado para a cena 24.
4. Autorização do logo da ISG; foto licenciada de Brasília e de atividade comunitária (cenas 01, 22, 23).
5. Perímetro (empresas/operações), coordenação e pontos focais — o roteiro não representa número nem nomes.
6. Publicar: o segredo `VITALOS_PROPOSAL_ORIGIN` já cobre o domínio; nada muda nos segredos. Merge na `main` publica via Lovable — só com autorização expressa.

## Revisão executiva (4 tarefas, comparada à original)
Avaliação do autor, não de especialistas nem medida com usuários:
1. **Escopo em um minuto:** cenas 16–17 dizem "todo o ecossistema" e "ondas" sem datas; na original o escopo era a etapa piloto com preço fechado.
2. **Explicar uma evidência com fonte:** cena 03 tem número, legenda e fonte no rodapé e no "Entenda"; cena 04 explica a comparação sem número.
3. **Percorrer a demonstração:** cena 13, quatro passos selecionáveis e janela com dados fictícios, sem login (a original levava a um botão de conta autorizada).
4. **Decisão da ISG:** cena 24 lista três decisões e um único próximo passo.

## Roteiro do apresentador (gerado do conteúdo do servidor)
### 01 · Da pesquisa à vitalidade de todo o ecossistema ISG · *percurso executivo*
> “Já construímos conhecimento juntos. Hoje vamos mostrar como esse trabalho pode ganhar continuidade em todo o ecossistema da ISG.”

### 02 · A parceria começou em Brasília e chegou à escuta na ISG · *percurso executivo*
> “A ISG apoiou a produção de conhecimento para Brasília. Depois, a escuta FIB-T trouxe essa conversa para dentro da organização.”

### 03 · Depressão e ansiedade afetam a presença e a produtividade no trabalho
> “A escala mundial ajuda a situar o tema. Para decidir o que fazer na ISG, vamos olhar para a escuta e para as condições de trabalho.”
- Entenda: O que esses números medem?
- Fonte: [OMS e OIT](https://www.who.int/news/item/28-09-2022-who-and-ilo-call-for-new-measures-to-tackle-mental-health-issues-at-work)

### 04 · O engajamento está associado a resultados que a gestão acompanha
> “Esses estudos ajudam a escolher perguntas e indicadores. A avaliação das ações vem da aplicação e do acompanhamento na própria ISG.”
- Entenda: Como ler a comparação?
- Fonte: [Gallup Q12, 11ª edição](https://www.gallup.com/workplace/321725/employee-engagement-meta-analysis.aspx)
- Alternativa: Alternativa literal aplicada: os percentuais Gallup Q12 2024 não têm claim aprovado no registro.

### 05 · A FIB-T da ISG oferece um ponto de partida para agir · *percurso executivo*
> “Vamos começar pelo que as pessoas já disseram. A devolutiva é a referência para verificar o alcance de cada leitura.”
- Entenda: Qual é o alcance da leitura?
- Fonte: [Devolutiva oficial FIB-T](https://pesquisadefelicidade.com.br/isg/apresentacao)

### 06 · O primeiro acordo é o que preservar e o que aprofundar
> “A prioridade é validada com as equipes. Isso permite aproveitar o que já funciona e agir sobre condições que podem mudar.”

### 07 · O Instituto conduz o programa e o VitalOS dá visibilidade à execução · *percurso executivo*
> “O trabalho começa com quem vai conduzir e acompanhar as ações. A plataforma dá visibilidade ao que foi combinado e registrado.”

### 08 · Bem-estar e riscos psicossociais exigem ações coordenadas
> “As duas frentes se complementam. Cada decisão precisa respeitar o objetivo e a responsabilidade técnica do seu escopo.”
- Entenda: Como as duas frentes se conectam?
- Fonte: [NR-1 no Ministério do Trabalho e Emprego](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/nr-1)

### 09 · O ciclo transforma o que ouvimos em aprendizagem e ação
> “Cada volta do ciclo deixa decisões, registros e aprendizados que orientam a seguinte.”

### 10 · Índice de Vitalidade Organizacional
> “O IVO ajuda a organizar perguntas de gestão, da experiência individual às condições que a organização cria.”
- Entenda: Como o IVO é lido?

### 11 · Cada lente responde a uma pergunta diferente · *percurso executivo*
> “A pesquisa já realizada informa o Q2. As demais lentes complementam a jornada conforme o desenho da implantação.”
- Entenda: O que cada lente orienta?

### 12 · Uma dificuldade para levantar dúvidas pode orientar uma rotina de escuta
> “O método é o mesmo. A intervenção muda de acordo com a leitura do contexto e com o que a equipe consegue testar.”
- Entenda: Que outras intervenções são possíveis?

### 13 · RH, liderança e equipes acompanham a mesma ação · *percurso executivo*
> “O exemplo mostra quem faz o quê, o que fica registrado e como a equipe recebe retorno.”

### 14 · Execução, mudança observada e cenário respondem a perguntas distintas
> “Uma ação registrada e um cenário ajudam a decidir. A reavaliação responde se houve mudança.”
- Entenda: Como ler um cenário econômico?

### 15 · Da prioridade escolhida à execução em todo o ecossistema
> “Agora vamos mostrar como essa lógica se aplica às operações da ISG e como os aprendizados retornam à direção.”

### 16 · A implantação abrange todo o ecossistema ISG · *percurso executivo*
> “O perímetro inclui as empresas, áreas e operações que a ISG confirmar. Cada operação contribui para os objetivos comuns e conduz ações adequadas ao seu contexto.”

### 17 · As ondas organizam a execução do escopo integral · *percurso executivo*
> “Sequenciar as ondas reduz a carga de implantação e dá tempo para incorporar o que as operações aprendem.”
- Entenda: Como o calendário será definido?

### 18 · O Instituto e a ISG decidem juntos, com papéis definidos
> “O Instituto oferece condução técnica. A coordenação da ISG e os pontos focais dão continuidade às decisões no trabalho cotidiano.”

### 19 · O ciclo termina com uma síntese e um plano de continuidade
> “A direção recebe uma síntese do ciclo e um plano que pode acompanhar no período seguinte.”
- Entenda: Como isso pode apoiar a agenda ESG?

### 20 · O investimento será dimensionado para o ecossistema · *percurso executivo*
> “Com o perímetro e as entregas definidos, podemos apresentar o valor, os marcos e as condições de aceite de todo o programa.”

### 21 · A experiência tecnológica da ISG pode ajudar a qualificar a implantação
> “Podemos desenhar uma cooperação técnica que melhore a experiência das equipes e produza aprendizados úteis para as duas instituições.”
- Entenda: O que será definido em conjunto?

### 22 · O trabalho iniciado em Brasília abre uma nova agenda de cooperação
> “A ISG ajudou a trazer essa conversa para Brasília. A continuidade pode conectar a pesquisa, a formação e a articulação de projetos no território.”

### 23 · Tecnologia pode ampliar o acesso à aprendizagem de bem-estar em Brasília
> “Essa agenda pode avançar em uma conversa dedicada, com critérios claros sobre o que é possível entregar para a população.”
- Entenda: Como participar dessa agenda?

### 24 · Vamos desenhar a implantação no ecossistema ISG? · *percurso executivo*
> “A sessão de desenho serve para sair com o perímetro, as responsabilidades e as primeiras ondas definidos para decisão da ISG.”

