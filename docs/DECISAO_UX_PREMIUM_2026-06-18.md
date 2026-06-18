# Decisão UX Premium — Landing e portão demo

Data: 18 de junho de 2026

## Problema

A landing já comunicava a tese do VitalOS™, mas faltavam três sinais de produto premium:
navegação institucional clara, hierarquia mobile mais estável e continuidade visual entre a
página pública e o acesso ao app.

## Lentes usadas

- UX e conversão: reduzir atrito entre descoberta, demonstração e entrada no produto.
- Acessibilidade: preservar foco, alvos de toque, leitura mobile e redução de movimento.
- Produto e marca: apresentar o portão demo como parte da experiência VitalOS™, não como um
  formulário técnico desconectado.

## Ramos avaliados

| Ramo                                            | Valor | Risco | Custo | Tese | Reuso | Decisão         |
| ----------------------------------------------- | ----: | ----: | ----: | ---: | ----: | --------------- |
| A. Ajustar apenas sombras e cores               |     4 |     9 |     9 |    5 |     5 | Insuficiente    |
| B. Navegação + hero responsivo + portão premium |     9 |     8 |     8 |    9 |     8 | Escolhido       |
| C. Redesenhar todas as seções da landing        |     8 |     5 |     3 |    8 |     6 | Adiado          |
| D. Manter o estado atual                        |     2 |    10 |    10 |    3 |     1 | Rejeitado       |
| E. Antecipar autenticação real                  |     7 |     3 |     2 |    8 |     8 | Fora desta fase |

## Escolha

Foi escolhida a fatia B por entregar ganho perceptível imediato sem alterar engines, dados ou
arquitetura. A implementação adiciona navegação por âncoras, cabeçalho responsivo, hero com CTAs
estáveis em telas pequenas, visibilidade de senha e um portão demo institucional com comunicação
explícita sobre dados fictícios, agregação e k-anonimato.
