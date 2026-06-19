# Decisão — contrato transacional e idempotente de persistência

Data: 19/06/2026  
Status: contrato computável implementado; adaptador Cloud ausente

## Problema

Persistir respostas cegas exige mais do que uma chamada de banco. Retry de rede não pode duplicar
participação, payload não pode escolher tenant, rollback não pode emitir sucesso e o recibo público
não pode devolver conteúdo individual.

## Tree of Thoughts

| Ramo | Estratégia                                               | Valor | Risco | Custo | Tese | Reuso | Decisão                                      |
| ---- | -------------------------------------------------------- | ----: | ----: | ----: | ---: | ----: | -------------------------------------------- |
| A    | Gravar diretamente quando Cloud chegar                   |     5 |     3 |     9 |    5 |     3 | Rejeitado                                    |
| B    | Contrato transacional + idempotência + recibo pós-commit |    10 |     9 |     7 |   10 |    10 | Escolhido                                    |
| C    | Simular banco em memória no runtime                      |     6 |     2 |     8 |    3 |     4 | Rejeitado por overclaim                      |
| D    | Adiar tudo até o Cloud                                   |     2 |     8 |    10 |    3 |     2 | Rejeitado por perder preparação              |
| E    | Instalar Supabase manualmente                            |     7 |     2 |     3 |    6 |     5 | Rejeitado; provedor definido é Lovable Cloud |
| F    | Abstrair protocolo no engine e adaptador no servidor     |     9 |     9 |     7 |   10 |    10 | Composto com B                               |

## Contrato escolhido

- tenant, organização e sujeito são derivados da sessão confiável;
- chave única: `(tenant_id, subject_id, wave_id, submission_id)`;
- primeiro envio planeja inserção; retry idêntico vira replay;
- reutilização da chave com metadados diferentes vira conflito;
- recibo `cloud_persisted` só pode existir após commit confirmado;
- rollback, erro de adaptador, drift de metadados ou escopo cruzado não emitem recibo;
- recibo público continua sem respostas, itens ou valores.

## Limite honesto

O contrato está executável e testado, mas não existe banco conectado. A UI declara
`contract_verified` e `adapter_missing`; nunca promove o ambiente para produção por configuração.
