# Dossiê metodológico IVO — v0.1 para revisão (2026-10-05)

**Status: PROPOSTAS. Nenhum mapeamento, peso, escala, faixa ou validação aqui está aprovado.** O registro
`src/domain/ivo/dimension-mappings.json` continua **vazio** e o manifesto FIB-T continua
`PENDING_HUMAN_METHODOLOGICAL_APPROVAL`. Passar nos testes de software não aprova método nem valida índice.
Nenhuma referência, DOI, efeito ou percentual foi inventado: onde falta fonte, o texto diz "a fornecer".

## 1. Escopo

Prepara a decisão do responsável metodológico sobre: dimensões, associações FIB-T → dimensão, cobertura,
sobreposição, escala/normalização/pesos/agregação, elegibilidade/comparabilidade/privacidade e validação.
Resolução de conflitos: C1–C8 (§13). Decisões: §11.

## 2. Fontes lidas integralmente

`fibt-instrument.v1.json` (32 itens, 3 Fatores, 9 Domínios, regras de cálculo e governança) ·
`methodology-governance.md` (C1–C8) · `dimension-mappings.{json,ts}` · `lens-contract.ts` · `ivo-matrix.ts` ·
`lens-catalog.ts` · `ivo-framework.json` (enterprise: 4 dimensões × 4 pilares, status `experimental`, 0–1000) ·
`specs/{ivo-platform-foundation,action-learning-loop}.md` · `privacy-security.md` · ADR-004 ·
`copsoq-instrument-manifest.json` + `DECISAO_T5…` · página de licença da rede COPSOQ (consultada em 05/10/2026).

## 3. Dimensões (definições de trabalho PROPOSTAS)

| Dimensão | Definição de trabalho (relatório 05/10) | Pergunta-guia já no produto (`ivo-framework.json`) | Pilares já declarados no framework* |
|---|---|---|---|
| EU | Experiência da pessoa no trabalho: energia, propósito, autonomia, crescimento | Como cada pessoa floresce? | energia_vitalidade · proposito_significado · crescimento_maestria · equilibrio_autonomia |
| NÓS | Qualidade dos vínculos e da cooperação | Como as relações sustentam ou drenam o florescimento? | seguranca_psicologica · cooperacao_confianca · reconhecimento_pares · comunicacao_pertencimento |
| LIDERANÇA | Práticas observáveis de gestão | Como a liderança cria condições de florescimento? | clareza_direcao · justica_coerencia · desenvolvimento_pessoas · cuidado_ativo |
| ORGANIZAÇÃO | Condições e coerência institucional | Como o sistema organizacional protege e potencializa pessoas? | condicoes_carga · cultura_bem_estar · inclusao_equidade · sustentabilidade_bem_comum |

*Pilares, bases científicas listadas e `sampleItems` do framework são **material demonstrativo do produto**, não
itens validados nem evidência verificada neste dossiê. "Perfil da organização" pode, se aprovado, incluir
evidências institucionais identificadas por natureza e fonte (fora do escopo deste piloto).

## 4. O que a FIB-T efetivamente mede (manifesto, sem reinterpretar)

| Fator (0–4) | Itens | Domínios | Conteúdo observado |
|---|---|---|---|
| 1 Padrão de Vida | 12 | padrão de vida, educação, cultura | Moradia própria (q1), realização pessoal (q2), filmes (q6), projetos financeiros (q8), viagem (q16), renda digna (q17), voluntariado (q18), livros (q21), festas populares (q23), exposições (q25), treinamento pessoal (q27), formação formal (q32) |
| 2 Bem-Estar | 12 | bem-estar emocional, saúde, uso do tempo, vitalidade comunitária, meio ambiente | Feliz (q7), sono (q9), emoções (q10), tempo (q11), saúde emocional (q14), peso (q15), amigos (q19), ambiental (q22), estresse (q24), exercício (q28), saúde 12 m (q30), propósito (q31) |
| 3 Satisfação com a Empresa | 8 | governança | Ética valorizada (q3), confiança nos gestores (q4), rede de apoio (q5, atípico), treinamento (q12), horário flexível (q13), comunicação interna (q20), gestores compartilham metas (q26), liberdade de expressão (q29) |

Cálculo nativo: média por Fator (0–4); escore bruto = soma das três médias (0–12); sem pesos; sem itens reversos
documentados; ausência → **sem escore** (fail-closed). **Normalização, faixas e subíndice por domínio: não
autorizados** (`normalization.authorized=false`; `domain_formula=NOT_DOCUMENTED`; claim proibido "subíndice de
domínio como escore autorizado"). Psicometria: ausente no documento-fonte. A FIB-T mede **vida geral do trabalhador
e percepção de governança**, não as quatro dimensões do IVO por desenho.

## 5. Associações propostas (granularidade atual do código: FATOR)

O carregador só aceita `source_construct_id` = Fator. Regrupar itens em novas subescalas exigiria avaliação
psicométrica e aprovação (§9/D3); **não** é proposto aqui.

| ID | Origem → destino | Natureza | Justificativa (itens do manifesto) | Fonte científica | Recomendação |
|---|---|---|---|---|---|
| M1 | `bem_estar` → EU | **complementar** (bem-estar geral, não específico do trabalho) | q7, q10, q14, q31 (bem-estar emocional/propósito), q9, q11 (sono/tempo), q24 (estresse) aproximam energia, propósito e equilíbrio; mas q15, q28, q30 (saúde geral), q19 (amigos), q22 (ambiental) saem da definição de EU | a fornecer | Aprovar como "EU — bem-estar geral" com rótulo explícito; não chamar de "experiência no trabalho" |
| M2 | `satisfacao_empresa` → ORGANIZAÇÃO | **direta, parcial** | q3, q12, q13, q20 (ética, treinamento, flexibilidade, comunicação) são condições/políticas percebidas; é **percepção**, não evidência institucional | a fornecer | Aprovar como percepção de governança |
| M3 | `satisfacao_empresa` → LIDERANÇA | **complementar** | q4, q26 (confiança e abertura dos gestores) são práticas de gestão; q20, q29 ambíguos; os 8 itens não separam liderança de organização | a fornecer | **Exibir, não contar no índice** (evita dupla contagem — §7) |
| M4 | `padrao_de_vida` → nenhuma | **inadequada** p/ as 4 dimensões de trabalho | Itens de contexto de vida (moradia, renda, viagens, cultura); só q2/q27/q32 tocam crescimento (3 de 12) | — | Manter como leitura nativa; **não** alimentar índice de gestão (risco de injustiça e pressão sobre renda/moradia) |
| M5 | (nenhum fator) → NÓS | **insuficiente** | Nenhum item mede relações de trabalho entre pares; q19 e q5 são vida pessoal / atípicos | — | Lacuna declarada (§6) |
| M6 | `bem_estar` → NÓS | **insuficiente / rejeitar** | só q19 (1 de 12) | — | Rejeitar |

Classes: direta · complementar · inadequada · insuficiente. "Evidência científica" exigida para `APROVADO`
(`scientificEvidence` não vazio) não é fornecida por este dossiê.

## 6. Cobertura demonstrada e lacunas

| Dimensão | Cobertura FIB-T (se M1–M3 aprovadas como propostas) | Estado |
|---|---|---|
| EU | complementar, geral | **parcial** |
| NÓS | nenhuma | **lacuna** |
| LIDERANÇA | nenhuma contada (M3 só exibida) | **lacuna** |
| ORGANIZAÇÃO | direta parcial (percepção) | **parcial** |

**A FIB-T não cobre as quatro dimensões.** Sem complemento, não existe conjunto fixo que cumpra a regra de
publicação de número (relatório §4). O critério de "cobertura substantiva suficiente" ainda não existe (D2).

## 7. Sobreposição

- **Fator 3 em duas dimensões** (M2 e M3): o mesmo sinal ganharia influência dupla. Regra proposta: um construto
  contribui para **uma** dimensão no índice; a outra associação é apenas exibida.
- **Instrumentos futuros** repetem construtos (p.ex. sono/tempo/estresse da FIB-T vs. "Energia & Vitalidade" e
  "Equilíbrio" do framework; apoio/comunidade do COPSOQ vs. "Cooperação & Confiança"): regra proposta — um construto
  por sinal; se dois instrumentos medem o mesmo sinal, escolher um como primário ou combinar **antes** da dimensão.
- Análise estatística de redundância só é possível com dados de campo (§12).

## 8. Menor conjunto complementar (PROPOSTAS; nada aprovado)

| Opção | Cobre | Pré-requisitos / riscos |
|---|---|---|
| X · Módulo transversal IVO mínimo (≥2 construtos × ≥3 itens por dimensão descoberta: NÓS, LIDERANÇA e EU-no-trabalho ≈ 18 itens) | NÓS, LIDERANÇA, EU | Itens autorais/licenciados + revisão de conteúdo + pré-teste + manifesto congelado; estrutura inicial pode partir dos pilares do framework (sem usar `sampleItems` como itens); carga de resposta +18 itens |
| Y · Subescalas COPSOQ (apoio social/comunidade → NÓS; qualidade da liderança → LIDERANÇA; significado/influência → EU) | NÓS, LIDERANÇA, EU | Licença (ver D5); COPSOQ é **Domínio B** (risco) com direção reversa; política atual proíbe misturar A/B; manifesto do repo é demonstrativo (41 itens autorais, sem licença de versão) |
| Z · PERMA+V/VIA-T | NÓS (relacionamentos), EU | Sem LIDERANÇA; lentes só planejadas (Q3/Q4); ciclo mais longo |

Nenhuma opção cria subescalas FIB-T por reagrupamento. Fontes e licenças de X/Y/Z: **a verificar**. Registro do que
consta hoje: a página da rede COPSOQ (jun/2020, COPSOQ III) descreve licença CC BY-NC-ND 4.0, uso comercial livre
"seguindo as diretrizes", vedação de cobrar pelo questionário em si, de distribuir versão modificada como "COPSOQ" e
de adaptar sem contatar o membro nacional; a decisão T5 do repositório trata licenciamento como pendente
(Opção B). **Interpretação jurídica: não feita aqui** (D5).

## 9. Escala, normalização, pesos e agregação — alternativas

| Tema | Alternativas | Observações / recomendação |
|---|---|---|
| Escala de saída | (a) nativa por lente, sem comum · (b) 0–100 linear por construto · (c) 0–1000 legado · (d) percentil/z (exige normas) | (b) para exibição, **após** autorização de transformação linear pelo responsável (manifesto hoje recusa normalização). (d) indisponível: sem normas e benchmark é claim proibido. (c) é C1: aposentar na jornada IVO. Mudar escala **não** valida o método |
| Direção | todos os Fatores FIB-T: maior = melhor (sem reversos documentados) | COPSOQ exposição exige inversão explícita e versionada |
| Peso interno (construtos na dimensão) | (a) iguais · (b) pesos do framework (`ivo-framework.json`; sem proveniência) · (c) painel de especialistas | Recomendar (a) como linha de base e sensibilidade contra (b) |
| Peso entre dimensões | (a) 25% cada (exemplo didático do relatório) · (b) 27/25/24/24 (totais do framework) · (c) painel | Recomendar (a) + sensibilidade |
| Agregação | (a) média aritmética ponderada (compensatória) · (b) geométrica (penaliza dimensão baixa) · (c) "elo mais fraco" só como alerta · (d) só perfil | Recomendar (a) + alerta de dimensão mínima sempre visível + comparação com (b) na sensibilidade |
| Sensibilidade | perturbação de pesos, normalização, composição e agregação | Antes de qualquer publicação; resultado documentado, sem faixas inventadas |

Fórmula candidata (relatório §4), **não aprovada**: `D(d)=Σ w_i·x_i` (x normalizado, Σw=1) e `IVO=Σ W_d·D(d)` (ΣW=1).

## 10. Regras propostas de elegibilidade, comparabilidade e privacidade

**Elegibilidade (número só se tudo valer):** entradas = leituras nativas **publicadas** (k≥5, sem supressão) da mesma
organização, mesmo recorte e janela; mapeamento `APROVADO`; método em estado ≥ `aprovado_para_piloto`; **todas as
entradas obrigatórias presentes**, sem redistribuição silenciosa de peso; dado dentro da janela de validade do
método (parâmetro D7 — **sem default**); ausência/supressão → valor **nulo com motivo**, nunca zero.
**Estados do resultado:** `elegivel` · `sem_medicao` · `nao_coberto` · `suprimido` · `metodo_pendente` ·
`desatualizado` · `cobertura_insuficiente`.
**Comparabilidade:** comparar só com mesma versão de método, composição, versões de instrumento e definição de
recorte; caso contrário "não comparável" + motivo; ligação entre versões exige procedimento aprovado.
**Privacidade de derivados:** derivar só das mesmas publicações protegidas; proibido caminho alternativo a respostas;
k_min protege divulgação, não representatividade. Risco de **divulgação conjunta** (índice global − células
publicadas revela célula suprimida) e de **recálculo a cada resposta**. Alternativas: (a) índice **só por recorte
publicado**, sem agregado organizacional; (b) agregado organizacional só com partição inteira publicada e checagem
diferencial; (c) agregado ponderado por n (vaza n — não recomendado). Recomendação: (a) no piloto + liberação em
lote (marca d'água como em `cohort_capsules`).

## 11. Decisões para o responsável metodológico (lista única)

Pré-requisito: **nomear o responsável metodológico** (papel; sem nome neste repositório) e o revisor independente.

**Pacote consolidado (gerado do registro canônico, com recomendação, alternativas, fontes, critérios e efeito da pendência por decisão):** `docs/vitalos/ivo-decision-package.md`. O estado de cada decisão é consultável em `/ivo-integral/governanca`. **Todas continuam em proposta** — esta tabela segue como resumo de leitura, não como aprovação.

| ID | Decisão | Alternativas | Recomendação |
|---|---|---|---|
| D1 | Finalidade e usos do IVO | (a) índice composto de **gestão** (agregado, interno) · (b) só perfil · (c) benchmark/selo | (a) piloto experimental identificado; (c) vedado (claims proibidos); nunca avaliação de desempenho |
| D2 | Menor conjunto que completa as 4 dimensões; critério de "cobertura substantiva" | X · Y · Z (§8) · perfil parcial sem número | Perfil parcial agora; **X** como caminho de menor dependência externa; Y só se D5 resolver |
| D3 | Mapeamentos FIB-T | aprovar/rejeitar M1–M6; granularidade fator vs. nova escala derivada por itens (psicometria) | Aprovar M2 e M1 (rótulo "bem-estar geral"); M3 só exibição; rejeitar M4 e M6; sem subescalas novas; anexar fonte científica |
| D4 | Perguntas abertas do manifesto FIB-T (item 5, erros nos itens 21/22, nome do domínio, fórmula de domínio, manual de ausência/interpretação) | obter manual do autor · manter literal · suspender itens | Contatar o autor (via responsável) e manter literal até resposta |
| D5 | COPSOQ: licença, versão (II-Br/III) e política Domínio A/B no IVO | IVO só com Domínio A · subescalas COPSOQ invertidas no IVO · COPSOQ só como lente independente | Parecer jurídico; COPSOQ como lente independente (Q1) **sem** contribuir ao IVO até decidir |
| D6 | Escala, normalização, pesos, agregação (C1/C6) | §9 | 0–100 linear por construto, pesos iguais, média ponderada + alerta de mínimo + sensibilidade; aposentar 0–1000 na jornada IVO; manter lift = 0 (C6) |
| D7 | Elegibilidade, janela de validade, comparabilidade entre ciclos | janela: ciclo/12 meses/por lente | Todas as entradas obrigatórias; janela do ciclo com datas visíveis; comparação só com mesma versão/composição |
| D8 | Privacidade das saídas derivadas e controle temporal | (a) só por recorte · (b) agregado com checagem diferencial · (c) ponderado por n | (a) + liberação em lote |
| D9 | Parâmetros do protocolo C8 (`specs/efficacy-protocol-c8.md`) | comparabilidade de baseline; diferença mínima relevante; graus de evidência; revisor; desenhos para atribuição | Adotar a especificação; diferença mínima definida **por protocolo**, sem default global; atribuição causal só com desenho aprovado; piloto com caso identificado |
| D10 | Curadoria de conteúdo educativo e conflitos C2–C5, C7 | quem aprova conteúdo/claims; notação de versão FIB-T; copy T3; custódia do PDF | Curadoria pelo metodológico com orçamento de evidência existente; C2–C5 numa nota de 1 página; C7 adiado |

## 12. Plano de validação (adequado ao uso D1)

| Frente | Pergunta | Entregável verificável | Dependência |
|---|---|---|---|
| Conteúdo e cobertura | As medidas representam as 4 dimensões? | Mapa de construtos, revisão independente de conteúdo, lacunas | D2, D3 |
| Estrutura e sobreposição | Há redundância/dupla contagem? | Análise de relações entre medidas (dados de campo) | Dados autorizados |
| Robustez da composição | Conclusões mudam com pesos/regras plausíveis? | Cenários de sensibilidade documentados | D6 |
| Comparação entre grupos | Leituras sustentam comparação nos contextos pretendidos? | Plano de comparabilidade/invariância, quando pertinente | D7 |
| Evolução temporal | Detecta mudança sem confundir ruído/composição/versão? | Protocolo longitudinal | Ciclos reais |
| Relação com critérios | Coerência com critérios externos definidos antes | Hipóteses pré-registradas, limitações | Dados de campo |
| Compreensão e decisão | Gestores interpretam número, cobertura e limites? | Teste de uso com tarefas | PI-4 |

Amostra e incerteza: desenho próprio (organização, setores, repetição, não resposta); **não** deduzido de k=5;
intervalos só se o método os sustentar. Faixas interpretativas e diferença relevante exigem justificativa própria.
Dados sintéticos verificam software, não método.

## 13. Estado dos conflitos C1–C8

| # | Situação em 05/10/2026 | Encaminhamento |
|---|---|---|
| C1 | `calculateIVO` 0–1000 experimental; n<k → 3,0 neutro; **fora** da jornada IVO (guarda em teste) | D6 |
| C2 | Jornada descreve T3 como "PERMA+V → IVO" | D10 |
| C3 | Seção de orquestração do `CLAUDE.md` desatualizada; `journey.ts` prevalece | D10 (nota) |
| C4 | "Lente" = dimensão (pack) vs instrumento (jornada); código novo usa `IvoDimensionId`/`IvoLensId` | sem renomeação em massa |
| C5 | 3 notações de versão FIB-T | D10; manifesto prevalece |
| C6 | `expected_ivo_lift` legado; ação FIB-T com lift 0 por CHECK | D6 |
| C7 | PDF-fonte em pasta de cliente | D10 (adiado) |
| C8 | Eficácia não registrável; protocolo especificado | D9 + `specs/efficacy-protocol-c8.md` |
