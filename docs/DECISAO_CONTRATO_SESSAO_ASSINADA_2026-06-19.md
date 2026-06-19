# Decisão — contrato de sessão assinada e membership

Data: 19/06/2026  
Status: contrato verificável implementado; runtime ainda bloqueado

## Problema

O primeiro blocker do cutover é `runtime.signed_session`. Ligar uma flag ou confiar em cookie,
persona, tenant escolhido no cliente ou claims não verificados criaria autenticação cenográfica.
Por outro lado, esperar o Cloud sem especificar o contrato deixaria issuer, audience, tempo e
membership para serem decididos durante a integração.

## Lentes convocadas

- Segurança multi-tenant: identidade confiável nasce no servidor e tenant nasce da membership.
- LGPD: minimizar contexto e nunca devolver token bruto, IDs de fixture ou conteúdo individual.
- UX de acesso: múltiplos vínculos exigem escolha explícita, não seleção silenciosa.
- Operação SaaS: expiração, suspensão e ambiguidade precisam falhar fechado.
- Opcionalidade: o contrato não depende de Empresa, Escola ou outro pack.

## Tree of Thoughts

1. Confiar no seletor de persona — rejeitado; estado local não autentica.
2. Aceitar qualquer JWT decodificado — rejeitado; decodificação não verifica assinatura.
3. Esperar o Cloud e decidir depois — rejeitado; transfere risco arquitetural para o cutover.
4. Instalar Supabase manualmente — rejeitado; o provider definido é Lovable Cloud.
5. Criar apenas tipos — insuficiente; não prova ordem de negação nem casos adversariais.
6. Engine puro + suíte adversarial + prova pública sanitizada — escolhido.

## Contrato escolhido

- o adapter precisa declarar que verificou a assinatura no servidor;
- adapter, issuer e audience precisam coincidir exatamente com a política;
- sessão futura, expirada, antiga demais ou com claims inválidos é recusada;
- o tenant solicitado só é aceito se houver membership ativa para o subject;
- memberships suspensas, futuras ou expiradas não emitem contexto;
- múltiplos tenants exigem seleção explícita;
- o mesmo tenant ligado a organizações divergentes é ambíguo e falha fechado;
- o contexto confiável contém apenas subject, tenant, organização, papéis, método e expiração;
- token bruto, cookie, persona cliente e respostas individuais ficam fora do contrato.

## Limite honesto

Os 12 cenários provam a semântica que o adapter deverá obedecer. O workspace ainda não possui
Lovable Cloud configurado, verificação criptográfica real ou memberships persistidas. Portanto:

- `runtime: adapter_missing`;
- `signedSessionActive: false`;
- `productionClaimsAllowed: false`.

O gate principal permanece em Runtime `0/5`.
