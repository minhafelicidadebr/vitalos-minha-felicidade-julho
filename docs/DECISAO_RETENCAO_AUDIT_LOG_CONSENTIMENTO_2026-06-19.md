# Decisão — retenção e audit log do Consent Ledger

Data: 19/06/2026  
Status: governança especificada; scheduler e store imutável ausentes

## Problema

Persistir eventos sem política de ciclo de vida gera retenção indefinida. Excluir sem trilha destrói
auditabilidade. Registrar conteúdo no log aumenta a superfície de incidente.

## Tree of Thoughts

1. Reter tudo indefinidamente — rejeitado; viola minimização.
2. Apagar tudo ao revogar — rejeitado; confunde efeito da decisão com obrigações de auditoria.
3. Hardcode de prazo “jurídico” — rejeitado; depende de finalidade e base legal.
4. Log detalhado de payload — rejeitado; amplia risco sem necessidade.
5. Cron job simulado no cliente — rejeitado; criaria falsa operação.
6. Política injetada + decisão determinística + cadeia de metadados SHA-256 — escolhido.

## Contrato

- prazo, versão, ação e legal hold vêm de política injetada;
- antes do prazo, reter; no limite, aplicar `delete` ou `anonymize`;
- legal hold autorizado suspende descarte temporariamente;
- descarte é idempotente;
- audit trail tem sequência, timestamp monotônico e digest anterior;
- quebra de elo invalida a cadeia;
- audit entries nunca carregam resposta, decisão textual livre ou payload psicométrico;
- digest público sela somente metadados sanitizados.

## Limite honesto

- `runtime: scheduler_missing`;
- `retentionJobsActive: false`;
- `immutableAuditStoreActive: false`;
- `productionClaimsAllowed: false`.

Os 365 dias usados na prova são uma configuração demonstrativa, não recomendação jurídica.
