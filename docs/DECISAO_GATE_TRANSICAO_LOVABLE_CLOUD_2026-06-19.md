# Decisão — gate de transição para Lovable Cloud

Data: 19/06/2026  
Status: gate composicional implementado; cutover bloqueado

## Problema

Contratos verdes podem criar uma falsa sensação de prontidão. Persistência, isolamento, consentimento
e pipeline estavam provados separadamente, mas faltava uma decisão única que impedisse promoção
prematura e ordenasse o cutover.

## Tree of Thoughts

1. Checklist estático em documentação: fácil de desatualizar.
2. Percentual de prontidão: rejeitado; transforma controles críticos em score cosmético.
3. Liberar por flag de ambiente: rejeitado; uma flag não cria segurança.
4. Gate booleano que compõe provas reais e ordena blockers: escolhido.
5. Provisionar Cloud automaticamente: fora da autoridade e sem adapter disponível.
6. Criar nova tela isolada: rejeitado; o gate compõe `/acesso` e os motores existentes.

## Contrato escolhido

- cinco controles de fundação e cinco de runtime;
- fundação verde não compensa runtime ausente;
- qualquer controle reprovado mantém `productionClaimsAllowed: false`;
- blockers são ordenados: sessão → adapter → RLS → consent ledger durável → atestação de produção;
- não há média, peso ou “quase pronto” para controles de segurança;
- o relatório público reutiliza apenas metadados sanitizados das provas existentes.

## Estado atual

- Fundação: 5/5.
- Runtime: 0/5.
- Próximo controle: `runtime.signed_session`.
- Lovable Cloud configurado: não.
- Promoção permitida: não.
