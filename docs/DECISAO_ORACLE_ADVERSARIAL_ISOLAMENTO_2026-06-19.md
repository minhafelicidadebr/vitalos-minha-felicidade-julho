# Decisão — oracle adversarial de isolamento multi-tenant

Data: 19/06/2026  
Status: oracle verificado; RLS não implantada

## Problema

Testes felizes de autorização não bastam para uma plataforma multi-tenant. É necessário atacar
deliberadamente tenant, escopo, Domínio A/B, classe do dado, ciclo da concessão, escrita cega e
idempotência. Sem banco conectado, porém, chamar isso de teste de RLS seria overclaim.

## Tree of Thoughts

1. Testar somente o `authorization-engine`: barato, mas não cobre persistência.
2. Criar políticas SQL antes do Lovable Cloud: arriscado; schema e adapter oficiais ainda não existem.
3. Simular RLS em memória e chamar de real: rejeitado por desonestidade.
4. Adiar segurança até o banco: rejeitado; deixa o contrato sem due diligence.
5. Oracle puro que compõe autorização + persistência e publica relatório sanitizado: escolhido.
6. Comprar ferramenta externa de pentest agora: prematuro sem superfície de produção.

## Contrato escolhido

- 13 cenários sintéticos misturam canários permitidos e ataques negados;
- tenant mismatch precede demais permissões;
- grants não atravessam equipe, organização ou domínio;
- resposta individual continua ilegível inclusive para o titular;
- escrita cega própria é permitida; escrita em nome de outra pessoa é negada;
- grants expirados e somente leitura falham fechados;
- retry idêntico é aceito; conflito de idempotência é negado;
- o relatório público contém apenas cenário, razão esperada, razão observada e resultado.

## Limite honesto

`enforcement: policy_oracle` e `rlsDeployed: false`. O oracle é a suíte de aceitação que as futuras
políticas RLS deverão passar; não substitui Postgres, sessão assinada ou testes contra dois tenants
reais.
