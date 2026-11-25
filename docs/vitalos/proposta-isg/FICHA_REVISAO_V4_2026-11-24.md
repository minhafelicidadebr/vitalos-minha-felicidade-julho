# Ficha de revisão · proposta à ISG · V4

**Data:** 24/11/2026 · **Branch:** `codex/proposta-isg-v4` (a partir de `cab108d`) · **Estado:** alterações locais, sem commit. Sem merge, sem publicação, sem envio à ISG.

## Decisão (revisão integrada)
Seis caminhos comparados (ajuste pontual, só conteúdo, só visual, reescrita, nova rota, revisão integrada). Escolhida a revisão integrada em três lotes (conteúdo e fontes, visual e navegação, verificação), pois conteúdo, slides e página precisam continuar em paridade.

## Slides/seções alteradas (37 slides)
- 8 Evidências: números OMS/OIT, grupos por cor (saúde e presença, desempenho e retenção, adaptação e inovação), seleção por contorno, sublinhado e "Selecionado"; Gallup como associações; densidade reduzida para caber no 16:9.
- 15–16 Q1/Q2: explicação COPSOQ/NR-1 (a NR-1 não prescreve instrumento), "Como funciona a fiscalização?", contexto FIB/FIB-T.
- 18 Demonstração: caminho principal leitura coletiva → prioridade → ação → responsável → evidência → reavaliação; dashboard institucional como secundário.
- 21–26 Q1 como etapa seguinte da implantação; Q5 e novo slide 25 "Do primeiro ciclo ao plano do próximo ano" (capa ilustrativa rotulada; meses 13/14/15; S e G, ambiental só onde há indicadores).
- 29–30 Transição e "O próximo passo para Brasília" com três movimentos e "Como a ISG pode contribuir?".
- Página: seção `#q5-plano`, faixa de transição de Brasília, textos de status e vocabulário executivo.

## Verificação (observada)
- Chrome sem interface: 37 slides sem transbordo a 1440×900 (após correção do slide 8); sem rolagem horizontal a 1440/360/320; sem erros de console; Esc devolve o foco a "Apresentar".
- `tsc` limpo; 45 testes do módulo proposta passam (113 com claims, antes do último ajuste só de CSS); ESLint sem erros de regra (2 avisos de Fast Refresh); Prettier acusa estilo/CRLF em 15 arquivos da árvore (ambiente `autocrlf`, não corrigido para não inflar o diff).
- **Não verificado nesta rodada:** `bun run gate` completo, auditoria de contraste AA dos novos componentes, PDF/impressão dos novos blocos, movimento reduzido, 16:9 em tela cheia real, foco das novas janelas em celular, leitor de tela, Safari/iOS.

## Pendências para validação (não exibidas como fato)
1. Exemplo de enquadramento NR-28 (item, graduação, faixa, vigência): fontes oficiais não acessíveis; a janela explica critérios sem faixa.
2. Texto oficial da NR-1 confirmando ausência de instrumento obrigatório.
3. Afirmação PNUD–Centro de FIB do Butão (página retornou 403).
4. Números do FIB-T da ISG (quantidade, universo, respostas × pessoas): dependem da apresentação oficial restrita.
5. Data/ano do lançamento local em Brasília (22 de março): só 20 de março (ONU) está confirmado.
6. Foto autêntica licenciada de Brasília com crédito (hoje, malha geométrica).
7. "Maior pesquisa escolar do mundo": removido por falta de fonte.
8. Correspondência retrato ↔ nome dos cofundadores.

## Revisão por quatro perspectivas (evidência observável, sem aval externo)
- **Comercial:** sem preço no cronograma/jornada; status honesto (Q1 etapa seguinte); sem "parceria"/"chancela" (varredura de termos nos testes).
- **Metodologia/SST:** Domínio B separado; NR-1 sem promessa de conformidade; Gallup só como associação; sem percentuais inventados.
- **Design/acessibilidade:** seleção sem depender de cor; foco visível; Esc fecha janelas; falta fechar auditoria de contraste e impressão.
- **Engenharia/acesso:** conteúdo só no servidor atrás da senha da proposta (distinta da autenticação do app); testes de paridade página ↔ slides.
