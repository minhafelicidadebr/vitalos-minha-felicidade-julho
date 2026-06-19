# Decisão — persistência transacional do Consent Ledger

Data: 19/06/2026  
Status: contrato verificado; adapter durável ausente

## Problema

O ledger event-sourced define revisão e revogação, mas ainda faltava provar como uma decisão seria
gravada sem duplicidade, sobrescrita concorrente, troca de tenant ou recibo falso.

## Tree of Thoughts

1. Reutilizar memória React — rejeitado; não é durável nem auditável.
2. Usar `localStorage` — rejeitado; não possui confiança jurídica ou isolamento.
3. Reutilizar cegamente o contrato de respostas — insuficiente; consentimento tem revisão,
   finalidade, decisão e versão de política.
4. Gravar estado atual por `upsert` — rejeitado; apaga o histórico.
5. Instalar banco paralelo — rejeitado; provider oficial continua Lovable Cloud.
6. Append transacional idempotente + optimistic revision + recibo pós-commit — escolhido.

## Contrato

- subject, tenant e organização vêm da sessão confiável;
- chave idempotente inclui tenant, subject, finalidade e request;
- revisão precisa ser exatamente `latest + 1`;
- retry idêntico reutiliza o commit;
- request reutilizada com outro significado é conflito;
- decisão é append-only, nunca `update` destrutivo;
- `cloud_persisted` só nasce após commit confirmado e coerente;
- rollback, erro, tenant divergente ou metadado divergente não emitem recibo.

## Limite honesto

O protocolo passa oito invariantes, mas não existe adapter Cloud conectado:

- `runtime: adapter_missing`;
- `durableConsentLedger: false`;
- `productionClaimsAllowed: false`.
