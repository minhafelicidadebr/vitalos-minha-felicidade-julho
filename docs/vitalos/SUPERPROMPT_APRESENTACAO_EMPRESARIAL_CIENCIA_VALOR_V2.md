# Superprompt V2 — ciência, valor empresarial e evidências na apresentação VitalOS

Preparado em 16/11/2026, sobre `3a8b60c42d7cdcc05d2ea136cf533cf8ee0097aa`, branch `feat/ivo-fibt-platform-foundation`. Estado: **orientação e proposta editorial para a próxima implementação**; não altera o aplicativo, não aprova claims e não registra nova prova de navegador.

Complementa o [superprompt original](SUPERPROMPT_APRESENTACAO_INSTITUCIONAL_EMPRESAS.md) e o [fechamento da apresentação V1](APRESENTACAO_EMPRESARIAL_FECHAMENTO_2026-11-16.md). Preservar design, acesso no servidor e evidências válidas. A equipe solicitou mais clareza sobre benefícios, números, referências científicas, instrumentos, caso brasileiro, ESG/ODS e funcionamento dos aprofundamentos.

## 1. Missão

Execute uma evolução editorial e funcional da apresentação institucional empresarial em `/apresentacao/empresas`. A decisão do comprador é o centro da narrativa: **por que essa pauta merece atenção, o que a organização pode ganhar, como a VitalOS trabalha e qual entrega concreta será combinada**.

Atue com critérios de estratégia B2B, design instrucional, comunicação científica, psicometria, UX, acessibilidade, engenharia, privacidade e governança de evidências. Essa revisão por perspectivas não representa parecer emitido por pessoas ou instituições externas.

Use a marca oficial **VitalOS™**, com o Instituto Felicidade para Todos na atribuição já registrada. Não criar variantes de marca a partir de transcrição. A missão é qualificar a proposta comercial com ciência e concretude. Não prometer nota de avaliação externa, conversão, ganho de 120% ou melhoria de UX de 90% sem estudo comparativo.

Entregue um candidato local completo, navegável, com fontes, narrativa, componentes e provas proporcionais. Não encerre apenas com roteiro. A autorização desta preparação é documental; a execução deste superprompt deve respeitar a autorização vigente da etapa em que for acionado.

## 2. Diagnóstico específico e caminho ToT

A V1 tem quinze slides/painéis, acesso no servidor, teclado, leitura contínua e provas locais. A lacuna principal é editorial: mecanismos e limites receberam mais espaço que a explicação de valor, de base científica e de exemplos empresariais. A nova versão precisa tornar essas conexões visíveis no percurso principal.

Alternativas avaliadas: notas heurísticas de 0–10, maior é melhor. Custo = economia; risco = menor risco; simplicidade = menor complexidade; tempo = rapidez até valor. Não são resultados de teste com compradores.

| Ramo                                                             | Valor | Segurança | Custo | Risco | Alinhamento | Reuso | Simplicidade | Escala | Tempo |
| ---------------------------------------------------------------- | ----: | --------: | ----: | ----: | ----------: | ----: | -----------: | -----: | ----: |
| A · acrescentar apenas cards de números                          |     6 |         6 |     9 |     6 |           6 |     9 |            9 |      8 |    10 |
| B · narrativa de valor com evidências por tipo e aprofundamentos |    10 |         9 |     7 |     9 |          10 |    10 |            7 |      9 |     8 |
| C · protótipo visual de um grande case e revisão posterior       |     7 |         7 |     8 |     6 |           6 |     6 |            8 |      6 |     9 |
| D · adiar toda a narrativa até homologar todos os módulos        |     2 |         9 |     9 |     7 |           3 |     3 |           10 |      3 |     1 |
| E · integrar uma plataforma externa de apresentação              |     7 |         6 |     5 |     5 |           6 |     5 |            6 |      8 |     6 |
| F · gerar a apresentação dinamicamente com RAG/LLM               |     7 |         4 |     3 |     3 |           7 |     8 |            2 |      7 |     3 |

**Decisão recomendada: B**, começando pela matriz de fontes e pela copy de três slides-chave: contexto, valor e caso brasileiro. Conservar o stack e a composição existentes. Uma apresentação editorial determinística, revisável e rastreável atende esta etapa; não requer criar um novo agente ou CMS.

Trade-off: admite números e exemplos com qualificadores legíveis, em vez de uma coleção de percentuais sem comparação clara. O risco central é transferir legitimidade de universidade, instrumento ou empresa de referência para a VitalOS. O aceite é o visitante compreender a diferença entre referência científica, relato empresarial, capacidade do produto e resultado do seu futuro serviço.

## 3. Benchmark factual disponível para a redação

As fontes abaixo foram verificadas nesta preparação. Revalidar contexto/data antes da integração final. Redigir em palavras próprias, com citação próxima. Nenhuma linha é autorização automática de uso de marca, redistribuição de obra ou publicação de claim.

### 3.1 Dimensão do desafio

[OMS — Mental health at work](https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work), atualização de 15/09/2026:

- Estimativa de **16% de adultos em idade de trabalhar com transtorno mental em 2023**.
- **12 bilhões de dias de trabalho perdidos por ano**, globalmente, por depressão e ansiedade.
- **US$ 1 trilhão anual** de produtividade perdida associado a essa carga.

Os dois últimos números descrevem a mesma estimativa de carga em unidades distintas; não somar nem apresentar como dois retornos financeiros independentes. Esses valores não estimam a prevalência, as perdas ou a economia recuperável de uma empresa brasileira. Não misturar 16%/2023 com 15% de outra edição.

Proposta de slide: “O desafio tem escala global. A resposta precisa encontrar as condições reais do trabalho.” Número, rótulo, população/tempo, fonte e limite ficam juntos, legíveis no mobile.

### 3.2 Por que o tema merece atenção empresarial

A [meta-análise Q12 da Gallup, 11ª edição, 2024](https://www.gallup.com/workplace/321725/gallup-meta-analysis-first-generation.aspx) apresenta diferenças medianas entre unidades no quartil superior e inferior de engajamento: **23% em lucratividade** e **18% em produtividade de vendas**, entre outros resultados. São comparações sobre engajamento; não retorno obtido ao contratar a VitalOS, experimento do nosso software ou medida de felicidade PERMA.

Selecionar poucos indicadores pertinentes ao comprador, com comparação explícita. Não reutilizar os percentuais da home apenas por semelhança temática. A evidência de uma associação pode fortalecer a relevância de uma agenda; não autoriza multiplicar uma receita do cliente pelo percentual de um estudo.

Como aprofundamento alternativo, a [divulgação da Universidade de Oxford sobre o estudo em contact centres da BT, de 2019](https://www.ox.ac.uk/news/2019-10-24-happy-workers-are-13-more-productive) relata 13% de produtividade superior no contexto estudado. Conferir a publicação científica e a versão da estimativa antes de usar o número; manter setor, desenho e limites. Não combinar resultados de contextos diferentes como um índice universal de benefícios.

### 3.3 Playbook 2.0 e vínculo acadêmico

O arquivo local `Work-Wellbeing-Playbook-2.0-Full-Deck_compressed.md` identifica Regier, Cunningham, Fleming, Kirienko, Kaats e De Neve; apresenta colaboração com o Wellbeing Research Centre da Universidade de Oxford e registra licença CC BY-NC-ND 4.0.

A [comunicação oficial da World Wellbeing Movement de 12/11/2025](https://worldwellbeingmovement.org/news/work-wellbeing-playbook-2-0-experts-highlight-proven-workplace-wellbeing-strategies-in-free-online-resource-at-heart-of-uk-policy/) descreve a edição 2.0 como baseada em revisão de mais de 4.000 estudos e organizada em seis domínios: desenvolvimento/segurança; relações; independência/flexibilidade; variedade/realização; remuneração/benefícios; riscos/saúde/segurança. Não significa que todos os estudos sejam ensaios positivos ou intervenções disponíveis no app.

Há referências públicas à edição anterior com 3.000 estudos/12 drivers. A [página atual do playbook](https://worldwellbeingmovement.org/playbook-2025/) apresenta a organização em seis domínios. Distinguir edição, data e documento; o anexo também contém indicação de conteúdo futuro para abril de 2026. Não transferir esse roadmap externo para disponibilidade na VitalOS.

Formulação proposta: “Nossa curadoria considera literatura sobre bem-estar no trabalho e referências como o Work Wellbeing Playbook 2.0, desenvolvido pela World Wellbeing Movement com especialistas do Wellbeing Research Centre da Universidade de Oxford.” Usar somente se a curadoria correspondente for rastreável; de outro modo: “Referência para a expansão da curadoria”.

Não dizer “VitalOS chancelada por Oxford”, “tecnologia certificada por Oxford”, “4.000 estudos integrados à IA” ou “parceria com Oxford”. A autoria de uma referência não é endosso ao aplicativo. Não inserir logos de terceiros como selo de confiança.

### 3.4 Caso brasileiro: Heineken

O [texto institucional da Heineken sobre felicidade e positividade](https://www.heinekenbrasil.com.br/noticias/felicidade-x-positividade) descreve a adoção de PERMA-V. A [publicação da organizadora Você RH, de 30/09/2026](https://vocerh.abril.com.br/melhores-empresas/conheca-os-cases-vencedores-de-futuro-do-bem-estar-no-premio-da-voce-rh/) relata a Jornada da Felicidade, iniciada em 2022, e seu reconhecimento na premiação.

Na matéria, a adesão à pesquisa é **42,5% em 2022, 85,8% em 2025 e 82,6% no relato de 2026**. A diferença 2022–2025 é **43,3 pontos percentuais**; não é aumento de felicidade. A companhia também informa queda de 50% no absenteísmo relacionado ao trabalho, sem detalhamento metodológico suficiente na reportagem para inferir efeito causal.

No slide principal, priorizar a trajetória de adesão com os três momentos, fonte/data e natureza de relato empresarial. Não ocultar 2026. A alegação sobre absenteísmo só cabe em painel com atribuição, definição exata e ausência de desenho causal explícita; pode ser omitida até esclarecer período/base. Não fazer promessa de repetição nem apresentar Heineken como cliente, parceira ou usuária da VitalOS. O prêmio pertence ao programa citado.

### 3.5 PERMA: modelo, instrumento e aplicação são níveis distintos

[Butler e Kern (2016), PERMA-Profiler](https://internationaljournalofwellbeing.org/index.php/ijow/article/view/526), é referência de instrumento multidimensional. Explicar P/E/R/M/A: emoções positivas, engajamento, relações, significado e realização. Distinguir o modelo PERMA, um questionário específico, sua tradução/adaptação e a ampliação com vitalidade.

O uso de PERMA-V por uma empresa não comprova que ela aplicou a mesma versão, os mesmos itens, a mesma escala ou o mesmo cálculo de PERMA+V planejado no app. A demonstração Q2 não confirma operação Q3. Trocar “já aplicamos e validamos este método no cliente” por uma descrição precisa do estágio do adaptador e da referência científica.

### 3.6 ESG e ODS

As metas oficiais [ODS 3.4](https://sdgs.un.org/goals/goal3) incluem saúde mental/bem-estar; [ODS 8.8](https://sdgs.un.org/goals/goal8) aborda direitos e ambientes de trabalho seguros. Usar como referências temáticas a examinar, sem converter um indicador do app em indicador oficial dessas metas.

Atividade executada, aderência temática, resultado observado e impacto atribuível devem permanecer diferentes. A relação com S pode ser temática; G exige processo demonstrado; E não decorre automaticamente de uma atividade de bem-estar. Preservar as decisões existentes de vínculos ESG/contrato de evidência. Não criar score ODS, equivalência, selo ou certificação.

## 4. Avaliação do que já existe no aplicativo

Ler seletivamente os arquivos mínimos, antes de editar:

| Local                                                                                          | O que aproveitar                                               | Cuidado                                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/landing/data/landing-copy.ts`, `WhyItMattersSection.tsx`, `src/routes/index.tsx` | Clareza comercial, problemas, metodologia e linguagem de valor | A seção está montada na home, mas compila números de estudos diferentes; presença no site não valida cada claim                                   |
| `EconomicBaselineSection.tsx` e domínio de commercial-claims                                   | Fluxo canônico de claims por superfície                        | O baseline não é autorização para números/retorno na apresentação; a calculadora histórica não está montada nesse bloco                           |
| `docs/instrumentos/PLAYBOOK.md`                                                                | Intenção de conectar referência, prática e acompanhamento      | Documento histórico usa metáforas clínicas e descreve automações futuras; não comprova ingestão, intervenção validada ou recomendação operacional |
| `src/domain/evidence/`                                                                         | Evidence Registry, Claim Registry e Mechanism Registry         | Escopo aprovado por papel/uso/contexto; não significa indexação integral do anexo                                                                 |
| `src/engine/learning/driver-pillar-bridge.ts`                                                  | Ordenação determinística explicável                            | Não é LLM, RAG, mapeamento científico aprovado ou estimativa causal                                                                               |
| Unidade/atividade Q2 0.1.0 e D10                                                               | Um exemplo educativo rastreável                                | Aprovação local já concluída; não ampliar liberação, público ou conteúdo sem o processo próprio                                                   |
| `src/lib/presentation/content.server.ts` e `src/features/presentation/`                        | Deck, visuais, detalhes e gate em funcionamento                | Evoluir a narrativa mantendo segurança, foco e responsividade                                                                                     |

Produzir uma matriz curta “afirmação → fonte → evidência local → estágio → redação proposta”. Separar implementado, demonstrado localmente, documentado, mockado, planejado, pendente e contraditório. Não reiniciar auditoria do repositório inteiro nem reler todos os anexos; usar busca limitada e evitar linhas de imagens base64.

## 5. Promessa de valor que o comprador consegue compreender

Organizar três camadas: **entrega do serviço**, **benefício esperado pelo mecanismo** e **evidência externa que justifica avaliar o tema**. Não escrever todos os benefícios como resultados já obtidos pela VitalOS.

| Dor da empresa                    | Entrega a demonstrar/contratar conforme escopo        | Valor gerencial compreensível                                            | Como verificar depois                                            |
| --------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Informação dispersa               | Leitura publicada com contexto, recorte e limites     | Uma prioridade explicável para a conversa de gestão                      | Capacidade de interpretar a leitura e decidir o próximo passo    |
| Formação desconectada do trabalho | Unidade/prática contextualizada e curada              | Repertório para discutir a situação e preparar aplicação                 | Compreensão, recuperação e transferência avaliadas separadamente |
| Ações sem continuidade            | Aplicação com responsável, condições, prazo e revisão | Clareza sobre o que foi combinado e acompanhado                          | Execução, barreiras e decisões registradas                       |
| Dificuldade de prestar contas     | Síntese com origem e estados de evidência             | Transparência para direção, RH e governança                              | Rastreabilidade de afirmações e resolução de referências         |
| Dúvidas sobre resultado           | Desenho de acompanhamento combinado                   | Possibilidade de aprender e corrigir sem confundir atividade com impacto | Critérios definidos antes da coleta; sem eficácia presumida      |

Redação central proposta: “A VitalOS ajuda sua organização a conectar escuta, aprendizagem e ações acompanhadas — com método, responsabilidades e evidências para orientar decisões.” Mostrar qual trabalho o software organiza e qual parte depende da equipe/serviço assistido.

Traduzir siglas na primeira ocorrência; preferir “direção”, “gestão de pessoas” e “lideranças” quando não houver necessidade do termo técnico. Ciência da felicidade deve ser explicada como investigação de bem-estar, experiência e condições de vida/trabalho; não como obrigação de estar feliz ou promessa clínica.

## 6. Novo storyboard: de quinze para até dezoito slides

Manter os layouts aprovados e acrescentar no máximo três momentos principais. O índice permite percurso executivo e aprofundamento com o mesmo conteúdo canônico, sem gerar versões científicas divergentes.

| Nº  | Função narrativa                               | Visual e aprofundamento                                                                                             |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 01  | Apresentar VitalOS e o valor central           | Capa existente com proposta em uma frase; marcas VitalOS/Instituto                                                  |
| 02  | Tornar visível a dimensão do problema          | Cards OMS com fonte próxima; painel “O que estes números significam?”                                               |
| 03  | Responder “o que a empresa pode ganhar?”       | Dor → entrega → valor; painel com comparação Gallup e limites                                                       |
| 04  | Explicar Mensurar/Educar/Transformar/Evoluir   | Ciclo existente com saída concreta em cada fase                                                                     |
| 05  | Explicar EU/NÓS/LIDERANÇA/ORGANIZAÇÃO          | Quatro perspectivas e uma situação de trabalho; sem permissões inventadas                                           |
| 06  | Apresentar quatro lentes e seus estágios       | Fichas COPSOQ, FIB-T, PERMA+V e VIA-T; modelo/instrumento/uso/limite                                                |
| 07  | Mostrar a base científica e sua curadoria      | Referência → estudo → claim permitido → prática; painel de fontes                                                   |
| 08  | Conectar conhecimento às condições de trabalho | Domínios do playbook em visual autoral e conceitual, condicionado aos direitos; sem equivalência automática com IVO |
| 09  | Mostrar um caso brasileiro externo             | Heineken: práticas e trajetória de adesão; fonte e limites visíveis                                                 |
| 10  | Explicar os papéis do serviço                  | Administração da plataforma, RH_ADMIN, direção, lideranças e participantes; estágio real das interfaces             |
| 11  | Demonstrar leitura Q2 e prioridade             | Exemplo fictício já existente, separado dos números externos                                                        |
| 12  | Demonstrar aprendizagem orientada ao contexto  | Síntese 0.1.0, recuperação antes de feedback e aplicação privada                                                    |
| 13  | Demonstrar transformação em prática            | Acordo, condições, responsável, execução e revisão                                                                  |
| 14  | Explicar evolução e avaliação                  | Registro → aprendizagem → avaliação; sem causalidade ou eficácia fabricadas                                         |
| 15  | Explicar relatório global e ESG/ODS            | Matriz descritiva com tema, evidência, limite e meta de referência                                                  |
| 16  | Explicar confiança e operação responsável      | Controles comprovados e decisões de tratamento de dados                                                             |
| 17  | Apresentar o início de uma jornada assistida   | Necessidade, escopo, ambiente, execução e revisão; sem prazo/preço inventado                                        |
| 18  | Conduzir à conversa comercial                  | CTA institucional existente e síntese dos ganhos de organização do trabalho                                         |

Não encher um slide com sete percentuais de estudos diferentes. Cada número deve explicar uma ideia. Qualificadores essenciais continuam no slide; o painel acrescenta método e contexto. Preservar ritmo comercial sem transformar a apresentação num dossiê técnico ou omitir limites materiais.

## 7. Base de conhecimento e futura recuperação de fontes

Mostrar o caminho de curadoria como arquitetura proposta e destacar o exemplo efetivamente implementado. Não chamar a posse de PDFs de RAG operacional.

Modelo de ficha a compatibilizar com os contratos existentes: fonte/edição; autores; URL/DOI; direitos de uso; população e contexto; desenho; intervenção/exposição; comparador; desfecho; estimativa/unidade/incerteza quando disponíveis; limitações; claim/contexto permitidos; revisão responsável; relação editorial com conteúdo e atividade. Campos ausentes ficam ausentes, sem reconstrução por IA.

Rota de conhecimento: **referência externa → estudo primário → claim permitido → mecanismo → unidade → atividade → aplicação → registro e revisão**. O playbook pode orientar a busca; cada artigo e cada uso precisam de avaliação própria. Não aprovar mapeamento lente→dimensão, índice IVO, D9 ou eficácia por essa rota editorial.

Se uma futura implementação incluir recuperação por IA: exigir origem/versionamento/citação, filtros de direitos e de uso, papel/tenant/entitlement quando aplicáveis, abstenção sem fonte apropriada, testes de recuperação e validação de saída. Estatística, citação e cálculo não podem ser inventados. Corpus bibliográfico e dados privados de empresas devem ficar separados. Não criar ou contratar LLM, embeddings ou banco vetorial nesta evolução da apresentação.

### Direitos de uso específicos do playbook

A licença identificada no anexo e no site é [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/): inclui condições de atribuição, uso não comercial e restrição à distribuição de adaptações. Disponibilidade gratuita não resolve todos os usos num SaaS comercial.

Antes de copiar slides/textos, traduzir/distribuir adaptações, indexar integralmente para uso comercial ou anunciar uma biblioteca integrada, esclarecer o uso pretendido e a autorização aplicável com o responsável. Não presumir que embeddings removam obrigações de licença. Enquanto isso, continuar com referências bibliográficas, links e curadoria de artigos/fontes individualmente permitidos; a dependência específica não bloqueia o resto da narrativa. Não atribuir novos direitos aos artigos primários com base na licença do playbook.

## 8. Números e governança de publicação

Preparar textos numéricos exatos, com suas fontes e a finalidade de cada superfície, como material concreto de revisão. Seguir commercial-claims para publicação comercial e Claim Registry para usos científicos/educativos; não tratar esses registros como intercambiáveis.

Se faltarem autorizações no mecanismo atual: reunir as propostas em um único pacote de revisão com frase, fonte, contexto, responsável, data e superfície; não marcar entradas como approved por conta própria, não retirar frozen e não criar mecanismo paralelo de aprovação. Deixar componentes/detalhes prontos e continuar os incrementos independentes. A proposta editorial deste documento não substitui o registro canônico de decisão.

Não usar apenas a ausência de números aprovados para repetir uma apresentação genérica: entregar também a copy numérica revisável e sua composição gráfica, identificando precisamente o ponto de integração pendente. Não disfarçar um draft como claim liberado nem usar o acesso por senha como dispensa da governança.

Da home, priorizar a arquitetura de explicação e a linguagem; reavaliar números. Os valores US$ 5 trilhões/ano e US$ 16 trilhões acumulados, +300% de inovação e os demais percentuais compilados não receberam rastreabilidade suficiente nesta preparação para reaplicação automática. Não preencher lacunas com uma fonte de tema semelhante.

## 9. Pop-ups, link correto e critérios de UX

O relato do usuário não comprova uma causa. Há código de quinze modais e prova de funcionamento em `3a8b60c`, mas uma imagem estática da prévia não abre janelas. Na execução, identificar exatamente a URL/versão que o usuário acessa. Se for um print, disponibilizar o link interativo correto; se for a página, reproduzir a falha antes de corrigir.

Verificar, nessa ordem: servidor/edição corretos; hidratação e erro de JS; botão habilitado; overlay/camada que intercepta toque; abertura do portal e foco; limites do viewport, rolagem e fechamento. Usar o procedimento suportado da ferramenta; não desativar validação de URL, segurança, foco ou autorização.

Refinamento proposto:

- Tornar micro-CTAs reconhecíveis como ações: ícone + rótulo específico + indicação de aprofundamento, área mínima de projeto de 44 px e estados de foco/hover/pressionado. Não depender de hover.
- Painéis com pergunta, resposta curta, cards instrucionais, origem e limite; fontes acessíveis sem sair à força da narrativa. Não abrir vários modais encadeados.
- Manter ações de fechar alcançáveis também com conteúdo longo, Escape, foco contido e retorno ao acionador. Não ampliar modais por quantidade de texto sem rever a hierarquia.
- Fonte e qualificador próximos dos números; gráficos com comparação, eixo/unidade, rótulos diretos e alternativa em texto/tabela. Nenhum gráfico 3D ou eixo truncado para exagerar diferenças.
- Navegação por teclado e toque; controle de movimento; reflow e texto legível em 320, 360, aproximadamente 390, 768, 1024 e 1440 px; conferir valores reais medidos sem alterar o zoom do usuário.
- Preservar o conteúdo canônico entre slides/leitura, estado do capítulo e guard de sessão. Medir tamanho/carregamento antes de acrescentar animação, mídia ou dependência.

## 10. Execução e critérios de aceite

1. Conferir Git e instruções; preservar alterações posteriores. Não abrir `.q.out`, `.q.sql` ou `.env`; não publicar, fazer push, migration remota, criar conta ou contatar terceiros.
2. Reutilizar as provas atuais sem mudança que as invalide. Ler somente fontes necessárias, conferir a matriz e entregar plano curto.
3. Preparar o pacote de redação/claims e três slides-chave; revisar mecanicamente números, comparações e atribuições. Agrupar somente decisões humanas reais.
4. Implementar narrativa, aprofundamentos, eventuais gráficos e melhorias de CTA no stack existente. Não refatorar gate/empresa ou alterar metodologia para facilitar a apresentação.
5. Diagnosticar o relato dos pop-ups na URL efetiva e testar a correção, caso haja defeito. Não declarar o problema resolvido apenas pela presença de Dialog no código.
6. Executar testes direcionados de conteúdo/formatadores/interação, typecheck/lint e build quando a mudança de produto justificar. Rodar o gate no candidato integrado conforme os contratos do repositório; não repetir gates por mera edição documental.
7. Demonstrar a edição correta no navegador local, registrar evidências sanitizadas, fechar documentação e fazer commit local coeso quando autorizado. Sem publicação implícita.

Aceite editorial/técnico:

- O comprador encontra no percurso principal problema, ganhos concretos, método, referência científica, caso externo e próximo passo.
- OMS tem população/período; Gallup tem quartis/construto; caso brasileiro tem atribuição/tempo. Nenhum desses números é resultado da VitalOS.
- `85,8%` de adesão nunca aparece como percentual de pessoas felizes; a diferença de 43,3 p.p. não vira “43,3%”. Não omitir o ponto relatado de 2026 na série.
- O deck distingue modelo PERMA, instrumento, adaptação com vitalidade e estágio Q3. Q1 conserva a correspondência pendente; Q2 local não vira homologação remota.
- Menção a Oxford é autoria/colaboração da referência, sem endosso ao produto. Heineken é caso externo, sem vínculo inventado.
- Base bibliográfica, fichas curadas e recuperação operacional têm estados separados. Não há alegação de RAG sem implementação/prova.
- Direitos e superfícies de claims são conferidos; decisões pendentes têm pacote concreto, sem bloqueio artificial das partes independentes.
- METE/IVO/ESG/ODS se conectam por explicação e evidência, sem relações metodológicas ou pontuações novas.
- Micro-CTAs funcionam por clique, toque e Enter na edição entregue; foco, retorno, fechar e sessão são verificados; a prévia estática é identificada como tal.
- Qualidade visual é constatada por inspeção e tarefas, sem alegar ganhos percentuais ou nota máxima automática.

Na futura avaliação com compradores, registrar se conseguem explicar: o que receberão, como a referência científica entra na prática, quais módulos têm qual estágio, que exemplo é externo e qual decisão vem depois. Medir ajuda necessária, compreensão e fricção sem inventar metas, garantias ou coletar dados sensíveis para avaliar o deck.

## 11. Fechamento esperado

Entregar arquivos alterados, mapa de fontes/claims, candidato navegável, composição dos dados propostos, evidências de interação/responsividade, testes e limites. Separar implementado, demonstrado localmente, CI confirmado e publicado. Não declarar prontidão comercial por teste local.

**Próximo marco deste superprompt:** executar a revisão V2 sobre a apresentação existente, começando pelos slides de contexto, valor empresarial e caso brasileiro, preservando a identidade e a proteção já construídas.

---

Preparação atual: leitura seletiva do anexo e das fontes internas, benchmark em fontes primárias e relato empresarial publicado pela organizadora do prêmio. Não houve alteração de runtime, registry, curadoria, senha, banco ou configuração; não houve execução nova de navegador, testes ou build. Este documento é um plano de implementação e uma proposta de redação, não aprovação das alegações nem prova de integração integral do playbook.
