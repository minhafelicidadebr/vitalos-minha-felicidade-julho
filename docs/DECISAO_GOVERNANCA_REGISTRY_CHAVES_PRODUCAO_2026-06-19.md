# Decisão — governança do registry de chaves de produção

Data: 19/06/2026  
Status: lifecycle e governança verificados; registry durável ausente

## Problema

Verificar Ed25519 não basta se qualquer operador puder cadastrar, substituir ou restaurar uma
chave antiga. A confiança precisa de governança reproduzível: quem pede, quem aprova, qual versão
foi persistida, como ocorre a rotação e como uma chave comprometida perde validade.

## Comitê Fable 5

- segurança/PKI: custódia, revogação, rotação e fingerprint;
- sistemas distribuídos: versão monotônica, idempotência e commit;
- SRE: continuidade durante rotação e fail-safe em incidente;
- governança: segregação de funções e quorum verificável;
- auditoria: prova pública sem material de chave ou identidade operacional.

## Tree of Thoughts

| Ramo | Alternativa                              | Valor | Risco | Custo | Tese | Reuso | Decisão                                         |
| ---- | ---------------------------------------- | ----: | ----: | ----: | ---: | ----: | ----------------------------------------------- |
| A    | CRUD administrativo simples              |     3 |     2 |     9 |    3 |     4 | Rejeitado: poder unilateral                     |
| B    | Registry versionado + quorum + lifecycle |    10 |     9 |     7 |   10 |    10 | Escolhido                                       |
| C    | Mock de rotação na interface             |     2 |     1 |    10 |    2 |     2 | Rejeitado: não cria custódia                    |
| D    | Adiar até o Cloud                        |     4 |     5 |    10 |    5 |     3 | Rejeitado: contrato ficaria implícito           |
| E    | KMS/HSM gerenciado                       |     9 |     9 |     4 |    9 |     9 | Futuro obrigatório; provider ainda não definido |
| F    | Registry genérico no núcleo              |     9 |     8 |     7 |    9 |    10 | Incorporado ao ramo B                           |

## Contrato

- estado do registry possui versão monotônica;
- proposta referencia a versão-base exata;
- request idempotente não pode mudar de significado;
- aprovações precisam estar verificadas e vinculadas ao digest da proposta;
- solicitante não pode aprovar a própria mudança;
- quorum mínimo de pessoas e papéis é configurável;
- cadastro cria chave `pending`, nunca confiável automaticamente;
- ativação exige janela válida, limite de chaves e sobreposição segura;
- retirada planejada exige sucessor ativo;
- revogação é imediata e prevalece sobre disponibilidade;
- fingerprint duplicado ou key id duplicado é recusado;
- recibo durável existe somente após commit correspondente;
- política de evidência declara a versão do registry;
- snapshot abaixo da versão mínima falha como `registry_rollback`.

## Critério de aceite

- ativação com dupla custódia passa;
- quorum insuficiente, mesmo papel e autoaprovação falham;
- versão antiga e request divergente falham;
- rotação sem sobreposição e retirada sem sucessor falham;
- retry exato é idempotente;
- revogação exporta confiança revogada imediatamente;
- rollback não emite recibo;
- prova pública não contém atores, requests, ids de chave ou fingerprints.

## Estado atual

- governança: `12/12`;
- registry durável: não;
- identidade real dos aprovadores: não;
- audit log imutável: não;
- Runtime: `0/3`;
- `trustedKeyRegistryActive: false`;
- `productionClaimsAllowed: false`.
