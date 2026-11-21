# Revisão da prática Q2 e preparação Q1 · 18/11/2026

Branch `feat/ivo-fibt-platform-foundation`, base `50027a6`. Na abertura da onda, o checkout tinha apenas `.q.out` e `.q.sql` como arquivos não rastreados. O ensaio usa as empresas fictícias Alfa e Beta.

## Entrega por fase

| Fase | O que está disponível |
| --- | --- |
| Mensurar | A revisão Q2 parte do setor e do fator da leitura FIB-T publicada que deram origem à ação. Q1 exibe o estado de preparação da COPSOQ brasileira. |
| Educar | O gestor relembra a prática, decide como agir em uma troca de turno fictícia e recebe devolutiva imediata. O Q1 oferece um exercício de preparação sobre prioridades concorrentes. As escolhas ficam na sessão da tela. |
| Transformar | A decisão de ajustar abre uma prévia da síntese coletiva. A confirmação inclui uma ação planejada no plano ativo e exige responsável, prazo e indicador de execução. |
| Evoluir | A ação original e o ajuste exibem links entre si. Manter ou interromper encaminha aos registros de aprendizagem e às transições compatíveis existentes. Adiar fica na tela até uma oportunidade de aplicar. |

O endpoint da aplicação aprovada confere organização, plano, publicação, setor, fator e versões D10. A inclusão reutiliza a identidade idempotente e a garantia de unicidade do PI-13. A referência da revisão é derivada no servidor e acompanha a síntese na descrição da ação, pelo contrato existente. A prova registra um ajuste planejado e preserva a distinção entre execução, aprendizagem e avaliação de eficácia.

## Prova no ambiente descartável

O launcher da aplicação validou `runtime=local`, `banco=local` e o projeto `vitalos-institutional-first-admin` antes do ensaio. App `http://localhost:8091`, API `127.0.0.1:57621`, Postgres `127.0.0.1:57622` e Mailpit `127.0.0.1:57624`. Foram usadas apenas as identidades fictícias já existentes, com login pelo formulário e e-mail local. As capturas mostram somente a Alfa fictícia e o formulário.

1. Na Alfa, abra **Agir → Ações do ciclo** e entre em **Aplicação Q2 aprovada — D10 0.1.0 — ensaio local** pelo índice do plano. Abra **Revisar a aplicação** e responda ao caso em **Ver o novo caso**. No ensaio, **Ainda não houve oportunidade de aplicar** exibiu a orientação de espera sem abrir confirmação.
2. Selecione **Ajustar e preparar uma nova aplicação**. Preencha a síntese, confira o que ficará visível e confirme uma vez. No ensaio foi criada **Revisão Q2 · passagem de turno — ensaio local**, ligada à ação original. Ela apareceu uma vez e o link no cartão levou ao ajuste planejado. Após sair e entrar de novo pelo Mailpit, a síntese e o ajuste continuaram visíveis.
3. Na Visão IVO, o painel da Alfa exibiu a aprovação de João Paulo Brandão Barboza. A prática Q1 abriu por teclado e exibiu a devolutiva para a decisão sobre prioridades concorrentes. Na Beta, o acesso direto a `/ivo-integral/acoes` após login exibiu **Módulo não habilitado para esta empresa**; a ação da Alfa não apareceu.

| Leitura independente do Postgres | Antes | Depois |
| --- | ---: | ---: |
| Ações da Alfa | 4 | 5 |
| Ajustes com o título do ensaio | 0 | 1 |
| Registros de evidência da aplicação D10 original | 2 | 2 |
| Ações da Beta | 0 | 0 |

A transação `READ ONLY`, iniciada em processo independente e depois do novo login da Alfa, confirmou plano, onda, setor, fator e versão de origem idênticos entre original e ajuste, referência ao item correto, presença da síntese confirmada, chave de inclusão e zero evidências atribuídas ao novo ajuste. Estados e revisões das habilitações conferidos: Alfa Q1 desligado (44), Q2 ligado (87); Beta Q1 desligado (9), Q2 desligado (13).

**Responsividade.** A ação e o formulário abriram por teclado a 320 e 390 px em quadros da mesma origem, com a aplicação autenticada. Em cada quadro, largura útil e largura de rolagem coincidiram (305 e 375 px), assim como as larguras do cartão (271 e 341 px). A prova é de reflow em navegador desktop. [Captura desktop](artifacts/Q2_PRACTICE_REVIEW_DESKTOP_2026-11-18.jpg) · [Captura de reflow](artifacts/Q2_PRACTICE_REVIEW_REFLOW_2026-11-18.jpg).

## Verificação e rastreabilidade

- **Testes dirigidos** · 135 aprovados no conjunto inicial do fluxo, contrato e governança. O gate posterior inclui as verificações finais de plano em rascunho, origem do ajuste, retry e concorrência no nível de serviço.
- **Gate integrado** · 4.430 aprovados em 353 arquivos, 13.973 asserções, paridade de schema, TypeScript e secret-scan. Build inerte isolado aprovado com varredura dos artefatos.
- **Lint** · Componentes novos e painel Q1 aprovados com as regras completas. Lint semântico do diff com zero erros e um aviso de Fast Refresh já presente no `FibtActionLoop.tsx`. A formatação integral dos arquivos legados fica fora deste diff.
- **Pacote do piloto** · A verificação do arquivo histórico em `scripts/q2-pilot-review-package.ts --check-archive` valida o SHA-256 do JSON arquivado. O JSON foi conferido com o artefato de `576c464` e seus anexos daquele checkout. `--check` continua comparando o pacote com os anexos do checkout atual. A verificação arquivística conserva o escopo do candidato `517c206`.

| Superfície | Arquivos centrais |
| --- | --- |
| Jornada Q2 | `Q2PracticeReview.tsx`, `PrivatePracticeCase.tsx`, `PlanComposition.tsx`, `FibtActionLoop.tsx`, `ivo-integral.acoes.tsx` |
| Contrato e persistência | `learning-application.ts`, `learning-application.server.ts`, `ivo-learning-application.functions.ts`, `fibt-action-loop.server.ts` e testes de composição |
| Q1 e governança | `CopsoqPreparationNotice.tsx` e teste, `module-contract.ts`, `methodology-governance.json`, gerador e pacote de decisões, fila metodológica e [registro da aprovação](decisions/Q1_COPSOQ_BRAZIL_APPROVAL_2026-11-18.md) |

## Maturidade e próximo marco

Q2 implementado e comprovado em ensaio institucional local. A evidência de retry e concorrência da extensão vem dos testes de serviço e do contrato PI-13 existente. CI, staging, uso com clientes e eficácia são verificações distintas, fora deste ensaio. A única escrita de produto desta prova foi o ajuste fictício da Alfa, além das sessões do login local. Migrations e configurações de acesso ficaram fora do incremento. `.q.out` e `.q.sql` foram preservados.

Adotar a versão brasileira em Q1 é uma decisão registrada de João Paulo Brandão Barboza. O próximo marco é vincular o artefato da edição e forma exatas, com manual e regras correspondentes, e provar sua equivalência item a item em testes antes de abrir a coleta empresarial.
