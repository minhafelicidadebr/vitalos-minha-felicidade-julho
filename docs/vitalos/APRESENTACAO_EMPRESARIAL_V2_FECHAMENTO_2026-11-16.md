# Apresentação empresarial V2 — fechamento local

Base preservada: `bbb7d5577b03aaef82814359aa00120d3b81dd17`, branch `feat/ivo-fibt-platform-foundation`. Evolução autorizada do superprompt V2; registros V1 permanecem históricos. Nenhum dado de cliente, banco, migration, configuração de acesso ou publicação foi alterado.

## Implementado

Dezoito capítulos no mesmo deck protegido: nova proposta de ganhos para a empresa; curadoria científica; Playbook e condições do trabalho; caso externo Heineken/PERMA-V. Ciclo, perspectivas IVO e jornada Q2 reaproveitados. PERMA como modelo, PERMA-Profiler como instrumento e ampliação com vitalidade estão distinguidos; Q3/Q4 continuam previstos. O relatório ganha referências temáticas ODS 3.4/8.8 sem equivalência de indicadores ou impacto presumido.

Fontes externas ficam acessíveis no slide e nos detalhes. Micro-CTAs ganharam ícone e contorno com alvo mínimo de 44 px. O botão de fechar passou a acompanhar a rolagem interna dos painéis. Nenhuma nova dependência, agente, corpus, LLM ou banco vetorial.

O módulo `narrative-v2.server.ts` monta a evolução editorial no servidor sobre os capítulos existentes, preservando identificadores e contratos. Não é importado pelo cliente. A API autenticada permanece a única entrega do deck. A montagem não concede autorização de claims.

## Conteúdo numérico concreto para revisão

[Matriz de fontes e decisão](APRESENTACAO_V2_FONTES_E_REVISAO.md) e [composição visual responsiva](artifacts/PRESENTATION_V2_NUMERIC_REVIEW.html) apresentam os três conjuntos propostos: OMS, diferenças de engajamento Gallup e trajetória de adesão Heineken. A composição usa cards, fontes próximas, barras de 0–100% e tabela equivalente. Inclui o relato de 2026 e calcula 43,3 pontos percentuais para 2022–2025.

Esses números não integram o payload comercial: o resolver canônico recusa a nova superfície e o registry está frozen. Não foi atribuída aprovação humana, alterado frozen nem criado mecanismo paralelo. A apresentação operacional usa descrição qualitativa e referências clicáveis enquanto essa decisão está pendente. A peça de revisão fica em `docs/`, fora dos assets públicos.

O Playbook é apresentado como referência bibliográfica para expansão da curadoria. A participação WRC/Oxford e Indeed é atribuída à obra; não à VitalOS. A autorização ampliada está em tratativa conforme esclarecimento do usuário. Não há cópia de slides, gráficos ou recomendações extensas nem uso de logos de terceiros. Direitos COPSOQ não foram reabertos.

## Validações do candidato

- Testes direcionados: 20 pass, 0 fail, 147 asserções. O sandbox exibiu avisos de diretório; a execução integrada posterior ocorreu fora dessa restrição e passou.
- Gate integrado: **4.407 pass, 0 fail, 350 arquivos, 13.839 asserções**; paridade, TypeScript e secret-scan aprovados.
- ESLint dos seis arquivos TS/TSX alterados: aprovado. Prettier aplicado aos arquivos próprios; `git diff --check` sem erro.
- Build inerte isolado aprovado, sem alterar a `.output` preservada. Cinco fontes finais conferidas por SHA-256 contra cópia compilada e servida; 316 assets públicos de código/dados sem marcadores protegidos. [Artefato](artifacts/PRESENTATION_V2_BUILD_2026-11-16.json).
- Onze provas HTTP aprovadas, incluindo entrega de 18 capítulos autenticados, recusa anônima, origens, logout/replay e concorrência do limite de tentativas. [Artefato](artifacts/PRESENTATION_V2_HTTP_2026-11-16.json).
- Navegador real: entrada por senha, edição V2, 18 painéis abertos/fechados, Enter/Escape e retorno de foco representativo. Painel mobile rolado até o fim com foco contido e fechar visível. Os 18 capítulos sem overflow do documento/cards em 320, 360, 391, 768, 1024 e 1440 px. [Prova sanitizada](artifacts/PRESENTATION_V2_BROWSER_2026-11-16.json), [desktop](artifacts/PRESENTATION_V2_DESKTOP.jpg) e [mobile](artifacts/PRESENTATION_V2_MODAL_MOBILE.jpg).

Foi encontrado overflow no rótulo “Desenvolvimento” a 391 px. Corrigida a quebra de palavras com `min-width: 0` e `overflow-wrap`; reflow repetido nas seis larguras e build isolado refeito sobre o CSS final. O gate de lógica anterior continua aplicável; não foi repetido por essa correção de estilo. A captura mobile contém margem de canvas da ferramenta fora do viewport; a verificação de reflow usa as larguras CSS medidas. Não se afirma validação pixel a pixel de todos os dispositivos.

Os pop-ups funcionaram na URL local entregue. Não foi possível identificar qual prévia o usuário havia aberto; uma imagem estática continua sem interação. Não se atribuiu uma causa histórica não reproduzida.

O launcher recusou uma segunda instância porque a porta 8093 já estava ocupada pelo servidor descartável existente; ele foi reutilizado com as fontes conferidas. A prova HTTP esgotou intencionalmente o orçamento de tentativas: a recusa inicial no navegador é proteção esperada, sem alteração de limite ou reinício para contorná-lo.

## Limites e próxima decisão

Implementação e provas são locais. CI atual, staging e produção não foram consultados/publicados. O gate não comprova eficácia, homologação, acessibilidade assistiva integral ou conversão comercial. O acesso continua com sessão/limite por processo e exige decisão de infraestrutura antes de runtime distribuído.

**Próximo marco:** revisar os três conjuntos numéricos e suas superfícies no mecanismo canônico; depois integrar os valores aprovados na mesma narrativa. Publicação remota permanece uma etapa separada, dependente de destino e autorização específica. `.q.out` e `.q.sql` preservados e não lidos.
