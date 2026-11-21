# Nova apresentação empresarial VitalOS — candidato local

Base preservada: `b1227f8dcbf20f712eb2f75705be712bf62646a3`, branch `feat/ivo-fibt-platform-foundation`. O usuário autorizou a implementação do superprompt V3. **Implementação concluída como candidato local; validação visual integral pendente por bloqueio da ferramenta.** Nenhum parecer ou nota de comitê foi presumido.

## Resultado funcional

Nova apresentação na rota `/apresentacao/empresas`, com 15 cenas e percurso executivo de 7 cenas. Conteúdo canônico novo no servidor; eliminada a camada de substituições V2. Acesso e infraestrutura de sessão preservados. Os contratos de conteúdo foram ampliados para fichas específicas, fontes, percurso e métricas, sem nova API pública ou dependência.

O visitante encontra proposta de valor, dados, método, IVO, lentes, trimestre/ano, curadoria científica, experiência Heineken, exemplo Alfa, aprendizagem, aplicação/revisão, relatório e conversa sobre serviço. Jargão de desenvolvimento foi substituído por linguagem do comprador. Estágios das lentes, exemplos fictícios e referências externas continuam identificáveis.

Elementos funcionais novos:

- Percurso executivo/completo com estado na URL; mudança usa tema próximo quando necessário. Leitura contínua com as mesmas cenas. Aliases preservam links V1/V2 de capítulos.
- Fichas COPSOQ, FIB-T, PERMA+V e VIA-T abrem painéis específicos. Ciclo tem aprofundamentos por etapa.
- Trimestre, jornada fictícia e acompanhamento têm etapas selecionáveis. O quadro anual mostra as quatro lentes de foco.
- Exemplo didático permite tentar, ler feedback e reiniciar. Não persiste respostas nem substitui a atividade Q2 aprovada.
- Números resolvidos por superfície no servidor, com animação visual, valor final acessível e preferência de movimento reduzido.
- Fotografia real de colaboração sob licença compatível, identidade própria e composições distintas por assunto. Nomes de instituições aparecem com atribuição, sem logos externos apresentados como selos.
- Portais movidos para dentro da raiz da apresentação; `:fullscreen` tem altura e rolagem próprias. Eventos do navegador atualizam rótulo/estado; indisponibilidade mantém navegação normal com mensagem. A sessão revalidada remove painel e conteúdo juntos.

## Conteúdo e fontes

[Direção editorial e visual](APRESENTACAO_V3_DIRECAO_EDITORIAL_VISUAL.md) documenta tokens, roteiro, fotografia, skills consultadas e composição. [Registro de números](decisions/PRESENTATION_V3_USER_NUMBERS_2026-11-17.md) documenta a orientação do usuário, fontes diretas, escopo e seleção.

Integrados: US$ 1 trilhão/ano e 12 bilhões de dias/ano da OMS; probabilidade quatro vezes menor de sentir burnout e rotatividade 59% menor em recortes distintos publicados pela Gallup. Contexto e fontes acompanham os dados. Os oito claims anteriores e as sete entradas da projeção pública permanecem semanticamente idênticos; registry 1.1.0 tem duas autorizações adicionais, com `frozen` e fail-closed mantidos. Na projeção pública só a versão de origem mudou.

Os outros percentuais enviados, a série de adesão Heineken e a contagem de estudos Playbook ficam com estado e próximos critérios de revisão no registro. Não foram inventados dados de clientes, retorno, impacto ESG ou validação de adaptação. A home não foi alterada. Q1, Q3/Q4, índice composto e critérios de eficácia conservam as decisões existentes.

## Verificações executadas

| Evidência                  | Resultado e alcance                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testes direcionados        | **96 pass, 0 fail, 297 asserções**, 12 arquivos; UI, navegação, servidor e commercial-claims. Inclui eventos simulados de fullscreen e portais na raiz; não equivale a fullscreen nativo                                                                |
| Gate integrado             | **4.415 pass, 0 fail, 352 arquivos, 13.863 asserções**; paridade de schema, TypeScript e secret-scan aprovados                                                                                                                                          |
| Lint / formatação / diff   | ESLint dirigido aprovado; arquivos próprios formatados; `git diff --check` sem erro                                                                                                                                                                     |
| Build                      | Build inerte isolado e secret-scan de artefatos aprovados; `.output` original preservada                                                                                                                                                                |
| Fontes compiladas/servidas | Onze arquivos conferidos por SHA-256 contra cópia compilada e servidor local; [artefato](artifacts/PRESENTATION_V3_BUILD_2026-11-17.json)                                                                                                               |
| HTTP real local            | Onze checks aprovados: acesso, cookie, origem, shell, 15 cenas autenticadas, logout/replay e limite concorrente; [artefato](artifacts/PRESENTATION_V3_HTTP_2026-11-17.json)                                                                             |
| Cores declaradas           | Seis pares conferidos estaticamente, razão mínima 5,30:1; [artefato](artifacts/PRESENTATION_V3_CONTRAST_2026-11-17.json). Não cobre fotografia, todos os estados ou auditoria assistiva                                                                 |
| Navegador                  | Entrada por senha e abertura da nova narrativa observadas no Chrome; composição desktop observada. Tela cheia retornou indisponibilidade, e a tentativa de inspeção nativa foi bloqueada pela ferramenta. Não há prova V3 completa de mobile/fullscreen |

Falhas proporcionais corrigidas durante o desenvolvimento: referências antigas dos testes de conteúdo; binding do índice após introdução dos percursos; versão de origem da projeção pública; fixture de lente e tipagem de uma asserção de identidade do acionador. Testes de estados de fullscreen, portais, revalidação de sessão e aliases acrescentados. Nenhum desses ajustes invalida as provas antigas de banco; não foram repetidas.

Medição no mesmo ambiente, builds isolados, tamanhos brutos sem compressão:

| Item                |                      V2 |                      V3 |
| ------------------- | ----------------------: | ----------------------: |
| Payload do deck     | 35.360 bytes / 18 cenas | 34.727 bytes / 15 cenas |
| JS da rota          |            19.471 bytes |            27.970 bytes |
| CSS da apresentação |            23.294 bytes |            28.299 bytes |
| Nova fotografia     |                       — |           177.437 bytes |

O aumento de JS/CSS corresponde às novas interações e composições. A fotografia é local, prioritária na abertura e tardia no fechamento. Não houve medição nova de Core Web Vitals, carregamento em rede móvel ou dispositivos físicos; tamanhos de arquivo não comprovam desempenho percebido.

## Bloqueio de navegador e estado exato da tela cheia

A inspeção anterior identificou `requestFullscreen` no contêiner com Portal fora dele. No ambiente de automação desta etapa, a chamada de fullscreen retornou indisponibilidade. Ao solicitar o alvo nativo do Chrome pelo procedimento suportado, a ferramenta encerrou o controle porque não conseguiu determinar a URL atual no Windows com confiança suficiente para aplicar a política: **“could not determine the current browser URL on Windows with enough confidence to enforce policy”**.

O controle foi encerrado; não houve nova tentativa por outro mecanismo, mudança de permissões, desativação de validação ou reinício do stack para contornar a proteção. Os trabalhos independentes de código, testes, HTTP e documentação foram concluídos. A falha relatada pelo usuário não foi reproduzida integralmente em fullscreen nativo nesta sessão. A correção estrutural passou em testes de componente; falta demonstrá-la no navegador real.

Roteiro manual curto:

1. Abrir [a apresentação local](http://localhost:8093/apresentacao/empresas) e entrar com a senha existente.
2. Alternar Completo/Executivo: conferir 15/7 cenas, índice, recarga e capítulo preservado; abrir uma ficha das lentes e fechar por botão/teclado.
3. Entrar em tela cheia pelo controle. Se o navegador indicar indisponibilidade, registrar navegador/mensagem e manter as proteções; não considerar o teste aprovado.
4. Em tela cheia, abrir uma cena longa, alcançar seu fim, abrir o índice e um painel; rolar o painel até o fim, fechar, navegar, sair e entrar novamente. Conferir retorno de foco e ausência de máscara residual.
5. No celular ou em modo responsivo, conferir 320/360/390/768/1024/1440 px, paisagem/altura baixa, zoom, áreas de toque, trimestre, atividade e movimento reduzido. Guardar capturas sem senha ou dados pessoais.

## Arquivos e maturidade

Código concentrado em `src/features/presentation/`, `src/lib/presentation/` e nas autorizações de `src/domain/commercial-claims/`; uma fotografia nova em `src/assets/presentation/`; script de prova HTTP atualizado. Os arquivos exatos e o diff ficam no commit desta etapa. Autenticação empresarial, banco, migrations, currículos Q2 e metodologia não foram alterados.

Implementado e verificado por testes/build/HTTP local. Navegador parcial. **CI novo, staging e produção não consultados/publicados.** Sem declaração de prontidão comercial, eficácia ou homologação remota. Sessão e limite por processo continuam exigindo revisão de runtime antes de publicação distribuída. `.q.out` e `.q.sql` intocados e não lidos.

**Próxima ação única: concluir a prova visual de tela cheia, painéis e mobile em uma sessão autorizada do navegador, usando este candidato e reutilizando os checks já válidos.**
