# Decisão — fronteira criptográfica para evidências de produção

Data: 19/06/2026  
Status: contrato e verificador Ed25519 testados; infraestrutura real ausente

## Problema

O gate 5/5 recusa mocks, drift e expiração, mas uma string marcada como `runtime_verified` ainda
precisa provar origem. Sem assinatura, chave confiável e replay ledger, um payload forjado poderia
tentar adquirir peso de produção.

## Comitê Fable 5

- segurança de aplicações: autenticidade, rotação de chave e fail-closed;
- sistemas distribuídos: idempotência, replay e atomicidade da reserva;
- plataforma/SRE: binding ao deployment e release observados;
- privacidade: prova pública sem chave, assinatura, nonce ou conteúdo operacional.

## Tree of Thoughts

| Ramo | Alternativa                            | Valor | Risco | Custo | Tese | Reuso | Decisão                                               |
| ---- | -------------------------------------- | ----: | ----: | ----: | ---: | ----: | ----------------------------------------------------- |
| A    | Confiar no digest enviado              |     2 |     1 |    10 |    2 |     3 | Rejeitado: integridade não prova origem               |
| B    | Ed25519 + key registry + nonce durável |    10 |     9 |     7 |   10 |    10 | Escolhido                                             |
| C    | Simular `signatureVerified: true`      |     3 |     1 |     9 |    2 |     3 | Rejeitado: booleano não é fronteira                   |
| D    | Adiar até o Cloud                      |     3 |     5 |    10 |    5 |     2 | Rejeitado: deixa o contrato ambíguo                   |
| E    | JWT/JWKS genérico                      |     7 |     7 |     6 |    7 |     8 | Adiado: formato do provider ainda não está confirmado |
| F    | Assinatura simétrica HMAC              |     6 |     5 |     8 |    6 |     6 | Rejeitado: amplia distribuição de segredo             |

## Contrato escolhido

- envelope canônico `vitalos.production-evidence.v1`;
- Ed25519 verificado somente no servidor;
- chave pública vem do registry confiável, nunca do envelope ou cliente;
- fingerprint SHA-256 do SPKI vincula a política ao material exato da chave;
- issuer, audience, key, deployment e release precisam coincidir;
- chave revogada ou fora da janela falha fechado;
- observação, emissão, validade, idade máxima e clock skew são explícitos;
- digest da evidência e assinatura usam formatos estritos;
- nonce precisa de reserva durável e atômica;
- retry idêntico é idempotente; conflito de nonce é bloqueado;
- `runtime_verified` só nasce após assinatura válida e commit do nonce.

## Critério de aceite

- assinatura válida aceita;
- chave atacante, issuer divergente, drift, expiração e revogação são recusados;
- rollback não produz evidência;
- conflito de replay falha fechado;
- retry exato é marcado como replay idempotente;
- cinco envelopes aceitos alimentam o gate 5/5;
- uma assinatura forjada reduz o gate a 4/5 e bloqueia a promoção;
- prova pública não contém PEM, assinatura, nonce, digest ou ids de fixture.

## Estado atual

- contrato criptográfico: `11/11`;
- trusted key registry real: não;
- replay ledger durável: não;
- fonte de evidência production: não;
- Runtime: `0/3`;
- `runtimeEvidenceAccepted: false`;
- `productionClaimsAllowed: false`.
