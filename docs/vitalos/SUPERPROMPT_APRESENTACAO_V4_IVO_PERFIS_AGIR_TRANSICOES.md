# Superprompt V4 — IVO, papéis, prática e transições na apresentação VitalOS™

**Estado: proposta para revisão e aprovação.** Preparado em 17/11/2026 sobre `884cfc933daec3fee365ae7eea096bbeda9762b2`, branch `feat/ivo-fibt-platform-foundation`. O usuário pediu o superprompt, não sua implementação nesta etapa. Criar este documento não altera o aplicativo nem libera novos claims, marcas ou decisões metodológicas.

## 1. Missão

Evolua a apresentação empresarial VitalOS™ existente, idealizada pelo Instituto Felicidade para Todos, para que o comprador compreenda a ligação entre **ciência, leitura organizacional, pessoas, funcionalidades e ações acompanhadas**.

A V3 já tem narrativa nova, identidade visual, 15 cenas, percurso executivo de 7, fontes e interações. Trabalhe sobre essa base. O incremento V4 deve acrescentar clareza sobre IVO, papéis e autorizações, demonstração do trabalho no dashboard e ritmo visual entre blocos. Preserve os avanços que funcionam; não reinicie a apresentação inteira nem crie camadas sucessivas de substituição de texto.

O resultado deve ajudar o gestor a responder:

1. O que o IVO organiza e como se relaciona com as quatro lentes e perspectivas?
2. Como uma leitura se conecta à aprendizagem, a uma ação e ao acompanhamento?
3. Quem participa, quem coordena e que informação cada papel acompanha?
4. O que uma ação verificável permite observar?
5. Como a organização acompanha seu percurso e verifica mudanças ao longo do tempo?
6. Que parte do serviço está disponível e qual próximo passo pode ser combinado?

Qualidade máxima é um objetivo de execução, não uma nota presumida. Entregar critérios e evidências para avaliação real do comitê e de outras IAs; não simular parecer ou certificação.

## 2. Base confirmada e leitura seletiva

Base técnica: [fechamento V3](APRESENTACAO_EMPRESARIAL_V3_FECHAMENTO_2026-11-17.md), [direção editorial/visual](APRESENTACAO_V3_DIRECAO_EDITORIAL_VISUAL.md) e [registro de números](decisions/PRESENTATION_V3_USER_NUMBERS_2026-11-17.md).

Evidências históricas da V3: 4.415 testes aprovados, paridade, TypeScript, secret-scan, lint dirigido, build inerte e 11 provas HTTP. Entrada por senha e abertura desktop observadas; a prova visual integral de tela cheia/mobile foi interrompida por proteção da ferramenta. Não descrever essa prova como já concluída.

Após aprovação, conferir Git e instruções locais antes de editar. Localizar apenas contratos e consumidores pertinentes. Fontes mínimas para confronto:

| Local                                                  | O que verificar                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `src/features/presentation/` e `src/lib/presentation/` | Cenas, percursos, portais, estado da URL, fontes e métricas                           |
| `src/engine/ivo/lens-contract.ts`                      | Contrato de leituras, privacidade e proibição atual de `compositeScore`               |
| `src/engine/ivo/efficacy-protocol.ts`                  | Separação entre execução, avaliação e índice                                          |
| `src/domain/ivo/`                                      | Governança, instrumentos e curadoria atuais                                           |
| `src/domain/packs/enterprise/ivo-framework.json`       | Descrição experimental de IVO; não é liberação automática do cálculo no produto       |
| `src/app/shell/AppShell.tsx`                           | Grupos do menu e regras de navegação por pack/papel                                   |
| `src/app/dashboards/`                                  | Ramo institucional, demonstração e uso de mocks por perfil                            |
| `src/routes/ivo-integral.acoes.tsx`                    | Fluxo Q2 que carrega leitura, plano, educação e avaliação pelos contratos do servidor |
| `src/components/ivo/`                                  | Planejamento, acompanhamento, aplicação educativa e registros                         |

Separar implementado, demonstrado localmente, mockado, documentado, previsto e metodologicamente pendente. Não escolher uma fórmula apenas porque aparece em um arquivo antigo. Não ler indiscriminadamente o repositório, `.env`, segredos ou anexos inteiros.

## 3. Decisão ToT: onde investir o incremento

Compare caminhos pela clareza para o comprador, coerência metodológica e custo de integração. Notas heurísticas de 0–10, maior é melhor; economia, proteção, simplicidade e rapidez têm direção positiva. Não são resultados de teste de conversão.

| Caminho                                                       | Valor | Proteção | Economia | Menor risco | Alinhamento | Reuso | Simplicidade | Escala | Rapidez |
| ------------------------------------------------------------- | ----: | -------: | -------: | ----------: | ----------: | ----: | -----------: | -----: | ------: |
| A · acrescentar imagens e parágrafos à V3                     |     6 |        9 |       10 |           8 |           6 |    10 |            9 |      8 |      10 |
| B · três transições, IVO e papéis, com demonstração integrada |    10 |        9 |        7 |           9 |          10 |    10 |            7 |      9 |       8 |
| C · refazer toda a narrativa como filme/3D                    |     7 |        6 |        3 |           4 |           6 |     4 |            3 |      5 |       3 |
| D · adiar até aprovar todo o índice composto                  |     2 |        9 |        8 |           7 |           3 |     5 |           10 |      4 |       1 |
| E · integrar uma ferramenta externa de apresentação           |     6 |        6 |        5 |           6 |           5 |     4 |            6 |      7 |       6 |
| F · criar um construtor genérico de dashboards e slides       |     5 |        5 |        2 |           4 |           5 |     8 |            2 |      8 |       2 |

**Caminho recomendado: B.** Ele acrescenta os elos que faltam, aproveita contratos úteis e permite uma narrativa mais tangível sem depender de um índice composto novo.

Trade-offs: exige trabalho de imagem, composição e inventário de permissões. Em contrapartida, evita repetição de cards e a criação de produto paralelo. Riscos centrais: estética artificial, excesso de divisórias, dashboard ilustrado confundido com operação real e animação de crescimento entendida como previsão validada.

Primeiro passo após aprovação: mapear papéis/fluxos e seus estágios; desenhar a transição inicial, a explicação IVO e o exemplo “Agir” como uma composição coerente. Continuar nas partes independentes sem aprovações por componente. Agrupar somente decisões humanas reais.

## 4. Roteiro integrado: 15 cenas existentes, 2 focos novos e 3 transições

Meta inicial: até 20 cenas completas e 9 no percurso executivo. A duração deve ser avaliada na experiência; não anunciar tempo de apresentação sem observação. As transições entram entre blocos, não entre todas as funcionalidades.

| Ordem | Cena / ação                                       | Propósito                                         |
| ----- | ------------------------------------------------- | ------------------------------------------------- |
| 01    | `vitalidade` · preservar mensagem, renovar imagem | Valor e identificação com a organização           |
| 02    | `contexto` · preservar fontes e contexto          | Relevância da agenda                              |
| 03    | `valor` · preservar dados e entregas              | Valor gerencial compreensível                     |
| 04    | **Transição 1 · Compreender**                     | Entrada no bloco de ciência e método              |
| 05    | `ciclo` · refinar ligação entre etapas            | Visão do ecossistema                              |
| 06    | **IVO no método · nova cena**                     | Relacionar leituras, perspectivas e decisões      |
| 07    | `perspectivas` · integrar à explicação IVO        | EU, NÓS, LIDERANÇA e ORGANIZAÇÃO                  |
| 08    | `lentes` · manter fichas e aprofundamentos        | Origem, conceito, utilidade e estágio             |
| 09    | `trimestre` · preservar interação                 | Lente de foco e ciclo trimestral                  |
| 10    | `ciencia` · fortalecer curadoria aplicável        | Conhecimento que chega à prática                  |
| 11    | `caso` · manter atribuição externa                | Aprender com uma experiência brasileira           |
| 12    | **Transição 2 · Colocar em movimento**            | Entrada no bloco de pessoas e aplicação           |
| 13    | **Quem faz o quê · nova cena**                    | Papéis, responsabilidades e acessos               |
| 14    | `jornada` · incorporar demonstração do dashboard  | Conectar menu, tarefa e entrega                   |
| 15    | `aprendizagem` · relacionar à leitura             | Mostrar conteúdo, tentativa, feedback e aplicação |
| 16    | `transformacao` · aprofundar ações verificáveis   | Acordo, condições, registro e revisão             |
| 17    | **Transição 3 · Aprender com o percurso**         | Entrada no bloco de acompanhamento e governança   |
| 18    | `relatorio` · conectar aos registros da história  | Evidências e relato ESG/ODS                       |
| 19    | `servico` · tornar participação concreta          | Escopo e preparação da jornada                    |
| 20    | `conversa` · manter CTA institucional             | Próximo passo qualificado                         |

No executivo, reutilizar as sete cenas atuais e acrescentar IVO e papéis. Não obrigar o visitante a passar por divisórias adicionais nesse percurso; os títulos de bloco podem aparecer integrados às cenas. Na leitura contínua, as transições funcionam como cabeçalhos de seção com imagem, sem páginas vazias.

Os identificadores canônicos existentes, referências e fontes devem ser preservados quando o significado continuar. Novas cenas recebem IDs estáveis; atualizar aliases e testes quando um link antigo passar a ter destino semanticamente melhor.

## 5. Transições: imagem, título e frase com função narrativa

A divisória deve orientar o visitante sobre o assunto que começa. Não usá-la para exibir outra promessa ou um número científico sem contexto. Estrutura: **nome de bloco → frase curta → imagem → próxima ação previsível**.

| Transição                   | Título proposto                                     | Frase de apoio                                            | Cena visual                                                                            |
| --------------------------- | --------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1 · Compreender             | “Conhecer o contexto abre novas possibilidades.”    | Ciência e escuta para formular perguntas melhores         | Executiva negra e colegas de diferentes idades discutem uma situação de trabalho       |
| 2 · Colocar em movimento    | “O conhecimento ganha vida na prática.”             | Pessoas, aprendizagem e acordos que encontram o cotidiano | Grupo diverso preparando uma pequena aplicação de equipe                               |
| 3 · Aprender com o percurso | “Cada experiência pode orientar a próxima decisão.” | Registros, revisão e continuidade                         | Gestora e colega mais velho revisam uma síntese de trabalho e discutem próximos passos |

As frases são propostas editoriais a refinar. Priorizar clareza e pertinência; evitar uma sequência de slogans abstratos.

Regras de apresentação:

- Título em HTML, curto e legível; não embutir texto dentro da imagem.
- Composição com área negativa para leitura e recorte apropriado ao mobile.
- Uma imagem estática por transição; movimento limitado à entrada ou resposta à ação, com redução de movimento funcional.
- Navegação contínua: próximo, anterior e índice continuam acessíveis. Sem clique extra “entrar no bloco” ou espera obrigatória.
- Sem autoplay, parallax obrigatório, flash, vídeo pesado ou mudança automática de slide.
- Eliminar uma divisória se ela não acrescentar orientação ou ritmo na revisão prática.

## 6. Direção de imagem: diversidade brasileira e iluminação cinematográfica natural

Interpretar “iluminação de Hollywood” como **direção de fotografia cuidadosa**, com luz principal difusa, preenchimento suave, separação de planos e acabamento de cor. Preservar naturalidade, legibilidade e contexto institucional.

Brief de casting/composição: representar equipes executivas plurais em contexto brasileiro; mulheres em posição de liderança, pessoas negras, diferentes tons de pele e ao menos uma pessoa de mais idade. Mostrar participação efetiva, troca de olhar e contribuição à tarefa. Evitar elenco homogêneo, pessoas como adereços ou associação automática entre idade, gênero, raça e função subordinada.

Direção recomendada:

- Ambiente de trabalho contemporâneo plausível no Brasil, com materiais reais e poucos objetos.
- Pessoas concentradas, conversando ou construindo algo; expressões naturais, sem euforia obrigatória.
- Vestuário executivo contemporâneo e diversidade de estilos, compatíveis com a situação.
- Luz de janela e estúdio equilibradas, volume suave nos rostos e profundidade moderada.
- Verde institucional em elementos ambientais discretos; dourado como acento, sem brilho excessivo.
- Textura realista de pele, cabelos, mãos e roupas; evitar retoque plástico, anatomia inconsistente e filtros cinematográficos agressivos.
- Ausência de hologramas, interfaces flutuantes, gráficos luminosos sem significado e objetos futuristas genéricos.
- Imagens ilustrativas não devem parecer retratos da equipe, clientes ou instalações reais da VitalOS.

### Brief pronto para criação da imagem de abertura

> Fotografia editorial corporativa hiper-realista de uma equipe executiva plural em uma reunião de trabalho contemporânea no Brasil. Uma mulher negra participa como liderança da conversa; incluir uma mulher e um homem de outras faixas etárias e uma pessoa mais velha, todos contribuindo de forma natural e respeitosa. Ambiente realista, sóbrio e acolhedor, materiais naturais e vegetação discreta. Luz principal ampla e difusa, preenchimento suave e separação cinematográfica dos planos, com cores de pele naturais. Vestuário executivo contemporâneo, gestos plausíveis e expressões atentas. Composição horizontal com área negativa à esquerda para título em HTML, rostos preservados no recorte vertical e foco na interação. Verde profundo e neutros na ambientação, dourado discreto. Sem texto, logos, marcas, hologramas, telas legíveis, caricatura de diversidade ou aparência de publicidade artificial. A imagem representa uma situação fictícia de colaboração.

Adaptar a situação nas três transições mantendo direção de fotografia e coerência visual. Não exigir o mesmo elenco se isso produzir semelhanças artificiais ou inconsistências; priorizar a unidade de linguagem. Preparar alternativa fotográfica licenciada se a geração não atingir qualidade adequada.

Na implementação futura, seguir a skill/ferramenta própria de imagem para geração/edição. Não reconstruir logos por IA. Inspecionar mãos, proporções, faces, recortes e compressão antes de integrar. Registrar origem, licença ou geração e finalidade. Produzir imagens é parte da futura implementação autorizada, não desta entrega documental.

## 7. IVO: explicar a inovação com precisão e linguagem comercial

Nome registrado no pack: **IVO — Índice de Vitalidade Organizacional**. A apresentação pode explicar sua arquitetura e seu papel na visão de desenvolvimento. A redação deve tornar perceptível o estágio do índice, sem transformar a cena em uma nota jurídica.

Há uma diferença documental concreta a respeitar: `ivo-framework.json` contém uma formulação experimental com escala 0–1000; o contrato vigente de leituras em `lens-contract.ts` proíbe `compositeScore`, e o protocolo de eficácia mantém execução separada do índice. A fórmula experimental não pode ser promovida a cálculo liberado apenas para tornar a apresentação mais atraente.

Cena proposta:

**Título:** “IVO: um olhar conectado para a vitalidade da organização.”

**Mensagem:** “As leituras ajudam a compreender o contexto. As perspectivas IVO organizam a conversa. Aprendizagem e ações acompanhadas dão continuidade às decisões.”

**Visual:** um fluxo em três camadas:

1. Lentes de mensuração com origem e contexto.
2. Perspectivas EU/NÓS/LIDERANÇA/ORGANIZAÇÃO como arquitetura de leitura.
3. Prioridade, aprendizagem, aplicação e acompanhamento.

Não desenhar setas que pareçam equivalências psicométricas aprovadas entre todas as células de uma matriz. Distinguir organização conceitual de cálculo.

Um aprofundamento “Como acompanhar a evolução?” explica a comparação de leituras e os registros do percurso. A descrição de estágio pode ser breve e positiva: arquitetura de acompanhamento em desenvolvimento metodológico; Q2 tem a jornada local demonstrada. Exibir somente o que o contrato atual sustenta.

## 8. Evolução e projeção: solução pedagógica desta onda

Construir uma linha de tempo **leitura inicial → aprendizagem e aplicação → registros → revisão → nova leitura comparável**. Diferenciar visualmente eventos de execução e resultados de mensuração.

O produto atual não sustenta uma regra de crescimento automático do IVO por concluir tarefas. Logo:

- Não criar “+10 pontos por ação”, simulador de retorno, curva numérica ascendente ou percentual de sucesso do IVO.
- Não reutilizar previsão ou alavancas de arquivos mockados como modelo validado.
- Contagens como “duas de três ações com registro” só podem descrever execução do exemplo, calculadas dos próprios registros fictícios; não representam bem-estar, aprendizagem dominada ou eficácia.
- Uma futura comparação numérica precisa usar a escala nativa de uma leitura permitida e os critérios existentes de comparabilidade. Exemplo fictício deve ser identificado. O gráfico não deve chamar essa medida de índice composto IVO.
- Se ainda não houver medida comparável, mostrar marcos e o estado “nova leitura a realizar”, sem preencher valores ou fabricar tendência.

**Como valorizar a inovação agora:** mostrar a rastreabilidade entre pergunta, atividade, aplicação e revisão. O gestor entende o trabalho feito e o que será observado depois. Isso permite uma história convincente de evolução sem uma previsão inexistente.

Uma projeção quantitativa futura do índice é uma frente separada: construto, fórmula, pesos, variáveis, base empírica, validação, incerteza e regra de atualização exigem decisão metodológica própria. Agrupar essa dependência nos documentos internos; não ampliar este escopo para inventar o modelo.

## 9. Papéis e autorizações: “Uma jornada conectada. Responsabilidades claras.”

Construir uma cena visual com quatro papéis de serviço. Cada um mostra **missão, três tarefas, informações que acompanha e passagem para a próxima etapa**.

| Papel narrativo                 | Exemplo de contribuição ao ciclo                                       | Aprofundamento sugerido              |
| ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| Direção                         | Definir prioridade, criar apoio institucional e acompanhar síntese     | “Como a direção acompanha a jornada” |
| Gestão de pessoas / coordenação | Articular leitura, aprendizagem, responsáveis e revisão                | “Como coordenar um trimestre”        |
| Lideranças                      | Preparar condições, acompanhar acordos e remover barreiras             | “Como apoiar a aplicação da equipe”  |
| Participantes                   | Contribuir com escuta, explorar aprendizagem e participar das práticas | “Como participar do percurso”        |

Essa tabela define a organização narrativa, não concede permissões. Antes de criar a representação de tela, conferir papel efetivo, capacidades e entitlement no servidor. Usar uma matriz interna: **persona do serviço → papel existente → ação/rota → autorização no servidor → dados visíveis → estágio → redação pública**.

Achados que exigem atenção: o shell tem personas de demonstração; há dashboards com consumo de mocks; o dashboard RH separa ramo institucional e demonstração. Uma interface existente em demo não comprova acesso equivalente na operação institucional de outro papel.

Representação na apresentação:

- Mostrar tarefas efetivamente disponíveis como demonstração do produto.
- Quando o papel existir apenas na proposta de serviço ou em demo, identificar a composição como exemplo de participação/experiência prevista; não simular uma permissão institucional concluída.
- Rótulos “participar”, “coordenar” e “acompanhar” facilitam a compreensão, mas só são permissões de produto quando houver correspondência confirmada.
- Manter administração da plataforma como contexto separado de habilitação/convites/módulos; o papel de empresa não herda essa autoridade.
- Dados coletivos, próprios e institucionais precisam ser nomeados conforme a regra efetiva de cada fluxo. Não sugerir acesso individual sensível para direção ou RH.
- Na implementação da apresentação, não criar contas, ampliar autorização, modificar identidade ou liberar módulos de empresa.

Desktop: mapa de papéis com conexão às quatro etapas. Mobile: sequência vertical com expansões por toque, sem matriz comprimida. Uma seleção abre um painel próprio; nenhuma informação essencial depende de hover.

## 10. Demonstração do dashboard: do menu à entrega

Reutilizar a Alfa fictícia como fio condutor. Exemplo: “A equipe quer melhorar suas condições para pedir ajuda.”

Mostrar um pequeno recorte de dashboard com a ação atual em destaque e uma legenda de tarefa. Não apresentar a tela inteira com letras minúsculas ou uma captura estática que pareça clicável.

| Momento          | O que o visitante explora                           | Saída compreensível                  |
| ---------------- | --------------------------------------------------- | ------------------------------------ |
| Medir            | Uma leitura publicada e seu contexto                | Uma pergunta de trabalho             |
| Agir / preparar  | Uma prioridade e o acesso à aprendizagem pertinente | Repertório para a conversa           |
| Agir / aplicar   | Plano, responsável, condições e momento de revisão  | Um acordo viável                     |
| Acompanhar       | Registro de execução, barreiras e aprendizagem      | Visibilidade sobre o percurso        |
| Provar / relatar | Registros selecionados e síntese institucional      | Elementos para uma decisão de gestão |

O menu atual agrupa itens sob Medir, Agir, Provar e outros grupos; nem todo item equivale a uma funcionalidade institucional completa. Inventariar rótulos, rotas e consumidores antes de escolher o recorte. “Agir” é um grupo de navegação na base, não necessariamente um conjunto de abas de uma única página. Representar esse comportamento fielmente.

Preferir para o exemplo operacional o fluxo Q2 existente de `/ivo-integral/acoes` e seus componentes de acompanhamento. Quando um menu demo apontar para forecast, copiloto ou outro recurso fora desse contrato, não usá-lo como prova de operação do Q2.

Construir a demonstração como componente explicativo no deck, com dados fictícios isolados, sem requisições para criar/alterar ações reais. Pode reaproveitar componentes visuais puros, tipos e rótulos canônicos. Não chamar endpoints de escrita ou misturar estado de sessão da empresa com o acesso da apresentação.

Se for uma maquete, identificá-la como “Exemplo ilustrativo da jornada”. Se for uma captura ou reprodução de uma tela implementada, manter legenda de dados fictícios e estágio demonstrado. Distinguir na documentação: recorte real da UI, composição explicativa e experiência prevista.

## 11. Ações verificáveis: tornar o acompanhamento visível

Criar um infográfico curto com cinco perguntas:

**O que combinamos? → Quem acompanha? → Em que condições? → O que ocorreu? → O que aprendemos e revemos?**

Dentro do exemplo, mostrar um registro fictício com ação, função responsável, prazo ou momento de revisão, evidência de execução e aprendizagem registrada. Conferir campos e validações no contrato existente; não inventar aceite ou verificação humana já realizada.

Distinguir, com rótulos claros e próximos:

- Registro de execução: descrição do que foi realizado.
- Evidência e origem: referência ao que sustenta o registro, conforme o fluxo.
- Revisão/validação: quando há pessoa, regra e estado de verificação efetivos.
- Resultado observado: medida comparável ou observação de resultado.
- Atribuição de impacto: conclusão que depende de desenho de avaliação próprio.

Evitar cadeados, medalhas ou carimbos que façam um relato parecer auditado. Não chamar uma anexação de arquivo de “prova científica” ou ação concluída de “eficácia comprovada”. A linguagem comercial pode ser “Acompanhar o que foi combinado e aprender com a aplicação”.

Ligar o infográfico ao relatório global: cada síntese deve apontar para a origem permitida de seu registro. ESG/ODS permanecem relações temáticas e de evidência conforme contratos existentes, sem score automático.

## 12. Logos, nomes e credibilidade institucional

Duas composições distintas:

1. **Base científica:** autoria e contribuição das instituições na referência citada, como o Playbook.
2. **Experiência empresarial externa:** identificação do caso Heineken e de sua fonte, sem colocá-lo na lista de clientes VitalOS.

Localizar assets em fontes oficiais, registrar origem e condições aplicáveis. Aplicar logos somente quando o uso pretendido estiver compatível com autorização/documentação disponível. Sem essa condição, usar o nome em tipografia própria, com contexto e referência. A peça deve continuar elegante e completa com essa alternativa.

Não recriar, recolorir, animar internamente ou distorcer brasões e marcas para combiná-los com a paleta. Respeitar área de proteção, tamanho mínimo e versões aprovadas. Uma autorização de conteúdo do Playbook não equivale automaticamente à marca Oxford. Não contatar instituições ou enviar pedidos em nome do usuário nesta onda sem autorização específica.

Os números já registrados na V3 continuam em suas superfícies e contextos. Não reabrir aprovações válidas nem copiar o restante da compilação da home sem o processo próprio. Dados Heineken e contagem de estudos têm material de revisão existente; tratar eventual ampliação como decisão agrupada, não como liberação implícita por inserir um logo.

## 13. Design, interações e desempenho

Preservar os tokens que funcionam da V3. As novas imagens devem conversar com verde profundo, dourado e fundos claros, sem exigir um novo tema global.

- Tipografia e hierarquia em HTML, com texto de leitura confortável e fontes próximas dos dados.
- Divisórias com pouco texto; diagramas e demonstrações nas cenas explicativas.
- Frames diferenciados por função: imagem para orientar/identificar, diagrama para ligar ideias, recorte de dashboard para tarefa, gráfico para dado comparável.
- Imagens com alternativas textuais pertinentes; imagem puramente ambiental pode ser decorativa se a informação estiver no texto.
- Mobile com recorte próprio e leitura vertical; evitar rostos cortados de forma inadequada ou títulos sobre áreas de baixo contraste.
- Movimento discreto e opcional, incluindo a preferência de redução. Nada de scroll sequestrado, avanços automáticos ou animação de índice crescendo por execução.
- Controles de projeto ≥44 px, foco visível, teclado, toque e retorno ao acionador de cada ficha.
- Painéis longos com rolagem interna e fechamento sempre alcançável; manter portal na raiz correta de tela cheia.

Orçamento inicial de projeto, a validar nos assets reais: até quatro imagens únicas contando abertura e três transições; variantes responsivas de resolução apropriada. Tentar manter cada imagem principal na faixa de 120–250 KB, sem sacrificar legibilidade ou realismo. Se extrapolar, registrar motivo e otimizar. São metas de implementação, não métricas já alcançadas.

Não carregar todas as imagens com prioridade alta. A abertura pode ser prioritária; transições seguintes carregam sob demanda/lazily. Reservar proporções no layout; usar formatos otimizados compatíveis. Comparar peso e carregamento com o baseline V3 no mesmo ambiente. Não afirmar ganhos de conversão ou Core Web Vitals sem medição.

## 14. Sequência técnica de implementação após aprovação

### Fase 1 — mapa e limites

Conferir Git; mapear papéis, telas, fontes de dados e permissões necessárias ao exemplo. Registrar a diferença entre a descrição experimental de IVO e o contrato vigente. Definir IDs das cenas novas e compatibilidade dos links. Reutilizar evidências atuais onde continuarem válidas.

### Fase 2 — copy e composição

Revisar os títulos das transições, a mensagem IVO, a cena de papéis e a história Alfa. Preparar uma prancha com três momentos representativos: divisória, IVO e recorte do dashboard. Converter a aprovação deste prompt em execução contínua das escolhas rotineiras, sem criar uma aprovação obrigatória para cada tela.

### Fase 3 — assets e componentes

Produzir/selecionar imagens; registrar origem e versões. Estender o modelo declarativo da apresentação somente onde necessário. Desenvolver as cenas novas, divisórias e recortes explicativos com o stack e a família de componentes existentes. Reutilizar tipos e componentes puros do produto quando apropriado; evitar copiar providers empresariais ou depender de banco.

### Fase 4 — integração

Atualizar percursos completo/executivo e leitura contínua. Conferir índice, contagem, aliases e navegação entre blocos. Preservar gate no servidor, senha fora do código, expiração, origem e remoção de conteúdo ao encerrar a sessão. Não introduzir um construtor genérico, CMS, novo banco ou agente para esta entrega.

### Fase 5 — verificação e acabamento

Testar primeiro os comportamentos alterados; executar TypeScript, lint e build aplicáveis e o gate no candidato integrado. Usar o ambiente local descartável próprio, com endpoints conferidos e configuração inerte quando não houver necessidade de banco. Não repetir provas HTTP/DB antigas sem alteração que invalide seu resultado.

Concluir a prova visual pendente da V3 junto à nova versão. Usar somente o procedimento suportado da ferramenta. Se continuar bloqueada por validação de URL, registrar o erro específico, interromper esse controle e fornecer roteiro manual curto; prosseguir apenas no trabalho independente permitido. Não alterar permissões, desativar a proteção, trocar de mecanismo para contorná-la ou aguardar indefinidamente.

### Fase 6 — fechamento

Revisar o diff, registrar evidências sanitizadas e fazer commit local coeso se a autorização vigente permitir. Entregar candidato navegável, mapa de cenas e fontes, assets, verificações, limites e próxima ação única. Sem publicação implícita.

## 15. Critérios de aceite e avaliação do comitê

| Dimensão           | Evidência de aceite                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Transições         | Orientam a mudança de assunto, têm leitura curta e não geram navegação desnecessária                                            |
| Representatividade | Imagens atendem ao briefing plural, com participação significativa e qualidade anatômica/visual                                 |
| IVO                | Explicação clara de finalidade, perspectivas e leituras; estágio do cálculo identificável; sem promoção da fórmula experimental |
| Evolução           | Execução, acompanhamento e resultados têm tratamentos distintos; sem crescimento automático ou previsão não validada            |
| Papéis             | Relação rastreável entre papel, tarefa, informação e estágio; nenhuma nova permissão concedida pela apresentação                |
| Dashboard          | O comprador consegue relacionar menu, tarefa e entrega; mock/maquete não aparece como operação institucional comprovada         |
| Ações verificáveis | Registro, origem, revisão e resultado reconhecíveis, sem carimbo de validação inexistente                                       |
| Marca              | VitalOS/Instituto protagonistas; referências externas contextualizadas; assets com origem e uso conferidos                      |
| UX                 | Fluxos operam por clique, toque e teclado; painel fecha e devolve foco; alteração de percurso mantém estado coerente            |
| Fullscreen         | Entrar, rolar cena, abrir índice/painel, rolar painel, fechar, navegar, sair e reentrar demonstrados no navegador               |
| Responsividade     | Conferir 320/360/~390/768/1024/1440 px, altura baixa, paisagem e zoom; sem perda de conteúdo ou função                          |
| Movimento e imagem | Redução de movimento funcional, recortes adequados, imagens com tamanho reservado e carregamento proporcionado                  |
| Engenharia         | Contratos e proteção preservados; testes aplicáveis, TypeScript, lint, build e gate com resultado registrado                    |
| Desempenho         | Peso e carregamento comparados no mesmo contexto; limites da medição declarados                                                 |

Avaliação proposta, sem atribuir nota antecipada:

| Área                                           | Peso |
| ---------------------------------------------- | ---: |
| Valor e clareza para o comprador               |   20 |
| Coerência metodológica do IVO e das evidências |   20 |
| Tangibilidade de papéis, dashboard e jornada   |   20 |
| Direção visual e qualidade instrucional        |   15 |
| UX, acessibilidade e responsividade            |   15 |
| Engenharia e evidências de funcionamento       |   10 |

Uma soma alta não compensa falha bloqueadora: vínculo institucional inventado, fórmula não aprovada exibida como real, permissão indevida, dados expostos ou conteúdo essencial inacessível. Validação em viewport emulado não comprova operação em todos os dispositivos físicos.

Para avaliação pedagógica, pedir ao revisor que explique com suas palavras: o papel do IVO, o que cada pessoa faz, como uma prioridade chega à ação, o que conta como registro e como se observa mudança. Registrar dificuldades reais, sem inventar resultados de teste com compradores.

## 16. Decisões humanas agrupadas e autonomia

| Tema                 | Caminho executável após aprovação do prompt                           | Dependência específica                                                             |
| -------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Roteiro e transições | Até três divisórias e dois novos focos, com refinamento de composição | Aprovação deste plano                                                              |
| Imagens              | Brief plural, cinema natural e imagens ilustrativas com origem        | Revisão estética; autorização de uso se fotografia externa exigir                  |
| IVO no método        | Explicação da arquitetura e acompanhamento conforme contrato          | Cálculo composto e previsão quantitativa continuam em decisão metodológica própria |
| Papéis               | Demonstração fiel aos fluxos existentes e aos estágios                | Ampliação real de autorização ou novos dashboards não pertence a esta onda         |
| Logos                | Nome contextualizado como alternativa funcional completa              | Uso de logo oficial depende da documentação aplicável                              |
| Números              | Preservar os quatro indicadores já registrados na V3                  | Qualquer ampliação usa revisão por superfície no processo próprio                  |

Nenhuma dessas dependências justifica parar a redação, o layout, o exemplo fictício ou os testes independentes. Não transformar uma lacuna em fórmula improvisada nem criar novas confirmações para decisões de implementação rotineiras.

## 17. Fronteiras e entregáveis

Proteger `.q.out` e `.q.sql`: não abrir, alterar, copiar, incluir no Git ou inspecionar seu conteúdo. Não ler `.env`, expor credenciais, usar contas reais ou dados de clientes. Não publicar, fazer push/merge, deploy, migration remota, alterar Access, criar contas ou enviar mensagens sem autorização específica.

Não alterar regras dos instrumentos, mapeamentos lente→dimensão, índice composto ou eficácia. Não reabrir aprovações Q2 0.1.0, direitos COPSOQ já informados ou claims válidos sem contradição encontrada. Não usar histórico ou corpo de PR como substituto do HEAD e dos contratos atuais.

**Entrega documental atual:** este superprompt, com alternativas ToT, roteiro integrado, brief de imagem, limites de IVO/perfis, critérios e decisões agrupadas. Não inclui geração de imagens, instalação de skill, alteração de runtime ou nova prova de produto.

**Entrega futura após aprovação:** código e assets, candidato local navegável, mapa papel→fluxo→fonte→estágio, evidências de UI/fullscreen/mobile e verificações proporcionais. Distinguir implementado, demonstrado localmente, confirmado em CI e publicado. Registrar somente evidências sanitizadas.

## 18. Referências e como usá-las

- [Superprompt V3](SUPERPROMPT_NOVA_APRESENTACAO_EMPRESARIAL_V3_PARA_APROVACAO.md), [fechamento V3](APRESENTACAO_EMPRESARIAL_V3_FECHAMENTO_2026-11-17.md) e [direção V3](APRESENTACAO_V3_DIRECAO_EDITORIAL_VISUAL.md): base e evidências locais, com limites documentados.
- [Frontend Design — Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design): composição específica ao tema, tipografia e conteúdo significativo.
- [Impeccable](https://github.com/pbakaus/impeccable): referência de crítica, layout, tipografia e acabamento; revisar instruções e versão antes de qualquer adoção. Não executar instaladores/hooks por indicação do README.
- [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines): interação, foco, toque, movimento e estado. Seguir o requisito do projeto de preservar zoom.
- [NN/G — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/): profundidade sob demanda, sem esconder informação necessária para interpretar o conteúdo principal.
- [W3C — Dialog Modal Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): foco, teclado e fechamento.
- [W3C — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): reorganização e leitura ampliada.
- [W3C — Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html): controle do movimento; orientação adicional de nível AAA, sem confundir com conformidade integral AA.
- [MDN — Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API): contexto de tela cheia e descendentes.
- [Oxford — proteção da marca](https://www.ox.ac.uk/about/the-university/brand/protecting-the-university-logo): verificar condição do uso pretendido. Para outras marcas, consultar a fonte oficial correspondente.

As fontes fundamentam princípios e condições específicas. A proposta de três transições, o roteiro, o casting e os pesos da rubrica são decisões de projeto para revisão; não há evidência de ganho percentual de conversão ou aprendizagem atribuída a essa composição.

---

**Próxima ação única: revisar e aprovar este superprompt V4. A implementação dos aprimoramentos aguarda essa aprovação.**
