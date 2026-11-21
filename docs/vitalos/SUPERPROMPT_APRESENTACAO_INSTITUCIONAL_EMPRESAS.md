# Superprompt — apresentação institucional web para empresas

Versão 0.1.0 · 16/11/2026 · Estado: orientação de desenvolvimento; página ainda não implementada por este documento.

Base consultada: branch `feat/ivo-fibt-platform-foundation`, HEAD `0b35b8f`. Revalidar o estado antes de executar e preservar trabalho posterior. A marca encontrada nos ativos oficiais é **VitalOS™**; utilizar essa grafia, sem criar variantes a partir de transcrições como Vitulus/Vita Luz.

## 1. Missão e resultado

Atue como equipe multidisciplinar de engenharia, estratégia B2B, design editorial e instrucional, UX, acessibilidade, ciência do bem-estar, privacidade e comunicação de evidências. Use esses pontos de vista como critérios de revisão, sem simular pareceres humanos ou atribuir aprovação a especialistas inexistentes.

Desenvolva, no aplicativo existente, uma apresentação institucional premium em slides web para potenciais clientes empresariais. Rota proposta: `/apresentacao/empresas`, sujeita à convenção real do router. O acesso deve exigir a senha fornecida pelo usuário na conversa, validada no servidor. Nunca copie o valor para arquivos versionados, testes, exemplos, respostas ou logs.

A apresentação deve permitir que um decisor compreenda: qual problema organizacional o serviço aborda; como funciona o ciclo Mensurar → Educar → Transformar → Evoluir; quais pessoas participam e com quais limites; que evidências existem; o que pode ser discutido numa demonstração; qual é o próximo passo comercial concreto.

A meta de conversão é uma conversa qualificada sobre necessidades e aderência. Não há taxa de conversão, ROI ou eficácia garantidos. A qualidade visual será avaliada por critérios observáveis, sem alegar melhoria percentual ou certificação por um comitê.

Entregue implementação local e demonstração compatíveis com a autorização vigente. Publicação e operação comercial exigem autorização específica. A resposta mais recente do usuário delimitou os ensaios a **Alfa/Beta fictícias, somente locais**; não transforme essa decisão em permissão para piloto real.

## 2. Método ToT: alternativas e decisão de projeto

Compare rotas de solução antes da implementação. Apresente apenas alternativas, critérios, decisão e limites; não exponha raciocínio interno extenso. A avaliação inicial abaixo é heurística de engenharia, não experimento com clientes.

Notas de 0–10; maior é melhor em todas as colunas. Custo = economia; risco = menor risco; complexidade = simplicidade; tempo = rapidez até valor.

| Ramo                                                      | Valor | Segurança | Custo | Risco | Alinhamento | Reuso | Complexidade | Escala | Tempo |
| --------------------------------------------------------- | ----: | --------: | ----: | ----: | ----------: | ----: | -----------: | -----: | ----: |
| A · adaptar a landing com navegação simples               |     7 |         8 |     9 |     8 |           7 |     9 |            9 |      8 |     9 |
| B · slides editoriais com aprofundamentos, no stack atual |     9 |         9 |     7 |     8 |          10 |     9 |            7 |      9 |     8 |
| C · apenas protótipo estático demonstrativo               |     6 |         8 |     9 |     7 |           6 |     5 |            9 |      5 |     9 |
| D · adiar até homologar toda a plataforma                 |     2 |         9 |     9 |     7 |           4 |     2 |           10 |      3 |     1 |
| E · integrar ferramenta externa de apresentações          |     8 |         6 |     5 |     5 |           7 |     5 |            6 |      8 |     7 |
| F · criar editor/CMS genérico de apresentações            |     7 |         7 |     2 |     3 |           6 |    10 |            2 |      9 |     2 |

**Recomendação: B, com escopo controlado.** Reutilizar identidade, componentes e infraestrutura do aplicativo. Separar conteúdo de apresentação e renderização, sem construir um CMS. Usar a organização por slides e detalhes opcionais como referência de formato; isso não obriga instalar reveal.js ou trocar o router.

Trade-off: exige mais trabalho de foco, sessão e conteúdo do que uma landing; entrega navegação comercial própria e reduz dependência externa. Se o stack não suportar proteção real no servidor, concluir storyboard/componentes independentes e declarar o bloqueio preciso; nunca substituir a proteção por comparação de senha em JavaScript.

Critério de aceite da escolha: uma pessoa pode seguir a narrativa linear, outra pode ir direto a método, perfis ou evidências, e ambas conseguem voltar ao mesmo ponto e realizar o CTA. Primeiro passo: conferir rotas, componentes e fronteiras server/client existentes, depois montar o contrato editorial e um slide representativo.

## 3. Benchmark e aplicação crítica

Referências consultadas em 16/11/2026. Cada referência orienta decisões específicas; não constitui prova de conversão ou eficácia desta apresentação.

| Referência                                                                                                                                                                                            | Princípio aproveitado                                     | Aplicação proposta                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Duarte — audiência como protagonista](https://www.duarte.com/blog/presentation-storytelling-audience-is-hero/)                                                                                       | Começar pela necessidade e decisão do público             | A organização é protagonista; VitalOS oferece método e meios para agir                 |
| [Sequoia — estrutura de pitch](https://sequoiacap.com/article/writing-a-business-plan)                                                                                                                | Propósito, problema, solução e clareza                    | Adaptar a sequência ao comprador B2B; excluir a agenda de captação de investimento     |
| [Mayer e Fiorella — aprendizagem multimídia](https://doi.org/10.1017/CBO9781139547369.015)                                                                                                            | Coerência, sinalização e proximidade entre texto e visual | Retirar decoração irrelevante, destacar a ideia central, aproximar legenda e evidência |
| [reveal.js — slides e aprofundamentos opcionais](https://revealjs.com/vertical-slides/)                                                                                                               | Separar percurso principal de detalhes                    | História linear com micro-CTAs; não importar automaticamente a biblioteca              |
| [W3C — carrosséis](https://www.w3.org/WAI/tutorials/carousels/)                                                                                                                                       | Estrutura semântica e controle do usuário                 | Progresso nomeado, anterior/próximo e nenhuma reprodução automática                    |
| [W3C — modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)                                                                                                                                 | Gestão de foco e interação previsível                     | Título acessível, foco contido, Escape e retorno ao acionador                          |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/)                                                                                                                                                             | Critérios verificáveis de acessibilidade                  | Contraste, reflow, foco, teclado, tamanho de alvos e conteúdo compreensível            |
| [OMS — saúde mental no trabalho](https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work)                                                                                              | Contexto e intervenções organizacionais                   | Números globais contextualizados; condições de trabalho também fazem parte da solução  |
| [OWASP — autenticação](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) e [sessão](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Validação no servidor e proteção de sessão                | Gate separado do acesso institucional; credencial ausente do cliente                   |

A hipótese de design é que narrativa curta, sinais visuais consistentes e aprofundamento sob demanda favorecem compreensão e conversa qualificada. A aplicação comercial dessa hipótese ainda precisa ser observada com público representativo. Ciência de aprendizagem não determina um número universal de palavras, cards ou slides.

## 4. Fontes internas e verdade do produto

Faça leitura seletiva, sem reiniciar auditoria completa:

- `src/features/landing/data/landing-copy.ts` e componentes pertinentes: linguagem e arquitetura narrativa existentes; copy comercial não comprova implementação.
- `src/components/brand/VitalOSBrand.tsx`, `src/styles.css`, `docs/brand/vitalos/BRAND-ASSET-MAP.md`, `public/brand/vitalos/README.md`, `public/brand/instituto/README.md`: marca, fontes, tokens e uso de logos.
- `src/components/ui/dialog.tsx` e componentes de botão/cards disponíveis: reutilização e foco.
- `src/domain/commercial-claims/`: superfícies, bindings, projeção pública e governança de alegações.
- `docs/vitalos/CHECKPOINT.md`, `Q2_PILOT_REVIEW_2026-11-16.md`, `Q2_ACTION_NAVIGATION_2026-11-16.md`, `decisions/Q2_PILOT_SCOPE_2026-11-16.md`: maturidade local e limites.
- `docs/vitalos/MACRO_ONDA_AUTONOMA_DECISOES.md`, D10 e documentos canônicos de COPSOQ/ESG somente nos pontos necessários.
- Rotas, handlers e testes diretamente ligados a cada capacidade apresentada. Nunca deduzir funcionalidade disponível apenas pelo nome de arquivo ou persona de marketing.

Antes de redigir, faça uma matriz curta: afirmação → capacidade/benefício → evidência e data → estágio → redação permitida. Estágios internos: implementado; demonstrado localmente; documentado; mock/demonstração; planejado; pendente; não confirmado; contraditório. No material do cliente, traduza para estados compreensíveis como “Demonstração”, “Em validação” e “Evolução prevista”, próximos da alegação afetada. Não mostre IDs internos, commits ou detalhes técnicos na narrativa comercial.

Fronteiras atuais a revalidar:

- Plataforma pode convidar o primeiro administrador de empresa existente e controlar Q1/Q2 por empresa; autoridade de plataforma é distinta de RH_ADMIN. Prova local não equivale a operação remota homologada.
- Q2 tem leitura nativa publicada, fatores 0–4 e bruto 0–12, recortes protegidos e jornada administrativa educativa local. Unidade/atividade 0.1.0 têm aprovação editorial local registrada por ambas as revisoras. Não promover automaticamente a disponibilidade para clientes.
- Execução de ação, registro de aprendizagem, transferência ao trabalho e eficácia são conceitos distintos. Concluir uma ação não comprova os demais.
- Q1 mantém a confirmação informada sobre fonte/uso; falta a correspondência exata da fonte brasileira e regras com o manifesto servido. Não apresentar a bateria demonstrativa como versão brasileira operacionalmente homologada.
- EU, NÓS, LIDERANÇA e ORGANIZAÇÃO organizam perspectivas; Q1 COPSOQ, Q2 FIB-T, Q3 PERMA+V e Q4 VIA-T são lentes. Não inventar equivalência entre escalas, mapeamentos aprovados, índice composto, peso ou nota global.
- Q3/Q4 podem ilustrar a arquitetura anual, com estágio verificado e explícito. Não vender o ciclo inteiro como igualmente operacional.
- Relatório global ESG tem trabalho editorial/demonstrativo; não apresentá-lo como impacto auditado, certificação, adequação jurídica ou resultado real de cliente. Vínculos ESG e critérios de eficácia conservam suas próprias decisões.
- Números institucionais existentes na landing, clientes, municípios, recordes e parcerias precisam de evidência própria antes de serem reutilizados. Não os transferir para a VitalOS como histórico comprovado do software.

A nova rota é uma nova superfície comercial. Reutilize o mecanismo canônico de claims com o escopo correto; não reutilize uma autorização de superfície da home como autorização irrestrita. Não importe o registry completo para o navegador. Ausência de claim autorizado exige omitir/reformular de maneira neutra e registrar a pendência. Benchmark novo não aprova alegações automaticamente.

## 5. Público, proposta e narrativa

Público principal: RH/gestão de pessoas e decisores empresariais. Necessidades complementares: direção, SST, lideranças e governança. Participantes são sujeitos do serviço, não alvos de vigilância. Adapte exemplos a empresas; não misture educação pública, municípios ou outros segmentos nesta apresentação.

Ideia central proposta: **“Transformar a escuta organizacional em aprendizagem, ações acompanhadas e evidências para decisões melhores.”** Apresentar como proposta de serviço, sem garantir melhora de saúde ou desempenho.

Arco: problema reconhecível → dimensão do desafio → necessidade de coordenação → framework → pessoas e decisões → jornada concreta Q2 → evidência e proteção → forma de trabalhar juntos.

Referência editorial: 15 slides, aproximadamente 12–15 minutos em conversa assistida; duração é objetivo de projeto, a verificar. Percurso resumido opcional usa um subconjunto dos mesmos slides, sem duplicar a copy. Cada slide possui uma ideia principal, um visual explicativo e um micro-CTA relevante. Detalhes, fontes e limites ficam disponíveis sem esconder qualificadores essenciais.

| Slide | Pergunta e título proposto                                                                          | Visual principal                                                           | Micro-CTA / aprofundamento                                                                   |
| ----- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 01    | “Como cuidar das pessoas e orientar decisões com continuidade?” · Vitalidade organizacional em ação | Marca VitalOS e assinatura Instituto, tese em uma frase                    | “Ver como funciona” → visão do ciclo                                                         |
| 02    | “Por que essa pauta exige atenção?” · O desafio humano tem escala organizacional                    | Dois ou três números de contexto com fonte, período e território           | “Entender os números” → fontes e limitações                                                  |
| 03    | “Onde a gestão perde continuidade?” · Escuta, aprendizagem e ação precisam conversar                | Fluxo com dores: informação dispersa, ação sem dono, evidência incompleta  | “Reconhecer os desafios” → perguntas de diagnóstico comercial, sem coleta sensível           |
| 04    | “O que a VitalOS propõe?” · Um ciclo para transformar sinais em decisões e práticas                 | Mensurar → Educar → Transformar → Evoluir, com saída concreta de cada fase | “Explorar cada etapa” → quatro blocos visuais                                                |
| 05    | “Sobre quem e o que olhamos?” · Quatro perspectivas da organização                                  | EU, NÓS, LIDERANÇA, ORGANIZAÇÃO com exemplos contextualizados              | “Ver situações do trabalho” → exemplos, sem pontuação psicológica                            |
| 06    | “Como as lentes se complementam?” · Uma arquitetura anual de leituras distintas                     | Q1–Q4 e perspectivas em matriz conceitual, com estados de disponibilidade  | “Métodos e limites” → uma ficha por lente; nenhuma nota composta                             |
| 07    | “Quem participa e decide?” · Papéis claros, responsabilidades e limites de acesso                   | Raias de autoridade da plataforma, RH_ADMIN, decisores e participantes     | “Ver os perfis” → responsabilidade no serviço versus acesso implementado                     |
| 08    | “Como os dados viram prioridades?” · Uma leitura Q2 orienta uma pergunta de trabalho                | Exemplo sintético de resultado publicado e prioridade                      | “Entender a leitura” → origem, escala, recorte, proteção, limites                            |
| 09    | “Como a prioridade vira aprendizagem?” · Compreender, recuperar e praticar                          | Unidade 0.1.0: contexto → tentativa de recuperação → feedback → aplicação  | “Explorar a atividade” → prévia fiel, identificada como ensaio local                         |
| 10    | “Como sair da intenção?” · Uma aplicação ganha responsável e acompanhamento                         | Ação → responsável → prazo → execução → aprendizagem                       | “Acompanhar um exemplo” → timeline fictícia, barreiras e revisão                             |
| 11    | “Como reconhecer avanço com responsabilidade?” · Evidências para revisar o próximo passo            | Comparação descritiva de registros/momentos; ausências explícitas          | “O que isso permite concluir?” → observação, relato, associação e limites causais            |
| 12    | “Como prestar contas?” · Uma narrativa institucional com origem e limites                           | Prévia demonstrativa do relatório global e matriz METE/evidência           | “Explorar o relatório” → exemplos sintéticos; ESG condicionado à evidência                   |
| 13    | “Como proteger pessoas e decisões?” · Confiança depende de controles e práticas                     | Isolamento, acesso, agregação, minimização e recortes protegidos           | “Conhecer as proteções” → escopo comprovado e limites, sem absolutos                         |
| 14    | “Como iniciar com clareza?” · Uma jornada assistida com escopo combinado                            | Etapas propostas: alinhamento → ambiente → jornada → revisão               | “O que precisamos combinar?” → papéis, dados, suporte e validação; sem prazo/preço inventado |
| 15    | “Qual é o próximo passo para sua organização?” · Vamos avaliar a aderência ao seu contexto          | Síntese do valor, VitalOS + Instituto e CTA principal                      | “Conversar sobre minha organização” → destino institucional existente e verificado           |

Títulos e sequência são proposta editorial, não copy automaticamente aprovada. Ajustar após conferir evidências, mantendo a função de cada slide. Não transformar o slide 13 numa promessa absoluta de anonimato ou conformidade.

### Contexto científico e benefícios

A ficha da OMS aberta no benchmark está datada de 15/09/2026. Informa estimativa de **16% dos adultos em idade de trabalhar com transtorno mental em 2023**, além de estimativas globais anuais de **12 bilhões de dias de trabalho perdidos** por depressão/ansiedade e **US$ 1 trilhão em produtividade perdida**. Esses são números de contexto global, não prevalência numa empresa brasileira, perdas do cliente ou impacto evitável pela VitalOS. Conferir novamente a fonte antes da implementação editorial final.

Evitar gráficos que tornem 12 bilhões e US$ 1 trilhão duas provas independentes da mesma tese sem explicar que representam a mesma estimativa de carga. Não converter essas perdas em simulador de economia do cliente. Os dados de 15% encontrados em versões anteriores não devem ser misturados silenciosamente com 16% e outra referência temporal.

Benefícios apresentados como propósito e mecanismo plausível: organizar prioridades; dar repertório para dialogar; atribuir responsabilidades; acompanhar execução e aprendizagem; produzir registros compreensíveis para governança. Relações científicas e resultados de intervenções exigem fonte específica e qualificadores. Não inventar ROI, redução de afastamento, turnover, produtividade, felicidade ou cura.

Inclua condições de trabalho, carga, participação e práticas de gestão. Práticas individuais de bem-estar não devem responsabilizar a pessoa por um problema organizacional nem substituir medidas sobre o trabalho.

### Perfis e stakeholders

Para cada perfil, mostrar: decisão/necessidade; contribuição esperada; informações utilizadas; limite; estágio da interface. RH, SST e C-Level são públicos comerciais, não prova de roles implementadas. EU/NÓS/LIDERANÇA/ORGANIZAÇÃO são perspectivas, não permissões técnicas.

Exibir a autoridade de plataforma como função operacional controlada. RH_ADMIN é o acesso educativo comprovado nesta fatia Q2. Se líder/colaborador/executivo não tiverem o fluxo específico comprovado, explicar sua participação proposta no serviço e sinalizar a interface como evolução prevista. Nunca conceder acesso apenas para tornar a apresentação convincente.

## 6. Direção de arte e design instrucional

Use a identidade oficial existente: verde profundo, dourado e superfícies claras dos tokens, tipografia e hierarquia do sistema. VitalOS é a marca do produto; Instituto Felicidade para Todos aparece com o logo oficial e atribuição institucional existente. Não inventar titularidade jurídica, certificações, credenciais, clientes ou endossos. Usar os arquivos locais de marca, respeitando superfície, proporção e área de respiro; não recolorir ou redesenhar logos.

Sistema visual proposto:

- Capa e divisórias com composição editorial ampla; slides de explicação com superfícies legíveis e diagrama dominante. Alternar composição por necessidade narrativa, sem trocar a linguagem visual.
- Uma família de ícones existente, preferencialmente Lucide. Ícone acompanha rótulo; elemento decorativo recebe semântica apropriada. Cor nunca é o único código.
- Cards de dor/decisão, raias de papéis, ciclo de quatro etapas, matriz conceitual 4×4, timeline de aplicação, fichas de evidência. Escolher o formato que responde à pergunta do slide; não usar a mesma grade em todos.
- Na matriz 4×4, declarar organização conceitual. Não preencher células com relações metodológicas não aprovadas, heatmaps numéricos, pesos ou indicadores fictícios que pareçam resultados.
- Diagramas em SVG/HTML/CSS com legenda e alternativa textual. Gráficos apenas quando os dados sustentarem; preservar unidade, escala, origem e ausência. Sem radares fabricados ou fotos de dashboards com dados reais.
- Painéis de aprofundamento com pergunta-título, síntese, três ou quatro blocos visuais como referência editorial, fonte/limite e próxima ação. Quantidade varia conforme a informação; evitar texto corrido e mosaicos de pequenos cards ilegíveis.
- Capturas sintéticas autorizadas ou ilustrações vetoriais fiéis. Não usar imagens geradas como prova de funcionalidade. Logotipo institucional não funciona como selo de validação científica.
- Efeitos discretos e funcionais: transições curtas de opacidade/deslocamento, realce do elemento ativo e traços do fluxo. Sem autoplay, partículas contínuas, parallax obrigatório, flashes ou áudio automático. Respeitar `prefers-reduced-motion`.

A navegação principal e o CTA devem ser reconhecíveis em todo o percurso. Micro-CTAs explicam uma decisão ou evidência, sem competir com o CTA comercial. “Conhecer método”, “Ver exemplo” e “Entender a proteção” são melhores que repetidos “Saiba mais” sem contexto.

## 7. Navegação, mobile e acessibilidade

- Desktop: anterior/próximo, índice de capítulos com títulos, indicador “Slide X de Y”, tela cheia opcional acionada pelo usuário. Não obrigar fullscreen nem capturar scroll global sem necessidade.
- Mobile: slides em largura fluida e altura natural, conteúdo empilhado, rolagem vertical e controles claros. Não reduzir uma tela 16:9 inteira até o texto ficar ilegível. Swipe pode ser adicional; nunca a única forma de navegar.
- Mesmo conteúdo canônico para slides e modo de leitura contínua acessível. Troca de modo preserva o capítulo. Não duplicar árvores interativas ocultas no leitor de tela.
- IDs estáveis e navegação com histórico quando apropriado. Link direto e reload passam pelo gate. Depois do login, retomar somente destino interno validado. Voltar do navegador não deve sair inesperadamente da apresentação.
- Teclas de navegação não interceptam campos de senha, formulários ou modais. Slides inativos não ficam na ordem de foco. Mudança de slide anuncia o título sem inundar a região viva.
- Modal usa o componente existente: nome acessível, foco inicial coerente, Tab/Shift+Tab contidos, Escape, botão Fechar visível e retorno ao micro-CTA. Mobile pode usar painel amplo com altura limitada e scroll interno; não abrir modal dentro de modal.
- Projeto orientado a WCAG 2.2 AA: contraste de texto 4,5:1, texto grande 3:1 e controles/foco conforme os critérios aplicáveis. Adotar alvo de toque de 44 px como padrão de projeto; isso é mais amplo que o mínimo AA de 24 px com exceções, não uma citação incorreta da norma.
- Validar 320, 360, 390, 768, 1024 e 1440 px, incluindo tela baixa e orientação horizontal, texto ampliado e zoom. Barras não podem cobrir conteúdo/foco; considerar safe areas. Sem rolagem horizontal do documento.
- Sem depender de hover. Incluir erro, carregamento, sessão expirada, ausência de configuração e retry seguro. Queda de rede não apaga rascunho por conveniência nem gera submissões duplicadas.

## 8. Gate de acesso e arquitetura segura

A senha compartilhada controla apenas a apresentação. Não cria usuário, vínculo de empresa, papel ou acesso a dados institucionais. O material deve continuar adequado para uma demonstração com informações sintéticas, já que uma senha compartilhada pode ser repassada e não identifica o visitante.

Requisitos verificáveis:

1. Reutilizar primitivas suportadas de servidor do stack TanStack Start e a fronteira server/client existente. Página de entrada recebe senha por POST; validação e configuração ficam exclusivamente no servidor.
2. Obter a credencial fornecida no contexto autorizado sem copiá-la para o repositório. Guardar verificador/hash com salt e KDF apropriada em configuração privada do servidor; segredo de assinatura separado. Nenhum segredo em variável `VITE_*`, query string, `localStorage`, código cliente ou exemplo. Não abrir `.env`.
3. Configuração ausente ou inválida fecha o acesso com estado recuperável. Não usar senha padrão ou fallback permissivo. Se não houver canal/configuração privada disponível, deixar essa única integração explicitamente bloqueada e concluir o restante.
4. Sessão própria, curta e expirada no servidor, com cookie HttpOnly, SameSite apropriado, escopo mínimo e Secure no destino HTTPS. Uso HTTP permitido apenas no localhost descartável validado. Proteger operações contra CSRF/Origin indevida.
5. Implementar limite de tentativas com mecanismo suportado e testável, sem vazamento de credencial nos logs. Se o armazenamento de limite for apenas de processo local, declarar o limite de escala; publicação exige solução compatível com o runtime real. Não alegar proteção distribuída inexistente.
6. Proteger renderização SSR, loaders, server functions, downloads e dados dos painéis antes de retornar conteúdo. Sem sessão válida, o HTML/JSON não pode carregar os slides protegidos.
7. Não importar a apresentação confidencial como JSON/strings estáticos num bundle acessível sem sessão. Ocultar DOM, carregar chunk sob demanda ou checar senha no cliente não protege arquivos públicos. Assets institucionais já públicos podem permanecer públicos; material protegido precisa de entrega autenticada.
8. Respostas protegidas com cache privado/no-store e política compatível com o hosting. Impedir gravação em cache público/prefetch/service worker não autenticado. `noindex` e ausência de sitemap são complementos, não autorização.
9. Sair invalida o acesso na fronteira de servidor conforme o mecanismo escolhido. Expiração, navegação direta, recarga, Voltar e sessão antiga precisam retornar ao gate quando aplicável. Não prometer apagar cópias já visualizadas/salvas pelo visitante.
10. Não alterar Supabase Auth, Access, credenciais institucionais, migrations, organizações, contas ou dados reais para suportar esta apresentação. Sem endpoints de bypass ou sessão administrativa gerada.

Antes de escrever, identificar rotas e APIs suportadas pelo stack instalado. Não transportar exemplos de outro framework sem adaptação. Dependência nova só com necessidade concreta; não acrescentar CMS, analytics, chatbot ou serviço externo por preferência estética.

## 9. Contrato editorial e implementação

Separe conteúdo e apresentação com tipos leves adequados ao projeto. Campos propostos, adaptáveis às convenções: `id`, `chapter`, `title`, `summary`, `visualKind`, `keyMessage`, `detailId`, `sourceRefs`, `capabilityStatus`, `cta` e `speakerNotes`. Os campos protegidos são servidos após autenticação; a tipagem não determina importação no cliente. Notas internas não são payload comercial por padrão.

Mantenha um registro pequeno de fontes públicas e um mapa de capacidade/copy. Fontes científicas têm URL, título, data, população, unidade e limite. Capacidade tem caminho/símbolo e referência da prova. Essas informações internas só vão à interface quando ajudarem o visitante; não expor configuração, e-mails locais, tokens, decisões privadas ou registry completo.

Pipeline de trabalho:

1. Confirmar path/branch/HEAD/status e instruções locais. Não reiniciar a macro-onda nem repetir gates antigos apenas para reconstruir contexto. Preservar `.q.out`, `.q.sql`, stacks e alterações existentes.
2. Conferir os arquivos mínimos listados, mapear claims/perfis e redigir storyboard final. Resolver escolhas rotineiras autonomamente; agrupar somente contradições ou decisões humanas reais.
3. Implementar um corte completo: gate → capa → um slide → um modal → navegação → saída. Usar credencial sintética de teste, distinta da senha do usuário. Validar antes de multiplicar o layout.
4. Completar os slides, projeções autorizadas, exemplos e destinos de CTAs. Não acoplar essa implementação aos cálculos do IVO ou aos módulos de empresa.
5. Refinar desktop/mobile, teclado, leitor de tela, redução de movimento e tempo de carregamento. Imagens com dimensões reservadas; lazy load de mídia secundária após acesso. Medir desempenho antes de declarar ganho.
6. Executar testes proporcionais de segurança e jornada, typecheck/lint direcionados e build/gate integrado do candidato quando justificados pela alteração de produto, respeitando preflight. Reutilizar as provas Q2 não invalidadas.
7. Demonstrar no navegador local autorizado, registrar evidência sanitizada e fechar documentação. Se a ferramenta bloquear, usar diagnóstico suportado, reportar erro exato e roteiro manual; não declarar prova visual concluída.

CTA final deve usar contato institucional ou fluxo já existente, conferido no projeto. Não inventar telefone, calendário, preço, prazo, desconto, clientes ou depoimentos. Um formulário novo só entra se necessário ao escopo e com contrato de dados definido; nesta onda, preferir destino institucional existente. Não enviar mensagens ou leads automaticamente.

Conversão pode ser observada depois por compreensão da oferta, início de conversa e qualidade das dúvidas. Não instalar analytics ou coletar perfis/saúde mental para medir o deck. Um plano futuro de medição deve ser agregado e minimizado, sujeito à decisão própria.

## 10. Critérios de aceite e provas

| Dimensão          | Aceite verificável                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Proposta de valor | Títulos contam uma história coerente mesmo sem os parágrafos; problema, mecanismo e próximo passo são reconhecíveis           |
| Precisão          | Cada número tem fonte/contexto; cada capacidade tem estágio/evidência; nenhuma promessa excede a prova                        |
| Framework         | Ciclo METE e arquitetura 4×4 compreensíveis, sem nota composta, mapeamento ou eficácia fabricados                             |
| Perfis            | Papel comercial, responsabilidade e acesso técnico não são confundidos; Q2 educativo administrativo identificado              |
| Segurança         | Acesso válido funciona; senha errada, ausente e sessão expirada são recusadas; API/SSR direto e assets protegidos não vazam   |
| Credencial        | Valor real ausente de cliente, snapshots, logs, repositório e relatórios; fixtures usam outro valor                           |
| Jornada           | Todos os slides alcançáveis, índice e histórico coerentes, micro-CTAs completos, CTA principal com destino real               |
| Acessibilidade    | Teclado completo, foco visível/restaurado, leitura sem conteúdo oculto indevido, contraste e redução de movimento verificados |
| Responsividade    | Conteúdo utilizável nas larguras especificadas, zoom e tela baixa, sem texto miniaturizado, clipping ou controles sobrepostos |
| Relato            | Sintético, ausência, proteção e pendência distintos de zero; relatório ESG demonstrativo claramente identificado              |
| Regressão         | Home, login institucional, Q1/Q2 e suas autorizações preservados; nenhuma alteração metodológica por efeito colateral         |

Testes focados devem exercitar comportamento: gate e expiração; acesso direto; limite de tentativas; proteção server/client e cache; navegação e retorno de foco; CTA; coerência dos estados de capacidade. Não criar testes frágeis que apenas espelham strings ou CSS. Revisão de conteúdo, compreensão e qualidade visual exigem inspeção própria; contagem de testes não substitui essas provas.

No navegador, demonstrar senha sintética válida/errada, recarga, saída, sessão expirada, link direto, índice, modal e CTA com mouse/teclado e viewport mobile. Não capturar senha, cookies ou URLs com tokens. Abrir um contato para conferir destino não autoriza enviar mensagem. O único teste com a credencial operacional deve ocorrer por configuração privada autorizada, sem sua exposição nos artefatos.

Revisão editorial pré-comercial: conferir nomes/marcas, atribuições, números, disponibilidade por perfil e lente, limites ESG e destino do contato. Registre divergências; uma bela interface não resolve uma afirmação sem evidência.

## 11. Entrega e limites de autonomia

Entregue rota e componentes integrados, conteúdo versionado, gate seguro, mapa de fontes/capacidades, testes pertinentes e evidências locais. Faça um fechamento documental único com arquivos alterados, diff funcional, comandos/resultados, captura real disponível, limites e uma próxima ação.

Relate separadamente: implementado; demonstrado localmente; CI confirmado; homologado/publicado. Nunca atribua os dois últimos a partir de build local. Não usar “pronto para comercialização”, “cientificamente validado”, “conforme LGPD/NR-1” ou “certificado” como conclusão automática.

Permissão de implementação local não inclui push, deploy, migration remota, e-mail externo, contas reais ou alteração de permissões. Novas necessidades humanas devem ser precisas: configuração privada indisponível, contradição de conteúdo, contato não verificado ou autorização específica do destino. Continue as partes independentes; não encerre apenas propondo o próximo arquivo a editar.

**Resultado esperado:** uma apresentação que a equipe consiga usar para explicar a proposta empresarial com clareza e consistência, mostrando a jornada e seus limites atuais, com experiência visual premium e acesso protegido verificável.

---

## Registro de preparação deste documento

Preparação somente documental. Foram conferidos Git, trechos da landing, marca/tokens, perfis de marketing, mapa local Q2, fronteiras de claims e referências primárias do benchmark. Não houve leitura de `.env`, `.q.out`, `.q.sql`, dados reais ou inventário indiscriminado de código. Não houve implementação da página, configuração da senha, banco, navegador, publicação ou repetição de testes/build. O documento orienta uma próxima implementação e não registra sua execução.
