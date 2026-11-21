# Revisão dos vínculos ESG e contrato de evidência

Data: 2026-11-15. Base: `8b9617d`, branch `feat/ivo-fibt-platform-foundation`. Estado: **proposta para decisão humana**, sem aprovação metodológica ou autorização de emissão com dados reais. A revisão de design da página do selo fica para etapa posterior.

## Decisão técnica

Recomendamos aprovar, para uso definido, relações temáticas condicionais e linguagem de prática implementada/mudança observada. Não aprovar equivalências entre escore FIB-T, felicidade, impacto ESG, conformidade ou certificação. Cada relação precisa de aprovação própria; aprovação temática não valida resultado de uma empresa.

O ToT anterior comparou seis caminhos, com notas favoráveis de 0–10 para valor, segurança, economia, baixo risco, alinhamento, reuso, simplicidade, escala e rapidez (`SUPERPROMPT_MATRIZ_METE_DRIVERS_ESG_EVIDENCIAS.md`). Mantemos a escolha: matriz temática mínima + casos sintéticos + relações versionadas. Índice único de atividades mistura execução e resultado; integração externa não resolve validade; esperar todos os dados impede preparar os contratos. O custo da escolha é revisão por vínculo e manutenção de versões; o benefício é rastreabilidade sem precisão artificial.

## Cinco decisões concretas

| ID | Driver e mecanismo proposto | Eixo e recomendação | Evidência mínima e linguagem permitida | Limite / próxima decisão |
| --- | --- | --- | --- | --- |
| REL-01 | Segurança psicológica: oportunidade de voz, escuta e resposta | S: aprovar somente como relação temática de participação; G: condicionar a processo verificável | Registro autorizado de prática, protocolo de resposta e revisão agregada. “Acordo de escuta implementado; funcionamento ainda não avaliado.” | Encontro não comprova segurança nem ausência de retaliação. Definir observação protegida de funcionamento. |
| REL-02 | Autonomia: clareza de alçadas e revisão de fluxo | S: condições de trabalho; G: processo decisório, ambos condicionais | Versão do fluxo, registro de implementação e indicador definido antes da comparação. “Fluxo revisado; mudança observada no período.” | Tempo de espera é indicador do processo, não medida suficiente de autonomia. O exemplo 10→12 horas é desfavorável; não atribuir causa. |
| REL-03 | Inclusão: remoção de barreiras de acesso | S: proposta plausível, avaliação suspensa neste caso protegido | Somente revisão autorizada poderá verificar barreira, recurso e acesso agregado | Não aprovar o caso a partir de conteúdo retido; não exibir fonte, vínculo, contagem ou existência de subgrupo protegido. Proteção não significa zero. |
| REL-04 | Crescimento: prática educativa e apoio à aplicação | S: aprovar como relação temática de desenvolvimento | Distinguir oferta, participação, avaliação de aprendizagem e transferência. “Prática oferecida; retenção e aplicação não avaliadas.” | Presença não demonstra aprendizagem; respostas individuais não alimentam avaliação do empregador. Definir acompanhamento apropriado e voluntário. |
| REL-05 | Futuro e bem comum: uso responsável de recursos | E: manter sem sustentação no caso atual | Definir recurso físico, fronteira, período, unidade, fonte e baseline antes de relatar mudança ambiental | Intenção e bem-estar não equivalem a redução de consumo/emissões. Nenhuma equivalência climática aprovada. |

Estas recomendações não atribuem códigos de disclosure GRI/ESRS, materialidade ou conformidade. Uma referência normativa futura exige versão, requisito específico e revisão de aderência. Não transferir tamanho de efeito de estudo para cliente.

## Contrato proposto de revisão e emissão

Unidade: organização autorizada × ação/projeto × desfecho × período × recorte permitido. Um evento mantém uma identidade mesmo quando relacionado a vários perfis, etapas ou eixos; contagens por tema não são somadas como total de impacto.

1. **Relação versionada:** ID, driver e catálogo/versionamento, mecanismo, contexto, tema ESG, justificativa, referências curadas existentes, limitações, uso permitido, estado (`proposto`, `em revisão`, `aprovado para uso definido`, `rejeitado`, `sem sustentação`), revisor autorizado, data e versão. Ausência de decisão mantém o bloqueio. Este é um contrato proposto, não uma tabela/API implementada.
2. **Evidência do caso:** projeto, evento de execução, período e data de corte, população/recorte autorizado, fonte e custódia, indicador e definição, unidade, versão, situação de disponibilidade, efeitos adversos, limitações e próxima decisão. Planejamento, execução, aprendizagem e resultado são estados distintos.
3. **Curadoria científica:** resolver IDs reais de mecanismo/estudo/claim/passport nos registros existentes; verificar pertinência, população, contexto, licença, revisão e limites de transferência. Não criar IDs fictícios para preencher campos obrigatórios. Referência científica não substitui evidência de execução local.
4. **Proteção antes da projeção:** autorização e isolamento por organização, finalidade, supressão de recortes conforme política vigente (incluindo k≥5 quando aplicável), revisão de textos livres e referências. O projetor sintético não implementa esses controles. Negativa de acesso ou proteção não vira zero, falta de desempenho ou fallback demonstrativo.
5. **Linguagem:** execução permite “prática implementada”; comparabilidade documentada permite “mudança observada”, com unidade/período/limites. Sem desenho e aprovação próprios, não liberar atribuição causal, impacto garantido, nota ESG, certificação ou previsão de retorno financeiro.
6. **Emissão:** validar contrato canônico, referências resolvidas, decisão do vínculo aplicável e vigente, evidência autorizada e revisão editorial. Falha bloqueia a seção afetada; relatório parcial deve declarar cobertura e não produzir total de impacto. Snapshot deve registrar versão editorial, decisão, data de corte e proveniência sem conteúdo pessoal.
7. **Correção/revogação:** mudança de fonte, retirada de autorização, erro ou revisão do vínculo exige nova revisão e versão. Preservar histórico conforme política aplicável; não reescrever silenciosamente PDF já emitido nem declarar revogação automática implementada.

## Compatibilidade com o contrato existente

`src/domain/evidence/esg-trace.schema.json` exige projeto, mecanismo, 1–5 estudos, indicador de processo, evento de execução, limitações e próximo ciclo; linguagem fixa `mudanca_observada`. Seus indicadores aceitam apenas `contagem_agregada` e `percentual_agregado`.

Consequências: as fixtures atuais não estão aptas à emissão; não têm referências científicas resolvidas. O exemplo em horas por demanda permanece no protótipo descritivo. Não convertê-lo em percentual para caber no schema. Uma eventual ampliação de unidades exige proposta separada e aprovação; este documento não altera o schema. O schema valida estrutura, não comprova por si autorização, validade científica, custódia ou aprovação do vínculo.

FIB-T conserva escore bruto e fatores autorizados. Dimensão IVO, índice composto e eficácia C8/D9 continuam pendentes. Fonte COPSOQ permanece dependência específica de Q1; não impede revisão temática ou preparação independente de Q2.

## Pacote de decisão humana

### Reconciliação com os registros existentes — revisão local posterior

Base de código: `3761470`. Esta verificação confirma conteúdo dos registros locais, não revalida artigos, licenças ou retratações em fontes externas. Os registros congelados não foram alterados. `claim-registry.json` 1.1.0 é a fonte oficial de claims para código novo; os campos de claim do Evidence Registry são legados. A carga de produção deve reutilizar `src/domain/evidence/registries.ts` e os gates existentes, sem um segundo carregador paralelo.

| Relação | Referências locais concretas | Maturidade e decisão recomendada |
| --- | --- | --- |
| REL-01, voz/escuta | `MECH-VOICE-001`; estudos `TRU-006` e `LDR-007`; claim `CLAIM-EDMONDSON1999-VOICE-003`, uso `organize_evidence`, contexto `organizar-esg`, perfis líder/RH/CHRO, segmento empresarial | Melhor candidato à primeira fatia. O claim declara evidência correlacional de equipes de manufatura e proíbe usar o piloto como prova de redução de adoecimento ou aumento de produtividade. O ID de estudo legível `EDMONDSON-1999` exige resolução canônica existente para `TRU-006`. Não substituir IDs por semelhança textual. Relação temática S e eventual G ainda dependem de decisão própria. |
| REL-02, autonomia | Estudos candidatos `ACH-001` (participação no desenho), `MGT-005` (desenho participativo do trabalho), `OPD-002` (job crafting) | Candidatos de curadoria, sem equivalência automática com autonomia ou tempo de espera. O Mechanism Registry consultado só contém `MECH-VOICE-001`; não há mecanismo formal registrado para esta relação. Elaborar recorte e claim de uso antes de conectar. |
| REL-03, inclusão | Candidato `INC-022`, mecanismo textual `inclusion_climate` no Evidence Registry | Existência de estudo não libera conteúdo protegido nem cria mecanismo formal/claim ESG específico. Manter caso retido. |
| REL-04, crescimento | Candidatos `LRN-001` a `LRN-007`, com temas distintos (cognição, conhecimento, demandas, flexibilidade psicológica, aprendizagem/bem-estar, cultura/retenção) | O conjunto não é uma validação única de retenção ou transferência. Selecionar um desfecho e população, revisar claim/contexto e formalizar mecanismo antes de integração. |
| REL-05, futuro/bem comum | `PUR-001` trata de ajudar outras pessoas e trabalho com significado no registro local | Não sustenta redução de energia, consumo ou emissões. Não reutilizar propósito como evidência ambiental. Sem vínculo E sustentado para o caso atual. |

Os rótulos B2/C1/C2/L1 existentes descrevem decisões registradas anteriormente; não são aprovação atual de um novo uso no relatório. O claim específico de voz/escuta tem alcance limitado e não deve ser estendido automaticamente a colaborador, outro segmento, causalidade ou certificação. Outros claims de passaporte (`explain_mechanism`) não autorizam por si uso `organize_evidence`.

**Primeira fatia recomendada para decisão:** REL-01 no eixo S, exclusivamente como relação temática da prática de voz/escuta, com linguagem de prática implementada e sem desfecho causal. G permanece condicionado à evidência de processo de resposta e aprovação específica. Não preencher a fixture com esses IDs: são cenários independentes, sem custódia de projeto/evento real. A preparação técnica atual continua bloqueando sua emissão.

### Registro de revisão — REL-01/S

- **Responsável metodológico designado pelo operador:** João Paulo Brandão Barboza, cientista da felicidade.
- **Relação/versão:** REL-01, vínculo temático com S, proposta v1.
- **Uso submetido à revisão:** organizar evidências da prática de voz e escuta no relatório empresarial; descrever prática implementada. Não afirmar efeito, causalidade, melhora de saúde/produtividade, certificação ou impacto ESG demonstrado.
- **Evidência de referência a revisar:** mecanismo `MECH-VOICE-001`; `TRU-006`; claims `CLAIM-EDMONDSON1999-VOICE-003` (organizar evidências) e, apenas para consideração com sua ressalva de analogia, claim de liderança `LDR-007`. Verificar resolução canônica de `EDMONDSON-1999` e pertinência dos claims para o contexto exato.
- **Decisão:** pendente — não foi fornecida pelo responsável.
- **Data, ressalvas e versão aprovada:** pendentes.

O nome e a função acima foram informados pelo operador nesta conversa; não representam assinatura, revisão concluída ou aprovação atribuída ao responsável. A proposta REL-01/S é um item pronto para avaliação, não uma decisão metodológica já tomada. REL-02/04 permanecem em curadoria, REL-03 protegida e REL-05/E sem sustentação no caso atual.

O responsável metodológico designado deve registrar, por REL-01 a REL-05: aprovar para uso definido / solicitar ajuste / rejeitar; eixo e escopo permitido; evidência e linguagem liberadas; ressalvas; confirmação de autoria da decisão, data e versão. RH de empresa não recebe autoridade metodológica global por participar do processo.

Decisões agrupadas: (A) aceitar ou ajustar as cinco recomendações da tabela; (B) aprovar os requisitos de evidência e linguagem acima; (C) manter horas fora do contrato canônico ou solicitar proposta separada de extensão. Até registro explícito, todos permanecem pendentes. A autorização para desenvolver este dossiê não equivale à aprovação das relações.

Critério de aceite deste marco: decisões rastreáveis por relação e contrato aceito para escopo definido. Próxima fatia técnica após esse aceite: conectar uma prática Q2 autorizada ao relatório por projeção agregada, com testes de isolamento, supressão, duplicação, incompatibilidade e referência ausente; sem depender da resolução da fonte Q1.

## Verificação desta etapa

Continuação: `reviewSyntheticMatrix` liga a pré-revisão às fixtures existentes, eixo por eixo, sem preencher referências científicas ou decisões ausentes. O preview editorial exibe as pendências e retém o caso protegido. Não há ligação com emissão real ou mudança do PDF; o PDF sintético anterior não inclui este painel HTML. A integração passou em 12 testes/88 asserções (três arquivos) e TypeScript. Sem prova visual no navegador/mobile nesta etapa. Build e gate amplo não repetidos; importação local pura, sem nova dependência/configuração. Critérios de aceite técnicos: pendências visíveis, incompatibilidade de unidade explícita, nenhuma concessão de aprovação e nenhuma emissão liberada.

Preparação técnica posterior: `src/lib/reports/esg-evidence-review.ts` implementa pré-revisão pura, sem consumidor de produção. Estados: `protected`, `blocked`, `ready_for_review`. O último indica apenas completude estrutural para revisão; não autoriza emissão. Correspondência exata da decisão por vínculo/versão/eixo/uso, registro de revisor/data, referências estruturais, execução, limites, continuidade, linguagem e unidade são verificadas. Referências não são resolvidas, identidades não são autenticadas e o schema completo não é substituído. Não recebe dados reais. Cinco testes direcionados passaram (20 asserções); TypeScript passou. Primeira tentativa sofreu EPERM do runtime no sandbox; repetição autorizada concluiu sem erros. Não foi repetido gate amplo/build por não haver integração, rota ou bundling alterados.

Revisão documental confrontada com módulo sintético, registro de implementação, superprompt, governança metodológica e schema canônico. Nenhuma migration ou mudança de PDF. Gates anteriores permanecem evidência da implementação anterior; não validam esta proposta metodológica. Não houve consulta a clientes, navegador ou operação remota.
