# Decisão — Agregação server-side com supressão estrutural k-anônima

Data: 19 de junho de 2026

## Tese

Ocultar uma média na interface não protege ninguém se o valor ainda estiver no payload. A
agregação do VitalOS™ deve remover estruturalmente resultados abaixo de `k = 5` antes de qualquer
contrato público, e deve ponderar pessoas — não quantidade acidental de itens.

## Alternativas consideradas

1. Calcular médias no cliente.
2. Retornar todas as médias com uma flag `visible`.
3. Agregar diretamente todos os itens do pilar.
4. Adiar até existir banco real.
5. Calcular no servidor, média por pessoa/pilar, e publicar somente coortes k-anônimas.

## Decisão

Adotar a alternativa 5.

## Regras

- Cada submissão precisa conter exatamente o conjunto esperado de itens.
- IDs de submissão e item não podem repetir.
- Valores devem estar dentro da escala injetada.
- Itens reversos usam `min + max - value`.
- Primeiro calcula-se a média do participante dentro do pilar.
- Depois calcula-se a média dessas pessoas na coorte.
- O piso efetivo nunca pode ser inferior a cinco.
- Para `n < k`, o contrato público retorna `mean: null`.
- Respostas, IDs de submissão, IDs de item e valores nunca pertencem ao payload público.

## Fatia demonstrável

A rota `/pipeline-dados` consulta uma função server-side sobre fixture exclusivamente server-only:

- organização com `n = 8`, agregados publicáveis;
- recorte protegido com `n = 3`, todas as médias removidas;
- suporte aos packs Empresa e Escola pelo mesmo engine;
- guard de rota dirigido pelo Domain Pack.

## Limite honesto

As entradas atuais são determinísticas e vivem no servidor de demonstração. Não representam
respostas persistidas. O objetivo é provar o contrato de agregação e a ausência de vazamento antes
de conectar o Lovable Cloud.
