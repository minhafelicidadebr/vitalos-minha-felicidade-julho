# Plano registrado · Q3 (PERMA no Trabalho) como régua do IVO · v0 · 19/11/2026

**Status: RASCUNHO PARA REVISÃO** (fundador + estatístico do Instituto Felicidade para Todos). Vira v1 congelada **antes** de qualquer coleta do Q3; depois de congelado, mudar = nova versão com motivo, nunca reescrita.

## 1. Objetivo

Testar se dimensões do IVO (índice experimental) se comportam como previsto diante dos fatores da Escala PERMA no Trabalho (instrumento com validação publicada no Brasil). É **validade convergente e discriminante do IVO**; não é validação do PERMA, não cria índice composto e não afirma equivalência.

## 2. Hipóteses

Pares derivados de `RASCUNHO_Q3_MAPEAMENTO_E_VITALIDADE_2026-11-19.md` (pendentes da sua confirmação).

| ID | Fator PERMA | Dimensão IVO | Previsão |
| --- | --- | --- | --- |
| H1 | M · Significado | `proposito_significado` | convergente: correlação positiva ≥ limiar C |
| H2 | A · Realização | `crescimento_maestria` | convergente: positiva ≥ C |
| H3 | R · Relacionamentos | `cooperacao_confianca` | convergente: positiva ≥ C |
| H4 | M · Significado | `condicoes_carga` | discriminante: \|r\| menor que em H1 |
| H5 | R · Relacionamentos | `condicoes_carga` | discriminante: \|r\| menor que em H3 |

Fora do teste (decisão prévia): E · Engajamento e P · Emoções positivas — sem par IVO claro.

## 3. Unidade e dados

- **Unidade de análise: equipe**, usando médias. Resposta individual nunca sai do servidor e nunca é cruzada entre Q3 e IVO.
- Equipe entra só com **≥ 5 respondentes em cada instrumento** (Q3-04).
- Mesmo ciclo: o PERMA e o IVO da equipe vêm de aplicações no mesmo período (janela: **a definir**).
- Equipes de várias organizações podem ser juntadas só com consentimento contratual de cada organização para pesquisa agregada.

## 4. Análise

- Correlação entre médias de equipe: **Spearman** (padrão proposto, robusto a poucos pontos e a não normalidade); Pearson como sensibilidade.
- Cálculo no servidor pela função pura da onda 2 (`src/lib/ivo/q3-team-convergence.ts`); publica apenas r, número de equipes e veredito.

## 5. Critérios de decisão (a fixar antes de congelar)

| Parâmetro | Símbolo | Valor |
| --- | --- | --- |
| Mínimo de equipes para análise valer | N_eq | **a definir** com o estatístico (cálculo de poder) |
| Limiar convergente | C | **a definir** |
| Método principal | — | Spearman (proposto) |

Veredito por hipótese:
- **sustenta** — convergente: r ≥ C; discriminante: \|r\| do par discriminante < r do par convergente correspondente.
- **não sustenta** — critério acima falhou com N_eq atingido.
- **insuficiente** — menos de N_eq equipes válidas. Nada é decidido.

Efeito no registro de mapeamentos (`dimension-mappings.json`): par com H convergente **e** discriminante sustentadas → candidato a `APROVADO` (com responsável, evidência = este plano + relatório, data). Convergente não sustentada → `REJEITADO` e sinal para revisar a dimensão IVO. Insuficiente → continua `PROPOSTO`.

## 6. Limites declarados

1. **Falácia ecológica:** correlação entre equipes não vale para pessoas.
2. Correlação não é causa; amostra de conveniência (empresas clientes) limita generalização.
3. Conflito de interesse: o IVO é do produto → relatório revisado por pessoa sem vínculo comercial.
4. Nenhuma comunicação comercial diz "IVO validado" com base neste plano isolado.

## 7. O que preciso de você e do estatístico

1. Confirmar H1–H5 (ou ajustar pares).
2. Fixar N_eq e C (e a janela de "mesmo ciclo").
3. Aprovar Spearman como método principal.
4. Indicar o revisor independente do relatório.
