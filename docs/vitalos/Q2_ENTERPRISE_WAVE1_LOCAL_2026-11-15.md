# Onda 1 Q2 — jornada empresarial e prova local integrada

Data: 2026-11-15. Base preservada: `7bae2bcd690741f6fd16d16a2d1740baf432b9c6`, branch `feat/ivo-fibt-platform-foundation`. Nenhuma alteração rastreada anterior à onda. Este registro acompanha as correções e o commit local de fechamento. `.q.out` e `.q.sql` permaneceram não rastreados, sem abertura, alteração ou stage.

**Resultado e alcance**

Fechada a prova de navegador antes pendente de habilitação e aplicação Q2, com login normal pelo correio local, controles de plataforma, recusa em sessão já aberta, publicação protegida, aprendizagem/aplicação e releitura independente. A inspeção encontrou defeitos alcançáveis no fluxo e eles foram corrigidos nesta onda. A coleta pública também foi demonstrada: novo setor e cinco participações fictícias de 32 itens, sem inserir respostas por SQL ou substituir a interface por chamadas de backend.

Isso comprova engenharia e operação **locais, sintéticas, com conteúdo TESTE**. Não libera serviço comercial, não aprova conteúdo/atividade, não comprova aprendizagem/eficácia e não confirma CI/staging. O catálogo D10 continua sem conteúdo aprovado; o caminho de atividade aprovada ainda exige sua própria integração. Q1 continua aguardando a incorporação da fonte brasileira já aprovada.

**Alvo, identidade e preservação**

- Stack próprio já existente: `.institutional-admin.local`, projeto `vitalos-institutional-first-admin`; container `supabase_db_vitalos-institutional-first-admin`.
- API `http://127.0.0.1:57621`; banco em `127.0.0.1:57622`; Mailpit `http://127.0.0.1:57624`; app em `http://localhost:8091`.
- O helper `institutionalEnv` conferiu API, DB URL, container exato e `project_id` antes das escritas. O pipe Docker estava bloqueado no sandbox; a revisão automática autorizou a consulta e as provas locais no alvo delimitado. Nenhuma permissão do Windows ou proteção de navegador foi desativada.
- Plataforma autenticada como identidade sintética existente `platform@institutional.test`, na origem local `127.0.0.1:8091`. Alfa autenticada como `alfa@institutional.test`, em `localhost:8091`. As origens separaram o armazenamento das sessões; o allowlist local já autorizava os dois callbacks. Não foi alterado.
- Os três logins interativos (plataforma/Chrome, Alfa/Chrome, Alfa/navegador integrado) começaram no formulário do produto e seguiram links recebidos no Mailpit. Destino da API e callback foram conferidos antes do clique; tokens e links de login não foram registrados. Nenhuma sessão foi criada administrativamente.
- Sem setup, reset, migration, seed, troca de credencial ou conta nova nesta onda. `.ivo-demo.local`, ambientes remotos e dados reais não foram usados. O servidor/containers anteriores permaneceram ativos; o app recebeu as alterações pelo desenvolvimento local existente.

**Correções motivadas por observação e inspeção dirigida**

| Achado | Correção e arquivos | Verificação |
| --- | --- | --- |
| `/admin` apresentava nenhuma onda, embora o controle Q2 e o banco tivessem oito | `org-read-client.server.ts` cria cliente isolado por chamada, com chave publicável e token do chamador. `wave-admin.functions.ts` injeta esse cliente nas duas listagens. `db-adapter.ts` recusa cliente ausente e erro/resposta ausente, sem fallback para singleton sem sessão | Navegador passou a listar as oito ondas; teste de headers concorrentes, testes de autorização/falha e releitura Auth/PostgREST com o helper real |
| Falha de consulta em `/admin` podia terminar como vazio legítimo | `admin.tsx` distingue erro, configuração indisponível, sessão ausente, carregamento e vazio confirmado; permite recuperação por Atualizar | Caminho de sucesso visto no navegador; recusas/falhas do leitor cobertas por regressões |
| Consentimento FIB-T estava rotulado como risco psicossocial, e agradecimento associava o resultado ao GRO | `respond.s.$token.tsx` deriva cabeçalho e agradecimento da definição do instrumento. Texto posterior ao envio explica publicação condicionada e separa registro de aprendizagem/eficácia | Três regressões de apresentação para FIB-T/COPSOQ e nova submissão real pela interface após a correção |
| Conta institucional sem nome acessível quando o nome visual ficava oculto | `AppShell.tsx`: nome acessível permanente, controle com área mínima de 44 px e menu Radix já existente, com semântica/teclado/foco próprios | Nome anunciado na árvore mobile; Enter abre, Escape fecha e devolve foco ao botão |
| Cabeçalho causava overflow de 23 px em viewport 360 | `AppShell.tsx` usa símbolo oficial da marca abaixo de `sm`, mantendo logo horizontal nas larguras maiores | Reflow sem overflow em 320/360/768/1280 px; formulário pedagógico aberto também conferido em 320 px |
| Painel RH mostrava o vazio legado “aguardando respostas” mesmo com Q2 publicado ou desabilitado | `RHDashboard.tsx` deixa a indicação institucional de leitura com `InstitutionalModules`, removendo o cartão de cápsula legado dessa ramificação | Publicação disponível e módulo recusado vistos no painel, sem a promessa de liberação automática com cinco respostas |
| Quadro de saúde operacional não abrangia toda a jornada Q2 e convertia erros de contagem em zero | `customer-health.server.ts` retém a pontuação se faltar uma consulta; distingue falha por conta e falha do inventário. `plataforma.tsx` apresenta loading/erro e explicita cobertura legada. `customer-health-engine.ts` ajusta somente linguagem da contagem e comentário, sem mudar fórmulas | Sete regressões de contagem/escopo e apresentação real do quadro com limites junto dos números |

Nenhuma policy, grant, trigger, migration, parâmetro científico, item, escore, normalização, peso, mapping, índice IVO, critério D9 ou relação ESG foi alterado. A autorização de plataforma e as verificações de vínculo/papel continuam existentes. A listagem autenticada não usa service role como substituta da identidade na leitura protegida por RLS; contagens privilegiadas anteriores continuam dentro do escopo validado do servidor.

**Jornada executada pelo produto**

1. Entrar na plataforma por e-mail local. Registrar Beta: Q1 desligado/revisão 9; Q2 desligado/revisão 13. Registrar Alfa: Q1 desligado/revisão 42; Q2 ligado/revisão 85.
2. Encerrar a sessão Alfa existente pelo produto, solicitar novo login e seguir o link do Mailpit. Recuperar o plano ativo, suas duas ações iniciais e seus registros anteriores. Abrir leitura Q2 e centro de controle da onda `a339451f-7642-4ed1-b629-e1ad6f42ec86`: fatores 3,00, bruto 9,00, publicação de cinco participações; a sexta participação não forçou republicação.
3. Abrir atividade TESTE vinculada ao fator Bem-Estar. Conferir feedback de resposta inadequada, revisão que zera respostas, escolha explícita de compartilhamento e formulário. Preparar uma aplicação sem enviá-la.
4. Pela plataforma, habilitar Q1 de Alfa e desabilitar Q2 com confirmação. A tentativa de inclusão na sessão Alfa já aberta foi recusada e a jornada passou ao estado de módulo indisponível. Nova navegação direta para a leitura Q2 também recusou, sem fallback demonstrativo. No painel RH, Q1 habilitado continuou bloqueado pela pendência da fonte e Q2 apareceu desabilitado.
5. Restaurar Alfa a Q1 desligado e Q2 ligado. O plano continuava com duas ações: a tentativa recusada não deixou inclusão parcial. Refazer a aplicação pela interface: título `Aplicação Q2 — prova de navegador Onda 1`, responsabilidade sintética, prazo 2026-11-22 e indicador de execução. Uma ação foi incluída por PI-13, com conteúdo/atividade `0.0.1-teste`, sem copiar escore para o ledger.
6. Mudar a nova ação para em execução; registrar uma execução e uma aprendizagem separadamente; concluir a ação. O rastro mostrou 1 execução/1 aprendizagem, conteúdo TESTE e eficácia não avaliada. Não se gravou resposta pedagógica ou nota no ledger. O plano não foi encerrado: outras ações permanecem em andamento e seus estados posteriores foram preservados.
7. Ao conferir a configuração, observar o falso vazio de `/admin`; corrigir o leitor e confirmar as oito ondas na interface. Na mesma onda existente, cadastrar `Equipe navegador Onda 1` e emitir seu link setorial pela interface. Nenhuma organização ou onda foi duplicada.
8. Abrir o formulário público e enviar cinco participações sintéticas, cada uma com 32 itens e aceite explícito. Primeira no Chrome e quatro no navegador integrado, incluindo viewport mobile. A primeira submissão revelou o agradecimento inadequado; a seguinte confirmou sua correção. Os valores sintéticos uniformes por submissão foram 3, 2, 4, 1 e 3 — fixture controlada, sem representar pessoas ou benefício real.
9. Abaixo de cinco, o novo setor permaneceu protegido e a leitura anterior foi retida por supressão complementar: comportamento esperado para impedir subtração. Ao completar o limiar e atualizar o centro de controle, os dois setores foram liberados pelo publicador canônico. Anterior: 3,0 por fator/bruto 9,0, publicação ainda de cinco; novo: 2,6 por fator/bruto 7,8, cinco participações publicadas. Não se produziu média da onda nem interpretação de risco.
10. Fazer novo login normal de Alfa no navegador integrado e recarregar. A aplicação, seu estado e os dois registros persistiram; as respostas pedagógicas recomeçaram vazias. Conferir revisão privada e formulário em viewport estreito sem nova escrita. Recarregar a aba original ao final para deixar os dados atuais disponíveis.

Na automação, preenchimento inicial da data não havia atualizado o estado React; a data foi confirmada pelo teclado e pelo texto legível da interface antes do envio. Algumas ações foram aguardadas por estado anexo após hidratação/animação, sem desativar validação. Um `networkidle` final expirou no Chrome; a captura DOM posterior confirmou a recarga e os registros. Não é falha persistente de autorização/URL, e não invalida a prova concluída.

**Persistência, isolamento e limites do que foi reprovado**

Releitura em processo independente, após o guard do stack: autenticação sintética por credencial pública, criação do mesmo cliente de leitura novo e consultas PostgREST com JWT do usuário. Alfa leu oito ondas; Beta não recebeu ondas de Alfa e Alfa não recebeu ondas de Beta. SELECTs locais sanitizados confirmaram as duas publicações e exatamente uma aplicação concluída com 1 execução, 1 aprendizagem e referência versionada.

| Empresa | Estado final Q1 | Estado final Q2 | Preservação |
| --- | --- | --- | --- |
| Alfa | desligado, revisão 44 | ligado, revisão 87 | Bits iniciais restaurados; duas transições por módulo registradas normalmente |
| Beta | desligado, revisão 9 | desligado, revisão 13 | Estado e revisão iniciais inalterados |

Beta permaneceu com Q2 desligado nesta prova nova. Os casos anteriores com Beta habilitada, concorrência/CAS, expiração/revogação de convites, publicação em lote e retry PI-13 continuam ancorados nos registros anteriores; não foram todos reexecutados. A alteração desta onda é de leitura/apresentação, sem mudança nas transações desses caminhos. O rastro de uma inclusão única e a recusa sem efeito parcial não criam uma garantia nova de idempotência para todos os registros de evidência.

**Responsividade e acessibilidade observadas**

O conector Chrome validou a URL e permitiu usar a aba local já existente; o bloqueio antigo do controle nativo Windows não foi contornado. A API de viewport do Chrome não produziu a largura mínima solicitada; para tamanhos exatos foi usada a capacidade suportada do navegador integrado. As guias concluídas criadas pela prova foram encerradas antes de selecionar o viewport da jornada institucional; overrides foram restaurados ao final.

| Largura de layout | Largura útil sem scrollbar | Maior largura de conteúdo | Escopo |
| --- | --- | --- | --- |
| 320 | 305 | 305 | Ações, revisão privada e formulário pedagógico aberto |
| 360 | 345 | 345 | Consentimento/questionário/recibo e acompanhamento Q2; temas claro/escuro |
| 768 | 753 | 753 | Acompanhamento em tablet |
| 1280 | 1265 | 1265 | Acompanhamento desktop e leitura nativa com dois setores |

Teclado: menu da conta abre com Enter, fecha com Escape e restaura foco ao controle nomeado. Capturas/DOM demonstram os estados testados; não equivalem a auditoria completa de WCAG, leitor de tela real, contraste instrumental, zoom 200%, impressão ou de todas as rotas/perfis. A diferença de 15 px nas larguras úteis corresponde à scrollbar vertical, sem overflow horizontal.

**Verificações do candidato**

- 71 testes direcionados de jornada/PI-13/shell/saúde operacional passaram; 7 testes de saúde foram repetidos após tipar a porta de consultas.
- 24 testes de leitura autenticada/tenancy/servidor de ondas passaram; 61 de mensagens, consentimento, banco de itens e contrato setorial passaram. Grupos se sobrepõem; não somar essas contagens ao gate.
- Gate integrado final: **4.315 pass / 0 fail / 339 arquivos / 13.412 assertions**, paridade de schema, TypeScript e secret-scan aprovados. O gate anterior de 4.307 foi sucedido porque a prova encontrou novos defeitos de listagem e de identidade do instrumento; não se repetiu sem mudança.
- O gate foi executado em etapas equivalentes às de `package.json`, com `bun --no-env-file test src scripts`, `bun --no-env-file scripts/schema-parity-check.ts`, `node node_modules/typescript/bin/tsc --noEmit` e `bun --no-env-file scripts/build-secret-scan.ts`. O Node foi usado para o compilador instalado; nenhum `.env` foi carregado pelo Bun nestas chamadas.
- Lint direcionado sem erros; um aviso preexistente de Fast Refresh em `AppShell.tsx:107`. Regra Prettier desligada para não normalizar CRLF em arquivos legados; `no-explicit-any` foi mantida nos arquivos novos/porta de saúde e desativada na verificação dos arquivos legados que já usam `any`. Não equivale a lint integral sem exceções.
- Build final inerte em `module-build-1794784529885`: aprovado, 678 fontes/302 artefatos varridos, endpoints `.invalid`, sem credenciais e sem copiar `.env`. Inventário/tamanho/mtime da `.output` original preservados pelo helper. SHA-256 dos 14 arquivos alterados de código/teste conferidos contra a cópia compilada: **zero divergências**.
- Testes direcionados no sandbox emitiram `EPERM` não fatal ao inspecionar o diretório pai e avisos de `act` em testes existentes; a execução final autorizada do gate terminou verde. Nenhuma falha de produto foi atribuída a esses avisos.
- Nenhum gate/build/prova HTTP/DB repetido após este fechamento exclusivamente documental.

**Artefatos sanitizados locais**

Sob `.institutional-admin.local`, ignorado pelo Git: `q2-wave1-integrated-gate.log`, `q2-wave1-integrated-build.log`, `q2-wave1-integrated-readback.json`, `q2-wave1-candidate.json` e `q2-wave1-evidence/`. O manifesto de candidato é fechado após o commit, para registrar o SHA sem autorreferência no commit documental. O JSON de observações do navegador é um registro de observação assistida, não uma suíte automática independente.

| Artefato | SHA-256 |
| --- | --- |
| `q2-wave1-integrated-readback.json` | `ae71b4fc9d8ca3962024e0c8fd8981a2768f6eae674db8744ffed7a024a9e402` |
| `q2-wave1-evidence/browser-observations.json` | `d05479cd34635c37826f6496233cac9aee0c05e426dc4ca9493bfc3bc1511de4` |
| `q2-wave1-evidence/acoes-mobile-360-light.jpg` | `4c8e22fae06f2dea04bd0d0f23c4af512d4bbb6ebaeb3fa876dda8dd5659aa2e` |

Capturas: acompanhamento em 320/360/768/1280, recibo mobile e leitura Q2 desktop. Não contêm magic links, tokens, senhas, respostas pedagógicas ou contas reais. O recibo público contém somente metadados e prefixo não autenticante do recibo. Identificadores/nomes de empresas e setores são sintéticos.

**Maturidade, pendências e próximo marco**

Alcançado: jornada técnica local Q2 comprovada no navegador, do controle institucional à participação/publicação e aplicação acompanhada, reutilizando a onda e o ledger existentes; leitura autenticada corrigida e isolamento verificado. A aplicação educativa usa a publicação do setor original, preservada ao fim; o setor novo demonstra a coleta e o publicador. Não se atribui o resultado de uma fonte a outra.

Permanecem: conteúdo/atividade de produção sob D10; validação de retenção/transferência/valor com clientes e protocolo aprovado; revisão de personas além da escrita administrativa existente; limites de retry de evidências e comparabilidade protegida entre ciclos; aprovação D9/RELs ESG quando pertinentes; CI/homologação do candidato e condições de operação SaaS. Nomear João Paulo Brandão Barboza responsável metodológico não constitui sua aprovação ou assinatura.

Próximo marco único: **preparar uma unidade Q2 e sua atividade versionadas para revisão D10, com fonte/uso/claims/rubrica verificáveis, e fechar a integração do caminho aprovado após a decisão efetiva**. Engenharia pode preparar o contrato e testes com propostas/fixtures identificadas; não promover TESTE por troca de rótulo. Fonte COPSOQ permanece dependência específica de Q1 e não bloqueia esse trabalho independente. O [protocolo de validação com clientes](LEARNING_Q2_CLIENT_VALIDATION_PROTOCOL.md) continua proposta, sem autorização de coleta real.
