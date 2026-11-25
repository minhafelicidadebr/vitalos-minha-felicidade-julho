# Ficha de revisão · proposta à ISG · V5 (design e narrativa)

**Data:** 24/11/2026 · **Branch:** `codex/proposta-isg-v4` (sobre `d914cdf`) · **Base aprovada:** `SUPERPROMPT_PROPOSTA_V5_DESIGN_E_NARRATIVA.md`.
**Estado:** implementado localmente, sem commit. Sem merge, push, publicação ou envio à ISG. Lovable e produção intocados.

## O que mudou (37 slides; "A pergunta" saiu, "O que a ISG comunica e faz" entrou no 2)
| Pedido | Implementação |
|---|---|
| 1 Retirar slide 2 | Slide "pergunta" e a seção da página removidos; a pergunta virou convite no novo slide 2 ("…cultura que já valoriza pessoas em prática medida…") |
| 2 Infográfico ISG | `IsgInfographic` (página e slide): quatro frentes, seis unidades, valores, "o que o Instituto soma", fonte e data (24/11/2026). Só o que o site declara; sem número de porte |
| 3 Grid | Pontos a 14 % com máscara que some no centro, só em slides claros (não capa, capítulos, escuro, impressão) |
| 4 Slide 5 | Bento: destaque "Pesquisa FIB de Brasília", dois marcos laterais, quatro projetos com imagem. Texto "parceria" removido da nota |
| 7/8 Dados | Pictograma (12 blocos = 12 bilhões de dias) e barras proporcionais do Gallup (quartis), rotuladas como ilustração de proporção |
| 12 Custo/dia | Padrão R$ 180: referência R$ 18.000, cenário de 90 dias R$ 16.200, variação −R$ 1.800 (era −R$ 3.000). Testes ajustados |
| 14 NR-1 | Alerta vetorial (escudo/balança/sinal âmbar) com "o que se espera" × "o que está em jogo", **sem valores de multa**, remetendo à NR-28 |
| 18 Dashboard | Mini-demonstração sintética sem login dentro da janela; botão secundário agora "Entrar com conta autorizada" |
| 20 Entrada de cartões | Animação escalonada (80 ms) em todos os grupos de cartões do modo apresentar; desligada com movimento reduzido; ausente em impressão e celular (pilha) |
| 30 Brasília | Silhueta vetorial estilizada (Congresso, Catedral, quadras) rotulada "Ilustração estilizada…"; logo da ISG **não** adicionado (sem autorização registrada) |

## Verificação (observada)
- `bun run gate`: **4.751 testes / 0 falhas**, paridade de schema OK, tsc limpo, secret-scan OK. ESLint sem erros de regra (2 avisos de Fast Refresh).
- 37 slides sem transbordo a 1440×900 (slide 8 ajustado); sem rolagem horizontal a 1440/360/320; sem erros de console.
- Contraste AA: 904 textos em claro, 904 em escuro, 63 na janela: 0 falhas.
- Impressão: anexo "Aprofundamentos" presente, 0 botões "Entenda", contadores com valor final; PDF gerado.
- **Não verificado:** leitor de tela, Safari/iOS, tela cheia real em projetor, captura de movimento da animação (só a regra CSS), janela de demonstração em celular.

## Sincronização página × slides
Conteúdo vem da fonte única (`isg-content.server.ts`). Novos blocos têm versão de página e de slide; teste de paridade atualizado (`isg-mapa`). Grid e animação existem só no modo apresentar, por decisão.

## Pendências para validação
1. Expansão oficial do selo GPTW (o site não expande a sigla) e autorização do logo da ISG.
2. Textos oficiais NR-1/NR-28: vigência e faixas de multa (alerta não as exibe).
3. Quais apps/projetos do slide 5 e ordem.
4. Foto licenciada de Brasília com crédito (opcional).
5. Decisão de publicar o app para o dashboard real (nada publicado).
6. Os itens pendentes da V4 continuam (NR-28, PNUD, números FIB-T, data 22 de março).

## Sobre as skills de design citadas
Nada foi instalado nem executado delas; não li os repositórios (a lista veio colada, contagens de estrelas não verificadas). Apliquei princípios compatíveis com as descrições: direção de arte própria em vez de template (grade sutil com máscara, um destaque por slide, silhueta vetorial própria), ciclo critique→refine com capturas, movimento contido e desligável, e revisão de acessibilidade/interação (contraste medido, foco, teclado, reduced-motion).
