# Decisão — manifesto RLS e paridade aplicação × banco

Data: 19/06/2026  
Status: semântica verificada; SQL e policies ainda não implantadas

## Problema

Ter um bom engine de autorização não garante que as futuras policies do banco tomarão as mesmas
decisões. Drift entre aplicação e RLS pode liberar dados que a interface nega ou bloquear operações
legítimas. Escrever SQL agora, sem schema e Cloud ativos, também criaria precisão fictícia.

## Lentes convocadas

- Segurança multi-tenant: banco e aplicação precisam concordar sob ataque.
- Privacidade: resposta individual permanece unreadable mesmo para o próprio titular.
- Operação: default deny deve cobrir operações sem policy, inclusive update/delete.
- Arquitetura: manifesto deve ser provider-neutral até o schema real existir.
- Auditoria: diferenças precisam aparecer como classe semântica reproduzível.

## Tree of Thoughts

1. Confiar apenas no engine da aplicação — rejeitado; banco ficaria sem contrato independente.
2. Gerar SQL Supabase agora — rejeitado; schema/provider não estão ativos.
3. Copiar condições manualmente para documentação — rejeitado; drift não seria detectável.
4. Usar somente testes negativos — rejeitado; deny-all passaria sem provar operações legítimas.
5. Reutilizar o mesmo evaluator nas duas camadas — rejeitado; paridade tautológica não detecta drift.
6. Manifesto declarativo + evaluator independente + suíte de paridade — escolhido.

## Contrato escolhido

- manifesto versionado, provider-neutral e `defaultDeny: true`;
- regras explícitas por tabela, operação, classe do dado, permissão e domínio;
- evaluator RLS independente do `authorizeResource`;
- normalização semântica para comparar aplicação e banco;
- canários permitidos e negados;
- tenant mismatch precede permissões;
- leitura de resposta individual é proibida materialmente;
- escrita cega exige owner igual ao subject;
- Domínio B requer policy e grant explícitos;
- operações sem regra são negadas por padrão;
- 16 cenários cobrem identidade, tenant, privacidade, policy, expiração, domínio e escopo.

## Limite honesto

O manifesto é a especificação executável das futuras policies. Ele não é SQL implantado e não foi
testado contra Postgres ou dois tenants reais. Portanto:

- `enforcement: policy_manifest`;
- `rlsDeployed: false`;
- `sqlApplied: false`;
- `productionClaimsAllowed: false`.

No cutover, o adapter deverá traduzir o manifesto para policies reais e repetir esta suíte contra o
banco. Somente então o gate poderá promover o controle `runtime.rls`.
