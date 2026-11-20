# Q1 · Forma COPSOQ adotada · 20/11/2026

**Decisão do fundador (chat, 20/11/2026):** a versão brasileira aprovada em 18/11 é a **COPSOQ II-Br, forma curta** — Gonçalves, Moriguchi, Chaves e Sato, Rev Saúde Pública 2021;55:69, DOI 10.11606/s1518-8787.2021055003123. Preserva a aprovação de 18/11 (`Q1_COPSOQ_BRAZIL_APPROVAL_2026-11-18.md`); esta decisão só identifica a edição.

## O que a fonte estabelece (artigo, SHA-256 `d50e5c06…13078`)

| Ponto | Fonte | Localizador |
| --- | --- | --- |
| 40 questões (1A…23); 23 dimensões no original; estrutura brasileira de 7 domínios e 11 dimensões | artigo | p. 3; Tabela 2 (pp. 8–9); Discussão p. 11 |
| Itens por dimensão: 6, 4, 4, 6, 4, 1, 2, 4, 1, 4, 4 | artigo | Tabela 3, p. 10 |
| Likert de 5 níveis; **só 1B invertida** | artigo | p. 3 |
| Escore = soma por dimensão, exceto comportamentos ofensivos; média como alternativa | artigo | p. 3 |
| Semáforo verde/amarelo/vermelho | remete a Silva et al. 2011 (ref. 5) | p. 3 — cortes **não** no artigo |
| Respostas em branco | **não declarado** | — |
| Enunciados em português | tese Gonçalves 2019 (UFSCar) | nota a, p. 7 |
| Licença | artigo CC BY 4.0; uso do questionário **não declarado** | p. 1 |

Estrutura transcrita, sem enunciados: `src/domain/survey/copsoq-ii-br-short-2021.reference.json`.

## Correspondência com o servido

| Critério | Servido | II-Br curta | Estado |
| --- | --- | --- | --- |
| Questões | 41 autorais | 40 | diverge |
| Dimensões | 14 (12 NR-1 + 2 desfechos) | 11 em 7 domínios | diverge |
| Invertidas | 17 | 1 (1B) | diverge |
| Escala | uniforme 1–5 frequência | 5 níveis; faixas 0–4, 0–3 (13) e 0–1 (20–23) | diverge |
| Agregação | média por dimensão | soma por dimensão (média alternativa) | diverge |
| Ausências | — | não declarado | sem evidência |

Causa: **edição diferente** (bateria autoral demonstrativa). Teste reproduzível: `copsoq-ii-br-short-2021.reference.test.ts`.

## Estado da coleta: bloqueada

O ajuste mínimo é substituir a bateria inteira, o que exige insumos que o artigo não traz:
1. Enunciados e alternativas em português de cada questão — tese Gonçalves 2019, pp. 78–81 (arquivo + hash).
2. Regra para respostas em branco e pontos de corte, se o semáforo for usado (Silva et al. 2011 ou manual dos autores).
3. Permissão de uso do questionário (autores/rede COPSOQ).

Preparação, comunicado, delegação e revisão técnica seguem válidos e intactos.

## Manual português (Silva et al., 2011/2013) · conferido em 20/11/2026

Arquivo `COPSOQ-Manual-Portugal2013 (2).pdf`, SHA-256 `96db38c6…eb9ec` (mesmo já registrado em `Q1_COPSOQ_SOURCE_PARITY_2026-11-18.md`). É a fonte que o artigo II-Br cita (ref. 5) para o semáforo.

| Ponto | O que o manual diz | Localizador | Vale para a II-Br? |
| --- | --- | --- | --- |
| Formas portuguesas | curta 41 questões/26 subescalas; média 76/29; longa 119/35 | Tabela 1, pp. 8–9 | **Não**: a curta portuguesa é outra forma (41 ≠ 40, itens diferentes) |
| Escala | Likert 1–5, frequência ou intensidade; cotação direta 1–5 | p. 7 | Parcial: a II-Br pontua por soma com faixas 0–4/0–3/0–1 |
| Invertidos | só 42 e 45 da média; nenhum na curta | p. 7 | Não: na II-Br só 1B |
| Agregação | média dos itens por fator | p. 7 | A II-Br cita a média como alternativa à soma |
| Semáforo | tercis da amplitude 1–5, cortes **2,33 e 3,66**; leitura por sentido do fator | p. 8 | Aplicável só se o escore for média 1–5; com soma 0–4 exige conversão **não publicada** |
| Respostas em branco | **não declarado** | — | continua sem fonte |
| Itens da curta portuguesa | anexo com enunciados | pp. 23–25 | Não são os da II-Br |

Coincidência explicada: as **41** questões do manifesto servido batem com a contagem da curta portuguesa, não com a II-Br.

**Efeito na coleta:** continua bloqueada. O manual fecha a fonte dos pontos de corte, mas abre uma decisão: usar média 1–5 com tercis 2,33/3,66 (manual) ou soma 0–4 (artigo II-Br). Seguem faltando os enunciados/alternativas da II-Br (tese 2019), a regra de ausências e a permissão de uso.
