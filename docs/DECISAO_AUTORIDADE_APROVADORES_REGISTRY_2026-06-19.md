# Decisão — autoridade verificável dos aprovadores do registry

Data: 19/06/2026  
Status: cadeia de autorização e selo testada; runtime real ausente

## Problema

O registry do Sprint 33 exige aprovações verificadas, mas um booleano `verified` não prova quem
aprovou nem por que tinha autoridade. A aprovação precisa compor identidade, membership, grant,
escopo, assinatura e anti-replay antes de participar do quorum.

## Comitê Fable 5

- IAM/RBAC: identidade e autoridade derivadas no servidor;
- PKI: selo Ed25519 e fingerprint da chave;
- segurança SaaS: tenant, domínio e escopo do registry;
- sistemas distribuídos: nonce durável e idempotência;
- auditoria: prova pública sem identidade, grants ou material criptográfico.

## Tree of Thoughts

| Ramo | Alternativa                                 | Valor | Risco | Custo | Tese | Reuso | Decisão                                |
| ---- | ------------------------------------------- | ----: | ----: | ----: | ---: | ----: | -------------------------------------- |
| A    | Aceitar `verified: true` do adapter         |     2 |     1 |    10 |    2 |     3 | Rejeitado: confiança não demonstrada   |
| B    | Sessão + grant + autorização + selo + nonce |    10 |     9 |     7 |   10 |    10 | Escolhido                              |
| C    | Aprovação por papel no cliente              |     2 |     1 |     9 |    1 |     2 | Rejeitado: persona não é identidade    |
| D    | Adiar até o Cloud                           |     4 |     5 |    10 |    5 |     3 | Rejeitado: deixa a fronteira implícita |
| E    | Workflow externo de IAM                     |     8 |     8 |     5 |    8 |     8 | Futuro possível após provider definido |
| F    | Compor motores de identidade existentes     |    10 |     9 |     8 |   10 |    10 | Incorporado ao ramo B                  |

## Contrato

- o request cliente não contém `actorId`, tenant, organização ou papel;
- sessão assinada resolve subject, tenant e membership;
- grant server-side precisa de `key_registry.approve`;
- grant precisa ter origem `membership_policy`;
- domínio obrigatório: `platform_security`;
- escopo obrigatório: o registry exato;
- grant read-only, vencido ou de outro escopo falha fechado;
- papel da aprovação vem do grant correspondente;
- lifetime é o menor limite entre request, sessão, grant e política;
- atestação canônica recebe selo Ed25519 do serviço;
- fingerprint fixa a chave de selo esperada;
- nonce precisa de commit durável;
- conflito é bloqueado e retry idêntico é idempotente;
- somente após toda a cadeia nasce `VerifiedRegistryApproval`.

## Critério de aceite

- sessão e grant corretos criam draft com autoridade derivada;
- sessão inválida, permissão, escopo, domínio ou escrita ausentes falham;
- selo válido é aceito; selo atacante e chave substituída são recusados;
- rollback e conflito de nonce não produzem aprovação;
- retry exato é idempotente;
- prova pública não expõe ator, tenant, organização, grants, chave, assinatura ou nonce.

## Estado atual

- contrato de autoridade: `14/14`;
- sessão assinada real: não;
- grants server-side reais: não;
- chave de selo de aprovação: não;
- approval nonce ledger durável: não;
- Runtime: `0/4`;
- `verifiedRegistryApprovalsActive: false`;
- `productionClaimsAllowed: false`.
