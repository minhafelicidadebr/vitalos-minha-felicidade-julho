# Decisão — certificado condicional de promoção para produção

Data: 19/06/2026  
Status: validador verificado; certificado atual não emitido

## Problema

Uma flag, deploy bem-sucedido ou contratos verdes não provam que o mesmo release executa sessão,
persistência, RLS, consentimento durável e atestação do pipeline. Evidências antigas ou de outro
deployment também não podem ser recicladas.

## Tree of Thoughts

1. Liberar por variável de ambiente — rejeitado; flag não cria garantia.
2. Usar score percentual — rejeitado; controle crítico não compensa outro.
3. Aceitar contratos como evidência — rejeitado; blueprint não é runtime.
4. Certificar cada módulo separadamente — insuficiente; permite drift de release.
5. Certificado manual — rejeitado; não é reproduzível.
6. Gate 5/5 com evidência fresca, production-only e vinculada ao deployment/release — escolhido.

## Contrato

- cinco controles obrigatórios e exatamente uma evidência por controle;
- somente `environment: production` e `assurance: runtime_verified`;
- status precisa ser `verified`;
- deployment e commit precisam coincidir;
- timestamps precisam ser válidos, observados e não expirados;
- digest SHA-256 precisa ser válido;
- qualquer ausência, duplicidade, drift ou expiração bloqueia o certificado;
- o engine produz apenas um draft; assinatura e persistência dependem do adapter real.

## Estado atual

- validador: `7/7`;
- controles reais: `0/5`;
- `promotionCertificateIssued: false`;
- `productionClaimsAllowed: false`.
