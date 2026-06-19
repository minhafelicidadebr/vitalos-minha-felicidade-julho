# Decisão — Fronteira de identidade e RBAC antes do Lovable Cloud

Data: 18 de junho de 2026

## Tese

Ocultar itens de menu não é autorização. Antes de persistir qualquer resposta real, o VitalOS™
precisa de um contrato verificável que decida acesso por identidade, tenant, permissão, domínio e
escopo — com negação por padrão e sem confiar em persona escolhida no cliente.

## Lentes convocadas

- Segurança SaaS multi-tenant: isolamento precede conveniência.
- LGPD e confiança: minimização e finalidade devem existir no contrato, não apenas na copy.
- Arquitetura de produto: a fatia precisa ser demonstrável sem fingir que o backend já existe.
- Opcionalidade multissetorial: Empresa e Escola devem reutilizar o mesmo motor.

## Árvore de alternativas

1. Manter apenas o filtro de navegação.
   - Custo baixo, mas acesso direto por URL continua possível e não existe isolamento de recurso.
2. Criar um login visual sobre o estado local.
   - Demo convincente, porém produz falsa alegação de autenticação e aumenta risco reputacional.
3. Instalar Supabase manualmente.
   - Poderia acelerar o backend, mas viola a arquitetura definida: o provedor é Lovable Cloud.
4. Parar até o Cloud ser ativado.
   - Evita simulação, mas adia contratos e testes que independem do provedor.
5. Construir apenas um engine genérico.
   - Boa fundação, porém sem história vertical nem prova de integração.
6. Construir engine + handshake server-side honesto + simulador + guard canário.
   - Prepara o adaptador real, falha fechado e torna limites visíveis sem chamar demo de auth.

## Decisão

Adotar a alternativa 6.

## Contrato

- Uma identidade autenticada precisa de `subjectId`, `activeTenantId` e grants emitidos por fonte
  confiável.
- Cada grant declara tenant, permissão, papel, escopo, domínios, modo somente leitura e validade.
- Cada recurso declara tenant, ação, classe do dado, domínio, proprietário e referências de escopo.
- Tenant divergente é negado antes das demais regras.
- Leitura de `individual_response` é sempre negada para papéis cliente.
- Escrita de resposta própria pode ser autorizada por grant `self`, sem liberar leitura posterior.
- Domínio B exige concessão explícita para B.
- Escopos `team`, `organization`, `holding`, `portfolio` e demais extensões são comparados por
  vínculo, não por nome do papel.
- Papéis somente leitura nunca recebem escrita por inferência.

## Separação de camadas

- `engine/identity`: decisão pura, sem React, estado, pack ou provider.
- `app/identity/persona-store`: seletor de persona estritamente demonstrativo.
- `lib/identity/*.server.ts`: leitura server-side do modo solicitado.
- `mocks/access-control-mock.ts`: memberships e recursos fictícios por pack.
- `/acesso`: transparência da fronteira e dos limites.
- `/sst`: guard canário de rota no modo demo.

## Honestidade operacional

O runtime padrão continua `demo`. Se `VITALOS_IDENTITY_MODE=cloud` for solicitado sem adaptador, a
fronteira retorna `blocked`; nunca promove o estado local a autenticação real. Sessão assinada,
memberships persistidas e RLS ainda dependem da ativação do Lovable Cloud.

## Critério para a próxima fatia

Somente após o Cloud estar disponível:

1. implementar o adaptador de sessão;
2. resolver membership e tenant no servidor;
3. emitir grants server-side;
4. proteger uma rota canário antes de carregar dados;
5. testar negação entre dois tenants e dois papéis;
6. manter respostas individuais fora do payload de leitura.
