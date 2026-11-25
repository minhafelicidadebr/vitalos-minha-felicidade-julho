# Super prompt V5 · Design, narrativa e uso da proposta à ISG

**Status:** PROPOSTA PARA APROVAÇÃO DO CONSELHO. Nada daqui foi implementado. Só implementar após aprovação expressa, item a item.
**Base:** V4 commitada em `d914cdf` (`codex/proposta-isg-v4`). Slides numerados como na V4 (37).
**Natureza do conselho:** a avaliação é do fundador e de quem ele convocar. Este documento traz uma rubrica de avaliação; não afirma parecer de especialistas externos.

---

## Parte 1 · Árvore de decisão (ToT) por pedido

Para cada pedido: três ramos, critério (narrativa · clareza · acessibilidade · risco de afirmação sem fonte · custo), escolha.

### 1. Slide 2 "A pergunta" (retirar)
- Ramo A: remover o slide e a seção da página. Risco: perde a abertura provocativa; quebra paridade se só um lado mudar.
- Ramo B: remover o slide e incorporar a pergunta como frase de uma linha no slide 3. 
- Ramo C: manter.
- **Escolha: B.** O fundador tem razão: a ISG é referência em bem-estar e a pergunta soa como diagnóstico dela. A frase vira convite ("Como transformar uma cultura que já valoriza pessoas em prática medida?"), sem pressupor falha. Remover também a seção equivalente da página (teste de paridade).
- **Fato a registrar:** no site oficial, o único sinal de bem-estar é o selo "Somos GPTW" (sigla não expandida no texto do site); não há página de programa de bem-estar. "Referência em bem-estar" deve apoiar-se nesse selo e na declaração "Valorização da pessoa humana", não em afirmação nossa.

### 2. Slide 3 "Por que o Instituto e a ISG" → infográfico do que a ISG comunica e faz
Fatos do site isgsa.com.br (lidos hoje; sem ano de fundação, nº de colaboradores ou faturamento declarados, então **não usar**):
- Holding de grupo de empresas "comprometidas com a transformação digital e social"; quatro frentes: **Tecnologia, Gestão, Educação, Pessoas**; **6 unidades de negócio** (Truly, Brisk, Serviset, Oros, Estudologia, U4Hero); casos: SEDUC-PI, Senado Federal; valores incluem **Valorização da pessoa humana**, Inovação, Sustentabilidade; Política ESG alinhada aos ODS; selo GPTW.
- Ramo A: hub-and-spoke (ISG ao centro, quatro frentes em volta, seis marcas como pontos). 
- Ramo B: faixa horizontal "O que a ISG faz → o que o Instituto soma", duas colunas que se encontram. 
- Ramo C: linha do tempo (descartado: sem datas confirmadas).
- **Escolha: A + trecho de B.** À esquerda o mapa da ISG (frentes e marcas, texto exato do site, com data de consulta); à direita, em cor diferente, "o que o Instituto soma" (método Matriz IFT, leitura do bem-estar, evidência). Ponte visual: "Pessoas" e "Educação" são as frentes que tocam o programa. Rótulo: "Fonte: site institucional da ISG, consultado em [data]".
- **Não usar:** "US$ 10 bilhões" (o site fala de investimentos de clientes geridos, não da ISG); nenhum número de colaboradores. Logo da ISG só se houver autorização/uso já aceito na proposta.

### 3. Grid sutil no fundo dos slides
- Ramo A: grade de linhas finas em todo o fundo. Risco: "cara de template", ruído.
- Ramo B: grade de pontos (dot grid) com máscara radial: visível num canto/ao redor do título, some em direção ao conteúdo. 
- Ramo C: grade de linhas só nos slides de dados (reforça precisão), pontos nos demais.
- **Escolha: B (base) + C (nos slides de dados).** Especificação: SVG/`background-image` de 1px, espaçamento 32 px (em unidade do palco), cor = `--foreground` a 4–6 % no claro e `--foreground` a 8 % no escuro; `mask-image: radial-gradient` para 0 % no centro do conteúdo; sem animação; **oculta na impressão**; nunca sob texto corrido (a máscara garante); contraste do texto medido com a grade presente. Não aplicar nos slides de capítulo (que já têm malha geométrica) nem na capa. Regra de ouro: se, ao borrar os olhos, a grade for notada antes do título, está forte demais.

### 4. Slide 5 "Instituto: apps e principais projetos" (design até 120 %)
- Ramo A: bento grid (um destaque grande + 4 cartões), cada um com ícone/captura, nome, uma linha de função e um número só quando já declarado nos arquivos. 
- Ramo B: carrossel/linha do tempo (não: exige interação em tela de projeção).
- Ramo C: manter lista e só polir.
- **Escolha: A.** Hierarquia: 1 destaque ("pesquisa FIB em Brasília apoiada pela ISG"), 3–4 projetos/apps, rótulo claro entre "app" e "projeto". Capturas de tela reais dos apps (não mockup genérico). Números só os já registrados no conteúdo; qualquer novo vai para pendência.
- **Pendência:** quais apps/projetos entram e a ordem (decisão do fundador).

### 5. Slides 7 e 8 (design instrucional e de dados, até 120 %)
Slide 7 (literatura e caso externo) e 8 (OMS/OIT e Gallup).
- Ramo A: gráficos de barras com eixo e escala. Risco: parecer medição da ISG; eixos exigem dados que não temos.
- Ramo B: "números-herói" tipográficos + comparação em unidades (ex.: "12 bilhões de dias" como ícones agrupados) + diagrama de quartis para o Gallup (superior × inferior em engajamento), tudo rotulado "associação agregada".
- Ramo C: tabela visual simples.
- **Escolha: B.** Regras de visualização honesta: nenhum eixo truncado; nada de barras que sugiram causalidade; cada dado com origem, ano e escopo na própria peça; o sinal "−" mostrado como diferença, não como meta; cor por grupo (já existente) mais forma/ícone diferentes, não só cor. Instrução didática: título que diz a conclusão permitida ("São associações, não promessas"), uma linha "como ler", fonte em linha.

### 6. Slide 12 custo por dia R$ 300 → R$ 180
- Hoje o valor inicial é um campo (`unitCost`, 300) ajustável; o cálculo é parametrizado, então mudar o padrão recalcula tudo.
- Resultado com R$ 180 (referência 100 dias, cenário 90 dias): referência R$ 18.000; cenário R$ 16.200; variação −R$ 1.800 (hoje −R$ 3.000).
- Opinião: **sim, R$ 180 é aceitável**, desde que continue declarado "valor ilustrativo, ajustável" e **sem pretender ser média de mercado** (não temos fonte; não citar). Efeito narrativo: números menores parecem mais conservadores e credíveis diante de um grupo que gere folha.
- Ações na implementação: trocar o padrão para 180, ajustar testes e textos que citem os valores antigos, conferir impressão (os valores impressos vêm do padrão).

### 7. Slide 14 Q1/riscos psicossociais: imagem e alerta de multas NR-1
- Ramo A: imagem fotográfica. Risco: banco de imagem genérico, "cara de IA"; direitos.
- Ramo B: **infográfico vetorial premium**: selo/escudo "NR-1 · riscos psicossociais" + faixa de alerta âmbar com duas camadas: "o que a norma pede (gerenciar riscos, incluindo psicossociais)" e "o que acontece sem gestão: fiscalização e penalidades". 
- Ramo C: ilustração gerada rotulada.
- **Escolha: B.** Alerta com tom institucional, não amedrontador. **Sem valores de multa na tela**: o enquadramento (item, gradação, porte, faixa) ainda não foi conferido em fonte oficial acessível (pendência da V4); a peça diz "as penalidades dependem do enquadramento (NR-28); confirme com SST e jurídico" e leva ao link oficial. O que a norma exige também deve ser conferido no texto oficial antes de qualquer data de vigência na tela.
- **Pendência de validação:** texto oficial da NR-1 e da NR-28; data de vigência da exigência; faixas de multa.

### 8. Slide 18: por que o dashboard institucional não abre
Observado no código e no teste local:
- Os botões "Abrir dashboard institucional" apontam para as telas do app (`/ivo-integral/q2` e `/ivo-integral/acoes`) em nova aba. Essas telas exigem **conta autorizada, organização vinculada e leitura publicada** (há redirecionamento de login com retorno à tela). A senha da proposta não vale para elas.
- A prévia local responde 200 nessas rotas, mas sem conta e sem a leitura da ISG carregada não há dado para mostrar.
- Portanto o motivo é duplo: (1) acesso próprio do app, (2) a leitura FIB-T da ISG ainda não foi carregada/publicada. Nada disso é falha da proposta, mas a pessoa na reunião cai em tela de login — ruim para a apresentação.
- Ramos: A publicar o app no Lovable e criar conta de demonstração (**decisão sua; não faço**); B incorporar na própria proposta uma **demonstração sintética sem login** (capturas das duas telas com dados fictícios identificados); C manter só o link.
- **Escolha: B agora; A quando você decidir publicar.** O botão secundário passa a dizer "Entrar com conta autorizada" e o primário mostra a demonstração dentro da proposta.

### 9. Entrada sequencial de cartões (slide 20 e similares)
- Ramo A: fade+subida escalonada (60–90 ms entre cartões, 12–16 px, 350–450 ms, curva suave) ao entrar no slide. 
- Ramo B: desenho de linha ligando cartões (jornada se "desenhando"). 
- Ramo C: contador/zoom (descartado: cansa).
- **Escolha: A em todos os slides com sequência de cartões, mais B só no slide da jornada (linha de tempo).** Componente único `Reveal` com `data-reveal-index`; dispara quando o slide fica ativo (reinicia ao voltar); **desligado com `prefers-reduced-motion`, na impressão e na pilha do celular**; conteúdo nunca fica invisível se o script falhar (estado final por padrão, animação só como realce).

### 10. Sincronização página × apresentação
- Hoje: slides e página leem o mesmo conteúdo do servidor (`isg-content.server.ts`) e há teste de paridade; as mudanças da V4 passaram nesse teste (45 testes do módulo).
- Limites honestos: parte dos slides tem marcação própria; paridade de **texto e ids**, não de aparência. Mudanças de design (grid, animação, infográfico) precisam ser aplicadas nos dois lados ou declaradas como "só no modo apresentar".
- Regra V5: toda alteração de conteúdo vai na fonte única; todo componente novo tem variante `slide` e variante página; teste de paridade estendido aos novos blocos.

### 11. Slide 30 Brasília: fundo e logos
- Faz sentido, com cautela. Ramo A: foto real licenciada (crédito visível). Ramo B: **silhueta vetorial** (Congresso, Catedral, Eixo Monumental) em duotone verde/dourado a ~10–14 % atrás do título, rotulada "ilustração". Ramo C: só malha atual.
- **Escolha: B agora; A se o fundador fornecer foto licenciada.** Logos do Instituto e da ISG juntos no rodapé do slide, mesma altura, com área de respiro. **Pendência:** confirmar autorização de uso do logo da ISG; foto autêntica e crédito.

---

## Parte 2 · Nove intervenções adicionais (sem poluir)

1. **Ritmo de cadência:** alternar slides densos com "respiros" (uma frase, um número) a cada 3–4 slides.
2. **Título que conclui:** todo título de slide diz a conclusão, não o tema.
3. **Barra de jornada contínua:** miniatura dos cinco Qs no rodapé, com o atual destacado (orientação sem esforço).
4. **Tipografia com opinião:** serifada nos títulos (já), numerais tabulares nos dados, medida de linha ≤ 65 caracteres; fim de títulos órfãos.
5. **Cor com função:** três cores de movimento + 1 de alerta (âmbar). Nada de gradiente decorativo fora dos capítulos.
6. **Imagens com assinatura do Instituto:** tratamento único (duotone verde/dourado, grão leve) em toda imagem, para unificar e afastar o look de banco de imagem.
7. **Micro-interação de "nota do apresentador":** resumo de 1 linha por slide visível só no modo apresentador (apoio ao roteiro de 5 minutos).
8. **Estado "o que decidimos hoje":** slide final com as decisões pedidas à ISG, em três itens, ligado à reunião de implantação.
9. **Convite de leitura:** em slides com janelas "Entenda", um rótulo curto "Resposta · Exemplo · Fonte", como já definido para janelas.

Teste de contenção: cada intervenção deve poder ser removida sem quebrar o slide. Se mais de duas aparecerem juntas no mesmo slide, cortar.

---

## Parte 3 · Contra o "visual de IA" (diretrizes para o executor)

Não existe skill instalada neste ambiente dedicada a isso (as disponíveis cobrem acessibilidade e UX do VitalOS; o guia de design de artefatos serve a artefatos, não a esta proposta). As regras abaixo ficam no próprio super prompt:
- Sem roxo-azul neon, sem brilho/glow, sem emojis, sem cartões idênticos em fila infinita, sem ícone em círculo para tudo, sem sombras em excesso, sem simetria total.
- Variar a escala: um elemento grande por slide e o resto contido; alinhamento assimétrico intencional.
- Texto específico do Instituto e da ISG, com fatos; proibido "transformar", "potencializar", "jornada incrível" vazios.
- Imagem original ou vetorial própria; nunca ilustração genérica de pessoas apertando mãos.
- Tom editorial (revista institucional), com margem generosa e hierarquia clara.

---

## Parte 4 · O super prompt (a executar após aprovação)

> **Papel.** Você é diretor(a) de design editorial e engenheiro(a) front-end sênior, trabalhando na proposta `/proposta` do Instituto Felicidade para Todos à ISG Participações, sobre a branch `codex/proposta-isg-v4` (HEAD `d914cdf`). Mantenha o tom executivo e institucional, o status honesto de cada recurso (Q1 = etapa seguinte da implantação) e a regra de não afirmar nada sem fonte nos arquivos. Não faça merge, push, publicação nem envio à ISG. Não toque em produção, banco ou Lovable.
>
> **Entradas.** Este documento (Partes 1–3), `CLAUDE.md`, `src/features/proposal/*`, `src/lib/proposal/isg-content.server.ts`, tokens oklch em `src/styles.css`. Não ler o Work Wellbeing Playbook.
>
> **Processo.** (1) Antes de editar, escreva ≤ 5 linhas comparando alternativas para cada item aprovado. (2) Implemente em três lotes: (a) conteúdo e fontes (slide 2, slide 3, R$ 180, slide 14 com alerta, pendências), (b) visual e navegação (grid, bento do slide 5, dataviz 7–8, Reveal, Brasília, logos), (c) verificação. (3) Cada lote termina com testes verdes e captura.
>
> **Regras.** Fonte única de conteúdo; toda mudança em página e slides; paridade testada. Nada de valores de multa, datas ou números sem fonte registrada (se faltar, registrar como pendente). Sem números do site da ISG além dos declarados (6 unidades, 4 frentes). Dados externos sempre com origem, ano e escopo; Gallup como associação. Acessibilidade: contraste AA medido com a grade ligada, foco visível, teclado, Esc e retorno de foco nas janelas, `prefers-reduced-motion` desliga animação, impressão sem grade nem animação, 320–390 px sem rolagem horizontal, 16:9 sem transbordo (os 37 → novo total de slides).
>
> **Critérios de aceite por item.** Slide 2 removido com página coerente e paridade ok. Slide 3: infográfico com fonte e data. Grid: máscara, ≤ 6 % de opacidade, ausente em capa/capítulo/impressão. Slide 5: um destaque + cartões, sem números novos. Slides 7–8: título-conclusão, "como ler", fonte em linha. Slide 12: padrão R$ 180, variação −R$ 1.800, testes e impressão atualizados. Slide 14: infográfico vetorial, alerta sem valores de multa, link oficial. Slide 18: demonstração sintética sem login e botão rotulado "Entrar com conta autorizada". Reveal: um componente, desligado em reduced-motion/impressão/celular. Slide 30: silhueta vetorial rotulada e logos lado a lado, ou foto licenciada com crédito.
>
> **Entrega.** URL de prévia, lista de slides alterados, fontes, testes, capturas desktop/16:9/mobile/impressão, auditoria de contraste, ficha V5 com pendências e revisão por quatro perspectivas (comercial, metodologia/SST, design/acessibilidade, engenharia/acesso), apenas com evidência observável.

## Rubrica do conselho (para aprovar/ajustar)
Para cada item: ☐ Aprovo ☐ Aprovo com ajuste ☐ Rejeito. Critérios: clareza executiva · beleza sóbria · honestidade de fonte · acessibilidade · custo de manutenção · risco para a relação com a ISG.

## Pendências que bloqueiam partes da execução
1. Expansão oficial do selo GPTW e uso do logo da ISG.
2. Textos oficiais NR-1/NR-28 (vigência, faixas de multa).
3. Lista dos apps/projetos do slide 5.
4. Foto licenciada de Brasília e crédito (opcional).
5. Decisão de publicar o app (para o dashboard real).
