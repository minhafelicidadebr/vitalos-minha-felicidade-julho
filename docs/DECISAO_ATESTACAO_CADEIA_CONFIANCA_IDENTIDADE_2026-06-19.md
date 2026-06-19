# Decisão — atestação da cadeia de confiança de identidade

Data: 19/06/2026  
Status: blueprint atestado; runtime não promovido

## Problema

Sessão, emissão de grants, paridade RLS e isolamento estavam verificáveis separadamente. Sem uma
prova composicional, um integrador poderia aprovar cada módulo e ainda montar a cadeia na ordem
errada, omitir um invariante ou apresentar contratos verdes como autenticação real.

## Lentes convocadas

- Segurança: confiança é uma cadeia; um elo inválido reprova o conjunto.
- Auditoria: a prova precisa ser reproduzível e independente do horário.
- Privacidade: digest deve selar somente metadados públicos sanitizados.
- Produto: fundação e runtime precisam permanecer visualmente separados.
- Operação: blockers devem apontar a ordem exata do cutover.

## Tree of Thoughts

1. Checklist manual — rejeitado; desatualiza e não é reproduzível.
2. Somar scores dos módulos — rejeitado; segurança não é média.
3. Hash de fixtures ou claims — rejeitado; hash de dado sensível continua sensível.
4. Promover Runtime porque todos os contratos passaram — rejeitado; contrato não cria infraestrutura.
5. Criar outra tela isolada — rejeitado; a central de acesso já é a narrativa correta.
6. Compor provas públicas + manifesto canônico + SHA-256 server-side — escolhido.

## Contrato escolhido

- 12 checks sobre sessão, token, persona, grants, least privilege, tenant, RLS, privacidade e
  isolamento;
- qualquer check reprovado invalida a atestação;
- três controles de runtime separados: sessão ativa, grants server-side e RLS implantada;
- `productionClaimsAllowed` exige contrato integral e Runtime `3/3`;
- payload canônico contém somente IDs de checks, booleanos e IDs de blockers;
- labels, fixtures, claims, memberships e grants não entram no digest;
- timestamp fica fora do payload canônico, tornando o SHA-256 reproduzível.

## Estado atual

- Blueprint: `12/12`.
- Runtime de identidade: `0/3`.
- Assurance: `cutover_blueprint`.
- Digest scope: `sanitized_public_metadata`.
- Promoção: bloqueada.

Esta atestação prepara due diligence e cutover, mas não substitui Lovable Cloud, assinatura real,
store de memberships, policies Postgres ou testes entre tenants reais.
