# Privacidade e segurança

## Invariantes preservadas (FIB-T)

- `k_min = 5` (`FIBT_K_MIN`, `src/engine/fibt/fibt-engine.ts`; espelhado no SQL `v_k`).
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

## Ambientes

Produção (`shlm...akol`) fora do escopo de desenvolvimento. HML/staging
(`xttj...xuab`) só por autorização explícita. Fixtures desta fundação são
locais e sintéticas.
