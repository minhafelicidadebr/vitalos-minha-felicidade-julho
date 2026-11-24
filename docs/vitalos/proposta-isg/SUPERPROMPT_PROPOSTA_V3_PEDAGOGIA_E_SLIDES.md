# SUPER PROMPT · Proposta à ISG · V3 "Pedagogia, Framework e Slides Completos"

**Para:** Claude Opus 5.5 (Claude Code) · **Repositório:** `minhafelicidadebr/vitalos-minha-felicidade-julho` · **Base:** `main` `4b2b7c9` (V2 mesclada pelo PR #71)
**Status:** `AGUARDANDO APROVAÇÃO DO SUPERCOMITÊ`. Nenhuma implementação antes do portão da seção 7.
**Herda tudo de:** `SUPERPROMPT_PROPOSTA_V2_MASTER_PLUS.md` (regras, vetos, rubrica, anexos de marca e fatos) e `FICHA_REVISAO_V2_2026-11-23.md`. Este documento só **acrescenta** o que a V3 precisa; onde não disser o contrário, vale a V2.

---

## 1. O que o fundador viu na V2 publicada (diagnóstico)

O fundador apresentou a V2 em modo slide e apontou cinco problemas. Cada um vira uma decisão na árvore (seção 5).

| # | Observação do fundador | Diagnóstico do autor do prompt |
|---|---|---|
| **O1** | O slide "passagem de informações entre turnos" **não ficou claro pedagogicamente** | O slide mostra quatro rótulos abstratos (escuta, prioridade, ação, devolutiva) sobre uma foto, sem mostrar **o problema** (o que se perde na troca de turno), **o antes e o depois**, nem **quem faz o quê**. Falta um exemplo trabalhado. A foto é de uma reunião, não de uma troca de turno, o que reforça a abstração |
| **O2** | O slide do cronograma deveria ter **janela de detalhe por card**; e o **R$ 12.000** talvez não devesse aparecer ali | Concordo com o fundador: o cronograma responde "**como e quando**"; o slide seguinte responde "**quanto**". Repetir o preço em cinco cards mistura as perguntas, ancora o valor cedo demais e aumenta a carga cognitiva. Nos cards fica "**Marco de aceite**"; o valor aparece **uma vez**, no slide e na seção de investimento (e continua na tabela de marcos e no PDF, para compras) |
| **O3** | A versão em **página está mais completa que os slides**; como a ISG verá provavelmente em slides, os slides precisam ficar completos | Os 11 slides atuais omitem: por que Instituto e ISG, entregas e condições por etapa, validação × efeito, responsabilidades, fontes. A regra nova é **paridade de conteúdo**: tudo o que é essencial na página existe no slide; o que é aprofundamento vai para janela "Entenda" |
| **O4** | **O framework não aparece em cada Q.** Cada Q tem mensuração (ex.: Q1 com o instrumento de Copenhague, ligado à NR-1), avaliação da aplicação, educação, plano de ação e evolução. Isso não ficou claro | Confirmado no repositório: `src/domain/journey.ts` é a fonte única da jornada canônica (Q1 **Risco**/COPSOQ · Q2 **Bem-comum**/FIB-T · Q3 **Florescimento**/PERMA+V · Q4 **Forças**/VIA-T · Q5 **Síntese**). A proposta V2 mostra só os **verbos** (Preparar, Agir e devolver…), sem a **lente**, sem o **instrumento** e sem o ciclo da **Matriz IFT** (Mensurar · Educar · Transformar · Evoluir) dentro de cada Q. É a maior lacuna conceitual da V2 |
| **O5** | As **logos** de Heineken, Universidade de Oxford e World Wellbeing Movement **não entraram. Por quê?** | Ficaram de fora de propósito: a doutrina do projeto e o scanner de claims vetam marca de terceiro como **selo** (sugere parceria ou endosso), a licença do Playbook não cobre marcas e não há autorização dos titulares. O fundador agora pede a decisão: ver D7 (três caminhos, com recomendação) |

---

## 2. Fatos do repositório que a V3 deve usar (conferidos em 23/11/2026)

- **Jornada canônica** (`src/domain/journey.ts`, fonte única, também usada por `/temporada`, `/programa`, `/relatorio-global`):

  | Q | Lente | Instrumento canônico | Pergunta-guia (do repositório) | Domínio |
  |---|---|---|---|---|
  | Q1 | Risco | COPSOQ II · NR-1 | "O que pode adoecer aqui?" | **B** (risco) |
  | Q2 | Bem-comum | FIB-T (Furtado, 2020) | "Como estamos como coletivo?" | A |
  | Q3 | Florescimento | PERMA+V → IVO | "O que nos faz prosperar?" | A |
  | Q4 | Forças | VIA-T v1 | "Que forças nos sustentam?" | A |
  | Q5 | Síntese | Relatório Global ESG | ("O que comprovamos no ano?" → **reescrever**: "O que aprendemos no ciclo?") | A + B separados |

  **Atenção:** parte da copy de `journey.ts` tem afirmações que a proposta **não pode** reutilizar ("Prevenção NR-1", "garantir que não há dano", "comprovamos", "Selo Empresa Viva" como entrega). Use as **perguntas-guia** e os **nomes das lentes**; reescreva o resto pelas regras da V2 (seção 5 da V2) e da skill `nr1-copsoq-defensibility-guard`.
- **Maturidade real por Q** (não muda; vem de `docs/vitalos/piloto/`): Q1 coleta bloqueada até ficha oficial e permissão (forma adotada: COPSOQ II-Br curta, Gonçalves et al. 2021); Q2 jornada provada em banco descartável, convite publicado não testado; Q3 só prática educativa (Vitalidade 001), mensuração bloqueada; Q4 VIA-T exploratório individual, visão de equipe só com n ≥ 5 e **sem contrato** (fora); Q5 só síntese descritiva, IVO sem contrato, relatório da plataforma demonstrativo.
- **Educação já existente** (verificar e citar o caminho exato antes de usar): `/academia` (trilhas por papel), Domínio B educativo em `/sst`, unidade educativa D10 do Q2 (`docs/vitalos/Q2_D10_UNIT_001_REVIEW.md`), Vitalidade 001 do Q3 (`docs/vitalos/decisions/Q3_VITALIDADE_UNIDADE_001_REVISAO.md`).
- **Componentes acessíveis disponíveis:** `src/components/ui/dialog.tsx` (Radix: foco preso, Esc, devolução de foco, `aria-modal`), `sheet.tsx`, `popover.tsx`, `tooltip.tsx`. **Use `dialog` para os aprofundamentos**; nada de janela pop-up do navegador.
- **Implementação atual da proposta:** `src/features/proposal/` (`ProposalPage.tsx`, `ProposalSections.tsx`, `ProposalSlides.tsx`, `motion.ts`, `media.ts`, `types.ts`) e `src/lib/proposal/isg-content.server.ts` (fonte única, claims via Commercial Claims Registry 1.2.0).

---

## 3. A tese pedagógica da V3

> **Os slides contam a história completa em uma camada; quem quiser entender a fundo abre a camada seguinte, sem sair do slide.**

Três camadas, sempre com o mesmo dado:

| Camada | Para quem | Forma | Regra de densidade |
|---|---|---|---|
| **1 · Slide / seção** | quem decide, em reunião | um título-afirmação, um visual, até ~40 palavras | uma ideia por slide |
| **2 · "Entenda" (janela)** | quem vai avaliar (RH, SST, tecnologia, compras) | infográfico + passo a passo + "o que muda para a ISG" | até ~150 palavras + 1 visual; sem rolagem longa |
| **3 · Fontes e condições** | quem audita | lista de fontes, status e condições | texto, com links |

**Técnicas de ciência da aprendizagem a aplicar** (cada janela deve declarar, no código, quais usa; não invente efeito delas para a ISG): **codificação dupla** (ícone + palavra, diagrama + legenda), **segmentação** (um passo por vez, com "1 de 4"), **sinalização** (destaque do que muda), **exemplo trabalhado** (o caso dos turnos passo a passo, com antes e depois), **pré-treino** (quatro termos — Mensurar, Educar, Transformar, Evoluir — apresentados uma vez, com ícone fixo, antes das etapas), **contiguidade** (rótulo colado ao elemento do gráfico, nunca legenda distante), **coerência** (cortar decoração que não ensina), **pergunta-guia** por Q (a pergunta do repositório abre cada etapa). Referências de fundo (para o comitê; **verificar edição e página antes de citar na página**, e só citar se agregar): princípios de aprendizagem multimídia de Richard E. Mayer e teoria da carga cognitiva de John Sweller. **Nada de quiz, pontuação ou gamificação** numa proposta comercial.

---

## 4. Conteúdo-semente (rascunho para a árvore validar; não é copy final)

### 4.1 Matriz IFT por Q (o framework visível)

Ícones fixos: **Mensurar** (régua/gráfico) · **Educar** (livro) · **Transformar** (engrenagem/seta) · **Evoluir** (espiral/ciclo). Cada célula traz **status honesto** com a legenda da V2 (disponível na plataforma · conduzido pelo Instituto · condicionado).

| Q · lente | Mensurar | Educar | Transformar | Evoluir |
|---|---|---|---|---|
| **Q1 · Risco** "O que pode adoecer aqui?" | Mapeamento psicossocial estruturado (referência COPSOQ II; forma COPSOQ II-Br curta) · **coleta condicionada** à liberação do instrumento; preparação disponível | Conteúdo educativo sobre fatores psicossociais e bem-estar no trabalho para RH, SST e liderança · conduzido pelo Instituto | Plano de escuta, comunicado e revisão técnica com SST · disponível | Revisão da preparação e critérios do próximo passo; se houver coleta, leitura só para grupos ≥ 5 · **apoio educativo à SST; não substitui PGR nem profissional habilitado** |
| **Q2 · Bem-comum** "Como estamos como coletivo?" | FIB-T (Furtado, 2020): escuta coletiva e leitura publicada · disponível (convite publicado a verificar) | Apoio à liderança e unidade educativa do Q2 · conduzido pelo Instituto | Priorização, plano com responsável, prazo e revisão · disponível | Devolutiva coletiva, revisão e **execução registrada** (efeito **não avaliado**) · disponível |
| **Q3 · Florescimento** "O que nos faz prosperar?" | PERMA+V · **mensuração fora** desta proposta (fonte metodológica pendente) | Oficina e prática Vitalidade 001 · conduzido pelo Instituto | Prática voluntária acompanhada · conduzido pelo Instituto | Decisão de manter, adaptar ou encerrar |
| **Q4 · Forças** "Que forças nos sustentam?" | VIA-T v1, leitura **exploratória e individual** · sem visão de equipe | Oficina sobre forças | Roteiro individual para aplicar uma força no trabalho | Conversa de encerramento com o que cada pessoa quiser compartilhar · privacidade explícita |
| **Q5 · Síntese** "O que aprendemos no ciclo?" | Consolidação dos registros disponíveis (IVO **sem contrato**; relatório da plataforma **demonstrativo**) | Devolutiva executiva | Decisão sobre o próximo ciclo | Síntese que descreve execução e **mudança observada**, sem afirmar efeito; registros que **podem** apoiar o relato de sustentabilidade |

**Domínio A × B:** Q1 é risco (Domínio B) e deve aparecer **visualmente separado** (cor, rótulo "Risco psicossocial · educativo") das lentes de florescimento (Domínio A). No Q5, risco e florescimento **não** são somados num índice.

**"Avaliação da aplicação"** (pedido do fundador): em cada Q, o "Evoluir" mostra **como a ISG verifica que a etapa aconteceu como desenhado** (validação operacional da V2: tarefas por perfil, execução registrada, devolutiva realizada, compreensão do processo). Avaliação de **efeito** continua separada e fora desta proposta.

### 4.2 Corresponsabilidade ISG × Instituto (exemplo fictício, a definir na reunião)

Para cada Q, uma faixa de 4 papéis em linguagem simples (sem jargão RACI): **Instituto conduz** · **ISG decide** · **ISG executa** · **Juntos revisam**. Exemplo para o Q2: o Instituto prepara a leitura e facilita a priorização; a direção da ISG decide as prioridades; a liderança da unidade executa as ações; Instituto e RH revisam a cada quinze dias. Rótulo obrigatório: **"Exemplo de divisão de papéis. A divisão real é definida na reunião de implantação."**

### 4.3 Exemplo dos turnos, reescrito como exemplo trabalhado

Abrir com o **problema concreto** em uma frase e um mini-diagrama: *Turno A → troca → Turno B*, com três chamados em andamento, dois deles **perdendo contexto** na troca (ícone de alerta). Depois, quatro passos, cada um com **o que acontece · quem faz · o que fica registrado · o que a equipe vê**:

1. **Escutar:** a equipe responde à escuta; a leitura é coletiva (grupos ≥ 5). *Registro:* leitura publicada. *A equipe vê:* o resultado do grupo, nunca respostas individuais.
2. **Priorizar:** liderança e RH escolhem um tema: "passagem de informações entre turnos". *Registro:* prioridade com justificativa.
3. **Agir:** uma lista de passagem de turno com 5 itens é testada por 4 semanas; responsável e revisão quinzenal. *Registro:* ação, responsável, prazo, estado.
4. **Devolver:** a equipe ouve o que foi escutado, decidido, feito e o que ainda não se sabe. *Registro:* devolutiva realizada; **efeito não avaliado**.

Fechar com **antes × depois** em linguagem de execução (não de resultado): *antes*, o tema aparecia em conversa solta; *depois*, existe uma decisão com dono, prazo e devolutiva registrada. E o box "**O que faltaria para falar em efeito**" (linha de base, indicador, comparação, protocolo). Tudo com o selo **"Exemplo fictício"**. A ilustração do slide deve ser trocada por uma que mostre **troca de turno** (ver D4) ou por um diagrama, nunca uma reunião genérica.

### 4.4 Cronograma

Cards sem preço: "**Marco de aceite**". Cada card abre "**Entenda o Q\***" com: pergunta-guia, Matriz IFT do trimestre (ícones), mês a mês, quem participa, entregável, critério de aceite, o que é condicionado e a faixa de corresponsabilidade. O preço por marco fica **somente** na seção/slide de investimento e na tabela de marcos.

---

## 5. Decisões para a árvore ToT (método da V2, seção 7: ≥ 3 ramos, critérios com peso, poda, teste de falsificação)

**D1 · Framework visível.** Ramos: (a) uma matriz geral Matriz IFT × Q em um slide/seção + uma linha da Matriz IFT em cada card de etapa; (b) um slide por Q (5 slides) com Matriz IFT completa; (c) só nas janelas "Entenda". Critério extra: **o fundador precisa reconhecer o framework do Instituto em 10 segundos**; o comitê científico precisa ver status honesto em cada célula.

**D2 · Corresponsabilidade.** Ramos: (a) faixa de 4 papéis por Q; (b) tabela única de corresponsabilidade × Q; (c) só dentro das janelas. Sempre rotulada como exemplo.

**D3 · Camada "Entenda" (janelas).** Ramos: (a) `Dialog` Radix sobre a página e sobre o slide; (b) `Sheet` lateral; (c) expansão inline. Requisitos: botão com texto ("Entenda o Q2", nunca só "ⓘ"), foco preso e devolvido, Esc fecha, título e descrição ligados por `aria-labelledby/-describedby`, rolagem interna no celular, **em modo apresentação a janela abre por cima do slide sem perder o índice**, tecla de atalho opcional ("E") documentada, **impressão: todas as janelas saem como anexo "Aprofundamentos"** no fim do PDF. Conteúdo das janelas vem da mesma fonte de dados (nenhum texto só no componente).

**D4 · Exemplo trabalhado e imagem.** Ramos: (a) diagrama vetorial do turno (sem foto); (b) nova ilustração gerada de troca de turno numa equipe de suporte de tecnologia (precisa de ferramenta de geração aprovada e procedência como na V4); (c) foto atual + diagrama sobreposto. Recomendação inicial: (a) agora, (b) quando houver imagem aprovada.

**D5 · Preço fora do cronograma.** Ramos: (a) remover o valor dos cards e da faixa do cronograma (recomendado pelo fundador e pelo autor); (b) manter discreto no rodapé do card; (c) manter. Teste: compras continua achando o total em ≤ 10 s (seção/slide de investimento, tabela de marcos e PDF).

**D6 · Paridade página ↔ slides.** Ramos: (a) gerar os slides a partir de uma **lista de capítulos tipada** compartilhada com a página (fonte única de ordem); (b) manter `buildSlides` à mão e cobrir com teste de paridade; (c) só acrescentar slides. Sequência-semente (ajuste com evidência): capa · pergunta · por que Instituto e ISG · o que o Instituto já fez · ciência · literatura e caso · **framework: Matriz IFT (pré-treino)** · exemplo trabalhado dos turnos · jornada · **Q1 · Q2 · Q3 · Q4 · Q5** (um slide cada, com "Entenda") · cronograma · como decidir se funcionou · investimento e contrapartida · responsabilidades · quem conduz · próxima conversa · fontes. Acrescentar **sumário navegável** (lista de capítulos; tecla "G" ou botão "Capítulos") e indicador "capítulo · slide x de y". Teste automatizado: cada capítulo essencial da página tem slide correspondente.

**D7 · Logos de terceiros (pedido explícito do fundador; decisão dele).** Por que não entraram: (1) marca de terceiro ao lado de uma proposta comercial é lida como **parceria ou endosso**, o que a doutrina e o scanner do projeto vetam; (2) a licença CC BY-NC-ND do Playbook **não** autoriza uso de marca; (3) a Universidade de Oxford e a Heineken têm regras próprias de uso de marca e **não há autorização**; (4) o caso Heineken é relato público, não parceria. Ramos: (a) **sem logos**, nomes em texto (estado atual, risco zero); (b) **faixa "Fontes citadas"**: logos em cinza, mesmo tamanho, legenda fixa "Fontes citadas nesta proposta. Sem parceria, patrocínio ou endosso", longe do hero e do preço; **sem o brasão de Oxford** (usar o nome "Wellbeing Research Centre, Universidade de Oxford" em texto), World Wellbeing Movement como autora do Playbook, Heineken só junto ao caso; **condicionado** a autorização escrita das marcas (ao menos solicitada e registrada); (c) logos como selo de credibilidade → **VETO**. Recomendação do autor: (a) agora; (b) quando houver autorização. **Se o fundador decidir assumir o risco e usar (b) sem autorização**, registre a decisão por escrito em `docs/vitalos/decisions/` com nome, data e escopo, aplique as condições de (b) e nunca (c).

**D8 · Instrumento de Copenhague e NR-1.** O fundador quer explicitar que o Q1 usa instrumento reconhecido internacionalmente, desenvolvido em Copenhague, ligado à NR-1. Tratamento: registrar um claim novo no Commercial Claims Registry **com fonte primária conferida** (candidata a verificar: Kristensen, Hannerz, Høgh e Borg, 2005, *Scandinavian Journal of Work, Environment & Health*, sobre o Copenhagen Psychosocial Questionnaire), redação do tipo "instrumento de referência internacional, desenvolvido na Dinamarca, para avaliar fatores psicossociais do trabalho", **ao lado** de: "nesta proposta, a coleta depende da liberação da versão brasileira e da permissão de uso" e "apoio educativo à gestão de riscos psicossociais; não substitui o PGR nem o profissional habilitado". Passar pela skill `nr1-copsoq-defensibility-guard` e consultar orientação oficial do MTE antes de qualquer frase sobre NR-1. Proibido: "conformidade", "atende à NR-1", "evita multa", "diagnóstico", "bateria COPSOQ II".

---

## 6. Critérios extras de qualidade (somam-se à rubrica da V2)

| Dimensão nova | O que o comitê procura | Mínimo |
|---|---|---|
| 13. Clareza pedagógica | Uma pessoa de RH explica o exemplo dos turnos e a Matriz IFT de um Q em 30 s, só com o slide e a janela | 4,0 |
| 14. Paridade página ↔ slides | Todo capítulo essencial existe nos dois formatos; teste automatizado | 4,5 |
| 15. Design instrucional | Técnicas da seção 3 aplicadas e declaradas; nada decorativo que não ensine | 4,0 |
| 16. Acessibilidade das janelas | Foco, Esc, leitura por leitor de tela, rolagem no celular, impressão como anexo | 4,5 |

**Vetos novos:** preço nos cards do cronograma; janela com informação essencial que não existe em nenhum outro lugar impresso; célula da Matriz IFT sem status (sugerindo que tudo está pronto); Q1 misturado visualmente com florescimento; frase de NR-1 sem a ressalva educativa; logo de terceiro como selo ou sem a legenda de "fontes citadas"; brasão de Oxford.

---

## 7. Protocolo e portão (igual à V2)

FASE 0 reconhecimento (somente leitura) → FASE 1 fichas ToT D1–D8 + wireframes de: Matriz IFT, card de Q com janela, exemplo trabalhado (4 passos + antes/depois), cronograma sem preço com janela, sumário dos slides → **PACOTE PARA O COMITÊ** → `AGUARDANDO APROVAÇÃO DO SUPERCOMITÊ` (pare) → FASE 2 por ondas aprovadas (branch `feat/proposta-v3-*`, commit local, gate verde) → FASE 3 verificação (Chrome sem interface: 320/360/768/1024/1440/1920; teclado nas janelas e nos slides; contraste AA; movimento reduzido; PDF com anexo "Aprofundamentos") e ficha V3.

Ondas sugeridas: **A** framework (D1, D2, D8) · **B** pedagogia (D3, D4) · **C** cronograma e preço (D5) · **D** paridade de slides e sumário (D6) · **E** logos (D7, só com a decisão do fundador) · **F** qualidade e ficha.

Nada de push, PR, merge, publicação ou Lovable sem "sim" do fundador a cada vez.

---

## 8. Perguntas ao fundador (bloqueiam o desenho)

1. **Logos:** (a) sem logos por ora, (b) faixa "Fontes citadas" com autorização das marcas, ou (b) assumindo o risco sem autorização, com decisão registrada?
2. **Matriz IFT:** a célula "Educar" do Q1 deve citar algum conteúdo educativo específico do Instituto (nome do curso, trilha)? Se sim, qual?
3. **Q5:** confirma que é a síntese do ciclo e dura 3 meses?
4. **Exemplo dos turnos:** prefere diagrama (sem foto) agora ou esperar uma ilustração nova de troca de turno?
5. **Copenhague:** autoriza registrar o claim com a fonte primária, depois de conferida?

---

## 9. Primeira resposta esperada

Confirmar a base `4b2b7c9` e a leitura; entregar o quadro "o que reaproveita × o que é novo"; fazer as perguntas da seção 8 e da Revisão 2 numa única mensagem; com as respostas, produzir o **Pacote para o Comitê** e parar no portão.

---

# Revisão 2 do V3 · 23/11/2026 (capa, nome da matriz, preço, marca, cor e imagens)

Fatos conferidos no repositório nesta revisão:
- **O logo do Instituto com fundo transparente já existe** em alta resolução: `src/assets/instituto-felicidade-para-todos-logo-transparent.png` (2400×877, RGBA). A V2 usa `public/brand/instituto/instituto-full-original.png` (1198×481) **dentro de uma cápsula branca**: a caixa branca é escolha de CSS, não do arquivo. A versão de texto claro (`instituto-horizontal-original.png`) tem só 223×55 e não serve para ampliar.
- **"M.E.T.E." aparece em 52 arquivos e 87 ocorrências** de `src/`, inclusive em identificadores de código (`mete-arc-integration`, `MeteEsgMatrixPreview`, registries de aprendizagem e da FlorêncIA) e em rótulos de produto (`/temporada`, "Cronograma M.E.T.E.").
- **Não há preço de referência registrado** no projeto. `PLANO_INSTITUTO_GROWTH_2026-11-21.md` diz explicitamente que não decide preço.

## D9 · Capa com a marca VitalOS em destaque

Pedido: no primeiro slide e na abertura da página, **marca VitalOS grande**, "**Sistema Operacional da Vitalidade Organizacional**" em maior destaque e uma frase sobre o framework e os benefícios, destacando **NR-1** e **ciência da felicidade**.

Hierarquia proposta (ToT com ≥ 3 composições e teste de 5 segundos):
1. Logo VitalOS em tamanho de herói (`VitalOSBrand`, variante horizontal na superfície certa; on-dark sobre imagem escura; nunca recolorir nem recortar).
2. Linha-categoria **Sistema Operacional da Vitalidade Organizacional**, segunda maior tipografia da tela.
3. Frase de valor (candidatas abaixo).
4. "Proposta do Instituto Felicidade para Todos à ISG Participações" com o logo do Instituto, secundário e sem cápsula branca (D11).
5. Rótulo "Ilustração gerada · pessoas fictícias" se houver imagem.

Frases candidatas (não prometem; NR-1 sempre como apoio educativo):
- (a) "Da gestão de riscos psicossociais ao florescimento das equipes: ciência da felicidade aplicada ao trabalho, com decisões que a empresa acompanha."
- (b) "Prevenir, cuidar e fazer florescer: uma jornada em cinco etapas que une o apoio educativo à NR-1 e a ciência da felicidade."
- (c) "Ciência da felicidade e cuidado com os riscos psicossociais, num só sistema: escuta com método, ações com responsável e evolução registrada."

Regras: "NR-1" só com "apoio educativo à gestão de riscos psicossociais" ao alcance do olhar (na capa ou no slide seguinte), com aprovação da skill `nr1-copsoq-defensibility-guard`. **Proibido:** "conformidade com a NR-1", "garante a NR-1", "evita multa", "blindagem". "Ciência da felicidade" é a ponte com o Instituto, não prova de efeito.

## D10 · "Matriz M.E.T.E." passa a se chamar "Matriz IFT" (página, slides e app)

Decisão do fundador: o nome antigo tem conotação indesejada em português. O novo nome é **Matriz IFT** (sigla de **Instituto Felicidade para Todos**). Os quatro movimentos continuam: **Mensurar · Educar · Transformar · Evoluir**.

Escopo e método:
- **Proposta (`/proposta`, página e slides):** só "Matriz IFT" (a proposta ainda não usa o nome antigo; é conteúdo novo).
- **App:** primeiro um **inventário** (`grep` por "M.E.T.E" e "METE" em `src` e `docs`) classificando cada ocorrência em **texto visível** × **identificador, esquema ou teste**. **Só os textos visíveis mudam.** Identificadores (`mete*`, chaves de registry, nomes de arquivo, schemas, testes de contrato) ficam, com o comentário "nome técnico legado; rótulo público: Matriz IFT". Renomear identificadores exigiria migrar registries e testes sem ganho para quem usa.
- **Lovable:** parte desses textos está em telas que o Lovable também edita (por exemplo `AppShell` e a home). Confirmar com o fundador o momento; nunca editar os dois lados ao mesmo tempo.
- **Documentação:** atualizar o `CLAUDE.md` onde descreve o ciclo, registrando "rótulo público: Matriz IFT; `mete` é nome técnico legado".
- **Teste:** varredura que falha se o nome antigo voltar a aparecer em texto visível das rotas públicas e da proposta.
- **Onda própria**, separada da V3 da proposta, com gate verde e diff revisável.

## D11 · Marca do Instituto sem cápsula branca e cores nos cards

- **Logo:** usar o PNG transparente de alta resolução direto sobre fundo claro, **sem cápsula branca**. Em superfície escura (capa com imagem, modo escuro, slides escuros) o texto escuro do logo fica ilegível. Ramos: (a) pedir ao Instituto uma versão oficial em texto claro, em alta resolução ou SVG (**recomendado**); (b) placa clara discreta só nessas superfícies; (c) recolorir ou inverter o logo por CSS (**veto de marca**). Atualizar `public/brand/instituto/README.md` com a nova fonte e o SHA.
- **Cores nos cards** ("mais alegre", sem perder o premium). A paleta já está em tokens (`--fpt-*` em `src/styles.css`); aplicar como **acento**, nunca como fundo de texto:
  - filete superior de 3 a 4 px com **degradê da marca** na ordem dos raios do logo (magenta → amarelo → verde → ciano) nos cards de destaque (resumo, números, Matriz IFT, equipe);
  - cada Q com sua cor fixa em ícone, borda e um véu de 6 a 10% no fundo do card;
  - ícones da Matriz IFT em "pílulas" com a cor do movimento (Mensurar ciano-profundo, Educar amarelo, Transformar magenta, Evoluir verde), com o **texto sempre em cor de tinta**;
  - modo escuro e impressão com as variantes já previstas; contraste AA medido em todos os pares; nada de neon nem arco-íris em bloco inteiro.
  Critério: "alegre e institucional ao mesmo tempo", medido em comparação lado a lado (antes e depois) e aprovado pelo fundador.

## D12 · Imagens hiper-realistas nas transições de bloco dos slides

- **Slides de capítulo:** imagem em tela cheia, véu escuro, título do capítulo e uma frase (o padrão da capa). Sugestão de 4 a 5 capítulos: *Por que agora* · *Como funciona* · *A jornada* · *Investimento e condição de implantação* · *Próxima conversa*. No máximo um a cada 4 ou 5 slides, para não virar decoração.
- **Imagens reutilizáveis** (procedência registrada): `v4-hero`, `v4-compreender`, `v4-agir`, `v4-evoluir`.
- **Imagens novas** (briefs no Anexo C da V2, mesma direção de arte): troca de turno numa equipe de suporte de tecnologia (exemplo trabalhado), oficina de prática (Q3), reflexão individual com caderno (Q4), reunião executiva de síntese (Q5). **O Claude Code desta sessão não gera imagens:** gerar com ferramenta aprovada (como na V4), registrar procedência em JSON, rótulo "Ilustração gerada · pessoas fictícias", WebP ou AVIF até 180 KB, recorte para celular.
- Transição de capítulo: fade com leve zoom (até 600 ms), desligada com movimento reduzido.

## D13 · Preço de referência "R$ 24.000 por etapa" e condição de implantação

Pergunta do fundador: dá para dizer que o valor real de implantação seria cerca de **R$ 24.000 por eixo** e que, nesta proposta, fica em R$ 12.000 pela sinergia entre as organizações, para dar ar de oportunidade?

**Opinião do autor (para a árvore validar): pode ajudar, mas só se o valor de referência for verdadeiro e demonstrável.** Um preço "de" que nunca foi praticado é **preço de referência fictício**. Em B2B, compras costuma perguntar primeiro onde esse valor foi praticado; sem resposta, a proposta inteira perde credibilidade, e apresentar isso como oferta pode configurar publicidade enganosa (CDC, art. 37). A versão forte não é "desconto", é **troca justa**: a ISG paga menos **porque entrega algo de valor ao Instituto**.

Ramos:
- (a) **Sem preço de referência** (estado atual): R$ 12.000 por etapa e o total.
- (b) **Valor de referência documentado + condição de implantação inicial com contrapartida:** "Valor de referência por etapa: R$ 24.000. Condição desta primeira implantação: R$ 12.000 por etapa, porque a ISG contribui com 40 horas de revisão técnica, uma unidade inicial e o registro anonimizado de aprendizados." Exige **documento** do valor de referência (composição de custo com horas de facilitação, análise, mentoria e plataforma; tabela pública; ou proposta já enviada a outro cliente), guardado em `docs/vitalos/decisions/`, valendo igualmente para clientes comparáveis.
- (c) **Referência sem documento, ou "oportunidade" com prazo:** **VETO** (preço fictício e urgência artificial).

Regras se (b) for aprovado: referência e proposta (R$ 120.000 × R$ 60.000) aparecem **juntas e iguais em todas as superfícies** (resumo, investimento, tabela, slides, PDF), cobertas por um único teste de fonte única; **sem prazo de validade artificial**; sem "imperdível", "só agora" ou "economia de"; a contrapartida fica **ligada** à condição (se a contribuição técnica não acontecer, a condição muda, e isso fica nas condições). Evitar "parceria" no sentido de sociedade (o scanner marca a palavra); preferir "condição de implantação inicial" e "colaboração técnica".

Pergunta obrigatória antes de implementar (b): **de onde vem o valor de R$ 24.000 por etapa? Há composição de custo ou contrato anterior que o sustente?**

## Vetos acrescentados

Logo VitalOS recolorido, distorcido ou pequeno na capa; "NR-1" sem a ressalva educativa; o nome antigo da matriz em texto visível depois da onda D10; identificador de código renomeado sem migração e testes; logo do Instituto recolorido ou invertido por CSS; degradê sob texto; imagem gerada sem rótulo ou sem procedência; preço de referência sem documento; prazo ou urgência artificial.

## Perguntas novas ao fundador

6. **Capa:** qual frase (a, b ou c), ou outra?
7. **Matriz IFT no app:** posso trocar os textos visíveis em telas que o Lovable também edita? Em que momento?
8. **Logo do Instituto em fundo escuro:** existe versão oficial em texto claro, em alta resolução ou SVG?
9. **Preço de referência:** de onde vem o R$ 24.000 por etapa? Há composição de custo ou contrato que o sustente?
10. **Imagens novas:** quem gera e aprova as quatro ilustrações (troca de turno, oficina, reflexão, síntese)?

## Ondas atualizadas

**A** framework (D1, D2, D8) · **B** pedagogia (D3, D4) · **C** cronograma e preço sem duplicar (D5; D13 só com documento) · **D** paridade de slides, capa e capítulos com imagem (D6, D9, D12) · **E** marca e cor (D11) · **F** logos de terceiros (D7, só com decisão) · **G** "Matriz IFT" no app inteiro (D10, onda separada e coordenada com o Lovable) · **H** qualidade e ficha V3.

---

# Revisão 3 do V3 · 23/11/2026 · Valoração transparente, demanda humana e licença

O fundador pediu: projetar a atuação humana da equipe do Instituto em cada etapa trimestral (consultoria, mentoria, facilitação), avaliar o que a licença da plataforma inclui, e montar a matemática que sustenta um valor de referência de **R$ 24.000 por etapa** (3 pessoas, 3 meses, cerca de 100 pessoas na unidade), com a lógica de colaboração (quase uma permuta) com a ISG, no melhor formato de apresentação.

**Natureza destes números:** é um **modelo de valoração**, não um preço já praticado. Os **parâmetros** (valor-hora por papel, mensalidade da licença, custos indiretos) são **hipóteses do autor do prompt** para o Instituto validar. Só depois de validados e **adotados como tabela do Instituto para clientes comparáveis** é que "valor de referência" vira afirmação verdadeira (D13). Até lá, a página não exibe valor de referência.

## D14 · Demanda de atuação humana por etapa (modelo)

Três papéis (já na proposta): **Coordenação científica e análise** (sênior) · **Educação e facilitação** · **Implantação e engajamento**. Base: **90 horas da equipe por etapa** (cerca de 7 horas por semana em 13 semanas), com o peso mudando conforme a lente.

| Etapa · lente | Coordenação científica e análise | Educação e facilitação | Implantação e engajamento | Total |
|---|---|---|---|---|
| **Q1 · Risco** | 32 h: plano de escuta, revisão técnica com SST, critérios, relatório de preparação | 22 h: conteúdo educativo sobre fatores psicossociais e bem-estar, encontro com RH/SST/liderança, mentoria do RH | 36 h: configuração da organização e dos papéis, comunicado, materiais, canal de dúvidas, acompanhamento semanal | **90 h** |
| **Q2 · Bem-comum** | 30 h: análise da leitura FIB-T, preparação da priorização, critérios de revisão | 26 h: facilitação da priorização, 4 mentorias da liderança, devolutiva coletiva | 34 h: convites, apoio a quem responde, registro de ações e estados, acompanhamento quinzenal | **90 h** |
| **Q3 · Florescimento** | 22 h: desenho da prática Vitalidade, critérios de manter/adaptar/encerrar | 40 h: oficina de abertura, acompanhamento da prática voluntária, conversas de percepção | 28 h: logística, comunicação da prática, registro de adesão e percepções | **90 h** |
| **Q4 · Forças** | 22 h: desenho da oficina VIA-T exploratória, regra de privacidade | 40 h: oficina de forças, roteiro individual, apoio às pessoas, encerramento | 28 h: comunicação, materiais, logística, registro do que for compartilhado | **90 h** |
| **Q5 · Síntese** | 44 h: consolidação dos registros, síntese executiva, recomendação do próximo ciclo | 18 h: devolutiva executiva e conversa com liderança | 28 h: reunião executiva, revisão com áreas, documentação final | **90 h** |
| **Programa** | **150 h** | **146 h** | **154 h** | **450 h** |

Esta tabela substitui, na proposta, as "quantidades propostas" vagas e alimenta: a janela "Entenda o Q\*" (D3), a faixa de corresponsabilidade (D2) e a composição do preço (D16). Os números de horas são **proposta**, a confirmar na reunião.

## D15 · O que a licença da plataforma inclui (e o que não inclui)

Fonte: `src/engine/billing/plan-engine.ts`. Para cerca de 100 pessoas, o plano adequado é o **Crescimento** (até 4 ondas por mês, até 500 convites por onda, até 5 administradores, instrumentos COPSOQ, PERMA, VIA-T e FIB-T).

| Inclui (conforme maturidade de cada Q) | Não inclui (ou é escopo à parte) |
|---|---|
| Acesso para pessoas da unidade, liderança e RH; até 5 administradores | Integração com sistemas da ISG (login corporativo/SSO, RH/folha): **avaliar na contribuição técnica de 40 h** e orçar à parte |
| **Configuração da organização**: nome, unidades e setores, papéis e permissões, comunicado | **White-label** (marca da ISG no lugar da VitalOS) e desenvolvimento sob medida |
| Fluxos disponíveis: escuta coletiva e leitura publicada com proteção de grupos (≥ 5), plano com responsável, devolutiva e registros (Q2); preparação do Q1 | Coleta do Q1 e mensuração do Q3 enquanto **condicionadas** (seção 2) |
| Suporte de uso pelo Instituto (canal de dúvidas) | Hospedagem dedicada, SLA contratual de disponibilidade (não definidos) |
| Guarda de dados conforme regra a acordar antes da coleta | Prazo de guarda e descarte: **decisão pendente do Instituto** (o catálogo declara 12 meses, mas nada aplica isso hoje) |

Formulação recomendada na proposta: "**licença de uso da plataforma VitalOS, configurada para a organização** (unidades, papéis, comunicação), durante o programa". Evitar "personalizada" sem qualificar (pode ser lido como desenvolvimento sob medida).

## D16 · Valoração: composição do valor de referência por etapa (modelo)

Parâmetros (hipóteses a validar pelo Instituto):

| Parâmetro | Valor do modelo | Observação |
|---|---|---|
| Valor-hora · coordenação científica e análise | R$ 220 | sênior |
| Valor-hora · educação e facilitação | R$ 180 | |
| Valor-hora · implantação e engajamento | R$ 140 | |
| Licença (plano Crescimento, ~100 pessoas) | R$ 2.000/mês | equivale a R$ 20 por pessoa por mês |
| Coordenação de projeto, materiais e custos indiretos | ~7,6% | fecha a conta |

Composição **média por etapa** (3 meses):

| Componente | Por etapa | Programa (5 etapas) |
|---|---|---|
| Consultoria, mentoria e facilitação (90 h) | R$ 16.168 | R$ 80.840 |
| Licença de uso da plataforma (3 meses) | R$ 6.000 | R$ 30.000 |
| Coordenação, materiais e indiretos | R$ 1.832 | R$ 9.160 |
| **Valor de referência** | **R$ 24.000** | **R$ 120.000** |

Sensibilidade (para o Instituto calibrar): só a consultoria por etapa, com valor-hora médio de R$ 150, R$ 180 ou R$ 220, fica em R$ 13.500, R$ 16.200 ou R$ 19.800. **Antes de publicar, o Instituto precisa conhecer o próprio piso de custo** (custo real da hora das três pessoas + custo da plataforma). Alerta do modelo: **a R$ 12.000 por etapa, o preço proposto fica abaixo do componente de consultoria do próprio modelo (≈ R$ 16.168)**; isso é coerente com uma implantação de referência subsidiada, mas o fundador deve decidir conscientemente quanto o Instituto investe.

## D17 · A lógica de colaboração ("quase permuta") com a ISG

Diferença entre referência e proposta: **R$ 60.000** no programa (R$ 12.000 por etapa). Explicação honesta, item a item:

| Parcela da diferença | Valor do modelo | Natureza |
|---|---|---|
| Contribuição técnica da ISG: 40 h de revisão de arquitetura/integrações, usabilidade e parecer | ≈ R$ 8.000 (40 h × R$ 200, hipótese de valor-hora técnico; a ISG pode informar o seu) | troca de serviço, mensurável |
| Unidade inicial, acesso às áreas e registro anonimizado de aprendizados para as próximas implantações | não monetizado | valor estratégico para o Instituto |
| **Investimento do Instituto numa implantação de referência** numa empresa de tecnologia | ≈ R$ 52.000 | decisão do Instituto, declarada como tal |

Regras: chamar de **"condição de implantação inicial"** e **"colaboração técnica"**, não de "parceria" (sentido de sociedade) nem de "permuta" formal. **Permuta formal tem efeitos contratuais e tributários (por exemplo, ISS sobre serviços trocados)**: se for esse o desenho, o contrato e a contabilidade de ambos precisam definir; a proposta só descreve a lógica. A condição fica **ligada** à contrapartida: se a contribuição técnica não acontecer, a condição é revista (escrever nas condições). Sem prazo artificial.

## D18 · Melhor formato de apresentação da conta (ToT)

Ramos:
- (a) **Tabela de planos** (3 colunas, estilo SaaS): **pior** aqui, porque não há escolha entre planos e a comparação induz leitura de "pacote".
- (b) **Ponte de valor** (gráfico em cascata horizontal): barra "Valor de referência R$ 24.000 por etapa" dividida em consultoria · licença · indiretos → descontos explicados ("contribuição técnica da ISG", "investimento do Instituto na implantação de referência") → barra final "**Condição desta implantação: R$ 12.000 por etapa**". Uma frase-legenda por bloco; tabela equivalente para leitor de tela e impressão. **Recomendado.**
- (c) **Dois blocos lado a lado** (já existe na V2: investimento × contribuição) com a composição dentro da janela "Entenda a conta". Bom complemento de (b).
Estrutura sugerida: slide/seção "**Como chegamos a este valor**" com (b) em destaque; abaixo, (c); a janela "Entenda a conta" traz D14 (horas por papel e por Q), D15 (o que a licença inclui) e os parâmetros de D16. O total proposto (R$ 60.000) e, se aprovado, o de referência (R$ 120.000) aparecem iguais em todas as superfícies.

Visual: barras com as cores da marca (consultoria = ciano-profundo, licença = verde, indiretos = cinza; descontos em tracejado), números tabulares, rótulos diretos nas barras (contiguidade), sem 3D, sem pizza.

## Decisão do fundador (23/11/2026): "Usar o modelo"

Os parâmetros de D16 foram **adotados como referência do Instituto** para implantações comparáveis. Registro: `docs/vitalos/decisions/PROPOSTA_V3_VALOR_REFERENCIA_2026-11-23.md`. Efeitos:
- **D13 ramo (b) passa a ser viável**: a proposta pode mostrar "Valor de referência por etapa: R$ 24.000" e "Condição desta implantação: R$ 12.000", com a composição e a explicação da diferença (D17), no formato de ponte de valor (D18). Cadastrar os parâmetros em dados tipados no servidor (fonte única) e um teste que confere: soma da composição = R$ 24.000; 5 × referência = R$ 120.000; condição × 5 = R$ 60.000; os mesmos números em resumo, investimento, tabela, slides e PDF.
- Registrar o valor de referência como claim comercial (categoria quantitativa) com a decisão acima como fonte, superfície da proposta e revisão em 6 meses.
- **Perguntas 11 e 12 respondidas** (valores-hora e licença do modelo). **Pergunta 13 respondida: "Sim, é investimento"** (a condição de R$ 12.000 é investimento do Instituto numa implantação de referência; registrar assim na proposta, ver D17). Continuam abertas as 14 e 15, e a confirmação de que "usar o modelo" inclui a mensalidade da licença.

## Perguntas novas ao fundador (bloqueiam D14–D18)

11. ~~**Valores-hora reais**~~ **Respondida: usar o modelo.** **Valores-hora reais** dos três papéis (ou o custo real da hora de cada pessoa) e se o Instituto quer trabalhar com preço por papel ou valor-hora médio.
12. ~~**Mensalidade da licença**~~ **Respondida (interpretação: usar o modelo, R$ 2.000/mês; confirmar).** **Mensalidade da licença** para ~100 pessoas: o Instituto já tem tabela da VitalOS? (O modelo usou R$ 20 por pessoa por mês como hipótese.)
13. ~~Investimento~~ **Respondida: sim, é investimento.** **Investimento do Instituto:** confirma que a condição de R$ 12.000 por etapa é uma decisão de investir numa implantação de referência (e não um preço de catálogo)?
14. **Valor-hora técnico da ISG** para estimar a contrapartida (ou deixar a ISG informar).
15. **Permuta formal ou só lógica comercial?** Se formal, envolver jurídico e contabilidade de ambos.

## Vetos acrescentados

Exibir "valor de referência" antes de o Instituto adotar a tabela; parâmetros de valor-hora apresentados como fato; "permuta" sem desenho contratual; conta que não fecha (todo valor na página deriva de parâmetros tipados no servidor e um teste confere a soma); licença descrita como "personalizada" sem dizer o que inclui.

## Decisão do fundador (23/11/2026): termo oficial "colaboração técnica"

**Pergunta 15 respondida.** A relação de contrapartida com a ISG se chama **"colaboração técnica"**; a condição de preço se chama **"condição de implantação inicial"**. É lógica comercial, **não** permuta contratual. **"Permuta" e "parceria" não aparecem na proposta** (página, slides, PDF, metadados), e um teste de conteúdo falha se aparecerem fora da ressalva "sem parceria ou endosso".

Texto de referência para a ponte de valor (D18):

> **Condição de implantação inicial.** Valor de referência: R$ 24.000 por etapa. Nesta primeira implantação: R$ 12.000 por etapa, em **colaboração técnica** com a ISG: 40 horas de revisão da experiência e das integrações, uma unidade inicial e o registro anonimizado de aprendizados. A diferença é um investimento do Instituto nesta implantação de referência.

Continua aberta só a pergunta 14 (valor-hora técnico da ISG; o modelo usa R$ 200) e a confirmação de que a licença de R$ 2.000/mês também é referência.
