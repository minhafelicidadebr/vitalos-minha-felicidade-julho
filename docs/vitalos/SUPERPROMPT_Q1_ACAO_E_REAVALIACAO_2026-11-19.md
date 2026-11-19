# Superprompt de execução contínua · Q1 da medida à reavaliação

## Missão

Consolide no Q1 empresarial um ciclo que outra pessoa consiga operar e repetir: **preparar → revisar → interpretar → educar → agir → acompanhar → reavaliar**. A Alfa fictícia contrata apenas o Q1 e começa com um representante sem papel de RH. A Beta serve para verificar isolamento. A empresa pode preparar o ciclo enquanto define o apoio técnico. A prova interna usa um profissional de SST fictício, vinculado e designado para aquele ciclo.

Execute as ondas até o limite da autorização e da evidência disponível. Ao terminar uma fatia, passe automaticamente à próxima que estiver pronta. Use o checklist abaixo para entregar resultados verificáveis a uma revisão independente.

## 1. Retome pelo que mudou

No checkpoint de 19/11/2026, a branch `feat/ivo-fibt-platform-foundation` estava no HEAD `16730dc` com alterações locais posteriores. Confirme raiz, branch, HEAD, worktree, arquivos alterados e diffs pertinentes antes de escrever. Leia AGENTS.md e consulte os registros abaixo apenas para recuperar a fronteira em que vai trabalhar:

- [Preparação empresarial](Q1_PREPARACAO_EMPRESARIAL.md): operação por RH comprovada em base anterior; delegação, designação de SST e revisão por versão implementadas localmente, sem prova integrada na base atual.
- [Conferência da forma brasileira](Q1_COPSOQ_SOURCE_PARITY_2026-11-18.md): adoção brasileira aprovada; identificação da forma exata e paridade em aberto.
- [Macro-onda anterior](MACRO_ONDA_Q1_CONSOLIDACAO_2026-11-19.md): sequência geral e dependências.
- A prévia de desenvolvimento já tem leitura coletiva disponível ou protegida, pergunta de compreensão e exemplo de medida de cobertura de pausas. O próximo passo funcional é **Evoluir**. Confirme por símbolo onde essas etapas vivem antes de reescrever qualquer coisa.

Preserve `.q.out`, `.q.sql`, trabalho posterior e o worktree paralelo do Q2. Ignore artefatos alheios à fatia. Diga em até cinco linhas o que vai começar, qual é a prova esperada e quais trilhas podem seguir em paralelo.

## 2. Decisão pelo ToT

| Caminho | Valor e risco | Decisão |
| --- | --- | --- |
| Fechar somente a prévia de Evoluir | Entrega rápida e pouca dependência. Prova insuficiente para persistência e autorização. | Primeiro incremento se o banco estiver indisponível. |
| Parar tudo para provar delegação e revisão | Resolve o maior risco técnico, mas depende do ambiente autorizado. | Prioridade quando o ambiente estiver acessível. |
| Fazer um ciclo sintético contínuo enquanto se prova o núcleo em paralelo | Reutiliza a prévia e o diário, testa a lógica do serviço e separa a prova de produto da liberação metodológica. | **Estratégia escolhida.** |
| Abrir coleta oficial ou interpolar regras do instrumento | Pode comprometer rastreabilidade e comparabilidade. | Depende da prova de paridade e dos controles de publicação. |
| Expandir marketplace, revisor externo ou motor comum de lentes | Pode ser útil depois. Aumenta superfície de segurança e foge do caminho crítico. | Trilha independente, apenas se já autorizada e com prova própria. |

Refaça uma comparação curta somente se surgir uma decisão que afete autorização, privacidade, metodologia ou arquitetura. Registre escolha, principal trade-off e evidência que mudaria a escolha. Evite produzir um novo plano completo a cada retomada.

## 3. Ondas e critérios de passagem

| Onda | Entrega mínima | Passe adiante quando |
| --- | --- | --- |
| **A · Fechar Evoluir no cenário existente** | No caso fictício das pausas, diferencie medida planejada, execução observada e situação que requer ajuste. Mostre qual evidência foi observada, o que falta para avaliar efeito e quando reavaliar. Reaproveite os estados e rótulos da preparação. | A interação permite entender os dois desfechos, preserva a separação entre execução e eficácia e não exibe a observação protegida nem a medida derivada dela ao alternar para base insuficiente. Valide estados, teclado em grupo de opções e tela estreita quando o navegador estiver disponível. |
| **B · Ligar lacuna, medida e acompanhamento** | Use os contratos já existentes para autoria, revisão, prazos, revisão da medida e memória. Demonstre a rota normal com uma lacuna fictícia conferida pela equipe. Se o ambiente estiver indisponível, valide o encadeamento em domínio ou componente com fronteira simulada. | Há origem identificável para a medida, função responsável, prazo, indicador e evidência; o acompanhamento está vinculado à medida. A prova informa se houve gravação real ou apenas simulação. A prévia não grava automaticamente uma ação institucional. |
| **C · Provar delegação e revisão técnica** | Em ambiente descartável autorizado, faça a plataforma conceder acesso ao representante da Alfa, designar o revisor fictício, encaminhar uma revisão e registrar a devolução. Observe a reabertura após edição, preservando devoluções anteriores. | Confirme novo login e releitura independente; recuse Beta, usuário comum, revisor revogado, revisão obsoleta e Q1 desligado. Confira concorrência e replay conforme cada contrato. Se o histórico persistido não estiver acessível nas superfícies apropriadas, registre e corrija a lacuna. |
| **D · Qualificar devolutiva e documentos** | Exercite publicação ainda pendente, base insuficiente e agregado autorizado. Use uma projeção de saída com campos explícitos para cada público. Separe memória institucional e comunicação aos trabalhadores. | A fronteira de servidor, a interface e a exportação respeitam a mesma decisão de acesso. Nenhuma saída protegida contém achado, contagem suprimida ou resposta individual. Instrumento, versão, período, origem e limite aparecem onde são necessários. Cenas demonstrativas são identificadas e ficam fora da coleta e dos relatórios oficiais. |
| **E · Fechar a forma brasileira** | Em paralelo, localize a fonte primária da edição e forma adotadas e registre identidade, procedência e condições de uso. Compare item, ordem, alternativas, polaridades, reversões, ausências, agregação e interpretação aplicável. Use o verificador e casos esperados independentes. | A forma servida tem paridade demonstrada da renderização à agregação. Se faltar fonte, indique o artefato exato e mantenha protegida a coleta oficial; siga nos fluxos sintéticos. Não reabra a aprovação brasileira por falta de correspondência técnica. |
| **F · Montar o candidato integrado** | Reproduza Alfa/Beta desde a delegação até a reavaliação e reúna os resultados das outras ondas. Rode o gate pertinente na base integrada e prepare o roteiro de homologação. | Publique apenas o relatório local de evidência. Declare separadamente o nível alcançado para preparação, revisão, jornada sintética e coleta oficial. CI, staging e produção exigem evidência e autorização próprias. |

**Ordem adaptativa:** comece por A e pela leitura seletiva de E. Quando o ambiente estiver confirmado, execute C antes de uma prova institucional completa de B ou D. Avance nos contratos e casos sintéticos de B e D enquanto C estiver pendente. Execute F quando houver candidato integrado ou feche o recorte local com limites explícitos.

## 4. Autonomia com limites claros

- Resolva sem perguntar: organização de componentes, microcopy, casos sintéticos, correções reversíveis, testes autorizados pela execução e sequência entre ondas independentes. Reuse a escolha do produto quando existir.
- Registre para decisão humana, em um único bloco: fontes brasileiras contraditórias que alterem itens ou pontuação; ausência de evidência para escolher a forma; necessidade de ampliar acesso institucional ou publicar dados a um novo público; solicitação de escrita remota, dados reais ou operação fora do escopo. Agrupe apenas decisões que travem uma entrega concreta. Preserve mapeamentos IVO, índice composto e critérios de eficácia ainda pendentes.
- Antes de qualquer escrita de banco, confirme a identidade do projeto, API e banco descartáveis e a autorização para o ensaio. Docker acessível ou URL de loopback, isoladamente, não identificam o projeto. Preserve o stack existente. Sem push, merge, publicação, migrations remotas, alterações de Access, credenciais ou dados reais sem autorização específica.
- Se Docker ou navegador falhar, registre erro exato e condição de retomada. Produza o que puder em teste de componente, domínio, revisão SQL, contrato ou roteiro de prova. Volte ao ambiente após um sinal de mudança. Evidência simulada não valida persistência, concorrência ou isolamento no banco.

## 5. Orçamento de contexto e verificação

1. Busque por símbolo e leia primeiro o trecho que define o comportamento. Reuse a documentação anterior por referência. Preserve detalhes de execução no repositório e extraia apenas falhas e evidências decisivas para a conversa.
2. Escolha o menor teste que possa refutar a mudança. Integre testes de autorização e banco na fronteira real. Use navegador para ações observáveis e confira o efeito persistido independentemente. Verificações amplas entram no candidato integrado ou quando uma mudança invalida a evidência anterior.
3. Registre por onda: **commit ou diff**, **cenário**, **fronteira**, **resultado**, **limite**, **próxima ação**. Atualize o checkpoint antes de trocar de frente. Se houver alterações posteriores, recalcule apenas as evidências que elas afetam. Use commits locais coesos apenas no escopo autorizado.

## 6. Pauta de revisão independente

Para cada item, marque **demonstrado**, **parcial**, **pendente** ou **fora do escopo** e aponte o arquivo, teste ou roteiro que sustenta a marcação:

- **Produto:** o representante sem RH encontra a ação seguinte; a operação Q1 funciona sem depender do Q2 ou da rede de parceiros.
- **Engenharia e segurança:** autoria e escopo vêm da sessão; a persistência confere o vínculo e a versão no momento da escrita; há recusa entre empresas, após revogação e sob concorrência.
- **Método e privacidade:** a trilha liga forma, onda, agregado e decisão; a base insuficiente é protegida; o conteúdo sintético fica identificado em cada saída.
- **UX e aprendizagem:** a pessoa entende o que fazer e por quê, consegue operar por teclado em tela estreita e recupera falhas com contexto.
- **Transformação e evolução:** a medida tem origem, responsável e verificação; a reavaliação distingue mudança observada de eventual eficácia. Cada limite é visível a quem toma a decisão.

Encerre com a matriz de evidência, os arquivos e commits locais quando houver, as dependências reais e **um próximo marco**. A revisão avalia o que pode ser reproduzido e confrontado com o código.
