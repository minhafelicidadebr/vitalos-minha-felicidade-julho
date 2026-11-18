# Pacote único de decisões metodológicas — IVO

> **Gerado** de `src/domain/ivo/methodology-governance.json` (registro v1.2.0) por `bun run ivo:decision-package`.
> Não edite à mão: `bun run ivo:decision-package --check` (e o teste `scripts/ivo-decision-package.test.ts`) falham se este arquivo divergir do registro.

## Como ler

- Situação: Proposta: 15 · Em revisão: 0 · Aprovado para piloto: 1 · Validado para uso definido: 0 · Rejeitada: 0 · Retirada: 0. **Aprovações restritas ao escopo de cada entrada.** Mapeamentos, índice composto e eficácia (D9) dependem de suas próprias decisões; aprovação editorial de conteúdo não os aprova.
- Estados distintos: _Proposta_ (sem efeito no produto) · _Em revisão_ · _Aprovado para piloto_ (uso experimental delimitado e identificado; **não** é validação) · _Validado para uso definido_ (evidência de validação para o uso declarado, e só ele).
- A autoridade metodológica é configurada no servidor (VITALOS_IVO_METHOD_AUTHORITY_USER_IDS). Sem configuração, a aprovação fica indisponível. O papel RH_ADMIN de uma organização não concede essa autoridade.

## Como decidir (fluxo técnico já pronto)

1. Identificar o responsável metodológico e revisor distinto, com autoria, versões e evidência da decisão; registrar nomes somente no escopo institucional autorizado.
2. Configurar no servidor a autoridade (`VITALOS_IVO_METHOD_AUTHORITY_USER_IDS`, lista de ids de usuário). Sem configuração, `/ivo-integral/governanca` continua consultável e a aprovação fica indisponível com o motivo.
3. Na mesma página, a autoridade usa **Preparar decisão**: o servidor valida transição, responsável ≠ revisor, evidência e critérios, e devolve o registro resultante **sem gravar nada**.
4. O registro resultante é revisto por pessoa e entra por commit em `methodology-governance.json` (versão nova + trilha). Só então o produto passa a tratar a decisão como aprovada.

## Resumo

| ID | Decisão | Estado | Recomendação | Depende de |
|---|---|---|---|---|
| D1 | Finalidade e usos do IVO | Proposta | Índice de gestão experimental identificado. | — |
| D2 | Menor conjunto que completa as quatro dimensões | Proposta | Perfil parcial agora; módulo transversal como caminho de menor dependência externa. | D1, D5 |
| D3 | Mapeamentos FIB-T → dimensões (granularidade) | Proposta | Aprovar M2 e M1 (rótulo 'bem-estar geral'); M3 só exibição; rejeitar M4 e M6. | D1 |
| D4 | Perguntas abertas do manifesto FIB-T | Proposta | Preparar perguntas ao autor por meio do responsável; nenhuma mensagem a terceiros é enviada por este sistema. | — |
| D5 | COPSOQ: fonte, correspondência e política Domínio A/B | Proposta | Conferir a correspondência e manter a lente independente do IVO composto. | — |
| D6 | Escala, normalização, pesos e agregação | Proposta | 0–100 linear, pesos iguais, aritmética ponderada + sensibilidade. | D1, D2, D3 |
| D7 | Elegibilidade, janela de validade e comparabilidade | Proposta | Janela do ciclo; sem redistribuição. | D6 |
| D8 | Privacidade das saídas derivadas e controle temporal | Proposta | Somente por recorte publicado + liberação em lote. | D6 |
| D9 | Parâmetros do protocolo de eficácia (C8) | Proposta | Adotar a spec; piloto com caso identificado. | — |
| D10 | Curadoria de conteúdo educativo e conflitos operacionais (C2–C5, C7) | Aprovado para piloto | Usar somente as duas versões aprovadas no ensaio local; a oferta educativa e qualquer piloto com clientes exigem escopo e autorização próprios. | — |
| M1 | Bem-Estar → EU (complementar, bem-estar geral) | Proposta | Aprovar com rótulo explícito. | D3 |
| M2 | Satisfação com a Empresa → ORGANIZAÇÃO (direta, parcial) | Proposta | Aprovar como percepção de governança. | D3 |
| M3 | Satisfação com a Empresa → LIDERANÇA (complementar; só exibição) | Proposta | Somente exibição. | D3, M2 |
| M4 | Padrão de Vida → nenhuma dimensão (inadequada) | Proposta | Rejeitar como contribuição ao índice. | D3 |
| M5 | NÓS — lacuna de cobertura (insuficiente) | Proposta | Registrar a lacuna e tratá-la em D2. | D2 |
| M6 | Bem-Estar → NÓS (insuficiente; rejeitar) | Proposta | Rejeitar. | D3 |

## Decisões D1–D10

### D1 — Finalidade e usos do IVO

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

**Proposta.** Índice composto de gestão da vitalidade organizacional: agregado, interno, experimental e identificado. Vedado como avaliação de desempenho individual, benchmark externo ou selo.

**Justificativa.** Delimita o uso antes de qualquer fórmula; os claims proibidos do manifesto FIB-T já vedam benchmark, ranking e diagnóstico.

**Recomendação.** Índice de gestão experimental identificado.

**Alternativas consideradas**
- Somente perfil dimensional, sem número composto
- Benchmark/selo (vedado pelos claims proibidos)

**Evidência e fontes**
- docs/vitalos/ivo-methodology-dossier.md §11
- src/domain/instruments/fibt/fibt-instrument.v1.json#forbidden_claims

**Limitações**
- Não define método; apenas o uso pretendido.

**Critérios para aprovar**
- Responsável metodológico nomeado
- Usos permitidos e vedados redigidos
- Revisão independente registrada

**Efeito enquanto estiver pendente**
- Índice IVO numérico: Sem finalidade aprovada, nenhum número composto é publicado.

Depende de: —

### D2 — Menor conjunto que completa as quatro dimensões

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

**Proposta.** Publicar perfil parcial sem número agora; completar NÓS, LIDERANÇA e EU-no-trabalho com um módulo transversal mínimo (≥ 2 construtos × ≥ 3 itens por dimensão descoberta). Subescalas COPSOQ só se D5 resolver licença e separação Domínio A/B.

**Justificativa.** A FIB-T mede vida geral e percepção de governança; nenhum fator mede relações de trabalho entre pares (NÓS) e o Fator 3 é a única fonte de LIDERANÇA e ORGANIZAÇÃO.

**Recomendação.** Perfil parcial agora; módulo transversal como caminho de menor dependência externa.

**Alternativas consideradas**
- Subescalas COPSOQ licenciadas (Domínio B, direção reversa)
- PERMA+V/VIA-T (sem LIDERANÇA; lentes só planejadas)
- Permanecer com perfil parcial sem número

**Evidência e fontes**
- docs/vitalos/ivo-methodology-dossier.md §6 e §8
- src/domain/packs/enterprise/ivo-framework.json (pilares demonstrativos; não são itens validados)

**Limitações**
- Itens do módulo não existem: exigem autoria/licença, revisão de conteúdo e pré-teste.
- Carga de resposta adicional estimada em cerca de 18 itens.

**Critérios para aprovar**
- Critério de 'cobertura substantiva suficiente' definido
- Conjunto de construtos por dimensão escolhido
- Fonte e licença de cada medida verificadas

**Efeito enquanto estiver pendente**
- Cobertura por dimensão: Permanece 'não coberto' em NÓS e LIDERANÇA.
- Índice IVO numérico: Sem conjunto fixo de medidas, não há número.

Depende de: D1, D5

### D3 — Mapeamentos FIB-T → dimensões (granularidade)

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

**Proposta.** Aprovar/rejeitar M1–M6 no nível de Fator; não derivar subescalas por reagrupamento de itens. Anexar fonte científica a cada aprovação.

**Justificativa.** O carregador aceita mapeamento por Fator; regrupar itens criaria subescalas que exigem avaliação psicométrica.

**Recomendação.** Aprovar M2 e M1 (rótulo 'bem-estar geral'); M3 só exibição; rejeitar M4 e M6.

**Alternativas consideradas**
- Nova escala derivada por itens (exige psicometria)

**Evidência e fontes**
- docs/vitalos/ivo-methodology-dossier.md §5

**Limitações**
- Fonte científica das associações: a fornecer pelo responsável metodológico.

**Critérios para aprovar**
- Decisão individual registrada para cada M1–M6
- Evidência científica anexada às aprovadas

**Efeito enquanto estiver pendente**
- Mapeamento das ações e matriz 4×4: Sem mapeamento aprovado, ações seguem 'mapeamento pendente' e células sem evidência por dimensão.

Depende de: D1

### D4 — Perguntas abertas do manifesto FIB-T

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

**Proposta.** Verificar com o autor/manual: item 5 no Fator 3, erros nos itens 21 e 22, nome do domínio (Bem-Estar Emocional × Psicológico), fórmula de subíndice por domínio, regra de ausência e interpretação. Manter o texto literal até resposta.

**Justificativa.** O manifesto registra estas perguntas em governance.open_questions; o cálculo nativo não muda enquanto estiverem abertas.

**Recomendação.** Preparar perguntas ao autor por meio do responsável; nenhuma mensagem a terceiros é enviada por este sistema.

**Alternativas consideradas**
- Aceitar o texto literal sem verificar
- Suspender os itens em dúvida

**Evidência e fontes**
- src/domain/instruments/fibt/fibt-instrument.v1.json#governance.open_questions

**Limitações**
- Nenhuma resposta do autor foi obtida; condições de uso não estão resolvidas por este registro.

**Critérios para aprovar**
- Resposta do autor ou decisão explícita de manter o literal
- Registro da evidência da verificação

**Efeito enquanto estiver pendente**
- Cálculo nativo FIB-T: Inalterado; subíndice por domínio continua vedado.
- Mapeamentos (D3): A associação do item 5 permanece incerta.

Depende de: —

### D5 — COPSOQ: fonte, correspondência e política Domínio A/B

Estado: **Proposta** · versão do registro 0.2.0 · responsável: não designado · revisor: não designado

**Proposta.** Vincular a edição brasileira aprovada à fonte exata e conferir o instrumento servido. Manter COPSOQ como lente independente (Q1); uma eventual contribuição ao IVO depende da decisão própria de Domínio A/B.

**Justificativa.** João Paulo Brandão Barboza confirmou a aprovação da versão brasileira em 18/11/2026. O manifesto atual ainda identifica uma bateria autoral demonstrativa. A aprovação da adoção e a comprovação da correspondência são etapas distintas.

**Recomendação.** Conferir a correspondência e manter a lente independente do IVO composto.

**Alternativas consideradas**
- IVO só com Domínio A
- Subescalas COPSOQ invertidas dentro do IVO
- COPSOQ só como lente independente

**Evidência e fontes**
- docs/vitalos/decisions/Q1_COPSOQ_BRAZIL_APPROVAL_2026-11-18.md
- docs/DECISAO_T5_TRILHO_LICENCIAMENTO_COPSOQ_2026-07-20.md
- https://www.copsoq-network.org/licence-guidelines-and-questionnaire _(externa — a verificar; não lida por este sistema)_

Atenção: 1 fonte(s) externa(s) ainda não verificada(s) — não tratar como evidência confirmada.

**Limitações**
- A confirmação do responsável não identifica por si a edição e a forma nem transforma a bateria demonstrativa em instrumento validado.

**Critérios para aprovar**
- Edição e forma vinculadas ao registro da fonte
- Correspondência de itens, escalas, reversões, ausências, cálculo e atribuição demonstrada
- Política A/B decidida para qualquer contribuição ao IVO

**Efeito enquanto estiver pendente**
- Lente COPSOQ: Permanece planejada; sem leitura real.
- Cobertura (D2): Subescalas COPSOQ não entram no conjunto mínimo.

Depende de: —

### D6 — Escala, normalização, pesos e agregação

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

**Proposta.** 0–100 linear por construto (exibição), pesos iguais, média aritmética ponderada entre dimensões com alerta de dimensão mínima e análise de sensibilidade; aposentar 0–1000 na jornada IVO; manter lift = 0 (C6).

**Justificativa.** Linear e transparente; o manifesto FIB-T hoje recusa normalização, então exige autorização expressa do responsável.

**Recomendação.** 0–100 linear, pesos iguais, aritmética ponderada + sensibilidade.

**Alternativas consideradas**
- Escala nativa sem escala comum
- 0–1000 legado
- Percentil/z (sem normas disponíveis)
- Pesos do framework 27/25/24/24
- Agregação geométrica

**Evidência e fontes**
- docs/vitalos/ivo-methodology-dossier.md §9

**Limitações**
- Fórmula candidata do relatório técnico de 2026-10-05; não aprovada.
- Mudar a escala não valida o método.

**Critérios para aprovar**
- Escala, pesos e agregação fixados por versão
- Sensibilidade documentada
- Autorização de transformação linear da FIB-T

**Efeito enquanto estiver pendente**
- Índice IVO numérico: Sem método, nenhum valor é calculado ou exibido.

Depende de: D1, D2, D3

### D7 — Elegibilidade, janela de validade e comparabilidade

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

**Proposta.** Todas as entradas obrigatórias presentes, sem redistribuir peso; janela de validade do ciclo com datas visíveis; comparação só com mesma versão e composição.

**Justificativa.** Evita preencher lacunas com zero e comparar medidas diferentes como evolução.

**Recomendação.** Janela do ciclo; sem redistribuição.

**Alternativas consideradas**
- Janela de 12 meses
- Janela por lente

**Evidência e fontes**
- docs/vitalos/ivo-methodology-dossier.md §10

**Limitações**
- Janela de validade sem valor default: enquanto não decidida, nada é 'desatualizado'.

**Critérios para aprovar**
- Janela de validade numérica fixada
- Regra de comparação entre versões fixada

**Efeito enquanto estiver pendente**
- Cobertura por dimensão: Estado 'desatualizado' indisponível.
- Comparação entre ciclos: Sem regra aprovada, a comparação é tratada como não comparável.

Depende de: D6

### D8 — Privacidade das saídas derivadas e controle temporal

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

**Proposta.** Índice e dimensões só por recorte publicado (sem agregado organizacional), com liberação em lote.

**Justificativa.** Agregado global menos células publicadas pode revelar célula suprimida; recálculo a cada resposta reintroduz inferência.

**Recomendação.** Somente por recorte publicado + liberação em lote.

**Alternativas consideradas**
- Agregado só com partição inteira publicada e checagem diferencial
- Agregado ponderado por n (vaza n)

**Evidência e fontes**
- docs/vitalos/constitution/privacy-security.md

**Limitações**
- Guarda de divulgação conjunta ainda não implementada (PI-5).

**Critérios para aprovar**
- Política de divulgação conjunta fixada
- Teste de reconstrução de célula suprimida

**Efeito enquanto estiver pendente**
- Saídas derivadas (índice, dimensões): Não liberadas.

Depende de: D6

### D9 — Parâmetros do protocolo de eficácia (C8)

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

**Proposta.** Adotar a especificação: comparabilidade de baseline, diferença mínima definida por protocolo (sem default global), graus de evidência, revisor independente e atribuição causal somente com desenho aprovado.

**Justificativa.** Separa execução, mudança observada, alcance da meta e atribuição; evita ler conclusão de tarefa como melhora.

**Recomendação.** Adotar a spec; piloto com caso identificado.

**Alternativas consideradas**
- Diferença mínima global
- Sem revisor independente

**Evidência e fontes**
- docs/vitalos/specs/efficacy-protocol-c8.md

**Limitações**
- Resolução de valores de leituras publicadas de ciclos anteriores ainda não implementada: pareceres conclusivos sobre leitura publicada permanecem indisponíveis.

**Critérios para aprovar**
- Regra de comparabilidade aprovada
- Graus de evidência aprovados
- Revisor independente designado

**Efeito enquanto estiver pendente**
- Avaliação de eficácia (parecer conclusivo): Enquanto pendente, só 'inconclusiva' é aceita; protocolos podem ser preparados em rascunho e registrados.
- Protocolo C8 em rascunho: Disponível.

Depende de: —

### D10 — Curadoria de conteúdo educativo e conflitos operacionais (C2–C5, C7)

Estado: **Aprovado para piloto** · versão do registro 0.3.0 · responsável: João Paulo · revisor: Olga Mariano; Ana Paula Barbalho

**Proposta.** Aprovação editorial delimitada da unidade Q2-bem_estar-aprendizagem-equipe-001 0.1.0 e atividade Q2-pratica-aprendizagem-equipe-001 0.1.0 para ensaio técnico no ambiente local descartável. Outras unidades e conflitos C2–C5/C7 conservam suas pendências próprias.

**Justificativa.** Parecer metodológico favorável de João Paulo e revisão sem ajustes de Olga Mariano e Ana Paula Barbalho em 15/11/2026, comunicada pelo responsável neste diálogo. Fonte TRU-006 reutilizada e claim educativo específico registrado sem ampliar o texto científico.

**Recomendação.** Usar somente as duas versões aprovadas no ensaio local; a oferta educativa e qualquer piloto com clientes exigem escopo e autorização próprios.

**Alternativas consideradas**
- Conteúdo gerado sem curadoria (vedado)
- Reutilizar conteúdo mock da Academia (vedado como recomendação real)

**Evidência e fontes**
- src/domain/evidence/learning-patterns.json
- src/domain/ivo/factor-content.json
- docs/vitalos/decisions/D10_UNIT_001_2026-11-15.md

**Limitações**
- Escopo desta decisão: apenas o par Q2 0.1.0 citado, prioridade editorial bem_estar, RH_ADMIN empresarial e ambiente local descartável. Não libera staging, produção ou clientes reais.
- Revisão interna da equipe cofundadora, distinta do responsável metodológico; relato de João Paulo, sem assinatura digital ou autenticação de conta das revisoras.
- Não valida eficácia, causalidade, impacto ESG, índice IVO ou mapeamentos dimensionais. C2–C5/C7 fora desta unidade seguem pendentes.

**Critérios para aprovar**
- Responsável pela curadoria nomeado
- Conteúdo aprovado com fontes e safe_claim por fator

**Efeito enquanto estiver pendente**
- Unidade e atividade Q2 0.1.0: Aprovadas editorialmente para ensaio local; servidor bloqueia disponibilidade fora desse ambiente. Demais conteúdos exigem aprovação própria.

Depende de: —

## Mapeamentos FIB-T → dimensão (M1–M6)

### M1 — Bem-Estar → EU (complementar, bem-estar geral)

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

Mapeamento: lente `fibt` · construto `bem_estar` → `eu` (complementar)

**Proposta.** Associar o Fator Bem-Estar à dimensão EU com o rótulo 'bem-estar geral', não 'experiência no trabalho'.

**Justificativa.** Itens 7, 10, 14, 31 (emocional/propósito), 9, 11 (sono/tempo) e 24 (estresse) aproximam energia, propósito e equilíbrio; itens 15, 28, 30, 19 e 22 saem da definição de EU.

**Recomendação.** Aprovar com rótulo explícito.

**Alternativas consideradas**
- Rejeitar
- Exibir sem contar no índice

**Evidência e fontes**
- src/domain/instruments/fibt/fibt-instrument.v1.json (itens por fator)

**Limitações**
- Fator mede vida geral; fonte científica da associação: a fornecer.

**Critérios para aprovar**
- Fonte científica anexada
- Revisão independente de conteúdo

**Efeito enquanto estiver pendente**
- Cobertura EU: Passa de 'não coberto' para parcial somente após aprovação.

Depende de: D3

### M2 — Satisfação com a Empresa → ORGANIZAÇÃO (direta, parcial)

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

Mapeamento: lente `fibt` · construto `satisfacao_empresa` → `organizacao` (direta)

**Proposta.** Associar o Fator 3 à dimensão ORGANIZAÇÃO como percepção de governança.

**Justificativa.** Itens 3, 12, 13 e 20 descrevem políticas e condições percebidas; é percepção, não evidência institucional.

**Recomendação.** Aprovar como percepção de governança.

**Alternativas consideradas**
- Rejeitar
- Mapear à LIDERANÇA

**Evidência e fontes**
- src/domain/instruments/fibt/fibt-instrument.v1.json

**Limitações**
- Fator 3 também sustenta M3; mapear nas duas conta o mesmo sinal duas vezes.

**Critérios para aprovar**
- Fonte científica anexada
- Regra de não dupla contagem com M3

**Efeito enquanto estiver pendente**
- Cobertura ORGANIZAÇÃO: Parcial somente após aprovação.

Depende de: D3

### M3 — Satisfação com a Empresa → LIDERANÇA (complementar; só exibição)

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

Mapeamento: lente `fibt` · construto `satisfacao_empresa` → `lideranca` (complementar)

**Proposta.** Exibir a associação sem contá-la no índice.

**Justificativa.** Itens 4 e 26 são práticas de gestão; os oito itens não separam liderança de organização.

**Recomendação.** Somente exibição.

**Alternativas consideradas**
- Contar em LIDERANÇA e não em ORGANIZAÇÃO
- Rejeitar

**Evidência e fontes**
- src/domain/instruments/fibt/fibt-instrument.v1.json

**Limitações**
- Dupla contagem se usada junto com M2.

**Critérios para aprovar**
- Regra de exibição sem contagem aprovada

**Efeito enquanto estiver pendente**
- Cobertura LIDERANÇA: Permanece 'não coberto' para o índice.

Depende de: D3, M2

### M4 — Padrão de Vida → nenhuma dimensão (inadequada)

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

Mapeamento: lente `fibt` · construto `padrao_de_vida` → nenhuma dimensão (inadequada)

**Proposta.** Manter como leitura nativa, sem contribuição às quatro dimensões.

**Justificativa.** Itens de contexto de vida (moradia, renda, viagens, cultura); só os itens 2, 27 e 32 tocam crescimento. Alimentar um índice de gestão com renda/moradia é injusto e cria pressão indevida.

**Recomendação.** Rejeitar como contribuição ao índice.

**Alternativas consideradas**
- Mapear para EU (crescimento)

**Evidência e fontes**
- src/domain/instruments/fibt/fibt-instrument.v1.json

**Limitações**
- (nenhum)

**Critérios para aprovar**
- Decisão registrada

**Efeito enquanto estiver pendente**
- Leitura Q2: Nenhum efeito: a leitura nativa continua exibida.

Depende de: D3

### M5 — NÓS — lacuna de cobertura (insuficiente)

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

Mapeamento: lente `fibt` · construto `—` → `nos` (insuficiente)

**Proposta.** Declarar NÓS como não coberta pela FIB-T.

**Justificativa.** Nenhum item mede relações de trabalho entre pares; os itens 19 e 5 referem-se à vida pessoal ou são atípicos.

**Recomendação.** Registrar a lacuna e tratá-la em D2.

**Alternativas consideradas**
- Associar Bem-Estar a NÓS (ver M6)

**Evidência e fontes**
- docs/vitalos/ivo-methodology-dossier.md §6

**Limitações**
- (nenhum)

**Critérios para aprovar**
- Lacuna reconhecida pelo responsável

**Efeito enquanto estiver pendente**
- Cobertura NÓS: 'Não coberto' até existir medida (D2).

Depende de: D2

### M6 — Bem-Estar → NÓS (insuficiente; rejeitar)

Estado: **Proposta** · versão do registro 0.1.0 · responsável: não designado · revisor: não designado

Mapeamento: lente `fibt` · construto `bem_estar` → `nos` (insuficiente)

**Proposta.** Rejeitar: apenas 1 dos 12 itens (19) toca vínculos.

**Justificativa.** Associar o fator inteiro por causa de um item distorceria o significado de NÓS.

**Recomendação.** Rejeitar.

**Alternativas consideradas**
- Aprovar como complementar

**Evidência e fontes**
- src/domain/instruments/fibt/fibt-instrument.v1.json

**Limitações**
- (nenhum)

**Critérios para aprovar**
- Decisão registrada

**Efeito enquanto estiver pendente**
- Cobertura NÓS: Nenhum efeito se rejeitada.

Depende de: D3

## Verificações necessárias para D4 e D5 (sem contato com terceiros)

Este sistema **não envia mensagens a terceiros**. Abaixo estão só as perguntas; se, como e por quem elas serão encaminhadas é decisão do responsável metodológico.

**D4 — perguntas abertas no manifesto da FIB-T (`governance.open_questions`)**
- Manual complementar com regra de missing data e interpretacao.
- Confirmacao do item 5 no Fator 3 (Governanca).
- Confirmacao dos erros tipograficos nos itens 21 e 22.
- Nome canonico do dominio: Bem-Estar Emocional ou Bem-Estar Psicologico.
- Existencia de formula autorizada de subindice por dominio.

**D5 — COPSOQ: vincular a fonte brasileira já aprovada**
- Qual artefato versionado contém a edição, forma e regras de cálculo aprovadas para Q1?
- Qual versão do instrumento (II-Br ou III) será adotada e com que adaptação?
- Política dos Domínios A e B: entram no IVO, só em uma lente independente, ou de que forma?
- A fonte externa listada em D5 confere com o texto vigente? (marcada _a verificar_ no registro)

