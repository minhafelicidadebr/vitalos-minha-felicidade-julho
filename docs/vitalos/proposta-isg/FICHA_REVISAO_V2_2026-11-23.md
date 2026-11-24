# Ficha de revisão · proposta à ISG · V2 Master Plus

**Data:** 23/11/2026 · **Branch:** `feat/proposta-v2` (sobre a `main` `cd3feae`) · **Base do pedido:** `SUPERPROMPT_PROPOSTA_V2_MASTER_PLUS.md` (rev. 3) e as decisões do fundador registradas em `docs/vitalos/decisions/PROPOSTA_V2_FOUNDER_APPROVAL_2026-11-23.md`.
**Estado:** implementado e verificado localmente. **Nada publicado, nenhum push, nenhuma mudança no Lovable.**

## 1. O que mudou (por pedido do fundador)

| Pedido | O que foi feito | Onde |
|---|---|---|
| P1 Nova tese | "Ciência da felicidade aplicada ao trabalho, com decisões que a empresa acompanha", com o rótulo "VitalOS, sistema operacional da vitalidade organizacional"; ESG só como horizonte ("registros que podem apoiar o relato de sustentabilidade") | `isg-content.server.ts` · `hero` |
| P2 Slides horizontais | Botão **Apresentar** → 11 slides 16:9 derivados do mesmo conteúdo. Teclado (setas, Espaço, PageUp/PageDown, Home/End, F, Esc), `#slide-N`, barra de progresso, anúncio ao leitor de tela, foco no título de cada slide e retorno do foco ao botão. Em tela estreita ou em pé, empilha na vertical | `ProposalSlides.tsx` |
| P3 Imagens e transições | Três faixas com ilustração cinematográfica (título + resumo sobre película escura) usando as imagens geradas da V4, com procedência já registrada e rótulo "Ilustração gerada · pessoas fictícias". Revelação discreta de blocos (450 ms), zoom suave da ilustração, troca de slide de 350 ms; tudo desligado com movimento reduzido | `ProposalSections.tsx` · `motion.ts` · `proposal.css` |
| P4 Cronograma de 3 meses | "Quinze meses, cinco etapas de três meses": faixa de 15 meses colorida por etapa (decorativa) + lista semântica mês a mês com foco, atividades, trechos condicionados tracejados e o marco de aceite com a parcela | `ScheduleSection` |
| P5 Estratégia de preço | Destaque passa a "**R$ 12.000 por etapa**" e "cerca de **R$ 4.000 por mês**" (equivalente derivado = parcela ÷ 3, rotulado). O **total R$ 60.000** continua visível sem abrir nada, no resumo, no bloco de investimento, na tabela de marcos, nos slides e no PDF. Termos: "faturamento por etapa, não mensal" | resumo · bloco de investimento |
| P6/P12 Equipe | "Quem conduz": três cofundadores com retrato, rótulo, bio de até 45 palavras (só dos textos colados), papel proposto | `TeamSection` · `src/assets/proposal/team/` |
| P7/P11 Ciência | "Ancorado na ciência do bem-estar": bloco do Playbook (+3.000 estudos, Guia Prático, atribuição à obra) e cinco âncoras com ícone e status (Playbook, PERMA, VIA-T, FIB, mapeamento de Q1 com coleta condicionada) e o princípio "não há fórmula mágica" | `ScienceSection` |
| P8 Caso Heineken | Caso externo atribuído, sem logo, só o conteúdo já aprovado na V3/V4 | `ScienceSection` |
| P9 Cores da marca | Paleta do Instituto em tokens oklch escopados a `.proposal` (claro, escuro e impressão); acentos Q1–Q5 com as cores da marca | `src/styles.css` |
| P10 Números | "O que o Instituto já fez" (+110.000 respostas, +219 municípios, +700 instituições de ensino, +1.300 projetos escolares, recorde declarado) separado de "O que a literatura mostra" (Gallup 4× / −59%), com contadores animados | `TrackSection` |

## 2. Governança das afirmações

- **Commercial Claims Registry 1.2.0:** novos `CLAIM-COM-PROPOSAL-PLAYBOOK-001` e `CLAIM-COM-PROPOSAL-INSTITUTE-TRACK-001`; superfícies da proposta acrescentadas a `BENEFITS-001`, `VIAT-EXPLORATORY-001` e `INSTRUMENT-LABEL-001` sem mudar texto. Todo número e todo texto científico da página é resolvido do registro, no servidor.
- **Fail-closed:** se um claim expirar ou sair, o bloco mostra estado vazio ("Nenhum número é exibido sem registro aprovado") em vez de um número solto (testado).
- **Não implementado, por falta de fonte primária conferida:** "instrumento de Copenhague". A âncora de Q1 usa o rótulo já aprovado.
- **Logos de terceiros** (Oxford, Heineken, World Wellbeing Movement): **não usados**. Estão em quarentena local em `src/assets/proposal/third-party-logos/`, fora do commit. Recomendação: só como "fontes citadas" e com autorização escrita das marcas (superprompt §4.9).

## 3. Verificação

| Verificação | Resultado |
|---|---|
| Gate | `bun run gate`: 4.728 testes / 0 falhas, paridade OK, `tsc` limpo, secret-scan OK; ESLint 0 erros nos arquivos tocados |
| Testes novos | cronograma (15 meses relativos, 1 marco por etapa, sem datas), equivalente mensal derivado, números e ciência vindos do registro, fail-closed, bios ≤ 45 palavras sem cargo público/instituições-halo, termos vetados só em forma negada, seções e âncoras, modo apresentação por teclado com retorno de foco |
| Rolagem horizontal | 320, 360 e 1440 px: `scrollWidth` = largura da janela |
| Imagens | nenhuma quebrada; retratos de 10–15 KB; ilustrações com `loading="lazy"` abaixo da dobra e `fetchPriority="high"` no topo |
| Console | sem erros (um 404 transitório do servidor de desenvolvimento não se repetiu numa recarga limpa) |
| Contraste AA | claro: 591 textos, 0 falhas (o rótulo ciano estava em 4,07–4,45:1 e foi escurecido um tom); escuro: 588 textos, 0 falhas. Texto sobre ilustração fica sobre película escura de 55–86% |
| Slides | 11 slides a 1440×900 sem transbordar; Esc devolve o foco a "Apresentar"; em 360 px os slides empilham |
| Movimento reduzido | revelação, zoom, contadores e troca de slide desligados |
| Impressão | contadores forçados ao valor final ao imprimir (**bug encontrado e corrigido**: imprimir sem rolar a página saía com "+0"); blocos escuros invertidos para papel; faixas sem imagem e com texto escuro; links com endereço; PDF A4 gerado |

**Não verificado:** leitor de tela real, Safari/iOS, diálogo de impressão do navegador do usuário, ambiente publicado, Core Web Vitals medidos em produção.

## 4. Pendências que só o fundador resolve

1. **Conferir na prévia se cada retrato está com o nome certo** (correspondência inferida, não confirmada).
2. **Duração do Q5** e etapas sequenciais: o calendário assume 5 × 3 meses (15 meses), como informado para Q1–Q4.
3. "Sistema ESG 9.17": não citado; a bio usa "soluções ESG".
4. Autorização escrita das marcas, se quiser exibir logos de terceiros.
5. Confirmação individual de cada cofundador antes de o link ir à ISG (recomendado).

## 5. Capturas

`capturas/v2/`: topo em desktop e celular (320/360), seções (números, ciência, faixa, cronograma, investimento, equipe), slides 1, 3, 4, 8, 9, 10, slides empilhados no celular e `proposta-v2-impressao.pdf`.
