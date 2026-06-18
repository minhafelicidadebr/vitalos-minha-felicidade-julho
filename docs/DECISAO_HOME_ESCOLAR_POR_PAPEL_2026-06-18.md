# Decisão: home escolar honesta e orientada por papel

Data: 18 de junho de 2026

## Problema

Todos os papéis do pack Escola aterravam em `/escola`, mas a rota sempre renderizava o painel da
Direção. Estudante, Família e Educador recebiam IEV, quatro lentes, tendência e foco de gestão,
apesar de o próprio pack esconder essas rotas na navegação.

O problema não era apenas de personalização: a interface contradizia os invariantes
`educator_sees_own_class_aggregate_only_if_n>=5` e
`wellbeing_and_iev_never_feed_student_grading_or_teacher_evaluation`.

## Lentes usadas

- Privacidade e RBAC: menor privilégio deve valer também na demonstração; permissão ambígua falha
  para um perfil seguro.
- Experiência educacional: estudante, família e educador precisam de jornadas distintas, sem
  linguagem de gestão ou infantilização.
- Arquitetura SaaS: resolução de audiência é uma capacidade universal; copy, papéis e ações são
  configuração do setor.
- Produto e estratégia: confiança por desenho prova a tese VitalOS melhor do que multiplicar
  dashboards ornamentais.
- UX e acessibilidade: a home deve contar a história em celular, desktop e navegação por toque.

## Ramos avaliados

Escala 0–10. Em `Risco` e `Custo`, 10 significa menor risco e menor custo total de manutenção.
Score ponderado: valor 30% · risco 25% · tese 20% · reuso 15% · custo 10%.

| Ramo                                                      | Valor | Risco | Custo | Tese | Reuso | Score | Decisão   |
| --------------------------------------------------------- | ----: | ----: | ----: | ---: | ----: | ----: | --------- |
| A. Manter um dashboard agregado para todos                |     2 |     1 |    10 |    2 |     3 |  2,50 | Rejeitado |
| B. Criar uma rota para cada papel escolar                 |     8 |     8 |     4 |    8 |     4 |  7,00 | Rejeitado |
| C. Espalhar condicionais de papel dentro de `/escola`     |     8 |     7 |     8 |    8 |     5 |  7,30 | Rejeitado |
| D. Esperar autenticação e RBAC reais da Fase 2            |     3 |     9 |     9 |    6 |     7 |  6,30 | Adiado    |
| E. Integrar uma biblioteca de dashboards por permissão    |     4 |     6 |     3 |    4 |     5 |  4,55 | Rejeitado |
| F. Engine de audiência + configuração escolar + rota viva |    10 |    10 |     7 |   10 |    10 |  9,70 | Escolhido |

## Escolha

Foi criado um `audience-engine` puro que resolve uma política por papel, audita cobertura e falha
de forma conservadora quando o papel está ausente ou duplicado. O engine não conhece Escola,
nomes de papéis, rotas ou copy.

O mock escolar injeta quatro experiências:

- gestão: mantém IEV, lentes, tendência, participação e foco agregado;
- educador: participa da onda e acessa aprendizagem, sem receber o painel da Direção;
- estudante: voz, pertencimento, aprendizagem e garantias contra nota, ranking ou punição;
- família: participação, corresponsabilidade e proteção de estudantes por padrão.

O pack Escola declara `overviewRoute: "/escola"`, permitindo que a home adaptativa seja usada por
todos os seus papéis sem hardcode de papel no AppShell. A Onda também consulta a política: Educador
recebe a visão de participante enquanto não existir agregado autorizado da própria turma.

## Guardrails

- Papel desconhecido ou ambíguo recebe o perfil de menor privilégio.
- Estudante, Família e Educador não recebem capacidades de índice, lentes, tendência ou onda
  agregada.
- Respostas individuais continuam ausentes do cliente; a home lê apenas o status local da onda.
- O livro-razão agregado permanece exclusivo da gestão escolar configurada.
- Vocabulário IVO/IEV é lido do pack, inclusive dentro da Onda.
- IEV nunca alimenta nota, ranking, punição ou avaliação de educadores.
- A experiência usa apenas tokens do design system, suporta dark mode e alvos de toque adequados.

## Critérios de aceite

- Engine sem import de `domain/`, mocks, React ou I/O.
- Toda persona escolar de demonstração coberta exatamente uma vez.
- Ausência ou duplicidade de papel falha para o perfil seguro.
- Estudante e Família não veem IEV, lentes, tendência ou foco da Direção.
- Educador vê a Onda como participante e não recebe recortes agregados.
- Direção mantém o dashboard coletivo completo.
- Estados carregando, erro, vazio e mobile presentes.
- Testes, typecheck e build verdes; arquivos tocados passam no lint.
- Auditoria visual em Estudante mobile, Educador/Onda e Direção desktop.

## Risco residual

Esta política governa a experiência mock e a exposição de interface; não substitui autorização no
servidor. Na Fase 2, as mesmas capacidades devem ser aplicadas por autenticação, RBAC e RLS reais,
com agregação e k-anonimato no backend.
