# Superprompt · Design informacional do Guia da Jornada · v1 · 20/11/2026

**Escopo:** `/guia-empresarial` e `/ivo-integral/guia` (componentes em `src/features/guide/`, conteúdo em `src/domain/guide/enterprise-guide.ts`).

**Regras que não mudam:**
- o conteúdo, as permissões e os critérios de aceite da V2.1;
- o servidor continua decidindo o acesso;
- a perspectiva escolhida muda só a explicação;
- o caso continua fictício e rotulado.

## 1. Missão

Transformar o guia, hoje uma sequência de parágrafos e listas, numa **interface de orientação**. Em poucos segundos, o leitor localiza onde está (lente, fase do ciclo, perspectiva), quem faz o quê, para quem vai a entrega e que evidência fica. A meta é reduzir o esforço de leitura sem perder fidelidade. Organização visual não pode virar promessa: nenhum ícone, cor ou número pode sugerir resultado, escore ou conformidade.

## 2. Princípios de gestão do conhecimento aplicados à tela

| Princípio | Aplicação no guia |
|---|---|
| Orientação antes do conteúdo | Uma faixa "Onde você está" com os três mapas aparece logo abaixo do título da etapa, não escondida no fim. |
| Um conceito, uma forma | Lente = trilha de 5 marcos; ciclo = 4 passos em sequência; perspectiva = 4 olhares lado a lado. Cada mapa tem forma própria e ícone próprio, e as três formas nunca se repetem. |
| Divulgação progressiva | Definições e limites ficam em expansão em linha; o caso inteiro fica no diálogo; o essencial fica sempre visível. |
| Responsabilidade explícita | Cada passo do caso mostra quem atua (selo de papel) e em que fase do ciclo está. |
| Distinção de evidência | Execução, decisão, mudança e efeito aparecem como quatro cartões com ícone, cor de apoio e texto. Nunca só cor. |
| Linguagem cotidiana | Rótulos curtos em forma de pergunta ("Quem recebe?", "O que fica protegido?"). |

## 3. Auditoria · onde melhorar

| # | Ponto atual | Dificuldade do leitor | Correção |
|---|---|---|---|
| 1 | "Três mapas" é uma lista recolhida no fim da página | A informação que orienta a leitura aparece por último e em forma de texto corrido | Faixa "Onde você está" com três cartões visuais no topo da etapa: trilha Q1–Q5 com a etapa marcada; ciclo de 4 passos com a fase do caso marcada; perspectivas EU, NÓS, LIDERANÇA e ORGANIZAÇÃO, destacando as que aparecem na cena. A explicação de cada mapa fica num "Como ler" expansível. O IVO entra como termo definido. |
| 2 | O caso é uma lista numerada só de texto | Não se vê quem faz cada passo nem a passagem de bastão | Linha do tempo vertical: marcador numerado, selo de quem atua e de que fase é, e o texto do passo. |
| 3 | Os três campos da perspectiva (tarefa, quem recebe, condição) são uma lista de definições simples | A tarefa compete com o resto do texto e não se destaca | Três cartões com ícone: "Sua tarefa" ou "Quem atua", "Quem recebe" ou "O que você consulta", "Condição". |
| 4 | O extrato do Q5 é uma tabela | No celular a tabela fica apertada, e os quatro tipos parecem iguais | Quatro cartões com ícone e borda diferentes (Execução, Decisão, Mudança, Efeito), o trecho e a origem. A tabela continua disponível para leitor de tela. |
| 5 | As passagens de responsabilidade são caixas soltas | A sequência não fica evidente | Setas entre os nós no desktop e conector vertical no celular; o nó do perfil ativo marcado com borda e "você". |
| 6 | A abertura traz blocos sem ícone | Os três blocos têm o mesmo peso visual | Ícone por bloco (receber, mobilizar, consultar) e lista de consulta com selos de estado alinhados. |
| 7 | Os limites ("O que fica protegido?") aparecem em lista simples | Pouca percepção de proteção | Ícone de escudo e itens com marcador próprio. |

## 4. Restrições

- **Ícones:** decorativos (`aria-hidden`); o texto carrega o sentido.
- **Cor:** sempre acompanhada de forma, texto ou borda; contraste AA nos dois temas, usando os tokens existentes (`primary`, `muted`, `border`, `card`, `accent`).
- **Movimento:** só para localizar (marcador da etapa ou da fase); com movimento reduzido, nada se move.
- **Celular (320 a 390 px):** os mapas empilham; a trilha Q1–Q5 continua numa linha; sem rolagem horizontal; alvos de toque com pelo menos 44 px.
- **Sem dado novo:** nenhum número, percentual ou escore novo. O destaque das perspectivas do IVO vem do **texto da cena** (conteúdo editorial), nunca de um mapeamento papel → IVO.

## 5. Critérios de aceite

| ID | Prova | Aceite |
|---|---|---|
| D-01 | Navegador, desktop e 320 px | A faixa "Onde você está" aparece antes do caso, com os três mapas e a etapa e a fase marcadas por texto e forma. |
| D-02 | Teste de conteúdo | Cada lente declara a fase ativa do caso; só o Q2 declara as perspectivas do IVO da cena, cada uma com texto. |
| D-03 | Navegador | Cada passo do caso mostra quem atua; no Q2, a linha do tempo tem 6 passos. |
| D-04 | Navegador | O Q5 mostra quatro cartões distintos, e a tabela continua acessível a leitor de tela. |
| D-05 | Navegador, 320, 390, 768 e 1024 px | Sem rolagem horizontal; foco visível; trocar a etapa ou a perspectiva mantém a orientação. |
| D-06 | Gate | Testes, TypeScript e build verdes; nenhuma regressão de AC-01 a AC-13. |

## 6. Como medir "até 120 %"

"Até 120 %" é ambição de projeto. A comparação usa as mesmas tarefas da V2.1 §15, mais uma tarefa de orientação: "Em que fase do ciclo e de que perspectiva esta tela está falando?". Compare acerto sem ajuda e tempo até a resposta entre a versão anterior (`2881236`) e esta. Com participantes representativos, relate contagens. Sem eles, a melhoria fica registrada como hipótese de design.
