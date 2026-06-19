# Decisão — emissão de grants por membership server-side

Data: 19/06/2026  
Status: contrato verificável implementado; store de memberships ainda ausente

## Problema

Uma sessão assinada prova quem está presente, mas não autoriza recursos por si só. Derivar
permissões do papel escolhido no cliente, da navegação visível ou de labels do pack produziria
privilégio implícito e quebraria isolamento, separação Domínio A/B e least privilege.

## Lentes convocadas

- Segurança SaaS: grants precisam nascer de membership persistida e política allowlist.
- LGPD: finalidade, escopo e validade precisam ser mínimos e explícitos.
- SST/ética: Domínio B não pode ser herdado de acesso ao Domínio A.
- Operação: suspensão e revogação precisam interromper emissão imediatamente.
- Multissetorialidade: engine não conhece Empresa, Escola ou nomenclatura de pack.

## Tree of Thoughts

1. Reutilizar a navegação como RBAC — rejeitado; menu não é autorização.
2. Confiar em role enviado pelo cliente — rejeitado; produz escalada trivial.
3. Emitir permissões amplas e filtrar depois — rejeitado; viola least privilege.
4. Esperar o banco e codificar direto em RLS — insuficiente; a semântica ficaria sem teste puro.
5. Engine puro que emite cada entitlement mesmo com falhas parciais — rejeitado; cria estado ambíguo.
6. Emissão atômica a partir de sessão confiável + membership + allowlist — escolhido.

## Contrato escolhido

- subject, tenant, organização e papel precisam coincidir com a sessão confiável;
- membership inativa, futura ou vencida não emite grants;
- permissões precisam estar na allowlist e fora da denylist;
- leitura de resposta individual permanece explicitamente proibida;
- scope kind e scope ref precisam estar vinculados à membership;
- wildcard é negado por padrão e exige exceção explícita;
- Domínio B precisa ser autorizado explicitamente;
- qualquer entitlement inválido rejeita todo o lote;
- grants duplicados idênticos colapsam; duplicados conflitantes falham fechado;
- expiração do grant é o menor limite entre sessão, política, membership e entitlement.

## Limite honesto

O contrato passa 12 cenários, mas não existe store persistido de memberships neste workspace.
Portanto:

- `runtime: membership_store_missing`;
- `grantsServerIssued: false`;
- `productionClaimsAllowed: false`.

O resultado prepara o adapter e as futuras policies RLS sem transformar demo em autorização real.
