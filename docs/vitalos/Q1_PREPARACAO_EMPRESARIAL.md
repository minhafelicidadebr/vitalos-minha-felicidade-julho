# Preparação empresarial Q1

## Decisão de produto

O primeiro trabalho do RH é explicar a escuta aos trabalhadores e conferir quais condições de prevenção já chegam ao trabalho real. A porta de entrada é **Painel de RH → Jornada da empresa → Preparar avaliação Q1**. Cada empresa e ciclo têm seu próprio registro. O resumo indica a próxima pendência e mostra quantos controles foram declarados, quantos tiveram a cobertura conferida e quantas medidas foram planejadas.

O benchmark do NCOPSII inspirou três decisões de produto. O comunicado identifica a fase da avaliação. Uma declaração de controle abre a conferência de cobertura. Uma medida nasce da lacuna que o RH registrou no recorte de trabalho. Os textos e o catálogo desta implementação foram redigidos para o VitalOS.

A busca por controle ou recorte e o filtro por etapa trazem a ideia de pendências do painel NCOPSII para a preparação de cada ciclo. A etapa é derivada dos registros existentes: cobertura a conferir, medida a planejar, medida a acompanhar, cobertura observada ou execução observada. A próxima pendência abre o controle mesmo com filtros ativos. A memória de preparação continua abrangendo o ciclo inteiro. Execução observada permanece uma evidência de execução.

O manual NCOPSII orienta esse benchmark operacional. O manual COPSOQ Portugal 2013 documenta a adaptação portuguesa. Para servir a edição brasileira, o contrato de paridade exige identificar a forma e verificar itens, opções, polaridades, ausências e regras de cálculo na fonte correspondente. Zonas, limiares e matriz de riscos permanecem sujeitos a seus próprios contratos de interpretação. [Conferência da fonte](Q1_COPSOQ_SOURCE_PARITY_2026-11-18.md).

| Caminho considerado | Decisão e motivo |
| --- | --- |
| Publicar modelos estáticos de documentos | Úteis como referência, mas insuficientes para identificar quem revisou a versão e a qual empresa pertence. |
| Acrescentar um checklist demonstrativo | Serve ao treinamento. A operação do RH exige persistência, autorização e releitura. |
| Criar preparação institucional por empresa e ciclo | **Implementado.** Resolve o trabalho anterior à coleta e acompanha uma lacuna até a revisão da medida. |
| Encaminhar diretamente para um plano originado de resultado | Reservado para a fase com instrumento, onda e agregado publicados. O contrato atual exige essa procedência. |
| Integrar um gerador de terceiros ou criar um segundo painel de SST | A jornada já dispõe de identidade institucional, autorização e kit de PDF reutilizáveis. |

## Etapas e critérios de aceite

| Etapa | Entrega | Evidência de aceite |
| --- | --- | --- |
| **1 · Preparar** | RH revisa o comunicado, indica o canal de dúvidas e a devolutiva prevista. | O PDF contém o texto pré-coleta revisado, a empresa, o ciclo, a revisão e a data de emissão. Os controles internos ficam na memória técnica. |
| **2 · Conferir** | RH declara um dos 25 controles de seis famílias ou um controle próprio. A conferência registra recorte, fonte coletiva ou documental, evidência e cobertura. | O mesmo controle pode ter cobertura diferente por turno. A repetição no mesmo recorte é identificada. Uma lacuna requer descrição. |
| **3 · Agir e acompanhar** | Uma lacuna conferida admite uma medida com função responsável, prazo e indicador. O acompanhamento registra uma observação ou um ajuste com nova data. | O histórico conserva as revisões e permite reabrir para ajuste. A memória interna identifica a origem, a medida e o acompanhamento. O escore COPSOQ e a eficácia seguem seus contratos próprios. |
| **4 · Vincular à mensuração** | Próximo marco metodológico. Vincular a edição e a forma brasileiras aprovadas ao manifesto servido e passar na conferência item a item. | Fonte, opções, polaridades, ausências e casos de cálculo rastreáveis. A adoção brasileira já foi aprovada por João Paulo Brandão Barboza. [Registro de aprovação](decisions/Q1_COPSOQ_BRAZIL_APPROVAL_2026-11-18.md) e [verificação da fonte](Q1_COPSOQ_SOURCE_PARITY_2026-11-18.md). |
| **5 · Devolver e reavaliar** | Ligar uma preparação à onda e ao recorte efetivamente publicados. Exibir pendências de coleta por papel, preparar a devolutiva aos trabalhadores e a minuta técnica para revisão. | Uma leitura protegida ou em coleta continua no estado correspondente. Incluir observação do trabalho, participação da equipe e revisão responsável antes de caracterizar risco ou avaliar eficácia. |

## Contrato implementado

O perfil `SST_PROFISSIONAL` existe no catálogo empresarial e tem entrada em SST & NR-1. A migration de delegação permite ao diário autorizar um representante com vínculo na empresa e concessão explícita de preparação, além do acesso de `RH_ADMIN`. O Q1 precisa estar habilitado nos dois casos. A delegação autoriza a operação pré-coleta.

Em **Plataforma → Delegação de preparação Q1**, a autoridade de plataforma pode consultar o vínculo da pessoa pelos identificadores da empresa e da conta, conceder e revogar a delegação. A RPC verifica o vínculo e a habilitação, serializa as mudanças pela empresa e registra ator, data e revisão. A revogação é permitida com Q1 desligado. Para provar no ambiente descartável autorizado, aplique as migrations de delegação em ordem, conceda a um representante fictício da Alfa, abra `/ivo-integral/preparar-q1` nessa sessão e registre um comunicado. Revogue com a tela aberta e confirme recusa na próxima leitura, gravação e exportação. Repita a consulta com uma pessoa da Beta e confira a recusa. No Painel, o representante com concessão vê a entrada Preparação empresarial Q1 após confirmação do servidor. Ao retornar à janela, o painel confere novamente. O ensaio integrado permanece pendente.

### Próxima entrega proposta: revisão técnica de SST

O contrato de domínio tem testes de versão, reassociação e recusa. A migration `20261119103000_q1_technical_review.sql` e a função de servidor preparam a designação interna pela plataforma e o registro de encaminhamento e devolução. O banco deve serializar essas operações com a preparação da empresa, conferir o vínculo ativo e ligar a devolução à revisão atual. O Docker recusou acesso neste terminal. A migration não foi aplicada. O painel de revisão na preparação permite encaminhar a revisão corrente, ler a memória encaminhada como revisor designado e registrar a devolução. Em Plataforma → Designação de revisor técnico Q1, consulte a empresa e o ciclo, designe uma pessoa vinculada com papel SST_PROFISSIONAL, substitua ou revogue a designação. A revogação continua disponível com Q1 desligado. O convite externo e o ensaio integrado permanecem pendentes.

| Papel | Ação proposta e limite |
| --- | --- |
| RH | Preparar o comunicado, registrar controles e medidas e encaminhar uma revisão específica da memória. |
| SST designado pela empresa | Consultar a preparação encaminhada e registrar parecer ou pedido de ajuste, com justificativa e referência à revisão examinada. O perfil no sistema e a designação têm funções distintas. |

Primeiro incremento: RH encaminha a memória do ciclo e SST designado registra uma devolução técnica. Vincular empresa, ciclo, revisão, autor e data. Se a preparação mudar, o parecer anterior permanece no histórico e a nova revisão volta a aguardar análise. Verificar acesso no servidor e no banco por vínculo, designação e habilitação Q1. Confirmar que outro perfil ou outra empresa recebe recusa e que os registros de preparação, o parecer técnico, o escore e os documentos finais continuam com contratos próprios.

- A rota `/ivo-integral/preparar-q1` usa a sessão institucional. O ciclo selecionado permanece na URL após recarga. O servidor resolve o vínculo e o PostgreSQL confere o papel `RH_ADMIN`, o pack `enterprise` e a habilitação Q1 em cada operação. A empresa esperada pelo navegador e a revisão do ciclo são precondições da gravação. A autoridade vem da sessão.
- A migration `20261118163000_q1_preparation.sql` acrescenta uma tabela privada de eventos e uma RPC de acesso exclusivo do servidor. Cada evento conserva ciclo, autor, instante, versão de contrato, revisão e identidade do pedido. A ordem e a unicidade são garantidas no banco. O mesmo pedido pode ser repetido. Outra alteração sobre a mesma revisão pede releitura explícita.
- Os documentos são gerados sob demanda, depois de nova consulta autorizada. O comunicado usa o modelo revisado `Q1-PRE-1`. A memória usa todos os controles do ciclo e distingue declaração, cobertura, ação e acompanhamento.
- A memória pré-coleta pode subsidiar a revisão técnica. A devolutiva pós-coleta, o vínculo a um resultado publicado e a integração com o dossiê GRO/PGR pertencem às etapas 4 e 5. Q2 continua no fluxo já existente.

## Reproduzir no ambiente descartável

### Ensaio de devolutiva e acompanhamento

No modo de desenvolvimento, abra o ciclo em **Preparar avaliação Q1 → Ensaiar a devolutiva Q1**. Escolha **Resultado coletivo publicado** e avance pela opção de conferir a escala e ouvir a equipe. A lacuna fictícia, a medida e os dois desfechos de acompanhamento são projetados em memória pelo mesmo contrato de comandos da preparação. Compare execução observada com necessidade de ajuste e confira a data de revisão no segundo caso. Depois selecione **Publicação pendente** e **Base insuficiente para divulgação**. Ambos omitem a observação, a medida e seu acompanhamento.

**Checkpoint da macro-onda de ação e reavaliação:** a onda A está demonstrada em teste de componente; B cobre a ligação entre lacuna, medida e acompanhamento com eventos sintéticos em memória; D cobre os três estados da prévia. Permanecem pendentes navegador, gravação institucional e proteção real de servidor e exportações. A onda C depende da prova no ambiente descartável. Para E, continua faltando o vínculo à edição e forma brasileiras exatas. Próxima evidência: repetir com Alfa e Beta a partir da delegação quando a instância descartável estiver acessível.

### Prova de preparação com banco e navegador

Para a delegação e revisão do candidato atual, execute `bun --no-env-file scripts/q1-technical-review-local-proof.ts` após aplicar, no ambiente descartável autorizado, as migrations de preparação, delegação, gestão de delegação e revisão técnica. O script valida o alvo com o harness institucional, exige o ciclo fictício `2098-T3` livre e um colaborador fictício da Alfa. A troca temporária de papel, a habilitação e todos os eventos do ensaio são revertidos. A prova direta de RPC cobre concessão, envio, acesso à memória, isolamento, revogação, nova designação da mesma pessoa, devolução duplicada e revisão desatualizada. Ela complementa, sem substituir, a prova com sessões reais no navegador.

**Regra de nova designação:** revogar e designar novamente o mesmo profissional exige um encaminhamento posterior à nova designação para abrir a memória. Uma devolução concluída permanece no histórico.

**Evidência de upgrade e RPC.** No alvo descartável identificado, a preparação prévia estava instalada e os três objetos novos estavam ausentes. O comando `bun --no-env-file scripts/q1-technical-review-local-proof.ts --rehearse-upgrade` aplica as três migrations dentro da transação de prova e reverte o DDL e as fixtures no final. A primeira execução encontrou ambiguidade entre a coluna e a variável de revisão na leitura da memória. A migration ainda local foi corrigida e o ensaio seguinte retornou `PASS`. Uma leitura em outro processo confirmou a preparação original instalada, as três tabelas novas ausentes, zero eventos no ciclo de prova e o papel fictício original restaurado. Isso prova o upgrade da base preparada e a execução sequencial de RPC no PostgreSQL. Sessões reais, concorrência entre conexões e prova de instalação limpa seguem pendentes.

**Roteiro de navegador em projeto separado.** `bun --no-env-file scripts/q1-browser-proof-setup.ts --prepare-disposable` prepara o projeto `vitalos-q1-browser-proof`, com API 57721, PostgreSQL 57722, correio 57724 e identidades fictícias. O comando não oferece reset. Em caso de instalação parcial, confira a primeira migration que falhou antes de usar `--resume-from=<arquivo>` nesse projeto. `node scripts/q1-technical-review-browser-proof.ts --check` verifica o projeto, portas, vínculos e migrations sem abrir o navegador. Sem `--check`, o roteiro inicia apenas seu app na 8093 e encerra esse processo no final. Use Edge e a instalação local de Playwright (opcionalmente `PLAYWRIGHT_MODULE_PATH`). O roteiro só inicia a interação depois de validar o alvo e restringe o tráfego do navegador ao app e API locais. Os eventos do ensaio permanecem no projeto descartável para releitura.

**Resultado na fixture de navegador.** O projeto separado foi preparado com duas empresas fictícias e Q1 habilitado em ambas. A instalação histórica precisou retomar a partir de `20260806205000_rewrite_submit_sector_response_without_invite_link.sql` com transação única, após uma falha na verificação de ACL causada pelo executor. A jornada no Edge ficou bloqueada antes da interação: o Vite na porta 8093 não respondeu à verificação de prontidão ou excedeu o limite da rota de entrada. Uma leitura posterior retornou zero delegações, zero revisões e zero eventos de preparação na fixture, com a porta 8093 fechada. A próxima prova deve primeiro confirmar uma resposta estável do app descartável e depois repetir a jornada de login, encaminhamento, devolução e revogação. O ensaio de upgrade com rollback continua sendo evidência válida da fronteira PostgreSQL.

1. Use o harness institucional com a aplicação em `localhost:8091`, API em `127.0.0.1:57621`, PostgreSQL na porta `57622` e Mailpit na porta `57624`. Os scripts conferem a identidade do projeto e os endpoints antes do ensaio.
2. Com o alvo descartável autorizado, `bun --no-env-file scripts/q1-preparation-local-proof.ts --install` aplica a migration aditiva se ela estiver ausente. A prova de acesso, replay e conflito roda em uma transação revertida ao final. Omitir `--install` executa apenas a prova.
3. Com Edge, Node com suporte a TypeScript, Bun e Playwright locais, execute `node scripts/q1-preparation-browser-proof.ts`. Se o Playwright estiver no runtime desktop, indique o pacote local em `PLAYWRIGHT_MODULE_PATH`. O script usa links mágicos do Mailpit, escolhe um ciclo de ensaio vazio, verifica duas abas, gera os PDFs, relê os registros com outro processo e restaura a habilitação da Alfa por revisão. Os eventos fictícios desse ciclo ficam disponíveis para conferência.

## Evidências locais de 18/11/2026

Base `f40d918`. No ensaio final, o RH da Alfa fictícia abriu o ciclo `2027-T4`. Duas abas enviaram o primeiro comunicado sobre a revisão zero. Uma gravou e a outra recebeu a orientação de reler o ciclo. O RH declarou as pausas do turno da noite, registrou a escuta coletiva e identificou a primeira hora sem cobertura. A medida de reorganizar a escala recebeu função responsável, prazo, indicador e acompanhamento. O formulário abriu por teclado e coube em larguras de 320 e 390 px no Edge.

A recarga conservou o trimestre selecionado e a medida. Uma consulta em outro processo encontrou cinco eventos na Alfa e zero na Beta nesse ciclo. No banco, com as duas empresas habilitadas dentro de uma transação revertida, cada RH só pôde ler a própria empresa. No navegador, a Beta estava desabilitada e recebeu a recusa. A Alfa voltou à habilitação inicial desligada e a sessão já aberta perdeu acesso aos PDFs após recarga. As revisões da habilitação e os registros sintéticos dos ensaios permanecem no histórico do ambiente descartável.

Os dois PDFs foram baixados pelo navegador e conferidos visualmente. Cada amostra tem uma página. O comunicado da revisão 1 contém os canais coletivos. A memória da revisão 5 registra a lacuna, a ação e o acompanhamento. [Comunicado aos trabalhadores](artifacts/Q1_COMUNICADO_ALFA_2026-11-18.pdf) e [memória de preparação](artifacts/Q1_MEMORIA_ALFA_2026-11-18.pdf).

**Gate do candidato local.** 4.469 testes aprovados em 358 arquivos, com 14.099 asserções. Paridade de schema, TypeScript, varredura de segredos e compilação inerte concluídos. O lint dos arquivos novos passou. O componente preexistente `EnterpriseModules.tsx` conserva um aviso de hook na limpeza do observador de habilitação. A migration consta no manifesto de 67 arquivos e foi aplicada somente ao banco deste ensaio.

**Alcance da validação.** A prova exercita funções, banco, acesso institucional, documentos e reflow pelo navegador desktop. Validação com trabalhadores e equipes de SST, desempenho com carteiras grandes e homologação remota ficam para etapas próprias.
