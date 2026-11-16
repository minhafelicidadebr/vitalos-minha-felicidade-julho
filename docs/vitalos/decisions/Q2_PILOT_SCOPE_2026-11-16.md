# PIL-01–PIL-08 — registro de delimitação e seleção do candidato Q2

Data: 16/11/2026. Estado: **registro parcial; candidato técnico selecionado; piloto real ainda não delimitado/autorizado**.

## Solicitação e autoria

O usuário solicitou neste chat: “registrar as decisões PIL-01–PIL-08 para delimitar o piloto Q2 e escolher seu candidato.” Essa solicitação autoriza preparar o registro e selecionar tecnicamente o candidato com evidência disponível. Não fornece empresa/coorte, período, responsáveis operacionais ou decisões sobre dados, participação e publicação. Esses campos não foram preenchidos por suposição.

A seleção técnica abaixo foi realizada por Codex. Não é parecer metodológico, assinatura ou aprovação operacional atribuída a João Paulo ou às revisoras. As informações faltantes foram solicitadas ao usuário em dois blocos: delimitação/operadores e referências das decisões de participação, dados, avaliação, extensão e ambiente. Até sua resposta, este registro permanece parcial.

## Candidato selecionado para a revisão de escopo

**Produto:** `2e9df5437abbd5d4da1b0af09e686e7096a12f1d` (`2e9df54`). Branch: `feat/ivo-fibt-platform-foundation`.

O commit inclui a recuperação institucional implementada em `517c206` e a navegação acessível entre ações. `576c464` acrescentou o pacote de revisão, sem alterar o produto. A seleção usa o último candidato de produto com gate/build locais documentados; não exige repetir as provas ou aguardar a resolução da fonte Q1.

Evidência reutilizada: [fechamento dos atalhos Q2](../Q2_ACTION_NAVIGATION_2026-11-16.md), com **4.381 testes, zero falhas, 346 arquivos e 13.686 asserções**, paridade, TypeScript, secret-scan e build inerte. [Hashes das três fontes/testes](../artifacts/Q2_ACTION_NAVIGATION_SOURCES_2026-11-16.json) conferidos nesta preparação; checkout sem diferença em `src/`, `package.json` ou `bun.lock` contra o candidato. [Artefato da seleção](../artifacts/Q2_PILOT_CANDIDATE_2e9df54_2026-11-16.json) registra commit e identidades Git das fontes e dependências versionadas. Essa conferência não executa novamente gate, build, navegador ou banco.

Limites preservados: captura mobile detalhada do cartão não confirmada por pixels; CI/staging e capacidade remota não confirmados; disponibilidade do par educativo limitada ao ensaio local. A seleção não declara prontidão comercial nem autoriza a publicação desse commit.

O [pacote anterior](../Q2_PILOT_REVIEW_2026-11-16.md) permanece um snapshot de `517c206`; seus hashes selecionados não são promovidos silenciosamente ao novo candidato. Este registro e o incremento de navegação compõem o material atualizado de revisão.

## Registro das oito decisões

| ID | Estado atual | Conteúdo registrado | Definição que ainda falta |
| --- | --- | --- | --- |
| PIL-01 | Pendente de delimitação | Candidato técnico `2e9df54` identificado para revisão | Referência pseudônima da empresa existente e setor/coorte; finalidade; período; tamanho/recorte e condições do piloto. Alfa/Beta continuam apenas fixtures, sem escolha automática de empresa real |
| PIL-02 | Pendente de acordo operacional | Limite implementado: jornada educativa administrativa, com autoridade de plataforma distinta de RH_ADMIN. Unidade/atividade 0.1.0 como conteúdo de referência já aprovado localmente | Escopo de serviço, papéis efetivamente incluídos, processo assistido, recursos e aceitação dos responsáveis. Não se concede acesso a líder/colaborador por nome de persona |
| PIL-03 | Pendente de decisão/documento | Protocolo existente propõe informação, voluntariedade, saída e canal de dúvidas; isso não equivale à sua adoção | Documento/versão, responsável e decisão sobre participação/saída e comunicação. Nenhum participante foi contatado |
| PIL-04 | Pendente de decisão/documento | Limite técnico existente: respostas pedagógicas privadas separadas do formulário confirmado no plano; isolamento e proteção de recortes mantidos | Finalidade de cada dado, acesso, compartilhamento, retenção, descarte, custódia e referência da decisão pelos responsáveis. Nenhum prazo ou fundamento foi inventado |
| PIL-05 | Proposta disponível; decisão pendente | [Protocolo de avaliação](../LEARNING_Q2_CLIENT_VALIDATION_PROTOCOL.md) distingue usabilidade, compreensão, recuperação, retenção, transferência, valor percebido e execução | Perguntas/rubricas adotadas, momentos, assistência, análise, limites e critérios de continuar/corrigir/interromper definidos antes da coleta. Não há meta numérica ou critério D9 aprovado por este registro |
| PIL-06 | Pendente de responsável e recursos | Roteiro operacional e recuperação local disponíveis no dossiê; sem operação real iniciada | Responsável operacional, suporte, incidentes, suspensão/recuperação, custos, recursos e metas pactuadas. O papel metodológico de João Paulo não o designa automaticamente como operador |
| PIL-07 | Editorial local concluído; extensão pendente | [D10](D10_UNIT_001_2026-11-15.md): par 0.1.0 aprovado para ensaio local, com revisão de Olga Mariano e Ana Paula Barbalho em 15/11/2026. Não se solicita nova aprovação editorial dessas versões | Decisão específica de extensão ao piloto delimitado, com autoria, referência e integração no processo canônico. Registro, flag ou simples instrução de “continuar” não amplia a disponibilidade |
| PIL-08 | Seleção técnica registrada; ambiente/liberação pendentes | Candidato de revisão `2e9df54`, com evidência local identificada e artefato de seleção | Ambiente-alvo, verificação de configuração/schema/identidade/correio, CI/homologação aplicáveis e autorização específica de operação/publicação. Não houve mudança remota |

## Como completar o registro

Para cada decisão recebida, registrar **resposta exata, autor efetivo, data, referência/versão, escopo, condições e ressalvas**. A referência pode ser pseudônima; dados pessoais, credenciais, listas de empregados e links de acesso não devem ser inseridos no Git. Ausência de documento ou responsável continua explicitamente pendente; o agente não preenche consentimento ou aprovação em nome de terceiros.

A resposta pode ser consolidada em dois blocos, correspondentes às perguntas já apresentadas:

1. **Delimitação e operação:** empresa/coorte, finalidade, período, papéis, responsável operacional e recursos (PIL-01/02/06).
2. **Decisões e documentos:** participação/saída, tratamento dos dados, avaliação, extensão do escopo e ambiente/publicação, identificando quem decidiu e o que permanece pendente (PIL-03/04/05/07/08).

Se a intenção informada for somente continuar o ensaio local Alfa/Beta, registrá-la como esse escopo específico. Isso não responde por uma futura empresa real. Enquanto faltarem as respostas, nenhuma coleta, nova conta real, alteração de autoridade, migration, e-mail externo, push ou deploy decorre deste documento.

## Efeito no produto e verificação

Não foi alterado código, banco, habilitação, curadoria ou regra de autorização. D10 permanece restrito ao ambiente local; Q1, índice composto, D9 e relações ESG mantêm suas próprias decisões. O registro é documental e não cria um segundo mecanismo de aprovação.

Conferência desta preparação: branch/HEAD/status, identidades Git do candidato, igualdade das fontes selecionadas com a prova de build, links locais e revisão do diff. Gate/build anteriores não foram repetidos. `.q.out` e `.q.sql` não foram abertos ou alterados.

**Próximo marco único:** incorporar as definições humanas faltantes para fechar PIL-01–PIL-08. Até lá, a entrega confirmada é a seleção técnica do candidato e o registro transparente das pendências.
