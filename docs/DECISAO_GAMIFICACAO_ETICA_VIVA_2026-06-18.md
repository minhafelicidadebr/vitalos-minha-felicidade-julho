# Decisão: gamificação ética viva com livro-razão de participação

Data: 18 de junho de 2026

## Problema

O `live-economy` já derivava missões da Onda, das prioridades e da Academia, mas a experiência do
Colaborador ainda exibia 340 XP, três missões e quatro badges estáticos. Concluir a Onda, um módulo
ou um check-in não alterava a economia. A interface declarava causalidade operacional que o estado
do produto não comprovava.

## Lentes usadas

- Ética e psicologia motivacional: pontos só podem celebrar participação e contribuição; nunca
  score, felicidade, saúde mental, desempenho ou obediência.
- Privacidade: o registro não pode carregar resposta, humor, texto de reconhecimento ou conteúdo
  de instrumento.
- Arquitetura: concessão de XP deve ser um motor puro, com regras injetadas pelo pack; a interface
  nunca escolhe quantos pontos conceder.
- Produto: missões precisam fechar o laço Mensurar → Educar → Transformar e permanecer explicáveis.
- Segurança e anti-gaming: repetição, teto por ação e teto diário precisam ser invariantes de
  código, sem apagar uma conclusão legítima quando a recompensa for limitada.

## Tree of Thoughts

Escala 0–10. Em `Risco` e `Custo`, 10 significa menor risco e menor custo total de manutenção.
Score ponderado: valor 30% · risco 25% · tese 20% · reuso 15% · custo 10%.

| Ramo                                                    | Valor | Risco | Custo | Tese | Reuso | Score | Decisão   |
| ------------------------------------------------------- | ----: | ----: | ----: | ---: | ----: | ----: | --------- |
| A. Atualizar apenas os números estáticos                |     3 |     3 |     9 |    3 |     2 |  3,70 | Rejeitado |
| B. Estado local direto em cada componente               |     7 |     5 |     7 |    6 |     3 |  5,70 | Rejeitado |
| C. Seed demonstrativo mais convincente                  |     5 |     6 |     8 |    5 |     4 |  5,60 | Rejeitado |
| D. Esperar persistência e autenticação reais da Fase 2  |     3 |     9 |     9 |    6 |     7 |  6,30 | Adiado    |
| E. Integrar uma plataforma externa de gamificação       |     5 |     4 |     3 |    4 |     6 |  4,50 | Rejeitado |
| F. Ledger puro + regras no pack + store mock persistido |    10 |     9 |     7 |   10 |    10 |  9,45 | Escolhido |

## Escolha

Foi criado um livro-razão genérico que recebe:

- um pedido de registro com tipo, origem e data;
- políticas de premiação vindas do Domain Pack;
- regras anti-gaming já existentes.

O cliente não envia o valor de XP. O motor resolve a recompensa pela política, rejeita duplicidade,
aplica limite diário por tipo e depois o teto diário global. Quando um limite reduz o XP a zero, a
evidência continua registrada: proteger a economia não pode apagar aprendizagem ou participação.

Os eventos permitidos são:

- resposta concluída na Onda;
- Pulse concluído;
- check-in realizado;
- módulo e trilha concluídos;
- Kudo enviado;
- microação de nudge realizada;
- contribuição leve para uma missão de transformação.

A contribuição leve é explicitamente rotulada como registro de participação, não prova de impacto.
Prova causal continua pertencendo ao Culture Lab.

## Experiência entregue

- `/missoes`: central premium de missões, XP, badges e livro-razão.
- Colaborador: XP e conquistas agora derivam do ledger; mocks estáticos foram removidos.
- Onda e Pulse: concedem XP apenas pela participação, nunca pelo conteúdo.
- Academia: módulos e trilhas persistem por evidência real de conclusão.
- Check-in: registra que a ação ocorreu, sem guardar o humor selecionado.
- Kudos: registra o ato de reconhecer, sem guardar destinatário ou mensagem no ledger.
- Nudges: microações podem ser registradas uma vez por origem/data.
- Embaixador: usa o mesmo estado vivo e mostra missões concluídas ou em andamento.
- Navegação: `Missões` agora abre uma rota implementada.

## Invariantes

- XP nunca é informado pela UI.
- Eventos sem política falham fechados e não entram no ledger.
- Duplicidade por id ou origem é idempotente.
- Limite por tipo e teto diário são aplicados no engine.
- Nenhum evento contém resposta, score, humor, destinatário ou texto livre.
- Não participar não reduz XP nem gera punição.
- Badges são marcos privados de progresso, nunca ranking.
- XP, missões e badges não alimentam desempenho, promoção ou remuneração.
- Conclusão de uma ação permanece registrada mesmo quando o XP é limitado.
- Estado mock é persistido localmente; não representa autorização ou prova jurídica.

## Critérios de aceite

- Engine puro, sem React, domínio ou I/O.
- Regras de eventos e badges injetadas pelo pack.
- Testes cobrem duplicidade, ação sem regra, limite por tipo e teto global.
- Onda, Pulse, Academia, check-in, Kudos e nudges escrevem no mesmo ledger.
- Estado vazio e estado vivo contam histórias completas.
- Mobile do Colaborador e desktop de Missões sem overflow ou perda de hierarquia.
- Auditoria do `localStorage` confirma ausência de humor, resposta e score.
- Testes, typecheck, build e lint dos arquivos tocados verdes.

## Risco residual e Fase 2

O ledger atual é mock-first e vive no navegador. Na Fase 2, o servidor deve:

- autenticar pessoa, organização e tenant;
- validar a origem do evento;
- aplicar idempotência e limites de forma transacional;
- assinar evidências relevantes;
- manter respostas e conteúdo sensível fora do ledger;
- entregar ao cliente apenas o extrato autorizado.
