# Decisão AppShell Premium

Data: 18 de junho de 2026

## Problema

O AppShell funcionava em telas pequenas, mas dependia integralmente do menu lateral. Perfil e setor
viravam controles sem texto, e o usuário não mantinha uma orientação persistente sobre as etapas do
produto.

## Lentes usadas

- UX: reduzir o custo de navegação entre as etapas mais frequentes.
- Acessibilidade: manter alvos de toque, `aria-current`, foco e rotas permitidas pelo papel.
- Arquitetura: derivar atalhos da navegação já filtrada por pack e RBAC, sem duplicar permissões.

## Ramos avaliados

| Ramo                                                 | Valor | Risco | Custo | Tese | Reuso | Decisão      |
| ---------------------------------------------------- | ----: | ----: | ----: | ---: | ----: | ------------ |
| A. Apenas ampliar o botão de menu                    |     4 |     9 |     9 |    4 |     5 | Insuficiente |
| B. Dock fixo com rotas hardcoded                     |     7 |     4 |     8 |    5 |     3 | Rejeitado    |
| C. Dock derivado do pack e papel + drawer contextual |     9 |     8 |     7 |    9 |     9 | Escolhido    |
| D. Sidebar permanente no mobile                      |     5 |     5 |     4 |    5 |     6 | Rejeitado    |
| E. Refazer toda a navegação desktop                  |     7 |     5 |     3 |    7 |     7 | Adiado       |

## Escolha

Foi implementado um dock mobile derivado dos grupos realmente disponíveis para o papel ativo. O
estado selecionado considera todas as rotas do grupo, e o menu completo passou a apresentar marca,
perfil e setor antes da árvore de navegação. A identidade do cabeçalho também foi alinhada à landing.
