# Privacidade e segurança

## Invariantes preservadas (FIB-T)

- `k_min = 5` (`FIBT_K_MIN`, `src/engine/fibt/fibt-engine.ts`; espelhado no SQL `v_k`). Teste de consistência entre engine, leitura IVO e SQL em `ivo-journey.server.test.ts`.
- Ausência nunca é zero (`FibtIncompleteResponseError`, cobertura de 32 itens).
- Nenhuma contagem exata abaixo do limiar: rótulos `<5` ou `protegida`.
- Supressão complementar/diferencial sobre a partição completa (`suppressDifferentialInference`, migration `20260909221000`).
- Liberação em lote com marca d'água por conjunto (`cohort_capsules`, migration `20260909222000`).
- Leitura do painel só a partir do snapshot **publicado**; `answers` nunca é selecionada pelo painel.
- Publicação apenas pela RPC canônica com `auth.uid()` de membro da organização da onda; `service_role` não publica.
- Isolamento por organização: RLS por `profiles.org_id`, checagem de deriva org/onda no loader.

## Regras para a camada IVO

- O contrato `NormalizedLensReading` só transporta resultados de coortes já
  publicadas; estados protegidos viajam como estado, sem número.
- O tipo proíbe campo de índice composto (`compositeScore?: never`).
- A matriz descarta leituras de outra organização e sinaliza a divergência.
- Células só recebem evidência quando há mapeamento `APROVADO`.
- Nenhuma credencial, token ou identificador pessoal em contrato, log ou fixture.

## Servidor IVO (R5/R6)

- Ordem fixa em `authorizeIvoSession`: fronteira HML declarada → recusa;
  backend não-cloud → indisponível; sem token → não autenticado;
  `requireOrgAdmin(token)` → organização e papel **da sessão**.
- Nenhuma server function IVO aceita `orgId`: os schemas são `.strict()` e
  recusam o campo. `service_role` só é usado depois da sessão validada, com
  toda consulta filtrada pela organização da sessão.
- A leitura IVO nunca avança a publicação protegida (sem publicador); isso
  continua sendo ato do centro de controle FIB-T.
- Toda escrita no ledger confere que o item/plano pertence à organização da
  sessão antes da RPC (as RPCs do ledger não recebem organização). O papel do
  ator vem da sessão, não do cliente.
- A origem da ação é só referência (ids, versão, instante da publicação),
  derivada no banco. Nenhuma média, contagem, escore ou resposta é copiada para
  ação, evidência ou log. Somente setor com leitura publicada embasa ação.
- Rotas e server functions IVO ficam **fora** da allowlist HML (404 no
  deployment HML); a allowlist existente não muda.
- A capability `ACTION_PLAN` continua desligada no registro global. Ela liga
  apenas em fixture local controlada (`local-fixture-capabilities.server.ts`):
  runtime e banco `local`, URLs loopback, sem declaração HML, pedido explícito.
- Acesso às páginas: as rotas `/ivo-integral*` ficam atrás do `AuthGate`
  global (sessão ou portão de demonstração). O catálogo não é página pública;
  a leitura organizacional depende só da autorização no servidor.

## Ambientes

Produção (`shlm...akol`) fora do escopo de desenvolvimento. HML/staging
(`xttj...xuab`) só por autorização explícita. Fixtures desta fundação são
locais e sintéticas; a demonstração local verifica destino loopback antes de
qualquer escrita.
