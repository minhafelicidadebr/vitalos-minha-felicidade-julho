# VitalOS para empresas — direção da nova apresentação

Implementação nova a partir do superprompt aprovado na sessão. A rota e o acesso são reaproveitados; o modelo editorial anterior e a montagem por substituições V2 foram removidos do runtime. O histórico continua no Git.

## Conceito e composição

“Pessoas que florescem. Organizações que evoluem.” A fotografia apresenta colaboração humana, enquanto as cenas seguintes dão forma à leitura, ao conhecimento e à prática. Evitar texto jurídico ou identificadores técnicos no percurso comercial; informação material sobre fonte, exemplo e disponibilidade continua acessível.

| Token          | Valor / função                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Tinta          | `#173E34` · texto principal                                                                                               |
| Verde profundo | `#103B30` · abertura, fechamento, ações e livro do relatório                                                              |
| Verde de ação  | `#206448` · ícones e links                                                                                                |
| Dourado        | `#EDC96A` · CTA final                                                                                                     |
| Menta          | `#E6F1E6` · apoio instrucional                                                                                            |
| Fundo          | `#EEF2EE` · plano geral; branco nas cenas e painéis                                                                       |
| Tipografia     | Família sans existente para leitura e títulos; serif existente para citações visuais e capa editorial                     |
| Escala         | Títulos fluidos; texto de apresentação 16–19 px; detalhes 15–17 px; legenda menor para fontes                             |
| Ritmo          | Separar ideias por espaçamentos maiores; composições diferentes por assunto; unidades e qualificadores próximos aos dados |

Os estilos estão isolados em `src/features/presentation/presentation.css`; não houve alteração global de tema. Botões e controles têm alvo de projeto de pelo menos 44 px. O ramo de movimento reduzido elimina animações/transições; os números têm valor final acessível independentemente da animação visual.

## Mapa editorial implementado

| Cena canônica | Composição                                                        | Executivo |
| ------------- | ----------------------------------------------------------------- | --------- |
| vitalidade    | Capa fotográfica, proposta central e marcas próprias              | Sim       |
| contexto      | Dados OMS em destaque + condições de trabalho                     | Sim       |
| valor         | Comparações Gallup + entregas gerenciais                          | Sim       |
| ciclo         | Diagrama de quatro etapas com aprofundamentos                     | Sim       |
| perspectivas  | EU/NÓS/LIDERANÇA/ORGANIZAÇÃO em situação de trabalho              | Não       |
| lentes        | Quatro fichas coloridas com painel próprio por ferramenta         | Sim       |
| trimestre     | Etapas selecionáveis e quadro anual Q1–Q4                         | Sim       |
| ciencia       | Playbook, colaboração acadêmica atribuída e curadoria             | Não       |
| caso          | Experiência Heineken com práticas e fontes                        | Não       |
| jornada       | Caminho ilustrativo Alfa, com decisões por etapa                  | Não       |
| aprendizagem  | Exemplo didático com tentativa, feedback e reinício               | Não       |
| transformacao | Acompanhamento de acordo, condições, aplicação e revisão          | Não       |
| relatorio     | Livro editorial e registros do ciclo; fontes ODS                  | Não       |
| servico       | Direção, gestão de pessoas, lideranças/equipes e escopo assistido | Não       |
| conversa      | Fechamento fotográfico e CTA institucional                        | Sim       |

Os percursos têm 15 e 7 cenas. `percurso=executivo` e `modo=leitura` são refletidos na URL. Trocar de percurso usa o tema mais próximo e informa o ajuste. Links antigos de capítulos têm aliases explícitos para cenas atuais; uma URL executiva apontando para uma cena fora do percurso abre a versão completa dessa cena.

## Imagem e instituições

Fotografia: **Cherrydeck**, [Four people collaborating around a laptop](https://unsplash.com/photos/people-collaborating-in-modern-office-workspace-UpsEF48wAgk), publicada em 20/10/2020, obtida em resolução de 1440 px sob a [licença Unsplash](https://unsplash.com/license). Arquivo local `src/assets/presentation/team-cherrydeck.jpg`, 177.437 bytes, servido pela própria aplicação; não há hotlink ou requisição do visitante ao provedor da fotografia. O crédito consta da legenda. A imagem é ilustrativa, sem alegação de cliente, testemunho ou equipe real da VitalOS.

VitalOS e Instituto usam os assets existentes. Oxford, ONU, VIA, Gallup e demais fontes aparecem por nome e atribuição contextual; nenhum logo externo foi inserido como selo ou parceria. A biblioteca Playbook é referência de expansão da curadoria, sem anúncio de ingestão integral ou RAG operacional.

## Referências de design adotadas

- [Frontend Design, Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design): orientação consultada em 17/11/2026 para identidade específica, composição e conteúdo significativo.
- [Impeccable](https://github.com/pbakaus/impeccable): referência de crítica, tipografia, layout e acabamento; nenhum instalador, hook ou modo de edição automática foi executado.
- [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines): teclado, toque, foco, movimento reduzido e estados da URL.
- Skills locais de implementação cirúrgica, UX/acessibilidade e verificação proporcional.

Não houve instalação de dependências ou alterações globais de skills. O fato de seguir essas referências não constitui certificação de UX ou acessibilidade. A validação visual integral permanece com o estado registrado no fechamento V3.
