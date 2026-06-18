# Decisão: runtime de questionário multi-instrumento

Data: 18 de junho de 2026

## Problema

A campanha já reconhecia ondas distintas por setor e instrumento, mas `/responder` aplicava sempre
o mesmo recorte PERMA+V. Isso criava uma quebra de honestidade: mudar de setor ou instrumento
alterava a campanha, sem alterar o questionário.

## Lentes usadas

- Produto e UX: a pessoa precisa perceber continuidade entre Onda, instrumento, escala e
  devolutiva.
- Ciência e conformidade: cada instrumento preserva sua escala, linguagem, finalidade e
  disclaimer; Domínio B não pode ser confundido com florescimento.
- Arquitetura e privacidade: o runtime deve ser setor-agnóstico, receber o domínio por injeção e
  não persistir respostas brutas no cliente.

## Ramos avaliados

| Ramo                                                     | Valor | Risco | Custo | Tese | Reuso | Decisão        |
| -------------------------------------------------------- | ----: | ----: | ----: | ---: | ----: | -------------- |
| A. Manter `/responder` fixo em PERMA+V                   |     2 |     2 |    10 |    2 |     1 | Rejeitado      |
| B. Criar uma rota separada para cada instrumento         |     7 |     5 |     4 |    6 |     2 | Rejeitado      |
| C. Adicionar condicionais por setor dentro da rota       |     7 |     4 |     7 |    5 |     3 | Rejeitado      |
| D. Antecipar persistência e agregação reais              |     9 |     3 |     2 |    9 |     9 | Adiado para H2 |
| E. Integrar uma biblioteca externa de formulários        |     6 |     7 |     5 |    5 |     6 | Desnecessário  |
| F. Definição de instrumento injetada em runtime genérico |     9 |     8 |     8 |   10 |    10 | Escolhido      |

## Escolha

O `survey-engine` passou a definir o contrato genérico de itens, escala e progresso. O registro
mock injeta as definições de COPSOQ, FIB-T, PERMA+V/IVO, VIA-T e IEV. A rota resolve a onda ativa
do pack e renderiza botões ou slider conforme a escala declarada, sem condicionais por setor no
engine.

As respostas existem apenas durante a sessão do formulário. Após o envio, o store registra somente
o identificador da onda respondida; nenhum valor bruto é persistido ou convertido em score
individual.

## Riscos e controles

- Itens COPSOQ demonstrativos não podem ser apresentados como a NCOPSII validada: a interface
  declara explicitamente essa limitação e mantém o disclaimer obrigatório do Domínio B.
- A fonte local documenta a faixa 0–4 da FIB-T, mas não suas âncoras verbais de aplicação: o demo
  usa rótulos direcionais neutros e não inventa uma redação oficial.
- VIA-T não pode virar diagnóstico ou decisão individual de RH: o disclaimer exploratório é
  preservado e a devolutiva aponta para `/viat`.
- Um instrumento sem definição não recebe fallback inventado: a rota mostra um estado vazio
  honesto e volta à Onda.

## Critérios de aceite

- Toda onda registrada possui itens, escala e disclaimer; o IEV cobre seus 16 pilares.
- Empresa e Escola resolvem questionários próprios a partir do pack ativo.
- FIB-T aceita 0–4; VIA-T usa 0–10; escalas rejeitam valores externos.
- O engine não importa `domain/`.
- Nenhuma resposta bruta é persistida.
- Typecheck, testes, lint e build permanecem verdes.
