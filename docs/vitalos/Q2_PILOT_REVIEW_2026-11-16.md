# Q2 empresarial — pacote de revisão antes do piloto

Estado: **preparado localmente para revisão; piloto real não autorizado por este pacote**. Data: 16/11/2026. Candidato de produto: `517c2066c9b6de0cfeb5914ca107296c1e96d29e`, branch `feat/ivo-fibt-platform-foundation`. O commit desta preparação acrescenta ferramenta/documentação, sem modificar o aplicativo ou seus controles de disponibilidade.

## Decisão proposta e ponto de partida

Revisar uma primeira oferta Q2 assistida, delimitada por empresa/coorte e apenas pelos papéis já implementados. Reutilizar acesso institucional, publicação protegida FIB-T, unidade/atividade 0.1.0, PI-13 e registros separados de execução/aprendizagem. A revisão deve resultar em um escopo e uma autorização próprios antes de qualquer ativação real. Não se escolheu cliente, período, quantidade de participantes ou meta de eficácia pelo agente.

O ciclo é Mensurar → Educar → Transformar → Evoluir. EU, NÓS, LIDERANÇA e ORGANIZAÇÃO são dimensões IVO; Q1 COPSOQ, Q2 FIB-T, Q3 PERMA+V e Q4 VIA-T são lentes. A oferta Q2 pode usar a leitura nativa sem índice composto ou equivalência entre construtos. Q1 e relações ESG conservam dependências específicas, que não impedem preparar esta revisão Q2.

Comparação ToT: notas de julgamento técnico, 0–10; maior favorece valor, segurança, economia, baixo risco, alinhamento, reuso, simplicidade, escala e rapidez, nessa ordem. Não são evidência científica ou critério de aprovação de piloto.

| Caminho | Valor | Segurança | Economia | Baixo risco | Alinhamento | Reuso | Simplicidade | Escala | Rapidez |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A · pacote verificável de escopo Q2 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 9 |
| B · construir nova plataforma de gestão de pilotos | 6 | 6 | 3 | 4 | 6 | 4 | 3 | 8 | 3 |
| C · apresentar somente demonstração | 4 | 7 | 8 | 7 | 4 | 6 | 9 | 3 | 9 |
| D · aguardar todas as decisões Q1/ESG | 2 | 9 | 5 | 8 | 3 | 4 | 9 | 2 | 1 |
| E · adotar serviço externo de pesquisa/telemetria | 6 | 5 | 4 | 4 | 6 | 5 | 4 | 8 | 5 |
| F · ampliar o registro canônico existente | 8 | 9 | 8 | 8 | 9 | 10 | 7 | 8 | 7 |

Escolha: A, consultando os contratos de F sem criar um segundo registro de aprovação. Trade-off: limita novidades, mas entrega uma decisão concreta e conferível. Risco principal: confundir integridade documental ou aprovação editorial local com liberação para cliente. Aceite desta preparação: fontes/versões rastreáveis, diferenças de escopo explícitas, formulário de decisão e verificador offline. Primeiro passo humano: responder ao quadro de delimitação abaixo, sem repetir a aprovação do conteúdo.

## O que já está aprovado e o que muda com um piloto

Unidade `Q2-bem_estar-aprendizagem-equipe-001` e atividade `Q2-pratica-aprendizagem-equipe-001`, ambas 0.1.0, foram aprovadas para **ensaio técnico local descartável**. João Paulo é o responsável metodológico; Olga Mariano e Ana Paula Barbalho, ambas, revisaram e aprovaram sem ajustes em 15/11/2026. Fonte de verdade: [decisão D10](decisions/D10_UNIT_001_2026-11-15.md), registro metodológico v0.3.0 e curadoria dos dois artefatos. Não há nova aprovação editorial pendente dessas versões.

Passar a uma empresa real exige delimitar o novo contexto e registrar a decisão de extensão de escopo pelo processo existente. O controle de runtime continua restringindo o par ao ambiente local; preencher este documento ou obter `INTEGRIDADE_LOCAL_OK` não altera esse controle. A integração técnica da extensão só poderá ocorrer depois da decisão específica; não se propõe retirar guards ou habilitar contas pessoais.

## Capacidade atual e limites de serviço

| Etapa / perfil | Capacidade respaldada localmente | Limite para revisão |
| --- | --- | --- |
| Autoridade de plataforma | Convite do primeiro administrador de empresa existente; habilitação Q1/Q2 separada da autoridade da empresa | Identidade legítima já configurada; sem criação de autoridade real pelo agente |
| RH_ADMIN · acesso | Login normal por e-mail local, vínculo persistido, recuperação, sessão e destino institucional | Correio externo, callbacks e ambiente remoto ainda não homologados |
| Mensurar Q2 | Leitura publicada por setor, fatores 0–4 e bruto 0–12; proteção sem substituição por zero | Não há média de onda ou índice IVO aprovado; usar apenas recortes autorizados |
| Educar Q2 | Unidade/atividade 0.1.0, fonte/claim/limites, recuperação antes do feedback e compartilhamento explícito | Público educativo implementado nesta fatia é administrativo; não prometer a mesma jornada para líder/colaborador |
| Transformar | Origem publicada preservada, aplicação no plano existente, estado e registros de execução/aprendizagem separados | Concluir ação não prova aprendizagem nem eficácia; sem respostas individuais no ledger |
| Evoluir | Revisão operacional, barreiras e protocolo em estados autorizados | Critério D9 e inferência de eficácia não são concedidos por esta entrega |
| Prestação de contas | Rastro descritivo da aplicação; corpo demonstrativo do relatório identificado | Não é relatório de impacto ESG homologado nem certificação |

As provas de convites, módulos, isolamento, concorrência e DB continuam nos seus próprios registros/candidatos. Não foram reexecutadas para preparar este pacote. A [macro-onda local](MACRO_ONDA_AUTONOMA_FECHAMENTO_2026-11-16.md) registra 4.366 testes, TypeScript, paridade, secret-scan e build inerte. São evidências históricas do candidato, não execução nova, CI atual ou homologação remota.

## Quadro único de delimitação — preencher na revisão

Use referências pseudônimas e documentos institucionais apropriados; não coloque dados pessoais, credenciais, listas de empregados ou links de acesso no Git. Estes campos são proposta de organização da revisão, não uma política de tratamento de dados aprovada.

| ID | Decisão específica | Estado / resposta | Material para decidir |
| --- | --- | --- | --- |
| PIL-01 | Empresa existente, recorte/coorte, finalidade, período e versão do candidato | Pendente | Jornada acima; IDs internos só no ambiente autorizado |
| PIL-02 | Escopo contratado e papéis incluídos; processo assistido, responsáveis e recursos | Pendente | RH_ADMIN educativo atual; autoridade de plataforma distinta; sem acesso novo por persona |
| PIL-03 | Informação, voluntariedade, saída e canal para dúvidas/efeitos indesejados | Pendente | [Protocolo proposto](LEARNING_Q2_CLIENT_VALIDATION_PROTOCOL.md); revisão pelos responsáveis |
| PIL-04 | Acesso aos dados, compartilhamento, retenção, descarte e custódia dos registros | Pendente | Respostas pedagógicas privadas separadas do plano; dados necessários por finalidade |
| PIL-05 | Perguntas, tarefas, rubricas, momentos, assistência, análise e critérios de continuar/corrigir/interromper | Pendente | Matriz de avaliação do protocolo; sem meta inventada ou intervalo universal |
| PIL-06 | Operação: suporte, incidentes, suspensão, recuperação, custos e responsável operacional | Pendente | Roteiro abaixo; metas e recursos precisam ser pactuados, não presumidos |
| PIL-07 | Estender o escopo do par aprovado ao piloto delimitado, com evidência e revisão pelo processo canônico | Pendente | Mesmos artefatos 0.1.0; aprovação editorial existente preservada; não liberar por edição do JSON gerado |
| PIL-08 | Ambiente, publicação e verificações remotas do mesmo candidato; autorização de operação | Pendente | Pacote local não demonstra CI/staging, correspondência de schema, correio externo ou capacidade remota |

As respostas devem indicar responsável efetivo, data, referência/versão e ressalvas. Não atribuir decisão a pessoa pelo preenchimento de um campo. O próximo passo após a revisão é conferir a coerência das respostas e preparar a extensão no mecanismo existente; não publicar automaticamente.

## Roteiro de operação proposto, sem execução real

1. Antes de ativar: conferir decisão de escopo e versão; ambiente/alvos; identidade de plataforma; instalação/upgrade aplicáveis; autorização e privacidade. As provas locais não substituem essas verificações no destino. Não executar migrations pelo fato de este pacote existir.
2. Confirmar acesso administrativo e recuperação de e-mail sem duplicar organização. Conferir Q2 habilitado e Q1 independente; habilitação não equivale a publicação.
3. Percorrer a coleta/publicação autorizada ou reutilizar publicação elegível, mantendo supressão e recortes. A quantidade de respostas, sozinha, não garante disponibilidade.
4. Administrador explica uma leitura e seus limites; realiza a atividade em contexto privado; compartilha somente a aplicação confirmada. Registrar ajuda recebida sem capturar respostas individuais por conveniência.
5. Acompanhar execução, aprendizagem, barreiras e revisão em momentos pactuados. Descrever ausência, desistência e perda de acompanhamento; satisfação não substitui retenção ou transferência.
6. Diante de acesso alheio, divulgação indevida ou comportamento crítico, interromper a operação afetada e acionar o responsável. A proposta de suspensão usa os controles existentes de plataforma, preserva histórico e exige verificar a recusa em sessão aberta/URL direta. Não executar mudanças de módulos no ambiente preservado durante esta preparação.
7. Ao fechar, separar tarefa concluída, dado observado, relato e hipótese. Registrar a decisão de continuar, corrigir ou interromper, com limites. Não converter a revisão em selo, impacto ESG ou eficácia.

Roteiro técnico residual já conhecido: no stack descartável autorizado, localizar o cartão “Aplicação Q2 aprovada — D10 0.1.0 — ensaio local” em 320/360 px e completar a inspeção por pixels de referências, execução/aprendizagem e foco, sem nova ação. A ferramenta retornou quadro vazio no scroll distante. O resumo mobile e a entrada já têm capturas válidas; a captura detalhada não é declarada concluída aqui.

## Integridade do pacote: uso e interpretação

O [índice JSON gerado](Q2_PILOT_REVIEW_PACKAGE_2026-11-16.json) referencia o candidato, extrai curadoria dos carregadores canônicos e calcula SHA-256 dos arquivos explicitamente selecionados, incluindo manifesto FIB-T e registros de evidência, claims e mecanismos. Não lê `.env`, `.q.out`, `.q.sql`, banco, Mailpit ou configurações privadas. Textos usam normalização CRLF→LF em UTF-8; imagens usam bytes exatos. Não é assinatura digital, prova de autenticidade, fechamento completo das dependências ou aprovação.

Comando seguro de conferência, somente leitura:

```powershell
bun --no-env-file scripts/q2-pilot-review-package.ts --check
```

Sucesso imprime **INTEGRIDADE_LOCAL_OK** e **PILOTO_REAL_NAO_AUTORIZADO**. Código de saída zero significa apenas consistência do índice, não liberação do serviço nem execução dos testes relatados. O JSON contém perguntas sem respostas; não é um segundo registro de decisões nem deve ser preenchido à mão.

Se um arquivo selecionado, versão ou metadado divergir, revisar a alteração antes de regenerar. A conferência recusa divergências. A escrita é exclusivamente local e explícita:

```powershell
bun --no-env-file scripts/q2-pilot-review-package.ts --write
bun --no-env-file scripts/q2-pilot-review-package.ts --check
```

Mudança na curadoria/versão/escopo canônico do par exige revisar a própria ferramenta e o pacote; não há promoção automática. Mudanças fora dos arquivos selecionados e validade de serviços externos não são verificadas por esse índice. A revisão deve considerar o diff completo e as provas aplicáveis. O candidato de produto e o commit posterior de preparação são identidades distintas.

## Divergências históricas que não concedem liberação

O [checklist histórico de prontidão](../CHECKLIST_PRONTIDAO_PILOTO.md) contém declarações de GO técnico e CI relativas àquela entrega. O [manifesto histórico FIB-T](../fibt-prod/FIBT_RELEASE_CANDIDATE_MANIFEST.md) aponta outra branch/base. Nenhum desses documentos comprova liberação do par Q2 atual ou estado remoto de `517c206`. Foram preservados, sem reinterpretar aprovações ou escolher uma metodologia em conflito.

Não se reabre a confirmação informada da COPSOQ. Sua fonte exata/correspondência permanece dependência própria de Q1. Vínculos ESG, índice composto e D9 também não são condições para descrever as funções nativas autorizadas de Q2, mas são condições para suas respectivas alegações futuras.

## Verificação desta preparação

Alterações: gerador `scripts/q2-pilot-review-package.ts` e teste; este dossiê e índice JSON; atualização pontual do protocolo, fila de decisões e checkpoint. Nenhum arquivo do aplicativo, dependência, migration, registro de evidência/claim ou aprovação foi alterado. O índice contém 31 arquivos selecionados, incluindo este dossiê. A leitura foi seletiva de estado Git, contratos, fontes de curadoria e provas já registradas; não houve leitura dos anexos antigos, `.env`, `.q.out` ou `.q.sql`, nem acesso a banco/navegador.

Verificações executadas: geração local explícita, conferência `--check`, **10 testes direcionados aprovados** (novo pacote e pacote metodológico existente), TypeScript, lint/Prettier dirigidos, secret-scan e revisão de diff. Os testes detectam troca de escopo/aprovação/SHA, alteração de código/claim/imagem, referência ausente e normalização entre Windows/Linux. O Bun emitiu `Cannot read directory C:\Users\FIB2030\: EPERM`, mas finalizou com código zero e as duas suítes aprovadas; não se ampliou leitura/permissões para eliminar o aviso.

O gate/build do candidato de produto não foi repetido: as fontes do aplicativo permanecem em `517c206`. Os novos testes validam a ferramenta offline, sem adicionar sua contagem aos 4.366 testes históricos como se houvesse uma nova execução integral. Nenhuma prova HTTP/DB/browser, divulgação ou validação com cliente foi realizada nesta preparação.

**Próximo marco único:** registrar as respostas PIL-01–PIL-08 sobre o piloto Q2 delimitado, com os responsáveis, usando este pacote como material de revisão. A engenharia independente desta preparação está concluída; nenhum cliente foi contatado, dado coletado ou serviço publicado.
