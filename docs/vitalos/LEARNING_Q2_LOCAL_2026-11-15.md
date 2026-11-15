# Q2 — aprendizagem, aplicação e acompanhamento local

Data: 2026-11-15. Base preservada: `ed971e93e64df9529c1b2fe391a53ff225a3eac5`, branch `feat/ivo-fibt-platform-foundation`. O commit que introduz este registro contém o candidato integrado. Antes da onda não havia alterações rastreadas; `.q.out` e `.q.sql` permaneceram não lidos e fora do Git.

## Objetivo e decisão de escopo

Conectar a leitura publicada Q2 a uma prática educacional e, por escolha explícita do administrador, a uma aplicação no plano institucional existente. Mensurar → Educar → Transformar → Evoluir é uma cadeia de trabalho e de evidências distintas; completar um exercício não comprova aprendizagem, mudança organizacional ou eficácia.

Comparação de caminhos, com síntese de decisão ToT:

| Caminho | Valor e dependência | Decisão nesta onda |
| --- | --- | --- |
| Novo LMS, histórico individual e recomendações generativas | Exige contratos de perfis, privacidade, retenção e avaliação ainda não consolidados | Adiado |
| Apenas ampliar o catálogo ou criar novas telas independentes | Aumenta conteúdo, sem demonstrar transferência ao trabalho | Insuficiente para o marco escolhido |
| Compor exercício de sessão e aplicação versionada sobre PI-13 | Reutiliza autorização, fonte publicada, plano, constraints e ledger | Implementado em escopo local TESTE |

Não se criou pontuação de maturidade nem se atribuiu superioridade científica aos exercícios. Os padrões de recuperação, feedback, aplicação contextual e revisão são funcionalidades demonstráveis; sua eficácia no serviço precisa de validação. Não houve nova ingestão dos anexos, importação de conteúdo protegido, busca vetorial ou expansão de RAG/LLM. Curadoria científica D10 permanece pendente; nenhum estudo ou claim foi inventado.

## Implementação e contratos

- `src/domain/ivo/factor-learning-activities.ts`: duas atividades editoriais TESTE, vinculadas exatamente aos conteúdos sintéticos existentes `TESTE-bem_estar-001` e `TESTE-satisfacao_empresa-001`, versão `0.0.1-teste`. Cada uma oferece recuperação, aplicação contextual, explicação, preparação e revisão. Nenhum conteúdo APROVADO foi criado.
- `src/lib/ivo/ivo-education.server.ts` e `ivo-views.ts`: atividade projetada apenas no conteúdo TESTE já autorizado pelo catálogo/runtime descartável. Não se promove conteúdo PROPOSTO nem se associa exercício não aprovado a material APROVADO.
- `src/components/ivo/LearningApplicationJourney.tsx`: respostas em memória de sessão, feedback textual, revisão reversível e confirmação explícita antes do formulário de aplicação. Não há envio das respostas ou de nota. Origem precisa estar publicada e disponível na onda/setor/fator corretos; caso contrário, oferece retorno à origem. Plano encerrado não admite nova aplicação no servidor.
- `src/lib/api/ivo-learning-application.functions.ts` e `src/lib/ivo/learning-application.server.ts`: contrato HTTP estrito; autorização institucional e módulo no servidor; conteúdo, fator, versão de conteúdo e versão de atividade verificados. O cliente não fornece organização nem respostas pedagógicas. Exercícios não concedem privilégio, certificado ou conclusão.
- `src/lib/ivo/fibt-plan-composition.server.ts`: reutiliza PI-13 para aplicação, accountability e idempotência. Referência estruturada `[conteudo:ID@versão]` é adicionada pelo servidor usando o contrato existente, não uma nova tabela. Versão da atividade consta no texto persistido. A chave de retry e as constraints existentes protegem a inclusão concorrente; não se criou um segundo ledger.
- `src/lib/ivo/fibt-action-loop.server.ts`, API e formulários: evidência de aprendizagem pode declarar versão do conteúdo; versão divergente é recusada. `contentVersion` é opcional para compatibilidade com consumidores anteriores. Referência reservada no início de descrição/evidência livre é recusada, evitando que o cliente forje o vínculo estruturado.
- `LearningApplicationTrace` e `src/lib/ivo/learning-application.ts`: rastro descritivo da origem, versão e contagens separadas de execução/aprendizagem. Não é relatório ESG homologado, snapshot oficial ou parecer C8. Não satisfaz por si só o contrato de evidência científica de um relatório ESG.
- `ActionFollowUp.tsx`, `FibtActionLoop.tsx`, `PlanComposition.tsx` e `ivo-integral.acoes.tsx`: composição sobre componentes/rota existentes. IDs de formulários distinguem ação/conteúdo. O engine de quiz existente aceita a projeção mínima dos campos usados, sem mudança de algoritmo.

Não houve migration, dependência nova, mudança de escore, índice IVO, equivalência lente→dimensão, critério de eficácia ou autoridade de plataforma. Q1 e Q2 continuam independentes; fonte brasileira exata e pendência metodológica de Q1 não bloqueiam a engenharia Q2.

### Perfis, privacidade e limites de retry

A escrita segue a autorização administrativa institucional existente, exercitada com RH_ADMIN. Não se implementou jornada privada de colaborador ou de líder, nem se ampliaram papéis. O registro canônico das dinâmicas permanece inalterado: esta composição local de teste não transforma LD-002/006/008/009 em capacidades plenamente homologadas nem expande suas superfícies públicas.

Respostas, acertos e erros ficam somente no estado do componente. A aplicação intencionalmente compartilhada, sua origem e os registros de acompanhamento ficam no ledger organizacional já existente. A interface pede que não sejam incluídos nomes ou relatos pessoais; isso é orientação de minimização, não detector automático de PII. Retenção, exportação individual e telemetria pedagógica não foram ampliadas.

A prova de idempotência refere-se à inclusão da aplicação por PI-13. Registros de evidência não ganharam idempotência nova. Limites anteriormente registrados da identidade de replay PI-13, inclusive alteração posterior de accountability, não são declarados resolvidos por esta onda.

## Evidência executada

Ambiente exclusivo reaproveitado, sem reset: `.institutional-admin.local`, projeto `vitalos-institutional-first-admin`, API `http://127.0.0.1:57621`, DB `127.0.0.1:57622`, correio `127.0.0.1:57624`, app `http://localhost:8091`. O harness e a prova validam o alvo exato; Docker disponível não é tratado como autorização suficiente. Apenas Alfa/Beta e identidades sintéticas existentes foram usadas. O stack preservado `.ivo-demo.local` não foi usado.

`scripts/institutional-local.ts dev --learning` habilita explicitamente a fixture local `ACTION_PLAN`, após as validações existentes; não altera o registro global de capabilities. O guard de scripts aceita nominalmente a nova prova, sem liberação geral de scripts sem preflight.

| Verificação | Resultado e limite |
| --- | --- |
| Testes direcionados PI-13/formulário/engine | 101 aprovados |
| Testes direcionados jornada/UI/PI-13/governança | 85 aprovados; contagens dos grupos se sobrepõem |
| Teste de fronteira TTL após estabilização | 19 aprovados no arquivo; relógio fixo somente no teste |
| Gate do candidato integrado | 4.284 aprovados, zero falhas, 330 arquivos; paridade, TypeScript e secret-scan aprovados |
| Build inerte isolado | Aprovado; 669 fontes/293 artefatos varridos; `.output` original preservada por inventário/tamanho/mtime |
| Nova jornada HTTP/Auth/PostgREST | 20 verificações aprovadas |
| Releitura em outro processo e novo login | 4 verificações aprovadas |
| Navegador real | Não concluído: ferramenta interrompeu o controle por validação de URL |
| CI, staging, clientes reais | Não executados nem confirmados nesta onda |

O primeiro gate teve uma única falha intermitente na fronteira de TTL do rascunho de survey: o teste usava duas leituras de `Date.now()`. A correção limita-se ao teste `src/engine/survey/survey-draft-engine.test.ts`, com instante fixo e verificação adicional em `now + 1`. Código de produção desse engine não foi alterado. O gate final acima foi executado após essa correção. Build não foi repetido por alteração exclusiva do teste; documentação posterior não invalida essas provas.

Comandos usados (Bun local disponível no PATH do processo):

```powershell
bun test src/lib/ivo/plan-composition.server.test.ts src/components/ivo/PlanComposition.test.tsx src/engine/learning/trail-engine.test.ts
bun test src/components/ivo/IvoJourney.test.tsx src/lib/ivo/plan-composition.server.test.ts src/lib/ivo/ivo-governance.server.test.ts
bun test src/engine/survey/survey-draft-engine.test.ts
bunx tsc --noEmit
bun --no-env-file run scripts/institutional-local.ts dev --learning
bun --no-env-file run scripts/institutional-learning-proof.ts
bun --no-env-file run scripts/institutional-learning-proof.ts --readback
bun run gate
bun --no-env-file run scripts/institutional-module-inert-build.ts
git diff --check
```

Não executar novamente o comando de prova de escrita apenas para consultar resultados: um novo pedido gera nova aplicação sintética. `--readback` consulta o item já registrado. Repetir testes amplos só após alteração que invalide o resultado.

As 20 verificações cobrem: origem Q2 publicada reutilizada sem nova coleta; Q1 desligado; fixture TESTE; plano/accountability/ativação pelos contratos existentes; duas chamadas simultâneas com um único efeito; fator/versões adulterados recusados; respostas pedagógicas extras recusadas pelo schema HTTP; execução e aprendizagem gravadas separadamente; evidência de conteúdo desatualizado recusada; Beta habilitada incapaz de escrever no plano de Alfa; sessão aberta recusada após desabilitar Q2; novo login com releitura; RLS impedindo leitura direta por Beta. Habilitações foram restauradas ao estado inicial (Alfa Q2 ligada/Q1 desligada; Beta Q2 desligada).

Artefatos locais ignorados pelo Git: `learning-proof.json`/`.log`, `learning-readback.json`/`.log`, `learning-tsc.log`, `learning-gate.log`, `learning-gate-final.log`, `learning-build.log`, `learning-build-proof.json`, sob `.institutional-admin.local`. Metadados do build apontam para `module-build-1794761882285`; o helper existente também atualizou seu arquivo genérico `module-build-proof.json`, preservando diretórios/logs anteriores. Nenhum token, credencial, resposta pessoal ou dump foi incorporado a este registro. O JSON local de prova contém apenas referência sintética e resultados.

## Bloqueio visual e roteiro manual

Procedimento suportado: inventário de apps → seleção de janela Chrome → captura do estado → abertura de guia. A ferramenta interrompeu a última operação com:

> Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.

Não se desabilitou a validação, ampliou permissão ou tentou outra automação como contorno. Não houve interação nova com o app via navegador. DOM tests e HTTP/DB não substituem essa evidência.

Roteiro pendente, apenas no ambiente sintético acima:

1. Conferir os endpoints/projeto e o launcher `dev --learning`; acessar `http://localhost:8091`. Entrar como administrador sintético de Alfa pelo fluxo normal e correio local se o login solicitar; nunca injetar sessão administrativa.
2. Abrir leitura Q2/ações; conferir conteúdo TESTE, responder, observar explicação, usar revisão e preparar aplicação somente após escolha explícita. Conferir origem e preencher responsável/prazo/indicador no formulário. Não usar nomes ou relatos reais.
3. Recarregar e entrar novamente: aplicação e versões devem permanecer; respostas pedagógicas reiniciam. Registrar execução e aprendizagem separadamente, sem declarar eficácia.
4. Em outra sessão normal, autoridade sintética da plataforma desabilita Q2 de Alfa. A sessão administrativa já aberta deve receber recusa ao tentar nova escrita, inclusive por navegação direta/recarga. Restaurar o estado anterior ao fim.
5. Conferir Beta isolada e Q1 desligado; confirmar Q2 independente. Para testar Q1 habilitado, manter o bloqueio metodológico e restaurar seu estado inicial. Capturar somente telas sanitizadas, sem links de login/tokens.

## Maturidade e próximo marco

### Continuidade: evidência visual parcial

Na tentativa posterior ao commit `a738bde`, a navegação suportada abriu `/ivo-integral/acoes` em `localhost:8091`. Foram observados plano ativo, duas ações, um registro de execução e um de aprendizagem, avisos de curadoria D10 pendente e eficácia não avaliada. Isso comprova renderização desses registros na sessão já aberta; não comprova novo login, envio do formulário educacional, recuperação ou revogação visual de acesso.

Os cinco containers do harness exclusivo estavam ativos. O launcher adicional passou pelo preflight, mas o Vite escolheu 8092 porque 8091 já estava ocupada. O processo anterior foi identificado e preservado; somente o duplicado desta tentativa foi encerrado. O endereço 8091 respondeu HTTP 200. Nenhum setup, reset, seed ou migration foi executado. A constatação anterior de indisponibilidade não descreve esse momento posterior.

O controle voltou a ser interrompido pela validação de URL durante uma ação de localização na página. Não se tentou contorno. A prova permanece parcial, com o mesmo roteiro manual acima. Não repetir automaticamente a tentativa bloqueada sem sinal de recuperação da ferramenta. Gate, build e provas HTTP/DB anteriores não foram repetidos, pois não houve mudança de código.

**Implementado e integrado em HTTP/DB local descartável, com conteúdo TESTE.** Jornada visual integrada ainda não comprovada; conteúdo científico aprovado, cobertura completa de personas, validação de retenção/transferência e valor com clientes permanecem pendentes. Não há declaração de prontidão comercial ou homologação remota.

Próximo marco operacional único: concluir a interação real no navegador do roteiro acima, reutilizando o gate/build/HTTP/DB válidos. A curadoria D10 pode avançar de forma independente por decisão humana. O protocolo em [LEARNING_Q2_CLIENT_VALIDATION_PROTOCOL.md](LEARNING_Q2_CLIENT_VALIDATION_PROTOCOL.md) prepara uma futura avaliação; não autoriza piloto, coleta real ou publicação.
