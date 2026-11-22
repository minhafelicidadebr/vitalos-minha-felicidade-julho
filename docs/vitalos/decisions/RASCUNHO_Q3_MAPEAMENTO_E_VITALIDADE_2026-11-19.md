# Rascunho para revisão do fundador · Q3-05 (mapeamento) e Q3-08 (Vitalidade) · 19/11/2026

**Status: RASCUNHO. Nada aqui está no app.** Nenhum texto abaixo é claim científico; nenhuma fonte foi adicionada ao Evidence Registry (congelado).

## 1. Q3-05 · mapeamento PERMA → IVO como hipótese

Infra existente, reutilizada sem mudança: `src/domain/ivo/dimension-mappings.json` + `dimension-mappings.ts`. Status `PROPOSTO | APROVADO | REJEITADO`; **só `APROVADO` (responsável + evidência + data) alimenta a matriz**; `PROPOSTO` nunca vira número. Pré-requisito técnico: os fatores do Q3 precisam existir como construtos versionados (F3), senão o validador recusa a entrada.

Pares candidatos (justificativa conceitual, a confirmar por você; entrariam como `PROPOSTO`):

| Fator PERMA | Dimensão IVO candidata | Justificativa conceitual (não evidência) |
| --- | --- | --- |
| M · Significado | `proposito_significado` | mesmo construto nomeado |
| A · Realização | `crescimento_maestria` | progresso e alcance de metas |
| R · Relacionamentos | `cooperacao_confianca` | apoio e apreço dos colegas |
| E · Engajamento | — | sem dimensão IVO equivalente clara; **sugiro não mapear** |
| P · Emoções positivas | — | sugiro não mapear; evitar ler emoção como “vitalidade” |

Caminho de evidência para virar `APROVADO`: correlação fator × dimensão no piloto, por organização, só com n ≥ 5 (Q3-04), registrada com método e data. Nunca índice composto, nunca equivalência afirmada na UI.

## 2. Q3-08 · Vitalidade (+V) · esqueleto educativo

Ponte natural: o IVO já tem a dimensão `energia_vitalidade` (lente EU). A Vitalidade do Q3 é **educativa**, não medida.

Estrutura proposta (padrão D10: unidade → atividade versionada → revisão editorial registrada):

| Unidade | Micropráticas candidatas | Regra |
| --- | --- | --- |
| Sono e recuperação | rotina de desligamento; pausa pós-reunião | convite, nunca prescrição |
| Movimento | micro-pausa ativa de 2 min | sem metas de desempenho |
| Pausas e energia no dia | mapear picos de energia da semana | reflexão privada, nada vai para gestão |
| Ambiente e carga | conversa de equipe sobre ritmo | só agregado; não substitui Domínio B |

Regras de linguagem: “prática sugerida”, nunca “comprovado”/“aumenta X%”; sem XP por saúde; sem orientação clínica; quem relatar sofrimento é direcionado a apoio humano.

Para publicar no app falta: (a) você aprovar a estrutura; (b) registrar no Evidence Registry a fonte do conceito (Ryan & Frederick, 1997) com `safe_claim` — reabertura da revisão científica, decisão sua; (c) sua revisão editorial texto a texto.

## Decisões pedidas

1. Confirmar/ajustar os 3 pares candidatos e os 2 “não mapear”.
2. Aprovar o esqueleto da Vitalidade.
3. Autorizar reabrir o Evidence Registry para a entrada de vitalidade.
