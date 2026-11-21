# Falha de onboarding · limite de "assentos administrativos" · 21/11/2026

**Situação:** registro separado da ajuda contextual. Nenhum código foi alterado. A correção abaixo é uma proposta e depende de decisão comercial.

## O que foi observado

O limite que o produto apresenta como **assento administrativo** conta **todas as pessoas** da organização.

## Contrato no código

| Peça | O que diz |
|---|---|
| `src/engine/billing/plan-engine.ts` | O campo se chama `maxAdminSeats`: Piloto 1, Crescimento 5, Enterprise ilimitado. A mensagem de recusa diz "Limite de **administradores** do plano atingido". |
| `src/routes/privacidade-comercial.tsx:103` | A oferta pública promete "1 **assento administrativo**" no Piloto. |
| `src/lib/api/member-invite.server.ts:78-85` | O código conta **todo `profile` da org** ("Seat = todo profile da org"), qualquer que seja o papel, e aplica o teto a **qualquer** convite, inclusive o de `COLABORADOR`. |
| `src/lib/auth/authorize.server.ts:40` | O papel administrativo já tem fonte única: `orgAdminRoles()`, que vem do `orgAdminRole` de cada pack. |

## Efeito

No Piloto, o perfil de quem criou a organização já ocupa o único assento. Por isso, **o primeiro convite de qualquer pessoa é recusado** com a mensagem de upgrade.

O nome, a oferta e a mensagem falam de administradores, mas a contagem trata todas as pessoas. As respostas ao questionário não entram nesse limite: elas têm um teto próprio, `maxInvitesPerWave`.

Há ainda um furo menor: convites pendentes não são contados, então dois convites simultâneos podem passar do teto.

## Correção mínima proposta (sem afrouxar o limite comercial)

Ela vale **se** a decisão for que o assento é administrativo, como dizem o nome, a oferta e a mensagem:

1. Contar só `profiles` cujo `role` está em `orgAdminRoles()`, mais os convites pendentes (`used_at is null`, não expirados) para esses papéis.
2. Aplicar `checkSeatQuota` só quando o **papel convidado** é administrativo. Convites de outros papéis seguem os demais limites do plano.
3. Testes:
   - Piloto com 1 admin: convite de COLABORADOR **passa**;
   - Piloto com 1 admin: convite de RH_ADMIN **recusa**;
   - um convite de admin pendente conta como assento.

O diff estimado é de umas 15 linhas em `member-invite.server.ts`, mais 3 testes. Não muda migration nem RLS.

**Alternativa**, se a intenção comercial for limitar **pessoas com conta** no Piloto: manter a contagem atual e corrigir o nome e os textos (`maxSeats`, "pessoas com acesso", oferta pública), além de subir o teto do Piloto para um número que permita o próprio piloto.

## Decisão pendente

Responsável: founder / comercial.

O limite do Piloto vale para **administradores** ou para **todas as pessoas com conta**? Até essa decisão, o código fica como está.
