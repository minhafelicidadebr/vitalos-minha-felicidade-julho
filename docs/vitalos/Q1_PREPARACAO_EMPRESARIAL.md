# Preparação empresarial Q1

## Decisão de produto

O primeiro trabalho do RH é explicar a escuta aos trabalhadores e conferir quais condições de prevenção já chegam ao trabalho real. A porta de entrada é **Painel de RH → Jornada da empresa → Preparar avaliação Q1**. Cada empresa e ciclo têm seu próprio registro. O resumo indica a próxima pendência e mostra quantos controles foram declarados, quantos tiveram a cobertura conferida e quantas medidas foram planejadas.

O benchmark do NCOPSII inspirou três decisões de produto. O comunicado identifica a fase da avaliação. Uma declaração de controle abre a conferência de cobertura. Uma medida nasce da lacuna que o RH registrou no recorte de trabalho. Os textos e o catálogo desta implementação foram redigidos para o VitalOS.

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

- A rota `/ivo-integral/preparar-q1` usa a sessão institucional. O ciclo selecionado permanece na URL após recarga. O servidor resolve o vínculo e o PostgreSQL confere o papel `RH_ADMIN`, o pack `enterprise` e a habilitação Q1 em cada operação. A empresa esperada pelo navegador e a revisão do ciclo são precondições da gravação. A autoridade vem da sessão.
- A migration `20261118163000_q1_preparation.sql` acrescenta uma tabela privada de eventos e uma RPC de acesso exclusivo do servidor. Cada evento conserva ciclo, autor, instante, versão de contrato, revisão e identidade do pedido. A ordem e a unicidade são garantidas no banco. O mesmo pedido pode ser repetido. Outra alteração sobre a mesma revisão pede releitura explícita.
- Os documentos são gerados sob demanda, depois de nova consulta autorizada. O comunicado usa o modelo revisado `Q1-PRE-1`. A memória usa todos os controles do ciclo e distingue declaração, cobertura, ação e acompanhamento.
- A memória pré-coleta pode subsidiar a revisão técnica. A devolutiva pós-coleta, o vínculo a um resultado publicado e a integração com o dossiê GRO/PGR pertencem às etapas 4 e 5. Q2 continua no fluxo já existente.

## Reproduzir no ambiente descartável

1. Use o harness institucional com a aplicação em `localhost:8091`, API em `127.0.0.1:57621`, PostgreSQL na porta `57622` e Mailpit na porta `57624`. Os scripts conferem a identidade do projeto e os endpoints antes do ensaio.
2. Com o alvo descartável autorizado, `bun --no-env-file scripts/q1-preparation-local-proof.ts --install` aplica a migration aditiva se ela estiver ausente. A prova de acesso, replay e conflito roda em uma transação revertida ao final. Omitir `--install` executa apenas a prova.
3. Com Edge, Node com suporte a TypeScript, Bun e Playwright locais, execute `node scripts/q1-preparation-browser-proof.ts`. Se o Playwright estiver no runtime desktop, indique o pacote local em `PLAYWRIGHT_MODULE_PATH`. O script usa links mágicos do Mailpit, escolhe um ciclo de ensaio vazio, verifica duas abas, gera os PDFs, relê os registros com outro processo e restaura a habilitação da Alfa por revisão. Os eventos fictícios desse ciclo ficam disponíveis para conferência.

## Evidências locais de 18/11/2026

Base `f40d918`. No ensaio final, o RH da Alfa fictícia abriu o ciclo `2027-T4`. Duas abas enviaram o primeiro comunicado sobre a revisão zero. Uma gravou e a outra recebeu a orientação de reler o ciclo. O RH declarou as pausas do turno da noite, registrou a escuta coletiva e identificou a primeira hora sem cobertura. A medida de reorganizar a escala recebeu função responsável, prazo, indicador e acompanhamento. O formulário abriu por teclado e coube em larguras de 320 e 390 px no Edge.

A recarga conservou o trimestre selecionado e a medida. Uma consulta em outro processo encontrou cinco eventos na Alfa e zero na Beta nesse ciclo. No banco, com as duas empresas habilitadas dentro de uma transação revertida, cada RH só pôde ler a própria empresa. No navegador, a Beta estava desabilitada e recebeu a recusa. A Alfa voltou à habilitação inicial desligada e a sessão já aberta perdeu acesso aos PDFs após recarga. As revisões da habilitação e os registros sintéticos dos ensaios permanecem no histórico do ambiente descartável.

Os dois PDFs foram baixados pelo navegador e conferidos visualmente. Cada amostra tem uma página. O comunicado da revisão 1 contém os canais coletivos. A memória da revisão 5 registra a lacuna, a ação e o acompanhamento. [Comunicado aos trabalhadores](artifacts/Q1_COMUNICADO_ALFA_2026-11-18.pdf) e [memória de preparação](artifacts/Q1_MEMORIA_ALFA_2026-11-18.pdf).

**Gate do candidato local.** 4.469 testes aprovados em 358 arquivos, com 14.099 asserções. Paridade de schema, TypeScript, varredura de segredos e compilação inerte concluídos. O lint dos arquivos novos passou. O componente preexistente `EnterpriseModules.tsx` conserva um aviso de hook na limpeza do observador de habilitação. A migration consta no manifesto de 67 arquivos e foi aplicada somente ao banco deste ensaio.

**Alcance da validação.** A prova exercita funções, banco, acesso institucional, documentos e reflow pelo navegador desktop. Validação com trabalhadores e equipes de SST, desempenho com carteiras grandes e homologação remota ficam para etapas próprias.
