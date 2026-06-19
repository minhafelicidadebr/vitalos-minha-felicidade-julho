# Decisão — Consent Ledger event-sourced

Data: 19/06/2026  
Status: engine e demo efêmero implementados; persistência Cloud ausente

## Problema

Um toggle booleano não comprova consentimento: não registra finalidade, versão do texto, revisão,
concorrência, revogação ou recibo. Ao mesmo tempo, gravar consentimento em `localStorage` daria uma
falsa aparência jurídica.

## Tree of Thoughts

1. Manter booleanos locais: simples, mas insuficiente para auditoria.
2. Persistir no navegador: rejeitado; não possui identidade, tenant ou garantia jurídica.
3. Bloquear toda interação até o Cloud: seguro, porém destrói a demonstração da confiança.
4. Event sourcing puro + sessão efêmera + contrato Cloud verificável: escolhido.
5. Instalar banco alternativo: rejeitado; viola o provedor definido.
6. Comprar CMP externo: futuro possível, mas não substitui o ledger granular do produto.

## Contrato escolhido

- cada finalidade declara `policyVersion`;
- cada decisão é um evento append-only com revisão monotônica;
- revogação produz nova revisão e entra em vigor na projeção imediatamente;
- optimistic locking impede sobrescrita por tela desatualizada;
- `requestId` torna retry idempotente;
- finalidade obrigatória não usa o mesmo fluxo de opt-in;
- recibo declara decisão, revisão, modo de persistência e ausência de payload;
- no demo, `persisted: false` e o histórico existe somente na sessão React.

## Limite honesto

O engine está pronto para um adapter persistente, mas os eventos atuais não possuem peso jurídico.
Sessão assinada, tenant, timestamp confiável, retenção e trilha imutável dependem do Lovable Cloud.
