# Q2 · primeira unidade e atividade para revisão D10

Data: 2026-11-15. Base preservada: `0157740`, branch `feat/ivo-fibt-platform-foundation`.
**Estado dos artefatos: PROPOSTO, versão 0.1.0.** Em 2026-11-15, João Paulo Brandão Barboza declarou neste diálogo: “Chat, considere aprovado.” O parecer é registrado aqui como favorável à unidade, à atividade e à ponte educativa descritas neste dossiê. João Paulo é o responsável metodológico designado. Esta declaração não é assinatura digital nem habilita, por si só, o estado formal `aprovado_para_piloto` do registro metodológico.

## Entrega e fonte de verdade

| Artefato | Identificação | Fonte editável canônica |
| --- | --- | --- |
| Unidade | `Q2-bem_estar-aprendizagem-equipe-001` · 0.1.0 | [factor-content.json](../../src/domain/ivo/factor-content.json) |
| Atividade | `Q2-pratica-aprendizagem-equipe-001` · 0.1.0; vinculada à unidade 0.1.0 | [q2-learning-activity-001.json](../../src/domain/ivo/q2-learning-activity-001.json) |
| Decisão | Parecer metodológico favorável de João Paulo registrado abaixo; D10 canônico segue `proposta` até atender à governança do piloto | [methodology-governance.json](../../src/domain/ivo/methodology-governance.json) |

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

Claim de referência `CLAIM-EDMONDSON1999-VOICE-001`, no [Claim Registry](../../src/domain/evidence/claim-registry.json) congelado v1.1.0:

> Em equipes estudadas, segurança psicológica associa-se a mais comportamentos de aprendizagem (perguntar, admitir erro, pedir ajuda) e, por essa via, a melhor desempenho da equipe — estudo fundacional correlacional, não experimento.

Este texto é citado como insumo de revisão. O claim autoriza `explain_mechanism`, papéis líder/RH/CHRO, segmento empresarial e contexto **`evidencia-passaporte`**. **Não autoriza automaticamente `q2-educacao`.** A validação agora detecta essa diferença e impede promover a proposta apenas mudando status/owner/data. O registro congelado permaneceu intocado.

Para publicação, a curadoria precisa deliberar e registrar o uso específico no processo de versão do Claim Registry (novo ID apropriado ao contexto, ou revisão formal do escopo justificada). Não se presumiu autorização de descongelamento nem se inseriu claim novo. A proposta de contexto é: `explain_mechanism × rh × enterprise × q2-educacao`, independente da correspondência editorial ao fator.

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

João Paulo aprovou, em uma manifestação conjunta, o conteúdo apresentado nas versões `0.1.0` da unidade e da atividade, bem como a ponte educativa de discussão sobre aprendizagem em equipe no contexto da prioridade coletiva FIB-T. O registro não estende essa aprovação a outros fatores, dimensões IVO, alegações causais, resultados ou impacto ESG. Os artefatos continuam com estado `PROPOSTO` no catálogo até a decisão formal ser registrada no fluxo canônico.

O registro metodológico exige, para `aprovado_para_piloto`, um responsável e um revisor com identificações distintas, evidência da decisão e critérios atendidos. João Paulo está designado como responsável metodológico. Em manifestação posterior, indicou a equipe técnica dos cofundadores do Instituto Felicidade para Todos para a revisão desta unidade e atividade:

| Pessoa | Qualificação informada por João Paulo | Papel nesta revisão |
| --- | --- | --- |
| João Paulo | Cientista da felicidade | Responsável metodológico; parecer favorável já registrado |
| Olga Mariano | Cientista da felicidade | Revisora indicada, distinta do responsável; parecer ainda não recebido |
| Ana Paula Barbalho | Cientista da felicidade, pesquisadora com pós-doutorado em Direitos Humanos e Felicidade | Revisora indicada, distinta do responsável; parecer ainda não recebido |

A indicação atende à identificação de pessoas distintas para a revisão. Trata-se de revisão interna à equipe cofundadora; não se declarou independência externa ou ausência de conflitos institucionais. As qualificações são registradas conforme informadas, sem verificação curricular nesta etapa. João Paulo participa da equipe, mas sua própria aprovação não será contada como segunda revisão.

O próximo registro necessário é o parecer identificado de Olga e/ou Ana Paula sobre unidade e atividade `0.1.0`, incluindo fonte, limites e ponte educativa. Pode ser fornecido neste diálogo por João Paulo como relato explícito de uma decisão efetivamente tomada, com autoria, data, versões, ajustes e escopo; a indicação atual não atribui aprovação às revisoras. A regra existente não exige duas revisoras. Nenhuma empresa/coorte de piloto foi delimitada. Até formalizar o parecer e o uso permitido, preservam-se o estado dos artefatos e a aprovação metodológica já recebida.

| Item a revisar | Resposta/registro necessário antes da publicação |
| --- | --- |
| Ponte pedagógica | Aceitar, ajustar ou rejeitar o uso editorial de aprendizagem em equipe para a prioridade `bem_estar`, sem causalidade/equivalência dimensional |
| Unidade | Revisar objetivo, público, fonte/direitos, linguagem, mecanismo, limites e condições; decidir a versão final |
| Atividade independente | Revisar recuperação, questões/gabaritos/feedback, prática, voluntariedade, risco de exposição e revisão; decidir sua versão final vinculada à unidade |
| Claim de uso específico | Registrar deliberadamente o contexto educativo autorizado na nova versão formal do registro, com ID, texto permitido e ressalvas; preservar histórico |
| Decisão D10 | Evidência da decisão real, escopo de uso (ex.: piloto definido), autoria/revisor/data e referência verificável; nenhuma assinatura presumida |

Não é necessário responder item a item em etapas técnicas. Um parecer pode reunir o pacote, mas deve identificar explicitamente **ambos** os artefatos e as versões. Rejeição ou pedido de ajuste mantém a proposta oculta. Não se deve confundir aprovação editorial com validação de resultados em clientes.

## Integração após decisão legítima

1. Consolidar correções e versão final dos dois artefatos, removendo o marcador de proposta somente após a decisão. Mudança de texto exige nova versão e revisão dessa versão; atualizar `contentVersion` na atividade. Nunca reescrever TESTE ou sua história.
2. Registrar o claim educativo pelo processo formal do registro congelado; alinhar IDs, fontes, contexto e versões dos registros nos dois artefatos. Claims fora do contexto ou fontes não correspondentes são recusados.
3. Registrar a evidência D10 e refletir fielmente seu escopo no registro metodológico; preencher `curation.approval` separadamente em unidade e atividade, com versão exata, revisor real, data válida e referência da decisão. `owner`/`approved_at` da unidade precisam coincidir. Esses campos não constituem assinatura digital: a autenticidade é verificada pela revisão humana da decisão e do commit.
4. Após a aprovação explícita, marcar os artefatos aplicáveis como `APROVADO`, sem promover outras entradas. O loader exige claim/caveat no corpo; a atividade exige vínculo e aprovação próprios. Unidade aprovada sem atividade aprovada pode ser lida, mas não habilita aplicação dessa atividade.
5. Rodar testes proporcionais e provar os pontos novos no navegador/ambiente local autorizado. Reutilizar fonte e controles já comprovados em [Q2_ENTERPRISE_WAVE1_LOCAL_2026-11-15.md](Q2_ENTERPRISE_WAVE1_LOCAL_2026-11-15.md); nova publicação/piloto remoto depende de autorização própria. Não aprovar metodologia para destravar um teste.

## Validação técnica desta entrega

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

**Menor próximo marco:** parecer D10 consolidado sobre esta unidade/atividade e autorização do claim educativo específico; então integrar somente as versões aprovadas e demonstrar a aplicação pela interface local. Enquanto isso, a engenharia está preparada e a oferta educativa permanece bloqueada.
