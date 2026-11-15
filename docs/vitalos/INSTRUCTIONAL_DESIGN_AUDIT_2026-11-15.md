# Auditoria dirigida de design instrucional e organização visual

## Execução posterior — primeira onda de apresentação

Implementados: identidade/preparação Q1 com blocos de metadados e aviso de efeito operacional; leitura Q2 com identidade agrupada, explicação das escalas, estados textuais e tabela em região rolável identificada/focável; cobertura com limites destacados; glossário de governança em grade responsiva e listas mais espaçadas; prática educativa com privacidade, preparação e revisão em blocos separados. Alterações anteriores de resumo e metadados das ações foram preservadas.

Mobile, revisão estática: metadados empilham antes de `sm`, textos longos podem quebrar, cards usam `min-w-0`, tabela preserva largura mínima em rolagem própria e setores Q2 só passam a duas colunas em `xl`. Links de ação existentes mantêm altura mínima de 44px. Ícones são decorativos e acompanham texto. Não houve mudança de cálculo, acesso, schema ou persistência. Não foi criada biblioteca visual nova.

Verificação do candidato: 89 testes de componentes IVO aprovados (7 arquivos), TypeScript e `git diff --check`. Não houve novo gate de banco. A qualidade renderizada em 360/390px, zoom 200%, leitor de tela e temas ainda precisa de prova visual; a ferramenta teve interrupções de validação de URL registradas nas etapas anteriores, sem recuperação comprovada. CSS responsivo e teste DOM não demonstram ausência de overflow, contraste ou oclusão no dispositivo real. Sem alegação de percentual de melhoria.

Escopo restante da auditoria: formulário de eficácia, cards detalhados de decisão e superfícies RH/Academia/Voz Segura/legadas/projetivas não receberam redesign integral nesta primeira onda. Próxima verificação: prova visual da primeira onda em mobile e desktop antes de propagar seus padrões para essas superfícies. Este adendo é o estado atual; as seções abaixo preservam o diagnóstico e a proposta anteriores.

Base: HEAD `1975659`, branch `feat/ivo-fibt-platform-foundation`, com alterações locais anteriores preservadas em ActionFollowUp.tsx e FibtActionLoop.tsx. Inspeção estática seletiva de código. Não é auditoria visual integral nem teste de usabilidade. Não houve acesso a ambientes remotos, dados reais, .env, .q.out ou .q.sql. Nenhuma funcionalidade foi alterada nesta auditoria.

## Diagnóstico

A melhoria prioritária não é acrescentar ícones indiscriminadamente: é tornar reconhecíveis a origem da informação, seu estado, o significado permitido, a próxima ação e o limite de interpretação. Conteúdo demonstrativo não pode ganhar aparência de resultado validado. A presença de código ou import não comprova disponibilidade para todos os perfis; o alcance depende de sessão, capability e controles existentes.

Oportunidades abaixo são hipóteses de UX fundamentadas na estrutura do código. Não foram medidas frequência de erros, satisfação, contraste renderizado ou tempo de tarefa. “120%” representa ambição, não resultado quantitativo.

## Inventário e prioridade

| Superfície | Evidência no código | Oportunidade e impacto esperado | Prioridade / aceite |
| --- | --- | --- | --- |
| Leitura Q2 `/ivo-integral/q2` | `src/components/ivo/IvoQ2Detail.tsx:107` identidade; `:63` tabela; `:94` escore bruto | Separar identidade, publicação/proteção e interpretação; explicitar escalas distintas. Preservar tabela semântica e não inventar faixas de risco | P1: usuário distingue fator 0–4 de escore 0–12; protegido nunca vira zero ou barra vazia |
| Governança `/ivo-integral/governanca` | `src/components/ivo/IvoGovernanceView.tsx:13` contrato de decisões; `:325` efeito D9; `:338` estados | Cartão por decisão: estado → efeito no produto → fonte → responsável/próxima etapa. Detalhes extensos em divulgação progressiva | P1: proposta não aparenta aprovação; preparar decisão não aparenta gravação |
| Preparação Q1 | `src/components/ivo/CopsoqPreparationNotice.tsx:8` | Quadro “confirmado / correspondência pendente / efeito operacional”; versão e instrumento em metadados distintos | P1: bloqueio e motivo reconhecíveis sem sugerir reaprovação da fonte brasileira ou destravar coleta |
| Eficácia nas ações | `src/components/ivo/EfficacyPanel.tsx:194`, `:208`, `:229`, `:239`, `:270` | Preservar fieldsets existentes; acrescentar mapa das etapas, resumo das pendências e diferença entre salvar rascunho e registrar protocolo | P1: distinguir rascunho, protocolo, observação e avaliação; nenhum progresso gráfico significa eficácia |
| Prática/aplicação nas ações | `src/components/ivo/LearningApplicationJourney.tsx:55`, `:98`, `:167` | Sequência visual compreender → recuperar → preparar → revisar; separar privacidade, TESTE e rastro compartilhado | P1: pessoa identifica o que fica privado e o que será registrado; sem certificado/nota implícitos |
| Visão IVO `/ivo-integral` | `src/components/ivo/IvoCoveragePanel.tsx:27`; `IvoLensMatrix.tsx:67`, `:118` | Legenda de estados com ícone + texto e limites próximos dos dados; preservar grade e alertas existentes | P2: ausente, protegido e mapeamento pendente são distinguíveis; não criar índice composto |
| Painel RH `/rh` | `src/app/dashboards/rh/RHDashboard.tsx:24`, `:32`, `:52`, `:73`, `:92` | Orientar entrada institucional por tarefas: organização → módulos → mensuração → ações. Separar claramente a ramificação demonstrativa | P2: conta institucional não confunde exemplo com dado próprio; manter fronteira de sessão existente |
| Academia `/academia` | `src/routes/academia.tsx:34`, `:35`, `:165`, `:224` | Explicitar por que a trilha aparece, fonte dos agregados e natureza demonstrativa do progresso; mapa de objetivo/prática/revisão | P2: distinguir afinidade demonstrativa de personalização real e progresso de sessão de persistência |
| Voz Segura `/voz-segura` | `src/routes/voz-segura.tsx:8`, `:37`, `:38`, `:39`, `:69` | Preservar dinâmicas já existentes; orientar escolha e retomada com mapa de etapas e síntese de limites | P2: execução de sessão não aparenta histórico empresarial persistido; não duplicar rail existente |
| Plano legado `/plano-acao` | `src/routes/plano-acao.tsx:650`, `:692`, `:874`, `:1043` | Já possui agrupamento de responsável/prazo/métrica: reutilizar essa qualidade. Revisar densidade de textos 10–11px e identificação do modo demo/cloud | P2: estado e origem permanecem legíveis; não fundir ledger legado e PI-13 por aparência |
| Prioridades `/prioridades` | `src/routes/prioridades.tsx:9`, `:10`, `:223` | Dar destaque à natureza demonstrativa dos pontos de alavancagem, premissas e limites antes de ampliar destaque numérico | P1 para transparência; expansão visual depois. Aceite: projeção não é lida como efeito garantido |
| Experimentos `/experimentos` | `src/routes/experimentos.tsx:28`, `:30`, `:130`, `:327`, `:420` | Diferenciar caso demonstrativo, hipótese, execução e resultado; revisar contexto do título “Comprovados” | P1 para transparência: título não transfere validação dos casos-exemplo para a empresa |
| Trajetória `/trajetoria` | `src/routes/trajetoria.tsx:428`, `:458`, `:478` | Projeção IVO, custo evitável e prontidão ESG precisam de origem/premissas/limites visíveis junto ao número | P1 para revisão de transparência. Não tratar indicadores projetados como relatório ESG ou impacto observado |

P1 significa primeira revisão recomendada, não defeito de segurança confirmado. P2 é consolidação posterior. Plataforma/convites foi localizada, mas não recebeu inspeção suficiente do componente delegado para um achado específico: permanece fora da conclusão detalhada desta rodada.

## ToT — alternativas e decisão

Notas de julgamento de engenharia, sem medição com usuários. Todas as colunas usam 10 = favorável; custo, risco, complexidade e tempo avaliam economia, baixo risco, simplicidade e rapidez.

| Caminho | Valor | Segurança | Custo | Risco | Tese | Reuso | Simplicidade | Escala | Rapidez |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Ajustes locais por página | 8 | 9 | 9 | 9 | 9 | 6 | 9 | 6 | 9 |
| B. Redesign integral imediato | 8 | 6 | 3 | 4 | 7 | 8 | 3 | 8 | 3 |
| C. Protótipo isolado antes de integrar | 6 | 9 | 7 | 9 | 7 | 5 | 7 | 5 | 6 |
| D. Adiar toda melhoria | 2 | 9 | 10 | 8 | 3 | 2 | 10 | 2 | 1 |
| E. Integrar biblioteca externa | 5 | 6 | 4 | 5 | 5 | 7 | 4 | 7 | 4 |
| F. Criar pequeno núcleo visual após duas aplicações | 9 | 8 | 7 | 8 | 9 | 9 | 7 | 9 | 7 |

Escolha: A primeiro, F após comprovar repetição. B/E têm custo e risco desproporcionais; C serve para uma interação nova, não precisa preceder agrupamentos simples; D mantém a carga de interpretação. Não somar notas como avaliação objetiva de produto.

## Sequência de aprimoramento

1. Leitura Q2 + preparação Q1: estados, escalas e procedência, com mudanças somente de apresentação. Primeiro incremento recomendado.
2. Governança + eficácia: linguagem operacional, pendências e ações distintas, mantendo avisos essenciais sempre visíveis.
3. Aprendizagem: sequência, compartilhamento e retomada; sem novo armazenamento de respostas.
4. Extrair apenas padrões que se repetiram: cartão de metadados, aviso de interpretação e legenda de estados. Usar tokens e Lucide existentes, sem dependência nova.
5. Revisar as superfícies demonstrativas/projetivas em onda separada: transparência vem antes do destaque de resultados. Não promover mocks a dados reais.

## Verificação e futura avaliação

Por incremento: testes relevantes de apresentação/estados e TypeScript; build quando bundling/rota/config forem afetados. Sem repetir gates de banco por alteração visual. Conferir navegador em 360px, tablet e desktop, zoom 200%, temas claro/escuro, teclado e leitor de tela. Rótulos textuais acompanham ícones, cor não é a única informação; preservar ordem semântica, alertas, foco e área de toque. Gráficos só quando explicarem dado real e autorizado; sem percentual de progresso metodológico inventado.

Validar futuramente com tarefas: “qual a origem?”, “o que este número significa?”, “o que ainda não se pode concluir?”, “qual a próxima ação?” e “o que será compartilhado?”. Comparar compreensão, erros e necessidade de ajuda antes/depois; pactuar metas antes do teste. Sem prometer melhoria percentual ou homologação de acessibilidade nesta inspeção.

Verificação desta entrega: revisão do diff documental. Nenhum código alterado, teste/build/gate reexecutado ou prova visual nova realizada. Os dois arquivos de UI modificados anteriormente continuam preservados, sem stage/commit nesta rodada.
