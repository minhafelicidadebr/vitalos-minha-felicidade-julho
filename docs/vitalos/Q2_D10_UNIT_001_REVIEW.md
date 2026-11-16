# Q2 · primeira unidade e atividade para revisão D10

Data: 2026-11-15. Base preservada: `0157740`, branch `feat/ivo-fibt-platform-foundation`.
**Estado atual: unidade e atividade APROVADAS, versão 0.1.0, para ensaio técnico no ambiente local descartável.** João Paulo confirmou que **Olga Mariano e Ana Paula Barbalho, ambas**, revisaram e aprovaram sem ajustes em 15/11/2026. O [registro do parecer e da formalização](decisions/D10_UNIT_001_2026-11-15.md) identifica versões, hashes, autoria e escopo. D10 está `aprovado_para_piloto` exclusivamente para este par e esse ensaio local. Uso educativo específico registrado; não há nova aprovação editorial pendente desses artefatos.

## Entrega e fonte de verdade

| Artefato | Identificação | Fonte editável canônica |
| --- | --- | --- |
| Unidade | `Q2-bem_estar-aprendizagem-equipe-001` · 0.1.0 | [factor-content.json](../../src/domain/ivo/factor-content.json) |
| Atividade | `Q2-pratica-aprendizagem-equipe-001` · 0.1.0; vinculada à unidade 0.1.0 | [q2-learning-activity-001.json](../../src/domain/ivo/q2-learning-activity-001.json) |
| Decisão | D10 v0.3.0, aprovado para ensaio local; responsável João Paulo, revisoras Olga Mariano e Ana Paula Barbalho | [registro do parecer](decisions/D10_UNIT_001_2026-11-15.md) |

Título: **Aprender com dificuldades de trabalho sem expor pessoas**. Objetivo observável: distinguir leitura coletiva de diagnóstico individual e preparar uma conversa voluntária sobre condições de trabalho, com um acordo observável e limites de interpretação. Público operacional atual: RH_ADMIN empresarial. Liderança pode apoiar a prática combinada; não ganhou nova permissão de sistema. Colaborador não recebe avaliação individual nem obrigação de revelar respostas.

A leitura da unidade tem estimativa editorial de sete minutos, compatível com o padrão `microlearning`; não é dose validada. A atividade segue o próprio ritmo, com três questões e três alternativas plausíveis por questão, dentro do padrão `quiz_recuperacao`. Sem certificado, nota persistida, ranking ou inferência automática de domínio.

## Escolha técnica pelo método ToT

Juízos de priorização, **não métricas de maturidade ou efeito**. Escala 0–10; maior é melhor. Economia = menor custo; controle = menor risco; simplicidade = menor complexidade.

| Caminho | Valor | Segurança | Economia | Controle | Alinhamento | Reuso | Simplicidade | Escala | Tempo até valor |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A · unidade original + aprovação por artefato nos contratos existentes | 9 | 9 | 9 | 8 | 10 | 9 | 9 | 8 | 9 |
| B · plataforma adaptativa completa agora | 9 | 6 | 3 | 4 | 9 | 8 | 3 | 9 | 3 |
| C · renomear TESTE para produção | 3 | 1 | 10 | 1 | 2 | 4 | 9 | 5 | 10 |
| D · preparar somente documentação | 5 | 10 | 10 | 9 | 6 | 6 | 10 | 6 | 8 |
| E · integrar LMS externo | 7 | 6 | 4 | 5 | 6 | 6 | 5 | 9 | 4 |
| F · generalizar primeiro um motor de curadoria | 7 | 7 | 5 | 6 | 8 | 10 | 4 | 10 | 4 |

Escolha A: entrega revisão concreta e engenharia verificável sem aprovar método. C é vedado apesar de rápido. B/E/F ampliam escopo e operação antes de validar a primeira unidade. D deixa a lacuna de autorização da atividade. Trade-off: catálogo editorial em Git, sem CMS, aprovação eletrônica ou adaptação por IA; revisão humana continua necessária.

## Cadeia de conhecimento e limites

`Leitura FIB-T publicada do setor → prioridade bem_estar → hipótese editorial de aprendizagem em equipe → mecanismo MECH-VOICE-001 → TRU-006 → unidade → recuperação/feedback → aplicação confirmada no PI-13 → execução e aprendizagem separadas → revisão descritiva`.

O primeiro elo educativo é **proposta editorial para D10**, não relação causal nem mapeamento fator→dimensão IVO. Não altera escores. O mecanismo é redução do medo interpessoal, registrado em [mechanism-registry.json](../../src/domain/evidence/mechanism-registry.json). Orçamento desta unidade: um mecanismo, um estudo principal, nenhum complementar, limites explícitos e uma prática; não se importou todo o playbook ou corpus RAG.

Fonte principal já registrada: Edmondson, A. C. (1999). *Psychological safety and learning behavior in work teams*. Administrative Science Quarterly, 44(2), 350–383. DOI `10.2307/2666999`, código `TRU-006`, aliases `LDR-013`/`VOI-005`. [Registro científico](../../src/domain/evidence/evidence-registry.json) v1.0.0: B2/V1, acesso a resumo e metadados, situação legal L1. Reutilização desse registro; não houve nova leitura integral, revalidação bibliográfica ou reprodução do artigo. Os roteiros e as questões são redação editorial original desta proposta; L1 não é licença para redistribuir o texto integral.

Claim de referência da revisão: `CLAIM-EDMONDSON1999-VOICE-001`, no registro histórico v1.1.0. Claim educativo ativo: **`CLAIM-EDMONDSON1999-Q2-001`**, no [Claim Registry](../../src/domain/evidence/claim-registry.json) v1.2.0, novamente congelado, com o mesmo texto científico e proibições:

> Em equipes estudadas, segurança psicológica associa-se a mais comportamentos de aprendizagem (perguntar, admitir erro, pedir ajuda) e, por essa via, a melhor desempenho da equipe — estudo fundacional correlacional, não experimento.

O claim de passaporte continua autorizando seu próprio contexto e não autoriza automaticamente `q2-educacao`. A revisão recebida fundamentou uma adição deliberada para o contexto educativo, com papel **rh**, sem ampliar os papéis do claim anterior. A validação preserva a distinção entre os contextos, além de versão, autoria e escopo operacional.

A formalização está registrada no processo de versão do Claim Registry v1.2.0: `explain_mechanism × rh × enterprise × q2-educacao`. Os 50 claims anteriores e todo o Evidence Registry foram preservados. A disponibilidade desta unidade e atividade é limitada pelo servidor ao ambiente local descartável; não houve publicação remota. A ligação editorial ao fator continua sem equivalência dimensional ou causalidade.

Limites científicos: amostra original de equipes de manufatura; desenho correlacional; transferência para este exercício e este público não validada. Não promete melhora de bem-estar, desempenho, saúde, produtividade, retorno financeiro ou impacto ESG. Recuperação, feedback e aplicação são escolhas instrucionais sujeitas à avaliação, sem eficácia/dose/intervalo universal atribuídos ao estudo de Edmondson. D9, relações ESG e fonte COPSOQ/Q1 não foram alterados.

## Roteiro instrucional e contrato de evidência

| Etapa | Experiência proposta | Evidência e proteção |
| --- | --- | --- |
| Mensurar | Selecionar prioridade no setor com leitura publicada | Fonte protegida não permite nova aplicação; média coletiva não identifica causa/pessoa |
| Educar · compreender | Gancho coletivo, mecanismo, fonte e limite; preparar tempo e proteção | Texto original; não solicitar respostas da mensuração ou relatos de saúde |
| Educar · recuperar | Recuperação mental sem consulta, antes de abrir alternativas | Nenhum campo livre ou envio; instrução de afastar o roteiro é voluntária, não fiscalização |
| Educar · praticar | Distinguir prioridade de causa; proteger participação; separar registro de impacto | Feedback após escolher alternativa, inclusive no erro; pode revisar sem punição |
| Transformar | Opt-in explícito abre o formulário do plano atual | Só o acordo confirmado é compartilhado; responsável funcional, prazo, indicador de execução e condições de trabalho |
| Evoluir | Retomar acordo no momento combinado; ajustar/interromper conforme barreiras | Execução e aprendizagem são registros distintos; sem parecer de eficácia ou conversão em escore/ESG |

As três questões canônicas estão no JSON da atividade, com alternativas, gabarito e explicação. Não se trata de prova certificadora; o cliente recebe o gabarito para feedback local. Respostas e acertos vivem somente no componente React, reiniciam na revisão/nova versão/nova sessão e não integram servidor, ledger, relatório ou decisão de RH.

Na aplicação aprovada, servidor deriva a organização/papel da sessão, revalida módulo, fonte publicada, ciclo, fator, plano e versões. O ledger existente recebe referência da unidade/versão, ID/versão da atividade e texto confirmado, sem questionário/nota. O PI-13 conserva seus controles transacionais e de idempotência; nenhuma migration ou segundo ledger foi criado. TESTE mantém o formato histórico da descrição para preservar retries.

## Pacote único de decisões para o responsável

### Parecer recebido

João Paulo aprovou o conteúdo apresentado nas versões `0.1.0` da unidade e da atividade e a ponte educativa no contexto da prioridade coletiva FIB-T; comunicou a revisão favorável de ambas as revisoras. A decisão está formalizada para ensaio local. O registro não estende essa aprovação a outros fatores, dimensões IVO, alegações causais, resultados ou impacto ESG.

O registro metodológico exige, para `aprovado_para_piloto`, um responsável e um revisor com identificações distintas, evidência da decisão e critérios atendidos. João Paulo está designado como responsável metodológico. Em manifestação posterior, indicou a equipe técnica dos cofundadores do Instituto Felicidade para Todos para a revisão desta unidade e atividade:

| Pessoa | Qualificação informada por João Paulo | Papel nesta revisão |
| --- | --- | --- |
| João Paulo | Cientista da felicidade | Responsável metodológico; parecer favorável já registrado |
| Olga Mariano | Cientista da felicidade | Revisora; parecer favorável sem ajustes em 15/11/2026, comunicado por João Paulo |
| Ana Paula Barbalho | Cientista da felicidade, pesquisadora com pós-doutorado em Direitos Humanos e Felicidade | Revisora; parecer favorável sem ajustes em 15/11/2026, comunicado por João Paulo |

A indicação atende à identificação de pessoas distintas para a revisão. Trata-se de revisão interna à equipe cofundadora; não se declarou independência externa ou ausência de conflitos institucionais. As qualificações são registradas conforme informadas, sem verificação curricular nesta etapa. João Paulo participa da equipe, mas sua própria aprovação não será contada como segunda revisão.

João Paulo confirmou “Olga Mariano e Ana Paula Barbalho — ambas”, concluindo a identificação da autoria. A regra existente não exige duas revisoras; ambas foram registradas porque efetivamente indicadas no parecer. Nenhuma empresa/coorte real de piloto foi delimitada. A continuidade técnica autorizada e a disponibilidade implementada são locais. Não se pede nova aprovação do mesmo conteúdo.

| Item abrangido pelo parecer | Resultado desta formalização |
| --- | --- |
| Ponte pedagógica | Aprovada como uso editorial para `bem_estar`, sem causalidade/equivalência dimensional |
| Unidade | Versão 0.1.0 aprovada sem ajustes pedagógicos |
| Atividade independente | Versão 0.1.0 aprovada sem ajustes, vinculada à unidade 0.1.0 |
| Claim de uso específico | `CLAIM-EDMONDSON1999-Q2-001`, contexto educativo RH empresarial, Claim Registry v1.2.0; anteriores preservados |
| Decisão D10 | Parecer de ambas as revisoras comunicado por João Paulo, 15/11/2026; autoria, versões e escopo local registrados; sem assinatura digital presumida |

Não é necessário responder item a item em etapas técnicas. Um parecer pode reunir o pacote, mas deve identificar explicitamente **ambos** os artefatos e as versões. Rejeição ou pedido de ajuste mantém a proposta oculta. Não se deve confundir aprovação editorial com validação de resultados em clientes.

## Procedimento de integração (aplicado nesta formalização)

1. Consolidar correções e versão final dos dois artefatos, removendo o marcador de proposta somente após a decisão. Mudança de texto exige nova versão e revisão dessa versão; atualizar `contentVersion` na atividade. Nunca reescrever TESTE ou sua história.
2. Registrar o claim educativo pelo processo formal do registro congelado; alinhar IDs, fontes, contexto e versões dos registros nos dois artefatos. Claims fora do contexto ou fontes não correspondentes são recusados.
3. Registrar a evidência D10 e refletir fielmente seu escopo no registro metodológico; preencher `curation.approval` separadamente em unidade e atividade, com versão exata, responsável, revisoras, data válida, referência da decisão e `scope`. `owner`/`approved_at` da unidade coincidem com `responsible`/`approvedOn` da aprovação. Esses campos não constituem assinatura digital: a autenticidade é verificada pela revisão humana da decisão e do commit.
4. Após a aprovação explícita, marcar os artefatos aplicáveis como `APROVADO`, sem promover outras entradas. O loader exige claim/caveat no corpo; a atividade exige vínculo e aprovação próprios. Unidade aprovada sem atividade aprovada pode ser lida, mas não habilita aplicação dessa atividade.
5. Rodar testes proporcionais. Demonstração nova de navegador permanece como próximo marco; reutilizar fonte e controles já comprovados em [Q2_ENTERPRISE_WAVE1_LOCAL_2026-11-15.md](Q2_ENTERPRISE_WAVE1_LOCAL_2026-11-15.md). Publicação/piloto remoto depende de autorização própria. Não aprovar metodologia para destravar um teste.

## Validação da formalização e integração do caminho aprovado

Base `55cd466`; código, dados e autorias integrados após a confirmação explícita de ambas as revisoras. O controle `education-availability.server.ts` é comum à leitura educativa, criação de aplicação e vínculo de aprendizagem no ledger. Exige ambiente local completo; `testContent: true` não concede uso de conteúdo aprovado fora dele. A contagem do catálogo reflete os conteúdos disponíveis à sessão nesse runtime.

| Verificação | Resultado do candidato final |
| --- | --- |
| Testes dirigidos iniciais | 112 pass / 0 fail em seis arquivos, 825 asserções |
| Escopo e interface após ajuste | 40 pass / 0 fail em três arquivos, 130 asserções |
| Gate final `bun --no-env-file test src scripts` | **4.339 pass / 0 fail**, 341 arquivos, 13.516 asserções |
| Demais componentes do gate | Paridade, TypeScript e secret-scan aprovados |
| Lint/diff | ESLint dirigido em dez arquivos de lógica/UI/fixtures, sem regra de formatação legada; `git diff --check` aprovado |
| Build final | Build inerte aprovado em `.institutional-admin.local/module-build-1794796588601`; scan do bundle aprovado, `.output` original preservada e **21 fontes/testes novos ou alterados idênticos por SHA-256** à cópia compilada |
| Preservação científica e metodológica | Comparação com `55cd466` confirmou 50 claims prévios, Evidence Registry completo e 15 outras decisões inalterados. Parágrafos instrucionais e questões 0.1.0 preservados |

A primeira execução ampla identificou um teste de apresentação que pressupunha todas as decisões em proposta (4.338 pass / 1 fail). A interface passou a explicitar o escopo de cada aprovação; teste e candidato foram corrigidos antes do gate e build finais acima. Sem nova repetição após o resultado final válido.

Os testes de servidor agora usam também o catálogo canônico aprovado: leitura sem TESTE, atividade disponível, aplicação com ID/versão no ledger, retry com um efeito, ausência de respostas pedagógicas e recusa fora de runtime local. Fixtures separadas mantêm cenários de proposta e aprovação sintética. Cobertos endpoints remotos/ausentes, DB target e runtime não locais, declarações HML, escopo desconhecido, auto-revisão, atividade não aprovada, versões antigas e empresa alheia. Essas provas usam stores/sessões simulados em testes; não são prova HTTP/DB ou login real novo.

Evidências sanitizadas locais: `q2-d10-approval-targeted.log`, `q2-d10-approved-scoped.log`, `q2-d10-approved-gate-final.log`, `q2-d10-approved-build-final.log`, `q2-d10-approval-preservation.json`, em `.institutional-admin.local`. A revisão possui autoria real informada, não aprovação produzida por fixture. Não houve autenticação de contas das revisoras, envio de e-mails, migration, alteração de dados, acesso a staging ou publicação. Nenhuma prontidão comercial, eficácia ou validação com clientes foi declarada.

Arquivos deste fechamento:

- Aprovação/fonte: `src/domain/evidence/claim-registry.json`, `src/domain/ivo/factor-content.json`, `factor-content.ts`, `q2-learning-activity-001.json`, `q2-learning-curation.ts`, `methodology-governance.json`.
- Disponibilidade no servidor: `src/lib/ivo/education-availability.server.ts`, `ivo-education.server.ts`, `learning-application.server.ts`, `fibt-action-loop.server.ts`, `ivo-views.ts`.
- Apresentação: `src/components/ivo/ActionFollowUp.tsx`, `IvoGovernanceView.tsx`.
- Verificação: `src/lib/ivo/education-availability.server.test.ts`, `ivo-governance.server.test.ts`, `plan-composition.server.test.ts`, `src/domain/ivo/q2-learning-curation.test.ts`, `methodology-governance.test.ts`, `src/engine/evidence/claim-registry-consistency.test.ts`, `src/components/ivo/IvoC8Panels.test.tsx`, `src/test/fixtures/q2-learning.ts`.
- Pacote canônico e registro: `scripts/ivo-decision-package.ts`, `ivo-decision-package.test.ts`, `docs/vitalos/ivo-decision-package.md`, este dossiê, `decisions/D10_UNIT_001_2026-11-15.md` e `CHECKPOINT.md`.

## Validação da preparação inicial (histórico de afa2d78)

Testes usam um claim de contexto e aprovações **SINTÉTICOS**, injetados somente em fixtures, sem alterar registros canônicos. Cobrem: proposta escondida mesmo em runtime TESTE, promoção por rótulo recusada, claim inexistente/fora do papel/contexto/estudo, registros divergentes, aprovação de versão obsoleta/data impossível, conteúdo sem claim no corpo, aprovação independente da atividade, versões/vínculos/questões inválidos e coleções imutáveis. Serviços de leitura e escrita usam o mesmo resolvedor; par sintético aprovado percorre PI-13 com retry, sem respostas pedagógicas, e Beta/versões antigas são recusadas. DOM cobre recuperação anterior às pistas/feedback, compartilhamento intencional, limpeza na troca de versão e fechamento do plano.

Resultados do candidato:

| Verificação | Resultado |
| --- | --- |
| Direcionados: curadoria, governança, PI-13 e DOM | **96 pass / 0 fail**, quatro arquivos, 476 asserções; primeira execução intermediária apontou teste antigo dependente da posição de TESTE, resolvido preservando sua ordem histórica |
| Suíte integrada `bun --no-env-file test src scripts` | **4.324 pass / 1 fail**, 340 arquivos, 13.467 asserções; falha exclusivamente na sincronização do pacote documental D10, que ainda dizia “apenas TESTE” |
| Após correção somente de `ivo-decision-package.md` | **3 pass / 0 fail** em `scripts/ivo-decision-package.test.ts`, incluindo a falha anterior; gerador `--check` confirma correspondência exata. As demais 4.324 aprovações permanecem válidas; não se declarou segunda execução integral nem se repetiu a suíte |
| Demais componentes do gate | Paridade de schema, TypeScript e secret-scan aprovados no candidato; sem carregar `.env` pelo Bun |
| Lint e diff | ESLint direcionado em nove arquivos de lógica/UI/fixture, sem a regra de formatação legada; novos arquivos e componente formatados; `git diff --check` aprovado |
| Build | Build inerte isolado aprovado em `.institutional-admin.local/module-build-1794787009444`, endpoints `.invalid`, scan do artefato aprovado; `.output` raiz preservada pelo verificador; **15 arquivos de fonte/teste novos ou alterados idênticos por SHA-256** à cópia compilada |

Logs sanitizados locais: `.institutional-admin.local/q2-d10-targeted.log`, `q2-d10-gate-tests.log`, `q2-d10-build.log` e `q2-d10-typecheck.log`. Evidência do complemento documental: execução dos três testes e `--check`; não transformar o log inicial com uma falha em uma execução integral sem falhas. O build já contém os 15 arquivos finais de código/dados/testes; a correção posterior foi documental.

Nenhuma prova nova de cliente real, navegador, HTTP/DB ou staging é inferida desses testes. Reutilizada a evidência anterior da jornada TESTE, sem reiniciar o stack, survey ou banco. O novo estágio de recuperação tem prova de DOM, sem nova homologação visual mobile/navegador. Sem migrations, novas dependências, carregamento de `.env` no runtime ou operações remotas. `.q.out` e `.q.sql` não foram abertos nem alterados.

Arquivos desta entrega, agrupados pelo motivo:

- Catálogo e proposta: `src/domain/ivo/factor-content.json`, `factor-content.ts`, `q2-learning-activity-001.json` — unidade original, referência e aprovação com escopo.
- Atividades/curadoria: `src/domain/ivo/factor-learning-activities.ts`, `q2-learning-curation.ts` — validação independente, versões, fontes, contexto e resolvedor compartilhado.
- Servidor/contrato: `src/lib/ivo/ivo-education.server.ts`, `learning-application.server.ts`, `learning-application.ts` — leitura/aplicação autorizadas, referência de atividade e contrato de recuperação.
- Interface: `src/components/ivo/LearningApplicationJourney.tsx` — recuperação antes de pistas, limpeza na versão nova, formulário oculto após fechamento do plano.
- Testes/fixture: `src/domain/ivo/q2-learning-curation.test.ts`, `src/lib/ivo/ivo-governance.server.test.ts`, `plan-composition.server.test.ts`, `src/components/ivo/IvoJourney.test.tsx`, `src/test/fixtures/q2-learning.ts` — cenários positivos sintéticos e recusas, sem autorização real.
- Registro/documentação: `src/domain/ivo/methodology-governance.json`, `docs/vitalos/ivo-decision-package.md`, este dossiê e `docs/vitalos/CHECKPOINT.md` — corrigida descrição desatualizada de D10, sem alterar seu estado ou aprovar método.

**Menor próximo marco:** demonstrar a unidade e a atividade aprovadas na interface do ambiente local descartável, reutilizando ciclo, fonte publicada e provas de isolamento válidas. A integração canônica está concluída; as versões `0.1.0` permanecem sem ajustes pedagógicos. Não se presume publicação ou oferta comercial pela aprovação editorial.
