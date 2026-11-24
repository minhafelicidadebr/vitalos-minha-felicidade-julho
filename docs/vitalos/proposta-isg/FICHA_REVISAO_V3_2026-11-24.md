# Ficha de revisão · proposta à ISG · V3 "Pedagogia, Matriz IFT e slides completos"

**Data:** 24/11/2026 · **Branch:** `feat/proposta-v3` (sobre a `main` `4b2b7c9`) · **Base:** `SUPERPROMPT_PROPOSTA_V3_PEDAGOGIA_E_SLIDES.md` (revisões 1 a 3) e as decisões registradas em `docs/vitalos/decisions/PROPOSTA_V3_FOUNDER_DECISIONS_2026-11-23.md` e `PROPOSTA_V3_VALOR_REFERENCIA_2026-11-23.md`.
**Estado:** implementado e verificado localmente. **Nada publicado, nenhum push, nenhuma mudança no Lovable.**

## 1. O que mudou

| Decisão | Implementação |
|---|---|
| D9 Capa | Logo VitalOS em tamanho de herói; título "Sistema Operacional da Vitalidade Organizacional"; frase de valor (riscos psicossociais → florescimento; ciência da felicidade); três destaques: **NR-1 (apoio educativo, não substitui o PGR)**, ciência da felicidade, Matriz IFT |
| D1/D2 Matriz IFT | Pré-treino dos quatro movimentos (ícones fixos) + matriz Q × movimento com a lente, a pergunta-guia e o **status honesto** de cada célula; Q1 marcado como risco psicossocial educativo (domínio B, visualmente separado); faixa de corresponsabilidade por Q (Instituto conduz · ISG decide · ISG executa · juntos revisam), rotulada como exemplo |
| D3 Janelas "Entenda" | Radix Dialog com foco preso, Esc, foco devolvido, título e descrição ligados; na página, nos cards de entrega e do cronograma; nos slides, por cima do slide (também em tela cheia); **no PDF, todas as janelas saem no anexo "Aprofundamentos"** |
| D4 Exemplo trabalhado | Problema concreto, diagrama da troca de turno (chamados que perdem contexto), quatro passos com "fica registrado", antes × depois (execução, não efeito); a janela traz quem faz, o que fica registrado e o que a equipe vê |
| D5 Preço fora do cronograma | Cronograma, jornada e entregas mostram "Marco de aceite"; o valor só aparece no investimento |
| D6 Slides completos | 25 slides em 6 capítulos (Abertura, Por que nós, Como funciona, Jornada, Investimento, Próximos passos), um slide por Q, capítulos com ilustração, sumário "Capítulos" (tecla G), indicador de capítulo e teste de paridade com a página |
| D11 Marca e cor | Logo do Instituto **sem cápsula branca**: versão de texto escuro no claro e versão de texto claro (o PNG transparente de alta resolução do projeto) no escuro e nos slides escuros, otimizadas para 25–29 KB; filete com o degradê dos raios do logo nos cards de destaque; cores fixas por movimento e por Q |
| D12 Imagens de transição | Três slides de capítulo com as ilustrações geradas já registradas (rotuladas), com leve zoom de entrada; desligado com movimento reduzido. **Imagens novas não geradas** (sem gerador nesta sessão) |
| D13/D16–D18 Preço | Valor de referência R$ 24.000 por etapa a partir de parâmetros tipados (90 h por etapa por papel, valor-hora, licença R$ 2.000/mês, indiretos) → ponte de valor: −R$ 1.600 colaboração técnica da ISG, −R$ 10.400 investimento do Instituto → **R$ 12.000** condição de implantação inicial; janela "Entenda a conta" com composição, horas por Q, parâmetros e o que a licença inclui e não inclui |
| D8 Copenhague | Claim registrado com fonte primária conferida (Kristensen et al., 2005), sempre ao lado de "coleta condicionada" e da ressalva educativa |
| D10 Matriz IFT no app | Textos visíveis do app trocados (landing, concierge e tags, copiloto, temporada, metodologia, programa, NR-1, ondas, relatório global, PDF do PGR); identificadores e comentários mantidos como nome técnico legado; `CLAUDE.md` atualizado; teste-guarda |

## 2. Verificação

| Verificação | Resultado |
|---|---|
| Gate | 4.741 testes / 0 falhas (seção 4) |
| Testes novos | conta fecha (composição = referência; ponte = condição; contrapartida = 40 h × R$ 200; 90 h por etapa); "colaboração técnica" e ausência de "permuta"/"parceria" afirmativa; Matriz IFT com status em todas as células, Q1 domínio B e Copenhague condicionado; NR-1 com ressalva; cronograma sem "R$"; exemplo trabalhado completo; janela abre, Esc fecha e devolve o foco; slides com 25 itens, capítulos e Esc dentro da janela; paridade página ↔ slides; guarda da Matriz IFT (com teste de que o padrão de busca não está cego) |
| Rolagem horizontal | 320, 360 e 1440 px: nenhuma |
| Slides | 25 slides a 1440×900 sem transbordar; janela do Q1 abre dentro do palco com foco preso |
| Contraste AA | página: 759 textos em claro e 759 em escuro, 0 falhas; janela aberta: 63 textos, 0 falhas |
| Impressão | anexo "Aprofundamentos" com 7 artigos (exemplo, Q1–Q5, conta); botões "Entenda" ocultos; contadores no valor final; PDF A4 gerado |
| Console | sem erros |

**Bugs encontrados e corrigidos durante a verificação:** (1) no Chrome real, Esc dentro da janela fechava a janela **e** saía da apresentação (o teste simulado não pegava; a escuta de teclado passou para a fase de captura); (2) o teste-guarda da Matriz IFT tinha `\b` virando caractere de controle e não procurava "METE" sem pontos; (3) logo VitalOS centralizado sobre um rosto na capa dos slides; (4) "R$" quebrando linha nas tabelas da janela no celular.

**Não verificado:** leitor de tela real, Safari/iOS, ambiente publicado.

## 3. Pendências do fundador

1. Conferir na prévia se cada retrato está com o nome certo (correspondência inferida).
2. Decidir o caminho das logos de terceiros (super prompt V3, D7). Hoje: fora.
3. Quem gera e aprova as 4 ilustrações novas (troca de turno, oficina, reflexão, síntese).
4. Valor-hora técnico da ISG (modelo: R$ 200) e se a licença de R$ 2.000/mês também é referência.

## 4. Gate

- `bun run gate`: **4.741 testes / 0 falhas**, paridade de schema OK, `tsc` limpo, secret-scan OK. ESLint: 0 erros (1 aviso de Fast Refresh em `ProposalSlides.tsx`, pela exportação auxiliar `slideIds` usada no teste de paridade).
- Commercial Claims Registry **1.3.0** (13 claims).
- Capturas e PDF em `capturas/v3/`.
