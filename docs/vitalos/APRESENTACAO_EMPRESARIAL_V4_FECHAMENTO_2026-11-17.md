# Apresentação empresarial V4 — implementação e evidências locais

Base preservada: `840e1c3f00809ae6f1baccc09f7c6188a0869b46`, branch `feat/ivo-fibt-platform-foundation`. O usuário aprovou executar o [superprompt V4](SUPERPROMPT_APRESENTACAO_V4_IVO_PERFIS_AGIR_TRANSICOES.md). Estado inicial: nenhum arquivo rastreado alterado; `.q.out` e `.q.sql` não rastreados, não abertos e intocados.

**Resultado: candidato local implementado, com testes, build e jornada no navegador; prova visual integral de mobile e fullscreen nativo ainda incompleta.** Sem nota ou aprovação de comitê presumida, CI novo, staging ou publicação.

## Entrega e decisão de composição

Aplicada a alternativa incremental do roteiro aprovado: preservar as cenas e os contratos V3, introduzir três divisórias e dois focos novos, em vez de substituir novamente toda a apresentação. A narrativa completa tem **20 cenas**; o percurso executivo tem **9**, incluindo IVO e perfis e omitindo as divisórias. A leitura contínua usa o mesmo conteúdo, com divisórias compactas, sem reprodução automática ou clique adicional de entrada.

- Abertura e fechamento com imagens ilustrativas de pessoas brasileiras em situações executivas, mulheres, pessoas negras e colegas maduros. Três transições: compreender o contexto, colocar conhecimento em movimento e aprender com o percurso.
- Cena IVO: quatro lentes, quatro perspectivas e o percurso leitura → ação acompanhada → nova leitura comparável. O aprofundamento explica origem, registro, revisão e limites do cálculo. Nenhum placar, fórmula composta, curva de crescimento ou pontos por concluir ações.
- Explorador de perfis: direção, coordenação/RH, lideranças e participantes; cada seleção mostra participação, informação pertinente e estágio. Painel específico reutiliza o portal existente e devolve foco ao acionador.
- Miniatura interativa do dashboard da Alfa fictícia: leitura, aprendizagem, plano, ocorrência/aprendizagem e síntese. Medir, Agir e Provar são grupos do menu; as cinco etapas são explicações desta apresentação, não cinco novas abas do produto.
- Acompanhamento da mesma prática com responsável, condições, origem do registro e revisão. Resultado de bem-estar permanece a avaliar. Nenhuma escolha desta simulação cria dados ou autorizações.
- Aviso de fullscreen recusado deixa de cobrir as próximas cenas ao navegar. Links anteriores preservados; `#papeis` passa a apontar ao novo foco `perfis`.

Autenticação, API de acesso, sessão por processo, banco, módulos, regras dos instrumentos e decisões metodológicas preservados. Os quatro números autorizados da V3 continuam resolvidos no servidor pelo registry; nenhuma nova alegação quantitativa ou marca externa foi acrescentada. Instituições aparecem por nome e contexto.

## Mapa papel → fluxo → fonte → estágio

| Papel                       | Fluxo/fonte conferida no código                                                                                                     | Origem e autorização                                                                                                                      | O que a apresentação pode afirmar                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Direção                     | Papel de patrocínio no serviço; sem novo dashboard/permissão implementado nesta onda                                                | Finalidade, apoio e revisão combinados no serviço                                                                                         | Visão ilustrativa de participação, não um novo papel técnico concedido                                                                     |
| Coordenação/RH              | `src/routes/rh.tsx`; `src/app/dashboards/rh/RHDashboard.tsx:27`; `src/routes/ivo-integral.acoes.tsx:81`                             | RH distingue organização vinculada da demonstração. A rota Q2 carrega leitura, ação, educação e eficácia pelos contratos existentes       | Jornada institucional Q2 demonstrada localmente em ondas anteriores; o mini-dashboard atual é didático                                     |
| Coordenação/RH — ação       | `src/lib/api/ivo-action-loop.functions.ts:1`; `src/lib/ivo/fibt-action-loop.server.ts:5`; `src/lib/ivo/ivo-q2-reading.server.ts:68` | Sessão resolve empresa e papel; schema estrito recusa `orgId` do cliente; capacidade e posse verificadas no servidor                      | Escopo da própria empresa e módulos habilitados; não equivalência automática a todos os perfis                                             |
| Lideranças                  | `src/routes/lider.tsx`; `src/app/dashboards/lider/LiderDashboard.tsx:14`                                                            | Fontes de demonstração presentes no dashboard; não foi demonstrada uma jornada institucional equivalente à coordenação Q2                 | Responsabilidade no serviço e interface demonstrativa                                                                                      |
| Participantes               | `src/routes/colaborador.tsx`; `src/app/dashboards/colaborador/ColaboradorDashboard.tsx:34`                                          | Ramificação institucional com progresso pessoal na Academia; demonstração separada. Não há rastreamento individual de resposta à pesquisa | Academia implementada; ciclo Q2 completo deste perfil ainda a validar. A redação final foi precisada para reconhecer esse avanço existente |
| Administração da plataforma | `src/lib/identity/first-admin.server.ts:42`; `src/lib/auth/authorize.server.ts:14`                                                  | Autoridade de plataforma verificada separadamente da administração de uma empresa; convite institucional já existente                     | Habilitação e convites; nenhuma autoridade ou conta foi criada nesta onda                                                                  |

O agrupamento real do menu está em `src/app/shell/AppShell.tsx:181`. A demonstração não promete que todos os itens desse menu estejam operacionais institucionalmente. O contrato `src/engine/ivo/lens-contract.ts:87` impede `compositeScore`; `src/engine/ivo/efficacy-protocol.ts:44` distingue execução, efeito, causalidade e IVO. Esses contratos orientaram a narrativa, sem alteração metodológica.

## Imagens e desempenho

Quatro assets gerados com `image_gen`, **1672×941**, convertidos a JPEG qualidade 84, sem edição de conteúdo, redimensionamento ou corte. Pessoas e empresas são fictícias; legenda e alt descrevem a função ilustrativa. [Prompts e origem](artifacts/PRESENTATION_V4_IMAGES_2026-11-17.json). O asset Cherrydeck anterior foi preservado no repositório, mas não integra o bundle da apresentação V4.

| Medida no mesmo contexto de build local    |            V3 |            V4 |
| ------------------------------------------ | ------------: | ------------: |
| Resposta HTTP autenticada do deck          |  34.727 bytes |  45.954 bytes |
| JS da rota, bruto                          |  27.970 bytes |  33.580 bytes |
| CSS da apresentação, bruto                 |  28.299 bytes |  36.374 bytes |
| Imagem de abertura                         | 177.437 bytes | 221.134 bytes |
| Total dos assets de imagem da apresentação | 177.437 bytes | 956.234 bytes |

A abertura é prioritária; demais imagens têm carregamento tardio e dimensões intrínsecas. O aumento corresponde às novas experiências e aos quatro assets. Isso mede tamanho de arquivo, não tempo percebido, rede móvel ou Core Web Vitals. Não se presume ganho percentual de UX/design.

## Verificações e alcance

| Evidência                     | Resultado                                                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gate integrado final          | **4.424 pass / 0 fail**, 353 arquivos, 13.932 asserções; paridade, TypeScript e secret-scan aprovados                                                                                                                          |
| Testes novos                  | Nove cenários adicionais: conteúdo/transições/limites IVO, perfis, percurso no dashboard, origem do registro, imagens e painéis/retorno de foco. Testes existentes preservados                                                 |
| Lint / diff                   | ESLint dirigido dos arquivos de código e harness; `git diff --check` aprovado                                                                                                                                                  |
| Build final                   | Cópia inerte `.institutional-admin.local/module-build-1794914187149`; secret-scan de artefatos aprovado; `.output` preservada                                                                                                  |
| Conteúdo HTTP e fontes finais | Seis conferências focadas; 20/9 cenas e novos blocos servidos. Onze fontes/assets idênticos por SHA-256 entre workspace, cópia servida e compilada. [Artefato](artifacts/PRESENTATION_V4_BUILD_CONTENT_2026-11-17.json)        |
| Navegador real                | Login normal por senha, índice 20 cenas, painel IVO, seleção RH, painel específico, Escape/fechar e retorno de foco; etapas Agir/Provar e Enter; percurso executivo de nove cenas; recarga e leitura contínua observados       |
| Reflow medido no navegador    | 20 artigos sem overflow interno nos sete cenários: 320/360/391/768/1024/1440 px com altura 800 px, mais 768×320. Botões do conteúdo com altura mínima de 44 px nos cenários medidos                                            |
| Limites visuais               | Screenshot mobile com override falhou por timeout; uma captura incoerente com o posicionamento DOM foi rejeitada e removida. Fullscreen recusado pelo controle disponível, com recuperação normal; modo nativo não demonstrado |

O gate foi executado com `bun --no-env-file` explicitamente em cada etapa equivalente ao comando do projeto: testes `src scripts`, paridade, `tsc --noEmit` e secret-scan. Um erro de opção de teste foi corrigido antes da execução final. Um segundo build foi justificado pelo ajuste final que reconhece a Academia institucional do participante.

O harness geral `scripts/presentation-http-proof.ts` foi atualizado de 15/V3 para 20/V4; suas onze provas completas de autenticação **não foram repetidas**. A evidência V3 de autenticação continua válida, pois sua implementação não mudou. A conferência HTTP desta onda foi focada no novo conteúdo e nas fontes. Nenhuma prova de banco foi repetida.

[Evidência sanitizada do navegador](artifacts/PRESENTATION_V4_BROWSER_2026-11-17.json) e [captura desktop](artifacts/PRESENTATION_V4_DESKTOP_2026-11-17.jpg). A medição de layouts precedeu a precisão editorial final sobre a Academia; composição, estados e handlers permaneceram iguais. O texto final foi conferido em testes/HTTP/build. Não equivale a uma auditoria assistiva ou de dispositivos físicos.

O console mostrou um aviso de hidratação relativo ao atributo adicional `cz-shortcut-listen` no `body`; isso é compatível com injeção por extensão do navegador, não uma divergência comprovada do código da apresentação. Não foram desativadas extensões ou proteções.

## Arquivos e fronteiras

Código: `src/features/presentation/{EnterprisePresentation,PresentationVisual,PresentationExperience}.tsx`, seus testes, `navigation.ts`, `navigation.test.ts`, `types.ts`, `presentation.css`; conteúdo/testes em `src/lib/presentation/`; atualização do harness HTTP. Assets: quatro JPEG em `src/assets/presentation/`. Documentação: este fechamento, checkpoint e quatro artefatos sanitizados (incluindo captura desktop).

Nenhuma dependência nova, instalação, migration, operação remota, e-mail, conta real ou mudança no stack preservado. O launcher tentou iniciar a cópia de apresentação e recusou a porta já ocupada; foi reutilizado o processo local existente, sem encerrá-lo ou reinicializá-lo. `.q.out` e `.q.sql` não foram abertos, alterados, copiados ou incluídos no Git.

**Maturidade:** apresentação implementada e verificada localmente; experiência desktop e interações novas demonstradas; mobile com evidência estrutural, sem conferência visual integral. Fullscreen nativo, tecnologias assistivas, CI/staging e produção não confirmados nesta etapa. O controle de sessão/tentativas por processo ainda requer decisão de infraestrutura antes de ambiente distribuído.

**Próxima ação única:** concluir a conferência visual de mobile e fullscreen nativo no candidato atual, sem repetir gate/build/HTTP enquanto suas fontes permanecerem iguais.

Roteiro manual curto: abrir `http://localhost:8093/apresentacao/empresas` com a senha existente; conferir IVO/perfis/jornada em 320 e ~390 px; abrir e rolar painel, fechar e conferir foco; entrar em tela cheia pelo controle da página, rolar uma cena longa, abrir índice/painel, fechar, navegar, sair e reentrar. Se houver recusa, registrar navegador e mensagem sem contornar a proteção. Reutilizar as provas técnicas acima.
